#!/usr/bin/env python
"""
audit_deck.py
Pre-render gate + animator self-critique for a storyboard deck.

Reads a storyboard.html (template deck, vertical deck or adopted page), builds a
static model of what the engine will schedule (mirroring storyboard-engine.js:
.anim / .anim-group[data-stagger] / data-then / data-t / data-t-rel / data-exit /
data-loop / data-hold / .camera[data-camera] / WORD_HITS), and reports findings
grouped by severity:

  ERROR  -- will visibly break the video (exit code 2)
  WARN   -- quality issue against animator.md (exit code 1 if no errors)
  INFO   -- worth knowing, never affects the exit code

Registries (presets, loops, eases, transitions, exits) are NEVER hardcoded: they
are read from the storyboard-engine.js the deck actually loads (next to the deck, else the
skill dir; or the deck's inline legacy engine) by running it in node under a stub DOM, with a
source-parse fallback when node is unavailable. Engine BEHAVIOUR is read from the same source:
which data-* attributes it reads at all (an attribute the engine never reads is unsupported
there -- nothing is borrowed from the skill engine), how it numbers slides (v0.8: data-slide
with a position fallback; legacy: the N-th .slide element), its default transition, the
EMPHASIS_PRESETS / FUN_PRESETS classification and the caption modes. Results are cached per
engine file hash.

Deck code is read from inline <script>s AND local <script src> files (timeline.js,
session.js ...; *.min.js and files > 512 KB are treated as libraries), so presets / eases
registered there are known, with their dur: Storyboard.registerPreset(...), Storyboard.PRESETS.x =,
window.STORYBOARD.PRESETS['x'] =, Object.assign(Storyboard.PRESETS, {...}) and the same through
aliases (const SB = Storyboard; const PRESETS = Storyboard.PRESETS; const { EASE: E } = Storyboard).
A bare `PRESETS.x = ...` with no such alias is a ReferenceError with storyboard-engine.js (ERROR).
Storyboard.init(CFG) with a literal const CFG = {...} is read like an inline options object.
Slides are what the engine's querySelectorAll finds: inside opts.root / #deck / .deck (v0.8), never
<template> content.

Attribute values are looked up RAW, like the engine (data-exit=" fadeOut" is unknown there); all CSS
(<style>, linked files, local @imports, style="") is scanned with its /* comments */ blanked.
What the RENDER can load is modelled: render_video.py serves only the deck folder over http, so a
drive-letter / UNC path or a file: URL never loads (ERROR), and "../x" is clamped to the deck
folder (WARN: fine only for a pipeline that renders the deck from file://).

ERROR checks
  engine          engine file referenced by the deck is missing, or broken (empty / truncated /
                  syntax error / an HTML page / never defines window.Storyboard), or referenced by
                  a local absolute path (WARN when it is above the deck folder); engine never
                  loaded; Storyboard.init never called
  slides          no slides, data-slide numbering gaps / duplicates; with a LEGACY engine also
                  missing / non-integer / out-of-order data-slide (v0.8 engines: INFO / WARN)
  timings         TIMINGS missing, count != slides, not ascending, malformed entries (the engine's
                  parseFloat / parseInt rules), unknown slide refs, cues at/after the end of the VO
                  (TIMINGS only reachable at runtime -- init(buildCfg()) -- is the WARN below)
  unknown-name    unknown data-anim / data-transition-in / data-loop / data-hold / data-exit /
                  data-ease names (did-you-mean + "wrong attribute" hints; data-hold runs only FUNCTION
                  loops, so data-hold="shimmer" / "beat" never runs), deck code registering through an
                  undefined bare PRESETS / EASE / LOOPS (ReferenceError), and data-exit / data-loop /
                  data-ease / data-transition-in on an engine that never reads them; an unknown
                  data-then step, data-then / data-hold / data-stagger / data-camera on an engine
                  that ignores them are WARNs
  missing-asset   local img/src/srcset/poster/url(...)/@import/data-src/script/link files missing, or
                  named by a local absolute path (drive letter / UNC / file: URL); other data-* values
                  only when the engine or deck JS reads the attribute and it is not display text
                  (data-text / data-words / data-url / data-file ...). An existing file ABOVE the deck
                  folder ("../shared/x.png") is a WARN: render_video.py cannot serve it, a renderer
                  that opens the deck from file:// can
  broken-ref      motionPath data-path selector matches nothing (element never shows)
  audio           VO audio file missing although word timestamps are already seeded; VO src is a local
                  absolute path (WARN when it is above the deck folder)
  internal        an ERROR-class check (unknown-name / missing-asset / broken-ref / audio) crashed
WARN checks
  hook            something moves by 0.6s and slide 1's headline is visible by 1.5s -- on the VIDEO
                  clock (the first cue's slide shows from t=0, even if TIMINGS[0] is later)
  text-density    > 30 words on screen at once (16:9) / > 18 (9:16)
  captions        vertical deck without captions; a caption mode the engine doesn't know (it is
                  case-sensitive: karaoke / line / pop); captions on but WORDS empty (the engine
                  never reads word_timestamps.json); init captions:false / 'off' overriding a
                  <body data-captions> mode and unknown positions are INFO
  word-hits       > 5 WORD_HITS per minute, unknown hit preset, selector matches nothing
  fonts           primary font-family not loaded (no @font-face / font link / system font OF THE RENDER
                  OS -- --platform, default this machine: Avenir / Helvetica Neue / Menlo are macOS-only,
                  Segoe UI / Calibri Windows-only; Apple's SF Pro / SF Mono / New York resolve nowhere
                  by name); a native per-OS stack ('Segoe UI', Roboto, Helvetica, Arial ...) whose later
                  family exists here is INFO; a family a font kit the audit cannot read may define
                  (Typekit, fontshare, other remote CSS with "font" in its URL) is INFO; remote CSS whose
                  URL names the family (rsms.me/inter/inter.css) counts as loading it
  monotony        > 40% of entrances use one preset (decks with >= 6 entrances)
  counter-dur     count-up (counter / countUp / countTo) data-dur > 2.5s
  stacking        one element stacks 3+ emphasis effects (entrance / data-then / loop / hit -- a hit
                  lands on the FIRST element its selector matches, an unknown hit preset runs as pulse;
                  emphasis = the engine's EMPHASIS/FUN classification + annotation presets, registered
                  names only)
  breath          no beat with <= 2 entrances
  transitions     > 3 showy transitions (anything but cut / crossDissolve / dissolve / fade;
                  a missing or empty data-transition-in is the engine default, crossDissolve)
  diversity       fewer than 6 distinct presets
  signature       no emphasis preset reused on >= 3 beats (ties: more beats, more uses,
                  first used)
  atmosphere      beat > 8s with no ambient layer / known loop / hold / moving camera
  overshoot       animation finishes within --margin (0.4s) of the next cue, or after it
                  (continuous layers -- data-dur >= 999, e.g. filmGrain -- never count)
  audio           audio element missing, or audio file missing before VO generation
  timings         TIMINGS computed at runtime (not a literal the tools can rewrite); cues that are not
                  `const TIMINGS` (inline init({timings:[...]}), CFG.timings, const CUES): the voice /
                  AAF tools re-seed only const TIMINGS; negative time
  words           malformed / out-of-order WORDS entries
  sfx             const SFX entries: unknown library name, missing file, time outside video
  placeholders    unfilled {{PLACEHOLDER}} tokens (INFO with --allow-placeholders)
  unscheduled     data-anim without class="anim"; .anim-group without data-stagger whose children
                  are not class="anim" themselves
  attr-values     non-finite numeric attributes (data-t-rel="fast", data-dur="Infinity" ...);
                  data-camera with no keyframe the engine can parse ("t=>scale:1.1,x:-40; ...")
  engine-version  inline legacy engine / deck copy of the engine older than the skill's
  engine          the deck's engine threw under the stub DOM although its source looks sane
  internal        a WARN-class audit check crashed (the others still ran)

Usage:
  python audit_deck.py storyboard.html
  python audit_deck.py storyboard.html --write          # also writes audit.md (every finding) next to the deck
  python audit_deck.py storyboard.html --json           # machine-readable report on stdout
  python audit_deck.py storyboard.html --margin 0.5     # cue safety margin (default 0.4s)
  python audit_deck.py storyboard.html --registry       # print the registry of the deck's engine
  python audit_deck.py --registry                       # ... of the skill engine (or --engine PATH)
  options: --engine PATH, --no-node, --no-cache, --allow-placeholders, --platform windows|mac|linux

Exit code: 0 clean (info only), 1 warnings only, 2 any error -- also 2 when the deck is missing
or the audit itself crashes (a gate must fail closed).
Text output is ASCII-only when stdout is not UTF-8; --json and audit.md keep full Unicode.
Registry cache: $STORYBOARD_AUDIT_CACHE (default <tmp>/storyboard-audit-cache), keyed by the
engine file's sha256. Render OS for the font check: --platform, else $STORYBOARD_RENDER_PLATFORM,
else this machine.
"""
from __future__ import annotations

import argparse
import ast
import difflib
import hashlib
import html
import json
import os
import posixpath
import re
import shutil
import subprocess
import sys
import tempfile
import time
import wave
from collections import Counter
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

AUDIT_VERSION = '0.8.0'
REGISTRY_SCHEMA = 7            # bump when the registry dict shape / extraction changes
SKILL_DIR = Path(__file__).resolve().parent
SKILL_ENGINE = SKILL_DIR / 'storyboard-engine.js'

DEFAULT_MARGIN = 0.4           # seconds an entrance must finish before the next cue
LONG_BEAT_S = 8.0
MAX_SHOWY_TRANSITIONS = 3
MAX_COUNTER_DUR = 2.5
MAX_HITS_PER_MIN = 5.0
HOOK_FIRST_MOTION_S = 0.6
HOOK_HEADLINE_S = 1.5
MAX_WORDS_HORIZONTAL = 30
MAX_WORDS_VERTICAL = 18
MONOTONY_SHARE = 0.40
MONOTONY_MIN_ENTRANCES = 6
MIN_DISTINCT_PRESETS = 6
SIGNATURE_MIN_BEATS = 3
CONTINUOUS_DUR = 999.0         # preset/element durations >= this are "runs forever" layers
DEFAULT_TRANSITION = 'crossDissolve'
RENDER_API = ('renderAt', 'ready', 'events', 'duration', 'meta')     # v0.8 offline-render contract
QUIET_TRANSITIONS = {'cut', 'crossDissolve', 'dissolve', 'fade'}

# Presets that are reused as a project's signature move (emphasis entrances + kinetic type).
SIGNATURE_PRESETS = {'spring', 'bounce', 'anticipate', 'overshoot', 'scaleIn', 'popIn',
                     'letterSpring', 'lineReveal', 'wordSwap'}
# Attention-seeking presets: 3+ of these on ONE element is over-emphasis. The engine's own emphasis /
# fun classification (EMPHASIS_PRESETS, FUN_PRESETS, {emphasis:true}) is added per engine; this list
# covers annotation presets it doesn't classify, and engines without those sets (legacy inline).
ATTENTION_PRESETS = {'glow', 'pulse', 'shake', 'wobble', 'squash', 'flicker', 'heartBeat',
                     'rgbGlitch', 'neonOn', 'shimmerSweep', 'highlight', 'underlineDraw',
                     'circleScribble', 'boxDraw', 'strikethrough', 'rays', 'burstLines',
                     'spring', 'bounce', 'anticipate', 'overshoot', 'popIn', 'letterSpring',
                     'starPop', 'emojiPop', 'badgeUnlock'}
ATTENTION_LOOPS = {'pulse', 'beat'}
# Background / camera / grade layers: not "entrances", never overshoot, count as atmosphere.
# Any registry preset whose default dur >= CONTINUOUS_DUR is added dynamically.
AMBIENT_PRESETS = {'kenburns', 'parallax', 'particles', 'cameraZoom', 'cameraPan', 'vignette',
                   'aurora', 'constellation', 'filmGrain', 'cinematicGrade', 'emitter', 'sky',
                   'scenery', 'floatShapes', 'scene3d', 'sparkle', 'confettiRain', 'floatEmojis',
                   'pulseRings', 'character', 'cursorTour'}
ATMOSPHERE_EXTRA = {'glow', 'flicker'}
GRADE_LAYERS = {'filmGrain', 'cinematicGrade', 'vignette'}

ASSET_EXTS = ('png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'bmp', 'ico', 'json', 'lottie',
              'mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'mp4', 'webm', 'mov', 'm4v', 'glb',
              'gltf', 'obj', 'hdr', 'exr', 'ktx2', 'woff', 'woff2', 'ttf', 'otf', 'css', 'js', 'mjs',
              'vtt', 'srt', 'csv', 'txt', 'html')
ASSET_DATA_ATTRS = ('data-src', 'data-lottie', 'data-img', 'data-char-src', 'data-poster', 'data-bg',
                    'data-image', 'data-model', 'data-audio', 'data-video', 'data-hdr')

GENERIC_FONTS = {'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif',
                 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'emoji', 'math', 'fangsong',
                 'inherit', 'initial', 'unset', 'revert', 'revert-layer', '-apple-system',
                 'blinkmacsystemfont', 'caption', 'icon', 'menu', 'message-box', 'small-caption',
                 'status-bar'}
# Families a stack can name WITHOUT loading anything -- per OS, because the video is rendered by the
# local Chromium (render_video.py): a macOS-only family (Avenir, Helvetica Neue, Menlo ...) silently
# falls back on Windows / Linux. Helvetica / Times / Courier resolve everywhere (Windows font
# substitutes, fontconfig metric aliases on Linux). --platform picks the render OS (default: this one).
_FONTS_EVERYWHERE = {'arial', 'helvetica', 'times', 'times new roman', 'courier', 'courier new'}
PLATFORM_FONTS = {
    'windows': _FONTS_EVERYWHERE | {
        'arial black', 'arial narrow', 'georgia', 'verdana', 'tahoma', 'trebuchet ms', 'impact',
        'comic sans ms', 'palatino linotype', 'book antiqua', 'garamond', 'lucida console',
        'lucida sans unicode', 'lucida sans', 'segoe ui', 'segoe ui emoji', 'segoe ui symbol',
        'segoe ui historic', 'segoe print', 'segoe script', 'calibri', 'cambria', 'cambria math',
        'candara', 'consolas', 'constantia', 'corbel', 'franklin gothic medium', 'gabriola', 'sylfaen',
        'symbol', 'webdings', 'wingdings', 'cascadia code', 'cascadia mono', 'bahnschrift', 'ink free',
        'sitka text', 'sitka heading', 'sitka display', 'ebrima', 'gadugi', 'nirmala ui', 'leelawadee ui',
        'javanese text', 'mv boli', 'myanmar text', 'microsoft sans serif', 'ms sans serif', 'ms serif',
        'ms gothic', 'yu gothic', 'yu gothic ui', 'microsoft yahei', 'microsoft jhenghei', 'simsun',
        'malgun gothic'},
    'mac': _FONTS_EVERYWHERE | {
        'arial black', 'arial narrow', 'arial rounded mt bold', 'georgia', 'verdana', 'tahoma',
        'trebuchet ms', 'impact', 'comic sans ms', 'palatino', 'lucida grande', 'helvetica neue', 'geneva',
        'menlo', 'monaco', 'avenir', 'avenir next', 'avenir next condensed', 'futura', 'gill sans',
        'optima', 'didot', 'baskerville', 'big caslon', 'bodoni 72', 'cochin', 'hoefler text', 'charter',
        'iowan old style', 'seravek', 'athelas', 'american typewriter', 'andale mono', 'copperplate',
        'marker felt', 'noteworthy', 'rockwell', 'skia', 'chalkboard', 'papyrus', 'zapfino',
        'apple color emoji', 'apple sd gothic neo', 'pingfang sc', 'pingfang tc', 'pingfang hk',
        'hiragino sans', 'hiragino kaku gothic pro', 'hiragino mincho pron', 'apple chancery'},
    'linux': _FONTS_EVERYWHERE | {
        'dejavu sans', 'dejavu serif', 'dejavu sans mono', 'liberation sans', 'liberation serif',
        'liberation mono', 'noto sans', 'noto serif', 'noto sans mono', 'noto color emoji', 'ubuntu',
        'ubuntu mono', 'cantarell', 'droid sans', 'droid serif', 'droid sans mono', 'freesans',
        'freeserif', 'freemono', 'nimbus sans', 'nimbus roman', 'nimbus mono ps'},
}
PLATFORM_LABEL = {'windows': 'Windows', 'mac': 'macOS', 'linux': 'Linux'}
# Apple's system UI families are hidden: no OS resolves them by name (on macOS use -apple-system /
# BlinkMacSystemFont / system-ui). Only an @font-face / an installed developer copy makes them work.
HIDDEN_FONTS = {'sf pro', 'sf pro display', 'sf pro text', 'sf pro rounded', 'sf compact', 'sf compact display',
                'sf compact text', 'sf mono', 'sfmono-regular', 'san francisco', 'new york', '.sf ns',
                '.sf ns display', '.sf ns text', '.sfnstext-regular', '.applesystemuifont'}
# Native UI / code families that a "system stack" lists one per OS ('Segoe UI', Roboto, Helvetica,
# Arial ...): the next family that exists here is the intended font, not a fallback (INFO, not WARN).
NATIVE_STACK_FONTS = {'segoe ui', 'segoe ui variable', 'roboto', 'ubuntu', 'cantarell', 'oxygen', 'oxygen-sans',
                      'fira sans', 'droid sans', 'noto sans', 'helvetica neue', 'lucida grande', 'sf pro',
                      'sf pro text', 'sf pro display', 'san francisco', '.sf ns', '.sf ns text',
                      '.sfnstext-regular', 'menlo', 'monaco', 'sf mono', 'sfmono-regular', 'consolas',
                      'cascadia code', 'cascadia mono', 'ubuntu mono', 'dejavu sans mono', 'liberation mono',
                      'roboto mono', 'lucida console', 'dejavu sans', 'liberation sans'}
# Google Fonts stand-ins for OS-only families (fix suggestions)
FONT_STANDINS = {'sf pro': 'Inter', 'sf pro display': 'Inter', 'sf pro text': 'Inter', 'sf pro rounded': 'Nunito',
                 'san francisco': 'Inter', 'helvetica neue': 'Inter', 'segoe ui': 'Open Sans',
                 'avenir': 'Nunito Sans', 'avenir next': 'Nunito Sans', 'futura': 'Jost', 'gill sans': 'Lato',
                 'didot': 'Playfair Display', 'bodoni 72': 'Bodoni Moda', 'baskerville': 'Libre Baskerville',
                 'optima': 'Marcellus', 'menlo': 'JetBrains Mono', 'monaco': 'JetBrains Mono',
                 'sf mono': 'JetBrains Mono', 'sfmono-regular': 'JetBrains Mono', 'consolas': 'JetBrains Mono',
                 'cascadia code': 'JetBrains Mono', 'calibri': 'Carlito', 'cambria': 'Caladea',
                 'roboto': 'Roboto', 'ubuntu': 'Ubuntu', 'charter': 'Charis SIL', 'iowan old style': 'Crimson Pro'}


def render_platform(value=None):
    """'windows' | 'mac' | 'linux': the OS whose Chromium renders the video -- `value` (--platform), else
    $STORYBOARD_RENDER_PLATFORM, else this machine."""
    v = str(value or os.environ.get('STORYBOARD_RENDER_PLATFORM') or sys.platform).strip().lower()
    if v.startswith(('win', 'cygwin', 'msys')):
        return 'windows'
    if v.startswith(('darwin', 'mac', 'osx')):
        return 'mac'
    return 'linux'
FONT_PROVIDERS_OPAQUE = ('use.typekit.net', 'p.typekit.net', 'fonts.adobe.com', 'fast.fonts.net',
                         'cloud.typography.com', 'fonts.cdnfonts.com', 'fontlibrary.org', 'fonts.fontshare.com',
                         'api.fontshare.com')
FONT_PROVIDERS_FAMILY_QS = ('fonts.googleapis.com', 'fonts.bunny.net', 'fonts.coollabs.io')
# --*font* custom properties that hold something other than a family stack
_FONT_TOKEN_NOT_FAMILY = re.compile(r'size|weight|feature|variation|stretch|style|height|leading|tracking|'
                                    r'spacing|letter|scale|kern|smooth|optical|synth|variant|palette|adjust|width|'
                                    r'ratio|step|fluid|min|max|clamp|lh\b|color|colour|shadow', re.I)

_ASSET_VALUE_RE = re.compile(r'[\w./\\%() -]+\.(?:' + '|'.join(ASSET_EXTS) + r')', re.I)
# data-* attributes whose value is display text (a filename shown on screen is not an asset)
TEXT_DATA_ATTRS = {'data-text', 'data-words', 'data-url', 'data-prefix', 'data-suffix', 'data-label',
                   'data-title', 'data-caption', 'data-file', 'data-filename', 'data-name', 'data-emoji',
                   'data-emojis', 'data-from', 'data-to', 'data-tab', 'data-cmd', 'data-code', 'data-lang',
                   'data-key', 'data-shared-id', 'data-path', 'data-tooltip', 'data-alt', 'data-value',
                   'data-char-svg'}                   # (data-char-svg is a flag: the engine never loads it)
CONTRACT_CAPTION_MODES = ('karaoke', 'line', 'pop')          # used only if the engine's own list can't be read
CONTRACT_CAPTION_POSITIONS = ('bottom', 'lower-third')
CAPTION_OFF_WORDS = {'off', 'false', 'none', '0', 'no'}
_HOSTLIKE_RE = re.compile(r'^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?::\d+)?/', re.I)   # yourapp.com/x
_NUM_PREFIX = re.compile(r'\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)')
_INF_PREFIX = re.compile(r'\s*([+-]?)Infinity')
_INT_PREFIX = re.compile(r'\s*([+-]?\d+)')
_PLACEHOLDER_RE = re.compile(r'\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}')


def js_float(value):
    """JS parseFloat semantics: leading number (incl. +-Infinity) or None (NaN)."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value)
    m = _NUM_PREFIX.match(s)
    if m:
        return float(m.group(1))
    m = _INF_PREFIX.match(s)
    return (float('-inf') if m.group(1) == '-' else float('inf')) if m else None


def js_finite(value):
    """parseFloat + isFinite: a usable number or None (the engine ignores NaN / Infinity)."""
    f = js_float(value)
    return f if f is not None and f not in (float('inf'), float('-inf')) else None


def js_int(value):
    """JS parseInt(value, 10) semantics: leading integer or None (NaN)."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, float):
        return int(value) if value == value and value not in (float('inf'), float('-inf')) else None
    if isinstance(value, int):
        return value
    m = _INT_PREFIX.match(str(value))
    return int(m.group(1)) if m else None


def fmt_s(x):
    return f'{x:.2f}s' if isinstance(x, (int, float)) else '?'


# =============================================================================
# JS lexer (just enough to walk object/array literals in the engine + deck)
# =============================================================================
_REGEX_PREV_PUNCT = set('(,=:[!&|?{};+-*%<>~^')
_REGEX_PREV_WORDS = {'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw',
                     'case', 'do', 'else', 'yield', 'await'}
_JS_NUM_RE = re.compile(r'0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?n?')
_OPEN, _CLOSE = ('{', '(', '['), ('}', ')', ']')


def _js_skip_template(src, i, n):
    j = i + 1
    while j < n:
        ch = src[j]
        if ch == '\\':
            j += 2
            continue
        if ch == '`':
            return j + 1
        if ch == '$' and j + 1 < n and src[j + 1] == '{':
            close = js_match(src, j + 1, n)
            if close < 0:
                return n
            j = close + 1
            continue
        j += 1
    return n


def js_lex(src, i=0, end=None):
    """Yield (kind, text, pos) tokens; kind in ident/num/string/template/regex/punct."""
    n = len(src) if end is None else min(end, len(src))
    prev = None
    while i < n:
        c = src[i]
        if c.isspace() or c == '﻿':
            i += 1
            continue
        if c == '/' and i + 1 < n and src[i + 1] == '/':
            j = src.find('\n', i)
            i = n if j < 0 else j
            continue
        if c == '/' and i + 1 < n and src[i + 1] == '*':
            j = src.find('*/', i + 2)
            i = n if j < 0 else j + 2
            continue
        if c == '"' or c == "'":
            j = i + 1
            while j < n and src[j] != c and src[j] != '\n':
                j += 2 if src[j] == '\\' else 1
            tok = ('string', src[i:j + 1], i)
            i = j + 1
        elif c == '`':
            j = _js_skip_template(src, i, n)
            tok = ('template', src[i:j], i)
            i = j
        elif c == '/' and (prev is None or (prev[0] == 'punct' and prev[1][-1] in _REGEX_PREV_PUNCT)
                           or (prev[0] == 'ident' and prev[1] in _REGEX_PREV_WORDS)):
            j, in_class = i + 1, False
            while j < n:
                ch = src[j]
                if ch == '\\':
                    j += 2
                    continue
                if ch == '\n':
                    break
                if in_class:
                    in_class = ch != ']'
                elif ch == '[':
                    in_class = True
                elif ch == '/':
                    break
                j += 1
            j += 1
            while j < n and (src[j].isalnum() or src[j] == '_'):
                j += 1
            tok = ('regex', src[i:j], i)
            i = j
        elif c.isalpha() or c in '_$' or ord(c) > 127:
            j = i + 1
            while j < n and (src[j].isalnum() or src[j] in '_$' or ord(src[j]) > 127):
                j += 1
            tok = ('ident', src[i:j], i)
            i = j
        elif c.isdigit() or (c == '.' and i + 1 < n and src[i + 1].isdigit()):
            m = _JS_NUM_RE.match(src, i)
            j = m.end() if m and m.end() > i else i + 1
            tok = ('num', src[i:j], i)
            i = j
        else:
            for p in ('...', '=>', '?.', '??'):
                if src.startswith(p, i):
                    tok = ('punct', p, i)
                    i += len(p)
                    break
            else:
                tok = ('punct', c, i)
                i += 1
        prev = tok
        yield tok


def js_blank_comments(src):
    """Same-length copy of src with // and /* */ comments blanked (newlines kept), so regex
    searches for `const TIMINGS =` / `Storyboard.init(` never hit commented-out code."""
    out, last = [], 0
    for kind, text, pos in js_lex(src):
        gap = src[last:pos]
        out.append(re.sub(r'[^\n]', ' ', gap) if ('/' in gap) else gap)
        out.append(text)
        last = pos + len(text)
    gap = src[last:]
    out.append(re.sub(r'[^\n]', ' ', gap) if '/' in gap else gap)
    return ''.join(out)


def js_match(src, i, end=None):
    """Index of the bracket closing the one at src[i], or -1."""
    depth = 0
    for kind, text, pos in js_lex(src, i, end):
        if kind == 'punct':
            if text in _OPEN:
                depth += 1
            elif text in _CLOSE:
                depth -= 1
                if depth == 0:
                    return pos
    return -1


def js_object_entries(src, i):
    """Top-level entries of the object literal at src[i] == '{' as (key, vstart, vend)."""
    j = js_match(src, i)
    if j < 0:
        return []
    entries, cur, depth = [], [], 0
    for tok in js_lex(src, i + 1, j):
        kind, text = tok[0], tok[1]
        if kind == 'punct' and text in _OPEN:
            if depth == 0:
                cur.append(tok)
            depth += 1
            continue
        if kind == 'punct' and text in _CLOSE:
            depth -= 1
            if depth == 0:
                cur.append(tok)
            continue
        if depth:
            continue
        if kind == 'punct' and text == ',':
            entries.append(cur)
            cur = []
        else:
            cur.append(tok)
    if cur:
        entries.append(cur)
    out = []
    for e in entries:
        if not e or e[0][1] == '...':
            continue
        if e[0][0] == 'ident' and e[0][1] in ('get', 'set', 'async', 'static') and len(e) > 1 \
                and e[1][0] in ('ident', 'string'):
            e = e[1:]
        k0 = e[0]
        if k0[0] == 'ident' or k0[0] == 'num':
            key = k0[1]
        elif k0[0] == 'string':
            key = _js_unquote(k0[1])
        else:
            continue
        if len(e) > 1 and e[1][1] == ':' and len(e) > 2:
            last = e[-1]
            out.append((key, e[2][2], last[2] + len(last[1])))
        elif len(e) == 1:
            out.append((key, k0[2], k0[2] + len(k0[1])))     # shorthand {init}
        else:
            out.append((key, None, None))                   # method shorthand name(){}
    return out


def _js_unquote(tok):
    try:
        v = ast.literal_eval(tok)
        return v if isinstance(v, str) else tok[1:-1]
    except Exception:
        return tok[1:-1]


class _Expr:
    """Sentinel for a JS expression the literal parser can't evaluate."""
    def __init__(self, text):
        self.text = text

    def __repr__(self):
        return f'<expr {self.text[:30]!r}>'


class _JSLiteral:
    """Tolerant JS literal parser (objects, arrays, strings, numbers, true/false/null).
    Anything else becomes an _Expr (identifiers keep their name in .text)."""

    def __init__(self, src, start, end):
        self.src = src
        self.toks = list(js_lex(src, start, end))
        self.i = 0

    def _peek(self):
        return self.toks[self.i] if self.i < len(self.toks) else ('eof', '', len(self.src))

    def parse(self):
        return self.value()

    def _skip_expr(self):
        start = self._peek()[2]
        depth, last_end = 0, start
        while self.i < len(self.toks):
            kind, text, pos = self.toks[self.i]
            if kind == 'punct' and depth == 0 and text in (',', '}', ']', ')'):
                break
            if kind == 'punct' and text in _OPEN:
                depth += 1
            elif kind == 'punct' and text in _CLOSE:
                depth -= 1
            last_end = pos + len(text)
            self.i += 1
        return _Expr(self.src[start:last_end].strip())

    def value(self):
        kind, text, pos = self._peek()
        nxt = self.toks[self.i + 1] if self.i + 1 < len(self.toks) else ('eof', '', 0)
        simple_end = nxt[0] == 'eof' or (nxt[0] == 'punct' and nxt[1] in (',', '}', ']', ')'))
        if kind == 'punct' and text == '{':
            return self._obj()
        if kind == 'punct' and text == '[':
            return self._arr()
        if kind == 'string' and simple_end:
            self.i += 1
            return _js_unquote(text)
        if kind == 'template' and simple_end and '${' not in text:
            self.i += 1
            return text[1:-1]
        if kind == 'num' and simple_end:
            self.i += 1
            t = text.replace('_', '').rstrip('n')
            try:
                return int(t, 0) if t[:2].lower() in ('0x', '0b', '0o') else float(t)
            except ValueError:
                return _Expr(text)
        if kind == 'punct' and text in ('-', '+') and nxt[0] == 'num':
            after = self.toks[self.i + 2] if self.i + 2 < len(self.toks) else ('eof', '', 0)
            if after[0] == 'eof' or (after[0] == 'punct' and after[1] in (',', '}', ']', ')')):
                self.i += 1
                v = self.value()
                return -v if text == '-' and isinstance(v, (int, float)) else v
        if kind == 'ident' and simple_end:
            self.i += 1
            return {'true': True, 'false': False, 'null': None, 'undefined': None}.get(text, _Expr(text))
        return self._skip_expr()

    def _obj(self):
        self.i += 1
        out = {}
        while self.i < len(self.toks):
            kind, text, pos = self._peek()
            if kind == 'punct' and text == '}':
                self.i += 1
                return out
            if kind == 'punct' and text == ',':
                self.i += 1
                continue
            if kind in ('ident', 'num', 'string'):
                key = _js_unquote(text) if kind == 'string' else text
                self.i += 1
                if self._peek()[1] == ':':
                    self.i += 1
                    out[key] = self.value()
                elif self._peek()[1] in (',', '}'):
                    out[key] = _Expr(key)                       # shorthand property
                else:
                    self._skip_expr()                            # method etc.
            else:
                self._skip_expr()
                if self._peek()[1] not in (',', '}'):
                    self.i += 1
        return out

    def _arr(self):
        self.i += 1
        out = []
        while self.i < len(self.toks):
            kind, text, pos = self._peek()
            if kind == 'punct' and text == ']':
                self.i += 1
                return out
            if kind == 'punct' and text == ',':
                self.i += 1
                continue
            before = self.i
            out.append(self.value())
            if self.i == before:
                self.i += 1
        return out


def js_literal_at(src, i):
    """Parse the JS literal starting at src[i] ('[' / '{' / scalar). Returns (value, end)."""
    while i < len(src) and src[i].isspace():
        i += 1
    if i >= len(src):
        return None, i
    if src[i] in '[{':
        j = js_match(src, i)
        if j < 0:
            return _Expr(src[i:i + 40]), len(src)
        return _JSLiteral(src, i, j + 1).parse(), j + 1
    m = re.compile(r'[^;\n]*').match(src, i)
    return _JSLiteral(src, i, m.end()).parse(), m.end()


# =============================================================================
# Minimal HTML DOM (stdlib html.parser) + a small CSS selector matcher
# =============================================================================
VOID_TAGS = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param',
             'source', 'track', 'wbr'}
P_CLOSERS = {'address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'fieldset',
             'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header',
             'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul'}
NON_RENDERED = {'script', 'style', 'template', 'noscript', 'title', 'desc', 'metadata', 'head'}


class Node:
    __slots__ = ('tag', 'attrs', 'children', 'parent', 'line', 'raw', 'idx')

    def __init__(self, tag, attrs, parent, line=0, raw=''):
        self.tag, self.attrs, self.parent, self.line, self.raw = tag, attrs, parent, line, raw
        self.children = []
        self.idx = 0

    def get(self, name, default=None):
        return self.attrs.get(name, default)

    def has(self, name):
        return name in self.attrs

    @property
    def classes(self):
        return self.attrs.get('class', '').split()

    def elements(self):
        return [c for c in self.children if isinstance(c, Node)]

    def iter(self):
        stack = [self]
        while stack:
            n = stack.pop()
            yield n
            stack.extend(reversed([c for c in n.children if isinstance(c, Node)]))

    def live_iter(self):
        """iter() minus <template> / <noscript> content -- what document.querySelectorAll sees (template
        content is an inert fragment; noscript is raw text while scripts run)."""
        stack = [self]
        while stack:
            n = stack.pop()
            yield n
            if n.tag not in ('template', 'noscript'):
                stack.extend(reversed([c for c in n.children if isinstance(c, Node)]))

    def ancestors(self, include_self=False):
        n = self if include_self else self.parent
        while n is not None and n.tag != '#document':
            yield n
            n = n.parent

    def text(self):
        out = []
        stack = [self]
        while stack:
            n = stack.pop()
            if isinstance(n, str):
                out.append(n)
            elif n.tag not in NON_RENDERED:
                stack.extend(reversed(n.children))
        return ''.join(out)


class _DomBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node('#document', {}, None)
        self.stack = [self.root]
        self.count = 0

    def _open(self, tag, attrs, selfclose):
        top = self.stack[-1]
        if top.tag == 'p' and tag in P_CLOSERS:
            self.stack.pop()
        elif tag in ('li', 'dt', 'dd', 'option', 'tr', 'td', 'th'):
            peers = {'li': ('li',), 'dt': ('dt', 'dd'), 'dd': ('dt', 'dd'), 'option': ('option',),
                     'tr': ('tr', 'td', 'th'), 'td': ('td', 'th'), 'th': ('td', 'th')}[tag]
            walls = {'ul', 'ol', 'menu', 'dl', 'select', 'table', 'tbody', 'thead', 'tfoot', 'tr', 'datalist'}
            for k in range(len(self.stack) - 1, 0, -1):
                t = self.stack[k].tag
                if t in peers:
                    del self.stack[k:]
                    break
                if t in walls or t in ('div', 'section'):
                    break
        parent = self.stack[-1]
        node = Node(tag, {k: ('' if v is None else v) for k, v in attrs}, parent,
                    self.getpos()[0], self.get_starttag_text() or '')
        self.count += 1
        node.idx = self.count
        parent.children.append(node)
        if not selfclose and tag not in VOID_TAGS:
            self.stack.append(node)

    def handle_starttag(self, tag, attrs):
        self._open(tag, attrs, False)

    def handle_startendtag(self, tag, attrs):
        self._open(tag, attrs, True)

    def handle_endtag(self, tag):
        for k in range(len(self.stack) - 1, 0, -1):
            if self.stack[k].tag == tag:
                del self.stack[k:]
                return

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def parse_html(text):
    b = _DomBuilder()
    b.feed(text)
    b.close()
    return b.root


_SEL_TOK = re.compile(r'''(?P<ws>\s*>\s*|\s+)|(?P<tag>\*|[A-Za-z][\w-]*)|\#(?P<id>[\w-]+)|\.(?P<cls>[\w-]+)|
    \[\s*(?P<attr>[\w:.-]+)\s*(?:(?P<op>[~|^$*]?=)\s*(?P<val>"[^"]*"|'[^']*'|[^\]\s]+)\s*)?\]''', re.X)


def _parse_selector(sel):
    groups, depth, buf = [], 0, ''
    for ch in sel:
        if ch in '[(':
            depth += 1
        elif ch in '])':
            depth -= 1
        if ch == ',' and depth == 0:
            groups.append(buf)
            buf = ''
        else:
            buf += ch
    groups.append(buf)
    parsed = []
    for part in groups:
        part = part.strip()
        if not part:
            return None
        seq, comb, pos = [], None, 0
        cur = {'tag': None, 'id': None, 'cls': [], 'attrs': []}
        empty = True
        while pos < len(part):
            m = _SEL_TOK.match(part, pos)
            if not m or m.end() == pos:
                return None                                   # pseudo-classes, + ~ etc: unsupported
            if m.group('ws') is not None:
                if empty:
                    return None
                seq.append((comb, cur))
                comb = '>' if '>' in m.group('ws') else ' '
                cur = {'tag': None, 'id': None, 'cls': [], 'attrs': []}
                empty = True
            elif m.group('tag'):
                if not empty:
                    return None
                cur['tag'] = m.group('tag').lower()
                empty = False
            elif m.group('id'):
                cur['id'] = m.group('id')
                empty = False
            elif m.group('cls'):
                cur['cls'].append(m.group('cls'))
                empty = False
            else:
                val = m.group('val')
                if val and val[0] in '"\'':
                    val = val[1:-1]
                cur['attrs'].append((m.group('attr').lower(), m.group('op'), val))
                empty = False
            pos = m.end()
        if empty:
            return None
        seq.append((comb, cur))
        parsed.append(seq)
    return parsed


def _match_compound(n, c):
    if c['tag'] and c['tag'] != '*' and n.tag != c['tag']:
        return False
    if c['id'] and n.get('id') != c['id']:
        return False
    if c['cls']:
        have = set(n.classes)
        if not all(x in have for x in c['cls']):
            return False
    for name, op, val in c['attrs']:
        if name not in n.attrs:
            return False
        v = n.attrs[name]
        if op is None:
            continue
        if (op == '=' and v != val) or (op == '~=' and val not in v.split()) or \
                (op == '|=' and not (v == val or v.startswith(val + '-'))) or \
                (op == '^=' and not v.startswith(val)) or (op == '$=' and not v.endswith(val)) or \
                (op == '*=' and val not in v):
            return False
    return True


def _match_seq(n, seq, k):
    comb, comp = seq[k]
    if not _match_compound(n, comp):
        return False
    if k == 0:
        return True
    if comb == '>':
        p = n.parent
        return p is not None and p.tag != '#document' and _match_seq(p, seq, k - 1)
    return any(_match_seq(a, seq, k - 1) for a in n.ancestors())


def css_select(root, selector):
    """root.querySelectorAll(selector): matching descendants in document order (never root itself, never
    <template> content), or None when the selector is unsupported."""
    parsed = _parse_selector(selector or '')
    if parsed is None:
        return None
    return [n for n in root.live_iter() if n is not root and n.tag != '#document'
            and any(_match_seq(n, seq, len(seq) - 1) for seq in parsed)]


def snippet(node, limit=150):
    if node is None:
        return ''
    raw = node.raw or f'<{node.tag}>'
    s = html.unescape(re.sub(r'\s+', ' ', raw)).strip()
    if len(s) > limit:
        return s[:limit - 3] + '...'
    if node.tag not in VOID_TAGS and node.tag not in NON_RENDERED and node.tag not in ('html', 'body'):
        txt = re.sub(r'\s+', ' ', node.text()).strip()     # a text preview makes the element findable
        room = limit - len(s)
        if txt and room > 12:
            s += txt if len(txt) <= room else txt[:room - 3].rstrip() + '...'
    return s


# =============================================================================
# Engine registry (derived from the engine source, never hardcoded)
# =============================================================================
# The engine runs inside a fresh vm context: every stub is created IN that context and only
# primitives cross the boundary, so engine code cannot reach node's process / require / fs (a
# deck's own storyboard-engine.js may come from anywhere). Sync + microtask work is time-boxed.
_NODE_HARNESS = r"""
const fs=require('fs'),vm=require('vm');const MARK='\n@@SB_REGISTRY@@';
let json=null,fail=null;
try{
 const ctx=vm.createContext(Object.create(null),{microtaskMode:'afterEvaluate',codeGeneration:{strings:true,wasm:false}});
 ctx.__SRC=fs.readFileSync(process.argv[1],'utf8');
 vm.runInContext(process.argv[2],ctx,{timeout:5000});
 try{vm.runInContext('with(__W){\n'+ctx.__SRC+'\n}',ctx,{timeout:8000,filename:'storyboard-engine.js'});}
 catch(e){let m='engine threw',nm='Error';
  try{nm=String((e&&e.name)||'Error');const st=String((e&&e.stack)||'').split('\n');
   const lm=/storyboard-engine\.js:(\d+)/.exec(st[0]||'');            /* line 1 is the with(){ wrapper */
   m=nm+': '+String((e&&e.message)||e).slice(0,200)+(lm?' (line '+Math.max(1,lm[1]-1)+')':'');}catch(_){}
  vm.runInContext('__out.error='+JSON.stringify(m)+';__out.error_name='+JSON.stringify(nm),ctx,{timeout:1000});}
 json=vm.runInContext('__extract()',ctx,{timeout:5000});
}catch(e){fail=String(e&&e.message||e).slice(0,300);}
process.stdout.write(MARK+(typeof json==='string'?json:JSON.stringify({ok:false,error:fail||'no output'}))+'\n');
"""

# Runs inside the vm context (argv[2] of the harness): browser stubs + the registry extractor.
_NODE_SANDBOX = r"""
var __out={ok:false,error:null};
function noop(){}
var ANY=new Proxy(function(){},{get:function(t,k){if(k===Symbol.toPrimitive)return function(h){return h==='number'?0:'';};
 if(k===Symbol.iterator)return function*(){};if(typeof k==='symbol'||k==='then')return undefined;
 if(k==='length')return 0;return ANY;},set:function(){return true;},apply:function(){return ANY;},
 construct:function(){return ANY;},has:function(){return false;},deleteProperty:function(){return true;}});
function anyWith(o){return new Proxy(o,{get:function(t,k){if(k in t)return t[k];if(k===Symbol.toPrimitive)return function(){return '';};
 if(typeof k==='symbol'||k==='then')return undefined;return ANY;},set:function(t,k,v){t[k]=v;return true;}});}
function Obs(){}Obs.prototype.observe=noop;Obs.prototype.unobserve=noop;Obs.prototype.disconnect=noop;
Obs.prototype.takeRecords=function(){return[];};
var store={getItem:function(){return null;},setItem:noop,removeItem:noop,clear:noop,key:function(){return null;},length:0};
var G=globalThis;
/* identifiers the engine reads without declaring them resolve to undefined instead of throwing */
var __W=new Proxy(G,{has:function(t,k){return typeof k==='string';},
 get:function(t,k){return (k in t)?t[k]:undefined;},set:function(t,k,v){t[k]=v;return true;}});
Object.assign(G,{window:G,self:G,top:G,parent:G,frames:G,
 document:anyWith({readyState:'loading',baseURI:'http://localhost/',URL:'http://localhost/deck.html',
  currentScript:{src:'http://localhost/storyboard-engine.js',dataset:{},getAttribute:function(){return null;}},
  fonts:{ready:Promise.resolve(),status:'loaded',addEventListener:noop,load:function(){return Promise.resolve([]);},check:function(){return true;}}}),
 navigator:{userAgent:'storyboard-audit',language:'en',languages:['en'],hardwareConcurrency:4},
 location:{href:'http://localhost/deck.html',pathname:'/deck.html',search:'',hash:'',origin:'http://localhost',protocol:'http:',host:'localhost',hostname:'localhost',port:''},
 performance:{now:function(){return 0;},mark:noop,measure:noop},requestAnimationFrame:function(){return 0;},cancelAnimationFrame:noop,
 requestIdleCallback:function(){return 0;},cancelIdleCallback:noop,setTimeout:function(){return 0;},setInterval:function(){return 0;},
 clearTimeout:noop,clearInterval:noop,queueMicrotask:function(f){Promise.resolve().then(f);},structuredClone:function(x){return x;},
 getComputedStyle:function(){return ANY;},matchMedia:function(){return {matches:false,media:'',addEventListener:noop,removeEventListener:noop,addListener:noop,removeListener:noop};},
 localStorage:store,sessionStorage:store,addEventListener:noop,removeEventListener:noop,dispatchEvent:function(){return true;},
 innerWidth:1920,innerHeight:1080,outerWidth:1920,outerHeight:1080,devicePixelRatio:1,scrollX:0,scrollY:0,
 screen:{width:1920,height:1080},scrollTo:noop,alert:noop,open:noop,close:noop,getSelection:function(){return ANY;},
 atob:function(){return '';},btoa:function(){return '';},
 console:{log:noop,info:noop,warn:noop,error:noop,debug:noop,trace:noop,group:noop,groupEnd:noop,table:noop},
 fetch:function(){return new Promise(noop);},CSS:{supports:function(){return false;},escape:function(s){return String(s);}},
 MutationObserver:Obs,ResizeObserver:Obs,IntersectionObserver:Obs,PerformanceObserver:Obs});
['Image','Audio','AudioContext','webkitAudioContext','OfflineAudioContext','HTMLElement','Element','Node',
 'SVGElement','HTMLCanvasElement','HTMLMediaElement','HTMLAudioElement','HTMLVideoElement','HTMLImageElement','DocumentFragment',
 'Event','CustomEvent','KeyboardEvent','MouseEvent','FontFace','DOMParser','XMLSerializer','XMLHttpRequest','Worker',
 'OffscreenCanvas','Path2D','DOMMatrix','WebGLRenderingContext','WebGL2RenderingContext','MediaSource','ImageBitmap',
 'createImageBitmap','EventTarget','URL','URLSearchParams','TextEncoder','TextDecoder','Blob','File','FileReader',
 'BroadcastChannel','AbortController'].forEach(function(n){G[n]=ANY;});
function __extract(){
 var SB=G.Storyboard||G.STORYBOARD,out=__out;
 function keysOf(o){try{if(!o)return[];if(typeof o==='function'){var r=o();return Array.isArray(r)?r.map(String):(r&&typeof r==='object'?Object.keys(r):[]);}
  if(Array.isArray(o))return o.map(String);if(typeof o==='object')return Object.keys(o);}catch(e){}return[];}
 function uni(){var s=new Set();for(var i=0;i<arguments.length;i++)arguments[i].forEach(function(x){s.add(x);});return Array.from(s);}
 if(SB&&typeof SB==='object'){
  out.ok=true;out.version=typeof SB.VERSION==='string'?SB.VERSION:null;out.alias=!!(G.Storyboard&&G.Storyboard===G.STORYBOARD);
  out.presets={};var P=(SB.PRESETS&&typeof SB.PRESETS==='object')?SB.PRESETS:null;
  if(P){Object.keys(P).forEach(function(k){var v=P[k],m={};if(v&&typeof v==='object')Object.keys(v).forEach(function(mk){
   var mv=v[mk];if(['number','string','boolean'].indexOf(typeof mv)>=0)m[mk]=mv;});out.presets[k]=m;});}
  else keysOf(SB.presets).forEach(function(k){out.presets[k]={};});
  out.loops=uni(keysOf(SB.LOOPS),keysOf(SB.loops));out.eases=uni(keysOf(SB.EASE),keysOf(SB.eases));
  out.loop_fns=(SB.LOOPS&&typeof SB.LOOPS==='object')?Object.keys(SB.LOOPS).filter(function(k){return typeof SB.LOOPS[k]==='function';}):null;
  out.transitions=uni(keysOf(SB.TRANSITIONS),keysOf(SB.transitions));out.exits=uni(keysOf(SB.EXITS),keysOf(SB.exits));
  out.api=Object.keys(SB);}
 return JSON.stringify(out);
}
"""

_REG_TARGETS = {'PRESETS': 'presets', 'LOOPS': 'loops', 'EASE': 'eases', 'TRANSITIONS': 'transitions',
                'EXITS': 'exits'}
_REG_NAMES = '|'.join(_REG_TARGETS)


# Attributes whose support is feature-detected per engine (an engine that never reads one ignores it).
FEATURE_ATTRS = ('data-exit', 'data-loop', 'data-hold', 'data-ease', 'data-then', 'data-stagger',
                 'data-transition-in', 'data-camera', 'data-captions')


@dataclass
class Registry:
    presets: dict = field(default_factory=dict)     # name -> meta {dur, emphasis, ...}
    loops: set = field(default_factory=set)
    loop_fns: set = None                            # LOOPS entries that are functions (None: unknown)
    eases: set = field(default_factory=set)
    transitions: set = field(default_factory=set)
    exits: set = field(default_factory=set)
    version: str = None
    source: str = 'none'                            # node | source-parse | ... (+ fallbacks)
    engine: str = None
    notes: list = field(default_factory=list)
    api: list = field(default_factory=list)         # Object.keys(Storyboard) when read via node
    alias: bool = None                              # window.STORYBOARD === window.Storyboard (node only)
    ease_css: bool = False                          # resolveEase accepts data-ease="cubic-bezier(...)"
    # --- behaviour read from the engine source (engine_features) ---
    reads: set = field(default_factory=set)         # data-* attributes the engine reads ('data-exit', ...)
    features_known: bool = False                    # False: no source seen -> assume everything is supported
    slide_map: bool = True                          # slides looked up by data-slide (index fallback), v0.8+
    default_transition: str = DEFAULT_TRANSITION    # used for a missing / empty data-transition-in
    transition_aliases: dict = field(default_factory=dict)
    emphasis_set: set = field(default_factory=set)  # the engine's EMPHASIS_PRESETS classification
    fun_set: set = field(default_factory=set)       # ... FUN_PRESETS
    caption_modes: set = field(default_factory=set)
    caption_positions: set = field(default_factory=set)
    hold_fn_only: bool = False                      # data-hold runs only function LOOPS (shimmer/beat are null)
    slides_in_root: bool = False                    # slides = (opts.root || #deck || .deck).querySelectorAll(sel)
    load_error: str = None                          # the engine cannot define Storyboard (empty / syntax / HTML)
    load_warning: str = None                        # threw under the stub DOM although the source looks sane

    def dur(self, name):
        m = self.presets.get(name) or {}
        d = m.get('dur')
        return float(d) if isinstance(d, (int, float)) and not isinstance(d, bool) else None

    def continuous(self):
        return {n for n in self.presets if (self.dur(n) or 0) >= CONTINUOUS_DUR}

    def fun(self):
        return {n for n, m in self.presets.items() if m.get('fun') is True} | set(self.fun_set)

    def emphasis(self):
        """Engine classification (Storyboard.events): emphasis = !fun && (EMPHASIS_PRESETS.has || preset.emphasis)."""
        flagged = {n for n, m in self.presets.items() if m.get('emphasis') is True}
        return (flagged | set(self.emphasis_set)) - self.fun()

    def reads_attr(self, attr):
        """Does this engine read the attribute at all? (unknown engine source: assume yes)"""
        return attr in self.reads or not self.features_known

    @property
    def supports_hold(self):
        return self.reads_attr('data-hold')

    def holds(self):
        """Names data-hold can run: v0.8 runs a hold only when typeof LOOPS[name] === 'function', so the
        special-cased data-loop entries (shimmer / beat are null in LOOPS) never run as holds."""
        return set(self.loop_fns) if self.hold_fn_only and self.loop_fns is not None else set(self.loops)

    @property
    def supports_captions(self):
        return self.reads_attr('data-captions') or bool(self.caption_modes)

    def available(self):
        return bool(self.presets)

    def to_dict(self):
        return {'source': self.source, 'engine': self.engine, 'version': self.version,
                'presets': {k: self.presets[k] for k in sorted(self.presets)},
                'loops': sorted(self.loops), 'holds': sorted(self.holds()), 'eases': sorted(self.eases),
                'transitions': sorted(self.transitions), 'exits': sorted(self.exits),
                'supports': {a: self.reads_attr(a) for a in FEATURE_ATTRS},
                'slide_numbering': 'data-slide (index fallback)' if self.slide_map else 'position (legacy)',
                'default_transition': self.default_transition, 'transition_aliases': self.transition_aliases,
                'emphasis': sorted(self.emphasis()), 'fun': sorted(self.fun()),
                'caption_modes': sorted(self.caption_modes), 'caption_positions': sorted(self.caption_positions),
                'supports_hold': self.supports_hold, 'ease_css': self.ease_css, 'api': sorted(self.api),
                'alias': self.alias, 'load_error': self.load_error, 'load_warning': self.load_warning,
                'notes': self.notes}


def _meta_from_value(src, vstart, vend):
    """Primitive fields of a preset def like `{ dur: 1.2, emphasis: true, apply: ... }`."""
    if vstart is None or src[vstart] != '{':
        return None
    meta = {}
    for key, s, e in js_object_entries(src, vstart):
        if s is None:
            continue
        val = src[s:e].strip()
        if re.fullmatch(r'[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?', val, re.I):
            meta[key] = float(val)
        elif val in ('true', 'false'):
            meta[key] = val == 'true'
        elif len(val) >= 2 and val[0] == val[-1] and val[0] in '\'"':
            meta[key] = _js_unquote(val)
    return meta


def registry_from_source(src):
    """Regex/lexer extraction of the engine registries (fallback when node is unavailable)."""
    raw, src = src, js_blank_comments(src)          # usage examples in comments are not registrations
    reg = {'presets': {}, 'loops': [], 'eases': [], 'transitions': [], 'exits': []}
    aliases = {}
    not_fn = set()                                  # LOOPS entries whose value is null (special-cased)

    def fn_like(s, e):
        return s is None or not re.fullmatch(r'null|undefined|false|0|\d+(\.\d*)?|[\'"].*[\'"]',
                                             src[s:e if e is not None else s + 12].strip().split(',')[0].strip())

    def add_object(kind, brace_pos):
        for key, s, e in js_object_entries(src, brace_pos):
            if kind == 'presets':
                meta = _meta_from_value(src, s, e) if s is not None else None
                if meta is None and s is not None:
                    m = re.fullmatch(r'(?:PRESETS|E)\s*(?:\.\s*(\w+)|\[\s*[\'"](\w+)[\'"]\s*\])', src[s:e].strip())
                    if m:
                        aliases[key] = m.group(1) or m.group(2)
                reg['presets'][key] = meta or {}
            elif key not in reg[kind]:
                reg[kind].append(key)
            if kind == 'loops' and not fn_like(s, e):
                not_fn.add(key)

    for m in re.finditer(r'\b(?:const|let|var)\s+(%s)\s*=\s*\{' % _REG_NAMES, src):
        add_object(_REG_TARGETS[m.group(1)], m.end() - 1)
    for m in re.finditer(r'\bObject\.assign\(\s*(%s)\s*,\s*\{' % _REG_NAMES, src):
        add_object(_REG_TARGETS[m.group(1)], m.end() - 1)
    for m in re.finditer(r'\b(%s)\s*(?:\.\s*([A-Za-z_$][\w$]*)|\[\s*[\'"]([^\'"]+)[\'"]\s*\])\s*=(?!=)'
                         % _REG_NAMES, src):
        kind, name = _REG_TARGETS[m.group(1)], m.group(2) or m.group(3)
        if kind == 'presets':
            if name not in reg['presets']:
                rhs = re.match(r'\s*PRESETS\s*(?:\.\s*(\w+)|\[\s*[\'"](\w+)[\'"]\s*\])', src[m.end():])
                if rhs:
                    aliases[name] = rhs.group(1) or rhs.group(2)
                reg['presets'][name] = {}
        elif name not in reg[kind]:
            reg[kind].append(name)
            if kind == 'loops' and re.match(r'\s*(?:null|undefined)\b', src[m.end():]):
                not_fn.add(name)
    kinds = {'Preset': 'presets', 'Ease': 'eases', 'Transition': 'transitions', 'Loop': 'loops', 'Exit': 'exits'}
    for m in re.finditer(r'\bregister(Preset|Ease|Transition|Loop|Exit)\s*\(\s*[\'"]([^\'"]+)[\'"]\s*,\s*', src):
        kind, name = kinds[m.group(1)], m.group(2)
        if kind == 'presets':
            if name not in reg['presets']:
                reg['presets'][name] = (_meta_from_value(src, m.end(), None) if src[m.end():m.end() + 1] == '{'
                                        else None) or {}
        elif name not in reg[kind]:
            reg[kind].append(name)
    for name, target in aliases.items():
        if not reg['presets'].get(name) and reg['presets'].get(target):
            reg['presets'][name] = dict(reg['presets'][target])
    if not reg['transitions']:
        reg['transitions'] = _transition_function_names(src)
    reg['loop_fns'] = [n for n in reg['loops'] if n not in not_fn]
    reg['version'] = _source_version(raw, src)
    return reg


def _transition_function_names(src):
    """Legacy engines (inline vertical / overlay) have no TRANSITIONS registry, only a
    `function playTransition(kind) { if (kind === 'dissolve') ... }`: the names it compares
    its parameter against (plus switch cases) are the transitions it knows."""
    names = []
    for m in re.finditer(r'\bfunction\s+(\w*[Tt]ransition\w*)\s*\(\s*([A-Za-z_$][\w$]*)', src):
        brace = src.find('{', m.end())
        end = js_match(src, brace) if brace >= 0 else -1
        if end < 0:
            continue
        body, param = src[brace:end], re.escape(m.group(2))
        found = re.findall(r'\b%s\s*===?\s*[\'"]([\w-]+)[\'"]' % param, body) + \
            re.findall(r'[\'"]([\w-]+)[\'"]\s*===?\s*%s\b' % param, body)
        if re.search(r'\bswitch\s*\(\s*%s\s*\)' % param, body):
            found += re.findall(r'\bcase\s+[\'"]([\w-]+)[\'"]\s*:', body)
        for n in found:
            if n not in names:
                names.append(n)
    return names


def _camel_to_attr(name):
    return 'data-' + re.sub(r'([A-Z])', lambda m: '-' + m.group(1).lower(), name)


def js_attr_reads(code):
    """data-* attributes a script reads: el.dataset.fooBar / dataset['fooBar'] / getAttribute('data-x') /
    '[data-x]' selectors. `code` should have comments blanked (usage docs are not reads)."""
    out = set()
    for m in re.finditer(r'\bdataset\s*(?:\??\.\s*([A-Za-z_$][\w$]*)|\[\s*[\'"]([\w-]+)[\'"]\s*\])', code):
        nm = m.group(1) or m.group(2)
        out.add(nm if nm.startswith('data-') else _camel_to_attr(nm))
    for m in re.finditer(r'(?<![\w-])data-([a-z][a-z0-9]*(?:-[a-z0-9]+)*)', code):
        out.add('data-' + m.group(1))
    return out


def _const_string_set(code, name_re):
    """Union of string members of `const X = new Set([...])` / `const X = [...]` whose name matches."""
    out = set()
    for m in re.finditer(r'\b(?:const|let|var)\s+(%s)\s*=\s*(?:new\s+Set\s*\(\s*)?(?=\[)' % name_re, code):
        val, _ = js_literal_at(code, m.end())
        if isinstance(val, list):
            out |= {v for v in val if isinstance(v, str)}
    return out


def _object_keys_in(code, var_re, scope_re=None):
    """Keys of `NAME = { ... }` literals (optionally only inside functions whose name matches scope_re)."""
    spans = [(0, len(code))]
    if scope_re:
        spans = []
        for m in re.finditer(r'\bfunction\s+(%s)\s*\([^)]*\)\s*\{' % scope_re, code):
            end = js_match(code, m.end() - 1)
            if end > 0:
                spans.append((m.end() - 1, end))
    keys = set()
    for a, b in spans:
        for m in re.finditer(r'\b(?:%s)\s*=\s*\{' % var_re, code[a:b]):
            keys |= {k for k, _, _ in js_object_entries(code, a + m.end() - 1)}
    return keys


def engine_features(src, code=None):
    """Engine behaviour that is not a registry: which data-* attributes it reads at all, how it maps
    TIMINGS slide numbers to slide elements, its default transition + aliases, the emphasis / fun
    classification behind Storyboard.events(), and the caption modes / positions it accepts.
    `code` = src with comments blanked (computed if not given)."""
    code = js_blank_comments(src) if code is None else code
    reads = js_attr_reads(code)
    ver = _source_version(src, code)
    legacy_num = re.search(r'dataset\s*\.\s*slide\s*\|\|\s*[\'"]0[\'"]', code)
    slide_map = bool(re.search(r'\bSLIDE_BY_NUM\b', code)) or \
        (not legacy_num and (_version_tuple(ver) or (0, 0, 0)) >= (0, 8, 0))
    dt = re.search(r'\bDEFAULT_TRANSITION\s*=\s*[\'"]([\w-]+)[\'"]', code) or \
        re.search(r'transitionIn\s*\|\|\s*[\'"]([\w-]+)[\'"]', code)
    aliases = {}
    am = re.search(r'\b(?:const|let|var)\s+\w*TRANSITION_ALIASES\w*\s*=\s*(?=\{)', code)
    if am:
        val, _ = js_literal_at(code, am.end())
        if isinstance(val, dict):
            aliases = {k: v for k, v in val.items() if isinstance(v, str)}
    modes = _object_keys_in(code, r'MODES', r'\w*[Cc]aption\w*')
    positions = _object_keys_in(code, r'POS\w*', r'\w*[Cc]aption\w*')
    reads_captions = 'data-captions' in reads or bool(re.search(r'\bopts\s*\.\s*captions\b', code))
    if reads_captions and not modes:
        modes = set(CONTRACT_CAPTION_MODES)
    if reads_captions and not positions:
        positions = set(CONTRACT_CAPTION_POSITIONS)
    if reads_captions:
        reads.add('data-captions')
    hold_fn_only = bool(re.search(r'\bhold\b[^;\n]{0,80}typeof\s+LOOPS\s*\[', code))
    slides_in_root = bool(re.search(r'\bopts\s*\.\s*slideSelector\b', code))
    return {'reads': sorted(reads), 'slide_map': slide_map, 'hold_fn_only': hold_fn_only,
            'slides_in_root': slides_in_root,
            'default_transition': dt.group(1) if dt else DEFAULT_TRANSITION, 'transition_aliases': aliases,
            'emphasis_set': sorted(_const_string_set(code, r'\w*EMPHASIS_PRESETS\w*')),
            'fun_set': sorted(_const_string_set(code, r'\w*FUN_PRESETS\w*')),
            'caption_modes': sorted(modes), 'caption_positions': sorted(positions)}


_DEFINES_STORYBOARD = re.compile(r'(?:\.\s*|\b(?:var|let|const)\s+)(?:Storyboard|STORYBOARD)\s*=(?!=)')


def engine_health(src, node_data=None, code=None):
    """(error, warning) for an engine file the deck loads. error = it cannot define window.Storyboard
    in a browser (empty, HTML, syntax error, truncated); warning = it threw under the audit's stub DOM
    although the source looks sane (a stub limitation is possible, so not an error)."""
    s = (src or '').lstrip('﻿ \t\r\n')
    if not s:
        return 'the file is empty', None
    if s[:1] == '<':
        return 'the file is an HTML/XML page, not JavaScript (a saved error page?)', None
    code = js_blank_comments(src) if code is None else code
    if node_data is not None and not node_data.get('ok'):
        err = str(node_data.get('error') or 'Storyboard undefined after loading')
        if node_data.get('error_name') == 'SyntaxError' or err.startswith('SyntaxError'):
            return f'it does not parse ({err}) -- truncated or corrupted?', None
        if not _DEFINES_STORYBOARD.search(code):
            return 'it never defines window.Storyboard', None
        return None, f'it threw while loading under the audit\'s stub DOM ({err})'
    if not _DEFINES_STORYBOARD.search(code):
        return 'it never defines window.Storyboard', None
    if node_data is None:                            # no node: a cheap truncation test
        depth = 0
        for kind, text, _ in js_lex(code):
            if kind == 'punct':
                depth += (text in _OPEN) - (text in _CLOSE)
        if depth != 0:
            return 'its brackets do not balance -- the file looks truncated', None
    return None, None


def _source_version(raw, blanked=None):
    """Engine version from `VERSION: '0.8.0'` (code), else the header comment `(v0.8)`."""
    ver = re.search(r'\bVERSION\s*[:=]\s*[\'"]([0-9][\w.\-]*)[\'"]', blanked if blanked is not None else raw) or \
        re.search(r'STORYBOARD ENGINE[^\n]*\(v(\d+(?:\.\d+){0,2})\)', raw)
    return ver.group(1) if ver else None


def _cache_dir():
    d = os.environ.get('STORYBOARD_AUDIT_CACHE')
    return Path(d) if d else Path(tempfile.gettempdir()) / 'storyboard-audit-cache'


_MEMO = {}


def registry_from_node(engine_path, timeout=25):
    node = shutil.which('node')
    if not node:
        return None, 'node not found on PATH'
    try:
        proc = subprocess.run([node, '-e', _NODE_HARNESS, str(engine_path), _NODE_SANDBOX], capture_output=True,
                              text=True, encoding='utf-8', errors='replace', timeout=timeout)
    except (OSError, subprocess.SubprocessError) as e:
        return None, f'node failed: {e}'
    marker = '@@SB_REGISTRY@@'
    if marker not in (proc.stdout or ''):
        return None, f'node harness produced no registry (exit {proc.returncode}): {(proc.stderr or "")[:200]}'
    try:
        data = json.loads(proc.stdout.rsplit(marker, 1)[1].strip())
    except ValueError as e:
        return None, f'node harness output unreadable: {e}'
    if not data.get('ok'):                     # the harness ran: data carries the engine's own error
        return data, f'engine did not define window.Storyboard under the stub DOM ({data.get("error")})'
    if data.get('error'):
        data.setdefault('notes', []).append(f'engine threw during stub load (registries still read): {data["error"]}')
    return data, None


def _build_registry(src, engine_label, engine_path=None, use_node=True, use_cache=True):
    """Registry for engine source `src`. Extraction results are memoised per (content hash, node)
    and cached on disk (node results only); every call returns a fresh Registry labelled with
    THIS caller's engine path (two decks may ship identical engine copies)."""
    digest = hashlib.sha256(src.encode('utf-8', 'surrogatepass')).hexdigest()
    memo_key = (digest, use_node)
    data = _MEMO.get(memo_key)
    if data is None:
        data = _extract_registry_data(src, digest, engine_path, use_node, use_cache)
        _MEMO[memo_key] = data
    feats = data['features']
    lf = data.get('loop_fns')
    return Registry(presets={k: dict(v) for k, v in data['presets'].items()}, loops=set(data['loops']),
                    loop_fns=set(lf) if isinstance(lf, list) else None, hold_fn_only=bool(feats.get('hold_fn_only')),
                    slides_in_root=bool(feats.get('slides_in_root')),
                    eases=set(data['eases']), transitions=set(data['transitions']), exits=set(data['exits']),
                    version=data.get('version'), source=data['source'], engine=engine_label,
                    notes=list(data.get('notes') or []), api=list(data.get('api') or []), alias=data.get('alias'),
                    ease_css=data['ease_css'], reads=set(feats['reads']), features_known=True,
                    slide_map=feats['slide_map'], default_transition=feats['default_transition'],
                    transition_aliases=dict(feats['transition_aliases']), emphasis_set=set(feats['emphasis_set']),
                    fun_set=set(feats['fun_set']), caption_modes=set(feats['caption_modes']),
                    caption_positions=set(feats['caption_positions']),
                    load_error=data['health'][0], load_warning=data['health'][1])


def _extract_registry_data(src, digest, engine_path, use_node, use_cache):
    cache_file = _cache_dir() / f'{digest[:32]}-s{REGISTRY_SCHEMA}.json'
    data = None
    health_node = None                             # the harness' verdict, when it ran
    if use_node and use_cache and cache_file.is_file():
        try:
            data = json.loads(cache_file.read_text(encoding='utf-8'))
            health_node = {'ok': True}
        except (OSError, ValueError):
            data = None
    if data is None:
        nd, err = None, None
        if use_node:
            tmp = None
            path = engine_path
            if path is None:                       # inline engine: hand node a temp copy
                fd, tmp = tempfile.mkstemp(suffix='.js', prefix='sb-inline-engine-')
                with os.fdopen(fd, 'w', encoding='utf-8') as fh:
                    fh.write(src)
                path = tmp
            try:
                nd, err = registry_from_node(path)
            finally:
                if tmp:
                    try:
                        os.unlink(tmp)
                    except OSError:
                        pass
            health_node = nd
            if nd is not None and not nd.get('ok'):
                nd = None
        if nd and nd.get('presets'):
            # node saw the live objects (incl. dur/emphasis/fun flags); parse the source only for
            # registries the engine does not expose (e.g. EXITS on older engines)
            data = {'presets': {k: dict(v or {}) for k, v in nd['presets'].items()},
                    'version': nd.get('version') or _source_version(src), 'source': 'node',
                    'alias': nd.get('alias'), 'api': list(nd.get('api') or []), 'notes': list(nd.get('notes') or [])}
            missing = [k for k in ('loops', 'eases', 'transitions', 'exits') if not nd.get(k)]
            parsed = registry_from_source(src) if missing else {}
            for kind in ('loops', 'eases', 'transitions', 'exits'):
                data[kind] = nd.get(kind) or parsed.get(kind) or []
            lf = nd.get('loop_fns')
            if not isinstance(lf, list) or (not lf and data['loops']):
                lf = (parsed or registry_from_source(src)).get('loop_fns')
            data['loop_fns'] = lf
            if missing:
                data['source'] = f'node+source-parse({",".join(missing)})'
        else:
            parsed = registry_from_source(src)
            data = {'presets': parsed['presets'], 'loops': parsed['loops'], 'eases': parsed['eases'],
                    'loop_fns': parsed['loop_fns'], 'transitions': parsed['transitions'], 'exits': parsed['exits'],
                    'version': parsed['version'], 'source': 'source-parse', 'notes': []}
            if err:
                data['notes'].append(f'node extraction unavailable ({err}); used source parse')
        _add_source_facts(data, src, health_node)
        if data['source'].startswith('node') and use_cache:     # only node results are worth caching
            _write_cache(cache_file, data)
    elif not all(k in data for k in ('features', 'ease_css', 'health')):
        _add_source_facts(data, src, health_node)
    return data


def _write_cache(cache_file, data):
    """Atomic write via a temp file. Parallel audits race for the same target: on Windows os.replace
    fails while another process replaces / reads it -- that process' copy is just as good, so the
    temp file is dropped (never left behind) and the audit carries on."""
    tmpf = None
    try:
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(prefix=cache_file.stem + '.', suffix='.tmp', dir=str(cache_file.parent))
        tmpf = Path(tmp)
        with os.fdopen(fd, 'w', encoding='utf-8') as fh:
            fh.write(json.dumps(data))
        for attempt in range(3):
            try:
                os.replace(tmpf, cache_file)
                tmpf = None
                break
            except PermissionError:
                if cache_file.is_file():
                    break                                  # a concurrent audit already wrote it
                time.sleep(0.05 * (attempt + 1))
    except OSError:
        pass
    finally:
        if tmpf is not None:
            try:
                tmpf.unlink()
            except OSError:
                pass


def _add_source_facts(data, src, health_node):
    """Facts read from the engine source on both extraction paths (cached with node results)."""
    code = js_blank_comments(src)
    data['features'] = engine_features(src, code)
    data['ease_css'] = _resolve_ease_accepts_css(src)
    data['health'] = list(engine_health(src, health_node, code))


def _resolve_ease_accepts_css(src):
    """True when the engine's resolveEase() parses CSS timing functions itself."""
    m = re.search(r'function\s+resolveEase\s*\([^)]*\)\s*\{', src)
    if not m:
        return False
    end = js_match(src, m.end() - 1)
    body = src[m.end():end if end > 0 else m.end() + 1500]
    return bool(re.search(r'cubic-?bezier|steps\s*\(', body, re.I))


def load_registry(engine_path=None, source=None, label=None, use_node=True, use_cache=True):
    """Registry for an engine file (or inline engine source), exactly as that engine defines it.
    Nothing is borrowed from the skill engine: a kind the engine doesn't define / an attribute it
    never reads is unsupported there (see Registry.reads_attr). A fresh object on every call."""
    if source is None:
        engine_path = Path(engine_path) if engine_path else SKILL_ENGINE
        try:
            source = engine_path.read_text(encoding='utf-8', errors='replace')
        except OSError as e:
            return Registry(source='none', engine=str(engine_path), notes=[f'cannot read engine: {e}'],
                            load_error=f'it cannot be read ({e})')
        label = label or str(engine_path)
    return _build_registry(source, label or '<inline>', engine_path, use_node, use_cache)


def _version_tuple(v):
    """'0.8' -> (0, 8, 0) so it compares equal to '0.8.0'; None when there is no number."""
    parts = [int(x) for x in re.findall(r'\d+', v or '')[:3]]
    return tuple(parts + [0] * (3 - len(parts))) if parts else None


# =============================================================================
# Audio duration helpers
# =============================================================================
def _mp3_duration(path):
    try:
        data = Path(path).read_bytes()
    except OSError:
        return None
    i = 0
    if data[:3] == b'ID3' and len(data) > 10:
        size = (data[6] << 21) | (data[7] << 14) | (data[8] << 7) | data[9]
        i = 10 + size + (10 if data[5] & 0x10 else 0)
    tail = 128 if data[-128:-125] == b'TAG' else 0
    br1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
    br2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
    rates = {3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000]}
    n = len(data)
    while i < n - 4:
        if data[i] == 0xFF and (data[i + 1] & 0xE0) == 0xE0:
            ver, layer = (data[i + 1] >> 3) & 3, (data[i + 1] >> 1) & 3
            bri, sri = data[i + 2] >> 4, (data[i + 2] >> 2) & 3
            if ver != 1 and layer == 1 and 0 < bri < 15 and sri < 3:
                sr = rates[ver][sri]
                spf = 1152 if ver == 3 else 576
                mono = (data[i + 3] >> 6) == 3
                x = i + 4 + ((17 if mono else 32) if ver == 3 else (9 if mono else 17))
                if data[x:x + 4] in (b'Xing', b'Info'):
                    flags = int.from_bytes(data[x + 4:x + 8], 'big')
                    if flags & 1:
                        return int.from_bytes(data[x + 8:x + 12], 'big') * spf / sr
                if data[i + 36:i + 40] == b'VBRI':
                    return int.from_bytes(data[i + 50:i + 54], 'big') * spf / sr
                kbps = (br1 if ver == 3 else br2)[bri]
                return (n - i - tail) * 8 / (kbps * 1000.0)
        i += 1
    return None


def audio_file_duration(path):
    p = Path(path)
    ext = p.suffix.lower()
    try:
        if ext == '.wav':
            with wave.open(str(p), 'rb') as w:
                return w.getnframes() / float(w.getframerate())
        if ext == '.mp3':
            return _mp3_duration(p)
    except (OSError, wave.Error, EOFError, ZeroDivisionError):
        return None
    return None


# =============================================================================
# Deck model
# =============================================================================
@dataclass
class Anim:
    el: Node
    slide: int
    name: str
    start: float
    dur: float
    kind: str = 'entrance'            # entrance | chain
    group: Node = None
    rel: float = None                 # seconds after the slide cue (None if absolute data-t)


@dataclass
class ExitSpec:
    el: Node
    slide: int
    name: str
    start: float
    dur: float
    explicit: bool


def css_blank_comments(css):
    """Same-length copy of css with /* */ comments blanked (newlines kept; quoted strings are left
    alone; an unterminated comment runs to the end, as in browsers). Every CSS scan (url() /
    @import / @font-face / the .deck size) runs on this, so commented-out rules never count."""
    if not css or '/*' not in css:
        return css
    out, last, i, n = [], 0, 0, len(css)
    while True:
        m = _CSS_SCAN_RE.search(css, i)
        if not m:
            break
        if m.group() == '/*':
            j = css.find('*/', m.end())
            j = n if j < 0 else j + 2
            out.append(css[last:m.start()])
            out.append(re.sub(r'[^\n]', ' ', css[m.start():j]))
            last = i = j
        else:                                           # skip a quoted string (ends at its quote or EOL)
            i = (_CSS_DQ_RE if m.group() == '"' else _CSS_SQ_RE).match(css, m.start()).end()
    out.append(css[last:])
    return ''.join(out)


_CSS_SCAN_RE = re.compile(r'/\*|["\']')
_CSS_DQ_RE = re.compile(r'"(?:[^"\\\n]|\\.)*"?')
_CSS_SQ_RE = re.compile(r"'(?:[^'\\\n]|\\.)*'?")


def _css_urls(css):
    out, i = [], 0
    low = css.lower()
    while True:
        j = low.find('url(', i)
        if j < 0:
            return out
        k = j + 4
        while k < len(css) and css[k].isspace():
            k += 1
        if k < len(css) and css[k] in '"\'':
            q = css[k]
            e = css.find(q, k + 1)
            if e < 0:
                return out
            out.append(css[k + 1:e])
            i = e + 1
        else:
            e = css.find(')', k)
            if e < 0:
                return out
            out.append(css[k:e].strip())
            i = e + 1


def _css_imports(css):
    return [m.group(1) or m.group(2) for m in
            re.finditer(r'@import\s+(?:url\(\s*)?(?:[\'"]([^\'"]+)[\'"]|([^\s;\'")]+))', css)]


def _urlsplit_safe(u):
    """urlsplit with '//host/x' treated as https; None for a malformed URL."""
    u = (u or '').strip()
    try:
        return urlsplit('https:' + u if u.startswith('//') else u)
    except ValueError:
        return None


def _font_slugs(family):
    """'Inter var' -> {'intervar', 'inter'}; 'Font Awesome 6 Free' -> {'fontawesome6free', 'fontawesome'}:
    the family as it appears in a font-kit URL (rsms.me/inter/inter.css, .../font-awesome/6.5/...)."""
    low = family.lower()
    core = re.sub(r'\b(?:var|variable|vf|free|pro|\d+)\b', ' ', low)
    return {s for s in (re.sub(r'[^a-z0-9]', '', low), re.sub(r'[^a-z0-9]', '', core)) if len(s) >= 3}


def _is_remote(ref):
    r = (ref or '').strip().lower()
    return (not r or r.startswith(('#', 'data:', 'blob:', 'http:', 'https:', '//', 'about:', 'javascript:',
                                   'mailto:', 'tel:', 'var(', 'chrome:', 'ws:', 'wss:'))
            or '{{' in r or '${' in r or '<%' in r)


_DRIVE_RE = re.compile(r'^[A-Za-z]:')            # C:/x, C:\x, c:x -- a URL scheme to the browser
ENGINE_NAME_RE = re.compile(r'storyboard-engine[\w.\-]*\.js', re.I)
ENGINE_SIGNATURE_RE = re.compile(r'\bglobal\.Storyboard\s*=\s*Storyboard\b|STORYBOARD ENGINE\s*[—-]\s*composable')
MAX_DECK_SCRIPT_BYTES = 512 * 1024              # bigger local scripts are libraries, not deck code


def _read_local_script(p):
    """Text of a local deck script (timeline.js, session.js ...), or None for libraries / missing files."""
    if p is None or re.search(r'\.min\.m?js$', p.name, re.I):
        return None
    try:
        if not p.is_file() or p.stat().st_size > MAX_DECK_SCRIPT_BYTES:
            return None
        return p.read_text(encoding='utf-8', errors='replace')
    except OSError:
        return None


_IDENT = r'[A-Za-z_$][\w$]*'
_IDCH = frozenset('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_$')
# deck JS can be megabytes (inlined libraries): scan by str.find on the few identifiers that matter and
# only then run small anchored regexes around each hit -- a lookbehind-led finditer is seconds per pass
_GLOBAL_TAIL = re.compile(r'(?<![\w$.])(?:window|globalThis|self)\s*\.\s*$')
_ASSIGN_TAIL = re.compile(r'(?:(?<![\w$])(?:const|let|var)\s+)?(?:(?<![\w$.])((?:window|globalThis|self)\s*\.\s*)|(?<![\w$.]))'
                          r'([A-Za-z_$][\w$]*)\s*=\s*$')
_RHS_TAIL = re.compile(r'(?:\s*\.\s*(%s)(?![\w$])|\s*\[\s*[\'"](%s)[\'"]\s*\])?(?![ \t]*[\w$`]|\s*[.\[(])'
                       % (_REG_NAMES, _REG_NAMES))
_DESTRUCTURE_TAIL = re.compile(r'(?<![\w$])(?:const|let|var)\s*\{((?:[^{}]|\{[^{}]*\})*)\}\s*=\s*$')
_REF_END = re.compile(r'(?![ \t]*[\w$`]|\s*[.\[(])')
_DECL_TAIL = re.compile(r'(?<![\w$])(?:const|let|var|function|class)\s+$')
_VAR_TAIL = re.compile(r'(?<![\w$])(?:const|let|var)\s+$')
_WINDOW_TAIL = re.compile(r'(?<![\w$])window\s*\.\s*$')
_DESTRUCTURE_OPEN = re.compile(r'(?<![\w$])(?:const|let|var)\s*\{[^{}]*$')
_DESTRUCTURE_CLOSE = re.compile(r'[^{}]*\}\s*=(?![=>])')
_ASSIGN_OP = re.compile(r'\s*=(?![=>])')
_EQ = re.compile(r'\s*=\s*')


def _word_at(js, word):
    """Start indexes of `word` as a whole identifier in js."""
    n, i = len(word), js.find(word)
    while i >= 0:
        if (i == 0 or js[i - 1] not in _IDCH) and (i + n >= len(js) or js[i + n] not in _IDCH):
            yield i
        i = js.find(word, i + n)


def _prev_char(js, i):
    """The last non-blank character before js[i] ('' at the start)."""
    k = i - 1
    while k >= 0 and js[k] in ' \t\r\n':
        k -= 1
    return js[k] if k >= 0 else ''


def _global_ref_start(js, i):
    """js[i:] starts an identifier: where the global reference to it starts (i, or the start of a window. /
    globalThis. / self. prefix), None when it is a property of something else (foo.Storyboard)."""
    if _prev_char(js, i) != '.':
        return i
    m = _GLOBAL_TAIL.search(js, max(0, i - 40), i)
    return m.start() if m else None


def _registry_aliases(js):
    """Names deck code binds to window.Storyboard and to its registries, e.g.
         const SB = window.Storyboard;            -> SB is Storyboard
         const PRESETS = Storyboard.PRESETS;      -> PRESETS.myThing = {...} registers a preset
         const P = SB.PRESETS;  const { EASE: E, LOOPS } = Storyboard;
    Returns ({storyboard names}, {kind: {alias names}}); chains resolve to a fixpoint."""
    sb = {'Storyboard', 'STORYBOARD'}
    kinds = {k: set() for k in _REG_TARGETS.values()}
    done = set()                                   # (base, index) pairs already classified
    for _ in range(8):
        size = len(sb) + sum(len(v) for v in kinds.values())
        bases = [(b, None) for b in sb] + [(a, k) for k, names in kinds.items() for a in names]
        for base, kind_of_base in bases:
            for i in _word_at(js, base):
                if (base, i) in done:
                    continue
                start = _global_ref_start(js, i)
                if start is None:
                    continue
                done.add((base, i))
                lo = max(0, start - 160)
                tail = _RHS_TAIL.match(js, i + len(base))
                lhs = _ASSIGN_TAIL.search(js, lo, start) if tail else None
                if lhs and lhs.group(2) not in ('window', 'globalThis', 'self') and lhs.group(2) != base:
                    word = tail.group(1) or tail.group(2)
                    if kind_of_base is not None:           # const Q = P  (an alias of an alias)
                        if not word:
                            kinds[kind_of_base].add(lhs.group(2))
                    elif word:
                        kinds[_REG_TARGETS[word]].add(lhs.group(2))
                    else:
                        sb.add(lhs.group(2))
                if kind_of_base is None and _REF_END.match(js, i + len(base)):
                    dm = _DESTRUCTURE_TAIL.search(js, max(0, start - 600), start)
                    if dm:
                        for ent in dm.group(1).split(','):
                            em = re.fullmatch(r'\s*(%s)\s*(?::\s*(%s))?\s*(?:=.*)?' % (_IDENT, _IDENT), ent, re.S)
                            if em and em.group(1) in _REG_TARGETS:
                                kinds[_REG_TARGETS[em.group(1)]].add(em.group(2) or em.group(1))
        if len(sb) + sum(len(v) for v in kinds.values()) == size:
            break
    return sb, kinds


def _js_declares(js, name):
    """Does deck code declare / assign the identifier at all (const / let / var / function / class,
    destructuring, window.NAME = or an implicit-global NAME = ...)?"""
    for i in _word_at(js, name):
        if _DECL_TAIL.search(js, max(0, i - 40), i):
            return True
        if _ASSIGN_OP.match(js, i + len(name)) and _global_ref_start(js, i) is not None:
            return True
        if _DESTRUCTURE_OPEN.search(js, max(0, i - 400), i) and _DESTRUCTURE_CLOSE.match(js, i + len(name)):
            return True
    return False


class Deck:
    def __init__(self, path, text):
        self.path = Path(path).resolve()
        self.dir = self.path.parent
        self.text = text
        self.dom = parse_html(text)
        self.elements = [n for n in self.dom.iter() if n.tag != '#document']
        self.body = next((n for n in self.elements if n.tag == 'body'), None)
        self.inline_scripts, self.script_srcs = [], []
        self.engine_srcs = []                          # <script src> nodes that load a storyboard engine
        self.external_scripts = []                     # (node, path) local deck code read into self.js
        code = []                                      # deck JS in document order (inline + local files)
        for n in self.elements:
            if n.tag != 'script':
                continue
            typ = n.get('type', '').strip().lower()
            if typ not in ('', 'text/javascript', 'module', 'application/javascript'):
                continue
            if n.has('src'):
                self.script_srcs.append(n)
                src = n.get('src', '')
                if ENGINE_NAME_RE.search(src):
                    self.engine_srcs.append(n)
                    continue
                p = self.resolve(src)
                body = _read_local_script(p)
                if body is None:
                    continue
                if ENGINE_SIGNATURE_RE.search(body):   # an engine copy under another file name
                    self.engine_srcs.append(n)
                    continue
                self.external_scripts.append((n, p))
                code.append(body)
            else:
                t = ''.join(c for c in n.children if isinstance(c, str))
                self.inline_scripts.append((n, t))
                code.append(t)
        self.js = js_blank_comments('\n;\n'.join(code))
        # all CSS is kept with its /* comments */ blanked (same length): commented-out url() / @import /
        # @font-face / .deck sizes never count. Inline style="" attributes too (snippets use node.raw).
        for n in self.elements:
            st = n.attrs.get('style')
            if st and '/*' in st:
                n.attrs['style'] = css_blank_comments(st)
        self.styles = [(n, css_blank_comments(''.join(c for c in n.children if isinstance(c, str))))
                       for n in self.elements if n.tag == 'style']
        self.linked_css = []                           # (origin node, path, text): <link> files + local @imports
        seen_css = set()

        def add_css(node, p, depth):
            key = os.path.normcase(os.path.normpath(str(p)))
            if depth > 6 or key in seen_css:
                return
            seen_css.add(key)
            try:
                if not p.is_file():
                    return
                text = css_blank_comments(p.read_text(encoding='utf-8', errors='replace'))
            except OSError:
                return
            self.linked_css.append((node, p, text))
            for u in _css_imports(text):              # a local @import is part of the page's CSS too
                if not _is_remote(u):
                    q = self.resolve(u, p.parent)
                    if q is not None:
                        add_css(node, q, depth + 1)
        for n in self.elements:
            if n.tag == 'link' and 'stylesheet' in n.get('rel', '').lower() and not _is_remote(n.get('href')):
                p = self.resolve(n.get('href'))
                if p is not None:
                    add_css(n, p, 0)
        for n, css in self.styles:
            for u in _css_imports(css):
                if not _is_remote(u):
                    q = self.resolve(u)
                    if q is not None:
                        add_css(n, q, 1)
        self.css_all = '\n'.join([t for _, t in self.styles] + [t for _, _, t in self.linked_css])
        self._parse_js()

    # ---- helpers ------------------------------------------------------------
    def resolve(self, ref, base=None):
        """The file on disk a local reference names (None for remote / data: / template refs).
        Root-relative '/x' is the deck folder (render_video.py's web root). Whether the render's
        browser can actually load it is load_problem()'s job."""
        if _is_remote(ref):
            return None
        r = ref.strip()
        if r.lower().startswith('file:'):
            r = re.sub(r'^file:/*', '', r, flags=re.I)
            r = unquote(r.split('?')[0].split('#')[0])
            p = Path(r)
            return p if p.is_absolute() else Path('/' + r)
        r = unquote(r.split('#')[0].split('?')[0])
        if not r:
            return None
        if _DRIVE_RE.match(r) or r.startswith(('\\\\', '//')):
            return Path(r)                              # C:/x.png, C:\x.png, \\server\share\x.png
        if r.startswith(('/', '\\')):                   # '/../x' is '/x' to the browser
            return self.dir / posixpath.normpath('/' + r.replace('\\', '/').lstrip('/')).lstrip('/')
        return (Path(base) if base else self.dir) / r

    def load_problem(self, ref, base=None):
        """Why the render's Chromium cannot load local reference `ref` -- render_video.py serves ONLY
        the deck folder, at http://127.0.0.1:<port>/ -- as (kind, why, fetched) or None.
        kind 'absolute': a drive-letter / UNC path or a file: URL (never loads over http);
        kind 'outside': the path climbs above the deck folder -- the browser clamps '..' at the web
        root, so the render fetches `fetched` (a Path inside the deck folder) instead."""
        r = (ref or '').strip()
        if not r or _is_remote(r):
            return None
        if r.lower().startswith('file:'):
            return ('absolute', 'file: URLs are blocked on the http:// page render_video.py serves', None)
        if _DRIVE_RE.match(r):
            return ('absolute', f'the browser reads "{r[:2]}" as a URL scheme, so a drive-letter path never loads', None)
        if r.startswith(('\\\\', '\\/', '/\\')):
            return ('absolute', 'a UNC / network path is read as another host and never loads', None)
        path = unquote(r.split('#')[0].split('?')[0]).replace('\\', '/')
        if not path or path.startswith('/'):
            return None                                 # root-relative: the web root IS the deck folder
        root = os.path.normpath(str(self.dir))
        b = os.path.normpath(str(base)) if base else root
        try:
            b_rel = os.path.relpath(b, root)
        except ValueError:                              # another drive
            return None
        if b_rel == '..' or b_rel.startswith('..' + os.sep):
            return None                                 # a CSS file outside the deck: its own link is the finding
        try:
            rel = os.path.relpath(os.path.normpath(os.path.join(b, path)), root)
        except ValueError:
            rel = '..'
        if rel != '..' and not rel.startswith('..' + os.sep):
            return None
        base_url = '/' + ('' if b_rel == '.' else b_rel.replace(os.sep, '/') + '/')
        url_path = posixpath.normpath(posixpath.join(base_url, path))      # '/../x' -> '/x'
        return ('outside', 'render_video.py serves only the deck folder, so "../" cannot climb above it',
                self.dir / url_path.lstrip('/'))

    def find_const(self, name):
        js, m = self.js, None                          # first `const|let|var NAME =`, else `window.NAME =`
        for tail in (_VAR_TAIL, _WINDOW_TAIL):
            for i in _word_at(js, name):
                if tail.search(js, max(0, i - 40), i):
                    m = _EQ.match(js, i + len(name))
                    if m and m.end() > i + len(name):
                        break
                    m = None
            if m:
                break
        if not m:
            return None, False
        if self.js[m.end():m.end() + 2] == '{{':
            return None, True                         # overlay placeholder {{TIMINGS_JSON}}
        val, _ = js_literal_at(self.js, m.end())
        return val, True

    def _parse_js(self):
        js = self.js
        self.init_opts, self.init_found = {}, False
        self.init_via = None                           # 'CFG' for Storyboard.init(CFG) with a literal const CFG
        self.init_opaque = None                        # init's argument when it is not readable statically
        self.sb_names, self.reg_aliases = _registry_aliases(js)
        sb_re = '|'.join(re.escape(n) for n in sorted(self.sb_names))
        # the LAST call wins (a re-init replaces the options; sb_deckio rewrites the last one too)
        sb_tail = re.compile(r'(?<![\w$])(?:%s)\s*\.\s*$' % sb_re)     # "Storyboard ." before a member
        call_open = re.compile(r'\s*\(\s*')

        def sb_member(i):
            """js[i:] is a member of Storyboard / an alias of it (Storyboard.x, window.STORYBOARD.x, SB.x)?"""
            if _prev_char(js, i) != '.':
                return False
            mt = sb_tail.search(js, max(0, i - 80), i)
            return bool(mt) and _global_ref_start(js, mt.start()) is not None
        inits = [call_open.match(js, i + 4) for i in _word_at(js, 'init') if sb_member(i)]
        inits = [x for x in inits if x]
        if inits:
            m = inits[-1]
            self.init_found = True
            if m.end() < len(js) and js[m.end()] == '{':
                val, _ = js_literal_at(js, m.end())
                if isinstance(val, dict):
                    self.init_opts = val
            elif m.end() < len(js) and js[m.end()] != ')':
                arg = re.match(r'(?:(?:window|globalThis|self)\s*\.\s*)?([A-Za-z_$][\w$]*)\s*\)', js[m.end():])
                val, found = self.find_const(arg.group(1)) if arg else (None, False)
                if isinstance(val, dict):              # Storyboard.init(CFG) with const CFG = {...}
                    self.init_opts, self.init_via = val, arg.group(1)
                else:                                  # init(buildConfig()) / init({...BASE, ...}) ...
                    end = js_match(js, js.rfind('(', 0, m.end()))
                    self.init_opaque = re.sub(r'\s+', ' ', js[m.end():end if end > 0 else m.end() + 60]).strip()[:60]
        via = f'{self.init_via}.' if self.init_via else 'init('

        def opt_or_const(opt, const):
            v = self.init_opts.get(opt)
            ref = re.fullmatch(r'(?:(?:window|globalThis|self)\s*\.\s*)?([A-Za-z_$][\w$]*)', v.text) \
                if isinstance(v, _Expr) else None
            label = f'{via}{opt}' + ('' if self.init_via else ')')
            if ref:                                     # timings: TIMINGS / window.TIMINGS
                val, found = self.find_const(ref.group(1))
                if found:
                    return val, found, ref.group(1)
                return v, True, v.text                  # a global defined elsewhere: runtime value
            if isinstance(v, _Expr):
                return v, True, label                   # computed expression, e.g. VIDEO.slides.map(...)
            if v is not None:
                return v, True, label
            val, found = self.find_const(const)
            if self.init_opaque is not None and not found:   # the engine gets its options at runtime
                return _Expr(f'Storyboard.init({self.init_opaque})'), True, f'Storyboard.init({self.init_opaque}).{opt}'
            return val, found, const
        self.timings_raw, self.timings_found, self.timings_name = opt_or_const('timings', 'TIMINGS')
        self.word_hits_raw, _, _ = opt_or_const('wordHits', 'WORD_HITS')
        self.words_raw, self.words_found, _ = opt_or_const('words', 'WORDS')
        self.labels_raw, _, _ = opt_or_const('labels', 'SLIDE_LABELS')
        self.fallback_duration = js_float(self.init_opts.get('fallbackDuration')) \
            if not isinstance(self.init_opts.get('fallbackDuration'), _Expr) else None
        if self.fallback_duration is None:
            fb = re.search(r'\b(?:const|let|var)\s+FALLBACK_DURATION\s*=\s*([\d.]+)', js)
            self.fallback_duration = float(fb.group(1)) if fb else None
        sd = re.search(r'\bSB_DURATION\s*=\s*([\d.]+)', js)
        self.sb_duration = float(sd.group(1)) if sd else None
        self.words = [w for w in (self.words_raw or []) if isinstance(w, dict)] \
            if isinstance(self.words_raw, list) else []
        self.word_hits = [h for h in (self.word_hits_raw or []) if isinstance(h, dict)] \
            if isinstance(self.word_hits_raw, list) else []
        # deck-registered names (Storyboard.registerPreset('x', ...), Storyboard.PRESETS.x = ...)
        self.custom = {'presets': set(), 'eases': set(), 'transitions': set(), 'loops': set(), 'exits': set()}
        self.custom_meta = {}                          # preset name -> {dur, ...} from the deck's own definition
        kinds = {'preset': 'presets', 'ease': 'eases', 'transition': 'transitions', 'loop': 'loops', 'exit': 'exits'}
        for mm in re.finditer(r'\bregister(Preset|Ease|Transition|Loop|Exit)\s*\(\s*[\'"]([^\'"]+)[\'"]\s*,?\s*', js):
            kind, name = kinds[mm.group(1).lower()], mm.group(2)
            self.custom[kind].add(name)
            if kind == 'presets' and js[mm.end():mm.end() + 1] == '{':
                self.custom_meta[name] = _meta_from_value(js, mm.end(), None) or {}
        # a registry is reached as Storyboard.PRESETS / window.STORYBOARD.PRESETS / SB.PRESETS (const SB =
        # Storyboard) or through an alias (const PRESETS = Storyboard.PRESETS; const { EASE: E } = Storyboard)
        self.custom_alias = {}                         # preset name -> preset it copies (P.big = P.spring)
        member = re.compile(r'\s*(?:\.\s*([A-Za-z_$][\w$]*)|\[\s*[\'"]([^\'"]+)[\'"]\s*\])\s*=(?![=>])\s*')
        assign_at, k = [], js.find('Object.assign')
        while k >= 0:
            assign_at.append(k)
            k = js.find('Object.assign', k + 1)
        for word, kind in _REG_TARGETS.items():
            aliases = self.reg_aliases[kind]
            refs = [(i, i + len(word)) for i in _word_at(js, word)
                    if sb_member(i) or (word in aliases and _global_ref_start(js, i) is not None)]
            for a in aliases - {word}:
                refs += [(i, i + len(a)) for i in _word_at(js, a) if _global_ref_start(js, i) is not None]
            ref_re = '|'.join([r'(?:(?:window|globalThis|self)\s*\.\s*)?(?:%s)\s*\.\s*%s' % (sb_re, word)] +
                              [re.escape(x) for x in sorted(aliases, key=len, reverse=True)])
            copy_re = re.compile(r'(?:%s)\s*(?:\.\s*([A-Za-z_$][\w$]*)|\[\s*[\'"]([^\'"]+)[\'"]\s*\])' % ref_re)
            for _, end in sorted(refs):
                mm = member.match(js, end)
                if not mm:
                    continue
                name = mm.group(1) or mm.group(2)
                self.custom[kind].add(name)
                if kind != 'presets':
                    continue
                if js[mm.end():mm.end() + 1] == '{':
                    self.custom_meta[name] = _meta_from_value(js, mm.end(), None) or {}
                else:                                  # P.big = P.spring / = Storyboard.PRESETS.spring
                    cp = copy_re.match(js, mm.end())
                    if cp:
                        self.custom_alias[name] = cp.group(1) or cp.group(2)
            obj_assign = re.compile(r'Object\.assign\(\s*(?:%s)\s*,\s*\{' % ref_re)
            for i in assign_at:
                mm = obj_assign.match(js, i)
                if mm:
                    for key, vs, ve in js_object_entries(js, mm.end() - 1):
                        self.custom[kind].add(key)
                        if kind == 'presets' and vs is not None:
                            self.custom_meta[key] = _meta_from_value(js, vs, ve) or {}
        # bare `PRESETS.x = ...` with no alias declared: (word, kind, name, meta). With the IIFE engine
        # PRESETS is not a global -> ReferenceError; an inline legacy engine's top-level const works.
        self.bare_registrations = []
        for word, kind in _REG_TARGETS.items():
            if word in self.reg_aliases[kind]:
                continue                               # const PRESETS = Storyboard.PRESETS: handled above
            for i in _word_at(js, word):
                if _prev_char(js, i) == '.':
                    continue
                mm = member.match(js, i + len(word))
                if mm:
                    meta = _meta_from_value(js, mm.end(), None) if js[mm.end():mm.end() + 1] == '{' else None
                    self.bare_registrations.append((word, kind, mm.group(1) or mm.group(2), meta or {}))
        self.bare_declared = {w for w in _REG_TARGETS if _js_declares(js, w)}
        self.sfx_off = bool(self.body is not None and self.body.get('data-sfx', '').lower() == 'off')

    # ---- derived ---------------------------------------------------------------
    def caption_state(self, modes=CONTRACT_CAPTION_MODES, positions=CONTRACT_CAPTION_POSITIONS):
        """Mirror of the engine's _normCaptions (v0.8):
          init captions: false / 'off' / 'none' / 'false' / '0' / ''  -> off (overrides the body attribute)
                         true / {position}  -> on, mode = <body data-captions> if valid, else karaoke
                         '<mode>' / {mode}  -> that mode (exact, case-sensitive)
                         an unknown string  -> (engine warns) falls through to the body attribute
                         not given / other  -> the body attribute
          <body data-captions="<mode>">: exact, case-sensitive; anything else draws nothing.
          position: {position} if valid, else <body data-captions-position> if valid, else bottom.
        Returns {'on', 'mode', 'position', 'where', 'problems': [(severity, attr, value, message)]}."""
        modes, positions = set(modes), set(positions)
        st = {'on': False, 'mode': None, 'position': None, 'where': None, 'problems': []}
        c = self.init_opts.get('captions')
        if isinstance(c, _Expr) and re.fullmatch(r'[A-Za-z_$][\w$]*', c.text):
            val, found = self.find_const(c.text)          # captions: CAPTIONS
            if found and val is not None and not isinstance(val, _Expr):
                c = val
        known = ', '.join(sorted(modes)) or 'none'
        body = self.body
        b_raw = body.get('data-captions') if body is not None and body.has('data-captions') else None
        body_mode = b_raw if b_raw in modes else None
        b_pos = body.get('data-captions-position') if body is not None and body.has('data-captions-position') else None

        def case_hint(v):
            v = str(v)
            return f' (modes are case-sensitive: "{v.strip().lower()}")' if v.strip().lower() in modes and v not in modes else ''
        consult_body = False                               # does the engine fall through to <body data-captions>?
        if c is False:
            if body_mode:
                st['problems'].append(('info', 'captions', False,
                                       f'Storyboard.init captions:false overrides <body data-captions="{b_raw}"> '
                                       '-- no captions are drawn'))
        elif c is True:
            st.update(on=True, mode=body_mode or 'karaoke', where='init')
        elif isinstance(c, str):
            if c in modes:
                st.update(on=True, mode=c, where='init')
            elif re.fullmatch(r'(?:off|none|false|0|)', c.strip(), re.I):
                if body_mode:
                    st['problems'].append(('info', 'captions', c,
                                           f'Storyboard.init captions:"{c}" overrides <body data-captions="{b_raw}"> '
                                           '-- no captions are drawn'))
            else:
                consult_body = True
                then = (f'the engine falls back to <body data-captions="{body_mode}">' if body_mode
                        else 'no captions are drawn')
                st['problems'].append(('warn', 'captions', c, f'captions="{c}" is not a caption mode this engine '
                                       f'knows ({known}){case_hint(c)} -- {then}'))
        elif isinstance(c, dict):
            mode = c.get('mode')
            st.update(on=True, where='init', mode=mode if isinstance(mode, str) and mode in modes else (body_mode or 'karaoke'))
            if mode is not None and not isinstance(mode, _Expr) and not (isinstance(mode, str) and mode in modes):
                st['problems'].append(('info', 'captions.mode', mode,
                                       f'captions mode "{mode}" is unknown ({known}){case_hint(mode)} -- the engine uses '
                                       f'{st["mode"]}'))
            pos = c.get('position')
            if isinstance(pos, str) and pos in positions:
                st['position'] = pos
            elif pos is not None and not isinstance(pos, _Expr):
                st['problems'].append(('info', 'captions.position', pos,
                                       f'captions position "{pos}" is unknown ({", ".join(sorted(positions))}) '
                                       f'-- the engine uses {b_pos if b_pos in positions else "bottom"}'))
        elif isinstance(c, _Expr):
            st.update(on=True, where='init (runtime value)')   # can't evaluate: assume the author enabled them
        else:                                              # not given / null / a number: the body attribute decides
            consult_body = True
            if isinstance(c, (int, float)) and not isinstance(c, bool) and c != 0 and not body_mode:
                st['problems'].append(('warn', 'captions', c, f'captions: {c:g} is not true / a mode -- no captions are drawn'))
        if consult_body and b_raw is not None:
            if body_mode:
                st.update(on=True, mode=body_mode, where='body')
            elif b_raw.strip().lower() not in CAPTION_OFF_WORDS:
                st['problems'].append(('warn', 'data-captions', b_raw,
                                       f'data-captions="{b_raw}" is not a caption mode this engine knows ({known})'
                                       f'{case_hint(b_raw)} -- no captions are drawn'))
        if st['on'] and st['position'] is None:
            st['position'] = b_pos if b_pos in positions else 'bottom'
            if b_pos is not None and b_pos not in positions:
                st['problems'].append(('info', 'data-captions-position', b_pos,
                                       f'data-captions-position="{b_pos}" is unknown ({", ".join(sorted(positions))}) '
                                       '-- the engine uses bottom'))
        return st

    def captions_enabled(self, modes=CONTRACT_CAPTION_MODES):
        return self.caption_state(modes)['on']

    def _px(self, decls, prop):
        """`prop: 1080px` or `prop: var(--deck-w[, 1080px])` (custom property resolved from the CSS) -> int."""
        m = re.search(r'(?<![-\w])%s\s*:\s*(?:(\d+)px|var\(\s*(--[\w-]+)\s*(?:,\s*(\d+)px\s*)?\))' % prop, decls)
        if not m:
            return None
        if m.group(1):
            return int(m.group(1))
        v = re.search(r'(?<![-\w])%s\s*:\s*(\d+)px' % re.escape(m.group(2)), self.css_all)
        return int(v.group(1)) if v else (int(m.group(3)) if m.group(3) else None)

    def canvas_size(self):
        for n in self.elements:
            if 'deck' in n.classes or n.get('id') == 'deck':
                st = n.get('style', '')
                w, h = self._px(st, 'width'), self._px(st, 'height')
                if w and h:
                    return w, h
                break
        for sel in (r'\.deck', r'#deck', r'\.slide'):
            for m in re.finditer(r'(?:^|[},\s])%s\s*\{([^}]*)\}' % sel, self.css_all):
                body = m.group(1)
                w, h = self._px(body, 'width'), self._px(body, 'height')
                if w and h:
                    return w, h
        for n in (self.body,) + tuple(n for n in self.elements if 'deck' in n.classes)[:1]:
            if n is not None and n.get('data-aspect'):
                a = re.match(r'\s*(\d+)\s*[:/x]\s*(\d+)', n.get('data-aspect'))
                if a:
                    return int(a.group(1)) * 120, int(a.group(2)) * 120
        return 1920, 1080


def _ranges(nums):
    """[1,2,3,5,7,8] -> 'slides 1-3, 5, 7-8'."""
    out, nums = [], sorted(nums)
    i = 0
    while i < len(nums):
        j = i
        while j + 1 < len(nums) and nums[j + 1] == nums[j] + 1:
            j += 1
        out.append(str(nums[i]) if i == j else f'{nums[i]}-{nums[j]}')
        i = j + 1
    return ('slide ' if len(nums) == 1 else 'slides ') + ', '.join(out)


def _aspect_label(w, h):
    from math import gcd
    g = gcd(w, h) or 1
    return f'{w // g}:{h // g}'


# =============================================================================
# Findings + report
# =============================================================================
SEV_ORDER = {'error': 0, 'warn': 1, 'info': 2}
SEV_LABEL = {'error': 'ERRORS', 'warn': 'WARNINGS', 'info': 'INFO'}


@dataclass
class Finding:
    severity: str                  # error | warn | info
    check: str
    summary: str
    slide: int = None
    snippet: str = ''
    line: int = None
    detail: str = ''
    fix: str = ''

    def to_dict(self):
        return {'severity': self.severity, 'check': self.check, 'slide': self.slide,
                'summary': self.summary, 'snippet': self.snippet, 'line': self.line,
                'detail': self.detail, 'fix': self.fix,
                'fix_hint': self.fix}              # v0.7 --json key, kept for existing consumers


@dataclass
class AuditReport:
    deck: str
    findings: list = field(default_factory=list)
    checks: dict = field(default_factory=dict)     # check id -> pass | warn | error | info | skipped
    stats: dict = field(default_factory=dict)
    registry: Registry = None

    def add(self, severity, check, summary, node=None, slide=None, detail='', fix='', snip=None):
        f = Finding(severity, check, html.unescape(summary), slide,
                    snip if snip is not None else snippet(node), node.line if node is not None else None,
                    html.unescape(detail), html.unescape(fix))
        self.findings.append(f)
        prev = self.checks.get(check)
        if prev in (None, 'pass', 'skipped') or SEV_ORDER.get(severity, 9) < SEV_ORDER.get(prev, 9):
            self.checks[check] = severity
        return f

    def ran(self, check):
        self.checks.setdefault(check, 'pass')

    def skip(self, check, why=''):
        if check not in self.checks:
            self.checks[check] = 'skipped'
            if why:
                self.stats.setdefault('skipped', {})[check] = why

    def count(self, sev):
        return sum(1 for f in self.findings if f.severity == sev)

    @property
    def exit_code(self):
        return 2 if self.count('error') else (1 if self.count('warn') else 0)

    def sorted_findings(self):
        return sorted(enumerate(self.findings),
                      key=lambda p: (SEV_ORDER[p[1].severity], _CHECK_ORDER.get(p[1].check, 99),
                                     p[1].slide if p[1].slide is not None else -1, p[0]))

    def to_dict(self):
        return {
            'audit_version': AUDIT_VERSION, 'deck': self.deck, 'exit_code': self.exit_code,
            'summary': {'errors': self.count('error'), 'warnings': self.count('warn'),
                        'info': self.count('info'),
                        'passed': sorted(k for k, v in self.checks.items() if v == 'pass')},
            'checks': dict(sorted(self.checks.items())),
            'findings': [f.to_dict() for _, f in self.sorted_findings()],
            'stats': self.stats,
            'registry': {k: v for k, v in (self.registry.to_dict() if self.registry else {}).items()
                         if k not in ('presets', 'loops', 'eases', 'transitions', 'exits')} | (
                {'counts': {k: len(getattr(self.registry, k)) for k in
                            ('presets', 'loops', 'eases', 'transitions', 'exits')}} if self.registry else {}),
        }

    def render(self, markdown=False, max_per_check=None):
        """Text report (at most 10 findings per check per severity) or, with markdown=True, the full
        audit.md (every finding). max_per_check overrides the cap; 0 = no cap."""
        if max_per_check is None:
            max_per_check = 0 if markdown else 10
        L = []
        name = Path(self.deck).name
        s = self.stats
        e, w, i = self.count('error'), self.count('warn'), self.count('info')
        verdict = 'FAIL' if e else ('PASS with warnings' if w else 'PASS')
        reg = self.registry
        reg_line = (f'{Path(reg.engine).name if reg and reg.engine and reg.engine != "<inline>" else (reg.engine if reg else "?")}'
                    f' v{reg.version or "?"} -- registry via {reg.source if reg else "none"}'
                    + (f', {len(reg.presets)} presets / {len(reg.transitions)} transitions / {len(reg.exits)} exits'
                       if reg else ''))
        deck_line = (f'{s.get("slides", "?")} slides, {s.get("aspect", "?")} ({s.get("width", "?")}x{s.get("height", "?")}), '
                     f'duration {fmt_s(s.get("duration"))} ({s.get("duration_source", "?")}), '
                     f'{s.get("entrances", 0)} entrances, {s.get("word_hits", 0)} word hits, {s.get("words", 0)} words')
        if markdown:
            L += [f'# Storyboard audit -- `{name}`', '',
                  f'_Generated by `audit_deck.py` {AUDIT_VERSION} (storyboard skill)._', '',
                  f'**Result:** {verdict} -- {e} error(s), {w} warning(s), {i} info -- exit code {self.exit_code}', '',
                  f'- Engine: {reg_line}', f'- Deck: {deck_line}', f'- Timing margin: {s.get("margin")}s', '']
        else:
            L += [f'=== Storyboard audit -- {name} ===', f'engine: {reg_line}', f'deck:   {deck_line}',
                  f'result: {verdict} -- {e} error(s), {w} warning(s), {i} info (exit {self.exit_code})', '']
        groups = {}
        for _, f in self.sorted_findings():
            groups.setdefault(f.severity, []).append(f)
        for sev in ('error', 'warn', 'info'):
            fs = groups.get(sev)
            if not fs:
                continue
            L.append(f'## {SEV_LABEL[sev]} ({len(fs)})' if markdown else f'{SEV_LABEL[sev]} ({len(fs)})')
            if markdown:
                L.append('')
            per = Counter()
            hidden = Counter()
            for f in fs:
                per[f.check] += 1
                if max_per_check and per[f.check] > max_per_check:
                    hidden[f.check] += 1
                    continue
                where = f'slide {f.slide}' if f.slide else 'deck'
                if markdown:
                    L.append(f'- **[{f.check}] {where}:** {f.summary}')
                    if f.snippet:
                        L.append(f'  - `{f.snippet.replace("`", "")}`' + (f' (line {f.line})' if f.line else ''))
                    if f.detail:
                        L.append(f'  - {f.detail}')
                    if f.fix:
                        L.append(f'  - **Fix:** {f.fix}')
                else:
                    L.append(f'  [{f.check}] {where}: {f.summary}')
                    if f.snippet:
                        L.append(f'      {f.snippet}' + (f'  (line {f.line})' if f.line else ''))
                    if f.detail:
                        L.append(f'      detail: {f.detail}')
                    if f.fix:
                        L.append(f'      fix:    {f.fix}')
            for chk, n in hidden.items():
                L.append(f'  ... and {n} more [{chk}] finding(s) (see --json, or audit.md via --write)' if not markdown
                         else f'- _... and {n} more [{chk}] finding(s) (see `--json`)._')
            L.append('')
        passed = sorted(k for k, v in self.checks.items() if v == 'pass')
        skipped = sorted(k for k, v in self.checks.items() if v == 'skipped')
        if markdown:
            L += [f'## Passed ({len(passed)})', '', ', '.join(f'`{p}`' for p in passed) or '_none_', '']
            if skipped:
                L += [f'_Skipped:_ ' + ', '.join(f'`{k}` ({s.get("skipped", {}).get(k, "n/a")})' for k in skipped), '']
            L += ['## Stats', '', '```json', json.dumps(self.stats, indent=2, default=str), '```']
            if reg and reg.notes:
                L += ['', '## Registry notes', ''] + [f'- {n}' for n in reg.notes]
        else:
            L.append(f'PASSED ({len(passed)}): ' + (', '.join(passed) or 'none'))
            if skipped:
                L.append('SKIPPED: ' + ', '.join(f'{k} ({s.get("skipped", {}).get(k, "n/a")})' for k in skipped))
            if reg and reg.notes:
                L.append('registry notes: ' + ' | '.join(reg.notes))
        return '\n'.join(L).rstrip() + '\n'


_CHECK_ORDER = {c: i for i, c in enumerate([
    'engine', 'slides', 'timings', 'unknown-name', 'missing-asset', 'broken-ref', 'audio', 'hook',
    'text-density', 'captions', 'overshoot', 'transitions', 'atmosphere', 'signature', 'diversity',
    'monotony', 'breath', 'stacking', 'counter-dur', 'word-hits', 'fonts', 'unscheduled', 'attr-values',
    'words', 'sfx', 'placeholders', 'engine-version', 'internal'])}


# Auditor check methods, in run order
CHECKS = ('check_unknown_names', 'check_assets', 'check_broken_refs', 'check_audio', 'check_hook',
          'check_text_density', 'check_captions', 'check_overshoot', 'check_transitions', 'check_atmosphere',
          'check_signature', 'check_diversity', 'check_monotony', 'check_breath', 'check_stacking',
          'check_counters', 'check_word_hits', 'check_fonts', 'check_unscheduled', 'check_words', 'check_sfx',
          'check_attr_values', 'check_placeholders')
# checks that can report ERRORs: if one crashes the audit must not read as "warnings only"
ERROR_CLASS_CHECKS = {'check_unknown_names', 'check_assets', 'check_broken_refs', 'check_audio'}


def suggest(name, candidates):
    cands = sorted(set(candidates))
    low = {}
    for c in cands:
        low.setdefault(c.lower(), c)
    if name.lower() in low:
        return [low[name.lower()]]
    hits = difflib.get_close_matches(name.lower(), list(low), n=3, cutoff=0.6)
    return [low[h] for h in hits]


def _did_you_mean(name, candidates, attr):
    s = suggest(name, candidates)
    if s:
        return f'did you mean {attr}="{s[0]}"?' + (f' (also: {", ".join(s[1:])})' if len(s) > 1 else '')
    sample = ', '.join(sorted(candidates)[:12])
    return f'use a registered name ({sample}{", ..." if len(candidates) > 12 else ""}); run --registry for the full list'


# =============================================================================
# The audit
# =============================================================================
class Auditor:
    def __init__(self, path, margin=DEFAULT_MARGIN, engine=None, use_node=True, use_cache=True,
                 allow_placeholders=False, platform=None):
        self.path = Path(path)
        self.margin = float(margin)
        self.platform = render_platform(platform)
        self.engine_override = Path(engine) if engine else None
        self.use_node, self.use_cache = use_node, use_cache
        self.allow_placeholders = allow_placeholders
        self.r = AuditReport(deck=str(self.path))

    # ------------------------------------------------------------------ setup
    def run(self):
        text = self.path.read_text(encoding='utf-8', errors='replace')
        self.d = Deck(self.path, text)
        self.r.stats['margin'] = self.margin
        self._engine()
        self._slides()
        self._timings()
        self._duration()
        self._schedule()
        for meth in CHECKS:
            try:
                getattr(self, meth)()
            except Exception as e:                  # one broken check must not hide the others
                name = meth.replace('check_', '').replace('_', '-')
                # a crashed ERROR-class check fails closed: the gate can't vouch for what it didn't check
                sev = 'error' if meth in ERROR_CLASS_CHECKS else 'warn'
                self.r.add(sev, 'internal', f'audit check "{name}" crashed ({type(e).__name__}: {e}) -- '
                           'its result is unknown', fix='please report this deck; the other checks still ran')
        return self.r

    def _engine(self):
        d, r = self.d, self.r
        r.ran('engine')
        r.ran('engine-version')
        refs = list(d.engine_srcs)
        chosen = None
        for n in refs:
            p = d.resolve(n.get('src'))
            if p is None:
                continue
            prob = d.load_problem(n.get('src'))
            if prob and prob[0] == 'absolute':
                r.add('error', 'engine', f'engine script "{n.get("src")}" is a local absolute path the render cannot '
                      f'load -- {prob[1]}; nothing will play', n,
                      detail=f'resolved to {p} ({"exists" if p.is_file() else "missing"} on disk)',
                      fix=f'copy {SKILL_ENGINE.name} into {d.dir} and load it as <script src="storyboard-engine.js">')
            elif prob and p.is_file():                   # works from file:// only (a custom renderer)
                there = prob[2].is_file()
                r.add('warn', 'engine', f'engine script "{n.get("src")}" is outside the deck folder -- {prob[1]}: '
                      + (f'render_video.py runs {prob[2].relative_to(d.dir).as_posix()} there instead' if there else
                         'with render_video.py nothing plays'), n,
                      detail=f'resolved to {p}; only a renderer that opens the deck from file:// loads it',
                      fix=f'copy {SKILL_ENGINE.name} into the deck folder and load it as <script src="storyboard-engine.js"> '
                          '(unless this deck is rendered from file:// by its own pipeline)')
            if p.is_file():
                chosen = chosen or p
            elif not (prob and prob[0] == 'absolute'):
                r.add('error', 'engine', f'engine script "{n.get("src")}" not found (paths resolve from the deck folder) -- nothing will play',
                      n, detail=f'resolved to {p}',
                      fix=f'copy {SKILL_ENGINE} to {p.parent} (decks load their own copy of storyboard-engine.js)')
        inline = None
        for n, t in d.inline_scripts:
            if re.search(r'STORYBOARD ENGINE|\bconst\s+PRESETS\s*=\s*\{', t) and \
                    re.search(r'applyAnimsAt|window\.STORYBOARD\s*=|global\.Storyboard\s*=', t):
                inline = (n, t)
                break
        self.inline_engine = inline
        if not refs and not inline:
            if d.init_found:
                r.add('error', 'engine', 'deck calls Storyboard.init() but never loads storyboard-engine.js',
                      fix='add <script src="storyboard-engine.js"></script> before the init script and copy the engine next to the deck')
            elif d.timings_found or any('anim' in n.classes for n in d.elements):
                r.add('error', 'engine', 'no storyboard engine found (no storyboard-engine.js script and no inline engine)',
                      fix='add <script src="storyboard-engine.js"></script> + Storyboard.init({...}) (see template.html)')
        if refs and not d.init_found and not inline:
            r.add('error', 'engine', 'storyboard-engine.js is loaded but Storyboard.init({...}) is never called -- the deck will not play',
                  refs[0], fix='call Storyboard.init({timings:TIMINGS, labels:SLIDE_LABELS, wordHits:WORD_HITS, words:WORDS, fallbackDuration:N}) after the engine script')
        # pick the engine the deck really runs
        broken = None                                  # (node, path, reason) of an engine file that cannot run
        if self.engine_override:
            reg = load_registry(self.engine_override, use_node=self.use_node, use_cache=self.use_cache)
            if reg.load_error:
                broken = (None, self.engine_override, reg.load_error)
        elif chosen:
            reg = load_registry(chosen, use_node=self.use_node, use_cache=self.use_cache)
            if reg.load_error:
                broken = (next((n for n in refs if d.resolve(n.get('src')) == chosen), None), chosen, reg.load_error)
            elif reg.load_warning:
                r.add('warn', 'engine', f'{chosen.name} {reg.load_warning}',
                      next((n for n in refs if d.resolve(n.get('src')) == chosen), None),
                      detail='the audit could not confirm that this engine defines window.Storyboard; '
                             'open the deck and check the browser console',
                      fix=f'recopy {SKILL_ENGINE} next to the deck unless the engine is intentionally customised')
        elif inline and not refs:
            reg = load_registry(source=inline[1], label='<inline engine>', use_node=self.use_node,
                                use_cache=self.use_cache)
            if not reg.presets:
                sk = load_registry(SKILL_ENGINE, use_node=self.use_node, use_cache=self.use_cache)
                for f in ('reads', 'features_known', 'slide_map', 'default_transition', 'transition_aliases',
                          'caption_modes', 'caption_positions', 'emphasis_set', 'fun_set', 'hold_fn_only',
                          'slides_in_root'):
                    setattr(sk, f, getattr(reg, f))            # behaviour stays the inline engine's own
                sk.engine = reg.engine
                sk.notes.append('the inline engine defines no PRESETS the audit can read; preset names are '
                                'checked against the skill engine')
                reg = sk
            head = re.search(r'STORYBOARD (?:ENGINE|OVERLAY)[^\n]*', inline[1]) or re.search(r'\S[^\n]{0,80}', inline[1])
            overlay = 'storyboard-overlay-style' in d.text or 'data-storyboard-slide-auto' in d.text
            r.add('warn', 'engine-version', 'deck embeds an inline legacy engine instead of loading storyboard-engine.js',
                  inline[0], snip='<script> ' + (head.group(0).strip()[:120] if head else ''),
                  detail='offline render features (renderAt / ready / events / captions / SFX events) are unavailable',
                  fix=('re-run adopt mode with the current overlay.html so the page loads storyboard-engine.js' if overlay else
                       'rebuild the deck on template.html / vertical_template.html so it loads storyboard-engine.js '
                       'and calls Storyboard.init'))
        else:
            local = d.dir / 'storyboard-engine.js'
            reg = load_registry(local if local.is_file() else SKILL_ENGINE, use_node=self.use_node,
                                use_cache=self.use_cache)
        self.engine_broken = bool(broken)
        if broken:
            node, path, why = broken
            label = path.name if isinstance(path, Path) else str(path)
            r.add('error', 'engine', f'engine script "{node.get("src") if node is not None else label}" is broken: {why} '
                  '-- Storyboard is undefined, nothing will play', node,
                  detail=f'file: {path}',
                  fix=f'recopy {SKILL_ENGINE} to {Path(path).parent} (a partial download / saved error page '
                      'is the usual cause)')
            if SKILL_ENGINE.is_file() and Path(path).resolve() != SKILL_ENGINE.resolve():
                sk = load_registry(SKILL_ENGINE, use_node=self.use_node, use_cache=self.use_cache)
                sk.notes.append(f'{path} cannot run ({why}); the remaining checks use the skill engine')
                reg = sk
        self.reg = reg
        r.registry = reg
        # merge deck-registered names. A bare `PRESETS.x = ...` only works when an inline engine declares
        # PRESETS at the top level of a classic script; with storyboard-engine.js it throws (check_unknown_names)
        custom = {k: set(v) for k, v in d.custom.items()}
        inline_declares = {w for w in _REG_TARGETS if inline and _js_declares(js_blank_comments(inline[1]), w)}
        self.bare_broken = []                          # (word, name): ReferenceError in the browser
        for word, kind, name, meta in d.bare_registrations:
            if word in inline_declares:
                custom[kind].add(name)
                if kind == 'presets' and meta:
                    d.custom_meta.setdefault(name, meta)
            elif word not in d.bare_declared:
                self.bare_broken.append((word, name))
        for k, names in custom.items():
            if k == 'presets':
                for nme in names:                      # the deck's definition wins (it runs after the engine)
                    src_meta = d.custom_meta.get(nme) or reg.presets.get(d.custom_alias.get(nme)) or reg.presets.get(nme)
                    reg.presets[nme] = dict(src_meta or {})
            else:
                getattr(reg, k).update(names)
                if k == 'loops' and reg.loop_fns is not None:
                    reg.loop_fns.update(names)
        # stale deck copy of the engine
        if chosen and not broken and SKILL_ENGINE.is_file() and chosen.resolve() != SKILL_ENGINE.resolve() \
                and not self.engine_override:
            try:
                same = chosen.read_bytes() == SKILL_ENGINE.read_bytes()
            except OSError:
                same = True
            if not same:
                sk = load_registry(SKILL_ENGINE, use_node=self.use_node, use_cache=self.use_cache)
                dv, sv = _version_tuple(reg.version), _version_tuple(sk.version)
                ref = next((n for n in refs if d.resolve(n.get('src')) == chosen), None)
                if dv and sv and dv < sv:
                    lacks = [m for m in RENDER_API if reg.api and m not in reg.api and m in (sk.api or RENDER_API)]
                    r.add('warn', 'engine-version', f'deck copy of storyboard-engine.js is v{reg.version}, the skill ships v{sk.version}',
                          ref, detail=(f'this copy has no Storyboard.{"() / .".join(lacks)}() -- the frame-accurate '
                                       'offline render path cannot drive it' if lacks else ''),
                          fix=f'recopy {SKILL_ENGINE} next to the deck (newer engine: render/caption/SFX fixes)')
                else:
                    r.add('info', 'engine-version', 'deck copy of storyboard-engine.js differs from the skill engine',
                          ref, detail=f'deck: v{reg.version or "?"}, skill: v{sk.version or "?"}',
                          fix='recopy the skill engine unless the deck intentionally pins a customised engine')
        self.continuous = reg.continuous()
        self.ambient = AMBIENT_PRESETS | self.continuous
        self.atmosphere = self.ambient | ATMOSPHERE_EXTRA
        r.stats['engine'] = {'path': reg.engine, 'version': reg.version, 'registry_source': reg.source}
        if d.external_scripts:
            r.stats['deck_scripts'] = [str(p) for _, p in d.external_scripts]

    def _slides(self):
        d, r = self.d, self.r
        r.ran('slides')
        overlay = 'storyboard-overlay-style' in d.text or 'data-storyboard-slide-auto' in d.text
        sel = d.init_opts.get('slideSelector')
        root_sel = d.init_opts.get('root')
        live = [n for n in d.dom.live_iter() if n.tag != '#document']      # never <template> content
        # v0.8: deck = opts.root || #deck || .deck; slides = deck.querySelectorAll(sel), else the whole
        # document's. Legacy engines: document.querySelectorAll('.slide').
        root = None
        if isinstance(root_sel, str):
            m = css_select(d.dom, root_sel)
            root = m[0] if m else None
        if root is None and self.reg.slides_in_root:
            root = next((n for n in live if n.get('id') == 'deck'), None) or \
                next((n for n in live if 'deck' in n.classes), None)

        def query(selector):
            found = css_select(root, selector) if root is not None else css_select(d.dom, selector)
            if found is not None and not found and root is not None:
                found = css_select(d.dom, selector)
            return found
        slides = None
        if isinstance(sel, str) and sel:
            slides = query(sel)
            if slides is None:
                r.add('info', 'slides', f'slideSelector "{sel}" is too complex for the static audit; using .slide')
        if slides is None and overlay:
            slides = [n for n in live if n.has('data-storyboard-slide')] or \
                [n for n in live if {'slide', 'storyboard-slide'} & set(n.classes)]
            if not slides:
                secs = [n for n in live if n.tag == 'section' and n.parent is not None
                        and n.parent.tag in ('body', 'main')]
                main = next((n for n in live if n.tag == 'main'), None)
                slides = secs if len(secs) >= 2 else (main.elements() if main is not None and len(main.elements()) >= 2
                                                     else ([d.body] if d.body is not None else []))
        if slides is None:
            slides = query('.slide')
        self.adopted = overlay or isinstance(sel, str) or isinstance(root_sel, str) or \
            d.init_opts.get('slides') is not None or d.init_opts.get('scaleDeck') is False
        self.slides = slides
        self.slide_of_node = {}
        # How the engine numbers slides:
        #  v0.8+ (Registry.slide_map): number = parseInt(data-slide) when >= 1, else the 1-based position;
        #        a cue for slide N shows the FIRST slide numbered N (else the N-th .slide element).
        #  legacy (v0.3 copies, inline vertical engine): a cue for slide N shows the N-th .slide element,
        #        while each element's animations are cued via parseInt(data-slide || '0') -> 0s if missing.
        #  overlay.html (adopt): numbers the slides 1..N by position itself (data-slide is overwritten).
        slide_map = self.reg.slide_map
        auto = overlay
        numbers, bare, bad_attr = [], [], []
        for k, n in enumerate(slides, 1):
            v = n.get('data-slide')
            num = k
            if not auto and v is not None:
                iv = js_int(v)
                if iv is not None and iv >= 1:
                    num = iv
                else:
                    bad_attr.append((k, n, v))
            elif not auto:
                bare.append(k)
            numbers.append(num)
            self.slide_of_node[id(n)] = num
        mode = 'position (overlay)' if auto else ('data-slide' if slide_map else 'data-slide (legacy engine)')
        if not slides:
            r.add('error', 'slides', 'no slides found (no .slide elements)',
                  fix='wrap each beat in <section class="slide" data-slide="N"> inside .deck')
        elif bare and slide_map and not self.adopted:       # adopt mode numbers by position by design
            r.add('info', 'slides', f'{len(bare)} of {len(slides)} slide(s) have no data-slide ({_ranges(bare)}); '
                  'the engine numbers them by position', slides[bare[0] - 1], slide=bare[0],
                  fix=f'number every <section class="slide"> data-slide="1".."{len(slides)}" so tools and readers agree')
        elif bare and not self.adopted:
            k0 = bare[0]
            r.add('error', 'slides', f'{len(bare)} of {len(slides)} slide(s) have no data-slide attribute ({_ranges(bare)}) -- '
                  'with this engine their animations are all cued at 0s', slides[k0 - 1], slide=k0,
                  detail=f'{self.reg.engine or "this engine"} (legacy) cues each slide\'s animations via '
                         'parseInt(data-slide || "0"); without it every entrance is scheduled at t=0 and is long '
                         'finished when the slide appears',
                  fix=f'number every <section class="slide"> data-slide="1".."{len(slides)}" in document order')
        for k, n, v in bad_attr:
            if slide_map:
                r.add('warn', 'slides', f'data-slide="{v}" is not a positive integer -- the engine numbers this slide '
                      f'by position ({k})', n, slide=k, fix=f'use data-slide="{k}"')
            else:
                r.add('error', 'slides', f'data-slide="{v}" is not a positive integer -- with this engine the slide\'s '
                      'animations are cued at 0s', n, slide=k, fix=f'use data-slide="{k}"')
        if slides and not auto:
            dup = [x for x, c in Counter(numbers).items() if c > 1]
            for x in dup:
                n = slides[numbers.index(x, numbers.index(x) + 1)]
                r.add('error', 'slides', f'duplicate data-slide="{x}"', n, slide=x,
                      detail=('a cue for slide {0} shows the first slide numbered {0}; this one is never shown'
                              if slide_map else 'both slides\' animations are cued from the same TIMINGS entry').format(x),
                      fix='number slides 1..N exactly once, in document order')
            expected = list(range(1, len(slides) + 1))
            if not dup and sorted(numbers) != expected:
                missing = sorted(set(expected) - set(numbers))
                extra = sorted(set(numbers) - set(expected))
                r.add('error', 'slides', f'data-slide numbering has gaps: missing {missing}' +
                      (f', out of range {extra}' if extra else ''),
                      slides[numbers.index(extra[0])] if extra else None,
                      slide=extra[0] if extra else None,
                      detail=(f'the voice / AAF tools seed TIMINGS as slides 1..{len(slides)}; a cue for a number no '
                              'slide has falls back to the N-th .slide element, so cues land on the wrong slide '
                              '(one slide shown twice, another never)' if slide_map else
                              'this engine shows slide N as the N-th .slide element -- gaps shift every later slide'),
                      fix=f'renumber the {len(slides)} slides 1..{len(slides)} in document order (and TIMINGS to match)')
            elif not dup and numbers != expected:
                bad = next(k for k, (a, b) in enumerate(zip(numbers, expected)) if a != b)
                if slide_map:
                    r.add('info', 'slides', f'data-slide numbers are not in document order ({numbers}); the engine '
                          'follows data-slide, so the video plays them in TIMINGS order', slides[bad], slide=numbers[bad],
                          fix='fine if intended; otherwise reorder the <section> elements to read top-to-bottom')
                else:
                    r.add('error', 'slides', f'data-slide numbers are out of document order ({numbers})',
                          slides[bad], slide=numbers[bad],
                          detail='this engine shows slide N as the N-th .slide element but cues its animations by '
                                 'data-slide, so these slides swap content and timing',
                          fix='reorder the <section> elements or renumber data-slide to match document order')
        self.slide_nums = list(dict.fromkeys(numbers))
        self.slide_node = {}
        for num, n in zip(numbers, slides):
            self.slide_node.setdefault(num, n)           # the engine's SLIDE_BY_NUM: first one wins
        r.stats['slides'] = len(slides)
        r.stats['slide_numbering'] = mode
        if self.adopted:
            r.stats['adopted'] = True

    def slide_for(self, node):
        for a in node.ancestors(include_self=True):
            s = self.slide_of_node.get(id(a))
            if s is not None:
                return s
        return 0

    def _timings(self):
        d, r = self.d, self.r
        r.ran('timings')
        self.cues = {}
        self.timings = []
        raw = d.timings_raw
        if raw is None:
            if d.timings_found:
                r.skip('timings', 'TIMINGS is a template placeholder')
            elif d.init_found or self.inline_engine:
                r.add('error', 'timings', 'no TIMINGS array found -- the engine only knows slide 1',
                      fix='declare const TIMINGS = [{time:0, slide:1}, ...] and pass timings:TIMINGS to Storyboard.init')
            else:
                r.skip('timings', 'no TIMINGS and no engine init')
            return
        if not isinstance(raw, list):
            expr = raw.text if isinstance(raw, _Expr) else repr(raw)
            what = (f'Storyboard.init({d.init_opaque}) builds its options at runtime' if d.init_opaque is not None
                    else f'{d.timings_name} is computed at runtime ({expr[:60]})')
            r.add('warn', 'timings', f'{what} -- cue timing cannot be audited and the voice / AAF tools cannot '
                  'rewrite it',
                  detail='overshoot / atmosphere / breath / hook-timing checks are skipped',
                  fix='declare a literal const TIMINGS = [{time:0, slide:1}, ...] and pass timings:TIMINGS in the '
                      'Storyboard.init({...}) object literal')
            return
        if d.init_found and d.timings_name != 'TIMINGS':
            # the tools (elevenlabs_generate / tts_free / aaf_to_timings / calibration) rewrite `const TIMINGS`
            src = ('an inline array in Storyboard.init({timings: [...]})' if d.timings_name.startswith('init(')
                   else f'{d.timings_name} (Storyboard.init({d.init_via}))' if d.init_via and d.timings_name.startswith(d.init_via + '.')
                   else f'const {d.timings_name}')
            r.add('warn', 'timings', f'the engine takes its cues from {src}, not `const TIMINGS` -- the voice / AAF '
                  'tools and calibration rewrite `const TIMINGS = [...]`, so re-seeding from a new voice-over never '
                  'reaches the cues this deck plays',
                  detail='the cues themselves are audited below',
                  fix='declare const TIMINGS = [{time:0, slide:1}, ...] and pass timings: TIMINGS in the '
                      'Storyboard.init({...}) object literal')
        elif d.init_opaque is not None:
            r.add('info', 'timings', f'Storyboard.init({d.init_opaque}) builds its options at runtime; the audit '
                  'assumes they pass const TIMINGS',
                  fix='pass timings: TIMINGS in a Storyboard.init({...}) object literal so tools and audit agree')
        for k, item in enumerate(raw):
            # the engine's _normTimings: parseFloat(time) finite, parseInt(slide, 10) >= 1 (strings are fine)
            tv = item.get('time') if isinstance(item, dict) else None
            sv = item.get('slide') if isinstance(item, dict) else None
            t = js_finite(tv) if not isinstance(tv, _Expr) else None
            s = js_int(sv) if not isinstance(sv, _Expr) else None
            if t is None or s is None or s < 1:
                r.add('error', 'timings', f'TIMINGS[{k}] is not {{time:<seconds>, slide:<int >= 1>}}: {item!r}'[:160],
                      detail='the engine drops malformed cues, so that slide is never cued',
                      fix='every entry needs a numeric time and an integer slide')
                continue
            self.timings.append((s, t))
        n_t, n_s = len(self.timings), len(self.slides)
        r.stats['timings_count'] = n_t
        if n_s and n_t != n_s:
            r.add('error', 'timings', f'TIMINGS has {n_t} cue(s) but the deck has {n_s} slide(s)',
                  detail='every slide needs exactly one cue; extra/missing cues show the wrong slide at the wrong time',
                  fix='add/remove TIMINGS entries so there is one {time, slide} per slide (re-run the voice tool or calibrate with T/M/A/E)')
        times = [t for _, t in self.timings]
        for k in range(1, len(times)):
            if times[k] <= times[k - 1]:
                r.add('error', 'timings', f'TIMINGS not ascending: [{k}] slide {self.timings[k][0]} @ {times[k]:g}s '
                      f'<= [{k - 1}] slide {self.timings[k - 1][0]} @ {times[k - 1]:g}s',
                      slide=self.timings[k][0],
                      detail=('the engine sorts cues by time, so the slides play in a different order than TIMINGS '
                              'lists them (equal times: the earlier slide is never shown)' if self.reg.slide_map else
                              'this engine walks cues in order and stops at the first future cue')
                             + '; calibration (T/M/A) and the voice tools assume ascending cues',
                      fix='sort TIMINGS by time; each cue must be later than the previous one')
        if any(t < 0 for t in times):
            r.add('warn', 'timings', 'TIMINGS contains a negative time (the engine clamps it to 0)',
                  fix='cue times are seconds from 0')
        seen = Counter(s for s, _ in self.timings)
        for s, c in seen.items():
            if c > 1:
                r.add('error', 'timings', f'slide {s} appears {c} times in TIMINGS', slide=s,
                      fix='one cue per slide')
        valid = set(self.slide_nums)
        for s, t in self.timings:
            if valid and s not in valid:
                r.add('error', 'timings', f'TIMINGS references slide {s}, which does not exist', slide=s,
                      fix=f'slides are numbered {min(valid)}..{max(valid)}')
        for s in self.slide_nums:
            if s not in seen and n_t:
                r.add('error', 'timings', f'slide {s} has no cue in TIMINGS -- it is never shown',
                      self.slide_node.get(s), slide=s, fix=f'add {{time:<seconds>, slide:{s}}} to TIMINGS')
        for s, t in self.timings:
            self.cues.setdefault(s, t)

    def _duration(self):
        d, r = self.d, self.r
        dur, src = None, None
        self.audio_node = None
        want = d.init_opts.get('audio')
        if isinstance(want, str):
            m = css_select(d.dom, want)
            self.audio_node = m[0] if m else None
        if self.audio_node is None:
            self.audio_node = next((n for n in d.elements if n.tag == 'audio' and n.get('id') == 'voAudio'), None) or \
                next((n for n in d.elements if n.has('data-storyboard-audio')), None) or \
                next((n for n in d.elements if n.tag == 'audio'), None)
        self.audio_src = None
        if self.audio_node is not None:
            self.audio_src = self.audio_node.get('src') or next(
                (c.get('src') for c in self.audio_node.elements() if c.tag == 'source' and c.get('src')), None)
        self.audio_path = d.resolve(self.audio_src) if self.audio_src else None
        wt = d.dir / 'word_timestamps.json'
        self.wt = None
        if wt.is_file():
            try:
                self.wt = json.loads(wt.read_text(encoding='utf-8'))
            except (OSError, ValueError):
                self.wt = None
        if isinstance(self.wt, dict) and isinstance(self.wt.get('duration'), (int, float)):
            aud = self.wt.get('audio')
            if not aud or not self.audio_src or Path(unquote(str(aud))).name == Path(unquote(self.audio_src)).name:
                dur, src = float(self.wt['duration']), 'word_timestamps.json'
        if dur is None and self.audio_path is not None and self.audio_path.is_file():
            dur = audio_file_duration(self.audio_path)
            src = 'audio file' if dur else None
        if dur is None and d.sb_duration:
            dur, src = d.sb_duration, 'SB_DURATION'
        if dur is None and d.fallback_duration:
            dur, src = d.fallback_duration, 'fallbackDuration'
        if dur is None and d.words:
            ends = [js_float(w.get('end')) for w in d.words if js_float(w.get('end')) is not None]
            if ends:
                dur, src = max(ends) + 0.5, 'WORDS'
        if dur is None and self.cues:
            dur, src = max(self.cues.values()) + 5.0, 'last cue + 5s'
        self.duration, self.duration_src = dur, src
        self.audio_known = src in ('word_timestamps.json', 'audio file')
        r.stats['duration'] = round(dur, 3) if dur else None
        r.stats['duration_source'] = src
        # slide windows
        order = sorted(self.cues.items(), key=lambda kv: kv[1])
        self.window = {}
        for k, (s, t) in enumerate(order):
            end = order[k + 1][1] if k + 1 < len(order) else (dur if dur and dur > t else None)
            self.window[s] = (t, end)
        self.first_slide = order[0][0] if order else (self.slide_nums[0] if self.slide_nums else None)
        if self.audio_known and order and dur:
            late = [(s, t) for s, t in order if t >= dur]
            if late:
                s, t = late[0]
                r.add('error', 'timings', f'{len(late)} cue(s) start at/after the end of the voice-over ({dur:.2f}s): '
                      + ', '.join(f'slide {a} @ {b:g}s' for a, b in late[:6]) + (' ...' if len(late) > 6 else '')
                      + ' -- never shown in the video', self.slide_node.get(s), slide=s,
                      detail=f'the render stops when the audio ends ({self.duration_src}); at most a silent flash '
                             'in the render tail',
                      fix='re-seed TIMINGS from word_timestamps.json (elevenlabs_generate.py / aaf_to_timings.py) '
                          'or calibrate (T/M/A) against the real VO')
            s, t = order[-1]
            if dur - 0.5 <= t < dur:
                r.add('warn', 'timings', f'last cue (slide {s} @ {t:g}s) leaves only {dur - t:.2f}s before the audio ends ({dur:.2f}s)',
                      self.slide_node.get(s), slide=s, fix='re-seed TIMINGS from word_timestamps.json or calibrate (T/M/A)')
        w, h = d.canvas_size()
        self.vertical = h > w
        r.stats.update({'width': w, 'height': h, 'aspect': _aspect_label(w, h)})

    # ------------------------------------------------------------------ schedule
    def _num_attr(self, node, name):
        """parseFloat + isFinite like the engine: NaN / Infinity are ignored (the default is used)."""
        v = node.get(name)
        if v is None:
            return None, False
        f = js_finite(v)
        if f is None:
            self.bad_numbers.append((node, name, v))
            return None, True
        return f, True

    @staticmethod
    def camera_moves(spec):
        """Parse data-camera like the engine ('t=>scale:1.2,x:-40; t2=>...'); True when a keyframe
        differs from the implicit {scale:1, x:0, y:0} at the cue, None when nothing parses."""
        kfs = []
        for seg in [s.strip() for s in (spec or '').split(';') if s.strip()]:
            t, _, props = seg.partition('=>')
            kf = {}
            for pr in props.split(','):
                k, sep, v = pr.partition(':')
                n = js_finite(v) if sep else None
                if k.strip() and n is not None:
                    kf[k.strip()] = n
            if kf:
                kfs.append(kf)
        if not kfs:
            return None
        return any(abs(kf.get('scale', 1) - 1) > 1e-6 or abs(kf.get('x', 0)) > 1e-6 or abs(kf.get('y', 0)) > 1e-6
                   for kf in kfs)

    def _schedule(self):
        d, r = self.d, self.r
        self.anims, self.exits, self.loops, self.holds = [], [], [], []
        self.bad_numbers = []
        self.bad_cameras = []
        self.names_used = []                      # (kind, name, node, slide)
        scheduled = set()
        group_children = set()
        reg = self.reg
        sup = reg.reads_attr                      # an attribute this engine never reads is ignored by it

        def cue_for(s):
            return self.cues.get(s, 0.0)

        # attribute values are used RAW, like the engine (PRESETS[el.dataset.anim], EXITS[...], LOOPS[...],
        # TRANSITIONS[...] -- " pushLeft " is unknown there); only data-then steps are trimmed (parseChain)
        def schedule(el, cue, slide, name, t_rel=None, dur=None, group=None, inherited=False):
            if name in (None, ''):
                name = 'fadeIn'
            t_abs, has_t = self._num_attr(el, 'data-t')
            if t_rel is None:
                t_rel, _ = self._num_attr(el, 'data-t-rel')
            if has_t and t_abs is not None:
                start, rel = t_abs, None
            else:
                start, rel = cue + (t_rel or 0.0), (t_rel or 0.0)
            if dur is None:
                dur, _ = self._num_attr(el, 'data-dur')
            if dur is None:
                dur = reg.dur(name) if reg.dur(name) is not None else (reg.dur('fadeIn') or 0.8)
            a = Anim(el, slide, name, start, dur, 'entrance', group, rel)
            self.anims.append(a)
            if not inherited:                     # a group's name is reported once, on the group
                self.names_used.append(('data-anim', name, el, slide))
            then = el.get('data-then')
            if then:
                cursor = start + dur
                for part in [p.strip() for p in then.split(';') if p.strip()]:
                    nm, delay = part, None
                    pieces = part.split('@')
                    if len(pieces) == 2:          # parseChain: exactly one '@' ("a@1@2" is a name)
                        nm, delay = pieces[0].strip(), js_float(pieces[1])
                        if delay is None:
                            self.bad_numbers.append((el, 'data-then', part))
                    self.names_used.append(('data-then', nm, el, slide))
                    pdur = reg.dur(nm)
                    if pdur is None or not sup('data-then'):
                        continue
                    st = start + delay if delay is not None else cursor
                    self.anims.append(Anim(el, slide, nm, st, pdur, 'chain', group,
                                           None if rel is None else st - cue))
                    cursor = st + pdur
            loop = el.get('data-loop')
            if loop:
                self.names_used.append(('data-loop', loop, el, slide))
                if sup('data-loop'):
                    self.loops.append((el, loop, slide))
            hold = el.get('data-hold')
            if hold:
                self.names_used.append(('data-hold', hold, el, slide))
                if sup('data-hold'):
                    self.holds.append((el, hold, slide))
            ex = el.get('data-exit')
            if ex:
                self.names_used.append(('data-exit', ex, el, slide))
                xt, has_xt = self._num_attr(el, 'data-exit-t')
                xa, has_xa = self._num_attr(el, 'data-exit-at')
                xd, _ = self._num_attr(el, 'data-exit-dur')
                explicit = xt is not None or xa is not None
                xs = xt if xt is not None else (cue + xa if xa is not None else start + dur + 2)
                valid_t = xt is not None if has_xt else (xa is not None if has_xa else True)   # NaN: no exit
                if sup('data-exit') and valid_t and (ex in reg.exits or not reg.exits):  # unknown: never runs
                    self.exits.append(ExitSpec(el, slide, ex, xs, xd if xd is not None else 0.7, explicit))
            ease = el.get('data-ease')
            if ease:
                self.names_used.append(('data-ease', ease, el, slide))
            for attr in ('data-loop-amp', 'data-loop-period', 'data-stagger'):
                self._num_attr(el, attr)
            sp = el.get('data-spring')
            if sp is not None and any(js_float(x) is None for x in sp.split(',')[:2]):
                self.bad_numbers.append((el, 'data-spring', sp))
            scheduled.add(id(el))

        # 1) stagger groups (children inherit preset / dur / ease) -- only engines that read data-stagger
        stagger_on = sup('data-stagger')
        self.stagger_ignored = []
        for g in d.elements:
            if 'anim-group' not in g.classes or not g.has('data-stagger') or self._in_template(g):
                continue
            if not stagger_on:
                self.stagger_ignored.append((g, self.slide_for(g)))
                continue
            slide = self.slide_for(g)
            cue = cue_for(slide)
            stagger, _ = self._num_attr(g, 'data-stagger')
            stagger = 0.1 if stagger is None else stagger
            base, _ = self._num_attr(g, 'data-t-rel')
            base = base or 0.0
            gname = g.get('data-anim') or 'fadeUp'
            if g.get('data-anim'):
                self.names_used.append(('data-anim', gname, g, slide))
            gdur, _ = self._num_attr(g, 'data-dur')
            if gdur is None:
                gdur = reg.dur(gname) if reg.dur(gname) is not None else 1.0
            if g.get('data-ease'):
                self.names_used.append(('data-ease', g.get('data-ease'), g, slide))
            for i, child in enumerate(g.elements()):
                cdur, _ = self._num_attr(child, 'data-dur')
                schedule(child, cue, slide, child.get('data-anim') or gname, t_rel=base + i * stagger,
                         dur=cdur if cdur is not None else gdur, group=g, inherited=not child.get('data-anim'))
                group_children.add(id(child))
        # 2) standalone .anim elements
        for el in d.elements:
            if 'anim' not in el.classes or id(el) in scheduled or self._in_template(el):
                continue
            if stagger_on and el.parent is not None and 'anim-group' in el.parent.classes \
                    and el.parent.has('data-stagger'):
                continue
            slide = self.slide_for(el)
            schedule(el, cue_for(slide), slide, el.get('data-anim') or 'fadeIn')
        self.group_children = group_children
        self.entrance_of = {}
        for a in self.anims:
            if a.kind == 'entrance':
                self.entrance_of.setdefault(id(a.el), a)
        self.exit_of = {id(x.el): x for x in self.exits}
        # cameras: only keyframes the engine can parse move anything
        self.cameras = []
        self.cameras_ignored = []
        for el in d.elements:
            spec = el.get('data-camera', '').strip()
            if 'camera' not in el.classes or not spec or self._in_template(el):
                continue
            if not sup('data-camera'):
                self.cameras_ignored.append((el, self.slide_for(el)))
                continue
            moves = self.camera_moves(spec)
            if moves:
                self.cameras.append((el, self.slide_for(el)))
            elif moves is None:
                self.bad_cameras.append(el)
        # word hits: resolve their target elements once
        # the engine hits document.querySelector(sel) -- the FIRST match only (None: selector too complex)
        self.hit_targets = []
        for k, h in enumerate(d.word_hits):
            sel = h.get('sel') if isinstance(h.get('sel'), str) else None
            nodes = css_select(d.dom, sel) if sel else []
            self.hit_targets.append((h, sel, nodes[:1] if nodes else nodes))
        entrances = [a for a in self.anims if a.kind == 'entrance' and a.name not in self.ambient]
        r.stats['entrances'] = len(entrances)
        r.stats['chained_steps'] = sum(1 for a in self.anims if a.kind == 'chain')
        r.stats['preset_counts'] = dict(Counter(a.name for a in self.anims).most_common())
        r.stats['anims_per_slide'] = {str(s): c for s, c in sorted(Counter(a.slide for a in entrances).items())}
        r.stats['word_hits'] = len(d.word_hits)
        r.stats['words'] = len(d.words)

    @staticmethod
    def _in_template(node):
        return any(a.tag in ('template', 'noscript') for a in node.ancestors())

    def visible_from(self, node, base=None):
        """Time a node first becomes visible (max entrance start over animated ancestors; `base`
        overrides the slide's cue as the earliest time)."""
        slide = self.slide_for(node)
        t = self.cues.get(slide, 0.0) if base is None else base
        for a in node.ancestors(include_self=True):
            an = self.entrance_of.get(id(a))
            if an is not None:
                t = max(t, an.start)
        return t

    def is_known(self, kind, name):
        reg = self.reg
        if kind in ('data-anim', 'data-then'):
            return name in reg.presets
        if kind == 'data-loop':
            return name in reg.loops
        if kind == 'data-hold':
            return name in reg.holds()
        if kind == 'data-exit':
            return name in reg.exits
        if kind == 'data-ease':
            return name in reg.eases or (reg.ease_css and bool(re.match(r'(cubic-bezier|steps)\s*\(', name)))
        if kind == 'data-transition-in':
            return name in reg.transitions
        return True

    # ------------------------------------------------------------------ checks
    def check_unknown_names(self):
        r, reg = self.r, self.reg
        if not reg.available():
            r.skip('unknown-name', 'engine registry unavailable')
            return
        r.ran('unknown-name')
        consequences = {
            'data-anim': ('is not a registered preset', 'the intended entrance never plays (v0.8 falls back to fadeIn; '
                                                          'older engines leave the element invisible)',
                          reg.presets),
            'data-then': ('in data-then is not a registered preset', 'that chain step is dropped', reg.presets),
            'data-loop': ('is not a registered loop', 'the loop never runs', reg.loops),
            'data-hold': ('is not a registered loop/hold', 'the moving hold never runs', reg.holds()),
            'data-exit': ('is not a registered exit', 'the element never leaves', reg.exits),
            'data-ease': ('is not a registered ease', "the preset's default curve is used instead", reg.eases),
            'data-transition-in': ('is not a registered transition', 'the engine falls back to a hard cut',
                                   reg.transitions),
        }
        uses = list(self.names_used)
        for s in self.slides:
            tr = s.get('data-transition-in')
            if tr:                                      # "" = the engine default, like a missing attribute;
                uses.append(('data-transition-in', tr, s, self.slide_for(s)))    # " " is not (-> cut)
        # attributes the deck's own code reads (custom semantics, e.g. a numeric data-hold): not ours to judge
        deck_reads = js_attr_reads(self.d.js)
        other = {'data-anim': reg.presets, 'data-loop': reg.loops, 'data-exit': reg.exits,
                 'data-ease': reg.eases, 'data-transition-in': reg.transitions}
        # an attribute this engine never reads is ignored by it: the effect silently does not happen
        unsupported = {'data-exit': ('error', 'the element never leaves'),
                       'data-loop': ('error', 'the loop never runs'),
                       'data-ease': ('error', "the preset's default curve is used"),
                       'data-transition-in': ('error', 'the slide changes with a hard cut'),
                       'data-then': ('warn', 'the chained steps never run'),
                       'data-hold': ('warn', 'the moving hold never runs')}
        seen, seen_unsup = set(), set()
        eng = 'the inline legacy engine' if reg.engine in ('<inline engine>', '<inline>') else \
            f'{Path(reg.engine).name if reg.engine else "this engine"} v{reg.version or "?"}'
        # `PRESETS.x = {...}` with no `const PRESETS = Storyboard.PRESETS`: a ReferenceError in the browser
        attr_word = {'data-anim': 'PRESETS', 'data-then': 'PRESETS', 'data-loop': 'LOOPS', 'data-hold': 'LOOPS',
                     'data-exit': 'EXITS', 'data-ease': 'EASE', 'data-transition-in': 'TRANSITIONS'}
        broken = {}
        for word, name in getattr(self, 'bare_broken', []):
            broken.setdefault(word, []).append(name)

        def alias_fix(word, name):
            api = {'PRESETS': 'registerPreset', 'EASE': 'registerEase', 'TRANSITIONS': 'registerTransition'}.get(word)
            return (f'{word} is not a global with {eng}: declare `const {word} = Storyboard.{word};` before '
                    f'`{word}.{name} = ...`' + (f', or call Storyboard.{api}("{name}", ...)' if api else ''))
        for kind, name, node, slide in uses:
            if kind in unsupported and not reg.reads_attr(kind):
                if kind in deck_reads or (id(node), kind) in seen_unsup:
                    continue
                if kind == 'data-transition-in' and name == 'cut':
                    continue                            # asks for exactly what such an engine does
                seen_unsup.add((id(node), kind))
                sev, why = unsupported[kind]
                r.add(sev, 'unknown-name', f'{kind}="{name}" is not supported by {eng} (it never reads {kind}) -- {why}',
                      node, slide=slide or None,
                      fix='rebuild the deck on template.html / vertical_template.html + storyboard-engine.js (v0.8), '
                          f'or remove {kind}')
                continue
            if self.is_known(kind, name) or (id(node), kind, name) in seen:
                continue
            if kind == 'data-hold' and ('data-hold' in deck_reads or js_float(name) is not None):
                continue
            seen.add((id(node), kind, name))
            what, why, cands = consequences[kind]
            if not cands:                               # supported, but the names can't be read: can't judge
                continue
            fix = _did_you_mean(name, cands, kind if kind != 'data-then' else 'data-then step')
            home = [a for a, names in other.items() if a != kind and name in names]
            bare = name.strip()
            if kind == 'data-hold' and name in reg.loops:
                what = 'is a data-loop name the engine cannot run as a hold'
                fix = (f'LOOPS.{name} is special-cased for data-loop only (it is not a function, and data-hold runs '
                       f'only function loops): use data-loop="{name}", or a hold such as '
                       + ', '.join(f'data-hold="{h}"' for h in sorted(reg.holds())[:4]))
            elif bare != name and bare and self.is_known(kind, bare):
                fix = (f'remove the spaces: {kind}="{bare}" (the engine looks the name up exactly, '
                       f'so "{name}" is unknown there)')
            elif bare != name and not bare:
                fix = (f'an all-whitespace {kind} is not empty: remove the attribute' +
                       (f' (or set it to "") for the engine default ({reg.default_transition})'
                        if kind == 'data-transition-in' else '') + ', or name a registered one')
            elif name in broken.get(attr_word.get(kind), ()):
                fix = alias_fix(attr_word[kind], name) + ' -- as written the registration throws and never happens'
            elif home:                                  # right name, wrong attribute
                noun = {'data-anim': 'preset', 'data-loop': 'loop', 'data-exit': 'exit', 'data-ease': 'ease',
                        'data-transition-in': 'transition'}[home[0]]
                fix = f'"{name}" is a {noun} name: use {home[0]}="{name}" instead' + (
                    ' (data-hold for a whisper-amplitude idle)' if home[0] == 'data-loop' and reg.supports_hold else '')
            # an unknown chain step only drops that step; everything else here visibly breaks
            r.add('warn' if kind == 'data-then' else 'error', 'unknown-name', f'{kind}="{name}" {what} -- {why}', node,
                  slide=slide or None, fix=fix)
        for word, names in broken.items():
            r.add('error', 'unknown-name', f'deck code assigns {word}.{names[0]}' +
                  (f' (+{len(names) - 1} more)' if len(names) > 1 else '') +
                  f' but {word} is not defined -- the <script> throws a ReferenceError there and stops, so the '
                  f'registration never happens (and Storyboard.init, if it comes later in that script, never runs)',
                  snip=f'{word}.{names[0]} = ...', fix=alias_fix(word, names[0]))
        for g, slide in getattr(self, 'stagger_ignored', []):
            if 'data-stagger' in deck_reads:
                continue
            r.add('warn', 'unknown-name', f'data-stagger is not supported by {eng} -- the group\'s children appear '
                  'without an entrance', g, slide=slide or None,
                  fix='rebuild on the current template + storyboard-engine.js, or give each child class="anim" '
                      'with its own data-t-rel')
        for el, slide in getattr(self, 'cameras_ignored', []):
            if 'data-camera' not in deck_reads:
                r.add('warn', 'unknown-name', f'data-camera is not supported by {eng} -- the camera never moves',
                      el, slide=slide or None, fix='rebuild on the current template + storyboard-engine.js')

    def check_assets(self):
        d, r = self.d, self.r
        r.ran('missing-asset')
        refs = []                                   # (ref, node, base_dir, where)
        engine_srcs = {id(n) for n in d.engine_srcs}
        consumed = (self.reg.reads if self.reg.features_known else set(ASSET_DATA_ATTRS)) | js_attr_reads(d.js)
        for n in d.elements:
            if self._in_template(n):
                continue
            t = n.tag
            for attr in ('src', 'poster', 'data', 'href', 'xlink:href', 'srcset'):
                if attr not in n.attrs:
                    continue
                v = n.attrs[attr]
                if attr == 'href' and not (t in ('image', 'use', 'feimage') or
                                           (t == 'link' and re.search(r'stylesheet|preload|modulepreload', n.get('rel', ''), re.I))):
                    continue
                if attr == 'xlink:href' and t not in ('image', 'use', 'feimage'):
                    continue
                if attr == 'data' and t != 'object':
                    continue
                if attr == 'src' and t == 'script' and id(n) in engine_srcs:
                    continue
                if attr == 'src' and n is self.audio_node:
                    continue
                if t == 'source' and n.parent is self.audio_node and self.audio_node is not None:
                    continue
                if attr == 'srcset':
                    for part in v.split(','):
                        p = part.strip().split(' ')[0]
                        if p:
                            refs.append((p, n, None, attr))
                elif t == 'iframe' and attr == 'src':
                    refs.append((v, n, None, attr))
                elif attr != 'src' or t in ('img', 'script', 'video', 'audio', 'source', 'track', 'embed',
                                            'iframe', 'input', 'image'):
                    refs.append((v, n, None, attr))
            for attr, v in n.attrs.items():
                v = (v or '').strip()
                # a data-* value is a file reference only when something reads the attribute (the engine
                # or the deck's own JS) and it is not display text (data-text="index.html", data-url=...)
                if not attr.startswith('data-') or not v or attr in TEXT_DATA_ATTRS or attr not in consumed:
                    continue
                if v.lower().startswith('url('):
                    refs.extend((u, n, None, attr) for u in _css_urls(v))
                elif attr in ASSET_DATA_ATTRS:
                    if '(' not in v and ('.' in v or '/' in v) and not _HOSTLIKE_RE.match(v):
                        refs.append((v, n, None, attr))       # a path, not a lookup key / CSS value
                elif _ASSET_VALUE_RE.fullmatch(v) and '|' not in v and not _HOSTLIKE_RE.match(v):
                    refs.append((v, n, None, attr))
            st = n.get('style')
            if st and 'url(' in st.lower():
                for u in _css_urls(st):
                    refs.append((u, n, None, 'style url()'))
        for node, css in d.styles:                  # @import first: `@import url(x.css)` is one reference
            refs.extend((u, node, None, '<style> @import') for u in _css_imports(css))
            refs.extend((u, node, None, '<style> url()') for u in _css_urls(css))
        for node, p, css in d.linked_css:
            refs.extend((u, node, p.parent, f'{p.name} @import') for u in _css_imports(css))
            refs.extend((u, node, p.parent, f'{p.name} url()') for u in _css_urls(css))
        seen = set()
        for ref, node, base, where in refs:
            if _is_remote(ref):
                continue
            p = d.resolve(ref, base)
            if p is None:
                continue
            prob = d.load_problem(ref, base)
            # one finding per missing file; a path the render cannot load, once per spelling of it
            key = os.path.normcase(os.path.normpath(str(p))) + ('|' + ref.strip() if prob else '')
            if key in seen:
                continue
            seen.add(key)
            try:
                ok = p.exists()
            except OSError:
                ok = False
            slide = (self.slide_for(node) or None) if node is not None else None
            if prob and prob[0] == 'absolute':
                r.add('error', 'missing-asset', f'"{ref}" ({where}) is a local absolute path the render cannot load '
                      f'-- {prob[1]}', node, slide=slide,
                      detail=f'resolved to {p} ({"exists" if ok else "missing"} on disk)',
                      fix='copy the file into the deck folder and reference it relatively (e.g. "assets/'
                          f'{Path(unquote(ref.replace(chr(92), "/"))).name or "file"}")')
            elif prob and ok:                           # works from file:// only (a custom renderer): WARN
                there = prob[2].exists()
                r.add('warn', 'missing-asset',
                      f'"{ref}" ({where}) is outside the deck folder -- {prob[1]}: render_video.py requests '
                      f'{prob[2].relative_to(d.dir).as_posix()} there' + (' (a different file)' if there else ', which does not exist'),
                      node, slide=slide,
                      detail=f'resolved to {p} ({"exists" if ok else "missing"} on disk); only a renderer that opens '
                             'the deck from file:// loads it',
                      fix='copy the file into the deck folder (or a subfolder) and reference it relatively '
                          '(unless this deck is rendered from file:// by its own pipeline)')
            elif not ok:
                r.add('error', 'missing-asset', f'missing local file "{ref}" ({where})', node, slide=slide,
                      detail=f'resolved to {p}',
                      fix='copy the file next to the deck (paths resolve relative to the deck folder) or fix the path')
        r.stats['local_assets_checked'] = len(seen)

    def check_broken_refs(self):
        d, r = self.d, self.r
        r.ran('broken-ref')
        for a in self.anims:
            if a.name == 'motionPath' and a.kind == 'entrance':
                sel = a.el.get('data-path')
                if not sel:
                    r.add('error', 'broken-ref', 'motionPath without data-path -- the element never becomes visible',
                          a.el, slide=a.slide or None, fix='add data-path="#pathId" pointing at an SVG <path>')
                    continue
                m = css_select(d.dom, sel)
                if m is not None and not m:
                    r.add('error', 'broken-ref', f'motionPath data-path="{sel}" matches nothing -- the element never becomes visible',
                          a.el, slide=a.slide or None, fix='point data-path at an existing SVG <path> id')

    def check_audio(self):
        d, r = self.d, self.r
        r.ran('audio')
        seeded = bool(d.words) or self.wt is not None
        r.stats['audio_src'] = self.audio_src
        if self.audio_node is None:
            if self.inline_engine or d.init_found:
                r.add('warn', 'audio', 'no <audio> element -- the deck plays on the silent synthetic clock',
                      fix='add <audio id="voAudio" src="voiceover.mp3" preload="auto"></audio>')
            return
        if not self.audio_src or '{{' in self.audio_src:
            if not self.audio_src:
                r.add('warn', 'audio', '<audio> has no src', self.audio_node,
                      fix='set src="voiceover.mp3" (generate it with elevenlabs_generate.py)')
            return
        if _is_remote(self.audio_src) or self.audio_path is None:
            return
        prob = d.load_problem(self.audio_src)
        if prob and prob[0] == 'absolute':
            r.add('error', 'audio', f'voice-over "{self.audio_src}" is a local absolute path the render cannot load '
                  f'-- {prob[1]}; the video renders silent', self.audio_node,
                  detail=f'resolved to {self.audio_path} ({"exists" if self.audio_path.exists() else "missing"} on disk)',
                  fix='put the MP3 in the deck folder and use a relative src, e.g. <audio id="voAudio" src="voiceover.mp3">')
            return
        if prob and self.audio_path.exists():            # works from file:// only (a custom renderer)
            there = prob[2].is_file()
            r.add('warn', 'audio', f'voice-over "{self.audio_src}" is outside the deck folder -- {prob[1]}: '
                  + (f'render_video.py plays {prob[2].relative_to(d.dir).as_posix()} there instead' if there else
                     'with render_video.py the video renders silent'), self.audio_node,
                  detail=f'resolved to {self.audio_path}; only a renderer that opens the deck from file:// loads it',
                  fix='put the MP3 in the deck folder and use a relative src, e.g. src="voiceover.mp3"')
            return
        if not self.audio_path.exists():
            if seeded:
                r.add('error', 'audio', f'voice-over "{self.audio_src}" is missing but word timestamps are already seeded',
                      self.audio_node, detail=f'resolved to {self.audio_path}',
                      fix='put the generated MP3 next to the deck or fix <audio src> (spaces must be URL-encoded as %20)')
            else:
                r.add('warn', 'audio', f'voice-over "{self.audio_src}" not generated yet -- preview runs silent',
                      self.audio_node, detail=f'resolved to {self.audio_path}',
                      fix='generate the VO (elevenlabs_generate.py) before render; it also seeds TIMINGS + WORDS')

    def _headline(self, slide_node):
        cands = [n for n in slide_node.iter() if n is not slide_node and n.text().strip()]
        for pred in (lambda n: n.tag == 'h1', lambda n: n.tag == 'h2',
                     lambda n: any(re.search(r'title|headline|hero|display', c, re.I) for c in n.classes)
                     and not any(re.search(r'eyebrow|sub|tag|kicker|caption', c, re.I) for c in n.classes),
                     lambda n: n.tag == 'h3'):
            for n in cands:
                if pred(n):
                    return n
        return None

    def check_hook(self):
        r = self.r
        s1 = self.first_slide
        node = self.slide_node.get(s1) if s1 is not None else None
        if node is None:
            r.skip('hook', 'no first slide')
            return
        r.ran('hook')
        # the first cue's slide is on screen from t=0 (the engine shows it before its cue time too),
        # so the hook is measured on the VIDEO clock, not from the slide's cue
        cue = self.cues.get(s1, 0.0)
        late_cue = f' -- TIMINGS[0] cues slide {s1} at {cue:g}s, so its entrances wait until then' if cue > 1e-6 else ''
        cue_fix = 'set the first cue to time 0 (the opening frame is otherwise static) and ' if cue > 1e-6 else ''
        movers = [a for a in self.anims if a.slide in (s1, 0) and a.kind == 'entrance' and a.name not in GRADE_LAYERS]
        early = [a for a in movers if a.start <= HOOK_FIRST_MOTION_S + 1e-6]
        if not early:
            first = min(movers, key=lambda a: a.start) if movers else None
            r.add('warn', 'hook', f'nothing moves in the first {HOOK_FIRST_MOTION_S}s of the video' +
                  (f' (first entrance at {first.start:.2f}s)' if first else ' (no entrances at all)') + late_cue,
                  first.el if first else node, slide=s1,
                  detail='viewers decide to stay in the first second; a static opening frame reads as a slide deck',
                  fix=f'{cue_fix}start one entrance (eyebrow, backdrop kenburns, or the headline) at data-t-rel <= {HOOK_FIRST_MOTION_S}')
        head = self._headline(node)
        if head is not None:
            vis = self.visible_from(head, base=0.0)      # a static headline on the opening slide shows at t=0
            if vis > HOOK_HEADLINE_S + 1e-6:
                r.add('warn', 'hook', f'slide {s1} headline only appears at {vis:.2f}s of the video '
                      f'(hook target <= {HOOK_HEADLINE_S}s)' + late_cue, head, slide=s1,
                      fix=f'{cue_fix}move the headline entrance to data-t-rel <= {max(0.2, HOOK_HEADLINE_S - 0.5):.1f} '
                          '(lead with the promise, decorate after)')

    def _words(self, text):
        return sum(1 for tok in text.split() if re.search(r'[^\W_]', tok))

    def check_text_density(self):
        r = self.r
        limit = MAX_WORDS_VERTICAL if self.vertical else MAX_WORDS_HORIZONTAL
        r.ran('text-density')
        worst = {}
        for num, snode in self.slide_node.items():
            win = self.window.get(num, (self.cues.get(num, 0.0), None))
            s_start, s_end = win[0], (win[1] if win[1] is not None else float('inf'))
            chunks = []                              # (appear, disappear, words, owner)

            def walk(n, appear, disappear):
                if n.tag in NON_RENDERED or n.tag in ('pre', 'code') or n.has('hidden') \
                        or re.search(r'display\s*:\s*none|visibility\s*:\s*hidden', n.get('style', '')) \
                        or {'sr-only', 'visually-hidden'} & set(n.classes):
                    return
                an = self.entrance_of.get(id(n))
                if an is not None:
                    if an.name == 'codeType':
                        return
                    appear = max(appear, an.start)
                x = self.exit_of.get(id(n))
                if x is not None and x.start < disappear:
                    disappear = min(disappear, x.start + x.dur / 2)
                if an is not None and an.name == 'wordSwap':
                    phrases = (n.get('data-words') or n.text()).split('|')
                    wds = max((self._words(p) for p in phrases), default=0)
                    if wds:
                        chunks.append((appear, disappear, wds, n))
                    return
                for c in n.children:
                    if isinstance(c, str):
                        wds = self._words(c)
                        if wds:
                            chunks.append((appear, disappear, wds, n))
                    else:
                        walk(c, appear, disappear)
            walk(snode, s_start, s_end)
            events = []
            for ap, dis, wds, owner in chunks:
                if dis <= ap:
                    continue
                events.append((ap, 1, wds, owner))
                events.append((dis, 0, wds, owner))
            events.sort(key=lambda e: (e[0], e[1]))
            cur, best, best_t = 0, 0, s_start
            for t, kind, wds, owner in events:
                cur += wds if kind == 1 else -wds
                if cur > best:
                    best, best_t = cur, t
            worst[num] = best
            if best > limit:
                head = self._headline(snode) or snode
                r.add('warn', 'text-density', f'{best} words on screen at once at {best_t - s_start:.1f}s into slide {num} '
                      f'(limit {limit} for {"9:16" if self.vertical else "16:9"})', head, slide=num,
                      detail='viewers read OR listen; walls of text make them do neither',
                      fix='cut to the key phrase (the VO carries the detail), split into two beats, '
                          'or cycle lines with data-exit so fewer words share the screen')
        r.stats['max_words_on_screen'] = max(worst.values()) if worst else 0

    def check_captions(self):
        d, r, reg = self.d, self.r, self.reg
        r.ran('captions')
        if not reg.supports_captions:
            st = {'on': False, 'problems': []}
            if self.vertical:
                r.add('warn', 'captions', 'vertical (9:16) deck without captions -- this engine draws no captions '
                      '(most social viewers watch muted)', d.body, detail=f'engine: {reg.engine} v{reg.version or "?"}',
                      fix='rebuild on vertical_template.html + storyboard-engine.js (v0.8 captions), then '
                          '<body data-captions="karaoke"> and seed WORDS')
            else:
                body_ask = d.body is not None and \
                    d.body.get('data-captions', '').strip().lower() not in (CAPTION_OFF_WORDS | {''})
                if body_ask or d.init_opts.get('captions') not in (None, False):
                    r.add('warn', 'captions', 'captions are requested but this engine draws no captions', d.body,
                          detail=f'engine: {reg.engine} v{reg.version or "?"}',
                          fix='load the current storyboard-engine.js (v0.8 captions)')
            r.stats['captions'] = False
            return
        modes = sorted(reg.caption_modes or CONTRACT_CAPTION_MODES)
        st = d.caption_state(modes, reg.caption_positions or CONTRACT_CAPTION_POSITIONS)
        on = st['on']
        r.stats['captions'] = on
        if on:
            r.stats['captions_mode'] = st['mode']
            r.stats['captions_position'] = st['position']
        pick = 'karaoke' if 'karaoke' in modes else modes[0]
        positions = sorted(reg.caption_positions or CONTRACT_CAPTION_POSITIONS)
        for sev, attr, value, msg in st['problems']:
            if attr == 'data-captions-position':
                fix = f'use <body data-captions-position="{positions[0]}"> -- positions: {", ".join(positions)}'
            elif attr == 'captions.position':
                fix = f"use captions: {{position: '{positions[0]}'}} -- positions: {', '.join(positions)}"
            elif value is False or (attr == 'captions' and isinstance(value, str) and
                                    re.fullmatch(r'(?:off|none|false|0|)', value.strip(), re.I)):
                fix = 'fine if intended; otherwise drop captions from Storyboard.init so the body attribute applies'
            else:
                fix = (f'use <body data-captions="{pick}">' if attr == 'data-captions' else
                       f"use captions: '{pick}' (or true / {{mode: '{pick}'}}) in Storyboard.init") + \
                    f' -- modes: {", ".join(modes)}'
            r.add(sev, 'captions', msg, d.body if attr.startswith('data-captions') else None, fix=fix)
        if self.vertical and not on:
            r.add('warn', 'captions', 'vertical (9:16) deck without captions -- most social viewers watch muted',
                  d.body, fix='add <body data-captions="karaoke"> (or captions:{mode:"karaoke"} in Storyboard.init) and seed WORDS')
        if on and not d.words and not isinstance(d.words_raw, _Expr):
            # the engine reads WORDS only (never word_timestamps.json): no WORDS = captions draw nothing
            if self.wt is not None:
                r.add('warn', 'captions', 'captions are enabled but WORDS is empty although word_timestamps.json exists '
                      '-- the captions draw nothing', d.body,
                      fix='seed WORDS from word_timestamps.json (re-run the voice tool with --apply storyboard.html)')
            else:
                r.add('warn', 'captions', 'captions are enabled but no word timestamps exist (WORDS empty, no '
                      'word_timestamps.json)', d.body,
                      fix='generate the VO (tts_free.py / elevenlabs_generate.py --apply) -- it writes '
                          'word_timestamps.json and seeds WORDS')

    def check_overshoot(self):
        r = self.r
        if not self.cues:
            r.skip('overshoot', 'no TIMINGS')
            return
        r.ran('overshoot')
        m = self.margin
        rows = []
        for a in self.anims:
            if a.slide not in self.window or a.name in self.atmosphere or a.dur >= CONTINUOUS_DUR:
                continue
            if a.name == 'lottie' and a.el.get('data-lottie-loop') in ('1', 'true'):
                continue
            start_slide, end = self.window[a.slide]
            if end is None:
                continue
            fin = a.start + a.dur
            label = 'data-then step ' if a.kind == 'chain' else ''
            if a.start >= end:
                r.add('warn', 'overshoot', f'{label}"{a.name}" starts at {a.start:.2f}s, after slide {a.slide} ends '
                      f'({end:.2f}s) -- never seen', a.el, slide=a.slide,
                      fix=self._chain_fix(a, end - m - a.dur) if a.kind == 'chain' else
                      f'start it earlier (data-t-rel <= {max(0.0, end - start_slide - a.dur - m):.2f}) or move it to the next slide')
                rows.append(a)
            elif fin > end - m + 1e-6:
                over = fin - (end - m)
                if a.kind == 'chain':
                    fix = self._chain_fix(a, a.start - over)
                else:
                    fix = (f'set data-dur="{max(0.2, a.dur - over):.2f}"' if a.dur - over >= 0.2 else
                           f'start earlier (data-t-rel="{max(0.0, (a.rel or 0) - over):.2f}")') + \
                        ' or push the next cue later; compress_anim_timings.py rescales a whole slide'
                r.add('warn', 'overshoot', f'{label}"{a.name}" ends at {fin:.2f}s, {over:.2f}s past the safe point '
                      f'(next cue {end:.2f}s - {m:g}s margin)', a.el, slide=a.slide, fix=fix)
                rows.append(a)
        for x in self.exits:
            if x.slide not in self.window:
                continue
            start_slide, end = self.window[x.slide]
            if end is None or x.start >= end:
                continue
            if x.start + x.dur > end - m + 1e-6:
                xe = x.start + x.dur
                state = 'is still running at the cut' if xe > end else f'ends only {end - xe:.2f}s before the cut'
                r.add('warn', 'overshoot', f'exit "{x.name}" {state} (ends {xe:.2f}s, next cue {end:.2f}s, {m:g}s margin)',
                      x.el, slide=x.slide,
                      fix=f'move data-exit-at earlier (<= {max(0.0, end - start_slide - x.dur - m):.2f}) or drop the exit and let the transition clear it')
                rows.append(x)
        r.stats['overshoots'] = len(rows)

    def _chain_fix(self, a, latest_start):
        """Fix text for a data-then step: its length is the preset's own dur (data-dur only times the
        entrance), so the lever is the step's start -- 'name@delay', delay from the entrance start."""
        ent = self.entrance_of.get(id(a.el))
        delay = latest_start - ent.start if ent is not None else None
        tail = ' or push the next cue later'
        if delay is not None and delay >= 0:
            return (f'start the step earlier: data-then="...{a.name}@{delay:.2f}..." (seconds after the entrance '
                    f'starts; the step runs {a.dur:.2f}s, the preset\'s own duration)' + tail)
        return (f'drop "{a.name}" from data-then -- it runs {a.dur:.2f}s (the preset\'s own duration) and cannot '
                'finish before the cut' + tail)

    def check_transitions(self):
        r, reg = self.r, self.reg
        r.ran('transitions')
        showy, breakdown = [], Counter()
        quiet = QUIET_TRANSITIONS | {a for a, target in reg.transition_aliases.items() if target in QUIET_TRANSITIONS}
        for s in self.slides:
            num = self.slide_for(s)
            name = s.get('data-transition-in') or reg.default_transition   # raw, like the engine; "" = default
            breakdown[name] += 1
            if not reg.reads_attr('data-transition-in') or (reg.transitions and name not in reg.transitions):
                continue                                    # reported as unknown-name (a hard cut)
            if num == self.first_slide:
                if name not in quiet:
                    r.add('info', 'transitions', f'slide {num} has data-transition-in="{name}" but the first slide never transitions in',
                          s, slide=num, fix='use data-transition-in="cut" on the opening slide')
                continue
            if name not in quiet:
                showy.append((num, name, s))
        r.stats['transitions'] = {'breakdown': dict(breakdown), 'showy': len(showy)}
        if len(showy) > MAX_SHOWY_TRANSITIONS:
            listing = ', '.join(f'slide {n} ({t})' for n, t, _ in showy)
            r.add('warn', 'transitions', f'{len(showy)} showy transitions (target <= {MAX_SHOWY_TRANSITIONS}); quiet = cut / crossDissolve / fade',
                  showy[MAX_SHOWY_TRANSITIONS][2], slide=showy[MAX_SHOWY_TRANSITIONS][0], detail=listing,
                  fix='keep showy transitions for the 2-3 pivots that earn them (problem->solution, the reveal, the CTA); '
                      'set the rest to data-transition-in="cut" or "crossDissolve"')

    def check_atmosphere(self):
        r = self.r
        if not self.window:
            r.skip('atmosphere', 'no TIMINGS')
            return
        r.ran('atmosphere')
        has = {}
        global_layer = False

        def mark(slide, why):
            if slide == 0:
                return True
            has.setdefault(slide, set()).add(why)
            return False
        for a in self.anims:
            live = a.name in self.atmosphere or a.dur >= CONTINUOUS_DUR or \
                (a.name == 'lottie' and a.el.get('data-lottie-loop') in ('1', 'true'))
            if live:
                global_layer |= mark(a.slide, a.name)
        loops = self.reg.loops
        for el, name, slide in self.loops:
            if name in loops or not loops:                  # an unknown loop never runs
                global_layer |= mark(slide, f'loop:{name}')
        holds = self.reg.holds()
        for el, name, slide in self.holds:
            if name in holds or not loops:                  # shimmer / beat never run as a hold
                global_layer |= mark(slide, f'hold:{name}')
        for el, slide in self.cameras:                      # only cameras whose keyframes actually move
            global_layer |= mark(slide, 'camera')
        long_beats, missing = 0, []
        for num in self.slide_nums:
            start, end = self.window.get(num, (None, None))
            if start is None or end is None:
                continue
            dur = end - start
            if dur <= LONG_BEAT_S:
                continue
            long_beats += 1
            if not global_layer and not has.get(num):
                missing.append((num, dur))
        r.stats['long_beats'] = long_beats
        r.stats['long_beats_without_atmosphere'] = len(missing)
        for num, dur in missing:
            r.add('warn', 'atmosphere', f'slide {num} holds {dur:.1f}s with no ambient motion (reads as frozen)',
                  self.slide_node.get(num), slide=num,
                  fix='add one living layer: data-hold="breathe" on the hero, a kenburns/parallax/aurora/particles '
                      'backdrop, a <div class="camera" data-camera="6=>scale:1.08"> push-in, or a deck-wide filmGrain')

    def check_signature(self):
        r = self.r
        r.ran('signature')
        cands = (SIGNATURE_PRESETS | self.reg.emphasis()) & (set(self.reg.presets) or SIGNATURE_PRESETS)
        beats, uses, first = {}, Counter(), {}
        for a in self.anims:
            if a.name in cands:
                beats.setdefault(a.name, set()).add(a.slide)
                uses[a.name] += 1
                first.setdefault(a.name, a.el.idx)
        if not uses:
            r.add('warn', 'signature', 'no signature emphasis move (spring / anticipate / overshoot / letterSpring / lineReveal / wordSwap ...)',
                  fix='pick ONE emphasis preset and reuse it on your 3 biggest moments (the reveal, the proof, the CTA)')
            return
        top = sorted(uses, key=lambda n: (-len(beats[n]), -uses[n], first[n], n))[0]
        nb = len(beats[top])
        r.stats['signature'] = {'preset': top, 'beats': nb, 'uses': uses[top]}
        if nb < SIGNATURE_MIN_BEATS:
            r.add('warn', 'signature', f'signature move "{top}" lands on only {nb} beat(s) (target >= {SIGNATURE_MIN_BEATS})',
                  detail='emphasis presets in use: ' + ', '.join(f'{n} x{uses[n]} ({len(beats[n])} beat(s))'
                                                                  for n in sorted(uses, key=lambda n: -uses[n])),
                  fix=f'reuse data-anim="{top}" on {SIGNATURE_MIN_BEATS - nb} more key beat(s) so viewers learn "this motion = this matters"')

    def check_diversity(self):
        r = self.r
        r.ran('diversity')
        distinct = sorted({a.name for a in self.anims if a.name in self.reg.presets})
        r.stats['preset_distinct'] = len(distinct)
        if len(distinct) < MIN_DISTINCT_PRESETS:
            r.add('warn', 'diversity', f'only {len(distinct)} distinct presets (target >= {MIN_DISTINCT_PRESETS})',
                  detail=f'used: {distinct}',
                  fix='vary by intent: an emphasis entrance on the hero (spring/anticipate), kinetic type (lineReveal/wordReveal), '
                      'an annotation on the key word (underlineDraw/circleScribble), a data-viz draw (barGrow/lineDraw)')

    def check_monotony(self):
        r = self.r
        ents = [a for a in self.anims if a.kind == 'entrance' and a.name not in self.ambient]
        if len(ents) < MONOTONY_MIN_ENTRANCES:
            r.skip('monotony', f'fewer than {MONOTONY_MIN_ENTRANCES} entrances')
            return
        r.ran('monotony')
        name, n = Counter(a.name for a in ents).most_common(1)[0]
        share = n / len(ents)
        if share > MONOTONY_SHARE:
            ex = next(a for a in ents if a.name == name)
            pct = f'{share:.0%}' if round(share * 100) > MONOTONY_SHARE * 100 else f'{share:.1%}'   # 40.4%, not "40%"
            r.add('warn', 'monotony', f'{pct} of entrances ({n}/{len(ents)}) use "{name}" (limit {MONOTONY_SHARE:.0%})',
                  ex.el, slide=ex.slide or None,
                  fix=f'keep "{name}" for context elements; give each beat\'s focal element a different, intent-driven entrance')

    def check_breath(self):
        r = self.r
        nums = [n for n in self.slide_nums if n in self.cues] or self.slide_nums
        if len(nums) < 3:
            r.skip('breath', 'fewer than 3 slides')
            return
        r.ran('breath')
        per = Counter(a.slide for a in self.anims if a.kind == 'entrance' and a.name not in self.ambient)
        quiet = [n for n in nums if per.get(n, 0) <= 2]
        r.stats['breath_slides'] = quiet
        if not quiet:
            r.add('warn', 'breath', 'every beat has 3+ entrances -- the deck never breathes',
                  fix='make one valley beat (a quote, the proof, a section pivot) with <= 2 quiet entrances and a data-hold; '
                      'the contrast makes the peaks land')

    def check_stacking(self):
        r = self.r
        r.ran('stacking')
        # the engine's own emphasis / fun classification (EMPHASIS_PRESETS / FUN_PRESETS / {emphasis:true})
        # plus attention-seeking annotation presets it does not classify (glow, pulse, highlight ...)
        presets = set(self.reg.presets)
        attention = (ATTENTION_PRESETS | self.reg.emphasis() | self.reg.fun()) & (presets or ATTENTION_PRESETS)
        per = {}
        for a in self.anims:
            if a.name in attention:
                per.setdefault(id(a.el), (a.el, a.slide, set()))[2].add(a.name)
        for el, name, slide in self.loops:
            if name in ATTENTION_LOOPS and (name in self.reg.loops or not self.reg.loops):
                per.setdefault(id(el), (el, slide, set()))[2].add(f'loop:{name}')
        for h, sel, nodes in self.hit_targets:
            hit = h.get('hit') if isinstance(h.get('hit'), str) else 'pulse'
            if presets and hit not in presets:
                hit = 'pulse'                               # the engine falls back to pulse
            if hit in attention:
                for n in nodes or []:
                    per.setdefault(id(n), (n, self.slide_for(n), set()))[2].add(f'hit:{hit}')
        for el, slide, names in per.values():
            if len(names) >= 3:
                r.add('warn', 'stacking', f'one element stacks {len(names)} emphasis effects: {", ".join(sorted(names))}',
                      el, slide=slide or None,
                      fix='keep ONE accent per element (entrance OR loop OR word hit); stacking reads as noise, not emphasis')

    def check_counters(self):
        r = self.r
        r.ran('counter-dur')
        for a in self.anims:
            # count-UP presets only: a real-time countdown (4-3-2-1 over 4s) is deliberately slow
            if re.fullmatch(r'count(er|up|to)', a.name, re.I) and a.dur > MAX_COUNTER_DUR:
                r.add('warn', 'counter-dur', f'counter runs {a.dur:.1f}s (> {MAX_COUNTER_DUR}s reads as a loading bar)',
                      a.el, slide=a.slide or None, fix='set data-dur="1.8" (1.4-2.0s lands a number)')

    def check_word_hits(self):
        d, r = self.d, self.r
        hits = d.word_hits
        r.ran('word-hits')
        if not hits:
            return
        dur = self.duration
        if dur:
            rate = len(hits) / (dur / 60.0)
            r.stats['word_hits_per_min'] = round(rate, 2)
            if rate > MAX_HITS_PER_MIN + 1e-9:
                r.add('warn', 'word-hits', f'{len(hits)} WORD_HITS in {dur:.0f}s = {rate:.1f}/min (target <= {MAX_HITS_PER_MIN:g}/min)',
                      fix=f'keep the ~{max(1, int(MAX_HITS_PER_MIN * dur / 60))} hits on the words that carry the argument; drop the rest')
        names = set(self.reg.presets)
        for k, (h, sel, nodes) in enumerate(self.hit_targets):
            t = js_float(h.get('time')) if not isinstance(h.get('time'), _Expr) else None
            hit = h.get('hit')
            if t is None or not sel:
                r.add('warn', 'word-hits', f'WORD_HITS[{k}] needs {{time, sel, hit}}: {h!r}'[:160],
                      fix="e.g. {time: 12.4, sel: '#kpi', hit: 'pulse'}")
                continue
            if isinstance(hit, str) and names and hit not in names:
                r.add('warn', 'word-hits', f'WORD_HITS[{k}] hit="{hit}" is not a preset (falls back to pulse)',
                      fix=_did_you_mean(hit, names, 'hit'))
            if nodes is not None and not nodes:
                r.add('warn', 'word-hits', f'WORD_HITS[{k}] selector "{sel}" matches nothing -- the hit is silent',
                      fix='point sel at an element id/class that exists on the slide shown at that time')
            elif nodes and dur and (t < 0 or t > dur):
                r.add('warn', 'word-hits', f'WORD_HITS[{k}] at {t:g}s is outside the video (0-{dur:.1f}s)',
                      fix='re-derive hit times from word_timestamps.json')

    def check_fonts(self):
        d, r = self.d, self.r
        r.ran('fonts')
        # css_sources: <style> blocks + linked files + local @imports, all with comments blanked
        loaded, opaque, remote_css = set(), [], []
        css_sources = [t for _, t in d.styles] + [t for _, _, t in d.linked_css]
        for css in css_sources:
            for m in re.finditer(r'@font-face\s*\{([^}]*)\}', css, re.I):
                fm = re.search(r'font-family\s*:\s*([^;]+)', m.group(1), re.I)
                if fm:
                    loaded.add(fm.group(1).strip().strip('\'"').lower())
        sheets = [n.get('href', '') for n in d.elements if n.tag == 'link'
                  and re.search(r'stylesheet|preload', n.get('rel', ''), re.I)] + \
            [u for css in css_sources for u in _css_imports(css)]
        for n in d.script_srcs:                     # JS font kits (Typekit.load, fonts.com)
            host = (_urlsplit_safe(n.get('src', '')) or urlsplit('')).hostname or ''
            if any(host.lower().endswith(p) for p in FONT_PROVIDERS_OPAQUE):
                opaque.append(host.lower())
        for u in sheets:
            parts = _urlsplit_safe(u)
            if parts is None:
                continue
            host = (parts.hostname or '').lower()
            if not host:
                continue                            # local CSS: already read (d.linked_css)
            if any(host.endswith(p) for p in FONT_PROVIDERS_FAMILY_QS):
                for fam in parse_qs(parts.query).get('family', []):
                    for one in fam.split('|'):
                        loaded.add(one.split(':')[0].strip().lower())
            elif any(host.endswith(p) for p in FONT_PROVIDERS_OPAQUE):
                opaque.append(host)
            elif parts.scheme in ('http', 'https'):
                remote_css.append((u, host))        # rsms.me/inter/inter.css, cdnjs font-awesome, fontsource ...
        for m in re.finditer(r'new\s+FontFace\(\s*[\'"]([^\'"]+)[\'"]', d.js):
            loaded.add(m.group(1).strip().lower())
        remote_slugs = [(re.sub(r'[^a-z0-9]', '', unquote(u).lower()), u, host) for u, host in remote_css]
        decls = []                                  # (stack text, node, snippet)
        for css in css_sources:
            clean = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
            clean = re.sub(r'@font-face\s*\{[^}]*\}', '', clean, flags=re.I)
            for m in re.finditer(r'(?<![-\w])(font-family|font|--[\w-]*font[\w-]*)\s*:\s*([^;{}]+)', clean, re.I):
                decls.append((m.group(1).lower(), m.group(2), None, m.group(0).strip()))
        for n in d.elements:
            st = n.get('style')
            if st and 'font' in st:
                for m in re.finditer(r'(?<![-\w])(font-family|font|--[\w-]*font[\w-]*)\s*:\s*([^;]+)', st, re.I):
                    decls.append((m.group(1).lower(), m.group(2), n, m.group(0).strip()))
        stacks = []                                 # (primary, fams, node, decl) of every family stack
        for prop, value, node, decl in decls:
            value = value.strip()
            if prop == 'font':
                # function values (clamp(3rem, 6vw, 7rem) / var(--x)) hide commas: fold them to one token
                flat = value
                for _ in range(4):
                    flat = re.sub(r'[\w-]+\([^()]*\)', '1px', flat)
                m = re.search(r'(?:^|\s)(?:\d*\.?\d+(?:px|pt|pc|em|rem|%|vw|vh|vmin|vmax|ex|ch|cap|lh)|xx-small|x-small|'
                              r'small|medium|large|x-large|xx-large|smaller|larger)(?:\s*/\s*[^\s,]+)?\s+(.+)$', flat)
                if not m:
                    continue
                value = m.group(1)
            elif prop.startswith('--'):
                # a font-FAMILY token (--font-display, --caption-font) -- not --font-size-hero / --font-features
                if _FONT_TOKEN_NOT_FAMILY.search(prop) or '(' in re.sub(r'var\([^()]*\)', '', value):
                    continue
                if not re.search(r'[\'"]|,|\b(serif|sans-serif|monospace)\b', value):
                    continue                       # e.g. --font-xl: 48px
            # '"Inter" !important' -- drop the flag BEFORE unquoting, or the family reads 'Inter"'
            value = re.sub(r'\s*!\s*important\s*$', '', value, flags=re.I)
            fams = [f.strip().strip('\'"').strip() for f in re.split(r',(?=(?:[^\'"]*[\'"][^\'"]*[\'"])*[^\'"]*$)', value)]
            fams = [f for f in fams if f and not f.startswith('var(')]
            if not fams:
                continue
            if prop.startswith('--') and all(re.fullmatch(r'[a-z0-9]{4}(?:\s+\d+|\s+on|\s+off)?', f) for f in fams):
                continue                           # OpenType feature tags ("ss01", "cv11")
            stacks.append((fams[0], fams, node, decl))
        # remote CSS whose URL names a family the deck uses is that family's kit (rsms.me/inter/inter.css,
        # .../font-awesome/...); other remote CSS that looks like a font kit may define anything
        kit_of = {}
        for primary, fams, _, _ in stacks:
            for f in fams:
                slugs = _font_slugs(f)
                hit = next(((u, host) for us, u, host in remote_slugs if any(s in us for s in slugs)), None)
                if hit:
                    kit_of[f.lower()] = hit
        explained = {u for u, _ in kit_of.values()}
        opaque += [host for u, host in remote_css if 'font' in u.lower() and u not in explained]
        # system families are per OS: the local Chromium that renders the video only has this machine's
        plat = self.platform
        here, where = PLATFORM_FONTS[plat], PLATFORM_LABEL[plat]

        def usable(fam):
            fl = fam.lower()
            return fl in loaded or fl in kit_of or (fl in here and fl not in HIDDEN_FONTS)
        reported, unverified = set(), []
        for primary, fams, node, decl in stacks:
            low = primary.lower()
            if low in GENERIC_FONTS or low in loaded or low in reported or '{{' in primary:
                continue
            if low in here and low not in HIDDEN_FONTS:
                continue
            if re.match(r'^[\d.+-]', low) or '(' in low or ')' in low:
                continue                           # a number / function fragment, not a family name
            reported.add(low)
            slide = (self.slide_for(node) or None) if node else None
            if low in kit_of:                       # e.g. "Inter var" from rsms.me/inter/inter.css
                unverified.append(f'{primary} ({kit_of[low][1]})')
                continue
            if opaque:                              # a font kit the audit cannot read may define it
                r.add('info', 'fonts', f'font "{primary}" is not declared by any @font-face / font link the audit can '
                      f'read -- assuming it comes from {sorted(set(opaque))[0]} (cannot be verified statically)',
                      node, slide=slide, snip=decl[:150],
                      fix='check the render: if the text falls back, add the family to that kit or load it from '
                          'Google Fonts / a local @font-face')
                continue
            nxt = next((f for f in fams[1:] if usable(f)), None)
            generic = next((f for f in fams[1:] if f.lower() in GENERIC_FONTS), None)
            fallback = nxt or generic or 'the browser default'
            elsewhere = [PLATFORM_LABEL[p] for p, fonts in PLATFORM_FONTS.items() if p != plat and low in fonts]
            hidden = low in HIDDEN_FONTS
            if hidden:
                why = (f'"{primary}" is Apple\'s hidden system font -- no OS resolves it by name (not even macOS), '
                       'so without an @font-face it never loads')
            elif elsewhere:
                why = (f'"{primary}" is a {" / ".join(elsewhere)} system font -- Chromium on {where} (the machine that '
                       'renders the video) does not have it')
            else:
                why = f'font "{primary}" is not loaded (no @font-face, font link or system font)'
            standin = FONT_STANDINS.get(low)
            if nxt and low in NATIVE_STACK_FONTS:   # 'Segoe UI', Roboto, Helvetica ...: a per-OS native stack
                r.add('info', 'fonts', f'{why}; this native font stack renders in {nxt} on {where}', node,
                      slide=slide, snip=decl[:150],
                      fix='fine for a system-UI stack; if the exact face matters, load a webfont' +
                          (f' ({standin} from Google Fonts is the usual stand-in)' if standin else ''))
                continue

            def gf_link(fam):
                return (f'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={fam.replace(" ", "+")}'
                        ':wght@400;700;800&display=swap"> in <head>')
            if standin and standin.lower() == low:  # Roboto / Ubuntu: the same family is on Google Fonts
                fix = f'load it as a webfont: add {gf_link(primary)}'
            elif hidden or elsewhere:
                fix = (f'load a look-alike webfont: add {gf_link(standin)} and put "{standin}" first in the stack'
                       if standin else
                       f'load it as a webfont (an @font-face with a licensed .woff2 next to the deck), or pick a '
                       'Google Fonts family')
                if hidden:
                    fix += ' (for the native Apple UI font on a Mac-only render, use -apple-system, BlinkMacSystemFont)'
            else:
                fix = f'add {gf_link(primary)} (or an @font-face with a local file next to the deck)'
            r.add('warn', 'fonts', f'{why} -- the render falls back to {fallback}', node, slide=slide,
                  snip=decl[:150], fix=fix)
        r.stats['fonts_loaded'] = sorted(loaded)
        r.stats['render_platform'] = plat
        if unverified:
            r.stats['fonts_from_remote_css'] = unverified

    def check_unscheduled(self):
        d, r = self.d, self.r
        r.ran('unscheduled')
        for n in d.elements:
            if self._in_template(n):
                continue
            if n.has('data-anim') and 'anim' not in n.classes and id(n) not in self.group_children and \
                    not ('anim-group' in n.classes and n.has('data-stagger')):
                r.add('warn', 'unscheduled', f'data-anim="{n.get("data-anim")}" is ignored: the element has no class="anim"',
                      n, slide=self.slide_for(n) or None, fix='add class="anim" (the engine only schedules .anim elements)')
            if 'anim-group' in n.classes and not n.has('data-stagger'):
                # the engine only cascades .anim-group[data-stagger]; children that are .anim themselves
                # are scheduled normally, the others just sit there
                static = [c for c in n.elements() if 'anim' not in c.classes]
                if static:
                    one = len(static) == 1
                    r.add('info' if 'anim' in n.classes else 'warn', 'unscheduled',
                          f'.anim-group without data-stagger -- {len(static)} of its {len(n.elements())} '
                          f'children {"has" if one else "have"} no class="anim" and never '
                          + ('animate' + ('s' if one else '') + ' on ' + ('its' if one else 'their') +
                             ' own (moving with the group)' if 'anim' in n.classes else 'animate' + ('s' if one else '')),
                          n, slide=self.slide_for(n) or None,
                          fix='add data-stagger="0.12" to cascade them (or make each child class="anim")')

    def check_words(self):
        """WORDS drive captions + lip-sync: [{text, start, end}] in seconds, in spoken order."""
        d, r = self.d, self.r
        if not isinstance(d.words_raw, list) or not d.words_raw:
            r.skip('words', 'WORDS is empty (no VO word timestamps seeded yet)' if isinstance(d.words_raw, list) else
                   'WORDS is computed at runtime' if isinstance(d.words_raw, _Expr) else 'no WORDS const')
            return
        r.ran('words')
        bad, prev = [], None
        for k, w in enumerate(d.words_raw):
            s = js_float(w.get('start')) if isinstance(w, dict) and not isinstance(w.get('start'), _Expr) else None
            e = js_float(w.get('end')) if isinstance(w, dict) and not isinstance(w.get('end'), _Expr) else None
            if not isinstance(w, dict) or not isinstance(w.get('text'), str) or s is None or e is None:
                bad.append((k, f'WORDS[{k}] is not {{text, start, end}}: {w!r}'[:120]))
            elif e + 1e-6 < s:
                bad.append((k, f'WORDS[{k}] "{w["text"]}" ends ({e:g}s) before it starts ({s:g}s)'))
            elif prev is not None and s + 0.05 < prev:
                bad.append((k, f'WORDS[{k}] "{w["text"]}" starts at {s:g}s, before the previous word ({prev:g}s)'))
            if s is not None:
                prev = s if prev is None else max(prev, s)
        if bad:
            r.add('warn', 'words', f'{len(bad)} malformed / out-of-order WORDS entr{"y" if len(bad) == 1 else "ies"}: {bad[0][1]}',
                  detail='captions and lip-sync read WORDS in order; bad entries are skipped or shown at the wrong time',
                  fix='re-seed WORDS from word_timestamps.json (the voice tools write it next to the MP3)')

    def check_sfx(self):
        """const SFX = [{t, name|file, gain_db}] deck overrides: names from assets/sfx/manifest.json, files local."""
        d, r = self.d, self.r
        raw, found = d.find_const('SFX')
        if not found or d.sfx_off:
            r.skip('sfx', 'SFX disabled (data-sfx="off")' if d.sfx_off else 'no const SFX')
            return
        r.ran('sfx')
        if not isinstance(raw, list):
            return
        try:
            manifest = json.loads((SKILL_DIR / 'assets' / 'sfx' / 'manifest.json').read_text(encoding='utf-8'))
            names = set(manifest) if isinstance(manifest, dict) else set()
        except (OSError, ValueError):
            names = set()
        for k, cue in enumerate(raw):
            t = js_float(cue.get('t', cue.get('time'))) if isinstance(cue, dict) else None
            name, file = (cue.get('name'), cue.get('file')) if isinstance(cue, dict) else (None, None)
            if t is None or not (isinstance(name, str) or isinstance(file, str)):
                r.add('warn', 'sfx', f'SFX[{k}] needs {{t, name|file}}: {cue!r}'[:150], fix="e.g. {t: 12.4, name: 'pop'}")
                continue
            if isinstance(name, str) and names and name not in names:
                r.add('warn', 'sfx', f'SFX[{k}] name "{name}" is not in the SFX library -- it will not play',
                      fix=_did_you_mean(name, names, 'name'))
            if isinstance(file, str) and not _is_remote(file):
                # the renderer mixes SFX in Python, so an absolute disk path is fine here (unlike in the page)
                p = Path(file) if Path(file).is_absolute() else d.resolve(file)
                if p is not None and not p.is_file():
                    r.add('warn', 'sfx', f'SFX[{k}] file "{file}" is missing -- it will not play',
                          detail=f'resolved to {p}', fix='put the file next to the deck or use a library name')
            if self.duration and not (0 <= t <= self.duration):
                r.add('warn', 'sfx', f'SFX[{k}] at {t:g}s is outside the video (0-{self.duration:.1f}s)',
                      fix='SFX times are absolute seconds on the VO clock')

    def check_attr_values(self):
        r = self.r
        r.ran('attr-values')
        seen = set()
        effect = {'data-t': 'the entrance starts at the slide cue', 'data-t-rel': 'the entrance starts at the slide cue',
                  'data-dur': "the preset's default duration is used", 'data-exit-at': 'the exit never runs',
                  'data-exit-t': 'the exit never runs'}
        for node, attr, val in self.bad_numbers:
            if (id(node), attr) in seen:
                continue
            seen.add((id(node), attr))
            r.add('warn', 'attr-values', f'{attr}="{val}" is not a finite number -- the engine ignores it '
                  f'({effect.get(attr, "its default is used")})',
                  node, slide=self.slide_for(node) or None, fix=f'use seconds, e.g. {attr}="1.2"')
        for el in getattr(self, 'bad_cameras', []):
            r.add('warn', 'attr-values', f'data-camera="{el.get("data-camera")}" has no keyframe the engine can parse '
                  '-- the camera never moves', el, slide=self.slide_for(el) or None,
                  fix='keyframes are "seconds=>prop:value,...; ..." relative to the slide cue, '
                      'e.g. data-camera="0=>scale:1; 6=>scale:1.08,x:-30"')

    def check_placeholders(self):
        d, r = self.d, self.r
        found = Counter(_PLACEHOLDER_RE.findall(d.text))
        r.ran('placeholders')
        r.stats['placeholders'] = sum(found.values())
        if found:
            names = ', '.join(sorted(found)[:8]) + (', ...' if len(found) > 8 else '')
            r.add('info' if self.allow_placeholders else 'warn', 'placeholders',
                  f'{sum(found.values())} unfilled template placeholder(s): {names}',
                  fix='replace every {{PLACEHOLDER}} with real copy / paths before rendering (they render literally)')


# =============================================================================
# CLI
# =============================================================================
def audit(path, margin=DEFAULT_MARGIN, engine=None, use_node=True, use_cache=True, allow_placeholders=False,
          platform=None):
    """Programmatic entry point: returns an AuditReport (see .exit_code / .to_dict() / .render()).
    platform: 'windows' | 'mac' | 'linux' -- the OS that renders the video (default: this machine)."""
    return Auditor(path, margin, engine, use_node, use_cache, allow_placeholders, platform).run()


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('html', nargs='?', help='path to storyboard.html (or any deck / adopted page)')
    ap.add_argument('--write', action='store_true', help='also write audit.md next to the deck')
    ap.add_argument('--json', action='store_true', help='print the machine-readable report instead of text')
    ap.add_argument('--margin', type=float, default=DEFAULT_MARGIN,
                    help=f'seconds an animation must finish before the next cue (default {DEFAULT_MARGIN})')
    ap.add_argument('--engine', help='engine file to read registries from (default: the one the deck loads)')
    ap.add_argument('--no-node', action='store_true', help='skip node; parse the engine source instead')
    ap.add_argument('--no-cache', action='store_true', help='ignore the per-engine-hash registry cache')
    ap.add_argument('--allow-placeholders', action='store_true',
                    help='report {{PLACEHOLDER}} tokens as info (for auditing templates themselves)')
    ap.add_argument('--registry', action='store_true', help='print the engine registry (JSON) and exit')
    ap.add_argument('--platform', choices=sorted(PLATFORM_FONTS),
                    help='OS whose Chromium renders the video, for the system-font check (default: this machine)')
    args = ap.parse_args(argv)
    try:
        sys.stdout.reconfigure(errors='replace')
    except (AttributeError, ValueError):
        pass
    if not args.html and not args.registry:
        ap.error('the deck path is required (or use --registry alone to print the engine registry)')
    path = Path(args.html or '')
    if args.registry and not (args.html and path.is_file()):
        reg = load_registry(args.engine or SKILL_ENGINE, use_node=not args.no_node, use_cache=not args.no_cache)
        print(json.dumps(reg.to_dict(), indent=2))
        return 0
    if not path.is_file():
        print(f'audit_deck: not found: {path}', file=sys.stderr)
        return 2
    if args.margin < 0:
        print('audit_deck: --margin must be >= 0', file=sys.stderr)
        return 2
    try:
        report = audit(path, args.margin, args.engine, not args.no_node, not args.no_cache, args.allow_placeholders,
                       args.platform)
    except Exception:                                # fail closed: a gate must never read a crash as "warnings only"
        import traceback
        traceback.print_exc()
        print('audit_deck: internal error -- the deck could not be audited (exit 2)', file=sys.stderr)
        return 2
    if args.registry:
        print(json.dumps(report.registry.to_dict(), indent=2))
        return 0
    if args.json:
        print(json.dumps(report.to_dict(), indent=2, default=str))
    else:
        print(_console_safe(report.render()), end='')
    if args.write:
        out = path.parent / 'audit.md'
        out.write_text(report.render(markdown=True), encoding='utf-8')
        print(_console_safe(f'[ok] wrote {out}'), file=sys.stderr if args.json else sys.stdout)
    return report.exit_code


_ASCII_FOLD = str.maketrans({'—': '--', '–': '-', '‘': "'", '’': "'", '“': '"',
                             '”': '"', '…': '...', '→': '->', '←': '<-', ' ': ' ',
                             '•': '*', '×': 'x', '−': '-'})


def _console_safe(text):
    """The text report as-is on a UTF-8 stdout; otherwise pure ASCII. A Windows pipe defaults to
    cp1252: a UTF-8 reader (Claude Code) would see replacement chars, and a caller decoding the
    output strictly could crash on non-ASCII. audit.md and --json always keep full fidelity."""
    enc = (getattr(sys.stdout, 'encoding', None) or '').lower().replace('-', '').replace('_', '')
    if enc in ('utf8', 'utf8sig'):
        return text
    import unicodedata
    folded = unicodedata.normalize('NFKD', text.translate(_ASCII_FOLD))
    folded = ''.join(c for c in folded if not unicodedata.combining(c))
    return folded.encode('ascii', 'replace').decode('ascii')


if __name__ == '__main__':
    sys.exit(main())

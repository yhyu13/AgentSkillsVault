#!/usr/bin/env python
"""
tts_free.py
Zero-config, no-API-key voice-over for a storyboard. Uses Microsoft Edge's
free online neural "read aloud" voices (via the edge-tts package), renders
each beat separately, and joins the beats with exact silences — so every
slide cue is known to the sample, no silence detection needed.

Pipeline:
  script.md  (```json {"beats":[...]} block — or the SSML block, split on
       |      <break> tags >= 0.6s — or --text beats.txt, blank-line separated)
       v
  edge-tts, one request per beat (audio + WordBoundary events)
       |
       v
  ffmpeg (imageio-ffmpeg): decode -> trim edge silence -> concat with exact
  pauses -> encode MP3 192k
       |
       +-->  voiceover.mp3           (next to script.md, or --out DIR)
       +-->  word_timestamps.json    (source "edge-tts": words, cues, duration)
       +-->  TIMINGS + WORDS rewritten in the deck   (--apply storyboard.html)

Requires:
  python -m pip install edge-tts imageio-ffmpeg
  Network access to Microsoft's speech service (no account, no key).

Usage:
  python tts_free.py script.md
  python tts_free.py script.md --out ./deck --apply ./deck/storyboard.html
  python tts_free.py --text beats.txt --out ./deck
  python tts_free.py script.md --voice en-GB-RyanNeural --rate -5%
  python tts_free.py script.md --voice ava          (recommended narrators by first name)
  python tts_free.py script.md --dry-run            (show parsed beats only)
  python tts_free.py --list-voices                  (recommended + all English)
  python tts_free.py --list-voices en-GB male       (filter words: locale/name/gender)
  python tts_free.py --measure-wpm                  (real speaking rate check)

Defaults:
  Voice   : en-US-AndrewMultilingualNeural (warm, confident narrator)
  Rate    : +0%    (a change: -5%, +10%, -5 ... or a speed multiplier like 0.95;
                    an unsigned '95%' is refused as ambiguous)
  Pitch   : +0Hz
  Lead-in : 0.25s of silence before beat 1
  Pause   : 0.7s after a beat with no pause_after
  Tail    : 1.0s of silence after the last beat (its pause_after, if longer)
  Output  : voiceover.mp3, 48 kHz mono, 192 kbps (--mp3-name must end in .mp3;
            no extension -> .mp3 is appended)

How cues are computed:
  Each beat is synthesized on its own, its leading/trailing silence is
  trimmed to a short pad (0.05s head / 0.08s tail; --no-trim keeps it), and
  the beats are concatenated with digital silence of exactly pause_after.
  cue(slide n) = the start offset of beat n's segment in voiceover.mp3.
  TIMINGS[0] is always 0.0 (slide 1 is on screen during the lead-in).
  A <break> inside a beat after sentence/clause punctuation (. ! ? ; :), or
  one >= 0.6s, splits the beat into two requests joined by exactly that much
  silence. A shorter break mid-sentence becomes a hesitation instead
  ('is <break time="0.4s"/> you' -> 'is... you'), since each request is
  intonated as a finished sentence.
  Word times come from edge-tts WordBoundary events (100-ns ticks),
  corrected for the MP3 codec delay and shifted to absolute time.
"""
import argparse
import asyncio
import hashlib
import html as html_lib
import inspect
import json
import os
import random
import re
import shutil
import subprocess
import sys
from array import array
from pathlib import Path

DEFAULT_VOICE = 'en-US-AndrewMultilingualNeural'
RECOMMENDED_VOICES = [
    ('en-US-AndrewMultilingualNeural', 'Male',   'warm, confident narrator (default)'),
    ('en-US-AvaMultilingualNeural',    'Female', 'expressive, caring, friendly'),
    ('en-US-BrianMultilingualNeural',  'Male',   'casual, approachable, sincere'),
    ('en-US-EmmaMultilingualNeural',   'Female', 'cheerful, clear, conversational'),
    ('en-GB-RyanNeural',               'Male',   'British, documentary'),
    ('en-GB-SoniaNeural',              'Female', 'British, polished'),
    ('en-US-ChristopherNeural',        'Male',   'authoritative, news read'),
    ('en-US-AriaNeural',               'Female', 'confident, news read'),
    ('en-AU-WilliamMultilingualNeural', 'Male',  'Australian, friendly'),
]

MP3_NAME = 'voiceover.mp3'
TIMESTAMPS_NAME = 'word_timestamps.json'
BEAT_BREAK_MIN = 0.6        # SSML <break> >= this splits beats (shorter = pause inside a beat)
DEFAULT_PAUSE = 0.7         # pause_after when a beat doesn't specify one
LEAD_IN = 0.25
TAIL = 1.0
SAMPLE_RATE = 48000
BITRATE = '192k'
PAD_HEAD = 0.05             # silence kept before speech onset when trimming a segment
PAD_TAIL = 0.08             # silence kept after the last audible sample
SILENCE_DBFS = -50.0        # below this (5 ms RMS window) counts as silence
FADE_SEC = 0.004            # tiny fade at trimmed segment edges (click guard)
TICKS_PER_SECOND = 10_000_000   # edge-tts offsets/durations are 100-ns units
# Edge streams LAME-encoded 24 kHz MP3 with no Xing/LAME info header, so a
# decoder can't strip the codec delay: decoded audio lags the service's word
# offsets by 576 (encoder) + 529 (decoder) samples at 24 kHz = 46 ms.
EDGE_CODEC_DELAY = 1105 / 24000
RETRIES = 4
BACKOFF_BASE = 1.0          # seconds; retry n waits BACKOFF_BASE * 2**n (+ jitter)
JOBS = 4
# Measured with --measure-wpm (2026-09-29, 128-word paragraph, sentence pauses included):
# en-US-AndrewMultilingualNeural 179.9 wpm at +0%, 169.6 at -5%; Ava 181.2 / 174.1; en-GB-Ryan 172.8 / 164.2.
EST_WPM = 180
CACHE_DIR = '.tts_cache'

# ~120-word neutral narration paragraph used by --measure-wpm.
WPM_PARAGRAPH = (
    "Every day, millions of people make small decisions that quietly add up to "
    "something much larger. They choose a route to work, a place to eat, and a "
    "way to spend the last hour before bed. None of these choices feels "
    "important on its own. But together, they shape our cities, our habits, and "
    "the businesses that serve us. This is the hidden pattern behind almost "
    "every successful product. It does not ask people to change who they are. "
    "Instead, it fits neatly into the moments they already have. When you "
    "understand those moments, you can design something that feels obvious in "
    "hindsight. That is the real goal of good design. It makes the right choice "
    "feel like the easiest one, and it gets out of the way."
)


class TTSError(RuntimeError):
    """A clear, user-facing failure (missing package, offline, bad voice...)."""


def _warn(msg):
    print(f"[WARN] {msg}", file=sys.stderr)


# ---------------------------------------------------------------------------
# Script parsing
# ---------------------------------------------------------------------------

# A fence may be indented up to 3 spaces (CommonMark), e.g. a block under a
# numbered list item — same rule as elevenlabs_generate.py, so both voice
# tools read the same blocks out of one script.md.
_FENCE_RE = re.compile(r'^(?P<indent>[ ]{0,3})(?P<fence>`{3,}|~{3,})[ \t]*(?P<lang>[\w+.-]*)[^\n]*\n'
                       r'(?P<body>.*?)\n?^[ ]{0,3}(?P=fence)[ \t]*$', re.M | re.S)
_BREAK_RE = re.compile(r'<\s*break\b([^>]*?)/?\s*>', re.I)
_BREAK_TIME_RE = re.compile(r'time\s*=\s*["\']?\s*([\d.]+)\s*(ms|s)?', re.I)
_BREAK_STRENGTH_RE = re.compile(r'strength\s*=\s*["\']?([\w-]+)', re.I)
_BREAK_STRENGTHS = {'none': 0.0, 'x-weak': 0.1, 'weak': 0.25, 'medium': 0.4,
                    'strong': 0.75, 'x-strong': 1.2}
_COMMENT_RE = re.compile(r'<!--.*?-->', re.S)
# Only things shaped like markup: '<tag ...>', '</tag>', '<?xml ...?>', '<!DOCTYPE ...>'.
# A bare '<' / '>' in narration ('latency < 5 ms') is spoken text, not a tag.
_TAG_RE = re.compile(r'</?[A-Za-z][^<>]*>|<\?[^<>]*\?>|<![A-Za-z][^<>]*>')
_PLACEHOLDER_RE = re.compile(r'\{\{[A-Z0-9_]+\}\}')
# Info strings that mark a block as code, never narration (mirrors elevenlabs_generate.py).
_CODE_LANGS = {'json', 'jsonc', 'json5', 'js', 'javascript', 'ts', 'typescript', 'python', 'py',
               'bash', 'sh', 'shell', 'powershell', 'ps1', 'css', 'html', 'yaml', 'yml', 'toml',
               'csv', 'diff', 'console'}
_JSON_LANGS = ('json', 'jsonc', 'json5', '')
_BEATS_KEY_RE = re.compile(r'["\'“”]beats["\'“”]\s*:')     # also spots a curly-quoted key


def fenced_blocks(md_text):
    """[(lang, body)] for every fenced code block in a markdown string.
    The body of an indented fence is dedented by the fence's indentation."""
    text = md_text.replace('\r\n', '\n').replace('\r', '\n')
    out = []
    for m in _FENCE_RE.finditer(text):
        body, n = m.group('body'), len(m.group('indent'))
        if n:
            body = re.sub(r'(?m)^[ ]{1,%d}' % n, '', body)
        out.append((m.group('lang').strip().lower(), body))
    return out


def read_text_file(path):
    """Text of a script / beats file. UTF-8 (BOM or not) is expected; a UTF-16
    (Notepad 'Unicode') or ANSI/Windows-1252 file is decoded with a warning
    instead of crashing. Missing / not-a-file / unreadable -> TTSError."""
    p = Path(path)
    if not p.exists():
        raise TTSError(f"File not found: {p}")
    if not p.is_file():
        raise TTSError(f"Not a file: {p}")
    try:
        raw = p.read_bytes()
    except OSError as e:
        raise TTSError(f"Can't read {p}: {e.strerror or e}")
    if raw.startswith((b'\xff\xfe', b'\xfe\xff')):
        return raw.decode('utf-16')
    try:
        return raw.decode('utf-8-sig')
    except UnicodeDecodeError:
        pass
    try:
        text, enc = raw.decode('cp1252'), 'Windows-1252'
    except UnicodeDecodeError:
        text, enc = raw.decode('latin-1'), 'Latin-1'
    _warn(f"{p.name} is not UTF-8 — read it as {enc}. Re-save it as UTF-8 so quotes and "
          f"accents are sure to survive.")
    return text


def speakable(s):
    """Does the text contain anything to say (a letter or digit)? '...' / '—' alone don't."""
    return any(c.isalnum() for c in s)


def clean_text(s):
    """Plain speakable text: drop comments and leftover SSML/XML tags, unescape entities,
    squash whitespace. A bare '<' or '>' ('< 5 ms') is kept — edge-tts escapes it."""
    s = _COMMENT_RE.sub(' ', s)
    s = _TAG_RE.sub(' ', s)
    s = html_lib.unescape(s)
    s = re.sub(r'\s+', ' ', s)
    # '<emphasis>bet</emphasis>.' -> 'bet .' -> 'bet.' (but keep '.5' and '...' intact)
    s = re.sub(r'\s+([.,!?;:]+)(?=\s|$)', r'\1', s)
    return s.strip()


def _break_seconds(attrs):
    m = _BREAK_TIME_RE.search(attrs or '')
    if m:
        try:
            val = float(m.group(1))
        except ValueError:
            val = 0.0
        return val / 1000.0 if (m.group(2) or 's').lower() == 'ms' else val
    m = _BREAK_STRENGTH_RE.search(attrs or '')
    if m:
        return _BREAK_STRENGTHS.get(m.group(1).lower(), 0.4)
    return 0.4      # SSML default for a bare <break/> ("medium")


def _tokens(ssml):
    """Split SSML into [('text', raw) | ('break', seconds)]; consecutive breaks are summed.
    HTML comments go first, so a <break> inside '<!-- ... -->' neither splits nor is spoken."""
    ssml = _COMMENT_RE.sub(' ', ssml)
    out = []
    pos = 0
    for m in _BREAK_RE.finditer(ssml):
        if m.start() > pos:
            out.append(('text', ssml[pos:m.start()]))
        secs = _break_seconds(m.group(1))
        # Merge with a previous break separated only by whitespace.
        if out and out[-1][0] == 'text' and not out[-1][1].strip() and len(out) >= 2 and out[-2][0] == 'break':
            out.pop()
        if out and out[-1][0] == 'break':
            out[-1] = ('break', out[-1][1] + secs)
        else:
            out.append(('break', secs))
        pos = m.end()
    if pos < len(ssml):
        out.append(('text', ssml[pos:]))
    return out


# A short <break> inside a sentence ('the winner is <break time="0.4s"/> you') is
# not split into two requests: each request is intonated as a finished
# utterance, so 'the winner is' would end on a full stop. It becomes a spoken
# hesitation instead ('is... you', ~0.2s with Edge voices, prosody intact).
# Breaks after sentence/clause punctuation, and breaks >= SOFT_BREAK_MAX, are
# split: two requests joined by exactly that much silence.
SOFT_BREAK_MAX = 0.6
_SOFT = '\x00'                      # placeholder for a soft break while text is buffered
_CLAUSE_END_RE = re.compile(r'[.!?…;:]["\'”’)\]]*$')


def _soft_break(chunk, secs):
    """Should a <break> of secs after text chunk be a hesitation instead of a split?"""
    return secs < SOFT_BREAK_MAX and not _CLAUSE_END_RE.search(chunk.rstrip(_SOFT + ' '))


def _resolve_soft(chunk):
    """Cleaned text -> final text: a soft break after a word becomes '...', one after
    other punctuation (',', '—') is just a space; a soft break at the end is dropped."""
    chunk = re.sub(r'[\s%s]+$' % _SOFT, '', chunk)
    out, pos = [], 0
    for m in re.finditer(r'\s*%s[\s%s]*' % (_SOFT, _SOFT), chunk):
        out.append(chunk[pos:m.start()])
        prev = (''.join(out) or ' ')[-1]
        nxt = chunk[m.end():m.end() + 1] or ' '
        out.append('... ' if prev.isalnum() and (nxt.isalnum() or nxt in '"\'“‘(') else ' ')
        pos = m.end()
    out.append(chunk[pos:])
    return clean_text(''.join(out))


def _parts_from_text(text):
    """Split one beat's text on its <break>s: -> ([{'text','gap_after'}], trailing_break|None).
    A short mid-sentence break becomes a hesitation (see _soft_break), not a split."""
    parts, buf, trailing = [], [], None

    def flush():
        chunk = _resolve_soft(clean_text(''.join(buf)))
        buf.clear()
        return chunk

    for kind, val in _tokens(text):
        if kind == 'text':
            buf.append(val)
            if speakable(clean_text(val)):
                trailing = None
            continue
        val = float(val)
        pending = clean_text(''.join(buf))
        if speakable(pending) and _soft_break(pending, val):
            buf.append(_SOFT)
            trailing = val                          # if nothing follows, it's the pause_after
            continue
        chunk = flush()
        if speakable(chunk):
            parts.append({'text': chunk, 'gap_after': val})
        elif parts:
            parts[-1]['gap_after'] += val
        trailing = (trailing or 0.0) + val          # breaks since the last spoken text
    chunk = flush()
    if speakable(chunk):
        # trailing stays set when the last break (a soft one) had no speech after it
        parts.append({'text': chunk, 'gap_after': 0.0})
    elif parts:
        parts[-1]['gap_after'] = 0.0      # the beat's own pause_after takes over
    return parts, trailing


def _make_beat(slide, parts, pause_after):
    return {
        'slide': int(slide),
        'parts': parts,
        'pause_after': None if pause_after is None else max(0.0, float(pause_after)),
        'text': ' '.join(p['text'] for p in parts),
    }


def beats_from_ssml(ssml, min_break=BEAT_BREAK_MIN):
    """Beats from an SSML narration block: a <break> >= min_break ends a beat
    (its time becomes the beat's pause_after); shorter breaks are exact
    pauses inside the beat, or a hesitation when mid-sentence (see
    _soft_break). Remaining tags are stripped."""
    beats, parts, buf = [], [], []

    def flush(gap):
        chunk = _resolve_soft(clean_text(''.join(buf)))
        buf.clear()
        if speakable(chunk):
            parts.append({'text': chunk, 'gap_after': gap})
        elif parts:
            parts[-1]['gap_after'] += gap

    for kind, val in _tokens(ssml):
        if kind == 'text':
            buf.append(val)
        elif val < min_break and speakable(clean_text(''.join(buf))) \
                and _soft_break(clean_text(''.join(buf)), val):
            buf.append(_SOFT)
        elif val >= min_break:
            flush(0.0)
            if parts:
                beats.append(_make_beat(len(beats) + 1, list(parts), val))
                parts.clear()
            elif beats:
                beats[-1]['pause_after'] = (beats[-1]['pause_after'] or 0.0) + val
            # a long break before any text is dropped — the lead-in covers it
        else:
            flush(val)
    flush(0.0)
    if parts:
        parts[-1]['gap_after'] = 0.0
        beats.append(_make_beat(len(beats) + 1, list(parts), None))
    for b in beats:
        if b['parts']:
            b['parts'][-1]['gap_after'] = 0.0
    return beats


def beats_from_json(data):
    """Beats from the script.md beats block: {"beats":[{"slide","text","pause_after"}]}."""
    raw = data.get('beats') if isinstance(data, dict) else data
    if not isinstance(raw, list) or not raw:
        raise TTSError("beats block has no 'beats' list")
    beats = []
    for i, b in enumerate(raw):
        if isinstance(b, str):
            b = {'text': b}
        if not isinstance(b, dict):
            raise TTSError(f"beat {i + 1} is not an object: {b!r}")
        text = b.get('text')
        if text is None:
            text = b.get('narration', '')
        if not isinstance(text, str):
            raise TTSError(f"beat {i + 1}: 'text' must be a string")
        try:
            slide = b.get('slide', i + 1)
            if isinstance(slide, bool) or float(slide) != int(float(slide)):
                raise ValueError
            slide = int(float(slide))
            if slide < 1:
                raise ValueError
        except (TypeError, ValueError):
            raise TTSError(f"beat {i + 1}: bad slide number {b.get('slide')!r} (slides count from 1)")
        parts, trailing = _parts_from_text(text)
        pause = _pause_value(b.get('pause_after'), i + 1)
        if pause is None:
            pause = trailing
        beats.append(_make_beat(slide, parts, pause))
    return beats


def _pause_value(v, n):
    """A beat's pause_after -> seconds >= 0, or None (= use the default pause).
    Not a number -> warning + default; negative -> warning + 0."""
    if v is None:
        return None
    try:
        if isinstance(v, bool):
            raise ValueError
        sec = float(v)
        if sec != sec or sec in (float('inf'), float('-inf')):
            raise ValueError
    except (TypeError, ValueError):
        _warn(f"beat {n}: pause_after {v!r} is not a number of seconds — using the default pause.")
        return None
    if sec < 0:
        _warn(f"beat {n}: pause_after {v!r} is negative — using 0.")
        return 0.0
    return sec


def beats_from_text_file(text):
    """--text: blank-line separated paragraphs, one beat each (<break> tags inside are honored)."""
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    beats = []
    for para in re.split(r'\n[ \t]*\n', text):
        if not para.strip():
            continue
        parts, trailing = _parts_from_text(para)
        if parts:
            beats.append(_make_beat(len(beats) + 1, parts, trailing))
    return beats


def _json_object(body):
    """Parsed JSON of a block body that looks like JSON, else None."""
    stripped = body.strip()
    if not stripped.startswith(('{', '[')):
        return None
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        return None


def pick_ssml_block(blocks):
    """The SSML narration block, chosen like elevenlabs_generate.extract_ssml:
    ```ssml > ```xml / ```speak > first block with a <break> tag > first
    non-code block. Code blocks and the beats block are never picked. None if none."""
    cands = []
    for lang, body in blocks:
        data = _json_object(body)
        if lang in _CODE_LANGS or (isinstance(data, dict) and 'beats' in data) or not body.strip():
            continue
        cands.append((lang, body))
    for pick in (lambda lang, body: lang == 'ssml',
                 lambda lang, body: lang in ('xml', 'speak'),
                 lambda lang, body: _BREAK_RE.search(body),
                 lambda lang, body: True):
        for lang, body in cands:
            if pick(lang, body):
                return body
    return None


def _check_placeholders(beats, where):
    for b in beats:
        m = _PLACEHOLDER_RE.search(b['text'])
        if m:
            raise TTSError(f"{where} still contains template placeholders like {m.group(0)} — "
                           f"fill in the narration first.")
    return beats


def load_beats(script_path=None, text_path=None, min_break=BEAT_BREAK_MIN):
    """-> (beats, description of where they came from)."""
    if text_path:
        beats = beats_from_text_file(read_text_file(text_path))
        if not beats:
            raise TTSError(f"No beats found in {text_path} (blank lines separate beats).")
        return _check_placeholders(beats, text_path), f"{Path(text_path).name} (blank-line beats)"

    name = Path(script_path).name
    blocks = fenced_blocks(read_text_file(script_path))
    # 1) the machine-readable beats block
    for lang, body in blocks:
        stripped = body.strip()
        if lang not in _JSON_LANGS and not stripped.startswith('{'):
            continue
        if not stripped.startswith(('{', '[')):
            continue
        try:
            data = json.loads(stripped)
        except json.JSONDecodeError as e:
            if _BEATS_KEY_RE.search(stripped):
                hints = []
                if re.search(r',\s*[}\]]', stripped):
                    hints.append('trailing commas are not allowed')
                if re.search('[“”]', stripped):
                    hints.append('keys and strings need plain ASCII " quotes, not “ ”')
                raise TTSError(f"The beats block in {name} is not valid JSON "
                               f"(line {e.lineno}, col {e.colno}: {e.msg})"
                               + (f" — {'; '.join(hints)}" if hints else '')
                               + ". Fix it, or delete the block to use the SSML block instead.")
            continue
        if isinstance(data, dict) and 'beats' in data:
            return _check_placeholders(beats_from_json(data), script_path), f"{name} beats block"
    # 2) fallback: the SSML block
    ssml = pick_ssml_block(blocks)
    if ssml is None:
        raise TTSError(f"No beats block and no SSML block found in {script_path}. Add a "
                       "```json {\"beats\":[...]} block or the ``` SSML narration block.")
    beats = beats_from_ssml(ssml, min_break=min_break)
    if not beats:
        raise TTSError(f"The SSML block in {script_path} contains no narration text.")
    return (_check_placeholders(beats, script_path),
            f"{name} SSML block (split on <break> >= {min_break:g}s)")


# ---------------------------------------------------------------------------
# edge-tts
# ---------------------------------------------------------------------------

def _import_edge_tts():
    try:
        import edge_tts
    except ImportError:
        raise TTSError("edge-tts is not installed. Run:\n  python -m pip install edge-tts")
    return edge_tts


def _pct(p):
    p = int(round(p))
    return f"{'+' if p >= 0 else '-'}{abs(p)}%"


def norm_rate(v):
    """Speaking rate -> edge-tts '+N%' syntax (a change relative to normal speed).
      '-5%' / '+10%' / '-5' / '+10'  signed: a relative change
      '5%'                           unsigned below 50%: also a change ('+5%')
      '0.95' / '1' / '1.5'           a speed multiplier (0 < x <= 3)
    An unsigned '95%' is ambiguous (95% speed, or 95% faster?) and is refused."""
    s = str(v).strip().replace(' ', '')
    num = r'(\d+(?:\.\d+)?|\.\d+)'
    m = re.fullmatch(r'([+-])' + num + '%?', s)
    if m:
        return _pct(float(m.group(2)) * (-1 if m.group(1) == '-' else 1))
    m = re.fullmatch(num + '%', s)
    if m:
        p = float(m.group(1))
        if p < 50:
            return _pct(p)
        raise TTSError(f"Ambiguous --rate {v!r}: for {p:g}% of normal speed use {_pct(p - 100)}, "
                       f"to speak {p:g}% faster use +{p:g}%.")
    m = re.fullmatch(num, s)
    if m:
        x = float(m.group(1))
        if 0 < x <= 3:
            return _pct((x - 1.0) * 100)
        raise TTSError(f"Bad --rate {v!r}: a multiplier must be between 0 and 3 (e.g. 0.95), "
                       f"or give a percentage like -5% / +10%.")
    raise TTSError(f"Bad --rate {v!r}: use a percentage like -5% / +10%, or a multiplier like 0.95.")


def resolve_voice(v):
    """--voice -> an edge-tts voice name. A full name ('en-GB-RyanNeural', anything
    with a '-') passes through for edge-tts to judge; a bare first name of a
    recommended narrator ('andrew', 'Ava', 'ryan') expands to its full name."""
    s = str(v or '').strip()
    if '-' in s or s.startswith('Microsoft Server Speech'):
        return s
    low = s.lower()
    for name, _, _ in RECOMMENDED_VOICES:
        short = name.split('-', 2)[-1]                  # 'AndrewMultilingualNeural'
        base = re.sub(r'(Multilingual)?Neural$', '', short)
        if low and low in (short.lower(), base.lower()):
            return name
    names = ', '.join(sorted({re.sub(r'(Multilingual)?Neural$', '', n.split('-', 2)[-1]).lower()
                              for n, _, _ in RECOMMENDED_VOICES}))
    raise TTSError(f"Unknown --voice {v!r}: give a full voice name like {DEFAULT_VOICE}, or one of "
                   f"{names}. All voices: python tts_free.py --list-voices")


def norm_pitch(v):
    """'-2Hz' / '2hz' / '+0' -> edge-tts '+NHz' syntax."""
    s = str(v).strip().replace(' ', '')
    m = re.fullmatch(r'([+-]?)(\d+)(hz)?', s, re.I)
    if m:
        return f"{m.group(1) or '+'}{int(m.group(2))}Hz"
    raise TTSError(f"Bad --pitch {v!r}: use a value like -2Hz / +5Hz.")


def _transient_errors(edge):
    errs = [asyncio.TimeoutError, TimeoutError, ConnectionError, OSError]
    try:
        import aiohttp
        errs.append(aiohttp.ClientError)
    except ImportError:
        pass
    exc = getattr(edge, 'exceptions', None)
    for name in ('WebSocketError', 'UnexpectedResponse', 'UnknownResponse', 'SkewAdjustmentError'):
        cls = getattr(exc, name, None)
        if isinstance(cls, type) and issubclass(cls, BaseException):
            errs.append(cls)
    return tuple(errs)


def _no_audio_error(edge):
    cls = getattr(getattr(edge, 'exceptions', None), 'NoAudioReceived', None)
    return cls if isinstance(cls, type) and issubclass(cls, BaseException) else ()


def _communicate(edge, text, voice, rate, pitch):
    """Build a Communicate, asking for WordBoundary events on edge-tts >= 7
    (its default became SentenceBoundary) while staying compatible with
    older versions that have no 'boundary' parameter."""
    cls = edge.Communicate
    kw = {'rate': rate, 'pitch': pitch, 'boundary': 'WordBoundary'}
    try:
        params = inspect.signature(cls).parameters
        if not any(p.kind == p.VAR_KEYWORD for p in params.values()):
            kw = {k: v for k, v in kw.items() if k in params}
    except (TypeError, ValueError):
        pass
    return cls(text, voice, **kw)


def _short_err(err):
    """'ClientConnectorError: Cannot connect ... ssl:<ssl.SSLContext object at 0x..> [..]' minus the noise."""
    s = re.sub(r'\s*ssl:(?:<[^>]*>|default|None|False|True)', '', str(err))
    return f"{type(err).__name__}: {s.strip()}"


def _looks_offline(err):
    s = f"{type(err).__name__}: {err}".lower()
    return any(k in s for k in ('getaddrinfo', 'name or service', 'nodename', 'cannot connect',
                                'connectorerror', 'network is unreachable', 'no route to host',
                                'temporary failure in name resolution', 'errno 11001'))


async def synth_segment(text, voice, rate, pitch, retries=RETRIES):
    """One edge-tts request -> (mp3 bytes, [{'type','offset','duration','text'}] in seconds).
    Transient network/service errors are retried with exponential backoff."""
    edge = _import_edge_tts()
    transient = _transient_errors(edge)
    no_audio = _no_audio_error(edge)
    last, offline_hits = None, 0
    retries = max(0, retries)
    for attempt in range(retries + 1):
        try:
            comm = _communicate(edge, text, voice, rate, pitch)
        except (ValueError, TypeError) as e:
            # edge-tts validates voice/rate/pitch up front — not worth retrying.
            raise TTSError(f"edge-tts rejected the request ({e}). Check --voice/--rate/--pitch "
                           f"(voice={voice!r}, rate={rate!r}, pitch={pitch!r}).")
        try:
            audio = bytearray()
            marks = []
            async for chunk in comm.stream():
                kind = chunk.get('type')
                if kind == 'audio':
                    audio += chunk.get('data') or b''
                elif kind in ('WordBoundary', 'SentenceBoundary'):
                    marks.append({
                        'type': kind,
                        'offset': float(chunk.get('offset', 0)) / TICKS_PER_SECOND,
                        'duration': float(chunk.get('duration', 0)) / TICKS_PER_SECOND,
                        'text': str(chunk.get('text', '')),
                    })
            if not audio:
                raise TTSError("edge-tts returned no audio")
            return bytes(audio), marks
        except Exception as e:  # noqa: BLE001 — classified below
            is_no_audio = isinstance(e, TTSError) or (isinstance(e, no_audio) if no_audio else False)
            if not (is_no_audio or isinstance(e, transient)):
                raise
            last = e
            offline_hits = offline_hits + 1 if _looks_offline(e) else 0
            if (is_no_audio or offline_hits >= 3) and attempt >= 1:
                break      # a bad voice name / no network: more retries won't help
            if attempt < retries:
                delay = BACKOFF_BASE * (2 ** attempt) * (1 + random.random() * 0.25)
                print(f"[..] edge-tts {_short_err(e)} — retry {attempt + 1}/{retries} in {delay:.1f}s",
                      file=sys.stderr)
                await asyncio.sleep(delay)
    if isinstance(last, TTSError) or (no_audio and isinstance(last, no_audio)):
        raise TTSError(f"No audio received for voice {voice!r}. Is the voice name right? "
                       f"See: python tts_free.py --list-voices")
    if _looks_offline(last):
        raise TTSError("Could not reach Microsoft's speech service (speech.platform.bing.com). "
                       "Are you offline or behind a proxy/firewall? edge-tts needs internet access.\n"
                       f"  last error: {_short_err(last)}")
    raise TTSError(f"edge-tts failed after {retries + 1} attempts: {_short_err(last)}")


async def list_voices_async(retries=RETRIES):
    edge = _import_edge_tts()
    last, offline_hits = None, 0
    for attempt in range(max(0, retries) + 1):
        try:
            return await edge.list_voices()
        except _transient_errors(edge) as e:
            last = e
            offline_hits = offline_hits + 1 if _looks_offline(e) else 0
            if offline_hits >= 3:
                break      # no network: more retries won't help (same rule as synth_segment)
            if attempt < retries:
                delay = BACKOFF_BASE * (2 ** attempt) * (1 + random.random() * 0.25)
                print(f"[..] edge-tts {_short_err(e)} — retry {attempt + 1}/{retries} in {delay:.1f}s",
                      file=sys.stderr)
                await asyncio.sleep(delay)
    if _looks_offline(last):
        raise TTSError("Could not reach Microsoft's speech service to list voices — are you offline?\n"
                       f"  last error: {_short_err(last)}")
    raise TTSError(f"Listing voices failed: {_short_err(last)}")


# ---------------------------------------------------------------------------
# Audio (ffmpeg via imageio-ffmpeg)
# ---------------------------------------------------------------------------

_FFMPEG = None


def ffmpeg_exe():
    global _FFMPEG
    if _FFMPEG:
        return _FFMPEG
    try:
        import imageio_ffmpeg
        _FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:  # noqa: BLE001 — fall back to PATH
        _FFMPEG = shutil.which('ffmpeg')
    if not _FFMPEG:
        raise TTSError("ffmpeg not found. Easiest:\n  python -m pip install imageio-ffmpeg")
    return _FFMPEG


def decode_mp3(mp3_bytes, sr=SAMPLE_RATE):
    """MP3 bytes -> mono int16 PCM array('h') at sr."""
    p = subprocess.run([ffmpeg_exe(), '-hide_banner', '-loglevel', 'error', '-f', 'mp3', '-i', 'pipe:0',
                        '-f', 's16le', '-acodec', 'pcm_s16le', '-ac', '1', '-ar', str(sr), 'pipe:1'],
                       input=mp3_bytes, capture_output=True)
    if p.returncode != 0:
        raise TTSError(f"ffmpeg could not decode a TTS segment: {p.stderr.decode(errors='replace')[-400:]}")
    pcm = array('h')
    pcm.frombytes(p.stdout[:len(p.stdout) // 2 * 2])
    if sys.byteorder != 'little':
        pcm.byteswap()
    return pcm


def encode_mp3(pcm, sr, out_path, bitrate=BITRATE):
    """Mono int16 PCM -> MP3 file (written to a temp name, then moved into place).
    Writing to a real file lets libmp3lame add its LAME/Xing header, so
    decoders strip the codec delay and the timeline stays sample-exact."""
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    tmp = out_path.with_name(out_path.stem + '.tmp' + out_path.suffix)
    data = pcm.tobytes() if sys.byteorder == 'little' else _swapped(pcm).tobytes()
    # '-f mp3': the container must not depend on the (temp) file name's extension.
    p = subprocess.run([ffmpeg_exe(), '-hide_banner', '-loglevel', 'error', '-y',
                        '-f', 's16le', '-ar', str(sr), '-ac', '1', '-i', 'pipe:0',
                        '-c:a', 'libmp3lame', '-b:a', bitrate, '-ar', str(sr), '-ac', '1',
                        '-f', 'mp3', str(tmp)],
                       input=data, capture_output=True)
    if p.returncode != 0:
        tmp.unlink(missing_ok=True)
        raise TTSError(f"ffmpeg MP3 encode failed: {p.stderr.decode(errors='replace')[-400:]}")
    try:
        os.replace(tmp, out_path)
    except PermissionError:
        tmp.unlink(missing_ok=True)
        raise TTSError(f"Can't overwrite {out_path} — is it open in a player or a browser tab "
                       f"(Windows locks open files)? Close it and re-run; cached segments make "
                       f"the re-run fast.")


def _swapped(pcm):
    c = array('h', pcm)
    c.byteswap()
    return c


def _speech_bounds(pcm, sr, thresh_dbfs=SILENCE_DBFS, win_sec=0.005):
    """(first, last) sample index of audible audio (5 ms RMS windows), or None if silent.
    Scans inward from both ends only, so it's cheap even in pure Python."""
    n = len(pcm)
    win = max(1, int(sr * win_sec))
    limit = (32768.0 * 10 ** (thresh_dbfs / 20.0)) ** 2 * win
    first = None
    for i in range(0, n, win):
        seg = pcm[i:i + win]
        if sum(x * x for x in seg) * win / max(1, len(seg)) > limit:
            first = i
            break
    if first is None:
        return None
    last = first
    for i in range(((n - 1) // win) * win, first - 1, -win):
        seg = pcm[i:i + win]
        if sum(x * x for x in seg) * win / max(1, len(seg)) > limit:
            last = min(n, i + win)
            break
    return first, last


def _fade(pcm, n):
    n = min(n, len(pcm) // 2)
    for i in range(n):
        g = i / n
        pcm[i] = int(pcm[i] * g)
        pcm[-1 - i] = int(pcm[-1 - i] * g)


def _approx_words(text, t0, t1):
    """Spread the words of text across [t0, t1] by character length
    (punctuation-only tokens such as '—' are not words and get no slot)."""
    toks = [t for t in text.split() if speakable(t)]
    if not toks or t1 <= t0:
        return []
    weights = [len(t) + 1 for t in toks]
    total = float(sum(weights))
    out, t = [], t0
    for tok, w in zip(toks, weights):
        d = (t1 - t0) * w / total
        out.append({'text': tok, 'start': t, 'end': t + d * 0.92})
        t += d
    return out


def _find_word(text, low, wt, pos, window=80):
    """Index of token wt in text at/after pos (within `window` chars), matched on
    word boundaries — so a token Edge normalised ('one' for '100') can't lock
    onto the inside of a later word ('someone'). Exact case first, then
    case-insensitive (low = text.lower(), or None when lowering changes length). -1 if none."""
    for hay, needle in ((text, wt), (low, wt.lower() if low is not None else None)):
        if hay is None or not needle:
            continue
        i = hay.find(needle, pos)
        while 0 <= i <= pos + window:
            j = i + len(needle)
            head_ok = i == 0 or not needle[0].isalnum() or not hay[i - 1].isalnum()
            tail_ok = j >= len(hay) or not needle[-1].isalnum() or not hay[j].isalnum()
            if head_ok and tail_ok:
                return i
            i = hay.find(needle, i + 1)
    return -1


def restore_punctuation(text, words):
    """edge-tts reports bare words ('world'); re-attach the punctuation that
    surrounds each one in the source text ('world!', '“quoted”') for captions.
    A token that isn't in the text is kept as reported and doesn't move the cursor."""
    out, pos = [], 0
    low = text.lower()
    low = low if len(low) == len(text) else None
    for w in words:
        wt = w['text']
        i = _find_word(text, low, wt, pos) if wt else -1
        if i < 0:
            out.append(dict(w))
            continue
        j = i + len(wt)
        while j < len(text) and not text[j].isspace() and not text[j].isalnum():
            j += 1
        k = i
        while k > pos and not text[k - 1].isspace() and not text[k - 1].isalnum():
            k -= 1
        nw = dict(w)
        nw['text'] = text[k:j]
        out.append(nw)
        pos = j
    return out


def prepare_segment(mp3_bytes, marks, text, sr=SAMPLE_RATE, trim=True, codec_delay=EDGE_CODEC_DELAY):
    """Decode one TTS segment, trim its edge silence, and return
    {'pcm': array('h'), 'words': [{'text','start','end'}] relative to the
    trimmed segment start, 'approx': bool}."""
    pcm = decode_mp3(mp3_bytes, sr)
    n = len(pcm)
    word_marks = [m for m in marks if m['type'] == 'WordBoundary']
    # Estimated word times only matter (and only earn a warning) when there are words to time:
    # Edge answers a '...'-only text with silence and no boundaries at all.
    approx = not word_marks and speakable(text)
    if word_marks:
        words = [{'text': m['text'], 'start': m['offset'] + codec_delay,
                  'end': m['offset'] + m['duration'] + codec_delay} for m in word_marks]
    else:
        words = []
        for m in marks:      # SentenceBoundary only: spread each sentence's words
            words += _approx_words(m['text'], m['offset'] + codec_delay,
                                   m['offset'] + m['duration'] + codec_delay)
    bounds = _speech_bounds(pcm, sr)
    if not words and bounds:
        words = _approx_words(text, bounds[0] / sr, bounds[1] / sr)
    head, tail = 0, n
    if trim and bounds:
        onset = bounds[0] / sr
        end = bounds[1] / sr
        if words:
            onset = min(onset, words[0]['start'])
            end = max(end, words[-1]['end'])
        head = max(0, int((onset - PAD_HEAD) * sr))
        tail = min(n, int(round((end + PAD_TAIL) * sr)))
        if tail <= head:
            head, tail = 0, n
    seg = pcm[head:tail]
    if trim and (head > 0 or tail < n):
        _fade(seg, int(FADE_SEC * sr))
    shift = head / sr
    seg_dur = len(seg) / sr
    words = [{'text': w['text'],
              'start': min(max(0.0, w['start'] - shift), seg_dur),
              'end': min(max(0.0, w['end'] - shift), seg_dur)} for w in words]
    words = restore_punctuation(text, words) if word_marks else words
    return {'pcm': seg, 'words': words, 'approx': approx}


def final_tail(beats, tail=TAIL):
    """Silence after the last beat: tail, or the last beat's pause_after if longer."""
    last = beats[-1]['pause_after'] if beats else None
    return max(tail, last) if last is not None else tail


def assemble(beats, segments, sr=SAMPLE_RATE, lead_in=LEAD_IN, default_pause=DEFAULT_PAUSE, tail=TAIL):
    """Concatenate prepared segments with exact silences.
    segments[i][j] is the prepared segment for beats[i]['parts'][j].
    -> (pcm, words, cues, beat_spans). All positions are counted in samples,
    so cue(n) is exactly where beat n's first segment starts."""
    out = array('h')
    words, cues, spans = [], [], []

    def silence(sec):
        k = int(round(max(0.0, sec) * sr))
        if k:
            out.extend(array('h', bytes(2 * k)))

    silence(lead_in)
    last_slide = None
    for bi, beat in enumerate(beats):
        start = len(out)
        if beat['slide'] != last_slide:
            cues.append({'slide': beat['slide'], 'time': start / sr})
            last_slide = beat['slide']
        for pj, part in enumerate(beat['parts']):
            seg = segments[bi][pj]
            p0 = len(out) / sr
            for w in seg['words']:
                words.append({'text': w['text'], 'start': p0 + w['start'], 'end': p0 + w['end']})
            out.extend(seg['pcm'])
            if pj < len(beat['parts']) - 1:
                silence(part.get('gap_after', 0.0))
        spans.append({'slide': beat['slide'], 'start': start / sr, 'end': len(out) / sr, 'text': beat['text']})
        if bi < len(beats) - 1:
            pause = beat['pause_after'] if beat['pause_after'] is not None else default_pause
            silence(pause)
            spans[-1]['pause_after'] = pause
    # The last beat's own pause_after (e.g. a logo hold on a visual-only end slide)
    # lengthens the tail; it never shortens it.
    silence(final_tail(beats, tail))
    if cues:
        cues[0]['time'] = 0.0      # slide 1 owns the lead-in
    return out, words, cues, spans


# ---------------------------------------------------------------------------
# Synthesis driver (+ small on-disk cache so re-runs only fetch edited beats)
# ---------------------------------------------------------------------------

def _cache_key(text, voice, rate, pitch):
    raw = json.dumps(['edge-tts', 1, text, voice, rate, pitch], ensure_ascii=False)
    return hashlib.sha1(raw.encode('utf-8')).hexdigest()


def _cache_get(cache_dir, key):
    if not cache_dir:
        return None
    mp3, meta = Path(cache_dir) / f'{key}.mp3', Path(cache_dir) / f'{key}.json'
    if mp3.exists() and meta.exists():
        try:
            return mp3.read_bytes(), json.loads(meta.read_text(encoding='utf-8'))
        except (OSError, ValueError):
            return None
    return None


def _cache_put(cache_dir, key, audio, marks):
    if not cache_dir:
        return
    try:
        Path(cache_dir).mkdir(parents=True, exist_ok=True)
        (Path(cache_dir) / f'{key}.mp3').write_bytes(audio)
        (Path(cache_dir) / f'{key}.json').write_text(json.dumps(marks), encoding='utf-8')
    except OSError:
        pass


async def synth_all(texts, voice, rate, pitch, jobs=JOBS, retries=RETRIES, cache_dir=None, quiet=False):
    """Synthesize texts concurrently (bounded). -> [(mp3, marks)] in input order."""
    sem = asyncio.Semaphore(max(1, jobs))
    done = [0]

    async def one(i, text):
        key = _cache_key(text, voice, rate, pitch)
        hit = _cache_get(cache_dir, key)
        cached = hit is not None
        if hit is None:
            async with sem:
                hit = await synth_segment(text, voice, rate, pitch, retries=retries)
            _cache_put(cache_dir, key, *hit)
        done[0] += 1
        if not quiet:
            print(f"[..] segment {done[0]}/{len(texts)} ready{' (cached)' if cached else ''}", file=sys.stderr)
        return hit

    return await asyncio.gather(*(one(i, t) for i, t in enumerate(texts)))


def generate(beats, out_dir, voice=DEFAULT_VOICE, rate='+0%', pitch='+0Hz', mp3_name=MP3_NAME,
             lead_in=LEAD_IN, default_pause=DEFAULT_PAUSE, tail=TAIL, sr=SAMPLE_RATE, bitrate=BITRATE,
             trim=True, jobs=JOBS, retries=RETRIES, use_cache=True, quiet=False):
    """Render beats to <out_dir>/<mp3_name> + word_timestamps.json. Returns the JSON dict."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    flat = [(bi, pj, part['text']) for bi, b in enumerate(beats) for pj, part in enumerate(b['parts'])]
    cache_dir = (out_dir / CACHE_DIR) if use_cache else None
    results = asyncio.run(synth_all([t for _, _, t in flat], voice, rate, pitch, jobs=jobs,
                                    retries=retries, cache_dir=cache_dir, quiet=quiet)) if flat else []
    segments = [[None] * len(b['parts']) for b in beats]
    approx = False
    for (bi, pj, text), (audio, marks) in zip(flat, results):
        seg = prepare_segment(audio, marks, text, sr=sr, trim=trim)
        approx = approx or seg['approx']
        segments[bi][pj] = seg
    if approx:
        _warn("edge-tts sent no WordBoundary events for some segments — their word times are "
              "estimated (upgrade edge-tts: python -m pip install -U edge-tts).")
    pcm, words, cues, spans = assemble(beats, segments, sr=sr, lead_in=lead_in,
                                       default_pause=default_pause, tail=tail)
    mp3_path = out_dir / mp3_name
    encode_mp3(pcm, sr, mp3_path, bitrate=bitrate)
    duration = len(pcm) / sr
    data = {
        'source': 'edge-tts',
        'audio': Path(mp3_name).as_posix(),
        'duration': round(duration, 3),
        'voice': voice,
        'rate': rate,
        'pitch': pitch,
        'lead_in': lead_in,
        'words': [{'text': w['text'], 'start': round(w['start'], 3), 'end': round(w['end'], 3)} for w in words],
        'cues': [{'slide': c['slide'], 'time': round(c['time'], 3)} for c in cues],
        'beats': [dict(s, start=round(s['start'], 3), end=round(s['end'], 3)) for s in spans],
    }
    (out_dir / TIMESTAMPS_NAME).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
    return data


# ---------------------------------------------------------------------------
# Deck rewriting (shared sb_deckio module ships next to this script)
# ---------------------------------------------------------------------------

def _deckio():
    here = str(Path(__file__).resolve().parent)
    if here not in sys.path:
        sys.path.insert(0, here)
    try:
        import sb_deckio
    except ImportError:
        raise TTSError("sb_deckio.py (part of the storyboard skill) is missing next to tts_free.py — "
                       "can't --apply.")
    return sb_deckio


def check_deck(html_path):
    """Fail fast (before any synthesis) on a deck --apply can't rewrite:
    missing, not a file, unreadable, not UTF-8, or sb_deckio unavailable.
    -> the deck's text."""
    path = Path(html_path)
    if not path.exists():
        raise TTSError(f"Deck not found: {html_path}")
    if not path.is_file():
        raise TTSError(f"Deck is not a file: {html_path}")
    try:
        html = path.read_bytes().decode('utf-8-sig')
    except OSError as e:
        raise TTSError(f"Can't read deck {html_path}: {e.strerror or e}")
    except UnicodeDecodeError:
        raise TTSError(f"Deck {path.name} is not UTF-8 — re-save it as UTF-8 before --apply.")
    _deckio()
    return html


def format_timings(cues):
    lines = ['const TIMINGS = [']
    for i, c in enumerate(cues):
        comma = ',' if i < len(cues) - 1 else ''
        lines.append(f"  {{ time: {c['time']:7.2f}, slide: {c['slide']:2d} }}{comma}")
    lines.append('];')
    return '\n'.join(lines)


def _src_matches(src, deck_dir, mp3_path):
    """Does the deck's <audio src> point at the MP3 we just wrote?"""
    from urllib.parse import unquote, urlparse
    if not src or urlparse(src).scheme in ('http', 'https', 'data', 'blob'):
        return True      # remote / generated sources: not ours to judge
    try:
        return (Path(deck_dir) / unquote(src.split('?')[0].split('#')[0])).resolve() == Path(mp3_path).resolve()
    except OSError:
        return False


def apply_to_deck(html_path, cues, words, mp3_path=None, set_src=False):
    """Rewrite const TIMINGS + const WORDS in a deck via sb_deckio (inserting
    WORDS / wiring words: WORDS into Storyboard.init when missing, keeping a
    .bak). Warns when the cue count != the deck's slide count and when the
    deck's <audio> src doesn't point at the new MP3 (set_src rewrites it).
    -> sb_deckio report dict."""
    path = Path(html_path)
    html = check_deck(path)
    io = _deckio()
    timings = [{'time': round(c['time'], 3), 'slide': c['slide']} for c in cues]
    words = [{'text': w['text'], 'start': round(w['start'], 3), 'end': round(w['end'], 3)} for w in words]
    audio_src = None
    if mp3_path is not None:
        cur = io.read_audio_src(html)
        if not _src_matches(cur, path.parent, mp3_path):
            try:
                rel = Path(os.path.relpath(Path(mp3_path).resolve(), path.parent.resolve())).as_posix()
            except ValueError:       # Windows: MP3 and deck on different drives
                rel = Path(mp3_path).resolve().as_uri()
            if set_src:
                audio_src = rel
            else:
                _warn(f"{path.name}'s <audio> src is {cur!r} but the voice-over is {rel!r} — "
                      f"pass --set-src to point the deck at it.")
    try:
        report = io.apply_to_deck(str(path), timings=timings, words=words, audio_src=audio_src, backup=True)
    except io.DeckIOError as e:
        raise TTSError(f"Couldn't rewrite {path.name}: {e}")
    except OSError as e:
        raise TTSError(f"Couldn't write {path.name}: {e.strerror or e} — is it open/locked? "
                       f"The MP3 + {TIMESTAMPS_NAME} were still written.")
    for w in report.get('warnings') or []:
        _warn(w)
    for n in report.get('notes') or []:
        print(f"[..] {n}", file=sys.stderr)
    if audio_src:
        report.setdefault('notes', []).append(f'audio src -> {audio_src}')
    return report


# ---------------------------------------------------------------------------
# CLI helpers
# ---------------------------------------------------------------------------

def _count_words(text):
    return len(re.findall(r"[A-Za-z0-9][A-Za-z0-9'’.-]*", text))


def measure_wpm(voice=DEFAULT_VOICE, rates=('+0%', '-5%'), pitch='+0Hz', paragraph=WPM_PARAGRAPH):
    """Synthesize the reference paragraph (one segment, natural sentence pauses
    included, edge silence trimmed) at each rate.
    -> [{voice, rate, words, seconds, wpm, words_per_second}]"""
    n_words = _count_words(paragraph)
    results = []
    for rate in rates:
        audio, marks = asyncio.run(synth_segment(paragraph, voice, rate, pitch))
        seg = prepare_segment(audio, marks, paragraph, trim=True)
        spoken = len(seg['pcm']) / SAMPLE_RATE - PAD_HEAD - PAD_TAIL
        results.append({'voice': voice, 'rate': rate, 'words': n_words, 'seconds': round(spoken, 2),
                         'wpm': round(n_words / spoken * 60, 1), 'words_per_second': round(n_words / spoken, 2)})
    return results


def _print_voices(voices, flt):
    rec = {v[0] for v in RECOMMENDED_VOICES}
    terms = [t.lower() for t in (flt or '').split()]

    def match(v):
        hay = ' '.join(str(v.get(k, '')) for k in ('ShortName', 'Locale', 'FriendlyName', 'LocaleName')).lower()
        gender = str(v.get('Gender', '')).lower()
        locale = str(v.get('Locale', '')).lower()

        def ok(t):
            if t in ('male', 'female'):          # exact: 'male' is a substring of 'female'
                return gender == t
            if re.fullmatch(r'[a-z]{2}(-[a-z]{2,4})*', t):   # 'en', 'en-gb', 'zh-cn': locale prefix
                return locale == t or locale.startswith(t + '-')
            return t in hay                       # a name: 'andrew', 'multilingual', ...
        return all(ok(t) for t in terms)

    if not terms:
        print("Recommended narrators:")
        for name, gender, desc in RECOMMENDED_VOICES:
            print(f"  {name:36s} {gender:7s} {desc}")
        print()
        rows = [v for v in voices if str(v.get('Locale', '')).startswith('en-')]
        print(f"All English voices ({len(rows)}; pass a filter like 'fr-FR' or 'female' for others):")
    else:
        rows = [v for v in voices if match(v)]
        print(f"{len(rows)} voice(s) matching {flt!r}:")
    for v in sorted(rows, key=lambda v: (v.get('Locale', ''), v.get('ShortName', ''))):
        tags = ', '.join((v.get('VoiceTag') or {}).get('VoicePersonalities') or [])
        star = '*' if v.get('ShortName') in rec else ' '
        print(f" {star}{v.get('ShortName', ''):36s} {v.get('Gender', ''):7s} {tags}")


def check_mp3_name(name):
    """--mp3-name -> the file name to write. The output is always MP3: a name
    without an extension gets '.mp3' appended; any other extension is refused."""
    p = Path(name)
    if not p.name or p.name in ('.', '..'):
        raise TTSError(f"Bad --mp3-name {name!r}: give a file name like voiceover.mp3.")
    if not p.suffix:
        print(f"[..] --mp3-name {name!r} has no extension — writing {name}.mp3", file=sys.stderr)
        return name + '.mp3'
    if p.suffix.lower() != '.mp3':
        raise TTSError(f"Bad --mp3-name {name!r}: the voice-over is always an MP3 — use a .mp3 name "
                       f"(e.g. {p.stem}.mp3).")
    return name


def _fix_negative_values(argv):
    """Let '--rate -5%' / '--pitch -2Hz' work (argparse would read '-5%' as an option)."""
    out, i = [], 0
    while i < len(argv):
        a = argv[i]
        if a in ('--rate', '--pitch') and i + 1 < len(argv) and argv[i + 1].startswith('-'):
            out.append(f'{a}={argv[i + 1]}')
            i += 2
            continue
        out.append(a)
        i += 1
    return out


def estimate_seconds(beats, rate='+0%', lead_in=LEAD_IN, default_pause=DEFAULT_PAUSE, tail=TAIL,
                     wpm=EST_WPM):
    """Rough runtime before synthesis: words at the measured default-voice pace
    (scaled by the rate change) + in-beat gaps + pauses + lead-in + tail + the
    silence pads each trimmed segment keeps."""
    pace = wpm * (1 + float(rate.rstrip('%')) / 100.0) / 60.0
    t = lead_in + final_tail(beats, tail)
    for i, b in enumerate(beats):
        t += _count_words(b['text']) / pace + sum(p.get('gap_after', 0.0) for p in b['parts'])
        t += len(b['parts']) * (PAD_HEAD + PAD_TAIL)
        if i < len(beats) - 1:
            t += b['pause_after'] if b['pause_after'] is not None else default_pause
    return t


def _print_beats(beats, default_pause, tail=TAIL, rate='+0%', lead_in=LEAD_IN):
    for i, b in enumerate(beats):
        pause = b['pause_after'] if b['pause_after'] is not None else default_pause
        gap = f"tail {final_tail(beats, tail):4.2f}s" if i == len(beats) - 1 else f"pause {pause:4.2f}s"
        print(f"  slide {b['slide']:2d}  {gap}  {_count_words(b['text']):3d} words  "
              f"{len(b['parts'])} part(s)  | {b['text'][:70]}{'...' if len(b['text']) > 70 else ''}")
    n = sum(_count_words(b['text']) for b in beats)
    est = estimate_seconds(beats, rate, lead_in, default_pause, tail)
    print(f"  {n} words -> about {est:.0f}s of audio at rate {rate} "
          f"(default voice speaks ~{EST_WPM} wpm at +0%; exact after synthesis)")


def main(argv=None):
    for s in (sys.stdout, sys.stderr):
        try:     # pipes on Windows default to cp1252; narration text is UTF-8
            s.reconfigure(errors='replace', line_buffering=True,
                          **({} if s.isatty() else {'encoding': 'utf-8'}))
        except (AttributeError, ValueError, OSError):
            pass
    argv = _fix_negative_values(list(sys.argv[1:] if argv is None else argv))
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('script', nargs='?', help='script.md (beats JSON block, or SSML block fallback)')
    ap.add_argument('--text', metavar='FILE', help='Plain-text beats instead of script.md (blank line = new beat)')
    ap.add_argument('--out', metavar='DIR', help='Output directory (default: next to the script/text file)')
    ap.add_argument('--apply', metavar='HTML', help='Rewrite const TIMINGS + const WORDS in this deck (.bak kept)')
    ap.add_argument('--set-src', action='store_true',
                    help="With --apply: also point the deck's <audio> src at the new MP3")
    ap.add_argument('--voice', default=DEFAULT_VOICE,
                    help=f'edge-tts voice (default {DEFAULT_VOICE}); a recommended narrator\'s first name '
                         f'works too: andrew, ava, brian, emma, ryan, sonia, christopher, aria, william')
    ap.add_argument('--rate', default='+0%', help="Speaking rate change, e.g. -5%%, +10%%, or a speed multiplier 0.95 "
                         "(default +0%%; an unsigned value >= 50%% is refused as ambiguous)")
    ap.add_argument('--pitch', default='+0Hz', help='Pitch shift, e.g. -2Hz (default +0Hz)')
    ap.add_argument('--mp3-name', default=MP3_NAME, help=f'Output MP3 filename (default {MP3_NAME})')
    ap.add_argument('--lead-in', type=float, default=LEAD_IN, help=f'Silence before beat 1, s (default {LEAD_IN})')
    ap.add_argument('--pause', type=float, default=DEFAULT_PAUSE,
                    help=f'pause_after for beats that set none, s (default {DEFAULT_PAUSE})')
    ap.add_argument('--tail', type=float, default=TAIL, help=f'Silence after the last beat, s (default {TAIL})')
    ap.add_argument('--min-break', type=float, default=BEAT_BREAK_MIN,
                    help=f'SSML fallback: <break> >= this starts a new beat (default {BEAT_BREAK_MIN})')
    ap.add_argument('--sample-rate', type=int, default=SAMPLE_RATE, choices=(44100, 48000),
                    help=f'Output sample rate (default {SAMPLE_RATE})')
    ap.add_argument('--bitrate', default=BITRATE, help=f'MP3 bitrate (default {BITRATE})')
    ap.add_argument('--no-trim', action='store_true', help="Keep each segment's own leading/trailing silence")
    ap.add_argument('--no-cache', action='store_true', help=f'Always re-synthesize (cache lives in <out>/{CACHE_DIR})')
    ap.add_argument('--jobs', type=int, default=JOBS, help=f'Concurrent edge-tts requests (default {JOBS})')
    ap.add_argument('--retries', type=int, default=RETRIES, help=f'Retries per request on network errors (default {RETRIES})')
    ap.add_argument('--slides', type=int, default=None, help='Expected slide count — warns if the cue count differs')
    ap.add_argument('--dry-run', action='store_true', help='Parse and print the beats; synthesize nothing')
    ap.add_argument('--list-voices', nargs='*', metavar='FILTER',
                    help="List voices and exit; optional filter words, all must match: locale, name, "
                         "gender (e.g. --list-voices en-GB male)")
    ap.add_argument('--measure-wpm', action='store_true',
                    help='Synthesize a ~120-word paragraph and report real words-per-minute '
                         '(at --rate if given, else at +0%% and -5%%)')
    args = ap.parse_args(argv)

    try:
        if args.list_voices is not None:
            _print_voices(asyncio.run(list_voices_async(retries=args.retries)), ' '.join(args.list_voices))
            return 0

        rate, pitch = norm_rate(args.rate), norm_pitch(args.pitch)
        voice = resolve_voice(args.voice)
        if voice != args.voice.strip():
            print(f"[..] --voice {args.voice} -> {voice}", file=sys.stderr)

        if args.measure_wpm:
            rates = [rate] if any(a.startswith('--rate') for a in argv) else ['+0%', '-5%']
            print(f"[..] Measuring speaking rate: voice={voice}, {_count_words(WPM_PARAGRAPH)}-word paragraph")
            for r in measure_wpm(voice, rates, pitch):
                print(f"[ok] rate {r['rate']:>5s}: {r['wpm']:6.1f} wpm  ({r['words_per_second']:.2f} words/s; "
                      f"{r['words']} words in {r['seconds']:.2f}s)")
            return 0

        if not args.script and not args.text:
            ap.error('give a script.md, or --text FILE (or --list-voices / --measure-wpm)')
        src = Path(args.text or args.script)
        beats, origin = load_beats(args.script if not args.text else None, args.text, min_break=args.min_break)
        n_cues = len({b['slide'] for b in beats})
        print(f"[ok] {len(beats)} beats ({n_cues} slide cues) from {origin}")
        # Everything that can be checked without the network is checked before the first request.
        mp3_name = check_mp3_name(args.mp3_name)
        if args.apply:
            check_deck(args.apply)
        if args.dry_run:
            _print_beats(beats, args.pause, args.tail, rate, args.lead_in)
            return 0

        out_dir = Path(args.out) if args.out else src.resolve().parent
        n_parts = sum(len(b['parts']) for b in beats)
        print(f"[..] edge-tts: voice={voice} rate={rate} pitch={pitch} — {n_parts} segment(s)")
        data = generate(beats, out_dir, voice=voice, rate=rate, pitch=pitch, mp3_name=mp3_name,
                        lead_in=args.lead_in, default_pause=args.pause, tail=args.tail, sr=args.sample_rate,
                        bitrate=args.bitrate, trim=not args.no_trim, jobs=args.jobs,
                        retries=max(0, args.retries), use_cache=not args.no_cache)
        print(f"[ok] Wrote {out_dir / mp3_name} ({data['duration']:.2f}s)")
        print(f"[ok] Wrote {out_dir / TIMESTAMPS_NAME} ({len(data['words'])} words, {len(data['cues'])} cues)")
        if args.slides is not None and len(data['cues']) != args.slides:
            _warn(f"Expected {args.slides} slides but got {len(data['cues'])} cues.")
        print()
        print(format_timings(data['cues']))
        if args.apply:
            rep = apply_to_deck(args.apply, data['cues'], data['words'], mp3_path=out_dir / mp3_name,
                                set_src=args.set_src)
            bak = f" (backup: {Path(rep['backup']).name})" if rep.get('backup') else ''
            print(f"\n[OK] Rewrote TIMINGS + WORDS in {args.apply}{bak}", file=sys.stderr)
        return 0
    except TTSError as e:
        print(f"[ERROR] {e}", file=sys.stderr)
        return 1
    except OSError as e:      # e.g. an output folder we may not write to
        print(f"[ERROR] {e}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("[ERROR] interrupted", file=sys.stderr)
        return 130


if __name__ == '__main__':
    sys.exit(main())

"""Tests for audit_deck.py -- the storyboard pre-render gate.

Synthetic decks (positive + negative) for every check, registry extraction from the real
engine (node harness + source-parse fallback + per-hash cache), the baseline templates, and
the CLI contract (exit codes 0/1/2, --json, --write).

Run:  python -m unittest discover -s "<skill>/tests" -p "test_*.py"
Stdlib only; headless; no network. node is used when available (the source-parse fallback is
tested either way).
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
import wave
from pathlib import Path
from unittest import mock

SKILL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SKILL))

import audit_deck as A  # noqa: E402

ENGINE = SKILL / 'storyboard-engine.js'
HAVE_NODE = shutil.which('node') is not None
_CACHE_DIR = None


_SAVED_PLATFORM = None


def setUpModule():
    global _CACHE_DIR, _SAVED_PLATFORM
    _CACHE_DIR = tempfile.mkdtemp(prefix='sb-audit-cache-')
    os.environ['STORYBOARD_AUDIT_CACHE'] = _CACHE_DIR
    # the system-font check depends on the render OS: pin it so results match on any test machine
    _SAVED_PLATFORM = os.environ.get('STORYBOARD_RENDER_PLATFORM')
    os.environ['STORYBOARD_RENDER_PLATFORM'] = 'windows'


def tearDownModule():
    os.environ.pop('STORYBOARD_AUDIT_CACHE', None)
    if _SAVED_PLATFORM is None:
        os.environ.pop('STORYBOARD_RENDER_PLATFORM', None)
    else:
        os.environ['STORYBOARD_RENDER_PLATFORM'] = _SAVED_PLATFORM
    shutil.rmtree(_CACHE_DIR, ignore_errors=True)


# --------------------------------------------------------------------------- deck builder
CLEAN_SLIDES = [
    # slide 1 -- hook: headline at 0.2s
    ('cut', '''
      <h1 class="anim" data-anim="spring" data-t-rel="0.2" data-dur="1.0">Launch day</h1>
      <p class="anim" data-anim="fadeUp" data-t-rel="0.9" data-dur="0.8">Everything ships today</p>'''),
    ('crossDissolve', '''
      <h2 class="anim" data-anim="slideInLeft" data-t-rel="0.2" data-dur="0.7">The problem</h2>
      <p class="anim" data-anim="wordReveal" data-t-rel="0.8" data-dur="1.5">Teams lose hours every week</p>
      <div class="anim" data-anim="spring" data-t-rel="2.0" data-dur="1.0">Hours</div>'''),
    ('cut', '''
      <h2 class="anim" data-anim="fadeIn" data-t-rel="0.3" data-dur="1.0">Breathe</h2>'''),
    ('pushLeft', '''
      <h2 class="anim" data-anim="spring" data-t-rel="0.2" data-dur="1.0">Try it</h2>
      <p class="anim" data-anim="typewriter" data-t-rel="1.0" data-dur="1.2">example.com</p>
      <span class="anim" data-anim="fadeDown" data-t-rel="2.0" data-dur="0.8">Free</span>'''),
]
SLIDE_LEN = 7.0


def write_wav(path, seconds, rate=8000):
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(b'\x00\x00' * int(seconds * rate))


def build_deck(d, slides=None, timings=None, *, width=1920, height=1080, head='', body_attrs='',
               style='body { font-family: Georgia, serif; }', words=None, word_hits=None,
               audio='voiceover.wav', audio_seconds=None, write_audio=True, engine='copy',
               init_extra='', fallback=None, extra_body='', script_extra=''):
    """Write a template-style deck into directory d and return its path.

    slides: list of (transition-or-None, inner_html) or full '<section ...>' strings.
    engine: 'copy' (copy the skill engine next to the deck), 'none' (reference it, don't copy),
            'omit' (no engine script tag at all) or a path to an engine file to copy.
    """
    d = Path(d)
    slides = CLEAN_SLIDES if slides is None else slides
    secs = []
    for k, s in enumerate(slides, 1):
        if isinstance(s, str) and s.lstrip().startswith('<section'):
            secs.append(s)
            continue
        tr, inner = s
        tr_attr = f' data-transition-in="{tr}"' if tr else ''
        secs.append(f'<section class="slide" data-slide="{k}"{tr_attr}>{inner}\n</section>')
    if timings is None:
        timings = [(k * SLIDE_LEN, k + 1) for k in range(len(slides))]
    tim = ',\n    '.join(f'{{ time: {t}, slide: {s} }}' for t, s in timings)
    total = audio_seconds if audio_seconds is not None else (len(slides) * SLIDE_LEN)
    if engine == 'copy':
        shutil.copyfile(ENGINE, d / 'storyboard-engine.js')
    elif engine not in ('none', 'omit'):
        shutil.copyfile(engine, d / 'storyboard-engine.js')
    engine_tag = '' if engine == 'omit' else '<script src="storyboard-engine.js"></script>'
    if audio and write_audio and audio.endswith('.wav'):
        write_wav(d / audio, total)
    audio_tag = f'<audio id="voAudio" src="{audio}" preload="auto"></audio>' if audio is not None else ''
    fb = fallback if fallback is not None else int(total)
    html_text = f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Test deck</title>
{head}
<style>
  .deck {{ width: {width}px; height: {height}px; }}
  {style}
</style></head>
<body{(' ' + body_attrs) if body_attrs else ''}>
<div class="stage"><div class="deck" id="deck">
{chr(10).join(secs)}
</div></div>
{extra_body}
{audio_tag}
{engine_tag}
<script>
  const TIMINGS = [
    {tim}
  ];
  const SLIDE_LABELS = [{', '.join(repr(f'S{k}') for k in range(1, len(slides) + 1))}];
  const WORD_HITS = {json.dumps(word_hits or [])};
  const WORDS = {json.dumps(words or [])};
  {script_extra}
  Storyboard.init({{ timings: TIMINGS, labels: SLIDE_LABELS, wordHits: WORD_HITS, words: WORDS,
                     fallbackDuration: {fb}{init_extra} }});
</script>
</body></html>
'''
    p = d / 'storyboard.html'
    p.write_text(html_text, encoding='utf-8')
    return p


class DeckCase(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix='sb-audit-'))

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def run_audit(self, **kw):
        margin = kw.pop('margin', A.DEFAULT_MARGIN)
        use_node = kw.pop('use_node', True)
        allow = kw.pop('allow_placeholders', False)
        platform = kw.pop('platform', None)
        p = build_deck(self.tmp, **kw)
        return A.audit(p, margin=margin, use_node=use_node, allow_placeholders=allow, platform=platform)

    @staticmethod
    def of(report, check, severity=None):
        return [f for f in report.findings if f.check == check and (severity is None or f.severity == severity)]

    def assertFinding(self, report, check, severity, contains=None, slide=None):
        fs = self.of(report, check, severity)
        if contains is not None:
            fs = [f for f in fs if contains in (f.summary + ' ' + f.detail + ' ' + f.fix)]
        if slide is not None:
            fs = [f for f in fs if f.slide == slide]
        self.assertTrue(fs, f'expected {severity} [{check}]{" containing " + repr(contains) if contains else ""}'
                            f'{" on slide %s" % slide if slide else ""}; got:\n{report.render()}')
        return fs[0]

    def assertNoFinding(self, report, check, severity=None):
        fs = self.of(report, check, severity)
        self.assertFalse(fs, f'unexpected [{check}] findings:\n' + '\n'.join(f'{f.severity}: {f.summary}' for f in fs))


# --------------------------------------------------------------------------- registry
class RegistryTests(unittest.TestCase):
    CORE_PRESETS = {'fadeIn', 'fadeUp', 'spring', 'counter', 'kenburns', 'typewriter', 'scene3d', 'filmGrain'}

    def test_node_registry_on_current_engine(self):
        if not HAVE_NODE:
            self.skipTest('node not on PATH')
        reg = A.load_registry(ENGINE, use_node=True, use_cache=False)
        self.assertTrue(reg.source.startswith('node'), reg.source + ' ' + repr(reg.notes))
        self.assertTrue(self.CORE_PRESETS <= set(reg.presets), sorted(self.CORE_PRESETS - set(reg.presets)))
        self.assertGreaterEqual(len(reg.presets), 60)
        self.assertTrue({'cut', 'crossDissolve', 'fade', 'whipPan', 'pushLeft'} <= reg.transitions)
        self.assertGreaterEqual(len(reg.transitions), 15)
        self.assertTrue({'float', 'breathe', 'pulse'} <= reg.loops)
        self.assertTrue({'linear', 'outBack', 'outCubic'} <= reg.eases)
        self.assertIn('fadeOut', reg.exits)
        # dur metadata comes through: continuous layers are recognised dynamically
        self.assertIn('filmGrain', reg.continuous())
        self.assertIsNotNone(reg.dur('fadeIn'))

    def test_source_parse_fallback_matches_node(self):
        src = A.load_registry(ENGINE, use_node=False, use_cache=False)
        self.assertEqual(src.source, 'source-parse')
        self.assertTrue(self.CORE_PRESETS <= set(src.presets))
        self.assertTrue({'cut', 'crossDissolve', 'fade'} <= src.transitions)
        self.assertIn('fadeOut', src.exits)
        if not HAVE_NODE:
            return
        node = A.load_registry(ENGINE, use_node=True, use_cache=False)
        for kind in ('presets', 'transitions', 'loops', 'eases', 'exits'):
            a, b = set(getattr(node, kind)), set(getattr(src, kind))
            overlap = len(a & b) / max(1, len(a))
            self.assertGreaterEqual(overlap, 0.9, f'{kind}: node-only {sorted(a - b)}, parse-only {sorted(b - a)}')

    def test_synthetic_engine_both_paths_and_cache(self):
        tmp = Path(tempfile.mkdtemp(prefix='sb-audit-eng-'))
        try:
            eng = tmp / 'storyboard-engine.js'
            eng.write_text('''(function (global) {
  'use strict';
  const EASE = { linear: p => p, 'outBack': p => p };
  const PRESETS = {
    fadeIn: { dur: 0.8, apply(el, p) { el.style.opacity = p; } },
    scene3d: { dur: 9999, apply() {} },
    popIn2: { dur: 0.5, emphasis: true, apply() {} },
  };
  PRESETS.alias = PRESETS.fadeIn;
  const LOOPS = { float: () => '', beat: null };
  const EXITS = { fadeOut: () => {}, zoomOut: () => {} };      // not exposed on the API
  const TRANSITIONS = { cut: () => 0, crossDissolve: () => 700, starWipe: () => 900 };
  document.querySelectorAll('.slide').forEach(() => {});         // DOM access at load must not break the harness
  const Storyboard = { VERSION: '9.9.9', PRESETS, EASE, LOOPS, transitions: () => Object.keys(TRANSITIONS) };
  global.Storyboard = Storyboard; global.STORYBOARD = Storyboard;
})(typeof window !== 'undefined' ? window : this);
''', encoding='utf-8')
            want = {'presets': {'fadeIn', 'scene3d', 'popIn2', 'alias'}, 'transitions': {'cut', 'crossDissolve', 'starWipe'},
                    'loops': {'float', 'beat'}, 'eases': {'linear', 'outBack'}, 'exits': {'fadeOut', 'zoomOut'}}
            paths = [False] + ([True] if HAVE_NODE else [])
            for use_node in paths:
                reg = A.load_registry(eng, use_node=use_node, use_cache=True)
                for kind, names in want.items():
                    self.assertEqual(set(getattr(reg, kind)), names, f'{kind} via node={use_node}')
                self.assertEqual(reg.version, '9.9.9')
                self.assertEqual(reg.dur('alias'), 0.8)
                self.assertIn('scene3d', reg.continuous())
                self.assertIn('popIn2', reg.emphasis())
            if HAVE_NODE:
                cached = list(Path(os.environ['STORYBOARD_AUDIT_CACHE']).glob('*.json'))
                self.assertTrue(cached, 'node registry should be cached per engine hash')
                A._MEMO.clear()
                n_before = len(cached)
                reg = A.load_registry(eng, use_node=True, use_cache=True)      # served from the disk cache
                self.assertEqual(set(reg.transitions), want['transitions'])
                eng.write_text(eng.read_text(encoding='utf-8').replace('starWipe', 'heartWipe'), encoding='utf-8')
                reg2 = A.load_registry(eng, use_node=True, use_cache=True)
                self.assertIn('heartWipe', reg2.transitions)                   # new hash -> re-extracted
                self.assertGreater(len(list(Path(os.environ['STORYBOARD_AUDIT_CACHE']).glob('*.json'))), n_before)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_node_harness_sandbox(self):
        """A deck's engine copy runs in a vm context: no route to node's process / require / fs."""
        if not HAVE_NODE:
            self.skipTest('node not on PATH')
        tmp = Path(tempfile.mkdtemp(prefix='sb-audit-evil-'))
        try:
            marker = tmp / 'escaped.txt'
            eng = tmp / 'storyboard-engine.js'
            eng.write_text(r'''(function (global) {
  var found = {};
  function probe(name, fn) { try { var p = fn(); found[name] = (p && typeof p.exit === 'function') ? 'ESCAPED' : 'blocked'; }
                             catch (e) { found[name] = 'blocked'; } }
  probe('global', function () { return process; });
  probe('eval', function () { return (0, eval)('process'); });
  probe('Function', function () { return Function('return process')(); });
  probe('ctorChain', function () { return this.constructor.constructor('return process')(); });
  probe('document', function () { return document.constructor.constructor('return process')(); });
  probe('store', function () { return localStorage.constructor.constructor('return process')(); });
  probe('proto', function () { return ({}).constructor.constructor('return this')().process; });
  try { require('fs').writeFileSync(%r, 'x'); } catch (e) {}
  try { process.mainModule.require('fs').writeFileSync(%r, 'x'); } catch (e) {}
  var PRESETS = {};
  Object.keys(found).forEach(function (k) { PRESETS[k + '_' + found[k]] = { dur: 1 }; });
  global.Storyboard = { PRESETS: PRESETS, transitions: function () { return ['cut']; } };
})(typeof window !== 'undefined' ? window : this);
''' % (str(marker), str(marker)), encoding='utf-8')
            reg = A.load_registry(eng, use_node=True, use_cache=False)
            self.assertTrue(reg.source.startswith('node'), reg.notes)
            self.assertFalse(marker.exists(), 'engine code wrote a file through node')
            self.assertEqual(len(reg.presets), 7, sorted(reg.presets))
            self.assertFalse([n for n in reg.presets if n.endswith('ESCAPED')], sorted(reg.presets))
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_engine_features_current_engine(self):
        """Behaviour read from the engine source is the same on both extraction paths."""
        for use_node in [False] + ([True] if HAVE_NODE else []):
            reg = A.load_registry(ENGINE, use_node=use_node, use_cache=False)
            with self.subTest(node=use_node):
                self.assertTrue(reg.slide_map)                                  # SLIDE_BY_NUM (v0.8)
                self.assertEqual(reg.default_transition, 'crossDissolve')
                self.assertEqual(reg.transition_aliases.get('dissolve'), 'crossDissolve')
                for attr in A.FEATURE_ATTRS:
                    self.assertTrue(reg.reads_attr(attr), attr)
                self.assertTrue({'spring', 'scaleIn', 'tiltIn', 'cardFlip'} <= reg.emphasis(), sorted(reg.emphasis()))
                self.assertIn('confettiBurst', reg.fun())
                self.assertFalse(reg.emphasis() & reg.fun())                   # events(): emphasis = !fun && ...
                self.assertEqual(reg.caption_modes, {'karaoke', 'line', 'pop'})
                self.assertIn('lower-third', reg.caption_positions)
                self.assertIsNone(reg.load_error)
                self.assertIsNone(reg.load_warning)

    def test_legacy_inline_engine_is_not_filled_from_the_skill_engine(self):
        # the BASELINE vertical template embeds the legacy inline engine (the current one loads the engine file)
        text = _git_show('vertical_template.html')
        if text is None:
            self.skipTest('git / baseline commit unavailable')
        deck = A.Deck(SKILL / 'vertical_template.html', text)
        src = next((t for _, t in deck.inline_scripts if 'const PRESETS' in t), None)
        if src is None:
            self.skipTest('baseline vertical template has no inline engine')
        for use_node in [False] + ([True] if HAVE_NODE else []):
            reg = A.load_registry(source=src, label='<inline engine>', use_node=use_node, use_cache=False)
            with self.subTest(node=use_node):
                self.assertFalse(reg.slide_map)                                 # allSlides[n-1] + data-slide||'0'
                self.assertEqual(reg.default_transition, 'cut')
                self.assertEqual(reg.transitions, {'cut', 'dissolve', 'flash', 'whipPan', 'wipe', 'blocks'})
                self.assertFalse(reg.exits or reg.loops or reg.eases)           # nothing borrowed
                for attr in ('data-exit', 'data-loop', 'data-ease', 'data-then', 'data-stagger', 'data-hold',
                             'data-camera', 'data-captions'):
                    self.assertFalse(reg.reads_attr(attr), attr)
                self.assertTrue(reg.reads_attr('data-transition-in'))
                self.assertFalse(reg.supports_captions)

    def test_engine_health(self):
        good = ENGINE.read_text(encoding='utf-8')
        cases = {'empty': ('', 'empty'), 'html': ('<!doctype html><html><body>404 Not Found</body></html>', 'HTML'),
                 'truncated': (good[:40000], None), 'nodefine': ('(function(){ var x = 1; })();', 'never defines')}
        paths = [False] + ([True] if HAVE_NODE else [])
        for name, (src, needle) in cases.items():
            for use_node in paths:
                with self.subTest(case=name, node=use_node):
                    reg = A.load_registry(source=src, label=name, use_node=use_node, use_cache=False)
                    self.assertTrue(reg.load_error, f'{name}: expected a load error')
                    if needle:
                        self.assertIn(needle, reg.load_error)
        head = _git_show('storyboard-engine.js')
        for use_node in paths:                                                 # sane engines are healthy
            self.assertIsNone(A.load_registry(ENGINE, use_node=use_node, use_cache=False).load_error)
            if head:
                self.assertIsNone(A.load_registry(source=head, label='v0.3', use_node=use_node, use_cache=False).load_error)

    def test_registry_label_follows_the_caller(self):
        """Identical engine copies share the extraction memo, but each report names its own engine file."""
        tmp = Path(tempfile.mkdtemp(prefix='sb-audit-memo-'))
        try:
            reps = []
            for sub in ('one', 'two'):
                (tmp / sub).mkdir()
                reps.append(A.audit(build_deck(tmp / sub)))
            self.assertNotEqual(reps[0].stats['engine']['path'], reps[1].stats['engine']['path'])
            for sub, rep in zip(('one', 'two'), reps):
                self.assertEqual(Path(rep.registry.engine).parent.name, sub)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_registry_follows_the_deck_engine(self):
        """A name only the deck's own engine copy defines is known; the skill engine is not consulted."""
        tmp = Path(tempfile.mkdtemp(prefix='sb-audit-eng2-'))
        try:
            src = ENGINE.read_text(encoding='utf-8')
            marker = 'const PRESETS = {'
            self.assertIn(marker, src)
            custom = src.replace(marker, marker + "\n    zzCustomPreset: { dur: 0.6, apply(el,p){ el.style.opacity=p; } },", 1)
            eng = tmp / 'custom-engine.js'
            eng.write_text(custom, encoding='utf-8')
            slides = [(None, '<h1 class="anim" data-anim="zzCustomPreset" data-t-rel="0.2">Hi</h1>')] + CLEAN_SLIDES[1:]
            p = build_deck(tmp, slides=slides, engine=str(eng))
            rep = A.audit(p)
            self.assertFalse([f for f in rep.findings if f.check == 'unknown-name'], rep.render())
            self.assertTrue(any(f.check == 'engine-version' for f in rep.findings))   # differs from the skill copy
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


# --------------------------------------------------------------------------- clean deck + exit codes
class CleanDeckTests(DeckCase):
    def test_clean_deck_passes(self):
        rep = self.run_audit()
        self.assertEqual(rep.exit_code, 0, rep.render())
        self.assertEqual(rep.count('error') + rep.count('warn'), 0)
        for chk in ('engine', 'slides', 'timings', 'unknown-name', 'missing-asset', 'hook', 'text-density',
                    'overshoot', 'transitions', 'signature', 'diversity', 'breath', 'stacking', 'fonts', 'audio'):
            self.assertEqual(rep.checks.get(chk), 'pass', f'{chk}: {rep.checks.get(chk)}\n{rep.render()}')
        self.assertEqual(rep.stats['duration_source'], 'audio file')

    def test_clean_deck_passes_without_node(self):
        rep = self.run_audit(use_node=False)
        self.assertEqual(rep.exit_code, 0, rep.render())
        self.assertEqual(rep.registry.source, 'source-parse')


class CliTests(DeckCase):
    def cli(self, *args):
        return subprocess.run([sys.executable, str(SKILL / 'audit_deck.py'), *map(str, args)],
                              capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=120)

    def test_exit_codes_json_and_write(self):
        clean = build_deck(self.tmp)
        r = self.cli(clean)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn('PASS', r.stdout)

        warn_dir = self.tmp / 'warn'
        warn_dir.mkdir()
        slides = [CLEAN_SLIDES[0]] + [('pushLeft', s[1]) for s in CLEAN_SLIDES[1:]] + [('zoomIn', CLEAN_SLIDES[2][1])]
        warn = build_deck(warn_dir, slides=slides)                         # 4 showy transitions -> WARN only
        r = self.cli(warn, '--json')
        self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
        data = json.loads(r.stdout)
        self.assertEqual(data['exit_code'], 1)
        self.assertEqual(data['summary']['errors'], 0)
        self.assertTrue(any(f['check'] == 'transitions' and f['severity'] == 'warn' for f in data['findings']))
        for key in ('severity', 'check', 'slide', 'summary', 'snippet', 'line', 'detail', 'fix'):
            self.assertIn(key, data['findings'][0])
        self.assertIn('registry', data)

        err_dir = self.tmp / 'err'
        err_dir.mkdir()
        slides = [(None, '<h1 class="anim" data-anim="sprnig" data-t-rel="0.2">Oops</h1>')] + CLEAN_SLIDES[1:]
        err = build_deck(err_dir, slides=slides)
        r = self.cli(err, '--write')
        self.assertEqual(r.returncode, 2, r.stdout + r.stderr)
        self.assertIn('ERRORS', r.stdout)
        md = (err_dir / 'audit.md').read_text(encoding='utf-8')
        self.assertIn('## ERRORS', md)
        self.assertIn('sprnig', md)
        self.assertIn('spring', md)            # did-you-mean

        self.assertEqual(self.cli(self.tmp / 'nope.html').returncode, 2)

    def test_registry_flag(self):
        r = self.cli('--registry')
        self.assertEqual(r.returncode, 0, r.stderr)
        data = json.loads(r.stdout)
        self.assertIn('fadeIn', data['presets'])
        self.assertIn('cut', data['transitions'])
        self.assertEqual(self.cli().returncode, 2)                     # no deck, no --registry: usage error

    def test_html_entities_unescaped(self):
        slides = [(None, '<h1 class="anim" title="Q&amp;A" data-anim="fadeInn" data-t-rel="0.2">R&amp;D &gt; hype</h1>')] + CLEAN_SLIDES[1:]
        p = build_deck(self.tmp, slides=slides)
        r = self.cli(p)
        self.assertEqual(r.returncode, 2)
        self.assertIn('title="Q&A"', r.stdout)          # snippet: attributes unescaped
        self.assertIn('R&D > hype', r.stdout)          # snippet: text preview unescaped
        self.assertNotIn('&amp;', r.stdout)
        self.assertNotIn('&gt;', r.stdout)
        self.assertNotIn('&lt;', r.stdout)


# --------------------------------------------------------------------------- ERROR checks
class ErrorCheckTests(DeckCase):
    def test_unknown_names_with_suggestions(self):
        slides = [
            ('cut', '''<h1 class="anim" data-anim="sprnig" data-t-rel="0.2" data-ease="outBackk"
                        data-loop="flaot" data-exit="fadeOutt" data-exit-at="3">Hi</h1>
                       <p class="anim" data-anim="fadeUp" data-t-rel="0.5" data-then="pulse; wobbel">x</p>'''),
            ('pushleft', CLEAN_SLIDES[1][1]),
            ('sparkleWipe', CLEAN_SLIDES[2][1]),
            CLEAN_SLIDES[3],
        ]
        rep = self.run_audit(slides=slides)
        self.assertEqual(rep.exit_code, 2)
        self.assertIn('spring', self.assertFinding(rep, 'unknown-name', 'error', 'data-anim="sprnig"').fix)
        self.assertIn('outBack', self.assertFinding(rep, 'unknown-name', 'error', 'data-ease="outBackk"').fix)
        self.assertIn('float', self.assertFinding(rep, 'unknown-name', 'error', 'data-loop="flaot"').fix)
        self.assertIn('fadeOut', self.assertFinding(rep, 'unknown-name', 'error', 'data-exit="fadeOutt"').fix)
        # an unknown data-then step only drops that step -> WARN
        self.assertIn('wobble', self.assertFinding(rep, 'unknown-name', 'warn', 'wobbel').fix)
        f = self.assertFinding(rep, 'unknown-name', 'error', 'data-transition-in="pushleft"', slide=2)
        self.assertIn('pushLeft', f.fix)
        self.assertFinding(rep, 'unknown-name', 'error', 'data-transition-in="sparkleWipe"', slide=3)

    def test_wrong_attribute_hint_and_deck_defined_hold(self):
        slides = [('cut', CLEAN_SLIDES[0][1] + '<i class="anim" data-anim="fadeIn" data-t-rel="0.5" data-then="breathe">o</i>'
                          '<b class="anim" data-anim="float" data-t-rel="0.5">x</b>')] + CLEAN_SLIDES[1:]
        rep = self.run_audit(slides=slides)
        self.assertIn('use data-loop="breathe"', self.assertFinding(rep, 'unknown-name', 'warn', 'data-then="breathe"').fix)
        self.assertIn('use data-loop="float"', self.assertFinding(rep, 'unknown-name', 'error', 'data-anim="float"').fix)
        # a deck whose own code gives data-hold a meaning (a number here) is not second-guessed
        slides = [('cut', CLEAN_SLIDES[0][1] + '<b class="anim" data-anim="fadeIn" data-t-rel="0.5" data-hold="0.50">x</b>')] + CLEAN_SLIDES[1:]
        rep = self.run_audit(slides=slides, script_extra="document.querySelectorAll('b').forEach(el => el.dataset.hold);")
        self.assertNoFinding(rep, 'unknown-name')

    def test_registrations_in_external_deck_scripts(self):
        (self.tmp / 'session.js').write_text(
            "Storyboard.registerPreset('washDrift', { dur: 9999, apply(){} });\n"
            "Storyboard.registerEase('inhale', p => p);\n", encoding='utf-8')
        slides = [('cut', CLEAN_SLIDES[0][1] + '<div class="anim" data-anim="washDrift" data-t-rel="0"></div>'
                          '<p class="anim" data-anim="fadeIn" data-ease="inhale" data-t-rel="0.4">a</p>')] + CLEAN_SLIDES[1:]
        rep = self.run_audit(slides=slides, extra_body='<script src="session.js"></script>')
        self.assertNoFinding(rep, 'unknown-name')
        self.assertNoFinding(rep, 'missing-asset')
        # the deck's own definition (dur 9999) makes washDrift an ambient layer, not an entrance
        self.assertEqual(rep.registry.dur('washDrift'), 9999)
        self.assertEqual(rep.stats['entrances'], 10)

    def test_init_in_external_script_and_runtime_timings(self):
        # init lives in a local script and TIMINGS is computed at runtime: WARN, not a broken deck
        p = build_deck(self.tmp)
        text = p.read_text(encoding='utf-8')
        start = text.index('<script>\n  const TIMINGS')
        end = text.index('</script>', start) + len('</script>')
        text = text[:start] + '<script src="timeline.js"></script>\n<script src="boot.js"></script>' + text[end:]
        p.write_text(text, encoding='utf-8')
        (self.tmp / 'timeline.js').write_text('window.VIDEO = {"slides": [{"slide":1,"time":0},{"slide":2,"time":7},'
                                              '{"slide":3,"time":14},{"slide":4,"time":21}]};', encoding='utf-8')
        (self.tmp / 'boot.js').write_text('var TIMINGS = VIDEO.slides.map(function (s) { return {time: s.time, slide: s.slide}; });\n'
                                          'Storyboard.init({ timings: TIMINGS, fallbackDuration: 28 });', encoding='utf-8')
        rep = A.audit(p)
        self.assertNoFinding(rep, 'engine', 'error')
        self.assertFinding(rep, 'timings', 'warn', 'computed at runtime')
        self.assertEqual(rep.count('error'), 0, rep.render())

    def test_adopted_page_with_root_and_slide_selector(self):
        shutil.copyfile(ENGINE, self.tmp / 'storyboard-engine.js')
        write_wav(self.tmp / 'voiceover.wav', 20)
        page = '''<!doctype html><html><head><title>Adopted</title><style>body { font-family: Arial; }</style></head><body>
<main id="page">
  <section><h1 class="anim" data-anim="fadeUp" data-t-rel="0.2">Welcome</h1></section>
  <section><h2>How it works</h2></section>
  <section><h2>Get started</h2></section>
</main>
<audio id="voAudio" src="voiceover.wav" preload="auto"></audio>
<script src="storyboard-engine.js"></script>
<script>
  const TIMINGS = [{time: 0, slide: 1}, {time: 6, slide: 2}, {time: 12, slide: 3}];
  Storyboard.init({ timings: TIMINGS, root: '#page', slideSelector: 'section', scaleDeck: false, fallbackDuration: 20 });
</script></body></html>'''
        p = self.tmp / 'page.html'
        p.write_text(page, encoding='utf-8')
        rep = A.audit(p)
        self.assertEqual(rep.stats['slides'], 3)
        self.assertTrue(rep.stats.get('adopted'))
        self.assertNoFinding(rep, 'slides')
        self.assertNoFinding(rep, 'timings')
        self.assertEqual(rep.count('error'), 0, rep.render())
        # the same page with 2 cues for 3 slides is an error
        p.write_text(page.replace(', {time: 12, slide: 3}', ''), encoding='utf-8')
        self.assertFinding(A.audit(p), 'timings', 'error', 'has 2 cue(s) but the deck has 3 slide(s)')

    def test_known_names_including_digits_are_accepted(self):
        slides = [('cut', CLEAN_SLIDES[0][1] + '<div class="anim" data-anim="scene3d" data-dur="9999"></div>')] + CLEAN_SLIDES[1:]
        rep = self.run_audit(slides=slides)
        self.assertNoFinding(rep, 'unknown-name')
        self.assertIn('scene3d', rep.stats['preset_counts'])
        self.assertNoFinding(rep, 'overshoot')

    def test_unknown_name_inside_stagger_group(self):
        slides = [CLEAN_SLIDES[0], ('cut', '''<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2">List</h2>
            <ul class="anim-group" data-anim="slideInLeftt" data-stagger="0.2" data-t-rel="0.6"><li>a</li><li>b</li></ul>''')] + CLEAN_SLIDES[2:]
        rep = self.run_audit(slides=slides)
        self.assertFinding(rep, 'unknown-name', 'error', 'slideInLeftt', slide=2)

    def test_timings_count_mismatch(self):
        rep = self.run_audit(timings=[(0, 1), (7, 2), (14, 3)])
        self.assertFinding(rep, 'timings', 'error', 'has 3 cue(s) but the deck has 4 slide(s)')
        self.assertEqual(rep.exit_code, 2)
        ok = self.run_audit()
        self.assertNoFinding(ok, 'timings')

    def test_timings_not_ascending(self):
        rep = self.run_audit(timings=[(0, 1), (14, 2), (7, 3), (21, 4)])
        self.assertFinding(rep, 'timings', 'error', 'not ascending', slide=3)

    def test_cue_after_audio_end(self):
        rep = self.run_audit(audio_seconds=18)                         # slide 4 is cued at 21s
        self.assertFinding(rep, 'timings', 'error', 'never shown', slide=4)
        self.assertNoFinding(self.run_audit(), 'timings')

    def test_slide_numbering_gap(self):
        secs = []
        for k, (tr, inner) in zip((1, 2, 4, 5), CLEAN_SLIDES):
            secs.append(f'<section class="slide" data-slide="{k}" data-transition-in="{tr}">{inner}</section>')
        rep = self.run_audit(slides=secs, timings=[(0, 1), (7, 2), (14, 4), (21, 5)])
        self.assertFinding(rep, 'slides', 'error', 'gaps')
        self.assertEqual(rep.exit_code, 2)

    def _strip_slide_numbers(self, p, order=None):
        text = p.read_text(encoding='utf-8')
        if order is None:
            text = re.sub(r' data-slide="\d+"', '', text)
        else:
            it = iter(order)
            text = re.sub(r'data-slide="\d+"', lambda m: f'data-slide="{next(it)}"', text)
        p.write_text(text, encoding='utf-8')
        return p

    def test_slide_numbering_v08_engine(self):
        """v0.8 maps cues via data-slide with a position fallback: missing / reordered numbers play fine."""
        p = self._strip_slide_numbers(build_deck(self.tmp))
        rep = A.audit(p)
        self.assertNoFinding(rep, 'slides', 'error')
        self.assertFinding(rep, 'slides', 'info', 'numbers them by position')
        self.assertEqual(rep.exit_code, 0, rep.render())
        p = self._strip_slide_numbers(build_deck(self.tmp), order=(1, 3, 2, 4))
        rep = A.audit(p)
        self.assertNoFinding(rep, 'slides', 'error')
        self.assertFinding(rep, 'slides', 'info', 'not in document order')
        # duplicates: the second slide numbered 2 is never shown
        p = self._strip_slide_numbers(build_deck(self.tmp), order=(1, 2, 2, 4))
        rep = A.audit(p)
        self.assertFinding(rep, 'slides', 'error', 'duplicate data-slide="2"')
        # a non-integer number falls back to the position: WARN, not a broken deck
        p = self._strip_slide_numbers(build_deck(self.tmp), order=(1, 2, 'three', 4))
        rep = A.audit(p)
        self.assertFinding(rep, 'slides', 'warn', 'data-slide="three"', slide=3)
        self.assertNoFinding(rep, 'slides', 'error')

    def test_slide_numbering_legacy_engine(self):
        """A deck copy of the v0.3 baseline engine cues by data-slide but shows the N-th element."""
        head = _git_show('storyboard-engine.js')
        if head is None:
            self.skipTest('git / baseline commit unavailable')
        eng = self.tmp / 'legacy-engine.js'
        eng.write_text(head, encoding='utf-8')
        p = self._strip_slide_numbers(build_deck(self.tmp, engine=str(eng)))
        rep = A.audit(p)
        self.assertFalse(rep.registry.slide_map)
        self.assertFinding(rep, 'slides', 'error', 'cued at 0s')
        p = self._strip_slide_numbers(build_deck(self.tmp, engine=str(eng)), order=(1, 3, 2, 4))
        self.assertFinding(A.audit(p), 'slides', 'error', 'out of document order')

    def test_broken_deck_engine(self):
        good = ENGINE.read_text(encoding='utf-8')
        bodies = {'empty': '', 'truncated': good[:40000], 'html404': '<!doctype html><html><body>404 Not Found</body></html>'}
        for name, body in bodies.items():
            for use_node in [False] + ([True] if HAVE_NODE else []):
                with self.subTest(case=name, node=use_node):
                    p = build_deck(self.tmp)
                    (self.tmp / 'storyboard-engine.js').write_text(body, encoding='utf-8')
                    rep = A.audit(p, use_node=use_node, use_cache=False)
                    self.assertFinding(rep, 'engine', 'error', 'is broken')
                    self.assertEqual(rep.exit_code, 2)
                    self.assertTrue(rep.registry.presets)       # the other checks still ran on the skill registry

    def test_broken_ref_motion_path(self):
        svg = ('<svg viewBox="0 0 100 100"><path id="route" d="M0 0 L100 100"/>'
               '<circle class="anim" data-anim="motionPath" data-path="{}" data-t-rel="1" r="4"/></svg>')
        slides = [CLEAN_SLIDES[0], ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2">T</h2>' + svg.format('#nope'))] + CLEAN_SLIDES[2:]
        rep = self.run_audit(slides=slides)
        self.assertFinding(rep, 'broken-ref', 'error', 'data-path="#nope"', slide=2)
        self.assertEqual(rep.exit_code, 2)
        slides[1] = ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2">T</h2>' + svg.format('#route'))
        self.assertNoFinding(self.run_audit(slides=slides), 'broken-ref')
        slides[1] = ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2">T</h2>'
                            '<svg><circle class="anim" data-anim="motionPath" data-t-rel="1" r="4"/></svg>')
        self.assertFinding(self.run_audit(slides=slides), 'broken-ref', 'error', 'without data-path')

    def test_inline_legacy_engine_ignores_v08_attributes(self):
        """The baseline vertical template's inline engine never reads data-exit / data-loop / data-stagger ...:
        those are unsupported there (not validated against the skill engine)."""
        base = _git_show('vertical_template.html')
        if base is None:
            self.skipTest('git / baseline commit unavailable')
        if 'STORYBOARD ENGINE' not in base:
            self.skipTest('baseline vertical template has no inline engine')
        marker = 'class="slide" data-slide="1" data-transition-in="cut">'
        self.assertIn(marker, base)
        text = base.replace(marker, marker + '<p class="anim" data-anim="fadeIn" data-t-rel="0.2" data-exit="fadeOut" '
                            'data-exit-at="2" data-loop="float">bye</p><ul class="anim-group" data-stagger="0.2">'
                            '<li>a</li><li>b</li></ul>', 1)
        text = text.replace('data-slide="4" data-transition-in="cut"', 'data-slide="4" data-transition-in="pushLeft"', 1)
        p = self.tmp / 'storyboard.html'
        p.write_text(base, encoding='utf-8')
        before = A.audit(p, allow_placeholders=True).stats['entrances']
        p.write_text(text, encoding='utf-8')
        rep = A.audit(p, allow_placeholders=True)
        self.assertFinding(rep, 'unknown-name', 'error', 'data-exit="fadeOut" is not supported')
        self.assertFinding(rep, 'unknown-name', 'error', 'data-loop="float" is not supported')
        self.assertFinding(rep, 'unknown-name', 'error', 'data-transition-in="pushLeft"', slide=4)
        self.assertFinding(rep, 'unknown-name', 'warn', 'data-stagger is not supported')
        self.assertEqual(rep.stats['entrances'], before + 1)     # the <p>; the stagger children never animate

    def test_text_bearing_data_attributes_are_not_assets(self):
        slides = [('cut', CLEAN_SLIDES[0][1] + '''
            <div class="code-window" data-file="package.json">
              <span class="anim" data-anim="typewriter" data-t-rel="0.8" data-text="index.html">index.html</span>
              <span class="anim" data-anim="wordSwap" data-t-rel="1.0" data-words="app.js">app.js</span>
              <div class="anim" data-anim="fadeIn" data-t-rel="1.2" data-device="browser" data-url="yourapp.com/pricing.html"></div>
              <div data-unused="img/not-read-by-anything.png"></div>
            </div>''')] + CLEAN_SLIDES[1:]
        rep = self.run_audit(slides=slides)
        self.assertNoFinding(rep, 'missing-asset')
        # ... but a custom attribute the deck's own JS reads IS a file reference
        slides = [('cut', CLEAN_SLIDES[0][1] + '<div class="poster" data-poster-img="img/missing-poster.png"></div>')] + CLEAN_SLIDES[1:]
        rep = self.run_audit(slides=slides, script_extra="document.querySelectorAll('.poster').forEach(el => "
                                                         "el.style.backgroundImage = 'url(' + el.dataset.posterImg + ')');")
        self.assertFinding(rep, 'missing-asset', 'error', 'missing-poster.png', slide=1)

    def test_timings_follow_engine_parsing(self):
        # numeric strings are parseFloat / parseInt'ed by the engine: not malformed
        p = build_deck(self.tmp)
        text = p.read_text(encoding='utf-8').replace('{ time: 0.0, slide: 1 }', "{ time: '0', slide: '1' }")
        self.assertIn("slide: '1'", text)
        p.write_text(text, encoding='utf-8')
        rep = A.audit(p)
        self.assertNoFinding(rep, 'timings')
        self.assertEqual(rep.stats['timings_count'], 4)
        # timings: window.TIMINGS resolves to the literal
        text = text.replace('const TIMINGS = [', 'window.TIMINGS = [').replace('timings: TIMINGS', 'timings: window.TIMINGS')
        p.write_text(text, encoding='utf-8')
        rep = A.audit(p)
        self.assertNoFinding(rep, 'timings')
        self.assertEqual(rep.exit_code, 0, rep.render())
        # slide 0 is dropped by the engine (parseInt(slide) must be >= 1)
        rep = self.run_audit(timings=[(0, 0), (7, 2), (14, 3), (21, 4)])
        self.assertFinding(rep, 'timings', 'error', 'TIMINGS[0]')

    def test_empty_transition_attribute_is_the_default(self):
        slides = [CLEAN_SLIDES[0], ('', CLEAN_SLIDES[1][1])] + CLEAN_SLIDES[2:]
        p = build_deck(self.tmp, slides=slides)
        p.write_text(p.read_text(encoding='utf-8').replace('data-slide="2">', 'data-slide="2" data-transition-in="">'),
                     encoding='utf-8')
        rep = A.audit(p)
        self.assertNoFinding(rep, 'unknown-name')
        self.assertEqual(rep.stats['transitions']['breakdown'].get('crossDissolve'), 1)

    def test_crashed_error_class_check_fails_closed(self):
        def boom(self):
            raise RuntimeError('synthetic')
        p = build_deck(self.tmp)
        with mock.patch.object(A.Auditor, 'check_assets', boom):
            rep = A.audit(p)
        self.assertFinding(rep, 'internal', 'error', '"assets" crashed')
        self.assertEqual(rep.exit_code, 2)
        with mock.patch.object(A.Auditor, 'check_signature', boom):     # a WARN-class check: warnings only
            rep = A.audit(p)
        self.assertFinding(rep, 'internal', 'warn', '"signature" crashed')
        self.assertEqual(rep.exit_code, 1)

    def test_missing_local_assets(self):
        (self.tmp / 'present.png').write_bytes(b'\x89PNG')
        slides = [
            ('cut', CLEAN_SLIDES[0][1] + '''
              <img src="present.png" alt="">
              <img src="images/missing-hero.png" alt="">
              <div class="bg" style="background-image:url('img/missing-bg.jpg')"></div>
              <div class="anim" data-anim="lottie" data-src="lottie/missing-anim.json" data-t-rel="1"></div>
              <img src="https://example.com/remote.png" alt=""><img src="data:image/png;base64,AAAA" alt="">'''),
        ] + CLEAN_SLIDES[1:]
        rep = self.run_audit(slides=slides, style='body { font-family: Georgia, serif; } .x { background: url(missing-css.png); }')
        for name in ('missing-hero.png', 'missing-bg.jpg', 'missing-anim.json', 'missing-css.png'):
            self.assertFinding(rep, 'missing-asset', 'error', name)
        joined = ' '.join(f.summary for f in self.of(rep, 'missing-asset'))
        for name in ('present.png', 'remote.png', 'base64'):
            self.assertNotIn(name, joined)
        img = self.assertFinding(rep, 'missing-asset', 'error', 'missing-hero.png')
        self.assertEqual(img.slide, 1)
        self.assertIn('<img', img.snippet)

    def test_audio_missing_error_when_seeded_warn_when_not(self):
        words = [{'text': 'Launch', 'start': 0.1, 'end': 0.5}, {'text': 'day', 'start': 0.5, 'end': 0.9}]
        rep = self.run_audit(audio='voiceover.mp3', write_audio=False, words=words)
        self.assertFinding(rep, 'audio', 'error', 'voiceover.mp3')
        self.assertEqual(rep.exit_code, 2)
        shutil.rmtree(self.tmp)
        self.tmp.mkdir()
        rep = self.run_audit(audio='voiceover.mp3', write_audio=False)
        self.assertFinding(rep, 'audio', 'warn', 'not generated yet')
        self.assertNoFinding(rep, 'audio', 'error')
        self.assertNoFinding(rep, 'missing-asset')

    def test_engine_missing_next_to_deck(self):
        rep = self.run_audit(engine='none')
        self.assertFinding(rep, 'engine', 'error', 'storyboard-engine.js" not found')
        self.assertEqual(rep.exit_code, 2)

    def test_engine_never_loaded(self):
        rep = self.run_audit(engine='omit')
        self.assertFinding(rep, 'engine', 'error', 'never loads storyboard-engine.js')

    def test_commented_out_code_is_ignored(self):
        # a commented-out TIMINGS / init must not shadow the real ones
        extra = "/* const TIMINGS = [{time:0, slide:1}]; Storyboard.init({timings: [], fallbackDuration: 3}); */\n  // const WORDS = [1,2];"
        p = build_deck(self.tmp)
        text = p.read_text(encoding='utf-8').replace('<script>\n  const TIMINGS', '<script>\n  ' + extra + '\n  const TIMINGS', 1)
        p.write_text(text, encoding='utf-8')
        rep = A.audit(p)
        self.assertEqual(rep.exit_code, 0, rep.render())
        self.assertEqual(rep.stats['timings_count'], 4)


# --------------------------------------------------------------------------- WARN checks
class WarnCheckTests(DeckCase):
    def test_hook(self):
        slides = [('cut', '''<p class="anim" data-anim="fadeIn" data-t-rel="1.0">eyebrow</p>
                             <h1 class="anim" data-anim="spring" data-t-rel="2.0">Late headline</h1>''')] + CLEAN_SLIDES[1:]
        rep = self.run_audit(slides=slides)
        self.assertFinding(rep, 'hook', 'warn', 'nothing moves', slide=1)
        self.assertFinding(rep, 'hook', 'warn', 'headline only appears at 2.00s', slide=1)
        self.assertNoFinding(self.run_audit(), 'hook')

    def test_hook_headline_inside_animated_parent(self):
        slides = [('cut', '''<p class="anim" data-anim="fadeIn" data-t-rel="0.1">eyebrow</p>
                             <div class="anim" data-anim="fadeUp" data-t-rel="1.8"><h1>Nested</h1></div>''')] + CLEAN_SLIDES[1:]
        rep = self.run_audit(slides=slides)
        self.assertFinding(rep, 'hook', 'warn', 'headline only appears at 1.80s')
        self.assertNoFinding(rep, 'hook', 'error')

    def test_text_density_horizontal_and_vertical(self):
        many = ' '.join(f'word{k}' for k in range(34))
        slides = [CLEAN_SLIDES[0], ('cut', f'<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2">Title</h2><p>{many}</p>')] + CLEAN_SLIDES[2:]
        rep = self.run_audit(slides=slides)
        self.assertFinding(rep, 'text-density', 'warn', '35 words', slide=2)
        some = ' '.join(f'word{k}' for k in range(24))
        slides = [CLEAN_SLIDES[0], ('cut', f'<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2">Title</h2><p>{some}</p>')] + CLEAN_SLIDES[2:]
        self.assertNoFinding(self.run_audit(slides=slides), 'text-density')
        # the same 25 words exceed the 9:16 limit (18)
        rep = self.run_audit(slides=slides, width=1080, height=1920, body_attrs='data-captions="karaoke"')
        self.assertFinding(rep, 'text-density', 'warn', 'limit 18 for 9:16', slide=2)

    def test_text_density_respects_exits(self):
        a = ' '.join(f'alpha{k}' for k in range(20))
        b = ' '.join(f'beta{k}' for k in range(20))
        body = (f'<p class="anim" data-anim="fadeIn" data-t-rel="0.2" data-exit="fadeOut" data-exit-at="2.5">{a}</p>'
                f'<p class="anim" data-anim="fadeIn" data-t-rel="3.5">{b}</p>')
        slides = [CLEAN_SLIDES[0], ('cut', body)] + CLEAN_SLIDES[2:]
        self.assertNoFinding(self.run_audit(slides=slides), 'text-density')
        body = (f'<p class="anim" data-anim="fadeIn" data-t-rel="0.2">{a}</p>'
                f'<p class="anim" data-anim="fadeIn" data-t-rel="3.5">{b}</p>')
        slides = [CLEAN_SLIDES[0], ('cut', body)] + CLEAN_SLIDES[2:]
        self.assertFinding(self.run_audit(slides=slides), 'text-density', 'warn', '40 words')

    def test_vertical_without_captions(self):
        rep = self.run_audit(width=1080, height=1920)
        self.assertFinding(rep, 'captions', 'warn', 'vertical')
        self.assertEqual(rep.stats['aspect'], '9:16')
        words = [{'text': 'Launch', 'start': 0.1, 'end': 0.5}, {'text': 'day', 'start': 0.5, 'end': 0.9}]
        self.assertNoFinding(self.run_audit(width=1080, height=1920, body_attrs='data-captions="karaoke"', words=words),
                             'captions')
        rep = self.run_audit(width=1080, height=1920, init_extra=", captions: { mode: 'pop' }", words=words)
        self.assertNoFinding(rep, 'captions')
        # captions on but nothing to show yet (VO not generated)
        rep = self.run_audit(width=1080, height=1920, body_attrs='data-captions="line"')
        self.assertFinding(rep, 'captions', 'warn', 'no word timestamps')
        self.assertFalse([f for f in self.of(rep, 'captions') if 'vertical' in f.summary], rep.render())
        self.assertNoFinding(self.run_audit(width=1080, height=1920, body_attrs='data-captions="off"'), 'captions', 'error')
        self.assertFinding(self.run_audit(width=1080, height=1920, body_attrs='data-captions="off"'), 'captions', 'warn', 'vertical')
        self.assertNoFinding(self.run_audit(), 'captions')           # 16:9 needs none

    def test_captions_need_words_in_the_deck(self):
        """The engine reads WORDS only: word_timestamps.json next to the deck does not feed the captions."""
        (self.tmp / 'word_timestamps.json').write_text(json.dumps(
            {'source': 'edge-tts', 'audio': 'voiceover.wav', 'duration': 28.0,
             'words': [{'text': 'Launch', 'start': 0.1, 'end': 0.5}], 'cues': [{'slide': 1, 'time': 0.0}]}), encoding='utf-8')
        rep = self.run_audit(width=1080, height=1920, body_attrs='data-captions="karaoke"')
        self.assertFinding(rep, 'captions', 'warn', 'WORDS is empty although word_timestamps.json exists')
        self.assertEqual(rep.stats['duration_source'], 'word_timestamps.json')
        words = [{'text': 'Launch', 'start': 0.1, 'end': 0.5}]
        self.assertNoFinding(self.run_audit(width=1080, height=1920, body_attrs='data-captions="karaoke"', words=words),
                             'captions')

    def test_captions_follow_engine_semantics(self):
        """Only true / 'karaoke'|'line'|'pop' / {mode} (init) or an exact body mode enable captions."""
        words = [{'text': 'Launch', 'start': 0.1, 'end': 0.5}, {'text': 'day', 'start': 0.5, 'end': 0.9}]
        v = dict(width=1080, height=1920, words=words)
        for attrs in ('data-captions="true"', 'data-captions="on"', 'data-captions="Karaoke"', 'data-captions=""'):
            with self.subTest(body=attrs):
                rep = self.run_audit(body_attrs=attrs, **v)
                self.assertFalse(rep.stats['captions'])
                self.assertFinding(rep, 'captions', 'warn', 'is not a caption mode')
                self.assertFinding(rep, 'captions', 'warn', 'vertical')
        self.assertIn('case-sensitive', self.assertFinding(self.run_audit(body_attrs='data-captions="Karaoke"', **v),
                                                           'captions', 'warn', 'not a caption mode').summary)
        rep = self.run_audit(init_extra=", captions: 'on'", **v)
        self.assertFalse(rep.stats['captions'])
        self.assertFinding(rep, 'captions', 'warn', 'captions="on"')
        rep = self.run_audit(init_extra=', captions: 0', **v)             # explicit off: only the vertical WARN
        self.assertEqual([f.summary[:8] for f in self.of(rep, 'captions')], ['vertical'])
        for extra in (', captions: true', ", captions: 'line'", ", captions: { mode: 'pop', position: 'lower-third' }"):
            with self.subTest(init=extra):
                rep = self.run_audit(init_extra=extra, **v)
                self.assertTrue(rep.stats['captions'])
                self.assertNoFinding(rep, 'captions')
        rep = self.run_audit(init_extra=", captions: { mode: 'bogus' }", **v)   # object: on, mode falls back
        self.assertTrue(rep.stats['captions'])
        self.assertEqual(rep.stats['captions_mode'], 'karaoke')
        self.assertFinding(rep, 'captions', 'info', 'bogus')
        self.assertNoFinding(rep, 'captions', 'warn')
        # v0.8 _normCaptions: captions:false / 'off' in init OVERRIDES a valid body mode (no captions)
        for extra in (', captions: false', ", captions: 'off'"):
            with self.subTest(init=extra, body='pop'):
                rep = self.run_audit(init_extra=extra, body_attrs='data-captions="pop"', **v)
                self.assertFalse(rep.stats['captions'])
                self.assertFinding(rep, 'captions', 'info', 'overrides <body data-captions="pop">')
                self.assertFinding(rep, 'captions', 'warn', 'vertical')
        # true / {position} take the body's mode; an unknown init string falls through to the body attribute
        rep = self.run_audit(init_extra=', captions: true', body_attrs='data-captions="line"', **v)
        self.assertEqual((rep.stats['captions'], rep.stats['captions_mode']), (True, 'line'))
        rep = self.run_audit(init_extra=", captions: 'bogus'", body_attrs='data-captions="pop"', **v)
        self.assertEqual((rep.stats['captions'], rep.stats['captions_mode']), (True, 'pop'))
        self.assertIn('falls back to <body data-captions="pop">',
                      self.assertFinding(rep, 'captions', 'warn', 'captions="bogus"').summary)
        # position: init {position} > <body data-captions-position> > bottom; unknown values are INFO
        rep = self.run_audit(body_attrs='data-captions="pop" data-captions-position="lower-third"', **v)
        self.assertEqual(rep.stats['captions_position'], 'lower-third')
        self.assertNoFinding(rep, 'captions')
        rep = self.run_audit(body_attrs='data-captions="pop" data-captions-position="top"', **v)
        self.assertEqual(rep.stats['captions_position'], 'bottom')
        self.assertFinding(rep, 'captions', 'info', 'data-captions-position="top"')
        self.assertNoFinding(rep, 'captions', 'warn')
        # an unknown mode on a 16:9 deck still warns (the author asked for captions and gets none)
        self.assertFinding(self.run_audit(body_attrs='data-captions="yes please"', words=words), 'captions', 'warn',
                           'not a caption mode')

    def test_fonts_ignore_non_family_tokens(self):
        for st in (':root { --font-size-hero: clamp(3rem, 6vw, 7rem); } body { font-family: Georgia, serif; }',
                   ':root { --font-features: "ss01", "cv11"; } body { font-family: Georgia, serif; }',
                   ':root { --font-size-lg: min(4rem, 8vw); --font-weight-bold: 800; } body { font-family: Georgia, serif; }',
                   'body { font: italic small-caps bold 1rem/1.4 Georgia, serif; }',
                   'h1 { font: 700 clamp(3rem, 6vw, 7rem)/1.1 Georgia, serif; }'):
            with self.subTest(style=st):
                self.assertNoFinding(self.run_audit(style=st), 'fonts')
        rep = self.run_audit(style=':root { --font-headline: "Mystery Serif", serif; }')
        self.assertFinding(rep, 'fonts', 'warn', 'Mystery Serif')
        rep = self.run_audit(style='h1 { font: 700 clamp(3rem, 6vw, 7rem)/1.1 "Cool Display", sans-serif; }')
        self.assertFinding(rep, 'fonts', 'warn', 'Cool Display')

    def test_stacking_uses_the_engine_emphasis_classification(self):
        # scaleIn / tiltIn are engine EMPHASIS_PRESETS, wobble too: three on one element
        slides = [CLEAN_SLIDES[0], ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2">T</h2>'
                                           '<div id="kpi" class="anim" data-anim="scaleIn" data-t-rel="0.5" '
                                           'data-then="wobble; tiltIn">42</div>')] + CLEAN_SLIDES[2:]
        f = self.assertFinding(self.run_audit(slides=slides), 'stacking', 'warn', 'stacks 3', slide=2)
        for name in ('scaleIn', 'tiltIn', 'wobble'):
            self.assertIn(name, f.summary)
        slides[1] = ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2">T</h2>'
                            '<div class="anim" data-anim="scaleIn" data-t-rel="0.5" data-then="fadeOut">42</div>')
        self.assertNoFinding(self.run_audit(slides=slides), 'stacking')

    def test_word_hits_unknown_preset_and_dead_selector(self):
        hits = [{'time': 1.0, 'sel': 'h1', 'hit': 'pulze'}, {'time': 9.0, 'sel': '#nowhere', 'hit': 'pulse'}]
        rep = self.run_audit(word_hits=hits)
        f = self.assertFinding(rep, 'word-hits', 'warn', 'hit="pulze"')
        self.assertIn('pulse', f.fix)
        self.assertFinding(rep, 'word-hits', 'warn', '"#nowhere" matches nothing')
        self.assertNoFinding(rep, 'word-hits', 'error')
        self.assertNoFinding(self.run_audit(word_hits=[{'time': 1.0, 'sel': 'h1', 'hit': 'pulse'}]), 'word-hits')

    def test_hook_is_measured_on_the_video_clock(self):
        # slide 1 is on screen from t=0; a first cue at 2.0s keeps the opening frame static until 2.2s
        rep = self.run_audit(timings=[(2.0, 1), (7, 2), (14, 3), (21, 4)])
        f = self.assertFinding(rep, 'hook', 'warn', 'nothing moves in the first 0.6s of the video', slide=1)
        self.assertIn('2.20s', f.summary)
        self.assertIn('time 0', f.fix)
        self.assertFinding(rep, 'hook', 'warn', 'headline only appears at 2.20s')

    def test_attr_values_non_finite(self):
        slides = [CLEAN_SLIDES[0], ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2" data-dur="Infinity">T</h2>')] + CLEAN_SLIDES[2:]
        f = self.assertFinding(self.run_audit(slides=slides), 'attr-values', 'warn', 'data-dur="Infinity"', slide=2)
        self.assertIn("preset's default duration", f.summary)
        self.assertNotIn('NaN', f.summary)

    def test_word_hits_rate(self):
        hits = [{'time': 1.0 + k * 2.5, 'sel': 'h1', 'hit': 'pulse'} for k in range(8)]     # 8 in 28s = 17/min
        rep = self.run_audit(word_hits=hits)
        self.assertFinding(rep, 'word-hits', 'warn', '/min')
        self.assertNoFinding(self.run_audit(word_hits=hits[:2]), 'word-hits')

    def test_fonts_not_loaded(self):
        rep = self.run_audit(style="body { font-family: 'Fancy Grotesk', sans-serif; }")
        self.assertFinding(rep, 'fonts', 'warn', 'Fancy Grotesk')
        link = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fancy+Grotesk:wght@400;700&display=swap">'
        self.assertNoFinding(self.run_audit(style="body { font-family: 'Fancy Grotesk', sans-serif; }", head=link), 'fonts')
        ff = "@font-face { font-family: 'Fancy Grotesk'; src: url(present.woff2); } body { font-family: 'Fancy Grotesk'; }"
        (self.tmp / 'present.woff2').write_bytes(b'wOF2')
        self.assertNoFinding(self.run_audit(style=ff), 'fonts')
        self.assertNoFinding(self.run_audit(style=':root { --font-display: "Segoe UI", system-ui; } h1 { font: 700 64px/1.1 Arial, sans-serif; }'), 'fonts')
        rep = self.run_audit(style=':root { --font-display: "Mystery Serif", serif; }')
        self.assertFinding(rep, 'fonts', 'warn', 'Mystery Serif')

    def test_monotony(self):
        slides = [
            ('cut', '<h1 class="anim" data-anim="fadeUp" data-t-rel="0.2">A</h1><p class="anim" data-anim="fadeUp" data-t-rel="0.6">b</p>'),
            ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2">C</h2><p class="anim" data-anim="fadeUp" data-t-rel="0.6">d</p>'
                    '<p class="anim" data-anim="spring" data-t-rel="1.2">e</p>'),
            ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2">F</h2>'),
            ('cut', '<h2 class="anim" data-anim="spring" data-t-rel="0.2">G</h2><p class="anim" data-anim="fadeIn" data-t-rel="0.6">h</p>'),
        ]
        rep = self.run_audit(slides=slides)
        self.assertFinding(rep, 'monotony', 'warn', '"fadeUp"')
        self.assertNoFinding(self.run_audit(), 'monotony')

    def test_monotony_counts_stagger_children(self):
        items = ''.join(f'<li>item {k}</li>' for k in range(8))
        slides = [CLEAN_SLIDES[0], ('cut', f'<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2">List</h2>'
                                           f'<ul class="anim-group" data-anim="slideInLeft" data-stagger="0.1" data-t-rel="0.5">{items}</ul>')] + CLEAN_SLIDES[2:]
        rep = self.run_audit(slides=slides)
        self.assertFinding(rep, 'monotony', 'warn', '"slideInLeft"')

    def test_counter_duration(self):
        slides = [CLEAN_SLIDES[0], ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2">Stat</h2>'
                                           '<div class="anim" data-anim="counter" data-to="42" data-t-rel="0.5" data-dur="3.5">0</div>')] + CLEAN_SLIDES[2:]
        self.assertFinding(self.run_audit(slides=slides), 'counter-dur', 'warn', '3.5s', slide=2)
        ok = [CLEAN_SLIDES[0], ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2">Stat</h2>'
                                       '<div class="anim" data-anim="counter" data-to="42" data-t-rel="0.5" data-dur="1.8">0</div>')] + CLEAN_SLIDES[2:]
        self.assertNoFinding(self.run_audit(slides=ok), 'counter-dur')
        # a deck-defined real-time countdown is deliberately slow: not a count-up
        slow = [CLEAN_SLIDES[0], ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2">Breathe</h2>'
                                         '<span class="anim" data-anim="countdown" data-t-rel="0.5" data-dur="4.0">4</span>')] + CLEAN_SLIDES[2:]
        rep = self.run_audit(slides=slow, script_extra="Storyboard.registerPreset('countdown', { dur: 4, apply(){} });")
        self.assertNoFinding(rep, 'counter-dur')
        self.assertNoFinding(rep, 'unknown-name')

    def test_stacking_is_per_element(self):
        stacked = [CLEAN_SLIDES[0], ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2">T</h2>'
                                            '<div id="kpi" class="anim" data-anim="glow" data-t-rel="0.5" data-dur="2" data-then="shake" data-loop="pulse">42</div>')] + CLEAN_SLIDES[2:]
        self.assertFinding(self.run_audit(slides=stacked), 'stacking', 'warn', 'stacks 3', slide=2)
        # same class on three separate elements, one effect each: not stacking (old false positive)
        spread = [CLEAN_SLIDES[0], ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2">T</h2>'
                                           '<b class="kw anim" data-anim="glow" data-t-rel="0.5" data-dur="2">a</b>'
                                           '<b class="kw anim" data-anim="glow" data-t-rel="1.0" data-dur="2">b</b>'
                                           '<b class="kw anim" data-anim="glow" data-t-rel="1.5" data-dur="2">c</b>')] + CLEAN_SLIDES[2:]
        self.assertNoFinding(self.run_audit(slides=spread), 'stacking')

    def test_no_breath_slide(self):
        busy = ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2">A</h2><p class="anim" data-anim="fadeIn" data-t-rel="0.5">b</p>'
                       '<p class="anim" data-anim="spring" data-t-rel="1.0">c</p>')
        rep = self.run_audit(slides=[busy, busy, busy, busy])
        self.assertFinding(rep, 'breath', 'warn', 'never breathes')
        self.assertNoFinding(self.run_audit(), 'breath')

    def test_showy_transitions(self):
        slides = [CLEAN_SLIDES[0]] + [(t, CLEAN_SLIDES[2][1]) for t in ('pushLeft', 'zoomIn', 'glitch', 'flip3D')]
        rep = self.run_audit(slides=slides)
        f = self.assertFinding(rep, 'transitions', 'warn', '4 showy')
        self.assertIn('flip3D', f.detail)
        # quiet ones never count; a missing attribute is the engine default (crossDissolve)
        slides = [CLEAN_SLIDES[0]] + [(t, CLEAN_SLIDES[2][1]) for t in ('crossDissolve', 'fade', 'dissolve', None, 'cut',
                                                                         'pushLeft', 'zoomIn', 'glitch')]
        rep = self.run_audit(slides=slides)
        self.assertNoFinding(rep, 'transitions', 'warn')
        self.assertEqual(rep.stats['transitions']['showy'], 3)
        self.assertEqual(rep.stats['transitions']['breakdown'].get('crossDissolve'), 2)

    def test_overshoot_and_margin(self):
        late = [CLEAN_SLIDES[0], ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2">T</h2>'
                                         '<p class="anim" data-anim="fadeIn" data-t-rel="5.8" data-dur="1.0">late</p>')] + CLEAN_SLIDES[2:]
        f = self.assertFinding(self.run_audit(slides=late), 'overshoot', 'warn', 'past the safe point', slide=2)
        self.assertIn('0.4s margin', f.summary)
        # ends 0.3s before the cut: a warning at the default 0.4s margin, fine at --margin 0.2
        edge = [CLEAN_SLIDES[0], ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2">T</h2>'
                                         '<p class="anim" data-anim="fadeIn" data-t-rel="5.7" data-dur="1.0">edge</p>')] + CLEAN_SLIDES[2:]
        self.assertTrue(self.of(self.run_audit(slides=edge), 'overshoot', 'warn'))
        self.assertNoFinding(self.run_audit(slides=edge, margin=0.2), 'overshoot')

    def test_overshoot_ignores_continuous_layers(self):
        layers = ''.join(f'<div class="anim" data-anim="{n}" data-t-rel="0" data-dur="9999"></div>'
                         for n in ('filmGrain', 'cinematicGrade', 'aurora', 'sparkle'))
        slides = [('cut', CLEAN_SLIDES[0][1] + layers)] + CLEAN_SLIDES[1:]
        rep = self.run_audit(slides=slides)
        self.assertNoFinding(rep, 'overshoot')
        self.assertEqual(rep.exit_code, 0, rep.render())

    def test_overshoot_data_then_chain_and_absolute_t(self):
        chain = [CLEAN_SLIDES[0], ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2" data-then="pulse@6.5">T</h2>')] + CLEAN_SLIDES[2:]
        self.assertFinding(self.run_audit(slides=chain), 'overshoot', 'warn', 'data-then step', slide=2)
        absolute = [CLEAN_SLIDES[0], ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2">T</h2>'
                                             '<p class="anim" data-anim="fadeIn" data-t="13.5" data-dur="1.0">abs</p>')] + CLEAN_SLIDES[2:]
        self.assertFinding(self.run_audit(slides=absolute), 'overshoot', 'warn', slide=2)

    def test_atmosphere(self):
        # slide 4 is long (last slide lasts until the audio ends: 21 -> 40s = 19s)
        rep = self.run_audit(audio_seconds=40)
        self.assertFinding(rep, 'atmosphere', 'warn', slide=4)
        self.assertEqual(rep.stats['long_beats'], 1)
        # a last slide that ends with the audio is NOT assumed to be 60s long
        self.assertNoFinding(self.run_audit(), 'atmosphere')
        for layer in ('<div class="anim" data-anim="aurora" data-dur="9999"></div>',
                      '<div class="anim" data-anim="constellation" data-dur="9999"></div>',
                      '<div class="anim" data-anim="kenburns" data-dur="20"></div>',
                      '<i class="anim" data-anim="fadeIn" data-t-rel="3" data-loop="float">o</i>'):
            slides = CLEAN_SLIDES[:3] + [('pushLeft', CLEAN_SLIDES[3][1] + layer)]
            self.assertNoFinding(self.run_audit(slides=slides, audio_seconds=40), 'atmosphere')
        # a deck-wide grain layer outside the slides covers every beat
        grain = '<div class="anim grain" data-anim="filmGrain" data-dur="9999"></div>'
        self.assertNoFinding(self.run_audit(audio_seconds=40, extra_body=grain), 'atmosphere')
        # a camera move counts too -- in the engine's keyframe syntax ("t=>prop:value,...; ...")
        cam = CLEAN_SLIDES[:3] + [('pushLeft', f'<div class="camera" data-camera="0=>scale:1; 8=>scale:1.1,x:-20">'
                                               f'{CLEAN_SLIDES[3][1]}</div>')]
        self.assertNoFinding(self.run_audit(slides=cam, audio_seconds=40), 'atmosphere')
        # ... but a spec the engine cannot parse is a no-op camera: no atmosphere, and an attr-values WARN
        bad = CLEAN_SLIDES[:3] + [('pushLeft', f'<div class="camera" data-camera="0:1,8:1.1">{CLEAN_SLIDES[3][1]}</div>')]
        rep = self.run_audit(slides=bad, audio_seconds=40)
        self.assertFinding(rep, 'atmosphere', 'warn', slide=4)
        self.assertFinding(rep, 'attr-values', 'warn', 'data-camera="0:1,8:1.1"', slide=4)
        # keyframes that parse but never leave scale 1 / x 0 / y 0 do not move either
        still = CLEAN_SLIDES[:3] + [('pushLeft', f'<div class="camera" data-camera="4=>scale:1">{CLEAN_SLIDES[3][1]}</div>')]
        self.assertFinding(self.run_audit(slides=still, audio_seconds=40), 'atmosphere', 'warn', slide=4)
        # an unknown loop never runs, so it is no atmosphere (and is an unknown-name ERROR)
        flaot = CLEAN_SLIDES[:3] + [('pushLeft', CLEAN_SLIDES[3][1] + '<i class="anim" data-anim="fadeIn" data-t-rel="3" data-loop="flaot">o</i>')]
        rep = self.run_audit(slides=flaot, audio_seconds=40)
        self.assertFinding(rep, 'atmosphere', 'warn', slide=4)
        self.assertFinding(rep, 'unknown-name', 'error', 'data-loop="flaot"')

    def test_signature_recognises_kinetic_type_and_breaks_ties(self):
        slides = [
            ('cut', '<h1 class="anim" data-anim="letterSpring" data-t-rel="0.2">A</h1><p class="anim" data-anim="fadeUp" data-t-rel="0.8">b</p>'),
            ('cut', '<h2 class="anim" data-anim="letterSpring" data-t-rel="0.2">C</h2><p class="anim" data-anim="wordReveal" data-t-rel="0.8">d</p>'),
            ('cut', '<h2 class="anim" data-anim="fadeIn" data-t-rel="0.2">E</h2>'),
            ('cut', '<h2 class="anim" data-anim="letterSpring" data-t-rel="0.2">F</h2><p class="anim" data-anim="typewriter" data-t-rel="0.8">g</p>'
                    '<p class="anim" data-anim="slideInLeft" data-t-rel="1.4">h</p>'),
        ]
        rep = self.run_audit(slides=slides)
        self.assertNoFinding(rep, 'signature')
        self.assertEqual(rep.stats['signature']['preset'], 'letterSpring')
        # tie: spring and anticipate each on 1 beat -> the first used wins, deterministically
        tie = [('cut', '<h1 class="anim" data-anim="anticipate" data-t-rel="0.2">A</h1>'),
               ('cut', '<h2 class="anim" data-anim="spring" data-t-rel="0.2">B</h2>')] + CLEAN_SLIDES[2:3]
        for _ in range(2):
            rep = self.run_audit(slides=tie, timings=[(0, 1), (7, 2), (14, 3)])
            self.assertEqual(rep.stats['signature']['preset'], 'anticipate')

    def test_words_shape_and_order(self):
        good = [{'text': 'Launch', 'start': 0.1, 'end': 0.5}, {'text': 'day', 'start': 0.5, 'end': 0.9}]
        self.assertNoFinding(self.run_audit(words=good), 'words')
        bad = good + [{'text': 'back', 'start': 0.2, 'end': 0.4}, {'text': 'x', 'start': 1.0}]
        f = self.assertFinding(self.run_audit(words=bad), 'words', 'warn', '2 malformed')
        self.assertIn('before the previous word', f.summary)

    def test_sfx_overrides(self):
        ok = "const SFX = [{ t: 1.0, name: 'pop' }, { t: 3.0, file: 'boom.wav', gain_db: -18 }];"
        write_wav(self.tmp / 'boom.wav', 0.2)
        self.assertNoFinding(self.run_audit(script_extra=ok), 'sfx')
        bad = "const SFX = [{ t: 1.0, name: 'wooosh' }, { t: 3.0, file: 'nope.wav' }, { t: 99, name: 'pop' }];"
        rep = self.run_audit(script_extra=bad)
        if (SKILL / 'assets' / 'sfx' / 'manifest.json').is_file():          # names are validated against the library
            self.assertIn('whoosh', self.assertFinding(rep, 'sfx', 'warn', '"wooosh"').fix)
        self.assertFinding(rep, 'sfx', 'warn', 'nope.wav')
        self.assertFinding(rep, 'sfx', 'warn', 'outside the video')
        self.assertNoFinding(rep, 'sfx', 'error')
        self.assertNoFinding(self.run_audit(script_extra=bad, body_attrs='data-sfx="off"'), 'sfx')

    def test_unscheduled_and_attr_values(self):
        slides = [CLEAN_SLIDES[0], ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="fast">T</h2>'
                                           '<p data-anim="fadeIn">no anim class</p>')] + CLEAN_SLIDES[2:]
        rep = self.run_audit(slides=slides)
        self.assertFinding(rep, 'attr-values', 'warn', 'data-t-rel="fast"', slide=2)
        self.assertFinding(rep, 'unscheduled', 'warn', 'no class="anim"', slide=2)


# --------------------------------------------------------------------------- review round 3 fixes
PNG_1PX = bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63600000'
                        '02000154a24f5d0000000049454e44ae426082')


class CssCommentTests(DeckCase):
    def test_blank_comments_keeps_length_strings_and_newlines(self):
        css = '.a{color:red} /* url(x.png)\n @import "y.css"; */ .b::after{content:"/* not a comment */"} /* open'
        out = A.css_blank_comments(css)
        self.assertEqual(len(out), len(css))
        self.assertEqual(out.count('\n'), css.count('\n'))
        self.assertNotIn('x.png', out)
        self.assertNotIn('y.css', out)
        self.assertIn('"/* not a comment */"', out)                  # quoted strings are not comments
        self.assertNotIn('open', out)                                  # unterminated: runs to the end

    def test_commented_out_css_never_counts(self):
        (self.tmp / 'kit.css').write_text('/* legacy: .hero { background: url(img/old-hero.jpg) } */\n'
                                          '/* @import url("theme-old.css"); */\n.x{color:red}\n', encoding='utf-8')
        slides = [('cut', CLEAN_SLIDES[0][1] + '<div style="color:red; /* background:url(old-inline.png) */"></div>')] + CLEAN_SLIDES[1:]
        rep = self.run_audit(slides=slides, head='<link rel="stylesheet" href="kit.css">',
                             style='body{font-family:Georgia} /* .hero{background:url(old-bg.png)} */')
        self.assertNoFinding(rep, 'missing-asset')
        self.assertEqual(rep.exit_code, 0, rep.render())
        # ... but a url() after a quoted "/*" is live
        rep = self.run_audit(style='body{font-family:Georgia} .a::after{content:"/*"} .b{background:url(after-string.png)}')
        self.assertFinding(rep, 'missing-asset', 'error', 'after-string.png')

    def test_commented_out_font_face_is_not_loaded(self):
        rep = self.run_audit(style="/* @font-face{font-family:'Brand Sans';src:url(brand.woff2)} */ "
                                   "body{font-family:'Brand Sans', sans-serif}")
        self.assertFinding(rep, 'fonts', 'warn', 'Brand Sans')
        self.assertNoFinding(rep, 'missing-asset')

    def test_deck_size_from_custom_properties(self):
        p = build_deck(self.tmp)
        p.write_text(p.read_text(encoding='utf-8').replace(
            '.deck { width: 1920px; height: 1080px; }',
            ':root { --deck-w: 1080px; --deck-h: 1920px; } .deck { width: var(--deck-w); height: var(--deck-h, 999px); }', 1),
            encoding='utf-8')
        rep = A.audit(p)
        self.assertEqual((rep.stats['width'], rep.stats['height'], rep.stats['aspect']), (1080, 1920, '9:16'))

    def test_commented_out_deck_size_does_not_decide_the_aspect(self):
        p = build_deck(self.tmp, width=1080, height=1920)
        p.write_text(p.read_text(encoding='utf-8').replace(
            '<style>', '<style>\n  /* old: .deck { width: 1920px; height: 1080px; } */', 1), encoding='utf-8')
        rep = A.audit(p)
        self.assertEqual(rep.stats['aspect'], '9:16')
        self.assertFinding(rep, 'captions', 'warn', 'vertical')


class RenderPathTests(unittest.TestCase):
    """render_video.py serves ONLY the deck folder over http: model what its Chromium can load."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix='sb-audit-paths-'))
        self.deck = self.tmp / 'deck'
        (self.deck / 'sub').mkdir(parents=True)
        (self.deck / 'css').mkdir()
        for f in (self.tmp / 'outside.png', self.tmp / 'abs logo.png', self.deck / 'sub' / 'ok.png',
                  self.deck / 'clamped.png', self.tmp / 'clamped.png'):
            f.write_bytes(PNG_1PX)
        ap = (self.tmp / 'abs logo.png').as_posix()
        self.cases = {                                  # id -> (src, loads in the render?)
            'abs_posix': (ap, False), 'abs_win': (str(self.tmp / 'abs logo.png'), False),
            'file_url': ('file:///' + ap, False), 'unc': ('\\\\server\\share\\x.png', False),
            'up': ('../outside.png', False), 'up_clamped': ('../clamped.png', True),
            'backslash_rel': ('sub\\ok.png', True), 'root_rel': ('/sub/ok.png', True), 'root_up': ('/../sub/ok.png', True),
        }

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _deck(self, **kw):
        imgs = ''.join(f'<img id="{k}" src="{v[0]}" alt="">' for k, v in self.cases.items())
        (self.deck / 'css' / 'k.css').write_text('.x{background:url(../sub/ok.png)} .y{background:url(../../outside.png)}',
                                                 encoding='utf-8')
        slides = [('cut', CLEAN_SLIDES[0][1] + imgs)] + CLEAN_SLIDES[1:]
        return build_deck(self.deck, slides=slides, head='<link rel="stylesheet" href="css/k.css">', **kw)

    def _for(self, rep, needle):
        return [f for f in rep.findings if f.check == 'missing-asset' and needle in f.summary]

    def test_absolute_and_outside_references(self):
        rep = A.audit(self._deck())
        for key in ('abs_posix', 'abs_win', 'file_url', 'unc'):
            fs = self._for(rep, f'"{self.cases[key][0]}"')
            self.assertEqual([f.severity for f in fs], ['error'], f'{key}\n{rep.render()}')
            self.assertIn('absolute path', fs[0].summary)
        # above the deck folder: a file:// renderer loads it, render_video.py cannot -> WARN
        f = self._for(rep, '"../outside.png"')[0]
        self.assertEqual(f.severity, 'warn')
        self.assertIn('render_video.py requests outside.png', f.summary)
        self.assertIn('(a different file)', self._for(rep, '"../clamped.png"')[0].summary)
        self.assertEqual(self._for(rep, '"../../outside.png"')[0].severity, 'warn')    # from css/k.css
        for key in ('backslash_rel', 'root_rel', 'root_up'):
            self.assertFalse(self._for(rep, f'"{self.cases[key][0]}"'), f'{key}\n{rep.render()}')
        self.assertFalse(self._for(rep, '../sub/ok.png'))                              # css-relative, inside
        # a path above the deck that does not exist on disk is broken everywhere: ERROR
        (self.tmp / 'outside.png').unlink()
        f = self._for(A.audit(self._deck()), '"../outside.png"')[0]
        self.assertEqual(f.severity, 'error')
        self.assertIn('missing local file', f.summary)

    def test_engine_and_audio_paths(self):
        shutil.copyfile(ENGINE, self.tmp / 'storyboard-engine.js')
        write_wav(self.tmp / 'vo.wav', 28)
        p = self._deck(engine='none', audio=None)
        text = p.read_text(encoding='utf-8')
        up = text.replace('<script src="storyboard-engine.js">', '<script src="../storyboard-engine.js">') \
            .replace('</body>', '<audio id="voAudio" src="../vo.wav"></audio></body>')
        p.write_text(up, encoding='utf-8')
        rep = A.audit(p)
        self.assertEqual([f.severity for f in rep.findings if f.check == 'engine'], ['warn'], rep.render())
        self.assertIn('with render_video.py nothing plays', next(f for f in rep.findings if f.check == 'engine').summary)
        self.assertEqual([f.severity for f in rep.findings if f.check == 'audio'], ['warn'], rep.render())
        eng_abs = (self.tmp / 'storyboard-engine.js').as_posix()
        p.write_text(text.replace('<script src="storyboard-engine.js">', f'<script src="{eng_abs}">')
                     .replace('</body>', f'<audio id="voAudio" src="file:///{(self.tmp / "vo.wav").as_posix()}"></audio></body>'),
                     encoding='utf-8')
        rep = A.audit(p)
        self.assertIn('absolute path', next(f for f in rep.findings if f.check == 'engine' and f.severity == 'error').summary)
        self.assertIn('renders silent', next(f for f in rep.findings if f.check == 'audio' and f.severity == 'error').summary)
        self.assertTrue(rep.registry.presets)                        # the registry still comes from that file

    def test_model_matches_chromium(self):
        """Ground truth: every path form, served like render_video.py serves a deck (deck folder = web root)."""
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            self.skipTest('playwright not installed')
        import functools
        import http.server
        import threading
        self._deck()

        class Quiet(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *a):
                pass
        srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(self.deck)))
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        try:
            with sync_playwright() as pw:
                try:
                    browser = pw.chromium.launch()
                except Exception as e:                           # chromium not installed
                    self.skipTest(f'chromium unavailable: {e}')
                page = browser.new_page()
                local = f'http://127.0.0.1:{srv.server_address[1]}/'
                # no network: anything but the deck server fails, as it would for "\\server\share"
                page.route('**/*', lambda route: route.continue_() if route.request.url.startswith(local)
                           else route.abort())
                page.goto(local + 'storyboard.html')
                page.wait_for_function('Array.from(document.images).every(i => i.complete)', timeout=15000)
                loaded = dict(page.evaluate('ids => ids.map(id => [id, document.getElementById(id).naturalWidth > 0])',
                                            list(self.cases)))
                browser.close()
        finally:
            srv.shutdown()
            srv.server_close()
        for key, (src, loads) in self.cases.items():
            self.assertEqual(loaded[key], loads, f'{key} ({src}): chromium loaded={loaded[key]}')


class NameAndScheduleTests(DeckCase):
    def test_padded_names_are_unknown_like_in_the_engine(self):
        """The engine looks names up raw (EXITS[' fadeOut'] is unknown); only data-then steps are trimmed."""
        slides = [('cut', CLEAN_SLIDES[0][1] +
                   '<b class="anim" data-anim="fadeIn" data-t-rel="0.3" data-exit=" fadeOut" data-exit-at="2">x</b>'
                   '<i class="anim" data-anim="fadeIn" data-t-rel="0.4" data-loop="float " data-ease=" outBack">o</i>'
                   '<u class="anim" data-anim="fadeIn" data-t-rel="0.5" data-hold=" breathe" data-then=" pulse ; wobble ">u</u>'),
                  (' pushLeft ', CLEAN_SLIDES[1][1]), (' ', CLEAN_SLIDES[2][1]), CLEAN_SLIDES[3]]
        rep = self.run_audit(slides=slides)
        for needle in ('data-exit=" fadeOut"', 'data-loop="float "', 'data-ease=" outBack"', 'data-hold=" breathe"',
                       'data-transition-in=" pushLeft "'):
            f = self.assertFinding(rep, 'unknown-name', 'error', needle)
            self.assertIn('remove the spaces', f.fix)
        self.assertIn('all-whitespace', self.assertFinding(rep, 'unknown-name', 'error', 'data-transition-in=" "', slide=3).fix)
        self.assertFalse([f for f in self.of(rep, 'unknown-name') if 'pulse' in f.summary or 'wobble' in f.summary])
        self.assertEqual(rep.stats['transitions']['showy'], 1)          # " pushLeft " is a cut, not showy

    def test_data_then_step_with_two_ats_is_one_name(self):
        slides = [CLEAN_SLIDES[0], ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2" data-then="wobble@1@2">T</h2>')] + CLEAN_SLIDES[2:]
        self.assertFinding(self.run_audit(slides=slides), 'unknown-name', 'warn', 'wobble@1@2')

    def test_group_typo_is_reported_once_on_the_group(self):
        items = ''.join(f'<li>item {k}</li>' for k in range(12))
        slides = [CLEAN_SLIDES[0], ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2">L</h2>'
                                           f'<ul class="anim-group" data-anim="slideInLeftt" data-stagger="0.1" data-t-rel="0.5">'
                                           f'{items}<li data-anim="fadeUpp">own</li></ul>')] + CLEAN_SLIDES[2:]
        rep = self.run_audit(slides=slides)
        fs = self.of(rep, 'unknown-name')
        self.assertEqual(len(fs), 2, rep.render())
        grp = next(f for f in fs if 'slideInLeftt' in f.summary)
        self.assertIn('anim-group', grp.snippet)
        self.assertIn('<li', next(f for f in fs if 'fadeUpp' in f.summary).snippet)   # a child's own name

    def test_anim_group_without_stagger(self):
        ok = [('cut', CLEAN_SLIDES[0][1] + '<div class="anim-group"><p class="anim" data-anim="fadeIn" data-t-rel="0.5">a</p></div>')] + CLEAN_SLIDES[1:]
        rep = self.run_audit(slides=ok)
        self.assertNoFinding(rep, 'unscheduled')
        self.assertEqual(rep.exit_code, 0, rep.render())
        static = [('cut', CLEAN_SLIDES[0][1] + '<div class="anim-group"><p class="anim" data-anim="fadeIn" data-t-rel="0.5">a</p>'
                                              '<p>b</p></div>')] + CLEAN_SLIDES[1:]
        self.assertIn('1 of its 2 children has no class="anim"',
                      self.assertFinding(self.run_audit(slides=static), 'unscheduled', 'warn').summary)
        moving = [('cut', CLEAN_SLIDES[0][1] + '<div class="anim anim-group" data-anim="fadeIn" data-t-rel="0.5"><p>a</p></div>')] + CLEAN_SLIDES[1:]
        rep = self.run_audit(slides=moving)
        self.assertFinding(rep, 'unscheduled', 'info', 'moving with the group')
        self.assertNoFinding(rep, 'unscheduled', 'warn')

    def test_overshoot_fix_for_a_chain_step_moves_the_step(self):
        chain = [CLEAN_SLIDES[0], ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2" data-then="pulse@6.2">T</h2>')] + CLEAN_SLIDES[2:]
        f = self.assertFinding(self.run_audit(slides=chain), 'overshoot', 'warn', 'data-then step', slide=2)
        dur = A.load_registry(ENGINE).dur('pulse')
        self.assertIn(f'pulse@{14 - 0.4 - dur - 7.2:.2f}', f.fix)       # entrance starts 7.2s, cue 14s
        self.assertNotIn('data-dur', f.fix)

    def test_cut_on_an_engine_that_never_reads_transitions(self):
        eng = self.tmp / 'mini-engine.js'
        eng.write_text('''(function (global) {
  const PRESETS = { fadeIn: { dur: 0.8, apply() {} }, fadeUp: { dur: 0.8, apply() {} }, spring: { dur: 1, apply() {} } };
  global.Storyboard = { VERSION: '0.1.0', PRESETS, init() {} };
})(typeof window !== 'undefined' ? window : this);''', encoding='utf-8')
        slides = [('cut', '<h1 class="anim" data-anim="spring" data-t-rel="0.2">A</h1>'), ('cut', '<h2>B</h2>'),
                  ('pushLeft', '<h2>C</h2>')]
        rep = self.run_audit(slides=slides, engine=str(eng), timings=[(0, 1), (7, 2), (14, 3)])
        self.assertFalse(rep.registry.reads_attr('data-transition-in'))
        fs = [f for f in self.of(rep, 'unknown-name') if 'data-transition-in' in f.summary]
        self.assertEqual([(f.slide, f.severity) for f in fs], [(3, 'error')], rep.render())

    def test_empty_words_skip_reason(self):
        rep = self.run_audit()
        self.assertEqual(rep.checks.get('words'), 'skipped')
        self.assertIn('empty', rep.stats['skipped']['words'])

    def test_write_report_is_complete(self):
        imgs = ''.join(f'<img src="img/missing{k}.png" alt="">' for k in range(14))
        p = build_deck(self.tmp, slides=[('cut', CLEAN_SLIDES[0][1] + imgs)] + CLEAN_SLIDES[1:])
        rep = A.audit(p)
        self.assertEqual(rep.render(markdown=True).count('missing local file'), 14)
        txt = rep.render()
        self.assertEqual(txt.count('missing local file'), 10)
        self.assertIn('4 more [missing-asset]', txt)
        r = subprocess.run([sys.executable, str(SKILL / 'audit_deck.py'), str(p), '--write'], capture_output=True,
                           text=True, encoding='utf-8', errors='replace', timeout=120)
        self.assertEqual(r.returncode, 2)
        self.assertEqual((self.tmp / 'audit.md').read_text(encoding='utf-8').count('missing local file'), 14)


class FontKitTests(DeckCase):
    def test_remote_css_that_names_the_family(self):
        rep = self.run_audit(head='<link rel="stylesheet" href="https://rsms.me/inter/inter.css">',
                             style="body{font-family:'Inter var', Inter, sans-serif}")
        self.assertNoFinding(rep, 'fonts')
        self.assertIn('Inter var (rsms.me)', rep.stats['fonts_from_remote_css'])
        # an icon kit explains its own family only: another unloaded family still warns
        rep = self.run_audit(head='<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">',
                             style="i{font-family:'Font Awesome 6 Free'} body{font-family:'Unloaded Grotesk', sans-serif}")
        self.assertEqual([(f.severity, 'Unloaded Grotesk' in f.summary) for f in self.of(rep, 'fonts')], [('warn', True)])
        # unrelated remote CSS + a preconnect load no fonts
        rep = self.run_audit(head='<link rel="preconnect" href="https://fonts.gstatic.com">'
                                  '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/animate.css@4/animate.min.css">',
                             style="body{font-family:'Unloaded Grotesk', sans-serif}")
        self.assertFinding(rep, 'fonts', 'warn', 'Unloaded Grotesk')

    def test_opaque_kit_reports_every_unverified_family(self):
        rep = self.run_audit(head='<link rel="stylesheet" href="https://use.typekit.net/abc1234.css">',
                             style="h1{font-family:Poppins, sans-serif} p{font-family:'Brand Sans', serif}")
        fs = self.of(rep, 'fonts')
        self.assertEqual(sorted(f.severity for f in fs), ['info', 'info'])
        self.assertTrue(any('Poppins' in f.summary for f in fs) and any('Brand Sans' in f.summary for f in fs))
        self.assertIn('use.typekit.net', fs[0].summary)

    def test_local_css_import_chain(self):
        (self.tmp / 'fonts.css').write_text("@font-face{font-family:'Brand Sans';src:url(brand.woff2)}", encoding='utf-8')
        (self.tmp / 'kit.css').write_text('@import url("fonts.css");\n.x{color:red}', encoding='utf-8')
        (self.tmp / 'brand.woff2').write_bytes(b'wOF2')
        kw = dict(head='<link rel="stylesheet" href="kit.css">', style="body{font-family:'Brand Sans', serif}")
        rep = self.run_audit(**kw)
        self.assertNoFinding(rep, 'fonts')
        self.assertNoFinding(rep, 'missing-asset')
        (self.tmp / 'brand.woff2').unlink()
        self.assertFinding(self.run_audit(**kw), 'missing-asset', 'error', '"brand.woff2" (fonts.css url())')
        (self.tmp / 'fonts.css').unlink()
        self.assertFinding(self.run_audit(**kw), 'missing-asset', 'error', '"fonts.css" (kit.css @import)')


class CacheWriteTests(unittest.TestCase):
    def test_failed_replace_leaves_no_temp_file(self):
        tmp = Path(tempfile.mkdtemp(prefix='sb-audit-cachew-'))
        try:
            target = tmp / 'abc-s6.json'
            with mock.patch.object(A.os, 'replace', side_effect=PermissionError('in use')), \
                    mock.patch.object(A.time, 'sleep'):
                A._write_cache(target, {'x': 1})                 # target missing: retries, then gives up
                target.write_text('{}', encoding='utf-8')
                A._write_cache(target, {'x': 2})                 # a concurrent audit already wrote it
            self.assertEqual(sorted(p.name for p in tmp.iterdir()), ['abc-s6.json'])
            A._write_cache(target, {'x': 3})
            self.assertEqual(json.loads(target.read_text(encoding='utf-8')), {'x': 3})
            self.assertEqual(len(list(tmp.iterdir())), 1)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


# --------------------------------------------------------------------------- templates
def _git_show(rel):
    try:
        r = subprocess.run(['git', '-C', str(SKILL), 'show', f'v0.7-baseline:{rel}'], capture_output=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        return None
    return r.stdout.decode('utf-8') if r.returncode == 0 else None


GF_INTER = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap">'


class PlatformFontTests(DeckCase):
    """System fonts are per render OS: the local Chromium that renders the video only has this machine's."""

    def test_os_only_families_depend_on_the_render_platform(self):
        st = 'h1 { font-family: "Avenir Next", sans-serif; }'
        for plat in ('windows', 'linux'):
            with self.subTest(platform=plat):
                f = self.assertFinding(self.run_audit(style=st, platform=plat), 'fonts', 'warn', 'macOS system font')
                self.assertIn('falls back to sans-serif', f.summary)
                self.assertIn('Nunito Sans', f.fix)                         # a Google Fonts stand-in
                self.assertNotIn('family=Avenir', f.fix)                    # not on Google Fonts
        self.assertNoFinding(self.run_audit(style=st, platform='mac'), 'fonts')
        st = 'body { font-family: Calibri, sans-serif; }'
        self.assertNoFinding(self.run_audit(style=st, platform='windows'), 'fonts')
        self.assertFinding(self.run_audit(style=st, platform='mac'), 'fonts', 'warn', 'Windows system font')
        # the default test style (Georgia) ships with Windows + macOS, not with Linux
        self.assertNoFinding(self.run_audit(platform='windows'), 'fonts')
        self.assertFinding(self.run_audit(platform='linux'), 'fonts', 'warn', 'Windows / macOS system font')
        self.assertEqual(self.run_audit(platform='linux').stats['render_platform'], 'linux')

    def test_apple_hidden_system_font_never_resolves_by_name(self):
        st = 'h1 { font-family: "SF Pro Display", sans-serif; }'
        for plat in ('windows', 'mac', 'linux'):
            with self.subTest(platform=plat):
                f = self.assertFinding(self.run_audit(style=st, platform=plat), 'fonts', 'warn', 'SF Pro Display')
                self.assertIn('hidden', f.summary)
                self.assertIn('Inter', f.fix)
                self.assertIn('-apple-system', f.fix)
        (self.tmp / 'sf.woff2').write_bytes(b'wOF2')
        ff = '@font-face { font-family: "SF Pro Display"; src: url(sf.woff2); } ' + st
        self.assertNoFinding(self.run_audit(style=ff, platform='windows'), 'fonts')

    def test_native_stack_is_info_where_a_later_family_exists(self):
        st = "body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }"
        self.assertNoFinding(self.run_audit(style=st, platform='windows'), 'fonts')
        for plat in ('mac', 'linux'):
            with self.subTest(platform=plat):
                rep = self.run_audit(style=st, platform=plat)
                self.assertFinding(rep, 'fonts', 'info', 'renders in Helvetica')
                self.assertNoFinding(rep, 'fonts', 'warn')
        # a look-defining family is not a native stack: WARN even though Arial exists
        f = self.assertFinding(self.run_audit(style='h1 { font-family: Futura, Arial, sans-serif; }',
                                              platform='windows'), 'fonts', 'warn', 'Futura')
        self.assertIn('falls back to Arial', f.summary)

    def test_platform_resolution(self):
        for raw, want in (('win32', 'windows'), ('cygwin', 'windows'), ('darwin', 'mac'), ('linux', 'linux'),
                          ('Mac', 'mac'), ('freebsd13', 'linux')):
            self.assertEqual(A.render_platform(raw), want)
        with mock.patch.dict(os.environ, {'STORYBOARD_RENDER_PLATFORM': 'mac'}):
            self.assertEqual(A.render_platform(), 'mac')
            self.assertEqual(A.render_platform('linux'), 'linux')           # an explicit value wins
        with mock.patch.dict(os.environ, {'STORYBOARD_RENDER_PLATFORM': ''}), \
                mock.patch.object(A.sys, 'platform', 'darwin'):
            self.assertEqual(A.render_platform(), 'mac')                    # default: this machine
        p = build_deck(self.tmp, style='h1 { font-family: "Avenir Next", sans-serif; }')
        runs = {}
        for plat in ('mac', 'windows'):
            r = subprocess.run([sys.executable, str(SKILL / 'audit_deck.py'), str(p), '--json', '--platform', plat],
                               capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=120)
            runs[plat] = json.loads(r.stdout)
        self.assertFalse([f for f in runs['mac']['findings'] if f['check'] == 'fonts'])
        self.assertTrue([f for f in runs['windows']['findings'] if f['check'] == 'fonts' and f['severity'] == 'warn'])

    def test_important_flag_is_not_part_of_the_family(self):
        rep = self.run_audit(style='body { font-family: "Inter" !important; }', head=GF_INTER)
        self.assertNoFinding(rep, 'fonts')
        rep = self.run_audit(style="h1 { font-family: 'Inter', sans-serif !important; }", head=GF_INTER)
        self.assertNoFinding(rep, 'fonts')
        f = self.assertFinding(self.run_audit(style='body { font-family: "Inter" ! important; }'), 'fonts', 'warn',
                               'font "Inter" is not loaded')
        self.assertNotIn('Inter"', f.summary.replace('font "Inter" is', ''))
        self.assertIn('family=Inter:wght', f.fix)
        f = self.assertFinding(self.run_audit(style='body { font-family: "Inter", sans-serif !important; }'),
                               'fonts', 'warn', '"Inter"')
        self.assertIn('falls back to sans-serif', f.summary)


REG_BODY = '{ dur: 1.0, apply(el, p) { el.style.opacity = p; } }'


class DeckRegistrationTests(DeckCase):
    """Deck code registers names through Storyboard, window.STORYBOARD or an alias of a registry."""
    FORMS = {                                   # form -> (deck code, the engine really registers myThing?)
        'direct': (f'Storyboard.PRESETS.myThing = {REG_BODY};', True),
        'const_presets': (f'const PRESETS = Storyboard.PRESETS; PRESETS.myThing = {REG_BODY};', True),
        'const_p': (f'const P = Storyboard.PRESETS;\n  P.myThing = {REG_BODY};', True),
        'sb_alias': (f'const SB = window.Storyboard;\n  const Q = SB.PRESETS;\n  SB.PRESETS.myThing = {REG_BODY};', True),
        'destructure': (f"const {{ PRESETS: PP, EASE }} = window.STORYBOARD; PP['myThing'] = {REG_BODY};", True),
        'assign_alias': (f'let P = STORYBOARD.PRESETS; Object.assign(P, {{ myThing: {REG_BODY} }});', True),
        'copy': ('const P = Storyboard.PRESETS; P.myThing = P.spring;', True),
        'register': (f'const SB = Storyboard; SB.registerPreset("myThing", {REG_BODY});', True),
        'bare': (f'PRESETS.myThing = {REG_BODY};', False),              # ReferenceError: PRESETS is not global
        'own_object': (f'const PRESETS = {{}}; PRESETS.myThing = {REG_BODY};', False),
    }
    SLIDES = [('cut', CLEAN_SLIDES[0][1] + '<b class="anim" data-anim="myThing" data-t-rel="1.2">x</b>')] + CLEAN_SLIDES[1:]

    def _deck(self, form):
        d = self.tmp / form
        d.mkdir(exist_ok=True)
        return build_deck(d, slides=self.SLIDES, script_extra=self.FORMS[form][0])

    def test_alias_forms_register_like_the_engine(self):
        for form, (_, works) in self.FORMS.items():
            with self.subTest(form=form):
                rep = A.audit(self._deck(form))
                unknown = [f for f in self.of(rep, 'unknown-name', 'error') if 'myThing' in f.summary]
                self.assertEqual(bool(unknown), not works, rep.render())
                if form == 'copy':
                    self.assertEqual(rep.registry.presets['myThing'].get('dur'), rep.registry.presets['spring'].get('dur'))
                thrown = [f for f in unknown if 'ReferenceError' in f.summary]
                self.assertEqual(bool(thrown), form == 'bare', rep.render())
                if form == 'bare':
                    fix = next(f for f in unknown if 'data-anim="myThing"' in f.summary).fix
                    self.assertIn('const PRESETS = Storyboard.PRESETS', fix)

    def test_aliases_of_other_registries(self):
        code = ("const { EASE: E, LOOPS } = Storyboard; const SB = Storyboard, X = SB.EXITS;\n"
                "  E.myEase = p => p;\n  LOOPS.wiggle = (t, a, per) => `rotate(${Math.sin(t) * a}deg)`;\n"
                "  X.myExit = (el, p) => { el.style.opacity = 1 - p; };")
        slides = [('cut', CLEAN_SLIDES[0][1] + '<b class="anim" data-anim="fadeIn" data-t-rel="1.2" data-ease="myEase" '
                   'data-loop="wiggle" data-exit="myExit" data-exit-at="3">x</b>'
                   '<i class="anim" data-anim="fadeIn" data-t-rel="1.3" data-hold="wiggle">y</i>')] + CLEAN_SLIDES[1:]
        rep = self.run_audit(slides=slides, script_extra=code)
        self.assertNoFinding(rep, 'unknown-name')
        self.assertIn('wiggle', rep.registry.holds())
        self.assertEqual(A._registry_aliases(code)[1]['eases'], {'E'})

    def test_model_matches_chromium(self):
        """Ground truth: does the engine in Chromium end up with PRESETS.myThing for each form?"""
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            self.skipTest('playwright not installed')
        import functools
        import http.server
        import threading
        for form in self.FORMS:
            self._deck(form)

        class Quiet(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *a):
                pass
        srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(self.tmp)))
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        seen = {}
        try:
            with sync_playwright() as pw:
                try:
                    browser = pw.chromium.launch()
                except Exception as e:                           # chromium not installed
                    self.skipTest(f'chromium unavailable: {e}')
                page = browser.new_page()
                page.route('**/*.wav', lambda route: route.abort())      # no media: only the scripts matter
                errors = []
                page.on('pageerror', lambda e: errors.append(f'{getattr(e, "name", "")}: {getattr(e, "message", e)}'))
                for form in self.FORMS:
                    errors.clear()
                    page.goto(f'http://127.0.0.1:{srv.server_address[1]}/{form}/storyboard.html', wait_until='load')
                    page.wait_for_function('!!window.Storyboard', timeout=15000)
                    seen[form] = (page.evaluate('!!(window.Storyboard.PRESETS && window.Storyboard.PRESETS.myThing)'),
                                  any('ReferenceError' in e or 'is not defined' in e for e in errors))
                browser.close()
        finally:
            srv.shutdown()
            srv.server_close()
        for form, (_, works) in self.FORMS.items():
            self.assertEqual(seen[form][0], works, f'{form}: chromium registered={seen[form][0]}')
            self.assertEqual(seen[form][1], form == 'bare', f'{form}: ReferenceError={seen[form][1]}')


class InitAndDiscoveryTests(DeckCase):
    def _rewrite(self, p, *pairs):
        text = p.read_text(encoding='utf-8')
        for a, b in pairs:
            self.assertIn(a, text)
            text = text.replace(a, b)
        p.write_text(text, encoding='utf-8')
        return A.audit(p)

    def test_template_content_and_out_of_root_slides_are_not_slides(self):
        slides = CLEAN_SLIDES[:3] + [(CLEAN_SLIDES[3][0], CLEAN_SLIDES[3][1] +
                                      '<template id="tpl"><section class="slide" data-slide="5"><h2 class="anim" '
                                      'data-anim="fadeUp">clone me</h2></section></template>')]
        rep = self.run_audit(slides=slides, extra_body='<section class="slide" data-slide="6"><h2>stray</h2></section>')
        self.assertEqual(rep.stats['slides'], 4, rep.render())
        self.assertNoFinding(rep, 'timings', 'error')
        self.assertNoFinding(rep, 'slides')
        # a hit selector that only matches inside <template> matches nothing for the engine
        rep = self.run_audit(slides=slides, word_hits=[{'time': 22.0, 'sel': '#tpl h2', 'hit': 'pulse'}])
        self.assertFinding(rep, 'word-hits', 'warn', 'matches nothing')
        # without a .deck / #deck root the whole document is searched (legacy decks)
        p = build_deck(self.tmp)
        rep = self._rewrite(p, ('<div class="deck" id="deck">', '<div class="stage-inner">'),
                            ('.deck {', '.stage-inner {'))
        self.assertEqual(rep.stats['slides'], 4, rep.render())

    def test_init_with_a_config_object(self):
        p = build_deck(self.tmp)
        cfg = (('Storyboard.init({', 'const CFG = {'), (' });\n</script>', ' };\n  Storyboard.init(CFG);\n</script>'))
        rep = self._rewrite(p, *cfg)                             # CFG = {timings: TIMINGS, ...}: the tools' const
        self.assertNoFinding(rep, 'timings')
        self.assertEqual(rep.stats['timings_count'], 4)
        # the cues live inside CFG: audited, but the tools cannot re-seed them
        p = build_deck(self.tmp)
        lit = '[{time: 0, slide: 1}, {time: 7, slide: 2}, {time: 14, slide: 3}, {time: 21, slide: 4}]'
        rep = self._rewrite(p, *cfg, ('timings: TIMINGS', f'timings: {lit}'))
        f = self.assertFinding(rep, 'timings', 'warn', 'CFG.timings')
        self.assertIn('const TIMINGS', f.fix)
        self.assertNoFinding(rep, 'timings', 'error')
        p = build_deck(self.tmp)
        three = '[{time: 0, slide: 1}, {time: 7, slide: 2}, {time: 14, slide: 3}]'       # 3 cues, 4 slides
        rep = self._rewrite(p, *cfg, ('timings: TIMINGS', f'timings: {three}'))
        self.assertFinding(rep, 'timings', 'error', 'TIMINGS has 3 cue(s) but the deck has 4 slide(s)')
        # an inline literal in init({...}) has the same tools problem
        p = build_deck(self.tmp)
        self.assertFinding(self._rewrite(p, ('timings: TIMINGS,', f'timings: {lit},')), 'timings', 'warn',
                           'inline array')
        # options built at runtime: can't audit the cues -> WARN, never the "no TIMINGS" ERROR
        p = build_deck(self.tmp)
        rep = self._rewrite(p, ('const TIMINGS', 'const CUES'), ('Storyboard.init({', 'function makeCfg() { return {'),
                            (' });\n</script>', ' }; }\n  Storyboard.init(makeCfg());\n</script>'),
                            ('timings: TIMINGS', 'timings: CUES'))
        self.assertFinding(rep, 'timings', 'warn', 'builds its options at runtime')
        self.assertNoFinding(rep, 'timings', 'error')
        # ... with the const TIMINGS still declared, the audit uses it (INFO)
        p = build_deck(self.tmp)
        rep = self._rewrite(p, ('Storyboard.init({', 'function makeCfg() { return {'),
                            (' });\n</script>', ' }; }\n  Storyboard.init(makeCfg());\n</script>'))
        self.assertFinding(rep, 'timings', 'info', 'builds its options at runtime')
        self.assertNoFinding(rep, 'timings', 'warn')
        self.assertEqual(rep.stats['timings_count'], 4)

    def test_hold_runs_only_function_loops(self):
        timings = [(0, 1), (7, 2), (20, 3), (27, 4)]                   # slide 2 holds 13s
        for hold, known in (('shimmer', False), ('beat', False), ('breathe', True), ('drift', False)):
            slides = [CLEAN_SLIDES[0], ('cut', f'<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2" '
                                               f'data-hold="{hold}">T</h2>')] + CLEAN_SLIDES[2:]
            with self.subTest(hold=hold):
                rep = self.run_audit(slides=slides, timings=timings)
                fs = [f for f in self.of(rep, 'unknown-name', 'error') if f'data-hold="{hold}"' in f.summary]
                self.assertEqual(bool(fs), not known, rep.render())
                self.assertEqual(bool(self.of(rep, 'atmosphere', 'warn')), not known, rep.render())
                if hold in ('shimmer', 'beat'):
                    self.assertIn(f'data-loop="{hold}"', fs[0].fix)
                    self.assertIn('data-hold="breathe"', fs[0].fix)
        # as a data-loop the special-cased names do run
        slides = [CLEAN_SLIDES[0], ('cut', '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2" '
                                           'data-loop="shimmer">T</h2>')] + CLEAN_SLIDES[2:]
        rep = self.run_audit(slides=slides, timings=timings)
        self.assertNoFinding(rep, 'unknown-name')
        self.assertNoFinding(rep, 'atmosphere', 'warn')
        for use_node in (True, False):
            reg = A.load_registry(ENGINE, use_node=use_node, use_cache=False)
            self.assertTrue(reg.hold_fn_only)
            self.assertIn('shimmer', reg.loops)
            self.assertNotIn('shimmer', reg.holds())

    def test_word_hit_applies_to_the_first_match_only(self):
        kw = '<b class="kw anim" data-anim="glow" data-t-rel="1.2" data-then="shake">a</b>' \
             '<b class="kw anim" data-anim="glow" data-t-rel="1.4" data-then="shake">b</b>'
        slides = [('cut', CLEAN_SLIDES[0][1] + kw)] + CLEAN_SLIDES[1:]
        rep = self.run_audit(slides=slides, word_hits=[{'time': 3.0, 'sel': '.kw', 'hit': 'pulse'}])
        fs = self.of(rep, 'stacking', 'warn')
        self.assertEqual(len(fs), 1, rep.render())
        self.assertIn('>a', fs[0].snippet)
        # an unknown hit preset runs as pulse in the engine: still an emphasis effect
        rep = self.run_audit(slides=slides, word_hits=[{'time': 3.0, 'sel': '.kw', 'hit': 'pulze'}])
        self.assertEqual(len(self.of(rep, 'stacking', 'warn')), 1)

    def test_unregistered_names_are_no_signature_move(self):
        # popIn is in the engine's EMPHASIS_PRESETS but not a preset: the engine plays fadeIn
        slides = [(tr, inner.replace('data-anim="spring"', 'data-anim="popIn"')) for tr, inner in CLEAN_SLIDES]
        rep = self.run_audit(slides=slides)
        self.assertFinding(rep, 'unknown-name', 'error', 'data-anim="popIn"')
        self.assertNoFinding(rep, 'stacking')
        self.assertNotEqual((rep.stats.get('signature') or {}).get('preset'), 'popIn')


class TemplateTests(DeckCase):
    def _audit_text(self, text, allow=True):
        p = self.tmp / 'storyboard.html'
        p.write_text(text, encoding='utf-8')
        shutil.copyfile(ENGINE, self.tmp / 'storyboard-engine.js')
        return A.audit(p, allow_placeholders=allow)

    def test_baseline_templates_have_no_errors(self):
        for rel, vertical in (('template.html', False), ('vertical_template.html', True)):
            text = _git_show(rel)
            if text is None:
                self.skipTest('git / baseline commit unavailable')
            rep = self._audit_text(text)
            with self.subTest(template=rel):
                self.assertEqual(rep.count('error'), 0, rep.render())
                self.assertEqual(rep.stats['slides'], 6)
                self.assertEqual(rep.stats['timings_count'], 6)
                self.assertEqual(rep.stats['aspect'], '9:16' if vertical else '16:9')
                for chk in ('slides', 'timings', 'unknown-name', 'missing-asset', 'overshoot', 'transitions', 'hook'):
                    self.assertEqual(rep.checks.get(chk), 'pass', f'{chk}\n{rep.render()}')
                self.assertTrue(self.of(rep, 'placeholders', 'info'))       # allowed -> info only
                self.assertEqual(bool(self.of(rep, 'captions', 'warn')), vertical)
            strict = self._audit_text(text, allow=False)
            self.assertTrue(self.of(strict, 'placeholders', 'warn'))

    def test_current_templates_have_no_errors(self):
        for rel in ('template.html', 'vertical_template.html'):
            p = SKILL / rel
            if not p.is_file():
                continue
            rep = self._audit_text(p.read_text(encoding='utf-8'))
            with self.subTest(template=rel):
                self.assertEqual(rep.count('error'), 0, rep.render())


if __name__ == '__main__':
    unittest.main()

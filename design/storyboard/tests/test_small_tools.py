"""Tests for the small storyboard tools:
aaf_to_timings.py, compress_anim_timings.py, validate_character.py,
rigger.html (headless Chromium), lottie-library.json + lottie_fetch.py.

Run:  python -m unittest discover -s tests -p "test_*.py"
No network. The AAF tests need pyaaf2, the rigger tests need Playwright +
Chromium, the engine-preset test needs node (each is skipped when missing).
"""
import contextlib
import functools
import http.server
import importlib
import io
import json
import os
import re
import shutil
import socketserver
import subprocess
import sys
import tempfile
import threading
import unittest
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SKILL))

import compress_anim_timings as cat  # noqa: E402
import validate_character as vc      # noqa: E402

try:
    import aaf2  # noqa: F401
    HAVE_AAF = True
except Exception:
    HAVE_AAF = False

try:
    from playwright.sync_api import sync_playwright
    HAVE_PW = True
except Exception:
    HAVE_PW = False

NODE = shutil.which('node')


def run_cli(script, *args, cwd=None):
    """Run a tool as a real subprocess -> (exit code, stdout, stderr)."""
    env = dict(os.environ, PYTHONIOENCODING='utf-8')
    p = subprocess.run([sys.executable, str(SKILL / script), *map(str, args)],
                       capture_output=True, text=True, encoding='utf-8', errors='replace',
                       cwd=cwd, env=env, timeout=120)
    return p.returncode, p.stdout, p.stderr


def run_tool(script, *args):
    """Run a tool's main(argv) in-process (much faster than a subprocess per call)
    -> (exit code, stdout, stderr), with sys.exit('msg') printed to stderr like the CLI."""
    mod = importlib.import_module(Path(script).stem)
    out, err = io.StringIO(), io.StringIO()
    code = 0
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        try:
            mod.main([str(a) for a in args])
        except SystemExit as ex:
            if ex.code is None:
                code = 0
            elif isinstance(ex.code, int):
                code = ex.code
            else:
                print(ex.code, file=sys.stderr)
                code = 1
    return code, out.getvalue(), err.getvalue()


class TempDirCase(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix='sb_small_'))

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)


# ---------------------------------------------------------------------------
# aaf_to_timings.py
# ---------------------------------------------------------------------------
def build_aaf(path, tracks, rate=48000):
    """Synthetic AAF: one composition, one sound slot per track. Each track is a
    list of (kind, seconds, name) with kind 'clip' (a SourceClip -> master mob),
    'fill' (Filler = silence) or 'trans' (a Transition: a crossfade overlapping
    its two neighbours by `seconds`)."""
    with aaf2.open(str(path), 'w') as f:
        comp = f.create.CompositionMob('Narration')
        f.content.mobs.append(comp)
        opdef = None
        for ti, clips in enumerate(tracks):
            slot = comp.create_empty_sequence_slot(rate, media_kind='sound')
            slot.name = 'A%d' % (ti + 1)
            seq = slot.segment
            for kind, secs, name in clips:
                n = int(round(secs * rate))
                if kind == 'fill':
                    seq.components.append(f.create.Filler('sound', n))
                elif kind == 'trans':
                    if opdef is None:
                        opdef = f.create.OperationDef(aaf2.auid.AUID('0c3bea41-fc05-11d2-8a29-0050040ef7d2'),
                                                      'MonoAudioDissolve', '')
                        f.dictionary.register_def(opdef)
                        opdef.media_kind = 'sound'
                        opdef['NumberInputs'].value = 2
                    tr = f.create.Transition('sound', n)
                    tr['OperationGroup'].value = f.create.OperationGroup(opdef, n, media_kind='sound')
                    tr['CutPoint'].value = n // 2
                    seq.components.append(tr)
                else:
                    mm = f.create.MasterMob(name)
                    f.content.mobs.append(mm)
                    ms = mm.create_empty_sequence_slot(rate, media_kind='sound')
                    ms.segment.components.append(f.create.Filler('sound', n))
                    seq.components.append(mm.create_source_clip(ms.slot_id, 0, n, media_kind='sound'))
    return path


NARRATION = [('clip', 3.0, 'Intro'), ('fill', 1.0, ''),
             ('clip', 4.2, 'Beat two a'), ('clip', 0.5, 'breath'), ('clip', 2.4, 'Beat two b'),
             ('fill', 0.9, ''), ('clip', 5.0, 'Beat three'), ('fill', 1.2, ''),
             ('clip', 1.4, 'Try it free.')]
MUSIC = [('fill', 0.5, ''), ('clip', 20.0, 'Music bed')]


def deck_html(n_slides, timings=True, nl='\n'):
    slides = ''.join(f'<section class="slide" data-slide="{i}"><h1>S{i}</h1></section>'
                     for i in range(1, n_slides + 1))
    t = ''
    if timings:
        rows = ',\n'.join(f'    {{ time: {i * 2.0:.2f}, slide: {i + 1} }}' for i in range(n_slides))
        t = f'  const TIMINGS = [\n{rows}\n  ];\n'
    html = ('<!DOCTYPE html>\n<html><head><meta charset="utf-8"></head><body>\n'
            f'<div class="deck">{slides}</div>\n'
            '<!-- const TIMINGS = [ { time: 0, slide: 1 } ]; (commented out) -->\n'
            '<script src="storyboard-engine.js"></script>\n<script>\n'
            f'{t}'
            "  const SLIDE_LABELS = ['a'];\n"
            '  Storyboard.init({ timings: TIMINGS, labels: SLIDE_LABELS, fallbackDuration: 30 });\n'
            '</script>\n</body></html>\n')
    if not timings:
        html = html.replace('timings: TIMINGS, ', '')
    return html.replace('\n', nl)


def js_timings(html):
    m = re.search(r'const TIMINGS\s*=\s*\[(.*?)\];', html.split('(commented out) -->')[-1], re.S)
    return [(float(a), int(b)) for a, b in re.findall(r'time:\s*([\d.]+),\s*slide:\s*(\d+)', m.group(1))] if m else None


@unittest.skipUnless(HAVE_AAF, 'pyaaf2 not installed')
class AafToTimingsTests(TempDirCase):
    @classmethod
    def setUpClass(cls):
        cls.aaf_dir = Path(tempfile.mkdtemp(prefix='sb_aaf_'))
        cls.aaf_path = build_aaf(cls.aaf_dir / 'narration.aaf', [NARRATION, MUSIC])

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.aaf_dir, ignore_errors=True)

    def setUp(self):
        super().setUp()
        self.aaf = self.aaf_path

    def test_list_shows_every_track(self):
        code, out, err = run_cli('aaf_to_timings.py', self.aaf, '--list')   # real CLI once
        self.assertEqual(code, 0, err)
        self.assertIn('2 track(s)', out)
        self.assertRegex(out, r"track\s+1\s+Sound\s+name='A1'")
        self.assertRegex(out, r"track\s+2\s+Sound\s+name='A2'")
        self.assertIn("'Try it free.'", out)          # clips of the selected track
        code, out, _ = run_tool('aaf_to_timings.py', self.aaf, '--list', '--track', '2')
        self.assertIn("'Music bed'", out)

    def test_default_track_and_mid_slide_break_merge(self):
        code, out, err = run_tool('aaf_to_timings.py', self.aaf, '--json')
        self.assertEqual(code, 0, err)
        self.assertEqual(json.loads(out), [{'time': 0.0, 'slide': 1}, {'time': 4.0, 'slide': 2},
                                           {'time': 12.0, 'slide': 3}])
        self.assertIn('other track(s) have clips', err)

    def test_track_option(self):
        code, out, err = run_tool('aaf_to_timings.py', self.aaf, '--track', '2', '--json')
        self.assertEqual(code, 0, err)
        self.assertEqual(json.loads(out), [{'time': 0.5, 'slide': 1}])
        code, out, _ = run_tool('aaf_to_timings.py', self.aaf, '--track', 'A2', '--json')
        self.assertEqual(json.loads(out), [{'time': 0.5, 'slide': 1}])
        code, _, err = run_tool('aaf_to_timings.py', self.aaf, '--track', '7')
        self.assertNotEqual(code, 0)
        self.assertIn("No track '7'", err)

    def test_short_final_clip_is_warned_not_silently_dropped(self):
        code, out, err = run_tool('aaf_to_timings.py', self.aaf)
        self.assertEqual(code, 0, err)
        self.assertIn('WARNING', err)
        self.assertIn('Try it free.', err)
        self.assertIn('--min-length 1.35', err)
        # following the hint really adds the closing cue
        code, out, err = run_tool('aaf_to_timings.py', self.aaf, '--min-length', '1.35', '--json')
        self.assertEqual([c['time'] for c in json.loads(out)], [0.0, 4.0, 12.0, 18.2])
        self.assertNotIn('AFTER the last cue', err)

    def test_trailing_break_clip_is_a_note_not_a_warning(self):
        # the (break + narration) alternation the docstring describes, ending on a break
        aaf = build_aaf(self.tmp / 'breaks.aaf', [[('clip', 0.4, 'break'), ('clip', 3.0, 'Intro'),
                                                   ('clip', 0.8, 'break'), ('clip', 4.0, 'Two'),
                                                   ('clip', 0.8, 'break')]])
        code, out, err = run_tool('aaf_to_timings.py', aaf, '--json')
        self.assertEqual(code, 0, err)
        self.assertEqual(json.loads(out), [{'time': 0.4, 'slide': 1}, {'time': 4.2, 'slide': 2}])
        self.assertNotIn('AFTER the last cue', err)
        self.assertIn('look like breaks', err)
        self.assertIn("'break'", err)

    def test_looks_like_break_heuristics(self):
        import aaf_to_timings as a2t

        def clips(*spec):
            return [{'index': i, 'start_sec': 0.0, 'length_sec': l, 'name': n, 'is_filler': False}
                    for i, (n, l) in enumerate(spec)]
        # names can't tell (one master mob): compare with the interior short clips
        same = clips(('vo', 3.0), ('vo', 0.7), ('vo', 4.0), ('vo', 0.7))
        self.assertTrue(a2t.looks_like_break(same[-1], same, 2.0))
        same = clips(('vo', 3.0), ('vo', 0.7), ('vo', 4.0), ('vo', 1.5))
        self.assertFalse(a2t.looks_like_break(same[-1], same, 2.0))
        # a distinct name that never occurs between the kept clips = a closing line
        named = clips(('Intro', 3.0), ('breath', 0.5), ('Two', 4.0), ('Try it free.', 1.4))
        self.assertFalse(a2t.looks_like_break(named[-1], named, 2.0))
        named = clips(('Intro', 3.0), ('gap-1', 0.5), ('Two', 4.0), ('Silence', 1.4))
        self.assertTrue(a2t.looks_like_break(named[-1], named, 2.0))
        # the WHOLE name must be a break word: a closing line that starts with one is not a break
        for line in ('Break free today.', 'Silence is golden', 'Empty your cart', 'Pause...', 'breakthrough'):
            named = clips(('Intro', 3.0), ('Two', 4.0), ('', 1.0), (line, 1.4))
            named[2]['is_filler'] = True
            self.assertFalse(a2t.looks_like_break(named[-1], named, 2.0), line)
        for brk in ('break 2', 'Pause_03', 'silence 0.7s', '<break time="0.7s"/>', '[pause]', 'breath (0.5)'):
            named = clips(('Intro', 3.0), ('Two', 4.0), (brk, 0.7))
            self.assertTrue(a2t.looks_like_break(named[-1], named, 2.0), brk)
        # no alternation at all -> nothing to compare with: warn
        lone = clips(('vo', 3.0), ('vo', 0.5))
        self.assertFalse(a2t.looks_like_break(lone[-1], lone, 2.0))

    def test_break_named_closing_line_is_a_warning(self):
        aaf = build_aaf(self.tmp / 'bf.aaf', [[('clip', 3.0, 'Intro'), ('fill', 1.0, ''), ('clip', 4.0, 'Two'),
                                               ('fill', 1.0, ''), ('clip', 1.4, 'Break free today.')]])
        code, _, err = run_tool('aaf_to_timings.py', aaf, '--json')
        self.assertEqual(code, 0, err)
        self.assertIn('WARNING: 1 short clip(s) AFTER the last cue were dropped', err)
        self.assertIn("'Break free today.'", err)
        self.assertNotIn('look like breaks', err)

    def test_transition_overlap_moves_the_next_clip_earlier(self):
        import aaf_to_timings as a2t
        aaf = build_aaf(self.tmp / 'tr.aaf', [[('clip', 3.0, 'Intro'), ('fill', 1.0, ''), ('clip', 4.0, 'Two'),
                                               ('trans', 0.5, ''), ('clip', 5.0, 'Three')]])
        clips = a2t.list_clips(aaf)
        self.assertEqual([(c['name'], c['start_sec'], c['length_sec']) for c in clips if not c['is_filler']],
                         [('Intro', 0.0, 3.0), ('Two', 4.0, 4.0), ('Three', 7.5, 5.0)])   # 4.0 + 4.0 - 0.5
        self.assertNotIn('Transition', [c['type'] for c in clips])
        # a crossfade is no silence: "Three" continues slide 2 unless the gap rule is relaxed
        code, out, err = run_tool('aaf_to_timings.py', aaf, '--json')
        self.assertEqual([c['time'] for c in json.loads(out)], [0.0, 4.0], err)
        code, out, err = run_tool('aaf_to_timings.py', aaf, '--json', '--gap-threshold', '-1')
        self.assertEqual([c['time'] for c in json.loads(out)], [0.0, 4.0, 7.5], err)

    def test_zero_cues_are_never_written(self):
        short = build_aaf(self.tmp / 'short.aaf', [[('clip', 1.0, 'a'), ('fill', 1.0, ''), ('clip', 1.2, 'b')]])
        deck = self.tmp / 'zero.html'
        original = deck_html(3)
        deck.write_text(original, encoding='utf-8')
        code, _, err = run_cli('aaf_to_timings.py', short, '--apply', deck)   # real CLI
        self.assertEqual(code, 1, err)
        self.assertIn('0 cues kept', err)
        self.assertIn('try --min-length 1.15 or --all', err)
        self.assertIn('Refusing to write 0 cues (--apply)', err)
        self.assertEqual(deck.read_text(encoding='utf-8'), original)
        self.assertEqual(list(self.tmp.glob('*.bak*')), [])
        wt = self.tmp / 'word_timestamps.json'
        wt.write_text(json.dumps({'source': 'edge-tts', 'words': [{'text': 'a', 'start': 0, 'end': 1}],
                                  'cues': [{'slide': 1, 'time': 0.0}]}), encoding='utf-8')
        before = wt.read_text(encoding='utf-8')
        code, _, err = run_tool('aaf_to_timings.py', short, '--json', wt)
        self.assertEqual(code, 1)
        self.assertEqual(wt.read_text(encoding='utf-8'), before)
        code, out, err = run_tool('aaf_to_timings.py', short)          # print-only: warn, exit 0
        self.assertEqual(code, 0)
        self.assertIn('0 cues kept', err)
        # following the hint really yields cues
        code, out, _ = run_tool('aaf_to_timings.py', short, '--min-length', '1.15', '--json')
        self.assertEqual([c['time'] for c in json.loads(out)], [2.0])            # clip 'b' @2.0s

    def test_apply_twice_never_overwrites_the_backup(self):
        deck = self.tmp / 'twice.html'
        original = deck_html(6)
        deck.write_text(original, encoding='utf-8')
        run_tool('aaf_to_timings.py', self.aaf, '--apply', deck)
        first = deck.read_text(encoding='utf-8')
        code, _, err = run_tool('aaf_to_timings.py', self.aaf, '--apply', deck, '--min-length', '1.35')
        self.assertEqual(code, 0, err)
        self.assertIn('twice.html.bak2', err)
        self.assertEqual((self.tmp / 'twice.html.bak').read_text(encoding='utf-8'), original)
        self.assertEqual((self.tmp / 'twice.html.bak2').read_text(encoding='utf-8'), first)
        self.assertEqual(js_timings(deck.read_text(encoding='utf-8')), [(0.0, 1), (4.0, 2), (12.0, 3), (18.2, 4)])
        # back to the first version: .bak2 already holds those bytes -> reused, no .bak3
        deck.write_text(first, encoding='utf-8')
        code, _, err = run_tool('aaf_to_timings.py', self.aaf, '--apply', deck, '--min-length', '1.35')
        self.assertIn('twice.html.bak2 already holds this version', err)
        self.assertFalse((self.tmp / 'twice.html.bak3').exists())

    def test_slides_mismatch_warns(self):
        code, _, err = run_tool('aaf_to_timings.py', self.aaf, '--slides', '5')
        self.assertEqual(code, 0)
        self.assertIn('WARNING: kept 3 cues, but expected 5', err)

    def test_json_file_follows_word_timestamps_contract(self):
        out = self.tmp / 'cues.json'
        code, _, err = run_tool('aaf_to_timings.py', self.aaf, '--json', out)
        self.assertEqual(code, 0, err)
        d = json.loads(out.read_text(encoding='utf-8'))
        self.assertEqual(d['source'], 'aaf')
        self.assertEqual(d['cues'], [{'slide': 1, 'time': 0.0}, {'slide': 2, 'time': 4.0},
                                     {'slide': 3, 'time': 12.0}])
        self.assertEqual(d['words'], [])
        self.assertAlmostEqual(d['duration'], 19.6, places=2)

    def test_json_file_merges_into_existing_word_timestamps(self):
        out = self.tmp / 'word_timestamps.json'
        words = [{'text': 'Hello', 'start': 0.12, 'end': 0.48}]
        out.write_text(json.dumps({'source': 'elevenlabs', 'audio': 'voiceover.mp3', 'duration': 19.6,
                                   'words': words, 'cues': [{'slide': 1, 'time': 0.0}]}), encoding='utf-8')
        code, _, err = run_tool('aaf_to_timings.py', self.aaf, '--json', out)
        self.assertEqual(code, 0, err)
        d = json.loads(out.read_text(encoding='utf-8'))
        self.assertEqual(d['words'], words)
        self.assertEqual(d['source'], 'elevenlabs')
        self.assertEqual(len(d['cues']), 3)
        self.assertEqual(d['cues_source'], 'aaf')
        # never overwrite a non-JSON file
        bad = self.tmp / 'deck.json'
        bad.write_text('<html>not json</html>', encoding='utf-8')
        code, _, err = run_tool('aaf_to_timings.py', self.aaf, '--json', bad)
        self.assertNotEqual(code, 0)
        self.assertEqual(bad.read_text(encoding='utf-8'), '<html>not json</html>')

    def test_apply_warns_on_count_change_and_writes_backup(self):
        deck = self.tmp / 'storyboard.html'
        original = deck_html(6)
        deck.write_text(original, encoding='utf-8', newline='')
        code, _, err = run_cli('aaf_to_timings.py', self.aaf, '--apply', deck)   # real CLI
        self.assertEqual(code, 0, err)
        self.assertIn('replacing a 6-entry TIMINGS with 3 entries', err)
        self.assertIn('kept 3 cues, but expected 6 (slides in storyboard.html)', err)
        bak = self.tmp / 'storyboard.html.bak'
        self.assertTrue(bak.exists())
        self.assertEqual(bak.read_text(encoding='utf-8'), original)
        new = deck.read_text(encoding='utf-8')
        self.assertEqual(js_timings(new), [(0.0, 1), (4.0, 2), (12.0, 3)])
        self.assertIn('(commented out) -->', new)      # the commented-out TIMINGS was not touched

    def test_reapply_identical_timings_says_unchanged_only(self):
        deck = self.tmp / 'storyboard.html'
        deck.write_text(deck_html(3), encoding='utf-8')
        code, _, err = run_tool('aaf_to_timings.py', self.aaf, '--apply', deck)
        self.assertEqual(code, 0, err)
        self.assertIn('Wrote new TIMINGS', err)
        first = deck.read_bytes()
        (self.tmp / 'storyboard.html.bak').unlink()
        code, _, err = run_tool('aaf_to_timings.py', self.aaf, '--apply', deck)
        self.assertEqual(code, 0, err)
        self.assertIn('already match; file left unchanged', err)
        self.assertNotIn('Wrote new TIMINGS', err)
        self.assertNotIn('Backup written', err)
        self.assertFalse((self.tmp / 'storyboard.html.bak').exists())
        self.assertEqual(deck.read_bytes(), first)

    def test_apply_no_backup_and_slide_count_from_deck(self):
        deck = self.tmp / 'd.html'
        deck.write_text(deck_html(3), encoding='utf-8')
        code, _, err = run_tool('aaf_to_timings.py', self.aaf, '--apply', deck, '--no-backup')
        self.assertEqual(code, 0, err)
        self.assertFalse((self.tmp / 'd.html.bak').exists())
        self.assertNotIn('but expected', err)           # 3 cues == 3 slides
        self.assertNotIn('replacing a', err)            # 3 entries replaced by 3

    def test_apply_inserts_missing_timings_and_keeps_crlf(self):
        deck = self.tmp / 'nt.html'
        deck.write_bytes(deck_html(3, timings=False, nl='\r\n').encode('utf-8'))
        code, _, err = run_tool('aaf_to_timings.py', self.aaf, '--apply', deck)
        self.assertEqual(code, 0, err)
        raw = deck.read_bytes().decode('utf-8')
        self.assertEqual(js_timings(raw), [(0.0, 1), (4.0, 2), (12.0, 3)])
        self.assertRegex(raw, r'Storyboard\.init\(\{[^)]*timings:\s*TIMINGS')
        self.assertNotIn('\n', raw.replace('\r\n', ''))  # no bare LF introduced
        self.assertLess(raw.rindex('const TIMINGS'), raw.rindex('Storyboard.init('))

    def test_deck_slide_count_ignores_carousel_controls(self):
        import aaf_to_timings as a2t
        nav = ('<a data-slide="prev">&lt;</a><a data-slide="next">&gt;</a>'
               '<button data-slide="2">2</button><li data-slide="2"></li>')
        self.assertEqual(a2t.count_deck_slides(deck_html(3).replace('</body>', nav + '</body>')), 3)
        # named / bare data-slide markers are slides; direction values are not
        self.assertEqual(a2t.count_deck_slides('<section data-slide="intro"></section><section data-slide="1">'
                                               '</section><section data-slide></section><div data-slide="next"></div>'), 3)
        deck = self.tmp / 'nav.html'
        deck.write_text(deck_html(3).replace('</body>', nav + '</body>'), encoding='utf-8')
        code, _, err = run_tool('aaf_to_timings.py', self.aaf, '--apply', deck)
        self.assertEqual(code, 0, err)
        self.assertNotIn('but expected', err)       # 3 cues for 3 slides: no false warning

    def test_apply_refuses_a_const_that_init_would_not_read(self):
        deck = self.tmp / 'win.html'
        html = deck_html(3, timings=False).replace(
            'Storyboard.init({ ', 'window.TIMINGS = [{time:0,slide:1}];\n  Storyboard.init({ timings: window.TIMINGS, ')
        deck.write_text(html, encoding='utf-8')
        code, out, err = run_tool('aaf_to_timings.py', self.aaf, '--apply', deck)
        self.assertEqual(code, 1, err)
        self.assertIn('takes its timings from `window.TIMINGS`', err)
        self.assertIn('NOT changed', err)
        self.assertNotIn('Wrote new TIMINGS', err)
        self.assertEqual(deck.read_text(encoding='utf-8'), html)
        self.assertEqual(list(self.tmp.glob('*.bak*')), [])
        self.assertIn('const TIMINGS = [', out)     # the block to paste by hand is printed

    def test_apply_keeps_the_bytes_of_a_non_utf8_deck(self):
        deck = self.tmp / 'cp.html'
        text = '<h1>Café “quoted”</h1>'
        raw = deck_html(3).replace('<h1>S1</h1>', text).encode('cp1252')
        deck.write_bytes(raw)
        code, _, err = run_tool('aaf_to_timings.py', self.aaf, '--apply', deck)
        self.assertEqual(code, 0, err)
        self.assertIn('not valid UTF-8', err)
        new = deck.read_bytes()
        self.assertIn(text.encode('cp1252'), new)                 # untouched, byte for byte
        self.assertEqual(js_timings(new.decode('cp1252')), [(0.0, 1), (4.0, 2), (12.0, 3)])
        self.assertEqual((self.tmp / 'cp.html.bak').read_bytes(), raw)

    def test_non_aaf_input_is_a_clean_error(self):
        bad = self.tmp / 'timeline.aaf'
        bad.write_text('<xml>not an aaf</xml>', encoding='utf-8')
        code, _, err = run_cli('aaf_to_timings.py', bad)        # real CLI: no traceback
        self.assertEqual(code, 1)
        self.assertIn('Could not read', err)
        self.assertIn('as an AAF file', err)
        self.assertNotIn('Traceback', err)

    def test_select_cues_gap_measured_from_previous_kept_clip(self):
        import aaf_to_timings as a2t
        clips = [{'index': i, 'start_sec': s, 'length_sec': l, 'is_filler': False}
                 for i, (s, l) in enumerate([(0.0, 3.0), (3.5, 3.0), (7.0, 3.0), (12.0, 3.0)])]
        # 0.5s gaps inside one beat must not split it, however long the beat grows
        self.assertEqual([c['start_sec'] for c in a2t.select_cues(clips)], [0.0, 12.0])


# ---------------------------------------------------------------------------
# compress_anim_timings.py
# ---------------------------------------------------------------------------
COMPRESS_HTML = '''<!DOCTYPE html><html><head><style>
/* .x[data-t-rel="9.0"] */ .a{background:url("x/*y")}
</style></head><body>
<input type="file" accept="image/*"><p>slash // in slide copy <span data-t-rel="1.0">a</span></p>
<!-- <div data-t-rel="2.0"></div> -->
<div class="anim" data-t-rel='3.0'></div>
<script>
// old: data-t-rel="4.0"
const re = /\\/\\*/g; const u = "https://cdn.example/x.js";
const tpl = '<b data-t-rel="5.0"></b>';
/* data-t-rel="6.0" */
const d = a / b; // data-t-rel="8.0"
</script>
<div data-t-rel="12.0"></div>
</body></html>
'''


class CompressAnimTimingsTests(TempDirCase):
    def test_live_matches_skip_comments(self):
        vals = [m.group(2) for m in cat.live_matches(COMPRESS_HTML)]
        self.assertEqual(vals, ['1.0', '3.0', '5.0', '12.0'])

    def test_scale_skips_comments_and_writes_backup_by_default(self):
        f = self.tmp / 'storyboard.html'
        f.write_bytes(COMPRESS_HTML.replace('\n', '\r\n').encode('utf-8'))
        code, out, err = run_cli('compress_anim_timings.py', f, '0.5')   # real CLI
        self.assertEqual(code, 0, err)
        self.assertIn('Scaled 4 data-t-rel values', out)
        new = f.read_bytes().decode('utf-8')
        for live in ('data-t-rel="0.5"', "data-t-rel='1.5'", 'data-t-rel="2.5"', 'data-t-rel="6.0"'):
            self.assertIn(live, new)
        for dead in ('9.0', '2.0', '4.0', '6.0', '8.0'):   # commented ones untouched
            self.assertIn(f'data-t-rel="{dead}"', new)
        self.assertNotIn('\n', new.replace('\r\n', ''))    # CRLF kept
        bak = self.tmp / 'storyboard.html.bak'
        self.assertTrue(bak.exists())
        self.assertEqual(bak.read_bytes(), COMPRESS_HTML.replace('\n', '\r\n').encode('utf-8'))

    def test_masking_edge_cases(self):
        cases = {
            'postfix ++ then division': ('<script>\nconst q = i++ / 2; // data-t-rel="1.0"\n</script>'
                                         '<p data-t-rel="2.0"></p>', ['2.0']),
            'legacy <!-- line comment in a classic script': (
                '<script>\n<!-- data-t-rel="1.0"\nconst a=1;\n--> data-t-rel="7.0"\n</script>'
                '<p data-t-rel="2.0"></p>', ['2.0']),
            'module script: no legacy html comments': (
                '<script type="module">\n// data-t-rel="1.0"\nconst a = 1;\n</script><div data-t-rel="2.0"></div>',
                ['2.0']),
            '<!-- inside an attribute value': (
                '<div title="<!--"></div><div data-t-rel="1.0"></div><!-- --><div data-t-rel="3.0"></div>',
                ['1.0', '3.0']),
            'textarea text is not markup': (
                '<textarea><!-- </textarea><div data-t-rel="1.0"></div> -->', ['1.0']),
            'comment closed by --!>': ('<!-- x --!><div data-t-rel="1.0"></div>', ['1.0']),
            'abrupt <!--> comment': ('<!--><div data-t-rel="1.0"></div>', ['1.0']),
            'template script masked as html': (
                '<script type="text/template"><!-- <b data-t-rel="1.0"></b> --><i data-t-rel="2.0"></i></script>',
                ['2.0']),
            'uppercase / unquoted / escaped in a JS string': (
                '<div DATA-T-REL="1.0"></div><div data-t-rel=2.5></div>'
                '<script>el.innerHTML = "<b data-t-rel=\\"3.0\\"></b>";</script>', ['1.0', '2.5', '3.0']),
            'unparsable value skipped': ('<div data-t-rel="1.2.3"></div><div data-t-rel="4"></div>', ['4']),
            # every JavaScript MIME type Chromium runs is classic JS (not masked as markup)
            'text/javascript1.5 is classic JS': (
                '<script type="text/javascript1.5">// data-t-rel="1.0"\n</script><i data-t-rel="2.0"></i>', ['2.0']),
            'x-javascript / livescript / x-ecmascript': (
                ''.join('<script type="%s">/* data-t-rel="1.0" */</script>' % t
                        for t in ('text/x-javascript', 'text/livescript', 'application/x-ecmascript'))
                + '<i data-t-rel="2.0"></i>', ['2.0']),
            'language="javascript" is classic JS': (
                '<script language="JavaScript">// data-t-rel="1.0"\n</script><i data-t-rel="2.0"></i>', ['2.0']),
            'type with MIME parameters: JS comment rules': (
                '<script type="text/javascript; charset=utf-8">// data-t-rel="1.0"\n'
                'x = "<b data-t-rel=\\"3.0\\">";</script><i data-t-rel="2.0"></i>', ['3.0', '2.0']),
            'quoted type value with spaces': (
                '<script type=" text/template ">// <b data-t-rel="1.0"></b></script>', ['1.0']),
            # the name must start the attribute: sb-data-t-rel / x-data-t-rel are others
            'prefixed attribute names are other attributes': (
                '<div sb-data-t-rel="1.0" x-data-t-rel=3 data-t-rel="2.0"></div>', ['2.0']),
            'object literal then a division': (
                '<script>const o = {a:1} / 2; const s="<i data-t-rel=\'4.0\'>"; // data-t-rel="5.0"\n'
                '</script>', ['4.0']),
            'call result divided twice': (
                '<script>const r = f(a) / g(b) / 2; // data-t-rel="8.0"\n</script><p data-t-rel="1.0"></p>',
                ['1.0']),
            'regex literal after if (x): a pattern, not markup': (
                '<script>if (x) /data-t-rel="6.0"/.test(s); // data-t-rel="7.0"\n</script>'
                '<p data-t-rel="1.0"></p>', ['1.0']),
            'regex after a block': (
                '<script>function f(){ return 1 }\n/data-t-rel="6.0"/.test(s); // data-t-rel="7.0"\n'
                '</script>', []),
            'css attribute selector is not markup': (
                '<style>.a[data-t-rel="1.0"]{color:red}</style><div data-t-rel="1.0"></div>', ['1.0']),
            'textarea content is text, not markup': (
                '<textarea><div data-t-rel="1.0"></textarea><div data-t-rel="2.0"></div>', ['2.0']),
        }
        for name, (html, want) in cases.items():
            with self.subTest(name):
                self.assertEqual([m.group(2) for m in cat.live_matches(html)], want)
        # only the number changes: spelling, spacing and quotes are kept
        self.assertEqual(cat.scale_html('<a DATA-T-REL = \'2\' data-t-rel=4></a>', 0.5),
                         '<a DATA-T-REL = \'1.0\' data-t-rel=2.0></a>')
        kinds = {tag: cat.script_kind(cat._tag_attrs(tag, 7, len(tag) - 1)) for tag in (
            '<script>', '<script type="">', '<script type="TEXT/JAVASCRIPT ">', '<script type=module>',
            '<script type="importmap">', '<script type="text/javascript;charset=utf-8">',
            '<script language="vbscript">', '<script type="" language="vbscript">',
            '<script data-type="text/template">', '<script type="text/x-template">')}
        self.assertEqual(list(kinds.values()), ['classic', 'classic', 'classic', 'module', 'json', 'inert-js',
                                                'data', 'classic', 'classic', 'data'])

    def test_css_selectors_are_left_as_is_with_a_note(self):
        html = ('<style>.a[data-t-rel="1.0"]{color:red} [data-t-rel="2"]{top:0}</style>'
                '<div class="a" data-t-rel="1.0"></div><textarea><i data-t-rel="3.0"></i></textarea>')
        f = self.tmp / 'css.html'
        f.write_text(html, encoding='utf-8')
        self.assertEqual(cat.not_markup_values(html), [('style', 1.0), ('style', 2.0), ('textarea', 3.0)])
        self.assertEqual(cat.commented_count(html), 0)
        code, out, _ = run_tool('compress_anim_timings.py', f, '--report')
        self.assertIn('1 data-t-rel attributes found', out)
        self.assertIn('3 in <style>, <textarea> (not markup) ignored', out)
        code, out, _ = run_tool('compress_anim_timings.py', f, '0.5', '--no-backup')
        self.assertEqual(code, 0)
        self.assertIn('Scaled 1 data-t-rel values', out)
        self.assertIn('note: <style> has 2 [data-t-rel=...] selector(s) (values 1, 2)', out)
        self.assertEqual(f.read_text(encoding='utf-8'), html.replace('class="a" data-t-rel="1.0"',
                                                                     'class="a" data-t-rel="0.5"'))

    def test_inert_js_script_note(self):
        f = self.tmp / 'd.html'
        f.write_text('<script type="text/javascript; charset=utf-8">// data-t-rel="1.0"\n</script>'
                     '<i data-t-rel="2.0"></i>', encoding='utf-8')
        code, out, _ = run_tool('compress_anim_timings.py', f, '0.5', '--no-backup')
        self.assertEqual(code, 0)
        self.assertIn('is not run by browsers', out)
        self.assertIn('Scaled 1 data-t-rel values', out)
        self.assertEqual(f.read_text(encoding='utf-8'), '<script type="text/javascript; charset=utf-8">'
                                                        '// data-t-rel="1.0"\n</script><i data-t-rel="1.0"></i>')

    def test_bad_scale_rejected_and_backups_never_overwritten(self):
        f = self.tmp / 'deck.html'
        f.write_text('<div data-t-rel="2.0"></div>', encoding='utf-8')
        for bad in ('nan', 'inf', '0', '-1'):
            code, _, err = run_tool('compress_anim_timings.py', f, bad)
            self.assertNotEqual(code, 0, bad)
            self.assertIn('finite number > 0', err)
        self.assertEqual(f.read_text(encoding='utf-8'), '<div data-t-rel="2.0"></div>')
        self.assertEqual(list(self.tmp.glob('*.bak*')), [])
        run_tool('compress_anim_timings.py', f, '0.5')
        code, out, _ = run_tool('compress_anim_timings.py', f, '0.5')
        self.assertEqual(code, 0)
        self.assertIn('deck.html.bak2', out)
        self.assertEqual((self.tmp / 'deck.html.bak').read_text(encoding='utf-8'),
                         '<div data-t-rel="2.0"></div>')      # the original survives a 2nd run
        self.assertEqual((self.tmp / 'deck.html.bak2').read_text(encoding='utf-8'),
                         '<div data-t-rel="1.0"></div>')
        self.assertEqual(f.read_text(encoding='utf-8'), '<div data-t-rel="0.5"></div>')
        # an existing backup that already holds these bytes is reused, not duplicated
        f.write_text('<div data-t-rel="2.0"></div>', encoding='utf-8')
        code, out, _ = run_tool('compress_anim_timings.py', f, '1')
        self.assertIn('deck.html.bak already holds this version', out)
        self.assertFalse((self.tmp / 'deck.html.bak3').exists())

    def test_no_backup_flag_and_report(self):
        f = self.tmp / 'd.html'
        f.write_text(COMPRESS_HTML, encoding='utf-8')
        code, out, _ = run_tool('compress_anim_timings.py', f, '--report')
        self.assertEqual(code, 0)
        self.assertIn('4 data-t-rel attributes found', out)
        self.assertIn('inside comments ignored', out)
        self.assertEqual(f.read_text(encoding='utf-8'), COMPRESS_HTML)
        code, out, _ = run_tool('compress_anim_timings.py', f, '0.4', '--no-backup')
        self.assertEqual(code, 0)
        self.assertFalse((self.tmp / 'd.html.bak').exists())
        self.assertIn('data-t-rel="0.4"', f.read_text(encoding='utf-8'))


# ---------------------------------------------------------------------------
# validate_character.py
# ---------------------------------------------------------------------------
def vreport(defn):
    r = vc.Report()
    vc.validate_obj(defn, r)
    return r


GOOD_CHAR = {
    'name': 'tester', 'viewBox': [240, 300], 'origin': [120, 258], 'shadow': [120, 288, 50, 10],
    'arms': {'L': [50, 150], 'R': [190, 150]},
    'params': {'shirt': '#7C5CFF', 'trim': '$accent2'},
    'face': {'eyes': {'L': [100, 120], 'R': [140, 120], 'rx': 18, 'ry': 22, 'pupil': 9},
             'mouth': {'x': 120, 'y': 160, 'w': 16}},
    'defs': [{'type': 'linearGradient', 'id': 'tester-g0', 'x1': 0, 'y1': 0, 'x2': 0, 'y2': 1,
              'stops': [{'offset': 0, 'color': '#ffcc99'}, {'offset': 1, 'color': '#cc8855'}]}],
    'parts': [
        {'shape': 'g', 'parts': [
            {'shape': 'rect', 'x': 70, 'y': 70, 'w': 100, 'h': 160, 'r': 20, 'fill': 'url(#tester-g0) #ffcc99'},
            {'shape': 'circle', 'cx': 120, 'cy': 50, 'r': 30, 'fill': '$shirt', 'stroke': '$trim', 'sw': 3}]},
        {'shape': 'g', 'rig': 'armL', 'parts': [{'shape': 'rect', 'x': 40, 'y': 150, 'w': 20, 'h': 70, 'r': 10, 'fill': '$shirt'}]},
        {'shape': 'g', 'rig': 'armR', 'parts': [{'shape': 'rect', 'x': 180, 'y': 150, 'w': 20, 'h': 70, 'r': 10, 'fill': '$shirt'}]},
    ],
}


class ValidateCharacterTests(TempDirCase):
    def test_good_definition_has_no_errors(self):
        r = vreport(json.loads(json.dumps(GOOD_CHAR)))
        self.assertEqual(r.errs, [])
        self.assertEqual(r.warns, [])
        if not vc.engine_renders_defs():   # informational only - never fails --strict
            self.assertTrue(any('does not render character defs' in n for n in r.notes), r.notes)

    def test_bools_are_not_numbers(self):
        for mutate, needle in [
            (lambda d: d['parts'][0]['parts'][0].__setitem__('y', True), "attr 'y' must be a number"),
            (lambda d: d.__setitem__('viewBox', [240, True]), 'viewBox'),
            (lambda d: d.__setitem__('origin', [120, False]), 'origin'),
            (lambda d: d['arms'].__setitem__('R', [True, 150]), 'arms.R'),
            (lambda d: d['face']['eyes'].__setitem__('rx', True), 'face.eyes.rx'),
            (lambda d: d['face']['mouth'].__setitem__('w', True), 'face.mouth.w'),
            (lambda d: d['parts'][0]['parts'][1].__setitem__('sw', True), "attr 'sw'"),
        ]:
            d = json.loads(json.dumps(GOOD_CHAR))
            mutate(d)
            r = vreport(d)
            self.assertTrue(any(needle in e for e in r.errs), (needle, r.errs))

    def test_external_url_references_are_errors(self):
        d = json.loads(json.dumps(GOOD_CHAR))
        d['parts'][0]['parts'][1]['fill'] = 'url(https://evil.example/p.svg#a) #fff'
        r = vreport(d)
        self.assertTrue(any('external reference' in e for e in r.errs), r.errs)
        # raw file scan catches it too (docstring promise), incl. the CLI exit code
        f = self.tmp / 'bad.json'
        f.write_text(json.dumps(d), encoding='utf-8')
        code, out, _ = run_cli('validate_character.py', f)   # real CLI
        self.assertEqual(code, 1)
        self.assertIn('url(https://evil.example/p.svg#a)', out)
        # a local url(#id) that points at a defs entry is fine
        self.assertEqual(vreport(json.loads(json.dumps(GOOD_CHAR))).errs, [])
        # a quoted local ref is an error for its quotes (the engine drops it), but it is
        # not an external reference (the scan sees it JSON-escaped as url(\"#id\"))
        d = json.loads(json.dumps(GOOD_CHAR))
        d['parts'][0]['parts'][0]['fill'] = 'url("#tester-g0") #ffcc99'
        f.write_text(json.dumps(d), encoding='utf-8')
        code, out, _ = run_tool('validate_character.py', f)
        self.assertEqual(code, 1)
        self.assertIn('contains quotes', out)
        self.assertNotIn('external reference', out)
        d['parts'][0]['parts'][0]['fill'] = 'url("https://evil.example/p.svg#a") #fff'
        f.write_text(json.dumps(d), encoding='utf-8')
        self.assertIn('external reference', run_tool('validate_character.py', f)[1])

    def test_safety_scan_skips_meta_fields_only(self):
        d = json.loads(json.dumps(GOOD_CHAR))
        d.update({'description': 'Works online=yes; see onclick=docs, javascript: never runs',
                  'author': 'url(https://example.com/me)', '_notes': '<script>x</script>'})
        f = self.tmp / 'meta.json'
        f.write_text(json.dumps(d), encoding='utf-8')
        code, out, _ = run_tool('validate_character.py', f)
        self.assertEqual(code, 0, out)                 # meta fields are never rendered
        self.assertNotIn('ERROR', out)
        # the same strings in a rendered field are still caught
        for key, val, needle in (('params', {'shirt': '#fff onload=alert(1)'}, 'event handler'),
                                 ('params', {'shirt': 'javascript:x'}, "'javascript:'"),
                                 ('params', {'shirt': 'url(https://evil.example/a)'}, 'external reference')):
            bad = json.loads(json.dumps(GOOD_CHAR))
            bad[key] = val
            f.write_text(json.dumps(bad), encoding='utf-8')
            code, out, _ = run_tool('validate_character.py', f)
            self.assertEqual(code, 1, (val, out))
            self.assertIn(needle, out)
        f.write_text('{"name": "x", "parts": [ onclick=1 ]', encoding='utf-8')   # not JSON: whole file scanned
        code, out, _ = run_tool('validate_character.py', f)
        self.assertEqual(code, 1)
        self.assertIn("event handler 'onclick='", out)
        self.assertIn('invalid JSON', out)

    def test_params_arms_origin_are_checked(self):
        d = json.loads(json.dumps(GOOD_CHAR))
        d['params'] = {'bad-key': '#fff', 'n': 5, 'q': 'red"x'}
        d['arms'] = {'L': [50, 150]}
        d['origin'] = 'bottom'
        r = vreport(d)
        joined = ' | '.join(r.errs)
        self.assertNotIn('bad-key', joined)       # works in the engine: a warning, not an error
        self.assertTrue(any("params key 'bad-key'" in w and 'data- attribute' in w for w in r.warns), r.warns)
        self.assertIn('params.n must be a color string', joined)
        self.assertIn('params.q', joined)
        self.assertIn('origin must be [x, y]', joined)
        self.assertTrue(any('arms needs both L and R' in w for w in r.warns), r.warns)
        d = json.loads(json.dumps(GOOD_CHAR))
        del d['arms']
        r = vreport(d)
        self.assertTrue(any('no arms {L,R} pivots' in w for w in r.warns), r.warns)
        d = json.loads(json.dumps(GOOD_CHAR))
        d['parts'][0]['parts'][1]['fill'] = '$nosuch'
        self.assertTrue(any("token '$nosuch'" in w for w in vreport(d).warns))

    def test_misplaced_shape_fields_warn(self):
        d = json.loads(json.dumps(GOOD_CHAR))
        d['parts'][0]['parts'][0]['d'] = 'M0 0 L10 10'                 # a rect never reads d
        d['parts'][0]['parts'][1]['parts'] = []                        # nor does a circle read parts
        d['parts'][1]['transform'] = 'rotate(10)'                      # the engine has no transform
        w = ' | '.join(vreport(d).warns)
        self.assertIn("'d' is ignored on rect", w)
        self.assertIn("'parts' is ignored on circle", w)
        self.assertIn("'transform' is not applied by the engine", w)

    def test_params_keys_follow_the_engine_dataset_rules(self):
        # 'shirt-2' <- data-shirt-2 and 'hairColor' <- data-hair-color both resolve and are overridable
        d = json.loads(json.dumps(GOOD_CHAR))
        d['params'].update({'shirt-2': '#ffffff', 'hairColor': '#332211'})
        d['parts'][0]['parts'][1]['fill'] = '$shirt-2'
        d['parts'][0]['parts'][1]['stroke'] = '$hairColor'
        r = vreport(d)
        self.assertEqual((r.errs, r.warns), ([], []))
        self.assertEqual(vc.param_attr('hairColor'), 'data-hair-color')
        self.assertEqual(vc.param_attr('shirt-2'), 'data-shirt-2')
        self.assertIsNone(vc.param_attr('hair-color'))     # dataset would be hairColor
        # a key that is also an engine attribute is changed by it
        d['params']['mood'] = '#000000'
        self.assertTrue(any("'mood'" in w and 'data-mood' in w for w in vreport(d).warns))

    def test_own_eyes_with_face_off_is_strict_clean(self):
        d = json.loads(json.dumps(GOOD_CHAR))
        d['face']['render'] = False
        d['parts'].append({'shape': 'g', 'rig': 'eyeL', 'parts': [
            {'shape': 'circle', 'cx': 100, 'cy': 120, 'r': 16, 'fill': '#ffffff'},
            {'shape': 'circle', 'cx': 100, 'cy': 120, 'r': 7, 'fill': '#111111', 'rig': 'pupilL'}]})
        d['parts'].append({'shape': 'g', 'rig': 'eyeR', 'parts': [
            {'shape': 'circle', 'cx': 140, 'cy': 120, 'r': 16, 'fill': '#ffffff'},
            {'shape': 'circle', 'cx': 140, 'cy': 120, 'r': 7, 'fill': '#111111', 'rig': 'pupilR'}]})
        d['parts'].append({'shape': 'path', 'rig': 'mouth', 'd': 'M105 170 Q120 182 135 170',
                           'fill': 'none', 'stroke': '#111111', 'sw': 4, 'lc': 'round'})
        f = self.tmp / 'own-eyes.json'
        f.write_text(json.dumps(d), encoding='utf-8')
        code, out, _ = run_tool('validate_character.py', f, '--strict')
        self.assertEqual(code, 0, out)
        # face off and NO eye rigs: that is worth a warning
        d2 = json.loads(json.dumps(GOOD_CHAR))
        d2['face']['render'] = False
        self.assertTrue(any('no part has rig eyeL/eyeR' in w for w in vreport(d2).warns))
        # eyes but no mouth: a note (the character cannot lip-sync), not a --strict failure
        d['parts'].pop()
        r = vreport(d)
        self.assertEqual(r.warns, [])
        self.assertTrue(any('no lip-sync' in n for n in r.notes), r.notes)

    def test_engine_driven_rig_parts_need_the_right_shape(self):
        # the engine sets rx/ry on the FIRST open mouth and rewrites the FIRST smile's d
        eyes = [{'shape': 'g', 'rig': 'eyeL', 'parts': [{'shape': 'circle', 'cx': 100, 'cy': 120, 'r': 16, 'fill': '#ffffff'}]},
                {'shape': 'g', 'rig': 'eyeR', 'parts': [{'shape': 'circle', 'cx': 140, 'cy': 120, 'r': 16, 'fill': '#ffffff'}]}]

        def char(*parts):
            d = json.loads(json.dumps(GOOD_CHAR))
            d['face']['render'] = False
            d['parts'] += eyes + [dict(p) for p in parts]
            return d
        mouth = {'shape': 'path', 'rig': 'mouth', 'd': 'M105 170 Q120 182 135 170', 'fill': 'none',
                 'stroke': '#111111', 'sw': 4}
        opn = {'shape': 'ellipse', 'rig': 'open', 'cx': 120, 'cy': 175, 'rx': 12, 'ry': 6, 'fill': '#330000'}
        self.assertEqual(vreport(char(mouth, opn)).warns, [])
        w = ' | '.join(vreport(char({'shape': 'rect', 'rig': 'mouth', 'x': 105, 'y': 168, 'w': 30, 'h': 4, 'fill': '#111111'},
                                    {'shape': 'circle', 'rig': 'open', 'cx': 120, 'cy': 175, 'r': 8, 'fill': '#330000'})).warns)
        self.assertIn("rig 'mouth' is a rect", w)
        self.assertIn("rewriting the path 'd'", w)
        self.assertIn("rig 'open' is a circle", w)
        self.assertIn('setting rx/ry, which only an ellipse has', w)
        # open + mouthOpen share one engine part: only the first is animated (and checked)
        w = ' | '.join(vreport(char(mouth, opn, dict(opn, rig='mouthOpen', shape='circle', r=3))).warns)
        self.assertIn("rig 'mouthOpen'/'open' used 2 times", w)
        self.assertNotIn('is a circle', w)
        grp = {'shape': 'g', 'rig': 'open', 'parts': [{k: v for k, v in opn.items() if k != 'rig'}]}
        self.assertTrue(any("rig 'open' is a g" in x for x in vreport(char(mouth, grp)).warns))

    def test_backslash_in_a_color_is_an_error(self):
        bs = chr(92)   # CSS escapes spell url( without the letters
        for v in ('u' + bs + 'rl(https://evil.example/a)', bs + '75 rl(https://evil.example/a)', '#fff' + bs + '9'):
            d = json.loads(json.dumps(GOOD_CHAR))
            d['parts'][0]['parts'][1]['fill'] = v
            self.assertTrue(any('backslash' in e for e in vreport(d).errs), v)
        d = json.loads(json.dumps(GOOD_CHAR))
        d['params']['shirt'] = 'u' + bs + 'rl(https://evil.example/a)'
        self.assertTrue(any('params.shirt' in e and 'backslash' in e for e in vreport(d).errs))

    def test_cli_exit_codes_and_strict(self):
        f = self.tmp / 'ok.json'
        d = json.loads(json.dumps(GOOD_CHAR))
        del d['defs']
        d['parts'][0]['parts'][0]['fill'] = '#ffcc99'
        f.write_text(json.dumps(d), encoding='utf-8-sig')   # a BOM must not break parsing
        code, out, _ = run_tool('validate_character.py', f)
        self.assertEqual(code, 0, out)
        self.assertIn('[ok]', out)
        d['parts'][0]['parts'][0]['rx'] = 4                  # warning only
        f.write_text(json.dumps(d), encoding='utf-8')
        self.assertEqual(run_tool('validate_character.py', f)[0], 0)
        self.assertEqual(run_tool('validate_character.py', f, '--strict')[0], 1)


# ---------------------------------------------------------------------------
# lottie-library.json + lottie_fetch.py
# ---------------------------------------------------------------------------
def engine_catalog():
    """({preset name: default dur}, LOOPS names) of storyboard-engine.js: evaluated in
    node when available, else scraped from the source."""
    src = (SKILL / 'storyboard-engine.js').read_text(encoding='utf-8')
    if NODE:
        js = ("const fs=require('fs'),vm=require('vm');const sb={console,Math,JSON,Date,setTimeout,clearTimeout};"
              "sb.window=sb;sb.self=sb;vm.createContext(sb);vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),sb);"
              "const S=sb.Storyboard;const d={};for(const k in S.PRESETS)d[k]=S.PRESETS[k].dur;"
              "console.log(JSON.stringify({p:d,l:Object.keys(S.LOOPS||{})}));")
        p = subprocess.run([NODE, '-e', js, str(SKILL / 'storyboard-engine.js')],
                           capture_output=True, text=True, timeout=60)
        if p.returncode == 0 and p.stdout.strip():
            d = json.loads(p.stdout.strip().splitlines()[-1])
            return d['p'], set(d['l'])
    presets = {k: float(v) for k, v in
               re.findall(r'^\s{4}(\w+)\s*:\s*\{\s*dur\s*:\s*([\d.]+)', src, re.M)}
    loops_block = src[src.index('const LOOPS'):]
    loops = set(re.findall(r'^\s{4}(\w+)\s*:\s*\(', loops_block[:3000], re.M))
    return presets, loops


def engine_names():
    """(PRESETS names, LOOPS names) of storyboard-engine.js."""
    presets, loops = engine_catalog()
    return set(presets), loops


class LottieLibraryTests(TempDirCase):
    @classmethod
    def setUpClass(cls):
        cls.lib = json.loads((SKILL / 'lottie-library.json').read_text(encoding='utf-8'))
        cls.rows = cls.lib['animations']

    def test_about_count_is_accurate(self):
        n = len(self.rows)
        self.assertEqual(self.lib.get('_count'), n)
        self.assertIn(f'{n} ', self.lib['_about'])
        self.assertEqual(len({r['id'] for r in self.rows}), n, 'duplicate ids')

    def test_every_preset_exists_in_the_engine(self):
        presets, loops = engine_names()
        self.assertIn('checkDraw', presets)
        self.assertIn('breathe', loops)
        for r in self.rows:
            p = r.get('preset')
            if p is not None:
                self.assertIn(p, presets, f"{r['id']}: preset {p!r} is not an engine preset")
                self.assertNotIn(p, loops - presets, f"{r['id']}: {p!r} is a loop")
            if 'loop' in r:
                self.assertIn(r['loop'], loops, f"{r['id']}: loop {r['loop']!r}")
            if r.get('markup'):
                self.assertIsNotNone(p, f"{r['id']}: markup without a preset")
                self.assertIn(f'data-anim="{p}"', r['markup'], r['id'])
                for name in re.findall(r'data-anim="(\w+)"', r['markup']):
                    self.assertIn(name, presets, f"{r['id']}: markup uses unknown preset {name!r}")
        self.assertEqual(next(r for r in self.rows if r['id'] == 'meditation').get('loop'), 'breathe')

    def test_loops_start_after_a_finite_entrance(self):
        # the engine starts data-loop at t + dur: an endless preset (dur 9999) needs data-dur
        durs, _ = engine_catalog()
        looped = [r for r in self.rows if r.get('loop')]
        self.assertTrue(looped)
        for r in looped:
            dur = (r.get('attrs') or {}).get('data-dur', durs.get(r['preset']))
            self.assertLess(float(dur), 60, f"{r['id']}: its data-loop would start after {dur}s")

    def test_search_only_entries_are_explicit(self):
        for r in self.rows:
            self.assertIn('preset', r)
            self.assertNotIn('procedural', r)
            self.assertIn('url', r, r['id'])          # _fields: "direct Lottie JSON URL, or null"
            if r['preset'] is None and r['url'] is None:
                self.assertTrue(r.get('search'), r['id'])

    def test_fetch_of_a_preset_entry_points_to_the_preset(self):
        proj = self.tmp / 'proj'
        code, _, err = run_tool('lottie_fetch.py', 'fetch', 'rocket-launch', '--out', proj)
        self.assertEqual(code, 1)
        self.assertIn('owned preset rocketLaunch', err)
        self.assertIn('<div class="anim" data-anim="rocketLaunch"></div>', err)
        self.assertNotIn('None', err)
        self.assertNotIn('search-only', err)
        code, _, err = run_tool('lottie_fetch.py', 'fetch', 'mascot-wave', '--out', proj)
        self.assertIn('owned preset character', err)
        self.assertIn('"character waving hello"', err)      # the richer alternative
        self.assertFalse(proj.exists())                     # nothing fetched or written

    def test_cli_search_and_show(self):
        code, out, _ = run_cli('lottie_fetch.py', '--search', 'warning')   # real CLI
        self.assertEqual(code, 0)
        self.assertRegex(out, r'warning-alert\s+-> SEARCH-ONLY')
        code, out, _ = run_tool('lottie_fetch.py', 'search', 'meditate')
        self.assertIn('<div class="anim" data-anim="pulseRings" data-dur="1" data-loop="breathe"></div>', out)
        code, out, _ = run_tool('lottie_fetch.py', 'show', 'success-check')
        self.assertEqual(code, 0)
        self.assertIn('data-anim="checkDraw"', out)
        # presets that need host structure print it (a bare <div> would draw nothing)
        code, out, _ = run_tool('lottie_fetch.py', 'show', 'brain-network')
        self.assertIn('<canvas class="anim" data-anim="constellation" data-dur="1"', out)
        self.assertIn('only draws on a <canvas>', out)
        code, out, _ = run_tool('lottie_fetch.py', 'search', 'route')
        self.assertIn('data-anim="motionPath" data-path="#route-path-1"', out)
        code, out, _ = run_tool('lottie_fetch.py', '--list')
        self.assertIn('search-only', out)
        src = (SKILL / 'lottie_fetch.py').read_text(encoding='utf-8')
        self.assertNotIn('skill/lottie_fetch.py', src)

    def test_fetch_local_file_into_project_assets(self):
        lot = {'v': '5.7.4', 'fr': 30, 'ip': 0, 'op': 60, 'w': 100, 'h': 100, 'layers': []}
        src = self.tmp / 'download.json'
        src.write_text(json.dumps(lot), encoding='utf-8')
        proj = self.tmp / 'proj'
        for _ in range(2):   # re-fetching must not duplicate the credit line
            code, out, err = run_tool('lottie_fetch.py', 'fetch', src, '--out', proj, '--id', 'mascot-wave',
                                      '--credit', 'https://example.com/anim')
            self.assertEqual(code, 0, err)
        dest = proj / 'assets' / 'lottie' / 'mascot-wave.json'
        self.assertEqual(json.loads(dest.read_text(encoding='utf-8'))['layers'], [])
        credits = (proj / 'assets' / 'lottie' / 'CREDITS.md').read_text(encoding='utf-8')
        self.assertEqual(credits.count('`mascot-wave.json`'), 1)
        self.assertIn('https://example.com/anim', credits)
        self.assertIn('data-src="assets/lottie/mascot-wave.json"', out)
        bad = self.tmp / 'notlottie.json'
        bad.write_text('{"hello": 1}', encoding='utf-8')
        code, _, err = run_tool('lottie_fetch.py', 'fetch', bad, '--out', proj)
        self.assertNotEqual(code, 0)
        code, _, err = run_tool('lottie_fetch.py', 'fetch', 'warning-alert', '--out', proj)
        self.assertNotEqual(code, 0)
        self.assertIn('search-only', err)
        # a path with spaces is quoted in the printed hint
        code, _, err = run_tool('lottie_fetch.py', 'fetch', 'warning-alert', '--out', self.tmp / 'my proj')
        self.assertIn('--out "%s" --id warning-alert' % (self.tmp / 'my proj'), err)

    def test_fetch_url_name_is_percent_decoded(self):
        import lottie_fetch as lf
        self.assertEqual(lf._source_name('http://127.0.0.1:9/a/my%20anim.json?x=1#f'), 'my anim.json')
        self.assertEqual(lf._source_name('C:\\dl\\cool anim.lottie'), 'cool anim.lottie')
        lot = {'v': '5.7.4', 'fr': 30, 'ip': 0, 'op': 30, 'w': 10, 'h': 10, 'layers': []}
        src = self.tmp / 'my anim.json'
        src.write_text(json.dumps(lot), encoding='utf-8')
        proj = self.tmp / 'proj'
        code, out, err = run_tool('lottie_fetch.py', 'fetch', src.as_uri(), '--out', proj)   # file:// URL
        self.assertEqual(code, 0, err)
        self.assertTrue((proj / 'assets' / 'lottie' / 'my-anim.json').exists())
        self.assertIn('data-src="assets/lottie/my-anim.json"', out)


# ---------------------------------------------------------------------------
# rigger.html (headless Chromium)
# ---------------------------------------------------------------------------
RIG_ART = '''<svg viewBox="0 0 240 300" xmlns="http://www.w3.org/2000/svg">
 <defs><linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
   <stop offset="0" stop-color="#ffcc99"/><stop offset="1" stop-color="#cc8855"/></linearGradient></defs>
 <g id="torso" transform="translate(20,10)">
   <rect x="50" y="60" width="100" height="160" rx="20" fill="url(#skin)"/>
   <circle cx="100" cy="40" r="30" fill="#7C5CFF"/>
 </g>
 <g transform="translate(10,0)"><g transform="scale(2)"><circle cx="5" cy="5" r="2" fill="#000"/></g></g>
 <g data-sbc="armL" transform="rotate(10 60 100)"><rect x="40" y="100" width="20" height="80" rx="10" fill="#6a4ee0"/></g>
 <g data-sbc="armR"><rect x="180" y="100" width="20" height="80" rx="10" fill="#6a4ee0"/></g>
 <ellipse cx="120" cy="280" rx="40" ry="8" style="fill:rgba(0,0,0,.2)" transform="scale(1,1.5) translate(0,-90)"/>
</svg>'''


RIGGER_DIR = SKILL   # folder served for the rigger tests (rigger.html + storyboard-engine.js)


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


@unittest.skipUnless(HAVE_PW, 'playwright not installed')
class RiggerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = functools.partial(_QuietHandler, directory=str(RIGGER_DIR))
        cls.srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), handler)
        cls.srv.daemon_threads = True
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()
        cls.url = 'http://127.0.0.1:%d/rigger.html' % cls.srv.server_address[1]
        cls.pw = sync_playwright().start()
        try:
            cls.browser = cls.pw.chromium.launch()
        except Exception as ex:   # chromium not installed
            cls.pw.stop()
            cls.srv.shutdown()
            raise unittest.SkipTest('chromium unavailable: %s' % ex)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.srv.shutdown()
        cls.srv.server_close()

    def open(self):
        page = self.browser.new_page(viewport={'width': 1300, 'height': 900})
        self.errors = []
        page.on('pageerror', lambda e: self.errors.append(str(e)))
        page.on('console', lambda m: m.type == 'error' and self.errors.append(m.text))
        page.goto(self.url)
        page.wait_for_function('window.Rigger && window.Storyboard', timeout=15000)
        return page

    def test_utf8_meta_and_no_mojibake(self):
        raw = (SKILL / 'rigger.html').read_bytes()
        self.assertIn(b'<meta charset="utf-8">', raw[:1024].lower())
        text = raw.decode('utf-8')
        for bad in ('â€', 'ðŸ', 'Â·', 'Ã'):
            self.assertNotIn(bad, text)
        page = self.open()
        try:
            self.assertEqual(page.title(), 'Storyboard — Character Rigger')
            self.assertIn('\U0001F5E3', page.inner_text('#talkBtn'))
        finally:
            page.close()

    def test_json_export_round_trip(self):
        page = self.open()
        try:
            res = page.evaluate('(a)=>{ if(!Rigger.loadArt(a)) return null; Rigger.render(); return Rigger.exportDefinition(); }', RIG_ART)
        finally:
            page.close()
        self.assertIsNotNone(res)
        d = json.loads(json.dumps(res['def']))
        r = vreport(d)
        self.assertEqual(r.errs, [], r.errs)
        parts = d['parts']
        # <g transform="translate(20,10)"> survives as a group with the transform baked in
        torso = parts[0]
        self.assertEqual(torso['shape'], 'g')
        self.assertEqual([p['shape'] for p in torso['parts']], ['rect', 'circle'])
        rect, circ = torso['parts']
        self.assertEqual((rect['x'], rect['y'], rect['w'], rect['h'], rect['r']), (70, 70, 100, 160, 20))
        self.assertEqual((circ['cx'], circ['cy'], circ['r']), (120, 50, 30))
        self.assertNotIn('transform', json.dumps(parts))
        # nested translate(10,0) scale(2)
        inner = parts[1]['parts'][0]['parts'][0]
        self.assertEqual((inner['shape'], inner['cx'], inner['cy'], inner['r']), ('circle', 20, 10, 4))
        # gradient -> defs + url(#id) with a solid fallback
        self.assertRegex(rect['fill'], r'^url\(#[\w-]+\) #[0-9a-f]{6}$')
        gid = rect['fill'][5:rect['fill'].index(')')]
        self.assertEqual([g['id'] for g in d['defs']], [gid])
        self.assertEqual([s['color'] for s in d['defs'][0]['stops']], ['#ffcc99', '#cc8855'])
        # rig tags kept; the rotated arm is baked into a path; pivots exported
        rigs = {p.get('rig'): p for p in parts if p.get('rig')}
        self.assertEqual(set(rigs), {'armL', 'armR'})
        self.assertEqual(rigs['armL']['parts'][0]['shape'], 'path')
        self.assertEqual(rigs['armR']['parts'][0]['shape'], 'rect')
        self.assertTrue(vc.is_point(d['arms']['L']) and vc.is_point(d['arms']['R']))
        # scale(1,1.5) translate(0,-90) on an ellipse
        ell = parts[-1]
        self.assertEqual((ell['shape'], ell['cx'], ell['cy'], ell['rx'], ell['ry']), ('ellipse', 120, 285, 40, 12))

    # render the exported definition through Storyboard.defineCharacter (engine face and
    # shadow off) and the original art on canvases; return the per-pixel difference
    COMPARE_JS = '''async ([orig, def]) => {
      const W=def.viewBox[0], H=def.viewBox[1];
      const d2=JSON.parse(JSON.stringify(def)); d2.name='__cmp__'; d2.face=Object.assign({}, d2.face, {render:false}); d2.shadow=[0,0,0,0];
      Storyboard.defineCharacter(d2);
      const el=document.createElement('div'); el.setAttribute('data-anim','character'); el.setAttribute('data-char','__cmp__');
      el.style.cssText='position:fixed;left:0;top:0;width:'+W+'px;height:'+H+'px'; document.body.appendChild(el);
      Storyboard.PRESETS.character.apply(el, 1, {time:0});
      const svg=el.querySelector('svg'); svg.setAttribute('width', W); svg.setAttribute('height', H);
      const exported=new XMLSerializer().serializeToString(svg); el.remove();
      const raster=async (markup)=>{ const img=new Image(); img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(markup);
        await img.decode(); const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
        g.fillStyle='#fff'; g.fillRect(0,0,W,H); g.drawImage(img,0,0,W,H); return g.getImageData(0,0,W,H).data; };
      const a=await raster(orig), b=await raster(exported);
      let n=0, big=0, sum=0;
      for(let i=0;i<a.length;i+=4){ const d=Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2])); sum+=d; if(d>40) big++; n++; }
      return {mean:sum/n, big:big/n};
    }'''

    def export(self, page, art, name='probe'):
        return page.evaluate('([a,n])=>{ document.getElementById("charName").value=n; if(!Rigger.loadArt(a)) return null; '
                             'Rigger.render(); return Rigger.exportDefinition(); }', [art, name])

    def test_gradient_fallbacks_keep_transparency(self):
        glow = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">'
                '<defs><radialGradient id="glow"><stop offset="0" stop-color="#fff" stop-opacity="0.6"/>'
                '<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>'
                '<rect x="10" y="10" width="180" height="180" fill="#3050a0"/>'
                '<circle cx="100" cy="100" r="80" fill="url(#glow)"/></svg>')
        faded = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">'
                 '<defs><linearGradient id="g"><stop offset="0" stop-color="#00ff00"/><stop offset="1" stop-color="#00aa00"/>'
                 '</linearGradient></defs><rect width="200" height="200" fill="#000"/>'
                 '<rect x="20" y="20" width="160" height="160" fill="url(#g)" fill-opacity="0.3"/></svg>')
        two = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="rb">'
               '<stop offset="0" stop-color="#ff0000"/><stop offset="1" stop-color="#0000ff"/></linearGradient></defs>'
               '<rect width="100" height="100" fill="url(#rb)"/></svg>')
        page = self.open()
        try:
            res = {k: self.export(page, a) for k, a in (('glow', glow), ('faded', faded), ('two', two))}
            diff = {k: page.evaluate(self.COMPARE_JS, [a, res[k]['def']]) for k, a in (('glow', glow), ('faded', faded))}
            long_name = self.export(page, glow, 'My Super Duper Extra Long Custom Mascot Character Name v2')
        finally:
            page.close()
        fills = {k: v['def']['parts'][-1]['fill'] for k, v in res.items()}
        # white 0.6 -> 0 radial: area-weighted mean alpha 0.2, not an opaque white disk
        self.assertRegex(fills['glow'], r'^url\(#probe-g\d+\) rgba\(255,255,255,0\.2\)$')
        self.assertRegex(fills['faded'], r'^url\(#probe-g\d+\) rgba\(0,21[23],0,0\.3\)$')   # fill-opacity kept
        self.assertRegex(fills['two'], r'^url\(#probe-g\d+\) #(7f|80)00(7f|80)$')           # red->blue: purple
        self.assertLess(diff['glow']['mean'], 30, diff)      # was ~100+ with an opaque white fallback
        self.assertLess(diff['faded']['big'], 0.01, diff)    # was 64% of pixels off by > 40
        lf = long_name['def']['parts'][-1]['fill']
        self.assertLessEqual(len(lf), 64, lf)                # the engine drops longer color strings
        self.assertTrue(lf.startswith('url(#my-super-duper-e-g'), lf)
        for k, v in res.items():
            self.assertEqual(vreport(json.loads(json.dumps(v['def']))).errs, [], k)
        self.assertEqual(self.errors, [])

    def test_tagged_eyes_and_mouth_set_the_face_defaults(self):
        art = ('<svg viewBox="0 0 240 300"><g transform="translate(0,10)">'
               '<rect x="60" y="60" width="120" height="180" rx="40" fill="#7C5CFF"/>'
               '<g data-sbc="eyeL"><circle cx="100" cy="120" r="16" fill="#fff"/><circle data-sbc="pupilL" cx="100" cy="120" r="7" fill="#111"/></g>'
               '<g data-sbc="eyeR"><circle cx="140" cy="120" r="16" fill="#fff"/><circle data-sbc="pupilR" cx="140" cy="120" r="7" fill="#111"/></g>'
               '<path data-sbc="mouth" d="M105 170 Q120 182 135 170" fill="none" stroke="#111" stroke-width="4" stroke-linecap="round"/>'
               '<g data-sbc="armL"><rect x="30" y="120" width="30" height="80" rx="15" fill="#6a4ee0"/></g>'
               '<g data-sbc="armR"><rect x="180" y="120" width="30" height="80" rx="15" fill="#6a4ee0"/></g>'
               '</g></svg>')
        page = self.open()
        try:
            res = self.export(page, art)
            handles = page.evaluate('()=>({eyeL:Rigger.state.desc.eyeL, mouth:[Rigger.state.desc.mouthX, Rigger.state.desc.mouthY]})')
            no_mouth = self.export(page, art.replace(' data-sbc="mouth"', ''))
        finally:
            page.close()
        d = json.loads(json.dumps(res['def']))
        face = d['face']
        self.assertIs(face['render'], False)
        self.assertEqual((face['eyes']['L'], face['eyes']['R']), ([100, 130], [140, 130]))   # blink pivots on the art
        self.assertEqual((face['eyes']['rx'], face['eyes']['ry'], face['eyes']['pupil']), (16, 16, 7))
        self.assertEqual(face['mouth'], {'x': 120, 'y': 180, 'w': 15})   # the engine redraws its smile here
        self.assertEqual(handles, {'eyeL': [100, 130], 'mouth': [120, 180]})
        self.assertEqual(d['arms'], {'L': [45, 145], 'R': [195, 145]})
        f = Path(tempfile.mkdtemp(prefix='sb_rig_')) / 'rigged.json'
        try:
            f.write_text(json.dumps(d), encoding='utf-8')
            code, out, _ = run_tool('validate_character.py', f, '--strict')   # a correct export passes --strict
            self.assertEqual(code, 0, out)
        finally:
            shutil.rmtree(f.parent, ignore_errors=True)
        self.assertTrue(any('cannot talk' in n for n in no_mouth['notes']), no_mouth['notes'])
        self.assertEqual(self.errors, [])

    # art the engine drives: hidden-until-needed open mouth (a round one, under a rotated
    # group), a rect mouth, cheeks drawn hidden / display:none, a hidden arm, and a fill
    # that points at an external URL
    HIDDEN_RIG_ART = (
        '<svg viewBox="0 0 240 280"><ellipse cx="120" cy="122" rx="92" ry="96" fill="#7C5CFF"/>'
        '<g data-sbc="eyeL"><circle cx="95" cy="110" r="14" fill="#fff"/></g>'
        '<g data-sbc="eyeR"><circle cx="145" cy="110" r="14" fill="#fff"/></g>'
        '<rect data-sbc="mouth" x="105" y="158" width="30" height="5" rx="2" fill="#111"/>'
        '<g transform="rotate(20 120 165)"><circle data-sbc="open" cx="120" cy="165" r="9" fill="#300" opacity="0"/></g>'
        '<g data-sbc="cheekL" opacity="0"><circle cx="70" cy="150" r="10" fill="#f58"/></g>'
        '<ellipse data-sbc="cheekR" cx="170" cy="150" rx="10" ry="7" fill="#f58" style="display:none"/>'
        '<g data-sbc="armL" opacity="0"><rect x="10" y="120" width="20" height="60" fill="#333"/></g>'
        '<g data-sbc="armR"><rect x="210" y="120" width="20" height="60" fill="#333" '
        'style="fill:url(https://evil.example/p.svg#a) #333"/></g></svg>')

    # drive a definition through Storyboard.defineCharacter: the open mouth's (rx, ry)
    # while talking, and the happy-mood cheek/child opacities
    ACT_JS = '''(def)=>{ const d=JSON.parse(JSON.stringify(def)); d.name='__act__'; Storyboard.defineCharacter(d);
      const el=document.createElement('div'); el.setAttribute('data-anim','character'); el.setAttribute('data-char','__act__');
      el.setAttribute('data-talk','1'); el.setAttribute('data-acts','3:happy; 3.1:quiet');
      el.style.cssText='position:fixed;left:0;top:0;width:240px;height:280px'; document.body.appendChild(el);
      const P=Storyboard.PRESETS.character, states=new Set(); let tag=null;
      for(let t=0.05;t<2.5;t+=0.07){ P.apply(el,1,{time:t}); const o=el.querySelector('.sbc-open');
        if(o){ tag=o.tagName; states.add(o.getAttribute('rx')+'/'+o.getAttribute('ry')+'/'+o.style.opacity); } }
      P.apply(el,1,{time:3.5}); const ck=el.querySelector('.sbc-cheekL'), sm=el.querySelector('.sbc-smile');
      const res={openTag:tag, openStates:states.size, cheek:ck?[ck.tagName, ck.style.opacity,
        [...ck.querySelectorAll('*')].map(n=>n.getAttribute('opacity'))]:null, smileTag:sm?sm.tagName:null,
        smileD:sm?sm.getAttribute('d'):null};
      el.remove(); return res; }'''

    def test_hidden_and_round_rig_parts_keep_lip_sync(self):
        page = self.open()
        external = []

        def route(r):
            if '127.0.0.1' in r.request.url:
                r.continue_()
            else:   # never touch the network; record what the page tried to fetch
                external.append(r.request.url)
                r.abort()
        page.route('**/*', route)
        try:
            res = self.export(page, self.HIDDEN_RIG_ART)
            inline = page.evaluate('()=>Rigger.inlineNotes()')
            acted = page.evaluate(self.ACT_JS, res['def'])
        finally:
            page.close()
        d = json.loads(json.dumps(res['def']))
        rigs = {}

        def walk(ps):
            for q in ps:
                if q.get('rig'):
                    rigs.setdefault(q['rig'], q)
                walk(q.get('parts', []))
        walk(d['parts'])
        # the hidden, round, rotated open mouth: kept, an ellipse at its centre, no baked opacity
        self.assertEqual({k: rigs['open'][k] for k in ('shape', 'cx', 'cy', 'rx', 'ry')},
                         {'shape': 'ellipse', 'cx': 120, 'cy': 165, 'rx': 9, 'ry': 9})
        self.assertNotIn('opacity', rigs['open'])
        self.assertEqual(rigs['mouth']['shape'], 'path')            # the engine rewrites its d
        # cheekL drawn opacity="0": kept, its circle not baked to 0 (the engine shows it)
        self.assertEqual(rigs['cheekL']['shape'], 'g')
        self.assertNotIn('opacity', rigs['cheekL']['parts'][0])
        self.assertNotIn('cheekR', rigs)                             # display:none: dropped + noted
        self.assertTrue(any('"cheekR"' in n and 'display:none' in n for n in res['notes']), res['notes'])
        # a transparent arm is kept (hidden, as drawn) so both pivots/rigs exist
        self.assertEqual(rigs['armL']['parts'][0].get('opacity'), 0)
        self.assertTrue(vc.is_point(d['arms']['L']) and vc.is_point(d['arms']['R']))
        self.assertEqual(rigs['armR']['parts'][0]['fill'], '#333333')   # url(https://...) never used
        self.assertEqual(external, [])
        r = vreport(d)
        self.assertEqual(r.errs, [])
        self.assertFalse([w for w in r.warns if "rig 'open'" in w or "rig 'mouth'" in w], r.warns)
        # the exported definition acts: lip-sync moves the open mouth, happy shows the cheek
        self.assertEqual(acted['openTag'], 'ellipse')
        self.assertGreater(acted['openStates'], 5, acted)
        self.assertEqual((acted['cheek'][0], float(acted['cheek'][1])), ('g', 0.9))
        self.assertEqual(acted['cheek'][2], [None])
        self.assertEqual(acted['smileTag'], 'path')
        # inline (rig-your-own-SVG) mode can't convert shapes: its notes say so
        joined = ' | '.join(inline)
        self.assertIn('"mouth" is a <rect>', joined)
        self.assertIn('"open" is a <circle>', joined)
        self.assertIn('"cheekR" is display:none', joined)
        self.assertEqual(self.errors, [])

    def test_json_preview_renders_through_defineCharacter_and_gestures(self):
        page = self.open()
        try:
            page.evaluate('(a)=>{ Rigger.loadArt(a); Rigger.render(); }', RIG_ART)
            page.click('#previewBtn')
            page.wait_for_function("document.querySelector('#rig .sbc-armR')")
            self.assertEqual(page.eval_on_selector('#rig', 'e=>e.dataset.char'), '__rigger_preview__')
            page.click('[data-gesture=wave]')
            # The rigger's clock advances at most 0.05s per frame, so a real-time sleep can
            # miss the wave on a loaded machine: check every animation frame instead (the
            # wave spans ~30+ frames of rigger time however slow the frames are).
            wave_js = ('()=>{ const e=document.querySelector("#rig .sbc-armR"); '
                       'const m=/rotate\\((-?[\\d.]+)deg\\)/.exec(e ? e.style.transform : ""); '
                       'return !!m && Math.abs(parseFloat(m[1])) > 20; }')
            try:
                page.wait_for_function(wave_js, polling='raf', timeout=20000)
            except Exception:
                self.fail('arm did not wave: %r' % page.eval_on_selector('#rig .sbc-armR', 'e=>e.style.transform'))
            self.assertEqual(page.eval_on_selector('#rig .sbc-armR', 'e=>e.style.transformOrigin'), '190px 110px')
        finally:
            page.close()
        self.assertEqual(self.errors, [])


@unittest.skipUnless(HAVE_PW, 'playwright not installed')
class LottieMarkupRenderTests(TempDirCase):
    """The markup lottie_fetch.py prints for the library's owned presets really works
    in the engine (offline deck, Storyboard.renderAt(t))."""

    def render(self, body, css, fn, viewport=(1280, 720)):
        """Serve a one-slide offline deck with `body` in its slide; fn(page) -> result."""
        (self.tmp / 'index.html').write_text(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' + css + '</style></head><body>'
            '<div class="deck"><section class="slide" data-slide="1">' + body + '</section></div>'
            '<script>window.SB_OFFLINE=true; window.SB_DURATION=30;</script>'
            '<script src="storyboard-engine.js"></script>'
            '<script>const TIMINGS=[{time:0,slide:1}]; Storyboard.init({timings:TIMINGS, fallbackDuration:30, '
            'scaleDeck:false});</script></body></html>', encoding='utf-8')
        shutil.copy(SKILL / 'storyboard-engine.js', self.tmp / 'storyboard-engine.js')
        srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0),
                                              functools.partial(_QuietHandler, directory=str(self.tmp)))
        srv.daemon_threads = True
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        errors = []
        try:
            with sync_playwright() as pw:
                try:
                    browser = pw.chromium.launch()
                except Exception as ex:
                    self.skipTest('chromium unavailable: %s' % ex)
                try:
                    page = browser.new_page(viewport={'width': viewport[0], 'height': viewport[1]})
                    page.on('pageerror', lambda e: errors.append(str(e)))
                    page.goto('http://127.0.0.1:%d/index.html' % srv.server_address[1])
                    page.wait_for_function('()=>!!(window.Storyboard && window.Storyboard.renderAt)', timeout=15000)
                    page.evaluate('()=>Storyboard.ready()')
                    res = fn(page)
                finally:
                    browser.close()
        finally:
            srv.shutdown()
            srv.server_close()
        self.assertEqual(errors, [])
        return res

    def test_printed_loop_markup_animates(self):
        # a data-loop behind an endless entrance (dur 9999) never starts
        import lottie_fetch as lf
        rows = [r for r in lf.load_index() if r.get('loop')]
        self.assertTrue(rows)
        els = ''.join(lf.preset_markup(r).replace('<div ', '<div id="e%d" style="width:100px;height:100px" ' % i, 1)
                      for i, r in enumerate(rows))

        def sample(page):
            seen = {}
            for t in (2.2, 3.0, 5.7, 9.1):
                tr = page.evaluate('([t,n])=>{ Storyboard.renderAt(t); return [...Array(n).keys()]'
                                   '.map(i=>document.getElementById("e"+i).style.transform); }', [t, len(rows)])
                for i, v in enumerate(tr):
                    seen.setdefault(rows[i]['id'], set()).add(v)
            return seen
        seen = self.render(els, '.deck{height:720px;position:relative}', sample)
        for rid, vals in seen.items():
            self.assertGreater(len(vals - {''}), 1, f'{rid}: its data-loop does not animate ({vals})')

    def test_every_printed_preset_markup_draws_something(self):
        """Every preset entry's printed snippet, pasted verbatim into a slide-like cell,
        must put visible pixels on screen at some point of its entrance - not an empty
        <div> (donutSweep / chartArea / codeType ... need host content, constellation a
        <canvas>, aurora a finite data-dur). Each snippet is tried twice: in a
        flex-centred cell and in a plain block-flow cell (a bare, unsized <div> there has
        no height - burstLines drew half a burst above its box)."""
        try:
            import numpy as np
            from PIL import Image
        except Exception:
            self.skipTest('numpy + Pillow needed for the pixel check')
        import lottie_fetch as lf
        presets = [r for r in lf.load_index() if lf.preset_of(r)]
        rows = [(r, lay) for lay in ('flex', 'block') for r in presets]
        cw, ch, cols = 320, 270, 6
        n_rows = (len(rows) + cols - 1) // cols
        bg = (11, 14, 26)
        css = (':root{--accent:#7C5CFF;--accent2:#19E3B1;--accent3:#FF5C8A;--gold:#FFD166}'
               'html,body{margin:0;background:#0b0e1a}.anim{opacity:0}'
               '.deck{width:%dpx;height:%dpx;position:relative}'
               '.slide{width:100%%;height:100%%;display:flex;flex-wrap:wrap;align-content:flex-start;background:#0b0e1a}'
               '.cell{width:%dpx;height:%dpx;position:relative;overflow:hidden;isolation:isolate;display:flex;'
               'align-items:center;justify-content:center;background:#0b0e1a;color:#fff;font:600 40px sans-serif}'
               '.cell.block{display:block}'
               % (cols * cw, n_rows * ch, cw, ch))
        body = ''.join('<div class="cell%s" id="c%d">%s</div>' % (' block' if lay == 'block' else '', i,
                                                                  lf.preset_markup(r))
                       for i, (r, lay) in enumerate(rows))
        times = (0.3, 0.6, 1.0, 1.6, 2.5, 4.0, 8.0, 20.0)

        def sample(page):
            shots = []
            for t in times:
                page.evaluate('(t)=>Storyboard.renderAt(t)', t)
                shots.append(page.screenshot(full_page=True))
            return shots
        shots = self.render(body, css, sample, viewport=(cols * cw, n_rows * ch))
        counts = {}
        for png in shots:
            a = np.asarray(Image.open(io.BytesIO(png)).convert('RGB')).astype(np.int16)
            lit = (np.abs(a - np.array(bg, dtype=np.int16)).max(axis=2) > 40)
            for i, (r, lay) in enumerate(rows):
                y, x = divmod(i, cols)
                counts.setdefault((r['id'], lay), []).append(int(lit[y * ch:(y + 1) * ch, x * cw:(x + 1) * cw].sum()))
        dark = {key: c for key, c in counts.items() if max(c) < 300}
        self.assertEqual(dark, {}, 'printed markup that never draws (lit pixels per sample time %s)' % (times,))
        # endless ambient presets stay visible (aurora's p*40 fade-in over its 9999s duration did not)
        for rid in ('gradient-aurora', 'abstract-blob', 'particles-bg', 'brain-network', 'sun', 'loading-spinner'):
            for lay in ('flex', 'block'):
                self.assertGreater(min(counts[(rid, lay)]), 1000, (rid, lay, counts[(rid, lay)]))
        # the burst is as big in block flow as centred (it used to be cut in half)
        self.assertGreater(max(counts[('burst-lines', 'block')]), 0.8 * max(counts[('burst-lines', 'flex')]))


if __name__ == '__main__':
    unittest.main()

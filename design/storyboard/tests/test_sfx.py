"""Tests for the owned SFX library: make_sfx.py -> assets/sfx/*.wav + manifest.json.

Run:
    python -m unittest discover -s tests -p "test_*.py"
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
import wave
from array import array
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
SFX_DIR = SKILL / 'assets' / 'sfx'
MAKE_SFX = SKILL / 'make_sfx.py'

# Names the shared contract guarantees (render_video.py auto sound design relies on them).
REQUIRED = ['whoosh', 'whoosh-soft', 'swipe', 'pop', 'pop-soft', 'tick', 'click',
            'sparkle', 'riser', 'impact', 'chime', 'typing', 'confetti', 'success']


def _load_manifest(directory=SFX_DIR):
    # utf-8-sig: a manifest hand-edited with Windows PowerShell 5.1 carries a BOM
    return json.loads((Path(directory) / 'manifest.json').read_text(encoding='utf-8-sig'))


def _read(path):
    """Return (channels, sampwidth, rate, comptype, samples as array('h'))."""
    with wave.open(str(path), 'rb') as w:
        params = (w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getcomptype())
        raw = w.readframes(w.getnframes())
    samples = array('h')
    samples.frombytes(raw)
    if sys.byteorder == 'big':
        samples.byteswap()
    return params + (samples,)


def _run(args, timeout=60, env=None):
    """Run make_sfx.py. Output is decoded leniently: the child writes in the console /
    locale encoding, which is not necessarily UTF-8."""
    return subprocess.run([sys.executable, str(MAKE_SFX)] + [str(a) for a in args],
                          capture_output=True, text=True, encoding='utf-8', errors='replace',
                          timeout=timeout, env=env)


def _import_make_sfx():
    sys.path.insert(0, str(SKILL))
    try:
        import make_sfx
    finally:
        sys.path.remove(str(SKILL))
    return make_sfx


class SfxLibraryTest(unittest.TestCase):
    """The committed library. Hand-added custom entries must follow the contract format
    too; the built-in-only properties (normalization, preview contents) are checked on
    the REQUIRED names."""

    @classmethod
    def setUpClass(cls):
        cls.manifest = _load_manifest()

    def test_manifest_has_every_required_sound(self):
        missing = [n for n in REQUIRED if n not in self.manifest]
        self.assertEqual(missing, [], f'manifest.json is missing {missing}')

    def test_manifest_entries_are_well_formed(self):
        for name, entry in self.manifest.items():
            with self.subTest(sound=name):
                self.assertFalse(name.startswith('_'), 'preview/private files must not be in the manifest')
                self.assertEqual(entry.get('file'), f'{name}.wav')
                self.assertIsInstance(entry.get('duration'), (int, float))
                self.assertGreater(entry['duration'], 0.0)
                self.assertIsInstance(entry.get('gain_db'), (int, float))
                self.assertTrue(-40.0 <= entry['gain_db'] <= 0.0, f"gain_db {entry['gain_db']} out of range")
                self.assertIsInstance(entry.get('use'), str)
                self.assertTrue(entry['use'].strip())
                if name in REQUIRED or 'peak_time' in entry:
                    # additive field: the sync point, i.e. the loudest 5 ms inside the
                    # loudest 50 ms (make_sfx.peak_time)
                    self.assertIsInstance(entry.get('peak_time'), (int, float))
                    self.assertTrue(0.0 <= entry['peak_time'] <= entry['duration'])

    def test_every_manifest_file_exists(self):
        for name, entry in self.manifest.items():
            with self.subTest(sound=name):
                self.assertTrue((SFX_DIR / entry['file']).is_file(), f"{entry['file']} missing")

    def test_format_48k_stereo_16bit(self):
        for name, entry in self.manifest.items():
            with self.subTest(sound=name):
                ch, width, rate, comp, _ = _read(SFX_DIR / entry['file'])
                self.assertEqual((ch, width, rate, comp), (2, 2, 48000, 'NONE'))

    def test_no_clipping_and_normalized(self):
        for name, entry in self.manifest.items():
            with self.subTest(sound=name):
                *_, s = _read(SFX_DIR / entry['file'])
                peak = max(abs(min(s)), abs(max(s))) / 32768.0
                self.assertLess(peak, 0.99, 'clipping')
                if name in REQUIRED:
                    # built-ins are peak-normalized to about -3 dBFS (0.708)
                    self.assertGreater(peak, 0.6, 'too quiet: not peak-normalized')
                    self.assertLess(peak, 0.8, 'hotter than the -3 dBFS target')

    def test_duration_matches_manifest(self):
        for name, entry in self.manifest.items():
            with self.subTest(sound=name):
                ch, _, rate, _, s = _read(SFX_DIR / entry['file'])
                actual = len(s) / ch / rate
                self.assertAlmostEqual(actual, entry['duration'], delta=0.005)

    def test_click_free_edges_and_no_dc(self):
        for name in REQUIRED:
            with self.subTest(sound=name):
                *_, s = _read(SFX_DIR / self.manifest[name]['file'])
                edges = [s[0], s[1], s[-2], s[-1]]
                self.assertTrue(all(abs(v) < 330 for v in edges), f'edge samples {edges} (> -40 dBFS)')
                for ch in (0, 1):
                    mean = sum(s[ch::2]) / (len(s) / 2) / 32768.0
                    self.assertLess(abs(mean), 1e-3, f'DC offset {mean:.2e} on channel {ch}')

    def test_preview_exists_and_is_not_in_manifest(self):
        path = SFX_DIR / '_preview.wav'
        if not path.is_file():   # audition-only file; not shipped in the repo (python make_sfx.py rebuilds it)
            self.skipTest('_preview.wav not present (optional audition file)')
        self.assertNotIn('_preview', self.manifest)
        self.assertNotIn('_preview.wav', [e['file'] for e in self.manifest.values()])
        ch, width, rate, _, s = _read(path)
        self.assertEqual((ch, width, rate), (2, 2, 48000))
        # the preview holds the built-in sounds only
        need = sum(self.manifest[n]['duration'] for n in REQUIRED) + 0.5 * (len(REQUIRED) - 1)
        self.assertGreaterEqual(len(s) / ch / rate, need - 0.01)


class SfxDeterminismTest(unittest.TestCase):
    """Runs the generator. Re-running it must reproduce the committed built-in sounds byte
    for byte, and its CLI must behave on awkward input (odd --only lists, bad --out,
    non-ASCII paths, damaged or BOM-prefixed manifests)."""

    @classmethod
    def setUpClass(cls):
        try:
            import numpy  # noqa: F401  (make_sfx.py needs it)
        except ImportError:
            raise unittest.SkipTest('numpy not installed')
        cls.tmp = Path(tempfile.mkdtemp(prefix='sfx-test-'))
        cls.proc = _run(['--out', cls.tmp], timeout=170)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def _fresh_manifest(self):
        self.assertEqual(self.proc.returncode, 0, self.proc.stderr)
        return _load_manifest(self.tmp)

    def test_regenerated_files_are_identical(self):
        fresh_manifest = self._fresh_manifest()
        self.assertTrue(set(REQUIRED) <= set(fresh_manifest), sorted(fresh_manifest))
        # the generator writes exactly its own sounds plus the audition file
        expected = sorted([e['file'] for e in fresh_manifest.values()] + ['_preview.wav'])
        self.assertEqual(sorted(p.name for p in self.tmp.glob('*.wav')), expected)
        for fname in expected:
            if fname == '_preview.wav' and not (SFX_DIR / fname).is_file():
                continue   # optional audition file, not shipped in the repo
            with self.subTest(file=fname):
                self.assertTrue((SFX_DIR / fname).is_file(), f'{fname} missing from assets/sfx')
                a, b = (self.tmp / fname).read_bytes(), (SFX_DIR / fname).read_bytes()
                if a != b:
                    first = next((i for i, (x, y) in enumerate(zip(a, b)) if x != y), min(len(a), len(b)))
                    self.fail(f'{fname} differs from a fresh render (sizes {len(a)}/{len(b)}, '
                              f'first difference at byte {first}): run `python make_sfx.py`')
        # built-in entries only: hand-added custom sounds in the library are allowed
        committed = _load_manifest()
        self.assertEqual({n: committed.get(n) for n in fresh_manifest}, fresh_manifest)
        self.assertEqual(list(committed)[:len(fresh_manifest)], list(fresh_manifest),
                         'built-in entries come first, in generator order')

    def _scratch_copy(self, prefix='sfx-test-copy-'):
        """A private copy of the fresh render (other tests compare self.tmp to the library)."""
        self.assertEqual(self.proc.returncode, 0, self.proc.stderr)
        try:
            d = Path(tempfile.mkdtemp(prefix=prefix))
        except (UnicodeEncodeError, OSError) as e:
            self.skipTest(f'cannot create a temp dir named {prefix!r}: {e}')
        self.addCleanup(shutil.rmtree, d, True)
        for p in self.tmp.iterdir():
            shutil.copy2(p, d / p.name)
        return d

    def test_only_rebuild_merges_into_manifest(self):
        d = self._scratch_copy()
        before = {f: (d / f).read_bytes() for f in ('tick.wav', '_preview.wav')}
        proc = _run(['--out', d, '--only', 'tick'])
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(_load_manifest(d), self._fresh_manifest())
        for f, data in before.items():
            self.assertEqual((d / f).read_bytes(), data, f)

    def test_custom_entries_survive_rebuilds(self):
        d = self._scratch_copy()
        shutil.copy2(d / 'tick.wav', d / 'ding.wav')
        man = _load_manifest(d)
        man['ding'] = {'file': 'ding.wav', 'duration': 0.05, 'gain_db': -12.0, 'use': 'custom'}
        man['gone'] = {'file': 'gone.wav', 'duration': 1.0, 'gain_db': -12.0, 'use': 'file deleted'}
        (d / 'manifest.json').write_text(json.dumps(man), encoding='utf-8')
        builtin_order = list(self._fresh_manifest())
        for extra in (['--only', 'pop', '--no-preview'], ['--no-preview']):
            with self.subTest(args=extra):
                proc = _run(['--out', d] + extra, timeout=170)
                self.assertEqual(proc.returncode, 0, proc.stderr)
                merged = _load_manifest(d)
                self.assertEqual(merged['ding'], man['ding'])
                self.assertEqual(list(merged)[:len(builtin_order)], builtin_order)
        # a full rebuild drops custom entries whose file no longer exists
        self.assertNotIn('gone', merged)

    def test_unknown_sound_is_rejected(self):
        d = self._scratch_copy()
        target = d / 'new-dir'
        proc = _run(['--out', target, '--only', 'kazoo'])
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn('kazoo', proc.stderr)
        self.assertNotIn('Traceback', proc.stderr)
        self.assertFalse(target.exists(), 'nothing is written for a bad name list')

    def test_duplicate_and_empty_only_lists(self):
        d = self._scratch_copy()
        before = (d / 'manifest.json').read_bytes()
        # 14 names that are all "tick" are a partial rebuild, not a full one
        proc = _run(['--out', d, '--only', ','.join(['tick'] * len(REQUIRED)), '--no-preview'])
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(proc.stdout.count('[ok] tick.wav'), 1, proc.stdout)
        self.assertEqual(_load_manifest(d), self._fresh_manifest())
        for bad in (',', ' ', ''):
            with self.subTest(only=bad):
                proc = _run(['--out', d, '--only', bad, '--no-preview'])
                self.assertNotEqual(proc.returncode, 0, 'an empty --only must not rebuild everything')
                self.assertIn('--only', proc.stderr)
                self.assertNotIn('[ok]', proc.stdout)
        self.assertEqual((d / 'manifest.json').read_bytes(), before)

    def test_out_path_that_is_a_file(self):
        d = self._scratch_copy()
        before = (d / 'tick.wav').read_bytes()
        for target in (d / 'tick.wav', d / 'tick.wav' / 'sub'):
            with self.subTest(out=target.name):
                proc = _run(['--out', target, '--only', 'tick'])
                self.assertNotEqual(proc.returncode, 0)
                self.assertNotIn('Traceback', proc.stderr)
                self.assertIn('tick.wav', proc.stderr)
        self.assertEqual((d / 'tick.wav').read_bytes(), before)

    def test_non_ascii_output_path_with_ascii_console(self):
        # A Windows profile such as C:\Users\<non-ASCII name> puts the default --out and
        # %TEMP% on such a path; a piped stdout in a legacy code page cannot encode it.
        d = self._scratch_copy(prefix='sfx-test-\u7530\u4e2d ')
        before = (d / '_preview.wav').read_bytes()
        env = dict(os.environ, PYTHONIOENCODING='ascii')
        proc = _run(['--out', d, '--only', 'tick'], env=env)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn('_preview.wav', proc.stdout, 'the run must reach the preview step')
        self.assertIn('\\u7530', proc.stdout, 'unencodable path characters are escaped, not fatal')
        self.assertEqual((d / '_preview.wav').read_bytes(), before)
        self.assertEqual(_load_manifest(d), self._fresh_manifest())

    def test_bom_manifest_keeps_every_entry(self):
        d = self._scratch_copy()
        shutil.copy2(d / 'tick.wav', d / 'ding.wav')
        man = _load_manifest(d)
        man['ding'] = {'file': 'ding.wav', 'duration': 0.05, 'gain_db': -12.0, 'use': 'custom'}
        (d / 'manifest.json').write_text(json.dumps(man, indent=2), encoding='utf-8-sig')
        proc = _run(['--out', d, '--only', 'tick', '--no-preview'])
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertNotIn('[warn]', proc.stderr)
        self.assertEqual(_load_manifest(d), man)
        self.assertFalse((d / 'manifest.json').read_bytes().startswith(b'\xef\xbb\xbf'), 'rewritten without a BOM')

    def test_damaged_manifest_is_rebuilt_from_disk(self):
        d = self._scratch_copy()
        (d / 'manifest.json').write_bytes(b'{"tick": {oops')
        proc = _run(['--out', d, '--only', 'tick', '--no-preview'])
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn('[warn]', proc.stderr)
        # the other 13 built-ins are re-measured from their WAVs, to the same values
        self.assertEqual(_load_manifest(d), self._fresh_manifest())
        self.assertEqual((d / 'manifest.json.bak').read_bytes(), b'{"tick": {oops', 'the damaged file is kept')
        # same for a partial run with no manifest at all, and for a broken built-in entry
        (d / 'manifest.json').unlink()
        proc = _run(['--out', d, '--only', 'pop', '--no-preview'])
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(_load_manifest(d), self._fresh_manifest())
        man = _load_manifest(d)
        man['chime'] = 'garbage'
        man['whoosh'] = {'file': 'whoosh.wav'}
        (d / 'manifest.json').write_text(json.dumps(man), encoding='utf-8')
        proc = _run(['--out', d, '--only', 'pop', '--no-preview'])
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(_load_manifest(d), self._fresh_manifest())

    def test_analyze_only_survives_odd_custom_entries(self):
        d = self._scratch_copy()
        with wave.open(str(d / 'tick.wav'), 'rb') as w:
            frames = w.readframes(w.getnframes())
        left = array('h', frames)[0::2].tobytes()                     # mono
        deep = b''.join(b'\x00' + frames[i:i + 2] for i in range(0, len(frames), 2))   # 24-bit
        files = {'mono': (1, 2, left), 'deep': (2, 3, deep), 'silence': (2, 2, bytes(4 * 4800)),
                 'empty': (2, 2, b'')}
        for name, (ch, width, data) in files.items():
            with wave.open(str(d / f'{name}.wav'), 'wb') as w:
                w.setnchannels(ch)
                w.setsampwidth(width)
                w.setframerate(48000)
                w.writeframes(data)
        (d / 'text.wav').write_text('not a wav', encoding='utf-8')
        man = _load_manifest(d)
        for name in list(files) + ['text']:
            man[name] = {'file': f'{name}.wav', 'duration': 0.05, 'gain_db': -12.0, 'use': 'test'}
        man['weird'] = 'not an object'
        man['missing'] = {'file': 'nope.wav', 'gain_db': -12.0}
        (d / 'manifest.json').write_text(json.dumps(man), encoding='utf-8')
        proc = _run(['--out', d, '--analyze-only'], env=dict(os.environ, PYTHONWARNINGS='error::RuntimeWarning'))
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertNotIn('Traceback', proc.stderr)
        rows = {line.split()[0]: line.split() for line in proc.stdout.splitlines() if line.strip()}
        for name in REQUIRED + ['mono', 'deep', 'silence']:
            self.assertIn(name, rows, proc.stdout)
        self.assertEqual(rows['mono'][2], '-3.0')          # peak column, same audio as tick
        self.assertEqual(rows['deep'][2], '-3.0')
        for name in ('empty', 'text', 'weird', 'missing'):
            self.assertNotIn(name, rows)
            self.assertIn(f'[warn] {name}:', proc.stderr)


class SfxReaderTest(unittest.TestCase):
    """make_sfx.read_wav reads the integer PCM widths a hand-added custom sound may use."""

    def test_read_wav_widths(self):
        try:
            import numpy as np
        except ImportError:
            raise unittest.SkipTest('numpy not installed')
        M = _import_make_sfx()
        ref, rate = M.read_wav(SFX_DIR / 'tick.wav')
        self.assertEqual((rate, ref.shape[1]), (48000, 2))
        d = Path(tempfile.mkdtemp(prefix='sfx-test-read-'))
        self.addCleanup(shutil.rmtree, d, True)
        with wave.open(str(SFX_DIR / 'tick.wav'), 'rb') as w:
            frames = w.readframes(w.getnframes())
        variants = {
            1: bytes((((v + 32768) >> 8) & 0xFF) for v in array('h', frames)),   # 8-bit unsigned
            3: b''.join(b'\x00' + frames[i:i + 2] for i in range(0, len(frames), 2)),
            4: b''.join(b'\x00\x00' + frames[i:i + 2] for i in range(0, len(frames), 2)),
        }
        for width, data in variants.items():
            with self.subTest(bits=8 * width):
                path = d / f'w{width}.wav'
                with wave.open(str(path), 'wb') as w:
                    w.setnchannels(2)
                    w.setsampwidth(width)
                    w.setframerate(48000)
                    w.writeframes(data)
                x, r = M.read_wav(path)
                self.assertEqual((r, x.shape), (48000, ref.shape))
                self.assertLess(float(np.max(np.abs(x - ref))), 1.0 / 127 if width == 1 else 1e-6)


class SfxIntentTest(unittest.TestCase):
    """Measurements that pin each sound to its design intent and the manifest gains
    to an even loudness (so a design edit that breaks the brief fails loudly)."""

    @classmethod
    def setUpClass(cls):
        try:
            import numpy as np
        except ImportError:
            raise unittest.SkipTest('numpy not installed')
        make_sfx = _import_make_sfx()
        cls.np, cls.M = np, make_sfx
        cls.manifest = _load_manifest()
        cls.x = {n: make_sfx.read_wav(SFX_DIR / cls.manifest[n]['file'])[0] for n in REQUIRED}

    def _centroid(self, name):
        np, SR = self.np, self.M.SR
        mono = self.x[name].mean(axis=1)
        spec = np.abs(np.fft.rfft(mono)) ** 2
        freqs = np.fft.rfftfreq(len(mono), 1.0 / SR)
        return float(np.sum(freqs * spec) / np.sum(spec))

    def _mixed_loudness(self, name):
        return self.M.loudness(self.x[name]) + self.manifest[name]['gain_db']

    def test_gains_even_out_loudness(self):
        levels = {n: self._mixed_loudness(n) for n in REQUIRED}
        for name, lv in levels.items():
            with self.subTest(sound=name):
                self.assertTrue(-31.0 <= lv <= -21.0, f'{name} sits at {lv:.1f} LU after gain_db')
        self.assertLess(max(levels.values()) - min(levels.values()), 8.0, levels)

    def test_soft_variants_are_quieter_and_darker(self):
        # pop-soft keeps a soft 2nd harmonic so phones still hear it, hence the looser ratio
        for loud, soft, ratio in (('whoosh', 'whoosh-soft', 0.7), ('pop', 'pop-soft', 0.8)):
            with self.subTest(pair=soft):
                self.assertLess(self._mixed_loudness(soft), self._mixed_loudness(loud) - 2.0)
                self.assertLess(self._centroid(soft), ratio * self._centroid(loud))
        self.assertLess(self.manifest['whoosh-soft']['duration'], self.manifest['whoosh']['duration'])
        body = {n: self.M._dominant_hz(self.x[n].mean(axis=1), 0.04, 0.09) for n in ('pop', 'pop-soft')}
        self.assertLess(body['pop-soft'], 0.9 * body['pop'], f'pop-soft should settle lower: {body}')

    def test_durations_follow_the_brief(self):
        brief = {'whoosh': (0.6, 0.9), 'swipe': (0.2, 0.32), 'pop': (0.08, 0.16), 'tick': (0.02, 0.1),
                 'click': (0.02, 0.1), 'sparkle': (0.6, 1.0), 'riser': (1.3, 1.8), 'impact': (0.8, 1.2),
                 'chime': (1.2, 1.8), 'typing': (0.8, 1.2), 'confetti': (1.0, 1.4), 'success': (0.8, 1.3)}
        for name, (lo, hi) in brief.items():
            with self.subTest(sound=name):
                self.assertTrue(lo <= self.manifest[name]['duration'] <= hi, self.manifest[name]['duration'])

    def test_whooshes_pan_left_to_right(self):
        np = self.np
        for name in ('whoosh', 'swipe'):
            with self.subTest(sound=name):
                x = self.x[name]
                third = len(x) // 3
                head, tail = x[:third] ** 2, x[-third:] ** 2
                self.assertGreater(np.sum(head[:, 0]), 1.3 * np.sum(head[:, 1]), 'should start on the left')
                self.assertGreater(np.sum(tail[:, 1]), 1.3 * np.sum(tail[:, 0]), 'should end on the right')

    def test_tick_is_brighter_than_click(self):
        self.assertGreater(self._centroid('tick'), 1.5 * self._centroid('click'))

    def test_sync_points(self):
        limits = {'pop': 0.02, 'pop-soft': 0.02, 'tick': 0.02, 'click': 0.02, 'chime': 0.03,
                  'impact': 0.08, 'confetti': 0.15}
        for name, limit in limits.items():
            with self.subTest(sound=name):
                self.assertLess(self.manifest[name]['peak_time'], limit, 'transients hit at the start')
        riser = self.manifest['riser']
        self.assertGreater(riser['peak_time'], 0.85 * riser['duration'], 'a riser peaks at its end')
        whoosh = self.manifest['whoosh']
        self.assertTrue(0.3 < whoosh['peak_time'] / whoosh['duration'] < 0.7, 'a whoosh peaks mid-way')

    def test_pitch_contours(self):
        M = self.M
        pop = self.x['pop'].mean(axis=1)
        self.assertGreater(M._dominant_hz(pop, 0.0, 0.012), 1.6 * M._dominant_hz(pop, 0.04, 0.09), 'pop pitch drops')
        success = self.x['success'].mean(axis=1)
        # one window per note onset (0, 90, 180 ms), then the tail
        notes = [M._dominant_hz(success, s, s + 0.08) for s in (0.005, 0.095, 0.185)]
        self.assertEqual(notes, sorted(notes), f'success notes should rise: {notes}')
        self.assertGreater(notes[-1] / notes[0], 1.2, 'a rising interval of at least a major third')
        self.assertAlmostEqual(M._dominant_hz(success, 0.5, 0.58), notes[-1], delta=10.0,
                               msg='the top note is the one that rings on')

    def test_translates_to_small_speakers(self):
        # Most viewers hear these on a laptop or phone: a sound whose weight is all sub
        # bass (a 55 Hz thump) vanishes there while the loudness meter still counts it.
        for name in REQUIRED:
            with self.subTest(sound=name):
                x = self.x[name]
                self.assertGreater(self.M.speaker_loss(x, 'laptop'), -3.5)
                self.assertGreater(self.M.speaker_loss(x, 'phone'), -6.5)

    def test_stereo_image_is_centred(self):
        # Only the whooshes travel (left to right); everything else sits in the middle
        # (a little spread is fine) so it never pulls the eye/ear away from the narration.
        np = self.np

        def bal(seg):
            p = np.mean(seg ** 2, axis=0) + 1e-20
            return 10.0 * np.log10(p[1] / p[0])

        for name in REQUIRED:
            if name in ('whoosh', 'whoosh-soft', 'swipe'):
                continue
            with self.subTest(sound=name):
                x = self.x[name]
                self.assertLess(abs(bal(x)), 1.5, 'whole file off centre')
                third = len(x) // 3
                parts = [round(float(bal(x[i * third:(i + 1) * third])), 1) for i in range(3)]
                self.assertTrue(all(abs(v) < 3.0 for v in parts), f'R-L per third {parts} dB')


if __name__ == '__main__':
    unittest.main()

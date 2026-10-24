"""
First-run tooling tests: doctor.py and new_project.py.

  python -m unittest discover -s tests -p "test_*.py"

Headless, no network, no paid APIs. Optional dependencies are NOT required:
the doctor tests only check the report's structure and self-consistency.
`--smoke` flag handling is exercised against a stub render_video.py in a
throwaway skill copy; set STORYBOARD_TEST_SMOKE=1 to also run the real
`doctor.py --smoke` (renders a 2 s MP4 with the real render_video.py).
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

SKILL = Path(__file__).resolve().parent.parent
DOCTOR = SKILL / 'doctor.py'
NEW = SKILL / 'new_project.py'
if str(SKILL) not in sys.path:
    sys.path.insert(0, str(SKILL))
import doctor        # noqa: E402  (no side effects on import: main() is guarded)
import new_project   # noqa: E402
SECRET = 'sk_test_doctor_never_print_me_0123456789'
STATUSES = {'PASS', 'WARN', 'FAIL'}
CORE_REQUIRED = {'python', 'playwright', 'ffmpeg', 'numpy', 'skill_files'}
OPTIONAL = {'interpreters', 'edge_tts', 'elevenlabs', 'pyaaf2', 'node', 'sfx', 'assets'}


def run(args, timeout=240, env=None, cwd=None):
    return subprocess.run([sys.executable] + [str(a) for a in args], stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, stdin=subprocess.DEVNULL, universal_newlines=True,
                          encoding='utf-8', errors='replace', timeout=timeout, env=env, cwd=cwd)


def read(path):
    with open(str(path), encoding='utf-8', newline='') as f:
        return f.read()


def style_block(html):
    m = re.search(r'(?is)<style\b[^>]*>(.*?)</style>', html)
    return m.group(1) if m else None


def _env(**extra):
    env = dict(os.environ)
    env['PYTHONIOENCODING'] = 'utf-8'
    env.update(extra)
    return env


class DoctorJsonTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.proc = run([DOCTOR, '--json'], env=_env(ELEVENLABS_API_KEY=SECRET))
        try:
            cls.report = json.loads(cls.proc.stdout)
        except ValueError:
            raise AssertionError('doctor --json did not print JSON.\nstdout:\n%s\nstderr:\n%s'
                                 % (cls.proc.stdout[-2000:], cls.proc.stderr[-2000:]))
        cls.by_id = dict((c['id'], c) for c in cls.report['checks'])

    def test_report_structure(self):
        r = self.report
        for key in ('ok', 'skill_dir', 'engine_version', 'python', 'summary', 'checks', 'platform'):
            self.assertIn(key, r)
        self.assertIsInstance(r['ok'], bool)
        self.assertEqual(Path(r['skill_dir']).resolve(), SKILL)
        ids = [c['id'] for c in r['checks']]
        self.assertEqual(len(ids), len(set(ids)), 'duplicate check ids: %s' % ids)
        for c in r['checks']:
            for key in ('id', 'name', 'required', 'status', 'detail', 'fix', 'data'):
                self.assertIn(key, c, c)
            self.assertIn(c['status'], STATUSES)
            self.assertIsInstance(c['required'], bool)
            self.assertTrue(c['detail'].strip(), c)
            self.assertIsInstance(c['data'], dict)
            if c['fix'] is not None:
                self.assertEqual(set(c['fix']), {'powershell', 'bash'})
                self.assertTrue(c['fix']['powershell'] and c['fix']['bash'])

    def test_expected_checks_present(self):
        self.assertTrue(CORE_REQUIRED <= set(self.by_id), sorted(self.by_id))
        self.assertTrue(OPTIONAL <= set(self.by_id), sorted(self.by_id))
        for cid in CORE_REQUIRED:
            self.assertTrue(self.by_id[cid]['required'], cid)
        for cid in OPTIONAL:
            self.assertFalse(self.by_id[cid]['required'], cid)
            self.assertNotEqual(self.by_id[cid]['status'], 'FAIL', 'optional checks may only WARN: %s' % cid)

    def test_exit_code_and_summary_consistent(self):
        r = self.report
        required_fail = any(c['required'] and c['status'] == 'FAIL' for c in r['checks'])
        self.assertEqual(r['ok'], not required_fail)
        self.assertEqual(self.proc.returncode, 0 if r['ok'] else 1, self.proc.stderr[-1500:])
        counts = {'pass': 0, 'warn': 0, 'fail': 0}
        for c in r['checks']:
            counts[c['status'].lower()] += 1
        self.assertEqual(r['summary'], counts)

    def test_python_check_reflects_this_interpreter(self):
        c = self.by_id['python']
        self.assertIn(c['status'], ('PASS', 'WARN'))   # tests run on >= 3.9; WARN only if pip is missing
        v = sys.version_info
        self.assertEqual(c['data']['version'], '%d.%d.%d' % (v[0], v[1], v[2]))

    def test_api_key_never_printed(self):
        self.assertNotIn(SECRET, self.proc.stdout)
        self.assertNotIn(SECRET, self.proc.stderr)
        self.assertTrue(self.by_id['elevenlabs']['data']['api_key_set'])

    def test_table_output(self):
        env = _env()
        env.pop('ELEVENLABS_API_KEY', None)
        p = run([DOCTOR, '--no-color'], env=env)
        self.assertIn(p.returncode, (0, 1))
        self.assertIn('STATUS', p.stdout)
        self.assertRegex(p.stdout, r'(?m)^(PASS|WARN|FAIL)\s+(req|opt)\s+Python\b')
        self.assertIn('READY' if p.returncode == 0 else 'NOT READY', p.stdout)
        self.assertNotIn('\033[', p.stdout)

    @unittest.skipUnless(os.environ.get('STORYBOARD_TEST_SMOKE') == '1', 'set STORYBOARD_TEST_SMOKE=1 to render')
    def test_smoke_render(self):
        p = run([DOCTOR, '--json', '--smoke'], timeout=600)
        rep = json.loads(p.stdout)
        smoke = [c for c in rep['checks'] if c['id'] == 'smoke']
        self.assertEqual(len(smoke), 1)
        self.assertIn(smoke[0]['status'], ('PASS', 'WARN'), smoke[0])
        self.assertEqual(smoke[0]['data'].get('mismatch'), [], smoke[0])   # 1920x1080, ~2 s when --duration exists


class ParseCliHelpTests(unittest.TestCase):
    def test_real_render_video_help(self):
        p = run([SKILL / 'render_video.py', '--help'], timeout=90)
        self.assertEqual(p.returncode, 0, p.stderr[-800:])
        opts = doctor.parse_cli_help(p.stdout)
        for flag in ('--out', '--no-audio', '--duration'):
            self.assertIn(flag, opts)
        if '--quality' in opts and opts['--quality'] is not None:
            self.assertIn('fast', opts['--quality'])

    def test_prose_mentions_are_not_options(self):
        text = ('usage: r.py [-h] [--out OUT] [--quality {high,balanced}]\n'
                '            [--no-audio] html\n\n'
                'Renders a deck. Tip: --quality fast is quicker; --cpu fixes blank capture.\n\n'
                'options:\n  --out OUT   where\n')
        opts = doctor.parse_cli_help(text)
        self.assertEqual(opts, {'--out': None, '--quality': ['high', 'balanced'], '--no-audio': None})

    def test_without_usage_block_reads_option_rows_only(self):
        opts = doctor.parse_cli_help('Options:\n  --quality Q   fast|high\n  -c, --cpu   x\nthen use --frames\n')
        self.assertEqual(opts, {'--quality': None, '--cpu': None})

    def test_ansi_coloured_help(self):
        # Python 3.14 argparse output under FORCE_COLOR=1 / PYTHON_COLORS=1 (even into a pipe).
        text = ('\x1b[1;34musage: \x1b[0m\x1b[1;35mr.py\x1b[0m [\x1b[32m-h\x1b[0m] [\x1b[36m--out \x1b[33mOUT\x1b[0m]'
                '\r\n            [\x1b[36m--quality \x1b[33m{high,fast}\x1b[0m] [\x1b[36m--duration \x1b[33mD\x1b[0m] '
                '[\x1b[36m--cpu\x1b[0m]\r\n\r\nprose --frames\r\n')
        self.assertEqual(doctor.parse_cli_help(text), {'--out': None, '--quality': ['high', 'fast'],
                                                       '--duration': None, '--cpu': None})

    def test_real_render_video_help_with_forced_colour(self):
        forced = _env(FORCE_COLOR='1', PYTHON_COLORS='1')
        p = run([SKILL / 'render_video.py', '--help'], timeout=90, env=forced)   # coloured on Python 3.14+
        self.assertEqual(p.returncode, 0, p.stderr[-800:])
        opts = doctor.parse_cli_help(p.stdout)
        self.assertIn('--duration', opts)
        self.assertIn('--no-audio', opts)
        # doctor's own runner asks children for plain text, so what it parses has no escape codes at all
        with mock.patch.dict(os.environ, {'FORCE_COLOR': '1', 'PYTHON_COLORS': '1'}):
            rc, out, err = doctor._run([sys.executable, str(SKILL / 'render_video.py'), '--help'], timeout=90)
        self.assertEqual(rc, 0, err[-800:])
        self.assertNotIn('\x1b', out + err)
        self.assertEqual(doctor.parse_cli_help(out), opts)


class DoctorUnitTests(unittest.TestCase):
    """Pure functions / single checks with a fabricated interpreter context (no PATH probing)."""

    def _ctx(self, first, probes=None):
        ctx = doctor.Ctx.__new__(doctor.Ctx)
        ctx.me = doctor._norm(sys.executable)
        ctx.first = first
        ctx.probes = list(probes if probes is not None else [p for p in first.values() if p])
        named = first.get('python')
        if named and named['executable'] and not named['broken'] and doctor._norm(named['executable']) == ctx.me:
            ctx.py_ps = ctx.py_bash = 'python'
        else:
            ctx.py_ps, ctx.py_bash = '& "%s"' % sys.executable, '"%s"' % sys.executable.replace('\\', '/')
        return ctx

    ME = {'launcher': sys.executable, 'executable': sys.executable, 'version': '3.14.0', 'broken': None}
    BROKEN = {'launcher': os.path.join('C:\\Broken314' if os.name == 'nt' else '/opt/broken/bin', 'python'),
              'executable': 'C:\\Broken314\\python.exe' if os.name == 'nt' else '/opt/broken/bin/python',
              'version': '3.14.0', 'broken': 'Could not find platform independent libraries <prefix>'}
    OTHER = {'launcher': os.path.join('C:\\Other312' if os.name == 'nt' else '/opt/other/bin', 'python'),
             'executable': 'C:\\Other312\\python.exe' if os.name == 'nt' else '/opt/other/bin/python',
             'version': '3.12.1', 'broken': None}

    def _fix(self, ctx):
        r = doctor.check_interpreters(ctx)
        self.assertEqual(r['status'], 'WARN', r)
        self.assertIsNotNone(r['fix'], r)
        return r, r['fix']['powershell'], r['fix']['bash']

    def test_broken_python_on_path_gets_a_path_fix_not_pip(self):
        r, ps, sh = self._fix(self._ctx({'python': self.BROKEN}, [self.BROKEN, self.ME]))
        self.assertNotIn('python -m pip install', ps + sh, 'installing into a broken python cannot work')
        self.assertIn('$env:Path = "%s' % os.path.dirname(sys.executable), ps)
        self.assertIn('export PATH="%s' % doctor._bash_path(os.path.dirname(sys.executable)), sh)
        self.assertIn(self.BROKEN['executable'], ps)   # and how to deal with the broken install itself

    def test_no_python_on_path_gets_a_path_fix(self):
        r, ps, sh = self._fix(self._ctx({}, []))
        self.assertIn("no working 'python'", r['detail'])
        self.assertNotIn('python -m pip install', ps + sh)
        self.assertIn('$env:Path', ps)
        self.assertIn('export PATH=', sh)

    def test_only_a_broken_side_interpreter_still_has_a_fix(self):
        broken_py = dict(self.BROKEN, launcher=os.path.join('C:\\WINDOWS' if os.name == 'nt' else '/usr/bin',
                                                           'py.exe' if os.name == 'nt' else 'py'))
        r, ps, sh = self._fix(self._ctx({'python': self.ME, 'py': broken_py}, [self.ME, broken_py]))
        self.assertIn(self.BROKEN['executable'], ps)
        self.assertNotIn('$env:Path', ps)   # 'python' is fine: no PATH surgery
        if os.name == 'nt':
            self.assertIn('py --list-paths', ps)

    def test_other_working_python_on_path_gets_the_install_fix(self):
        r, ps, sh = self._fix(self._ctx({'python': self.OTHER}, [self.OTHER, self.ME]))
        self.assertIn('python -m pip install playwright imageio-ffmpeg numpy', ps)
        self.assertNotIn('$env:Path', ps)

    def test_bash_path(self):
        if os.name == 'nt':
            self.assertEqual(doctor._bash_path('C:\\Users\\me\\py'), '/c/Users/me/py')
            self.assertEqual(doctor._bash_path('D:\\'), '/d')
        else:
            self.assertEqual(doctor._bash_path('/usr/bin'), '/usr/bin')

    def test_git_restore_fix_names_only_tracked_files(self):
        if not (SKILL / '.git').exists() or not shutil.which('git'):
            self.skipTest('the skill is not a git checkout (or git is not on PATH)')
        fix = doctor._git_restore_fix(['render_video.py', 'no-such-file-xyz.py'])
        self.assertIsNotNone(fix)
        self.assertIn('checkout -- render_video.py', fix['powershell'])
        self.assertNotIn('no-such-file-xyz.py', fix['powershell'])
        self.assertIsNone(doctor._git_restore_fix(['no-such-file-xyz.py']))

    def test_playwright_banner_is_summarised(self):
        msg = ("BrowserType.launch: Executable doesn't exist at C:\\pw\\chrome-headless-shell.exe\n"
               u'\u2554' + u'\u2550' * 20 + u'\u2557\n'
               u'\u2551 Looks like Playwright was just installed or updated. \u2551\n'
               u'\u2551     playwright install     \u2551\n'
               u'\u2551 <3 Playwright Team \u2551\n' + u'\u255a' + u'\u2550' * 20 + u'\u255d')
        s = doctor._pw_error_summary(msg)
        self.assertEqual(s, "Executable doesn't exist at C:\\pw\\chrome-headless-shell.exe")
        self.assertEqual(doctor._pw_error_summary('Error: boom\n  at x'), 'Error: boom at x')


# A stand-in render_video.py whose CLI lacks the `fast` quality: --smoke must read the --help usage
# block and adapt -- the description's prose mentions `--quality fast` and `--cpu` as a trap.
STUB_RENDER = r'''
import json, os, subprocess, sys
from pathlib import Path
args = sys.argv[1:]
if '-h' in args or '--help' in args:
    if __MODE__ == 'long':   # coloured like Python 3.14 argparse under FORCE_COLOR, and it has --duration
        e = '\x1b'
        print('%s[1;34musage: %s[0mrender_video.py [%s[36m--out %s[33mOUT%s[0m] [%s[36m--no-audio%s[0m] '
              '[%s[36m--duration %s[33mDURATION%s[0m] html' % ((e,) * 10))
    elif __MODE__ == 'tail':
        print('usage: render_video.py [-h] [--out OUT] [--no-audio] [--duration DURATION] html')
    else:
        print('usage: render_video.py [-h] [--out OUT] [--no-audio] [--quality {high,balanced}] html')
    print()
    print('Stub renderer. Tip: --quality fast is quicker; use --cpu when the capture is blank.')
    sys.exit(0)
html = Path(args[0])
Path(__file__).with_name('stub_call.json').write_text(json.dumps(
    {'args': args, 'engine_next_to_deck': (html.parent / 'storyboard-engine.js').is_file(),
     'deck_has_init': 'Storyboard.init(' in html.read_text(encoding='utf-8'),
     'FORCE_COLOR': os.environ.get('FORCE_COLOR'), 'NO_COLOR': os.environ.get('NO_COLOR')}))
if __MODE__ == 'fail':
    sys.stderr.write('stub render exploded\n')
    sys.exit(3)
if __MODE__ == 'junk':   # an "MP4" ffmpeg cannot decode: the content check cannot run
    Path(args[args.index('--out') + 1]).write_bytes(b'not a video at all' * 64)
    sys.exit(0)
# 'ok': what the smoke deck asks for (1920x1080, 2 s). 'long': ignores --duration and the deck size.
# 'tail': honours --duration 2 like the real real-time renderer does -- plus its ~0.6 s capture tail.
size, secs = {'long': ('320x180', '6'), 'tail': ('1920x1080', '2.68')}.get(__MODE__, ('1920x1080', '2'))
import imageio_ffmpeg
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi',
                '-i', 'testsrc=size=%s:rate=30' % size, '-t', secs, '-pix_fmt', 'yuv420p', '-c:v', 'libx264',
                '-preset', 'ultrafast', args[args.index('--out') + 1]], check=True, stdin=subprocess.DEVNULL)
'''
TOOL_FILES = ['sb_deckio.py', 'tts_free.py', 'elevenlabs_generate.py', 'audit_deck.py', 'aaf_to_timings.py']


class DoctorSmokeAdaptsTests(unittest.TestCase):
    """doctor --smoke against a throwaway skill copy with a stub renderer (fast, no Chromium render)."""

    def setUp(self):
        try:
            import imageio_ffmpeg  # noqa: F401  (a required dep, but keep the suite runnable without it)
        except Exception:
            self.skipTest('imageio-ffmpeg not installed')
        self.tmp = Path(tempfile.mkdtemp(prefix='sb doctor smoke '))
        self.fake = self.tmp / 'fake skill'
        self.fake.mkdir()
        shutil.copyfile(str(DOCTOR), str(self.fake / 'doctor.py'))
        for f in ['template.html', 'vertical_template.html', 'concept.template.md', 'script.template.md'] + TOOL_FILES:
            (self.fake / f).write_text('# placeholder\n', encoding='utf-8')
        (self.fake / 'storyboard-engine.js').write_text(
            "/* STORYBOARD ENGINE (v0.1) */\nwindow.Storyboard = { VERSION: '9.9.9' };\n", encoding='utf-8')
        self._write_stub('ok')

    def _write_stub(self, mode):
        (self.fake / 'render_video.py').write_text(STUB_RENDER.replace('__MODE__', repr(mode)), encoding='utf-8')

    def tearDown(self):
        shutil.rmtree(str(self.tmp), ignore_errors=True)

    def _smoke(self, mode):
        self._write_stub(mode)
        p = run([self.fake / 'doctor.py', '--json', '--smoke'], timeout=300, env=_env())
        rep = json.loads(p.stdout)
        smoke = [c for c in rep['checks'] if c['id'] == 'smoke']
        self.assertEqual(len(smoke), 1, rep['checks'])
        return p, rep, smoke[0]

    def test_smoke_uses_only_supported_flags(self):
        p, rep, smoke = self._smoke('ok')
        self.assertEqual(rep['engine_version'], '9.9.9')
        by_id = dict((c['id'], c) for c in rep['checks'])
        sf, node = by_id['skill_files'], by_id['node']
        self.assertEqual(sf['status'], 'PASS', sf)
        if node['status'] == 'PASS':   # a node that actually runs (18+) must parse the trivial fake engine
            self.assertEqual(sf['data']['engine_syntax'], 'ok', sf['data'])
        else:                          # none / broken shim / old node: optional, so left unchecked, never FAIL
            self.assertIn(sf['data']['engine_syntax'].split(' ')[0], ('ok', 'unchecked'), sf['data'])
        if smoke['detail'].startswith('skipped'):
            self.skipTest('a required check failed on this machine: ' + smoke['detail'])
        self.assertEqual(smoke['status'], 'PASS', smoke)
        self.assertTrue(smoke['required'])
        call = json.loads((self.fake / 'stub_call.json').read_text())
        self.assertIn('--no-audio', call['args'])
        self.assertIn('--out', call['args'])
        self.assertNotIn('--quality', call['args'], 'flag not in the renderer --help must not be passed')
        self.assertTrue(call['engine_next_to_deck'])
        self.assertTrue(call['deck_has_init'])
        att = smoke['data']['attempts'][-1]
        self.assertIsInstance(att['seconds'], float)
        self.assertEqual(att['resolution'], '1920x1080')
        self.assertTrue(att['frames_checked'])
        self.assertFalse(att['blank'])
        self.assertEqual(smoke['data']['mismatch'], [])
        self.assertIsNone(smoke['data']['expected']['duration'], 'no --duration flag -> no length to hold it to')
        self.assertFalse(Path(smoke['data']['dir']).exists(), 'smoke temp dir must be removed')

    def test_smoke_forced_colour_and_wrong_output_are_caught(self):
        # FORCE_COLOR=1 makes argparse colour --help even into a pipe: doctor must switch colour off for its
        # children, still find --duration in the (coloured) usage, and WARN when the MP4 ignores it.
        self._write_stub('long')
        p = run([self.fake / 'doctor.py', '--json', '--smoke'], timeout=300,
                env=_env(FORCE_COLOR='1', PYTHON_COLORS='1'))
        rep = json.loads(p.stdout)
        smoke = [c for c in rep['checks'] if c['id'] == 'smoke'][0]
        if smoke['detail'].startswith('skipped'):
            self.skipTest('a required check failed on this machine: ' + smoke['detail'])
        call = json.loads((self.fake / 'stub_call.json').read_text())
        self.assertIsNone(call['FORCE_COLOR'])
        self.assertEqual(call['NO_COLOR'], '1')
        self.assertIn('--duration', call['args'])
        self.assertEqual(call['args'][call['args'].index('--duration') + 1], '2.0')
        self.assertEqual(smoke['status'], 'WARN', smoke)
        self.assertIn('does not match what was asked for', smoke['detail'])
        mismatch = ' '.join(smoke['data']['mismatch'])
        self.assertIn('320x180 instead of', mismatch)
        self.assertIn('--duration 2 was passed', mismatch)
        self.assertNotIn('\x1b', p.stdout)

    def test_smoke_accepts_the_renderers_capture_tail(self):
        # render_video.py's real-time capture records duration + ~0.6 s (and more on a busy machine): a
        # 2.68 s MP4 for --duration 2 is a healthy render, not "render_video.py is not honouring its options".
        p, rep, smoke = self._smoke('tail')
        if smoke['detail'].startswith('skipped'):
            self.skipTest('a required check failed on this machine: ' + smoke['detail'])
        call = json.loads((self.fake / 'stub_call.json').read_text())
        self.assertIn('--duration', call['args'])
        self.assertEqual(smoke['data']['expected']['duration'], 2.0)
        lo, hi = smoke['data']['expected']['duration_range']
        self.assertTrue(lo <= 2.0 and hi >= 3.0, (lo, hi))
        self.assertAlmostEqual(smoke['data']['attempts'][-1]['duration'], 2.68, delta=0.1)
        self.assertEqual(smoke['data']['mismatch'], [], smoke)
        self.assertEqual(smoke['status'], 'PASS', smoke)
        self.assertNotIn('does not match', smoke['detail'])

    def test_missing_tool_files_warn_but_do_not_fail(self):
        (self.fake / 'sb_deckio.py').unlink()
        p = run([self.fake / 'doctor.py', '--json'], timeout=300, env=_env())
        rep = json.loads(p.stdout)
        sf = [c for c in rep['checks'] if c['id'] == 'skill_files'][0]
        self.assertEqual(sf['status'], 'WARN', sf)
        self.assertEqual(sf['data']['tools_missing'], ['sb_deckio.py'])
        self.assertIn('sb_deckio.py', sf['detail'])
        self.assertIn('elevenlabs_generate.py cannot start', sf['detail'])
        self.assertIsNone(sf['fix'], 'the throwaway copy is no git checkout: no git restore command')

    def test_smoke_warns_when_frames_cannot_be_checked(self):
        p, rep, smoke = self._smoke('junk')
        if smoke['detail'].startswith('skipped'):
            self.skipTest('a required check failed on this machine: ' + smoke['detail'])
        self.assertEqual(smoke['status'], 'WARN', smoke)   # never a silent PASS without a content check
        self.assertIn('Could not decode sample frames', smoke['detail'])
        self.assertFalse(smoke['data']['attempts'][-1]['frames_checked'])

    @unittest.skipUnless(shutil.which('node'), 'node not on PATH')
    def test_engine_syntax_error_fails_skill_files(self):
        (self.fake / 'storyboard-engine.js').write_text("window.Storyboard = { VERSION: '9.9.9' ;\n", encoding='utf-8')
        p = run([self.fake / 'doctor.py', '--json'], timeout=300, env=_env())
        rep = json.loads(p.stdout)
        sf = [c for c in rep['checks'] if c['id'] == 'skill_files'][0]
        node = [c for c in rep['checks'] if c['id'] == 'node'][0]
        if node['status'] != 'PASS' or int(re.match(r'v?(\d+)', node['data']['version']).group(1)) < 20:
            self.skipTest('needs a working node 20+ on PATH (got: %s)' % node['detail'])
        self.assertEqual(sf['status'], 'FAIL', sf)
        self.assertEqual(sf['data']['engine_syntax'], 'error')
        self.assertIn('line 1', sf['detail'])
        self.assertIn('SyntaxError', sf['detail'])
        self.assertEqual(p.returncode, 1)

    def _fake_node(self, version, check='syntax'):
        """Put a fake `node` first on PATH. version=None: a broken shim ('nvm use' not run) whose every
        call fails. check='syntax': `--check` prints a SyntaxError that points into the engine;
        'other': it fails without one."""
        bin_dir = self.tmp / 'fake node bin'
        bin_dir.mkdir(exist_ok=True)
        if os.name == 'nt':
            (bin_dir / 'node.bat').write_text(
                '@echo off\r\n'
                'if "%~1"=="--version" goto version\r\n'
                'if "%FAKE_NODE_CHECK%"=="other" goto other\r\n'
                'echo %~2:1 1>&2\r\n'
                "echo SyntaxError: Unexpected token '.' 1>&2\r\n"
                'exit /b 1\r\n'
                ':other\r\n'
                'echo Error: something unrelated broke 1>&2\r\n'
                'exit /b 1\r\n'
                ':version\r\n'
                'if "%FAKE_NODE_VERSION%"=="" goto broken\r\n'
                'echo %FAKE_NODE_VERSION%\r\n'
                'exit /b 0\r\n'
                ':broken\r\n'
                'echo No installation recognized. Run "nvm use" first. 1>&2\r\n'
                'exit /b 1\r\n', encoding='ascii', newline='')
        else:
            sh = bin_dir / 'node'
            sh.write_text(
                '#!/bin/sh\n'
                'if [ "$1" = "--version" ]; then\n'
                '  if [ -z "$FAKE_NODE_VERSION" ]; then echo "No installation recognized." >&2; exit 1; fi\n'
                '  echo "$FAKE_NODE_VERSION"; exit 0\n'
                'fi\n'
                'if [ "$FAKE_NODE_CHECK" = "other" ]; then echo "Error: something unrelated broke" >&2; exit 1; fi\n'
                'echo "$2:1" >&2; echo "SyntaxError: Unexpected token \'.\'" >&2; exit 1\n', encoding='ascii')
            sh.chmod(0o755)
        return _env(PATH=str(bin_dir) + os.pathsep + os.environ.get('PATH', ''),
                    FAKE_NODE_VERSION=version or '', FAKE_NODE_CHECK=check)

    def test_unusable_or_old_node_never_fails_skill_files(self):
        # node is optional: a broken shim, an old node or an unrelated --check error must not make doctor
        # say NOT READY; only a trusted node's SyntaxError in the engine may FAIL the required row.
        cases = [(None, 'syntax', 'PASS', 'unchecked (node does not run)'),
                 ('v12.22.0', 'syntax', 'PASS', 'unchecked (node v12.22.0 is too old'),
                 ('v22.1.0', 'other', 'PASS', 'unchecked (node --check failed'),
                 ('v18.20.0', 'syntax', 'WARN', 'error'),
                 ('v22.1.0', 'syntax', 'FAIL', 'error')]
        for version, check, want, syntax in cases:
            with self.subTest(node=version, check=check):
                p = run([self.fake / 'doctor.py', '--json'], timeout=300, env=self._fake_node(version, check))
                rep = json.loads(p.stdout)
                by_id = dict((c['id'], c) for c in rep['checks'])
                sf, node = by_id['skill_files'], by_id['node']
                self.assertEqual(sf['status'], want, sf)
                self.assertTrue(sf['data']['engine_syntax'].startswith(syntax), sf['data'])
                self.assertEqual(Path(node['data'].get('exe') or '').parent, self.tmp / 'fake node bin', node)
                if version is None or version.startswith('v12'):
                    self.assertEqual(node['status'], 'WARN', node)
                if want == 'FAIL':
                    self.assertIn('line 1', sf['detail'])
                    self.assertFalse(rep['ok'])
                    self.assertEqual(p.returncode, 1)
                else:
                    self.assertNotIn('does not parse', sf['detail'])
                    other_fail = any(c['required'] and c['status'] == 'FAIL' for c in rep['checks'])
                    self.assertEqual(p.returncode, 1 if other_fail else 0)   # this machine's own gaps only

    def test_slow_chromium_launch_is_retried_not_failed(self):
        # A healthy Chromium on a busy machine (or under a first-launch antivirus scan) can miss the 10 s
        # launch timeout: doctor retries once with a long timeout -> WARN, not a required FAIL (NOT READY).
        fake_pw = self.tmp / 'fake pw' / 'playwright'
        fake_pw.mkdir(parents=True)
        (fake_pw / '__init__.py').write_text('', encoding='utf-8')
        (fake_pw / 'sync_api.py').write_text(
            'import os\n'
            'class TimeoutError(Exception):\n    pass\n'
            'class _Page(object):\n'
            '    def set_content(self, html): pass\n'
            '    def evaluate(self, js): return "ok"\n'
            'class _Browser(object):\n'
            '    version = "999.0-fake"\n'
            '    def new_page(self): return _Page()\n'
            '    def close(self): pass\n'
            'class _Chromium(object):\n'
            '    def launch(self, headless=True, timeout=30000):\n'
            '        if os.environ.get("FAKE_PW") == "dead" or timeout <= 10000:\n'
            '            raise TimeoutError("BrowserType.launch: Timeout %dms exceeded." % timeout)\n'
            '        return _Browser()\n'
            'class _PW(object):\n'
            '    chromium = _Chromium()\n'
            '    def __enter__(self): return self\n'
            '    def __exit__(self, *a): return False\n'
            'def sync_playwright(): return _PW()\n', encoding='utf-8')
        pypath = str(fake_pw.parent) + os.pathsep + os.environ.get('PYTHONPATH', '')
        for mode, want in (('slow', 'WARN'), ('dead', 'FAIL')):
            with self.subTest(mode=mode):
                p = run([self.fake / 'doctor.py', '--json'], timeout=300, env=_env(PYTHONPATH=pypath, FAKE_PW=mode))
                rep = json.loads(p.stdout)
                pw = [c for c in rep['checks'] if c['id'] == 'playwright'][0]
                self.assertEqual(pw['status'], want, pw)
                if mode == 'slow':
                    self.assertIn('only on a retry', pw['detail'])
                    self.assertTrue(pw['data']['first_attempt_timed_out'])
                    self.assertEqual(pw['data']['browser_version'], '999.0-fake')
                else:
                    self.assertIn('did not launch', pw['detail'])
                    self.assertFalse(rep['ok'])
                    self.assertEqual(p.returncode, 1)

    def test_smoke_failure_is_reported_and_fails_the_run(self):
        p, rep, smoke = self._smoke('fail')
        if smoke['detail'].startswith('skipped'):
            self.skipTest('a required check failed on this machine: ' + smoke['detail'])
        self.assertEqual(smoke['status'], 'FAIL')
        self.assertIn('stub render exploded', smoke['detail'])
        self.assertFalse(rep['ok'])
        self.assertEqual(p.returncode, 1)


class NewProjectTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix='sb new project '))   # a space in every path on purpose

    def tearDown(self):
        shutil.rmtree(str(self.tmp), ignore_errors=True)

    def _create(self, *args, **kw):
        p = run([NEW] + list(args), timeout=120, env=_env(), **kw)
        self.assertEqual(p.returncode, 0, 'new_project failed:\n%s\n%s' % (p.stdout, p.stderr))
        return p

    def _check_common(self, out, title, template_name, other_template):
        for f in ('storyboard.html', 'storyboard-engine.js', 'concept.md', 'script.md'):
            self.assertTrue((out / f).is_file(), f)
        self.assertFalse((out / 'assets' / 'vendor').exists(), 'vendor files must only be copied on request')
        self.assertEqual((out / 'storyboard-engine.js').read_bytes(), (SKILL / 'storyboard-engine.js').read_bytes())
        html = read(out / 'storyboard.html')
        esc = title.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        self.assertIn('<title>%s</title>' % esc, html)
        self.assertNotIn('{{TITLE}}', html)
        self.assertNotIn('{{AUDIO_SRC}}', html)
        self.assertRegex(html, r'<audio\b[^>]*\bsrc="voiceover\.mp3"')
        # The deck is the requested template (compare the whole CSS block, not a fragile marker).
        src_style = style_block(read(SKILL / template_name))
        self.assertEqual(style_block(html), src_style)
        self.assertNotEqual(style_block(html), style_block(read(SKILL / other_template)))
        self._check_conventions(out, html)
        concept, script = read(out / 'concept.md'), read(out / 'script.md')
        if '"{{TITLE}}"' in read(SKILL / 'concept.template.md'):
            self.assertIn('"title": %s' % json.dumps(title, ensure_ascii=False), concept)
        self.assertNotIn('{{TITLE}}', concept)
        self.assertNotIn('{{TITLE}}', script)
        if '{{AUDIO_FILENAME}}' in read(SKILL / 'script.template.md'):
            self.assertIn('voiceover.mp3', script)
        return html, concept

    def _check_conventions(self, out, html):
        # const WORDS + words: WORDS wired into the init call (deck convention), exactly once.
        init = re.search(r'\b(?:Storyboard|STORYBOARD)\.init\s*\(\s*\{(.*?)\}\s*\)', html, re.S)
        if init:
            self.assertEqual(len(re.findall(r'\bconst\s+WORDS\s*=\s*\[', html)), 1)
            self.assertRegex(init.group(1), r'(?<![\w.])words\s*:\s*WORDS\b')
            self.assertLess(html.index('const WORDS'), init.start(), 'WORDS must be declared before init')
        # script.md: exactly one parseable ```json {"beats": [...]} block.
        script = read(out / 'script.md')
        blocks = [b for b in re.findall(r'(?ms)^```[ \t]*json[^\n]*\n(.*?)^```', script) if '"beats"' in b]
        self.assertEqual(len(blocks), 1, 'script.md needs one beats block')
        beats = json.loads(blocks[0])['beats']
        self.assertTrue(beats)
        if '"beats"' not in read(SKILL / 'script.template.md'):   # generated by new_project: one per slide
            n = len(re.findall(r'<section\b[^>]*\bclass="(?:[^"]*\s)?slide(?:\s[^"]*)?"', html))
            self.assertEqual([b['slide'] for b in beats], list(range(1, n + 1)))
            for b in beats:
                self.assertEqual(set(b), {'slide', 'text', 'pause_after'})
        # No mixed line endings in anything this tool writes.
        for f in ('storyboard.html', 'concept.md', 'script.md'):
            raw = (out / f).read_bytes()
            crlf = raw.count(b'\r\n')
            self.assertIn(crlf, (0, raw.count(b'\n')), 'mixed line endings in %s' % f)

    def test_creates_16x9_project(self):
        out = self.tmp / 'my video 16x9'
        title = 'Launch "Day" & <Co>'
        self._create(out, '--title', title)
        html, concept = self._check_common(out, title, 'template.html', 'vertical_template.html')
        if '{{ASPECT' in read(SKILL / 'concept.template.md'):
            self.assertIn('"aspect": "16:9"', concept)

    def test_creates_9x16_project(self):
        out = self.tmp / 'my video 9x16'
        self._create(out, '--aspect', '9:16', '--title', 'Vertical cut')
        html, concept = self._check_common(out, 'Vertical cut', 'vertical_template.html', 'template.html')
        if '{{ASPECT' in read(SKILL / 'concept.template.md'):
            self.assertIn('"aspect": "9:16"', concept)

    def test_default_title_from_folder_name(self):
        out = self.tmp / 'launch-day video'
        self._create(out)
        self.assertIn('<title>Launch Day Video</title>', read(out / 'storyboard.html'))

    def test_refuses_to_overwrite_without_force(self):
        out = self.tmp / 'proj'
        self._create(out)
        deck = out / 'storyboard.html'
        with open(str(deck), 'a', encoding='utf-8') as f:
            f.write('\n<!-- USER EDIT MARKER -->\n')
        (out / 'concept.md').unlink()           # a missing file must NOT be recreated by a refused run
        (out / 'notes.txt').write_text('mine', encoding='utf-8')

        p = run([NEW, out], timeout=120, env=_env())
        self.assertNotEqual(p.returncode, 0)
        self.assertIn('--force', p.stderr)
        self.assertIn('storyboard.html', p.stderr)
        self.assertIn('USER EDIT MARKER', read(deck))
        self.assertFalse((out / 'concept.md').exists(), 'refused run must write nothing')

        self._create(out, '--force')
        self.assertNotIn('USER EDIT MARKER', read(deck))
        self.assertTrue((out / 'concept.md').is_file())
        self.assertEqual((out / 'notes.txt').read_text(encoding='utf-8'), 'mine', 'unrelated files are never touched')

    def test_with_3d_copies_vendor_files(self):
        vendor = SKILL / 'assets' / 'vendor'
        three = sorted(vendor.glob('three*.js'))
        if not (vendor / 'three.min.js').is_file():
            self.skipTest('skill has no assets/vendor/three.min.js')
        out = self.tmp / 'three d'
        self._create(out, '--with-3d')
        html = read(out / 'storyboard.html')
        for src in three:
            dst = out / 'assets' / 'vendor' / src.name
            self.assertTrue(dst.is_file(), src.name)
            self.assertEqual(dst.read_bytes(), src.read_bytes(), src.name)
            self.assertIn('<script src="assets/vendor/%s"></script>' % src.name, html)
        engine_at = re.search(r'<script src="storyboard-engine\.js">', html).start()
        core_at = html.index('assets/vendor/three.min.js')
        self.assertLess(core_at, engine_at, 'three.js must load before the engine')
        for addon in ('three-bloom.js', 'three-extras.js'):
            if (vendor / addon).is_file():
                self.assertLess(core_at, html.index('assets/vendor/' + addon), 'addons need THREE first')
        if (vendor / 'three-bloom.js').is_file() and (vendor / 'three-extras.js').is_file():
            self.assertLess(html.index('three-bloom.js'), html.index('three-extras.js'))
        self.assertFalse(any('lottie' in p.name for p in (out / 'assets' / 'vendor').iterdir()))

    def test_with_3d_vertical_loads_three_before_the_engine(self):
        if not (SKILL / 'assets' / 'vendor' / 'three.min.js').is_file():
            self.skipTest('skill has no assets/vendor/three.min.js')
        out = self.tmp / 'tall three d'
        self._create(out, '--aspect', '9:16', '--with-3d')
        self.assertTrue((out / 'assets' / 'vendor' / 'three.min.js').is_file())
        html = read(out / 'storyboard.html')
        core_at = html.index('<script src="assets/vendor/three.min.js"></script>')
        m = re.search(r'<script src="storyboard-engine\.js">', html)
        engine_at = m.start() if m else html.index('const TIMINGS')   # shared engine, or an inline one
        self.assertLess(core_at, engine_at, 'three.js must load before the engine')

    def test_with_lottie_links_a_player(self):
        out = self.tmp / 'lottie deck'
        self._create(out, '--with-lottie')
        html = read(out / 'storyboard.html')
        self.assertRegex(html, r'<script src="[^"]*lottie[^"]*\.js"></script>')
        bundled = [c for c in ('assets/vendor/lottie_svg.min.js', 'assets/vendor/lottie.min.js', 'lottie_svg.min.js')
                   if (SKILL / c).is_file()]
        if bundled:
            name = Path(bundled[0]).name
            self.assertTrue((out / 'assets' / 'vendor' / name).is_file())
            self.assertIn('assets/vendor/' + name, html)
        self.assertFalse((out / 'assets' / 'vendor' / 'three.min.js').exists())

    def test_missing_style_kit_warns_and_continues(self):
        out = self.tmp / 'styled'
        p = self._create(out, '--style', 'no-such-kit-xyz')
        self.assertIn('[warn]', p.stdout)
        self.assertIn('no-such-kit-xyz', p.stdout)
        self.assertNotIn('data-storyboard-kit', read(out / 'storyboard.html'))
        self.assertFalse((out / 'kits').exists())
        if '"{{STYLE}}"' in read(SKILL / 'concept.template.md'):
            self.assertIn('"style": "no-such-kit-xyz"', read(out / 'concept.md'))

    def _fake_skill(self, deckio=True):
        """A throwaway copy of the files new_project.py needs (never scaffold into / next to the real skill)."""
        fake = self.tmp / 'fake skill'
        fake.mkdir()
        names = ['new_project.py', 'template.html', 'vertical_template.html', 'storyboard-engine.js',
                 'concept.template.md', 'script.template.md'] + (['sb_deckio.py'] if deckio else [])
        for f in names:
            shutil.copyfile(str(SKILL / f), str(fake / f))
        return fake

    def test_style_kit_copied_and_linked(self):
        # Kits ship in a later phase, so exercise the path against a throwaway copy of the skill.
        fake = self._fake_skill()
        (fake / 'kits' / 'demo').mkdir(parents=True)
        (fake / 'kits' / 'demo.css').write_text(':root { --accent: #ff3366; }\n', encoding='utf-8')
        (fake / 'kits' / 'demo' / 'font.woff2').write_bytes(b'\x00fontdata')
        out = self.tmp / 'kit deck'
        p = run([fake / 'new_project.py', out, '--style', 'demo'], timeout=120, env=_env())
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertEqual((out / 'kits' / 'demo.css').read_text(encoding='utf-8'), ':root { --accent: #ff3366; }\n')
        self.assertTrue((out / 'kits' / 'demo' / 'font.woff2').is_file())
        html = read(out / 'storyboard.html')
        link = html.index('<link rel="stylesheet" href="kits/demo.css"')
        self.assertLess(html.rindex('</style>', 0, html.index('</head>')), link, 'kit must come after template CSS')
        self.assertLess(link, html.index('</head>'))
        self._check_conventions(out, html)

    def test_without_sb_deckio_warns_and_still_scaffolds(self):
        fake = self._fake_skill(deckio=False)
        out = self.tmp / 'no deckio'
        p = run([fake / 'new_project.py', out], timeout=120, env=_env())
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertTrue((out / 'storyboard.html').is_file())
        tpl = read(SKILL / 'template.html')
        if 'Storyboard.init(' in tpl and 'words: WORDS' not in tpl:
            self.assertIn('sb_deckio.py is missing', p.stdout)

    def test_refuses_the_skill_folder_itself_even_with_force(self):
        fake = self._fake_skill()
        listing = lambda: sorted(n for n in os.listdir(str(fake)) if n != '__pycache__')
        before = listing()
        p = run([fake / 'new_project.py', '.', '--force'], timeout=120, env=_env(), cwd=str(fake))
        self.assertEqual(p.returncode, 1, p.stdout + p.stderr)
        self.assertIn('skill folder itself', p.stderr)
        self.assertNotIn('Traceback', p.stderr)
        self.assertEqual(listing(), before, 'nothing may be written into the skill')

    def test_project_inside_the_skill_folder_warns(self):
        fake = self._fake_skill()
        p = run([fake / 'new_project.py', fake / 'demo proj'], timeout=120, env=_env())
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertIn('inside the storyboard skill folder', p.stdout)
        self.assertTrue((fake / 'demo proj' / 'storyboard.html').is_file())

    def test_force_refuses_blocked_destinations_before_writing(self):
        # A destination that is a folder, or a needed folder that is a file: --force cannot help, and the
        # run must stop cleanly BEFORE writing anything (not crash half-way with a traceback).
        out = self.tmp / 'blocked deck'
        (out / 'storyboard.html').mkdir(parents=True)
        p = run([NEW, out, '--force'], timeout=120, env=_env())
        self.assertEqual(p.returncode, 1, p.stdout + p.stderr)
        self.assertIn('storyboard.html is a folder', p.stderr)
        self.assertNotIn('Traceback', p.stderr)
        self.assertEqual(sorted(os.listdir(str(out))), ['storyboard.html'])
        if (SKILL / 'assets' / 'vendor' / 'three.min.js').is_file():
            out2 = self.tmp / 'blocked assets'
            out2.mkdir()
            (out2 / 'assets').write_text('not a folder', encoding='utf-8')
            p = run([NEW, out2, '--force', '--with-3d'], timeout=120, env=_env())
            self.assertEqual(p.returncode, 1, p.stdout + p.stderr)
            self.assertIn('assets is a file', p.stderr)
            self.assertEqual(p.stderr.count('assets is a file'), 1, 'one line per blocker')
            self.assertNotIn('Traceback', p.stderr)
            self.assertEqual(sorted(os.listdir(str(out2))), ['assets'])
        p = run([NEW, self.tmp / 'blocked deck' / 'storyboard.html' / 'x' / 'y'], timeout=120, env=_env())
        self.assertEqual(p.returncode, 0, p.stderr)   # an existing FOLDER on the way is fine
        (self.tmp / 'a file').write_text('x', encoding='utf-8')
        p = run([NEW, self.tmp / 'a file' / 'sub'], timeout=120, env=_env())
        self.assertEqual(p.returncode, 1)
        self.assertIn('is not a directory', p.stderr)
        self.assertNotIn('Traceback', p.stderr)

    def test_linked_engine_is_left_alone(self):
        fake = self._fake_skill()   # link into a throwaway skill copy: the real engine is edited concurrently
        before = (fake / 'storyboard-engine.js').read_bytes()
        out = self.tmp / 'linked'
        out.mkdir()
        try:
            os.link(str(fake / 'storyboard-engine.js'), str(out / 'storyboard-engine.js'))
        except (OSError, AttributeError) as e:
            self.skipTest('hard links unavailable: %s' % e)
        p = run([fake / 'new_project.py', out, '--force'], timeout=120, env=_env())
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertNotIn('Traceback', p.stderr)
        self.assertIn('left as is', p.stdout)
        self.assertEqual((fake / 'storyboard-engine.js').read_bytes(), before)
        self.assertTrue(os.path.samefile(str(fake / 'storyboard-engine.js'), str(out / 'storyboard-engine.js')))
        self.assertTrue((out / 'concept.md').is_file())

    def test_rejects_unsafe_style_name(self):
        p = run([NEW, self.tmp / 'x', '--style', '../evil'], timeout=60, env=_env())
        self.assertEqual(p.returncode, 2)
        self.assertFalse((self.tmp / 'x').exists())

    def test_style_with_css_extension(self):
        p = self._create(self.tmp / 'css ext', '--style', 'no-such-kit-xyz.css')
        self.assertIn(os.path.join('kits', 'no-such-kit-xyz.css'), p.stdout)
        self.assertNotIn('.css.css', p.stdout)
        fake = self._fake_skill()
        (fake / 'kits').mkdir()
        (fake / 'kits' / 'demo.css').write_text(':root { --accent: #123456; }\n', encoding='utf-8')
        out = self.tmp / 'css ext kit'
        p = run([fake / 'new_project.py', out, '--style', 'demo.css'], timeout=120, env=_env())
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertTrue((out / 'kits' / 'demo.css').is_file())
        self.assertIn('<link rel="stylesheet" href="kits/demo.css" data-storyboard-kit>', read(out / 'storyboard.html'))

    def test_next_steps_cd_is_quoted_for_both_shells(self):
        plain = self.tmp / 'plain deck'
        p = self._create(plain)
        self.assertIn('  1. cd "%s"\n' % plain.resolve(), p.stdout)
        odd = self.tmp / "it's [a] deck $HOME"   # $ expands in "..." in both shells; [..] is a PowerShell wildcard
        p = self._create(odd)
        self.assertTrue((odd / 'storyboard.html').is_file())
        odd = odd.resolve()
        self.assertIn("PowerShell: Set-Location -LiteralPath '%s'" % str(odd).replace("'", "''"), p.stdout)
        self.assertIn("bash:       cd '%s'" % str(odd).replace("'", "'\\''"), p.stdout)
        self.assertNotIn('cd "%s"' % odd, p.stdout)

    def test_quote_helpers(self):
        self.assertEqual(new_project._quote('C:\\a b\\x.py'), ('"C:\\a b\\x.py"', '"C:\\a b\\x.py"'))
        self.assertEqual(new_project._quote("C:\\O'Brien\\x"), ('"C:\\O\'Brien\\x"', '"C:\\O\'Brien\\x"'))
        self.assertEqual(new_project._quote('/tmp/$HOME'), ("'/tmp/$HOME'", "'/tmp/$HOME'"))
        self.assertEqual(new_project._quote("/t/a'b$c"), ("'/t/a''b$c'", "'/t/a'\\''b$c'"))
        self.assertEqual(new_project._quote('C:\\'), ("'C:\\'", "'C:\\'"))
        self.assertEqual(new_project._cd_command('/x/[a]'), ('Set-Location -LiteralPath "/x/[a]"', 'cd "/x/[a]"'))
        # PowerShell ends "..." at typographic double quotes and '...' at typographic single quotes too.
        self.assertEqual(new_project._quote(u'C:\\The \u201cBig\u201d Idea'),
                         (u"'C:\\The \u201cBig\u201d Idea'", u"'C:\\The \u201cBig\u201d Idea'"))
        self.assertEqual(new_project._quote(u'C:\\\u201eQ\u201c it\u2019s'),
                         (u"'C:\\\u201eQ\u201c it\u2019\u2019s'", u"'C:\\\u201eQ\u201c it\u2019s'"))
        self.assertEqual(new_project._quote(u'C:\\it\u2019s \u2018x\u2019'),   # no double quote: "..." is fine
                         (u'"C:\\it\u2019s \u2018x\u2019"', u'"C:\\it\u2019s \u2018x\u2019"'))
        self.assertEqual(new_project._quote(u"/a\u201d'b"), (u"'/a\u201d''b'", u"'/a\u201d'\\''b'"))
        # bash collapses \\ inside "..." (UNC paths)
        self.assertEqual(new_project._quote('\\\\srv\\share x'), ("'\\\\srv\\share x'", "'\\\\srv\\share x'"))

    @unittest.skipUnless(os.name == 'nt' and shutil.which('powershell'), 'needs Windows PowerShell')
    def test_quoted_paths_round_trip_through_powershell(self):
        cases = [u'C:\\x\\The \u201cBig\u201d Idea', u'C:\\x\\\u2018q\u2019 and \u201ed\u201c', u"C:\\O'Brien \u2019s $HOME",
                 u'C:\\a b\\x.py', u'C:\\x\\it\u2019s', u'C:\\x\\back`tick!', u'\\\\srv\\share x', u'C:\\']
        src = self.tmp / 'in.txt'
        dst = self.tmp / 'out.txt'
        src.write_text('\n'.join(new_project._quote(c)[0] for c in cases) + '\n', encoding='utf-8')
        ps1 = self.tmp / 'rt.ps1'
        ps1.write_text(
            '$res = New-Object System.Collections.Generic.List[string]\r\n'
            'foreach ($l in [IO.File]::ReadAllLines($args[0], [Text.Encoding]::UTF8)) {\r\n'
            '  try { $res.Add([string](Invoke-Expression ("Write-Output " + $l))) } catch { $res.Add("ERR") }\r\n'
            '}\r\n'
            '[IO.File]::WriteAllLines($args[1], $res, (New-Object System.Text.UTF8Encoding($false)))\r\n',
            encoding='utf-8')
        p = subprocess.run(['powershell', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File',
                            str(ps1), str(src), str(dst)], stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                           stdin=subprocess.DEVNULL, timeout=120)
        self.assertEqual(p.returncode, 0, p.stderr.decode('utf-8', 'replace'))
        self.assertEqual(dst.read_text(encoding='utf-8').splitlines(), cases)

    def test_force_replaces_a_hard_linked_deck_instead_of_writing_through(self):
        fake = self._fake_skill()   # the link points into a throwaway skill copy, never the real one
        before = (fake / 'template.html').read_bytes()
        out = self.tmp / 'hard linked'
        out.mkdir()
        try:
            os.link(str(fake / 'template.html'), str(out / 'storyboard.html'))
        except (OSError, AttributeError) as e:
            self.skipTest('hard links unavailable: %s' % e)
        p = run([fake / 'new_project.py', out, '--force', '--title', 'Linked Title'], timeout=120, env=_env())
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertEqual((fake / 'template.html').read_bytes(), before, 'the skill template must not change')
        self.assertFalse(os.path.samefile(str(fake / 'template.html'), str(out / 'storyboard.html')))
        self.assertIn('<title>Linked Title</title>', read(out / 'storyboard.html'))
        self.assertEqual(sorted(n for n in os.listdir(str(out)) if n.endswith('.tmp')), [], 'no temp files left')


class NewProjectDeckEditTests(unittest.TestCase):
    """build_deck / ensure_words on hand-made markup (templates can change; comments must never be anchors)."""

    def setUp(self):
        if new_project._deckio() is None:
            self.skipTest('sb_deckio.py not in the skill')

    def test_commented_init_is_not_wired(self):
        src = ('<!-- call Storyboard.init({timings}) -->\n<script>\nconst TIMINGS=[];\n'
               'Storyboard.init({ timings: TIMINGS });\n</script>')
        out = new_project.ensure_words(src)
        self.assertTrue(out.startswith('<!-- call Storyboard.init({timings}) -->\n<script>\n'), out)
        self.assertIn('const WORDS = [];\nStoryboard.init({ timings: TIMINGS, words: WORDS });', out)
        self.assertEqual(out.count('WORDS'), 2)

    def test_nested_words_key_does_not_count_as_wired(self):
        src = '<script>\nStoryboard.init({ timings: TIMINGS, captions: {words: 3} });\n</script>'
        out = new_project.ensure_words(src)
        self.assertRegex(out, r'captions: \{words: 3\}, words: WORDS \}\);')
        self.assertIn('const WORDS = [];', out)

    def test_already_wired_is_a_no_op(self):
        src = '<script>\nconst WORDS = [];\nStoryboard.init({ timings: TIMINGS, words: WORDS });\n</script>'
        self.assertEqual(new_project.ensure_words(src), src)

    def test_unfixable_words_decl_is_a_note_not_a_crash(self):
        src = '<script>\nlet WORDS = null;\nStoryboard.init({ timings: TIMINGS });\n</script>'
        notes = []
        self.assertEqual(new_project.ensure_words(src, notes), src)
        self.assertEqual(len(notes), 1)

    def test_commented_markup_is_never_an_anchor(self):
        src = ('<html><head>\n  <!-- <title>old</title> </head> -->\n  <title>real</title>\n  <style>a{}</style>\n'
               '</head>\n<body>\n  <!-- <script src="storyboard-engine.js"></script> -->\n'
               '  <section class="slide"></section>\n  <script src="storyboard-engine.js"></script>\n'
               '  <script>\n  const TIMINGS = [{time:0,slide:1}];\n  // Storyboard.init({ timings: TIMINGS });\n'
               '  Storyboard.init({ timings: TIMINGS });\n  </script>\n</body></html>')
        out = new_project.build_deck(src, 'New', kit_href='kits/demo.css', scripts=['assets/vendor/three.min.js'])
        self.assertIn('<!-- <title>old</title> </head> -->\n  <title>New</title>', out)
        self.assertIn('<style>a{}</style>\n  <link rel="stylesheet" href="kits/demo.css" data-storyboard-kit>\n'
                      '</head>', out)
        self.assertIn('<!-- <script src="storyboard-engine.js"></script> -->\n  <section', out)
        self.assertIn('<script src="assets/vendor/three.min.js"></script>\n  <script src="storyboard-engine.js">',
                      out)
        self.assertIn('// Storyboard.init({ timings: TIMINGS });\n  const WORDS = [];\n'
                      '  Storyboard.init({ timings: TIMINGS, words: WORDS });', out)


if __name__ == '__main__':
    unittest.main()

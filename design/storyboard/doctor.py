#!/usr/bin/env python
"""
doctor.py
First-run health check for the storyboard skill. Verifies everything the
pipeline needs -- Python, Playwright + a Chromium that actually launches,
ffmpeg (via imageio-ffmpeg), numpy -- plus the optional extras (edge-tts free
voice, ElevenLabs SDK + API key, pyaaf2, node) and the skill's own files, then
prints a PASS / WARN / FAIL table with the exact command that fixes each
problem (PowerShell and bash variants where they differ).

Usage:
  python doctor.py                  # human-readable table
  python doctor.py --json           # machine-readable report on stdout
  python doctor.py --smoke          # also build a 2-second throwaway deck and
                                    # render it to MP4 with render_video.py
  python doctor.py --smoke --keep   # keep the smoke project dir for inspection

Exit code: 0 if every REQUIRED check passes (WARNs never fail the run), 1 otherwise.
Optional features (edge-tts, ElevenLabs, pyaaf2, node, SFX library) only ever WARN.
The engine syntax hint (`node --check storyboard-engine.js`) FAILs "Skill files" only
for a SyntaxError inside the engine reported by node 20+; node 14-19 -> WARN; a
missing / broken / older node leaves it "unchecked".
Missing voice/audit tool files (sb_deckio.py, tts_free.py, elevenlabs_generate.py, audit_deck.py,
aaf_to_timings.py) make "Skill files" WARN -- rendering works without them.
--smoke reads render_video.py --help (children always run with colour off: NO_COLOR=1, PYTHON_COLORS=0,
FORCE_COLOR removed) and WARNs when the MP4 is not 1920x1080 or, when --duration was passed, grossly off
the 2 s asked for (outside 1.4-4.5 s: the real-time capture legitimately adds a ~0.6 s tail, more under load).
Secrets are never printed: for ELEVENLABS_API_KEY only "set / not set" is reported.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import textwrap
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent
MIN_PY = (3, 9)
IS_WIN = os.name == 'nt'
IS_MAC = sys.platform == 'darwin'
NL = '\n'   # separates multiple fix commands / detail paragraphs

REQUIRED_SKILL_FILES = [
    'storyboard-engine.js', 'template.html', 'vertical_template.html', 'render_video.py',
    'concept.template.md', 'script.template.md',
]
# The voice / audit tools and the deck reader-writer they share (elevenlabs_generate.py imports sb_deckio at
# start-up; tts_free.py / aaf_to_timings.py need it for --apply). Rendering works without them -> WARN only.
TOOL_SKILL_FILES = ['sb_deckio.py', 'tts_free.py', 'elevenlabs_generate.py', 'audit_deck.py', 'aaf_to_timings.py']
THREE_FILES = ['three.min.js', 'three-bloom.js', 'three-extras.js']
LOTTIE_CANDIDATES = ['assets/vendor/lottie_svg.min.js', 'assets/vendor/lottie.min.js', 'lottie_svg.min.js']
REQUIRED_SFX = ['whoosh', 'whoosh-soft', 'swipe', 'pop', 'pop-soft', 'tick', 'click', 'sparkle',
                'riser', 'impact', 'chime', 'typing', 'confetti', 'success']
SMOKE_TIMEOUT = 300     # seconds for the whole smoke render
PW_PROBE_TIMEOUT = 120  # the Chromium launch probe: 10 s launch + one 60 s retry on timeout + driver start
SMOKE_SECONDS = 2.0     # length of the throwaway deck
SMOKE_SIZE = '1920x1080'   # its stage size: the MP4 must come out at exactly this resolution
# MP4 length accepted when --duration was passed, as seconds (below, above) the requested length. A healthy
# render is NOT exactly that long: render_video.py's real-time capture records a ~0.6 s tail after the
# timeline and trims its lead-in with some capture jitter, so a 2 s smoke deck comes out ~2.1-2.7 s on a quiet
# machine and ~3.1 s was measured on a busy one. Only a gross mismatch -- e.g. the renderer's own default
# length (last cue + 8 s -> ~9.6 s) because it ignored --duration, or a clip cut short -- is held against it.
SMOKE_DUR_SLACK = (0.6, 2.5)
# `node --check storyboard-engine.js` is only a hint (Chromium, not node, runs the engine):
NODE_CHECK_MIN = 14     # older node can't parse the engine's modern syntax (`?.`): don't even try
NODE_TRUST_MIN = 20     # a SyntaxError from node >= this FAILs skill_files; from 14-19 it only WARNs


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def _s(b):
    if b is None:
        return ''
    if isinstance(b, bytes):
        return b.decode('utf-8', 'replace')
    return b


_ANSI_RE = re.compile(r'\x1b\[[0-?]*[ -/]*[@-~]')   # CSI sequences: colours, cursor moves


def _strip_ansi(text):
    return _ANSI_RE.sub('', text or '')


def _plain_env(env=None):
    """`env` (default: this process's) asking every child for plain, uncoloured text. argparse (Python
    3.14+), node, pip and friends colour their output when FORCE_COLOR / PYTHON_COLORS / CLICOLOR_FORCE
    are set -- even into a pipe -- and doctor parses everything it runs."""
    env = dict(os.environ if env is None else env)
    for k in ('FORCE_COLOR', 'CLICOLOR_FORCE', 'PY_COLORS'):
        env.pop(k, None)
    env['NO_COLOR'] = '1'
    env['PYTHON_COLORS'] = '0'
    return env


def _run(cmd, timeout=15, cwd=None, env=None):
    """Run a command, never raise. Returns (returncode | None | 'timeout', stdout, stderr), with colour
    switched off in the child's environment and any escape codes stripped from both streams."""
    try:
        p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, stdin=subprocess.DEVNULL,
                           timeout=timeout, cwd=cwd, env=_plain_env(env),
                           universal_newlines=True, encoding='utf-8', errors='replace')
        return p.returncode, _strip_ansi(p.stdout), _strip_ansi(p.stderr)
    except subprocess.TimeoutExpired as e:
        return 'timeout', _strip_ansi(_s(e.stdout)), _strip_ansi(_s(e.stderr))
    except (OSError, ValueError) as e:
        return None, '', str(e)


def _dist_version(dist):
    try:
        from importlib import metadata
        return metadata.version(dist)
    except Exception:
        return None


def _try_import(module, dist=None):
    """Actually import a module (find_spec alone misses broken installs).
    Returns (module | None, version | None, error | None)."""
    try:
        mod = __import__(module)
    except Exception as e:     # ImportError, but broken installs raise anything
        return None, None, '%s: %s' % (type(e).__name__, e)
    ver = _dist_version(dist or module) or getattr(mod, '__version__', None)
    return mod, ver, None


def _tail(text, n=400):
    text = (text or '').strip()
    return text if len(text) <= n else '...' + text[-n:]


def _first_line(text):
    for line in (text or '').splitlines():
        if line.strip():
            return line.strip()
    return ''


def _norm(p):
    try:
        return os.path.normcase(os.path.realpath(p))
    except Exception:
        return os.path.normcase(str(p))


def _fix(ps, bash=None):
    """Fix command(s). bash defaults to the PowerShell text when they are identical."""
    return {'powershell': ps, 'bash': ps if bash is None else bash}


def _res(cid, name, status, detail, required=True, fix=None, data=None):
    if not required and status == 'FAIL':
        status = 'WARN'   # optional features never fail the run
    return {'id': cid, 'name': name, 'required': required, 'status': status,
            'detail': detail, 'fix': fix, 'data': data or {}}


# ---------------------------------------------------------------------------
# interpreter discovery (drives the "python -m pip" prefix in every fix)
# ---------------------------------------------------------------------------
_PROBE = ("import sys;print(sys.executable);"
          "print('%d.%d.%d' % tuple(sys.version_info[:3]));print(sys.prefix)")


def _path_candidates():
    names = ['python.exe', 'python3.exe', 'py.exe'] if IS_WIN else ['python', 'python3']
    seen, out = set(), []
    for d in os.environ.get('PATH', '').split(os.pathsep):
        d = d.strip().strip('"')
        if not d:
            continue
        for n in names:
            p = os.path.join(d, n)
            key = os.path.normcase(os.path.abspath(p))
            if key in seen:
                continue
            if os.path.lexists(p) and not os.path.isdir(p):
                seen.add(key)
                out.append(p)
    return out


def _probe_interpreter(path):
    rc, out, err = _run([path, '-c', _PROBE], timeout=10)
    info = {'launcher': path, 'executable': None, 'version': None, 'broken': None}
    lines = out.strip().splitlines()
    if rc == 0 and len(lines) >= 2:
        info['executable'] = lines[0].strip()
        info['version'] = lines[1].strip()
        if 'could not find platform' in err.lower():
            info['broken'] = _first_line(err)
    elif rc == 9009 or 'was not found' in (out + err).lower():
        info['broken'] = 'Microsoft Store alias stub (no real Python behind it)'
    else:
        info['broken'] = _first_line(err) or _first_line(out) or ('exit %s' % rc)
    return info


class Ctx(object):
    def __init__(self):
        self.me = _norm(sys.executable)
        with ThreadPoolExecutor(max_workers=8) as ex:
            self.probes = list(ex.map(_probe_interpreter, _path_candidates()))
        self.first = {}   # 'python' / 'python3' -> probe of the first hit on PATH
        for name in ('python', 'python3', 'py'):
            w = shutil.which(name)
            if w:
                for pr in self.probes:
                    if _norm(pr['launcher']) == _norm(w):
                        self.first[name] = pr
                        break
                else:
                    self.first[name] = _probe_interpreter(w)
        # How to invoke THIS interpreter in fix commands.
        self.py_ps = self.py_bash = None
        for name in ('python', 'python3'):
            pr = self.first.get(name)
            if pr and pr['executable'] and not pr['broken'] and _norm(pr['executable']) == self.me:
                self.py_ps = self.py_bash = name
                break
        if not self.py_ps:
            self.py_ps = '& "%s"' % sys.executable
            self.py_bash = '"%s"' % sys.executable.replace('\\', '/')

    def pip(self, *pkgs):
        a = ' '.join(pkgs)
        return _fix('%s -m pip install %s' % (self.py_ps, a), '%s -m pip install %s' % (self.py_bash, a))


# ---------------------------------------------------------------------------
# checks
# ---------------------------------------------------------------------------
def check_python(ctx):
    v = sys.version_info
    ver = '%d.%d.%d' % (v[0], v[1], v[2])
    data = {'version': ver, 'executable': sys.executable, 'min': '%d.%d' % MIN_PY}
    if tuple(v[:2]) < MIN_PY:
        if IS_WIN:
            fix = _fix('winget install -e --id Python.Python.3.12')
        elif IS_MAC:
            fix = _fix('brew install python@3.12')
        else:
            fix = _fix('sudo apt-get install -y python3 python3-pip python3-venv')
        return _res('python', 'Python', 'FAIL',
                    'Python %s at %s is too old; the skill needs %d.%d+.' % ((ver, sys.executable) + MIN_PY),
                    fix=fix, data=data)
    try:
        import importlib.util
        has_pip = importlib.util.find_spec('pip') is not None
    except Exception:
        has_pip = False
    data['pip'] = has_pip
    if not has_pip:
        return _res('python', 'Python', 'WARN',
                    'Python %s at %s, but pip is missing (every fix below uses "python -m pip").' % (ver, sys.executable),
                    fix=_fix('%s -m ensurepip --upgrade' % ctx.py_ps, '%s -m ensurepip --upgrade' % ctx.py_bash),
                    data=data)
    return _res('python', 'Python', 'PASS', 'Python %s at %s' % (ver, sys.executable), data=data)


def check_interpreters(ctx):
    name = 'Interpreters on PATH'
    groups = {}   # real executable -> info
    stubs = []
    for pr in ctx.probes:
        if not pr['executable']:
            stubs.append(pr)
            continue
        g = groups.setdefault(_norm(pr['executable']), {
            'executable': pr['executable'], 'version': pr['version'], 'broken': pr['broken'], 'launchers': []})
        g['launchers'].append(pr['launcher'])
        if pr['broken'] and not g['broken']:
            g['broken'] = pr['broken']
    first_py = ctx.first.get('python') or ctx.first.get('python3')
    first_exe = _norm(first_py['executable']) if first_py and first_py['executable'] else None
    working = [g for g in groups.values() if not g['broken']]
    broken = [g for g in groups.values() if g['broken']]

    def where(pr):
        if not pr:
            return 'not found'
        if not pr['executable']:
            return 'BROKEN (%s)' % pr['broken']
        tag = ' (this one)' if _norm(pr['executable']) == ctx.me else ''
        return '%s %s%s%s' % (pr['executable'], pr['version'] or '?', tag,
                              ' BROKEN' if pr['broken'] else '')

    problems = []
    if first_exe is None:
        problems.append("no working 'python' command on PATH (doctor is running under %s)" % sys.executable)
    elif first_exe != ctx.me:
        problems.append("'python' on PATH is %s but doctor is running under %s -- packages installed for one "
                        "are invisible to the other" % (first_py['executable'], sys.executable))
    if len(working) > 1:
        problems.append('%d different working Python interpreters are reachable from PATH' % len(working))
    if broken:
        problems.append('%d broken interpreter(s) on PATH' % len(broken))
    # A launcher that starts no real Python (Microsoft Store alias stub, dead shim) only matters when it is
    # what a command resolves to FIRST; one shadowed by a working interpreter is harmless (listed in data).
    # ('python' itself is covered by the "no working 'python'" problem above.)
    for cmd in ('python3', 'py'):
        pr = ctx.first.get(cmd)
        if pr and not pr['executable']:
            problems.append("'%s' on PATH starts no real Python (%s at %s)" % (cmd, pr['broken'], pr['launcher']))
    data = {'interpreters': list(groups.values()), 'stubs': [s['launcher'] for s in stubs],
            'commands': dict((k, (v['executable'] if v else None)) for k, v in ctx.first.items()),
            'python_on_path': first_py['executable'] if first_py else None,
            'fix_prefix': {'powershell': ctx.py_ps, 'bash': ctx.py_bash}}
    cmds = ['%-7s -> %s' % (k, where(ctx.first.get(k))) for k in ('python', 'python3', 'py') if k in ctx.first]
    if not problems:
        return _res('interpreters', name, 'PASS', 'one interpreter: %s' % sys.executable,
                    required=False, data=data)
    paras = ['; '.join(problems) + '.'] + cmds
    for g in groups.values():
        if _norm(g['executable']) == ctx.me:
            continue
        paras.append('- %s %s%s, reached via %s' % (g['executable'], g['version'] or '?',
                                                   (' BROKEN (%s) -- repair or uninstall it' % g['broken'])
                                                   if g['broken'] else '', ', '.join(g['launchers'])))
    for s in stubs:
        paras.append('- %s: %s' % (s['launcher'], s['broken']))
    if IS_WIN and any('Store alias' in (s['broken'] or '') for s in stubs):
        paras.append('Store alias stubs can be switched off in Settings > Apps > Advanced app settings > '
                     'App execution aliases (python.exe / python3.exe).')
    paras.append('Always install with "python -m pip install ..." using the SAME python you run the skill '
                 'scripts with (never bare "pip").')
    ps, sh = [], []
    if first_exe is None or first_py['broken']:
        # 'python' is missing or cannot start: installing "into python" cannot work, so make THIS interpreter
        # the shell's 'python' (every other fix already names it by full path).
        dirs = [os.path.dirname(sys.executable)]
        if IS_WIN and os.path.isdir(os.path.join(dirs[0], 'Scripts')):
            dirs.append(os.path.join(dirs[0], 'Scripts'))
        paras.append("To make 'python' this interpreter, put its folder first on PATH (the fix below does it "
                     "for the current shell; add it to your PATH settings / shell profile to keep it).")
        ps.append('$env:Path = "%s;" + $env:Path   # this shell: python = %s' % (';'.join(dirs), sys.executable))
        sh.append('export PATH="%s:$PATH"   # this shell: python = %s'
                  % (':'.join(_bash_path(d) for d in dirs), _bash_path(sys.executable)))
    elif first_exe != ctx.me:
        cmd = ('python -m pip install playwright imageio-ffmpeg numpy   # if you run the skill with the '
               "'python' on PATH" + NL + 'python -m playwright install chromium')
        ps.append(cmd)
        sh.append(cmd)
    for g in broken:   # the PATH fix above only steers 'python' away; the broken install itself remains
        via_py = any(os.path.basename(l).lower() in ('py', 'py.exe') for l in g['launchers'])
        note = ('# %s cannot start: repair or uninstall it (reinstall that Python / Settings > Apps > Installed '
                'apps); meanwhile run the skill with "python"' % g['executable'])
        if IS_WIN and via_py:
            ps.append('py --list-paths   ' + note + ", not 'py'")
            sh.append('py --list-paths   ' + note + ", not 'py'")
        else:
            ps.append(note)
            sh.append(note)
    fix = _fix(NL.join(ps), NL.join(sh)) if ps else None
    return _res('interpreters', name, 'WARN', '\n'.join(paras), required=False, fix=fix, data=data)


def _bash_path(p):
    """A path as Git Bash / MSYS spells it (C:\\x -> /c/x); unchanged off Windows."""
    if not IS_WIN:
        return p
    p = p.replace('\\', '/')
    m = re.match(r'^([A-Za-z]):(/|$)', p)
    return ('/%s/%s' % (m.group(1).lower(), p[m.end():])).rstrip('/') if m else p


_PW_PROBE = r'''
import json, sys, time
res = {}
t0 = time.time()
try:
    from playwright.sync_api import sync_playwright
except Exception as e:
    res['stage'] = 'import'; res['error'] = '%s: %s' % (type(e).__name__, e)
    print(json.dumps(res)); sys.exit(0)
try:
    with sync_playwright() as p:
        try:
            b = p.chromium.launch(headless=True, timeout=10000)
        except Exception as e:
            # A busy machine, or antivirus scanning a freshly installed browser, can make a healthy
            # Chromium miss 10 s: retry once with a long timeout before calling it broken.
            if 'timeout' not in ('%s %s' % (type(e).__name__, e)).lower():
                raise
            res['first_attempt'] = ('%s: %s' % (type(e).__name__, e)).splitlines()[0][:200]
            t1 = time.time()
            b = p.chromium.launch(headless=True, timeout=60000)
            res['retry_seconds'] = round(time.time() - t1, 2)
        res['browser_version'] = b.version
        pg = b.new_page()
        pg.set_content('<p id="x">ok</p>')
        res['dom'] = pg.evaluate('document.getElementById("x").textContent')
        b.close()
    res['ok'] = res.get('dom') == 'ok'
    if not res['ok']:
        res['stage'] = 'render'; res['error'] = 'page did not render a test paragraph'
except Exception as e:
    res['stage'] = 'launch'; res['error'] = '%s: %s' % (type(e).__name__, e)
res['seconds'] = round(time.time() - t0, 2)
print(json.dumps(res))
'''


_BOX_RE = re.compile(u'[─-╿]')   # box-drawing characters of Playwright's banner messages
_PW_KEY_RE = re.compile(r"(Executable doesn't exist at .*|Host system is missing dependencies.*)", re.I)


def _pw_error_summary(msg, n=300):
    """Playwright's launch error without its ASCII-box banner ("Looks like Playwright was just installed
    ... <3 Playwright Team"), leading with the line that says what is wrong."""
    lines = [ln.strip() for ln in (msg or '').splitlines() if ln.strip() and not _BOX_RE.search(ln)]
    text = ' '.join(lines)
    m = _PW_KEY_RE.search(text)
    if m:
        text = m.group(1)
    text = re.sub(r'\s+', ' ', text).strip()
    return text if len(text) <= n else text[:n - 3] + '...'


def check_playwright(ctx):
    name = 'Playwright + Chromium'
    install_browser = _fix('%s -m playwright install chromium' % ctx.py_ps,
                           '%s -m playwright install chromium' % ctx.py_bash)
    mod, ver, err = _try_import('playwright')
    if mod is None:
        pip = ctx.pip('playwright')
        return _res('playwright', name, 'FAIL', 'playwright is not importable (%s). It drives headless Chromium '
                    'for render_video.py.' % err,
                    fix=_fix(pip['powershell'] + '\n' + install_browser['powershell'],
                             pip['bash'] + '\n' + install_browser['bash']))
    rc, out, errtxt = _run([sys.executable, '-c', _PW_PROBE], timeout=PW_PROBE_TIMEOUT)
    info = {}
    for line in reversed(out.strip().splitlines()):
        if line.startswith('{'):
            try:
                info = json.loads(line)
            except ValueError:
                pass
            break
    data = {'version': ver, 'browser_version': info.get('browser_version'), 'launch_seconds': info.get('seconds'),
            'first_attempt_timed_out': bool(info.get('first_attempt'))}
    if rc == 'timeout':
        return _res('playwright', name, 'FAIL', 'playwright %s imported, but launching headless Chromium hung '
                    '(> %ds).' % (ver, PW_PROBE_TIMEOUT), fix=install_browser, data=data)
    if info.get('ok') and info.get('first_attempt'):
        # it works, so the run is not blocked -- but a machine this slow may stutter a real-time capture
        data['retry_seconds'] = info.get('retry_seconds')
        return _res('playwright', name, 'WARN', 'playwright %s; Chromium %s launched headless, but only on a retry: '
                    'the first launch missed its 10s timeout (the retry took %.1fs). The machine is busy, or '
                    'antivirus is scanning a freshly installed browser (usually only the first time). If renders '
                    'stutter, close heavy apps or use render_video.py --frames (offline, frame-exact).'
                    % (ver, info.get('browser_version'), info.get('retry_seconds') or 0), data=data)
    if info.get('ok'):
        return _res('playwright', name, 'PASS', 'playwright %s; Chromium %s launched headless in %.1fs'
                    % (ver, info.get('browser_version'), info.get('seconds') or 0), data=data)
    msg = info.get('error') or _tail(errtxt) or _tail(out) or 'unknown error'
    low = msg.lower()
    if 'missing dependencies' in low or 'install-deps' in low:
        fix = _fix('%s -m playwright install-deps chromium' % ctx.py_ps,
                   'sudo %s -m playwright install-deps chromium' % ctx.py_bash)
    elif "executable doesn't exist" in low or 'playwright install' in low or info.get('stage') == 'launch':
        fix = install_browser
    else:
        pip = ctx.pip('--upgrade', 'playwright')
        fix = _fix(pip['powershell'] + '\n' + install_browser['powershell'],
                   pip['bash'] + '\n' + install_browser['bash'])
    data['error'] = _tail('\n'.join(ln for ln in msg.splitlines() if not _BOX_RE.search(ln)), 800) or _tail(msg, 800)
    return _res('playwright', name, 'FAIL', 'playwright %s imported, but Chromium did not launch headless '
                '(10s timeout): %s' % (ver, _pw_error_summary(msg) or _tail(msg, 300)), fix=fix, data=data)


def check_ffmpeg(ctx):
    name = 'ffmpeg'
    mod, ver, err = _try_import('imageio_ffmpeg', 'imageio-ffmpeg')
    exe, source = None, None
    if mod is not None:
        try:
            exe, source = mod.get_ffmpeg_exe(), 'imageio-ffmpeg %s' % ver
        except Exception as e:
            err = 'imageio_ffmpeg.get_ffmpeg_exe() failed: %s' % e
    if exe is None and shutil.which('ffmpeg'):
        exe, source = shutil.which('ffmpeg'), 'ffmpeg on PATH'
    if exe is None:
        return _res('ffmpeg', name, 'FAIL', 'no ffmpeg available (%s). render_video.py encodes the MP4 with it.' % err,
                    fix=ctx.pip('imageio-ffmpeg'))
    rc, out, errtxt = _run([exe, '-hide_banner', '-version'], timeout=20)
    data = {'exe': exe, 'source': source, 'imageio_ffmpeg': ver}
    if rc != 0:
        return _res('ffmpeg', name, 'FAIL', '%s at %s does not run (%s)' % (source, exe, _tail(errtxt or out, 200)),
                    fix=ctx.pip('--force-reinstall', 'imageio-ffmpeg'), data=data)
    line = _first_line(out)
    m = re.search(r'ffmpeg version (\S+)', line)
    data['ffmpeg_version'] = m.group(1) if m else line
    rc2, enc, _ = _run([exe, '-hide_banner', '-encoders'], timeout=20)
    data['libx264'] = 'libx264' in enc
    detail = '%s -> ffmpeg %s%s' % (source, data['ffmpeg_version'], ', libx264 ok' if data['libx264'] else '')
    if not data['libx264']:
        return _res('ffmpeg', name, 'FAIL', detail + ', but this build has no libx264 encoder (needed for H.264 MP4).',
                    fix=ctx.pip('--force-reinstall', 'imageio-ffmpeg'), data=data)
    if mod is None:
        return _res('ffmpeg', name, 'WARN', detail + '. imageio-ffmpeg is not installed (%s); render_video.py falls '
                    'back to the ffmpeg on PATH. Install it for a known-good pinned binary.' % err,
                    fix=ctx.pip('imageio-ffmpeg'), data=data)
    return _res('ffmpeg', name, 'PASS', detail, data=data)


def check_numpy(ctx):
    mod, ver, err = _try_import('numpy')
    if mod is None:
        return _res('numpy', 'numpy', 'FAIL', 'numpy is not importable (%s). Used for audio envelopes + SFX mixing.' % err,
                    fix=ctx.pip('numpy'))
    return _res('numpy', 'numpy', 'PASS', 'numpy %s' % ver, data={'version': ver})


def check_edge_tts(ctx):
    name = 'edge-tts voice'
    mod, ver, err = _try_import('edge_tts', 'edge-tts')
    if mod is None:
        return _res('edge_tts', name, 'WARN', 'not installed -- optional free neural voice-over (needs internet when '
                    'generating). Without it use ElevenLabs or record your own MP3.', required=False,
                    fix=ctx.pip('edge-tts'))
    return _res('edge_tts', name, 'PASS', 'edge-tts %s' % ver, required=False, data={'version': ver})


def _user_env_has(var):
    """Windows: is the variable persisted in HKCU\\Environment (but maybe not in this shell yet)?"""
    if not IS_WIN:
        return False
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, 'Environment') as k:
            val, _ = winreg.QueryValueEx(k, var)
            return bool(str(val).strip())
    except Exception:
        return False


def check_elevenlabs(ctx):
    name = 'ElevenLabs voice'
    mod, ver, err = _try_import('elevenlabs')
    key_set = bool(os.environ.get('ELEVENLABS_API_KEY', '').strip())   # never read/print the value itself
    persisted = (not key_set) and _user_env_has('ELEVENLABS_API_KEY')
    data = {'sdk_version': ver, 'api_key_set': key_set, 'api_key_in_user_env_only': persisted}
    key_fix = _fix('$env:ELEVENLABS_API_KEY = "<your-key>"   # this session' + NL +
                   '[Environment]::SetEnvironmentVariable("ELEVENLABS_API_KEY", "<your-key>", "User")   # persist',
                   'export ELEVENLABS_API_KEY="<your-key>"   # this session; add the line to ~/.bashrc to persist')
    if mod is None and not key_set:
        pip = ctx.pip('elevenlabs')
        return _res('elevenlabs', name, 'WARN', 'SDK not installed and ELEVENLABS_API_KEY not set -- optional premium '
                    'voice-over (paid API).', required=False,
                    fix=_fix(pip['powershell'] + '\n' + key_fix['powershell'], pip['bash'] + '\n' + key_fix['bash']),
                    data=data)
    if mod is None:
        return _res('elevenlabs', name, 'WARN', 'ELEVENLABS_API_KEY is set, but the elevenlabs SDK is not importable '
                    '(%s).' % err, required=False, fix=ctx.pip('elevenlabs'), data=data)
    if not key_set:
        extra = (' It IS saved in your user environment -- open a new terminal so this shell picks it up.'
                 if persisted else '')
        return _res('elevenlabs', name, 'WARN', 'elevenlabs %s installed, but ELEVENLABS_API_KEY is not set in this '
                    'shell.%s' % (ver, extra), required=False, fix=None if persisted else key_fix, data=data)
    return _res('elevenlabs', name, 'PASS', 'elevenlabs %s; ELEVENLABS_API_KEY is set (value not shown)' % ver,
                required=False, data=data)


def check_pyaaf2(ctx):
    name = 'pyaaf2 (AAF)'
    mod, ver, err = _try_import('aaf2', 'pyaaf2')
    if mod is None:
        return _res('pyaaf2', name, 'WARN', 'not installed -- only needed for aaf_to_timings.py (sample-accurate '
                    'cues exported from a DAW).', required=False, fix=ctx.pip('pyaaf2'))
    return _res('pyaaf2', name, 'PASS', 'pyaaf2 %s' % ver, required=False, data={'version': ver})


_NODE = {}
_NODE_LOCK = threading.Lock()


def _node_info():
    """The node on PATH, probed once and shared by check_node / check_skill_files (they run in parallel):
    {'exe', 'version', 'major', 'runs', 'error'}. A shim that exits non-zero ('nvm use' not run, stale
    Volta/Scoop/Chocolatey shim) has runs=False."""
    with _NODE_LOCK:
        if 'info' not in _NODE:
            exe = shutil.which('node')
            info = {'exe': exe, 'version': None, 'major': None, 'runs': False, 'error': None}
            if exe:
                rc, out, err = _run([exe, '--version'], timeout=10)
                ver = _first_line(out)
                m = re.match(r'v?(\d+)\.\d+', ver)
                info['version'] = ver or None
                if rc == 0 and m:
                    info['runs'], info['major'] = True, int(m.group(1))
                else:
                    info['error'] = _tail(err or out, 200) or ('exit %s' % rc)
            _NODE['info'] = info
        return _NODE['info']


def check_node(ctx):
    name = 'node (audit)'
    if IS_WIN:
        fix = _fix('winget install -e --id OpenJS.NodeJS.LTS')
    elif IS_MAC:
        fix = _fix('brew install node')
    else:
        fix = _fix('sudo apt-get install -y nodejs npm')
    node = _node_info()
    exe, ver = node['exe'], node['version']
    if not exe:
        return _res('node', name, 'WARN', 'node not on PATH -- optional; used by the deck audit for JS checks.',
                    required=False, fix=fix)
    data = {'version': ver, 'exe': exe}
    if not node['runs']:
        return _res('node', name, 'WARN', 'node at %s does not run (%s)' % (exe, node['error']),
                    required=False, fix=fix, data=data)
    if node['major'] < 18:
        return _res('node', name, 'WARN', 'node %s is old; use 18+.' % ver, required=False, fix=fix, data=data)
    return _res('node', name, 'PASS', 'node %s' % ver, required=False, data=data)


def _engine_version():
    try:
        src = (SKILL_DIR / 'storyboard-engine.js').read_text(encoding='utf-8', errors='replace')
    except OSError:
        return None
    m = re.search(r"""VERSION\s*[:=]\s*['"]([0-9][0-9A-Za-z.\-]*)['"]""", src)
    if m:
        return m.group(1)
    m = re.search(r'STORYBOARD ENGINE\b[^\n]*\(v([0-9][0-9.]*)\)', src[:4000])   # header banner "(v0.8)"
    return m.group(1) if m else None


_TOOL_ROLE = {
    'sb_deckio.py': 'elevenlabs_generate.py cannot start and tts_free.py / aaf_to_timings.py --apply cannot '
                    'rewrite the deck',
    'tts_free.py': 'no free edge-tts voice-over tool',
    'elevenlabs_generate.py': 'no ElevenLabs voice-over tool',
    'audit_deck.py': 'no deck audit',
    'aaf_to_timings.py': 'no AAF cue import',
}


def _git_restore_fix(files):
    """`git checkout -- <files>` for the ones the skill's git repo tracks (None when it is not a git
    checkout, git is not on PATH, or none of them is tracked)."""
    git = shutil.which('git')
    if not files or not git or not (SKILL_DIR / '.git').exists():
        return None
    rc, out, _ = _run([git, '-C', str(SKILL_DIR), 'ls-files', '--'] + list(files), timeout=15)
    tracked = set(ln.strip() for ln in out.splitlines()) if rc == 0 else set()
    keep = [f for f in files if f in tracked]
    return _fix('git -C "%s" checkout -- %s' % (SKILL_DIR, ' '.join(keep))) if keep else None


def check_skill_files(ctx):
    missing = [f for f in REQUIRED_SKILL_FILES if not (SKILL_DIR / f).is_file()]
    tools_missing = [f for f in TOOL_SKILL_FILES if not (SKILL_DIR / f).is_file()]
    ev = _engine_version()
    data = {'skill_dir': str(SKILL_DIR), 'engine_version': ev, 'missing': missing, 'tools_missing': tools_missing}
    if missing:
        also = (' (tools missing too: %s)' % ', '.join(tools_missing)) if tools_missing else ''
        return _res('skill_files', 'Skill files', 'FAIL', 'missing from %s: %s%s -- restore/reinstall the storyboard '
                    'skill.' % (SKILL_DIR, ', '.join(missing), also),
                    fix=_git_restore_fix(missing + tools_missing), data=data)
    # Optional hint: a syntax error in the engine breaks every deck silently. node is an OPTIONAL tool, so
    # only a genuine SyntaxError pointing into storyboard-engine.js from a modern node may FAIL this row;
    # a missing / broken / old node (check_node already WARNs about it) leaves the syntax 'unchecked'.
    node = _node_info()
    status, note = 'PASS', ''
    if not node['exe']:
        data['engine_syntax'] = 'unchecked (no node on PATH)'
    elif not node['runs']:
        data['engine_syntax'] = 'unchecked (node does not run)'
    elif node['major'] < NODE_CHECK_MIN:
        data['engine_syntax'] = 'unchecked (node %s is too old to parse the engine)' % node['version']
    else:
        env = dict(os.environ)
        env.pop('NODE_OPTIONS', None)   # a user --require/--import preload must not be blamed on the engine
        rc, out, err = _run([node['exe'], '--check', str(SKILL_DIR / 'storyboard-engine.js')], timeout=30, env=env)
        text = (err or '') + (out or '')
        loc = re.search(r'storyboard-engine\.js:(\d+)', text)
        syn = re.search(r'^\s*(SyntaxError\b.*)$', text, re.M)
        if rc == 0:
            data['engine_syntax'] = 'ok'
        elif isinstance(rc, int) and syn and loc:
            data['engine_syntax'] = 'error'
            data['engine_syntax_error'] = _tail(text, 1500)
            data['engine_syntax_node'] = node['version']
            where = 'line %s: %s' % (loc.group(1), syn.group(1).strip())
            if node['major'] >= NODE_TRUST_MIN:
                return _res('skill_files', 'Skill files', 'FAIL', 'storyboard-engine.js does not parse (node %s '
                            '--check, %s) -- every deck would fail to load. Restore/reinstall the skill (or undo the '
                            'last edit).' % (node['version'], where), data=data)
            status = 'WARN'
            note = ('; node %s --check reports a SyntaxError at %s. This node may simply be too old for newer '
                    'JS syntax -- upgrade node to %d+ and re-run; if it persists, restore/reinstall the skill'
                    % (node['version'], where, NODE_TRUST_MIN))
        else:
            data['engine_syntax'] = 'unchecked (node --check failed without a SyntaxError in the engine)'
            data['engine_syntax_error'] = _tail(text, 600) or ('exit %s' % rc)
    syntax = ' (syntax ok)' if data['engine_syntax'] == 'ok' else ''
    if node['exe'] and data['engine_syntax'].startswith('unchecked'):
        note = '; engine syntax %s' % data['engine_syntax']
    fix = None
    tools = ', voice/audit tools'
    if tools_missing:
        # rendering still works, so this is a WARN, never a FAIL of the required row
        status = 'WARN'
        tools = ''
        note += '; MISSING tool file(s) -- %s. Restore/reinstall the storyboard skill' % '; '.join(
            '%s: %s' % (f, _TOOL_ROLE.get(f, 'unavailable')) for f in tools_missing)
        fix = _git_restore_fix(tools_missing)
    return _res('skill_files', 'Skill files', status, 'engine %s%s, templates, render_video.py%s in %s%s'
                % (ev or '(version unknown)', syntax, tools, SKILL_DIR, note), fix=fix, data=data)


def check_assets(ctx):
    vendor = SKILL_DIR / 'assets' / 'vendor'
    three_missing = [f for f in THREE_FILES if not (vendor / f).is_file()]
    lottie = next((c for c in LOTTIE_CANDIDATES if (SKILL_DIR / c).is_file()), None)
    kits = sorted(p.stem for p in (SKILL_DIR / 'kits').glob('*.css')) if (SKILL_DIR / 'kits').is_dir() else []
    data = {'three_missing': three_missing, 'lottie_player': lottie, 'kits': kits}
    parts = ['three.js bundle ' + ('ok' if not three_missing else 'MISSING ' + ', '.join(three_missing)),
             'lottie player ' + (lottie if lottie else 'not bundled (new_project.py --with-lottie links the CDN)'),
             'style kits: ' + (', '.join(kits) if kits else 'none')]
    status = 'WARN' if three_missing else 'PASS'
    detail = '; '.join(parts)
    if three_missing:
        detail += ' -- data-anim="scene3d" decks need the three.js files in assets/vendor/.'
    return _res('assets', '3D / lottie / kits', status, detail, required=False, data=data)


def _wav_info(path):
    try:
        import wave
        with wave.open(str(path), 'rb') as w:
            return w.getframerate(), w.getnchannels(), w.getsampwidth() * 8, w.getnframes() / float(w.getframerate())
    except Exception:
        return None


def check_sfx(ctx):
    name = 'SFX library'
    sfx = SKILL_DIR / 'assets' / 'sfx'
    manifest = sfx / 'manifest.json'
    if not manifest.is_file():
        return _res('sfx', name, 'WARN', 'no assets/sfx/manifest.json -- renders get no automatic sound effects.',
                    required=False)
    try:
        man = json.loads(manifest.read_text(encoding='utf-8'))
        if not isinstance(man, dict):
            raise ValueError('top level is not an object')
    except Exception as e:
        return _res('sfx', name, 'WARN', 'assets/sfx/manifest.json is not valid JSON (%s) -- render_video.py cannot '
                    'place SFX.' % e, required=False)
    missing_names = [n for n in REQUIRED_SFX if n not in man]
    missing_files, bad_format = [], []
    for n, entry in sorted(man.items()):
        fname = (entry or {}).get('file') if isinstance(entry, dict) else None
        p = sfx / (fname or (n + '.wav'))
        if not p.is_file():
            missing_files.append(n)
            continue
        info = _wav_info(p)
        if info is None or info[:3] != (48000, 2, 16):
            bad_format.append(n)
    data = {'count': len(man), 'missing_names': missing_names, 'missing_files': missing_files,
            'not_48k_stereo_16bit': bad_format}
    problems = []
    if missing_names:
        problems.append('manifest lacks: ' + ', '.join(missing_names))
    if missing_files:
        problems.append('files missing for: ' + ', '.join(missing_files))
    if bad_format:
        problems.append('not 48 kHz stereo 16-bit WAV: ' + ', '.join(bad_format))
    if problems:
        return _res('sfx', name, 'WARN', '%d sounds in manifest; ' % len(man) + '; '.join(problems), required=False,
                    data=data)
    return _res('sfx', name, 'PASS', '%d sounds (all %d required present, 48 kHz stereo 16-bit)'
                % (len(man), len(REQUIRED_SFX)), required=False, data=data)


CHECKS = [check_python, check_interpreters, check_playwright, check_ffmpeg, check_numpy,
          check_skill_files, check_assets, check_sfx, check_edge_tts, check_elevenlabs, check_pyaaf2, check_node]


def _safe(fn, ctx):
    try:
        return fn(ctx)
    except Exception as e:   # a crashing check must never take doctor down
        cid = fn.__name__.replace('check_', '')
        return _res(cid, cid, 'FAIL', 'doctor check crashed: %s: %s' % (type(e).__name__, e),
                    required=cid in ('python', 'playwright', 'ffmpeg', 'numpy', 'skill_files'))


# ---------------------------------------------------------------------------
# --smoke : build a 2-second deck and render it end-to-end
# ---------------------------------------------------------------------------
SMOKE_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>storyboard doctor smoke test</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #0a0a0a;
                 font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .stage { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .deck { width: 1920px; height: 1080px; overflow: hidden; position: relative; }
    .slide { width: 1920px; height: 1080px; position: relative; overflow: hidden; display: flex;
             align-items: center; justify-content: center; background: #10131c; color: #fff; }
    .slide.alt { background: #1d3b8f; }
    .slide h1 { font-size: 160px; font-weight: 800; letter-spacing: -0.02em; }
    .anim { opacity: 0; }
    .anim.anim-static, .anim.anim-played { opacity: 1; }
  </style>
</head>
<body data-sfx="off">
  <div class="stage">
    <div class="deck" id="deck">
      <section class="slide" data-slide="1" data-transition-in="cut">
        <h1 class="anim" data-anim="fadeUp" data-t-rel="0.05" data-dur="0.4">Storyboard</h1>
      </section>
      <section class="slide alt" data-slide="2" data-transition-in="crossDissolve">
        <h1 class="anim" data-anim="fadeIn" data-t-rel="0.05" data-dur="0.3">Smoke test OK</h1>
      </section>
    </div>
  </div>
  <script>window.SB_DURATION = __SB_DUR__;</script>
  <script src="storyboard-engine.js"></script>
  <script>
  const TIMINGS = [
    { time: 0.0, slide: 1 },
    { time: 1.0, slide: 2 }
  ];
  const SLIDE_LABELS = ['Start', 'Done'];
  const WORD_HITS = [];
  const WORDS = [];
  Storyboard.init({ timings: TIMINGS, labels: SLIDE_LABELS, wordHits: WORD_HITS, words: WORDS, fallbackDuration: __SB_DUR__ });
  </script>
</body>
</html>
"""


def parse_cli_help(text):
    """Options a CLI accepts, read from its argparse `--help`: {flag: [choices] | None}.

    Only the `usage:` block counts (argparse generates it from the real parser, choices included as
    `--quality {high,fast}`); the free-text description that follows is prose and may mention flags or
    values the parser does not accept. Without a usage block, falls back to option rows (lines that start
    with a dash). Colour escape codes (argparse colours its help under FORCE_COLOR / PYTHON_COLORS=1,
    even when piped) are stripped first."""
    lines = _strip_ansi(text).splitlines()
    start = next((i for i, ln in enumerate(lines) if ln.lstrip().lower().startswith('usage:')), None)
    if start is not None:
        block = []
        for ln in lines[start:]:
            if not ln.strip():
                break
            block.append(ln)
        src = ' '.join(block)
    else:
        src = ' '.join(ln for ln in lines if ln.lstrip().startswith('-'))
    opts = {}
    for m in re.finditer(r'(?<![\w-])(--[a-z][a-z0-9-]*)(?:[ =]\{([^}]*)\})?', src):   # src is ANSI-free
        choices = [c.strip() for c in m.group(2).split(',')] if m.group(2) is not None else None
        if m.group(1) not in opts or choices is not None:
            opts[m.group(1)] = choices
    return opts


def _probe_mp4(ffmpeg, mp4):
    """Duration / resolution from `ffmpeg -i`, plus pixel spread of two sampled frames (blank-capture check)."""
    info = {'duration': None, 'resolution': None, 'frame_stdev': []}
    if not ffmpeg:
        return info
    rc, out, err = _run([ffmpeg, '-hide_banner', '-i', str(mp4)], timeout=30)
    m = re.search(r'Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)', err)
    if m:
        info['duration'] = round(int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)), 2)
    m = re.search(r'Video:.*?(\d{2,5})x(\d{2,5})', err)
    if m:
        info['resolution'] = '%sx%s' % (m.group(1), m.group(2))
    d = info['duration']
    # one frame per smoke slide (cue at 0 s, crossDissolve at 1 s): 0.55 s is after slide 1's entrance
    # and well before the dissolve, even when a real-time capture runs a few hundred ms early;
    # scaled into a shorter-than-expected video
    samples = (0.55, 1.7) if not d or d >= 1.8 else (round(d * 0.3, 2), round(d * 0.85, 2))
    for t in samples:
        try:
            p = subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-ss', str(t), '-i', str(mp4),
                                '-frames:v', '1', '-vf', 'scale=64:36,format=gray', '-f', 'rawvideo', '-'],
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, stdin=subprocess.DEVNULL, timeout=30)
            px = bytearray(p.stdout)
        except Exception:
            px = bytearray()
        if len(px) >= 64 * 36:
            mean = sum(px) / float(len(px))
            sd = (sum((v - mean) ** 2 for v in px) / float(len(px))) ** 0.5
            info['frame_stdev'].append(round(sd, 2))
    return info


def _rmtree(path):
    for _ in range(6):
        shutil.rmtree(str(path), ignore_errors=True)
        if not Path(path).exists():
            return
        time.sleep(0.5)   # Windows: Chromium / ffmpeg may still hold a handle for a moment


def run_smoke(ctx, ffmpeg_exe, keep=False, log=None):
    log = log or (lambda m: None)
    name = 'Smoke render'
    render = SKILL_DIR / 'render_video.py'
    engine = SKILL_DIR / 'storyboard-engine.js'
    if not render.is_file() or not engine.is_file():
        return _res('smoke', name, 'FAIL', 'render_video.py or storyboard-engine.js missing from %s' % SKILL_DIR)
    rc, help_out, help_err = _run([sys.executable, str(render), '--help'], timeout=90)
    if rc != 0:
        return _res('smoke', name, 'FAIL', 'render_video.py --help failed: %s' % _tail(help_err or help_out, 400))
    flags = parse_cli_help(help_out)

    tmp = Path(tempfile.mkdtemp(prefix='storyboard smoke '))   # space in the path on purpose
    html = tmp / 'storyboard.html'
    mp4 = tmp / 'smoke.mp4'
    data = {'dir': str(tmp), 'kept': bool(keep), 'renderer_flags': sorted(flags)}
    try:
        with open(str(html), 'w', encoding='utf-8', newline='') as f:
            f.write(SMOKE_HTML.replace('__SB_DUR__', '%g' % SMOKE_SECONDS))
        shutil.copyfile(str(engine), str(tmp / 'storyboard-engine.js'))
        base = [sys.executable, str(render), str(html)]
        if '--out' in flags:
            base += ['--out', str(mp4)]
        else:
            mp4 = tmp / 'storyboard.mp4'
        if 'fast' in (flags.get('--quality') or ()):   # only when `fast` is a declared choice
            base += ['--quality', 'fast']
        if '--no-audio' in flags:
            base += ['--no-audio']
        expect_dur = dur_range = None   # only a length we asked for can be held against the renderer
        if '--duration' in flags:
            base += ['--duration', str(SMOKE_SECONDS)]
            expect_dur = SMOKE_SECONDS
            dur_range = [round(expect_dur - SMOKE_DUR_SLACK[0], 2), round(expect_dur + SMOKE_DUR_SLACK[1], 2)]
        data['expected'] = {'resolution': SMOKE_SIZE, 'duration': expect_dur, 'duration_range': dur_range}
        if '--no-sfx' in flags:
            base += ['--no-sfx']

        attempts = [('default', base)]
        if '--cpu' in flags:
            attempts.append(('--cpu', base + ['--cpu']))
        tried = []
        for label, cmd in attempts:
            if mp4.exists():
                mp4.unlink()
            log('[..] smoke: rendering a %.0fs deck (%s)...' % (SMOKE_SECONDS, label))
            t0 = time.time()
            rc, out, err = _run(cmd, timeout=SMOKE_TIMEOUT, cwd=str(tmp))
            secs = round(time.time() - t0, 1)
            args = ' '.join(c if ' ' not in c else '"%s"' % c for c in cmd[2:])
            attempt = {'mode': label, 'args': args, 'seconds': secs, 'returncode': rc}
            tried.append(attempt)
            if rc == 'timeout':
                attempt['error'] = 'timed out after %ds' % SMOKE_TIMEOUT
                break
            if rc != 0 or not mp4.is_file() or mp4.stat().st_size == 0:
                attempt['error'] = _tail(err or out, 600) or 'no MP4 produced'
                break
            probe = _probe_mp4(ffmpeg_exe, mp4)
            attempt.update(probe)
            attempt['mp4_kb'] = round(mp4.stat().st_size / 1024.0, 1)
            attempt['frames_checked'] = bool(probe['frame_stdev'])
            blank = attempt['frames_checked'] and max(probe['frame_stdev']) < 2.0
            attempt['blank'] = blank
            if not blank:
                break
        data['attempts'] = tried
        last = tried[-1]
        if last.get('error'):
            return _res('smoke', name, 'FAIL', 'render_video.py %s failed after %.1fs: %s'
                        % (last['args'], last['seconds'], last['error']), data=data)
        if last.get('blank'):
            return _res('smoke', name, 'FAIL', 'MP4 was written but the sampled frames show no content: either the '
                        'screen capture is blank (GPU compositing) or the engine never revealed the animated text. '
                        'Re-run with --smoke --keep and open the kept storyboard.html in Chrome to compare.',
                        data=data)
        tail = ''
        if len(tried) > 1:
            tail = ' Default capture produced BLANK frames on this machine -- pass --cpu to render_video.py ' \
                   '(CSS/SVG decks) or use its offline frame mode.'
        if not last.get('frames_checked'):
            tail += ' Could not decode sample frames from the MP4 to confirm it shows content -- open it and ' \
                    'look (re-run with --smoke --keep to keep it).'
        off = []
        if last.get('resolution') and last['resolution'] != SMOKE_SIZE:
            off.append('%s instead of the deck\'s %s' % (last['resolution'], SMOKE_SIZE))
        if dur_range and last.get('duration') is not None and \
                not dur_range[0] <= last['duration'] <= dur_range[1]:
            off.append('%ss long although --duration %g was passed (a healthy render is %g-%gs: the capture '
                       'adds a short tail)' % (last['duration'], expect_dur, dur_range[0], dur_range[1]))
        data['mismatch'] = off
        if off:
            tail += ' The MP4 does not match what was asked for: %s -- render_video.py is not honouring its ' \
                    'options / the deck size (check its --help; re-run with --smoke --keep to inspect).' \
                    % '; '.join(off)
        detail = 'rendered in %.1fs -> %s, %s, %ss, %s KB%s' % (
            last['seconds'], mp4.name, last.get('resolution') or '?', last.get('duration'), last.get('mp4_kb'), tail)
        return _res('smoke', name, 'WARN' if tail else 'PASS', detail, data=data)
    finally:
        if keep:
            log('[ok] smoke project kept at: %s' % tmp)
        else:
            _rmtree(tmp)


# ---------------------------------------------------------------------------
# output
# ---------------------------------------------------------------------------
def _enable_vt():
    if not IS_WIN:
        return True
    try:
        import ctypes
        k = ctypes.windll.kernel32
        h = k.GetStdHandle(-11)
        mode = ctypes.c_uint32()
        if not k.GetConsoleMode(h, ctypes.byref(mode)):
            return False
        return bool(k.SetConsoleMode(h, mode.value | 0x0004))   # ENABLE_VIRTUAL_TERMINAL_PROCESSING
    except Exception:
        return False


def print_table(report, color=False):
    esc = chr(27)
    C = {'PASS': esc + '[32m', 'WARN': esc + '[33m', 'FAIL': esc + '[31m'} if color else {}
    R = esc + '[0m' if color else ''
    checks = report['checks']
    namew = max([len('CHECK')] + [len(c['name']) for c in checks])
    width = shutil.get_terminal_size((110, 24)).columns
    pad = ' ' * (6 + 2 + 4 + 2 + namew + 2)
    detw = max(40, width - len(pad) - 1)
    print('Storyboard doctor -- skill %s at %s' % (report['engine_version'] or '(engine version unknown)',
                                                  report['skill_dir']))
    print('Python %s at %s' % (report['python']['version'], report['python']['executable']))
    print()
    print('%-6s  %-4s  %-*s  %s' % ('STATUS', 'NEED', namew, 'CHECK', 'DETAILS'))
    print('%s  %s  %s  %s' % ('-' * 6, '-' * 4, '-' * namew, '-' * min(detw, 60)))
    for c in checks:
        lines = []
        for para in c['detail'].split('\n'):
            lines += textwrap.wrap(para, detw, break_long_words=False, break_on_hyphens=False) or ['']
        st = c['status']
        print('%s%-6s%s  %-4s  %-*s  %s' % (C.get(st, ''), st, R, 'req' if c['required'] else 'opt',
                                          namew, c['name'], lines[0]))
        for ln in lines[1:]:
            print(pad + ln)
        fx = c.get('fix')
        if fx and st != 'PASS':
            if fx['powershell'] == fx['bash']:
                variants = [('fix: ', fx['powershell'])]
            else:
                variants = [('fix (PowerShell): ', fx['powershell']), ('fix (bash):       ', fx['bash'])]
            for label, cmd in variants:
                for i, ln in enumerate(cmd.split('\n')):   # never wrap commands: they must paste intact
                    print(pad + (label if i == 0 else ' ' * len(label)) + ln)
    s = report['summary']
    print()
    failed = [c['name'] for c in checks if c['required'] and c['status'] == 'FAIL']
    if report['ok']:
        print('%sREADY%s -- all required checks pass (%d pass, %d warn). WARN rows are optional features.'
              % (C.get('PASS', ''), R, s['pass'], s['warn']))
        if not any(c['id'] == 'smoke' for c in checks):
            print('Run "python doctor.py --smoke" to render a 2-second test video end-to-end.')
    else:
        print('%sNOT READY%s -- required check(s) failed: %s. Run the fix commands above, then re-run doctor.'
              % (C.get('FAIL', ''), R, ', '.join(failed)))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--json', action='store_true', help='Print a machine-readable JSON report on stdout')
    ap.add_argument('--smoke', action='store_true',
                    help='Also build a %gs throwaway deck in a temp dir and render it with render_video.py' % SMOKE_SECONDS)
    ap.add_argument('--keep', action='store_true', help='With --smoke: keep the temp smoke project (path is printed)')
    ap.add_argument('--no-color', action='store_true', help='Disable ANSI colours in the table')
    args = ap.parse_args()

    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(errors='replace')
            sys.stderr.reconfigure(errors='replace')
        except Exception:
            pass

    def log(msg):
        print(msg, file=sys.stderr, flush=True)

    if not args.json:
        log('[..] checking the storyboard toolchain...')
    ctx = Ctx()
    with ThreadPoolExecutor(max_workers=8) as ex:
        checks = list(ex.map(lambda fn: _safe(fn, ctx), CHECKS))

    if args.smoke:
        by_id = dict((c['id'], c) for c in checks)
        blockers = [by_id[i]['name'] for i in ('playwright', 'ffmpeg', 'skill_files')
                    if by_id.get(i, {}).get('status') == 'FAIL']
        if blockers:
            checks.append(_res('smoke', 'Smoke render', 'FAIL',
                               'skipped: fix %s first.' % ', '.join(blockers)))
        else:
            ff = (by_id.get('ffmpeg') or {}).get('data', {}).get('exe')
            try:
                checks.append(run_smoke(ctx, ff, keep=args.keep, log=log))
            except Exception as e:
                checks.append(_res('smoke', 'Smoke render', 'FAIL',
                                   'smoke crashed: %s: %s' % (type(e).__name__, e)))

    summary = {'pass': 0, 'warn': 0, 'fail': 0}
    for c in checks:
        summary[c['status'].lower()] += 1
    ok = not any(c['required'] and c['status'] == 'FAIL' for c in checks)
    v = sys.version_info
    report = {
        'tool': 'storyboard-doctor',
        'ok': ok,
        'skill_dir': str(SKILL_DIR),
        'engine_version': _engine_version(),
        'platform': sys.platform,
        'python': {'executable': sys.executable, 'version': '%d.%d.%d' % (v[0], v[1], v[2])},
        'summary': summary,
        'checks': checks,
    }
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        color = (not args.no_color) and 'NO_COLOR' not in os.environ and sys.stdout.isatty() and _enable_vt()
        print_table(report, color=color)
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()

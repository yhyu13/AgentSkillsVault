"""Engine compositor tests: motion layers STACK instead of overwriting each other.

Every system that animates an element (entrance + data-then steps, data-hold, data-loop,
word hits, data-exit, camera / parallax planes) contributes to the element's transform /
opacity / filter; the compositor writes the stacked result once per frame (transforms
wrap: later layer = outer, opacities multiply, filters concatenate), and the result is a
pure function of t.

Headless Playwright (Chromium, SB_OFFLINE) against a local threaded HTTP server. Builds
throw-away decks in a temp dir with a copy of storyboard-engine.js. No audio, no network.

Run:  python -m unittest discover -s tests -p "test_engine_compositor.py" -v
"""
import hashlib
import http.server
import math
import os
import random
import shutil
import socketserver
import sys
import tempfile
import threading
import unittest

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENGINE = os.path.join(SKILL_DIR, 'storyboard-engine.js')

try:
    from playwright.sync_api import sync_playwright
    HAVE_PW = True
except Exception:  # pragma: no cover
    HAVE_PW = False

W, H = 960, 540
CAM_CUE = 5.0          # slide 2 (camera + parallax planes)

# presets that do nothing on a generic <div> (they need special markup or a library)
KNOWN_SPECIAL = {
    'constellation': 'needs a <canvas>',
    'motionPath': 'needs data-path="#svgPath" (and an SVG element to move)',
    'cursorTour': 'needs data-stops="#sel@t[:click|:type=..], ..." (it drives #sb-cursor, not the host)',
    'lottie': 'needs lottie-web (lottie_svg.min.js) + data-src / data-key',
    'scene3d': 'needs three.js (assets/vendor/three.min.js)',
}


# --------------------------------------------------------------------------- helpers
class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


class _Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def start_server(root):
    handler = lambda *a, **k: _Quiet(*a, directory=root, **k)  # noqa: E731
    srv = _Server(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, srv.server_address[1]


PAGE = """<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>compositor test</title>
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%%;height:100%%;overflow:hidden;background:#000;font-family:Arial,Helvetica,sans-serif}
.deck{width:%dpx;height:%dpx;position:relative;overflow:hidden}
.slide{width:%dpx;height:%dpx;position:relative;overflow:hidden;color:#fff;font-size:22px}
.anim{opacity:0}.anim.anim-played{opacity:1}
.play-controls,#sb-preview-badge,.jump-menu,.play-progress{display:none!important}
%s
</style></head>
<body>
<div class="deck" id="deck">
%s
</div>
<script src="storyboard-engine.js"></script>
<script>
%s
</script>
</body></html>
"""

COMPOSE_CSS = """
.grid{position:absolute;inset:0;display:grid;grid-template-columns:repeat(5,1fr);grid-auto-rows:120px;gap:10px;padding:14px;align-items:center;justify-items:center}
.box{width:130px;height:70px;background:#ffcc00;color:#111;display:flex;align-items:center;justify-content:center;font-weight:bold;border-radius:8px}
.needle{width:10px;height:90px;background:#fff;transform-origin:50% 100%}
.camera{position:absolute;inset:0}
.plane{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.pbox{width:100px;height:60px;background:#e94560}
"""

COMPOSE_SLIDES = """
<section class="slide" data-slide="1" style="background:#1d2340"><div class="grid">
  <div id="note" class="anim box" data-anim="stickyNote" data-rot="-8" data-t-rel="0.2" data-loop="float" data-loop-amp="12" data-loop-period="2">note</div>
  <div id="needle" class="anim needle" data-anim="gauge" data-from="-90" data-to="35" data-t-rel="0.2" data-dur="0.8" data-loop="float" data-loop-amp="10" data-loop-period="2"></div>
  <div id="chain" class="anim box" data-anim="fadeIn" data-t-rel="0.1" data-dur="0.3" data-then="gauge@0.6" data-from="0" data-to="25" data-loop="breathe" data-loop-amp="8" data-loop-period="2">chain</div>
  <div id="hitEl" class="anim box" data-anim="slideInLeft" data-t-rel="0.1" data-dur="0.5">HIT ME</div>
  <div id="springShake" class="anim box" data-anim="spring" data-t-rel="0.1" data-dur="0.8">spring</div>
  <div id="fb" class="anim box" data-anim="fadeIn" data-t-rel="0.1" data-dur="0.3" data-exit="blurOut" data-exit-t="3.0" data-exit-dur="0.8">blur out</div>
  <div id="fs" class="anim box" data-anim="fadeIn" data-t-rel="0.1" data-dur="0.3" data-exit="slideOutUp" data-exit-t="3.0" data-exit-dur="0.8">slide out</div>
  <div id="noteExit" class="anim box" data-anim="stickyNote" data-rot="-8" data-t-rel="0.2" data-exit="slideOutUp" data-exit-t="3.0" data-exit-dur="0.8">note exit</div>
  <div id="opx" class="anim box" data-anim="fadeIn" data-t-rel="0.1" data-dur="4" data-exit="fadeOut" data-exit-t="2.0" data-exit-dur="4">opacity</div>
  <div id="rf" class="anim box" data-anim="rackFocus" data-t-rel="0.1" data-dur="0.6" data-exit="blurOut" data-exit-t="3.0" data-exit-dur="0.8">rack</div>
  <div id="late" class="anim box" data-anim="scaleIn" data-t-rel="2.0" data-dur="0.5">late</div>
  <svg width="170" height="40" viewBox="0 0 170 40"><path id="conn" class="anim" data-anim="connectorDraw" data-arrow="end" d="M5 20 L160 20" stroke="#fff" stroke-width="4" fill="none" data-t-rel="1.0" data-dur="1.0"/></svg>
  <svg width="170" height="40" viewBox="0 0 170 40"><path id="conn2" class="anim" data-anim="fadeIn" data-t-rel="0.1" data-dur="0.2" data-then="connectorDraw@1.0" data-arrow="end" d="M5 20 L160 20" stroke="#0ff" stroke-width="4" fill="none"/></svg>
</div></section>
<section class="slide" data-slide="2" data-transition-in="cut" style="background:#112233">
  <div class="camera" id="cam" data-camera="0.5=>scale:1; 1.5=>scale:1.7,x:-40,y:20">
    <div id="plBg" class="plane" data-plane="0.3"><div class="pbox"></div></div>
    <div id="plMid" class="plane" data-plane="1"><div class="pbox"></div></div>
    <div id="plFg" class="plane" data-plane="1.4"><div class="pbox"></div></div>
    <div id="plA" class="plane anim" data-plane="0.5" data-anim="fadeIn" data-t-rel="0.1" data-dur="0.3" data-loop="float" data-loop-amp="10" data-loop-period="2"><div class="pbox"></div></div>
  </div>
</section>
"""

COMPOSE_INIT = """
  const TIMINGS = [{time:0, slide:1}, {time:%s, slide:2}];
  const WORD_HITS = [
    {time: 2.0, sel: '#hitEl', hit: 'pulse'},
    {time: 2.0, sel: '#springShake', hit: 'shake'},
    {time: 3.0, sel: '#note', hit: 'pulse'},
    {time: 1.0, sel: '#late', hit: 'pulse'},
    {time: 1.0, sel: '#late', hit: 'highlight'}
  ];
  Storyboard.init({ timings: TIMINGS, wordHits: WORD_HITS, fallbackDuration: 9 });
  window.__snap = () => { const o = {};
    document.querySelectorAll('.slide [id]').forEach(e => { o[e.id] = (e.getAttribute('style') || '') + '|' + (e._sbArrows ? e._sbArrows.map(l => l.style.opacity).join(',') : ''); });
    return o; };
  window.__m = (sel) => { const e = document.querySelector(sel), t = getComputedStyle(e).transform;
    const m = new DOMMatrix(t === 'none' ? undefined : t);
    return { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f, scale: Math.hypot(m.a, m.b), angle: Math.atan2(m.b, m.a) * 180 / Math.PI,
             style: e.style.transform, op: e.style.opacity, fl: e.style.filter, cop: getComputedStyle(e).opacity, cfl: getComputedStyle(e).filter }; };
""" % CAM_CUE

SWEEP_CSS = """
#cells{position:absolute;inset:0;display:flex;flex-wrap:wrap;gap:2px;align-content:flex-start}
.cell{position:relative;width:74px;height:40px;overflow:hidden;font-size:11px}
"""

SWEEP_SLIDES = """
<section class="slide" data-slide="1" id="s1" style="background:#202030"><div id="cells"></div></section>
"""

# Builds, for every preset key: e_<i> entrance, t_<i> data-then step, h_<i> word-hit target,
# c_<i> combo (entrance + data-hold + data-loop + word hit + data-exit); plus sp_* elements
# with the special markup the "inert on a generic element" presets need.
SWEEP_INIT = """
  const names = Object.keys(Storyboard.PRESETS).sort();
  window.__names = names; window.__style0 = {};
  const cells = document.getElementById('cells'), HITS = [], TXT = 'Ab 12 go';
  const mk = (id, attrs, html, tag) => { const c = document.createElement('div'); c.className = 'cell';
    const e = document.createElement(tag || 'div'); e.id = id; for (const k in attrs) e.setAttribute(k, attrs[k]);
    e.innerHTML = html; c.appendChild(e); cells.appendChild(c); window.__style0[id] = e.getAttribute('style') || ''; return e; };
  names.forEach((n, i) => {
    const d = Storyboard.PRESETS[n].dur;
    mk('e_' + i, {'class': 'anim', 'data-anim': n, 'data-t-rel': '1', 'data-to': '42'}, TXT);
    mk('t_' + i, {'class': 'anim', 'data-anim': 'fadeIn', 'data-t-rel': '0', 'data-dur': '0.2', 'data-then': n + '@1', 'data-to': '42'}, TXT);
    mk('h_' + i, {'data-to': '42'}, TXT);
    HITS.push({time: 1, sel: '#h_' + i, hit: n});
    mk('c_' + i, {'class': 'anim', 'data-anim': n, 'data-t-rel': '1', 'data-to': '42', 'data-hold': 'breathe', 'data-loop': 'float',
                  'data-exit': 'blurOut', 'data-exit-t': String(1 + d + 0.3)}, TXT);
    HITS.push({time: 1 + Math.min(d, 4) / 2, sel: '#c_' + i, hit: 'pulse'});
  });
  // special markup
  cells.insertAdjacentHTML('beforeend',
    '<div class="cell"><canvas id="sp_constellation" class="anim" data-anim="constellation" data-t-rel="1" data-count="12" style="width:74px;height:40px"></canvas></div>' +
    '<div class="cell"><svg width="74" height="40"><path id="spPath" d="M4 20 L70 20" fill="none" stroke="#fff"/>' +
      '<circle id="sp_motionPath" class="anim" data-anim="motionPath" data-path="#spPath" cx="0" cy="0" r="4" fill="#f0f" data-t-rel="1" data-dur="1"/></svg></div>' +
    '<div class="cell"><div id="sp_cursorTour" class="anim" data-anim="cursorTour" data-t-rel="0" data-stops="#spA@1.2, #spB@2.0:click"></div></div>' +
    '<div class="cell"><div id="spA">A</div></div><div class="cell"><div id="spB">B</div></div>' +
    '<div class="cell"><svg width="74" height="40"><path id="sp_connectorDraw" class="anim" data-anim="connectorDraw" data-arrow="end" d="M4 20 L70 20" stroke="#fff" stroke-width="3" fill="none" data-t-rel="1"/></svg></div>' +
    '<div class="cell"><svg width="74" height="40"><path id="sp_pathdraw" class="anim" data-anim="pathdraw" d="M4 20 L70 20" stroke="#fff" stroke-width="3" fill="none" data-t-rel="1"/></svg></div>' +
    '<div class="cell"><svg width="74" height="40"><circle id="sp_donutSweep" class="anim" data-anim="donutSweep" data-pct="70" cx="37" cy="20" r="15" stroke="#fff" stroke-width="4" fill="none" data-t-rel="1"/></svg></div>' +
    '<div class="cell"><svg width="74" height="40"><circle id="sp_pieSlice" class="anim" data-anim="pieSlice" data-pct="40" cx="37" cy="20" r="15" stroke="#fff" stroke-width="4" fill="none" data-t-rel="1"/></svg></div>');
  Storyboard.init({ timings: [{time: 0, slide: 1}], wordHits: HITS, fallbackDuration: 20 });
  const fnv = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(16); };
  window.__snapAll = () => { const o = {}; document.querySelectorAll('#cells > .cell [id]').forEach(e => { o[e.id] = fnv(e.outerHTML); });
    const cur = document.getElementById('sb-cursor'); if (cur) o['#sb-cursor'] = fnv(cur.getAttribute('style') || ''); return o; };
"""

SWEEP_JS = """() => {
  const names = window.__names, P = Storyboard.PRESETS, bad = [], inert = [], NUM = /NaN|undefined|Infinity/;
  const read = el => { const cs = getComputedStyle(el);
    return { style: el.getAttribute('style') || '', tf: cs.transform, op: cs.opacity, fl: cs.filter, html: el.innerHTML }; };
  const t0 = performance.now(); let frames = 0;
  names.forEach((n, i) => {
    const d = P[n].dur;
    const roles = [['e_' + i, [0.5, 1, 1 + d / 2, 1 + d + 0.25]],
                   ['t_' + i, [0.5, 1, 1 + d / 2, 1 + d + 0.25]],
                   ['h_' + i, [0.5, 1, 1.3, 1.85]],
                   ['c_' + i, [0.5, 1, 1 + d / 2, 1 + d + 0.2, 1 + d + 0.3 + 0.35]]];
    for (const [id, times] of roles) {
      const el = document.getElementById(id);
      const st = times.map(t => { Storyboard.renderAt(t); frames++; return read(el); });
      st.forEach((s, k) => { if (NUM.test(s.style) || NUM.test(s.tf) || NUM.test(s.op) || NUM.test(s.fl)) bad.push([n, id, times[k], s.style, s.tf, s.op, s.fl]); });
      if (id[0] === 'e' && st[2].style === window.__style0[id] && st[3].style === window.__style0[id]) inert.push(n);
    }
  });
  return { bad, inert, frames, ms: (performance.now() - t0) / Math.max(1, frames) };
}"""


# --------------------------------------------------------------------------- tests
@unittest.skipUnless(HAVE_PW, 'playwright not installed')
class EngineCompositorTest(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix='sb_engine_comp_')
        shutil.copyfile(ENGINE, os.path.join(cls.tmp, 'storyboard-engine.js'))
        with open(os.path.join(cls.tmp, 'compose.html'), 'w', encoding='utf-8') as f:
            f.write(PAGE % (W, H, W, H, COMPOSE_CSS, COMPOSE_SLIDES, COMPOSE_INIT))
        with open(os.path.join(cls.tmp, 'sweep.html'), 'w', encoding='utf-8') as f:
            f.write(PAGE % (W, H, W, H, SWEEP_CSS, SWEEP_SLIDES, SWEEP_INIT))
        cls.srv, cls.port = start_server(cls.tmp)
        cls.base = 'http://127.0.0.1:%d/' % cls.port
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(headless=True)
        cls.ctx = cls.browser.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1)
        cls.errors, cls.warnings = [], []
        cls.page = cls._open('compose.html', cls.errors, cls.warnings)

    @classmethod
    def _open(cls, name, errors, warnings):
        page = cls.ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: warnings.append(m.text) if m.type in ('warning', 'error') else None)
        page.add_init_script('window.SB_OFFLINE = true;')
        page.goto(cls.base + name)
        page.wait_for_function('window.Storyboard && Storyboard.cues && Storyboard.cues.length > 0', timeout=20000)
        page.evaluate('Storyboard.ready()')
        return page

    @classmethod
    def tearDownClass(cls):
        try:
            cls.browser.close()
        finally:
            cls.pw.stop()
            cls.srv.shutdown()
            cls.srv.server_close()
            shutil.rmtree(cls.tmp, ignore_errors=True)

    # -- helpers
    def m(self, sel, t):
        return self.page.evaluate('([s, t]) => { Storyboard.renderAt(t); return window.__m(s); }', [sel, t])

    def shot(self, t, clip=None):
        self.page.evaluate('(t) => Storyboard.renderAt(t)', t)
        self.page.evaluate('() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')
        return self.page.screenshot(clip=clip or {'x': 0, 'y': 0, 'width': W, 'height': H})

    def assertClose(self, a, b, tol, msg=''):
        self.assertLessEqual(abs(a - b), tol, '%s: %r vs %r (tol %r)' % (msg, a, b, tol))

    def assertNoEngineErrors(self, errors, warnings):
        self.assertEqual(errors, [])
        failed = [w for w in warnings if 'failed' in w]
        self.assertEqual(failed, [], 'engine reported failing layers')

    # (a) data-loop on a settled rotated entrance: the rotation survives while it floats
    def test_a_loop_wraps_settled_rotated_entrance(self):
        self.assertEqual(self.page.evaluate('Storyboard.layerOrder'), ['entrance', 'then', 'hold', 'loop', 'hit', 'exit', 'camera'])
        floats = set()
        for t in (1.35, 1.6, 2.35):
            n = self.m('#note', t)                          # stickyNote rot -8 settled at 1.1, float amp 12 / 2s from 1.1
            self.assertClose(n['angle'], -8, 0.05, 'note rotation lost under the loop at t=%s (%s)' % (t, n['style']))
            self.assertClose(n['scale'], 1, 1e-3, 'note scale')
            self.assertClose(n['e'], 0, 0.02, 'float moves in screen space')
            self.assertClose(n['f'], 12 * math.sin(math.pi * (t - 1.1)), 0.02, 'note float offset')
            self.assertIn('rotate(var(--rot))', n['style'])
            floats.add(round(n['f'], 2))
            g = self.m('#needle', t)                        # gauge -> 35deg settled at 1.0, float amp 10 from 1.0
            self.assertClose(g['angle'], 35, 0.05, 'gauge rotation lost under the loop at t=%s (%s)' % (t, g['style']))
            self.assertClose(g['e'], 0, 0.02, 'needle float in screen space')
            self.assertClose(g['f'], 10 * math.sin(math.pi * (t - 1.0)), 0.02, 'needle float offset')
        self.assertEqual(len(floats), 3, 'the loop should actually move the note')

    # (b) data-then step + data-loop: the step's settled state stays inside the loop
    def test_b_then_chain_plus_loop(self):
        breathe = lambda t: 1 + 0.08 * math.sin(math.pi * (t - 0.4))  # noqa: E731  (loop from the entrance end, 0.4)
        before = self.m('#chain', 0.6)                                  # gauge@0.6 -> starts at 0.7
        self.assertClose(before['angle'], 0, 0.05, 'step must be absent before its window')
        self.assertClose(before['scale'], breathe(0.6), 1e-3, 'loop runs from the entrance end')
        mid = self.m('#chain', 1.4)
        self.assertGreater(mid['angle'], 1)
        for t in (2.65, 2.9, 3.4):
            c = self.m('#chain', t)
            self.assertClose(c['angle'], 25, 0.05, 'chained gauge rotation lost under the loop at t=%s (%s)' % (t, c['style']))
            self.assertClose(c['scale'], breathe(t), 1e-3, 'breathe loop scale at t=%s (%s)' % (t, c['style']))

    # (c) a word hit on an element whose entrance writes transform is visible (and composes with loop + rotation)
    def test_c_word_hit_visible_over_transform_entrance(self):
        on, off = self.m('#hitEl', 2.3), self.m('#hitEl', 2.7)
        self.assertClose(on['scale'], 1.08, 1e-3, 'pulse peak on a slideInLeft element (%s)' % on['style'])
        self.assertClose(off['scale'], 1.0, 1e-4, 'pulse settled back')
        self.assertEqual(off['style'], 'translateX(0px)', 'after the hit only the entrance remains')
        box = self.page.evaluate("() => { const r = document.getElementById('hitEl').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }")
        clip = {'x': max(0, box[0] - 12), 'y': max(0, box[1] - 12), 'width': box[2] + 24, 'height': box[3] + 24}
        self.assertNotEqual(self.shot(2.3, clip), self.shot(2.7, clip), 'word hit is invisible in the rendered pixels')
        sh = self.m('#springShake', 2.03)                    # shake p=0.05 on a settled spring (scale 1)
        self.assertClose(sh['e'], 12 * math.sin(math.pi * 0.5) * 0.95, 0.05, 'shake offset (%s)' % sh['style'])
        self.assertClose(sh['scale'], 1, 1e-3, 'spring scale')
        # hit + loop + rotated entrance, all three at once
        y = 12 * math.sin(math.pi * (3.3 - 1.1))
        n = self.m('#note', 3.3)
        self.assertClose(n['scale'], 1.08, 1e-3, 'pulse on the floating note (%s)' % n['style'])
        self.assertClose(n['angle'], -8, 0.05, 'note rotation during the hit')
        self.assertClose(n['f'], 1.08 * y, 0.03, 'hit wraps the loop (%s)' % n['style'])
        self.assertClose(n['e'], 0, 0.02, 'note hit x')

    # (d) exits compose over the entrance and leave no residue when seeking back
    def test_d_exit_composes_and_seek_back_clears(self):
        clean = self.page.evaluate('() => { Storyboard.renderAt(2.0); return window.__snap(); }')
        fb, fs, ne = self.m('#fb', 3.4), self.m('#fs', 3.4), self.m('#noteExit', 3.4)
        self.assertIn('blur(', fb['fl'])
        self.assertClose(float(fb['cop']), 0.125, 1e-3, 'blurOut opacity')
        self.assertIn('translateY(-', fs['style'])
        self.assertClose(ne['angle'], -8, 0.05, 'rotated note keeps its rotation while it exits (%s)' % ne['style'])
        self.assertClose(ne['f'], -122.5, 0.05, 'exit slides straight up in screen space')
        self.assertClose(ne['e'], 0, 0.02, 'exit x')
        rf = self.m('#rf', 3.4)                               # rackFocus filter + blurOut filter concatenate
        self.assertIn('brightness(', rf['fl'])
        self.assertEqual(rf['fl'].count('blur('), 2, rf['fl'])
        op = self.m('#opx', 3.0)                              # fadeIn (p=.725) x fadeOut (p=.25) multiply
        want = (1 - (1 - 0.725) ** 3) * (1 - (1 - (1 - 0.25) ** 3))
        self.assertClose(float(op['cop']), want, 2e-4, 'opacity layers multiply')
        # seek back before the exits: nothing left behind
        fb, fs, ne = self.m('#fb', 2.0), self.m('#fs', 2.0), self.m('#noteExit', 2.0)
        self.assertEqual((fb['fl'], fb['cfl'], fb['op']), ('', 'none', '1'))
        self.assertEqual((fs['style'], fs['op']), ('', '1'))
        self.assertClose(ne['f'], 0, 1e-3, 'note exit residue')
        self.assertEqual(self.page.evaluate('() => { Storyboard.renderAt(2.0); return window.__snap(); }'), clean)
        self.assertNoEngineErrors(self.errors, self.warnings)

    # (e) connectorDraw arrowheads follow the clock both ways (entrance and data-then step)
    def test_e_connector_arrowheads_on_seek(self):
        q = """(t) => { Storyboard.renderAt(t); const a = id => (document.getElementById(id)._sbArrows || []).map(l => [l.style.opacity, getComputedStyle(l).opacity]);
                return { c: a('conn'), c2: a('conn2') }; }"""
        st = lambda t: self.page.evaluate(q, t)  # noqa: E731
        drawn = st(2.5)
        self.assertEqual(drawn['c'], [['1', '1'], ['1', '1']])
        self.assertEqual(drawn['c2'], [['1', '1'], ['1', '1']])
        for t in (0.5, 1.5, 0.05):                       # before the line is drawn (entrance / step not far enough)
            s = st(t)
            self.assertEqual(s['c'], [['0', '0'], ['0', '0']], 'arrowhead persisted at t=%s' % t)
            self.assertEqual(s['c2'], [['0', '0'], ['0', '0']], 'step arrowhead persisted at t=%s' % t)
        self.assertEqual(st(1.95)['c'], [['1', '1'], ['1', '1']])
        self.assertEqual(st(1.95)['c2'], [['1', '1'], ['1', '1']])

    # (f) parallax: a plane's NET scale (camera x plane) is 1+(sc-1)*f
    def test_f_parallax_net_scale(self):
        q = """(t) => { Storyboard.renderAt(t); const mx = e => { const s = getComputedStyle(e).transform; return new DOMMatrix(s === 'none' ? undefined : s); };
                const cam = mx(document.getElementById('cam')), out = { cam: cam.a };
                for (const id of ['plBg', 'plMid', 'plFg', 'plA']) { const pl = document.getElementById(id), m = mx(pl), b = pl.querySelector('.pbox');
                  out[id] = { f: parseFloat(pl.dataset.plane), own: m.a, ty: m.f, net: cam.a * m.a, rect: b.getBoundingClientRect().width / b.offsetWidth }; }
                return out; }"""
        for dt, sc in ((2.0, 1.7), (1.0, 1.35)):
            r = self.page.evaluate(q, CAM_CUE + dt)
            self.assertClose(r['cam'], sc, 1e-3, 'camera scale')
            for pid in ('plBg', 'plMid', 'plFg', 'plA'):
                p = r[pid]
                want = 1 + (sc - 1) * p['f']
                self.assertClose(p['net'], want, 2e-3, '%s net scale (matrix)' % pid)
                self.assertClose(p['rect'], want, 5e-3, '%s net scale (rendered box)' % pid)
            self.assertGreaterEqual(r['plBg']['net'], 1.0, 'background plane shrinks on a push-in (exposes edges)')
        # an animated plane keeps its own loop inside the parallax move
        a, b = self.page.evaluate(q, CAM_CUE + 2.0)['plA'], self.page.evaluate(q, CAM_CUE + 2.5)['plA']
        ps = (1 + 0.7 * 0.5) / 1.7
        fl = lambda t: 10 * math.sin(math.pi * (t - (CAM_CUE + 0.4)))  # noqa: E731
        self.assertClose(b['ty'] - a['ty'], ps * (fl(CAM_CUE + 2.5) - fl(CAM_CUE + 2.0)), 0.05, 'plane float inside parallax')

    # (g) before its entrance an element shows exactly its pre-animation state (hits on it are skipped)
    def test_g_reset_to_clean_before_entrance(self):
        q = "(t) => { Storyboard.renderAt(t); const e = document.getElementById('late'); return [e.getAttribute('style') || '', e.style.opacity, e.style.backgroundImage, e.style.transform]; }"
        pre, during_hits = self.page.evaluate(q, 0.5), self.page.evaluate(q, 1.3)
        self.assertEqual(pre, during_hits, 'word hits leaked onto an element before its entrance')
        self.assertEqual(pre[1], '0')
        after = self.page.evaluate(q, 3.0)
        self.assertIn('linear-gradient', after[2], 'a held hit shows once the element is on')
        self.assertEqual(after[3], 'scale(1)', 'impulse hit (pulse) ended: only the entrance transform remains')
        self.assertEqual(self.page.evaluate(q, 0.5), pre)

    # (h) the stacked output is a pure function of t (pixels and inline styles)
    def test_h_composite_is_pure_function_of_t(self):
        times = [0.05, 0.3, 0.65, 1.05, 1.4, 1.9, 2.03, 2.3, 2.7, 3.05, 3.3, 3.4, 3.9, 4.6, 5.3, 6.0, 6.6, 7.0, 7.5]
        snap = lambda t: self.page.evaluate('(t) => { Storyboard.renderAt(t); return window.__snap(); }', t)  # noqa: E731
        ref = {t: (hashlib.sha256(self.shot(t)).hexdigest(), snap(t)) for t in times}
        order = times[:]
        random.Random(7).shuffle(order)
        bad = []
        for seq in (order, list(reversed(times))):
            for t in seq:
                if hashlib.sha256(self.shot(t)).hexdigest() != ref[t][0]:
                    bad.append(('pixels', t))
                s = snap(t)
                if s != ref[t][1]:
                    bad.append(('styles', t, sorted(k for k in s if s[k] != ref[t][1].get(k))))
        self.assertEqual(bad, [], 'composited frames depend on render order')
        self.assertGreater(len({v[0] for v in ref.values()}), 15)

    # (i) every preset: as entrance, data-then step, word hit and in a full stack — no throw, valid output, pure in t
    def test_i_every_preset_on_a_generic_element(self):
        errors, warnings = [], []
        page = self._open('sweep.html', errors, warnings)
        try:
            names = page.evaluate('window.__names')
            self.assertGreaterEqual(len(names), 100)
            r = page.evaluate(SWEEP_JS)
            sys.stderr.write('\n[compositor] %d presets x 4 roles, %d frames, %.2f ms/frame (renderAt + getComputedStyle, %d elements)\n'
                             % (len(names), r['frames'], r['ms'], 4 * len(names) + 9))
            special = sorted(set(r['inert']))
            if special:
                sys.stderr.write('[compositor] inert on a generic <div> (need special markup):\n' +
                                 ''.join('    %-14s %s\n' % (n, KNOWN_SPECIAL.get(n, '??')) for n in special))
            self.assertEqual(r['bad'], [], 'presets produced NaN / undefined styles')
            self.assertNoEngineErrors(errors, warnings)
            unexpected = [n for n in special if n not in KNOWN_SPECIAL]
            self.assertEqual(unexpected, [], 'these presets do nothing on a generic element (broken, or add them to KNOWN_SPECIAL with the markup they need)')
            # with their special markup the inert ones do work (lottie / scene3d need libraries: not loaded here)
            sp = page.evaluate("""() => { const q = id => document.getElementById(id), st = id => q(id).getAttribute('style') || '';
                Storyboard.renderAt(0.5); const mp0 = q('sp_motionPath').getAttribute('cx'), cur0 = (q('sb-cursor') || {style: {}}).style.opacity;
                Storyboard.renderAt(1.5); const o = { mp: [mp0, q('sp_motionPath').getAttribute('cx')], cur: [cur0, q('sb-cursor').style.opacity, q('sb-cursor').style.left],
                  st: ['sp_constellation', 'sp_connectorDraw', 'sp_pathdraw', 'sp_donutSweep', 'sp_pieSlice'].map(st) };
                return o; }""")
            self.assertNotEqual(sp['mp'][0], sp['mp'][1], 'motionPath with data-path moves its element')
            self.assertEqual(sp['cur'][1], '1', 'cursorTour with data-stops shows the cursor')
            self.assertTrue(sp['cur'][2].endswith('px'), sp['cur'])
            for s in sp['st']:
                self.assertIn('opacity', s)
            self.assertIn('stroke-dashoffset', sp['st'][1])
            # purity over the whole sweep: forward vs shuffled render order, every element's outerHTML
            times = [0.5, 1.0, 1.1, 1.3, 1.6, 2.0, 2.4, 3.2, 4.1, 6.0, 12.0]
            fwd = {t: page.evaluate('(t) => { Storyboard.renderAt(t); return window.__snapAll(); }', t) for t in times}
            order = times[:]
            random.Random(3).shuffle(order)
            impure = set()
            for t in order + times[::-1]:
                s = page.evaluate('(t) => { Storyboard.renderAt(t); return window.__snapAll(); }', t)
                for k, v in s.items():
                    if fwd[t].get(k) != v:
                        impure.add((k, t))
            by_preset = sorted({(names[int(k.split('_')[1])] if k[:2] in ('e_', 't_', 'h_', 'c_') else k) for k, _ in impure})
            self.assertEqual(by_preset, [], 'render-order dependent presets / elements: %r' % sorted(impure)[:20])
            self.assertNoEngineErrors(errors, warnings)
        finally:
            page.close()


if __name__ == '__main__':
    unittest.main()

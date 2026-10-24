"""Engine core tests: deterministic timeline, transitions on the clock, new API.

Headless Playwright (Chromium) against a local threaded HTTP server (with Range
support, so <audio> can seek). Builds a throw-away test deck in a temp dir with a
copy of storyboard-engine.js.

Run:  python -m unittest discover -s tests -p "test_engine_core.py" -v
"""
import base64
import hashlib
import http.server
import math
import os
import random
import re
import shutil
import socketserver
import struct
import subprocess
import sys
import tempfile
import threading
import time
import unittest
import wave

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENGINE = os.path.join(SKILL_DIR, 'storyboard-engine.js')

try:
    from playwright.sync_api import sync_playwright
    HAVE_PW = True
except Exception:  # pragma: no cover
    HAVE_PW = False

W, H = 960, 540
CUE_STEP = 2.5

# (transition-in, background) per slide; None = no data-transition-in (engine default)
SLIDES = [
    ('cut',           '#16213e'),
    ('crossDissolve', '#0f3460'),
    ('pushLeft',      '#533483'),
    ('zoomIn',        '#e94560'),
    ('flip3D',        '#1b998b'),
    ('irisOpen',      '#2d3047'),
    ('glitch',        '#ff9b71'),
    ('barWipe',       '#3c1642'),
    ('whipPan',       '#086375'),
    (None,            '#1dd3b0'),
    ('fade',          '#6a994e'),
    ('blocks',        '#bc4749'),
]
EXPECTED_NAMES = [n or 'crossDissolve' for n, _ in SLIDES]
EXPECTED_NAMES[0] = 'cut'          # first cue: nothing to transition from
DUR = {'cut': 0, 'crossDissolve': 0.7, 'pushLeft': 0.75, 'zoomIn': 0.8, 'flip3D': 0.9, 'irisOpen': 0.85,
       'glitch': 0.52, 'barWipe': 0.7, 'whipPan': 0.48, 'fade': 0.9, 'blocks': 0.62}
WAV_SECONDS = 32.0


# --------------------------------------------------------------------------- helpers
class _RangeHandler(http.server.SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler + single-range 'Range: bytes=a-b' support (206).
    Paths under /norange/ are served without Range support (like python -m http.server);
    paths containing a key of DELAYS are answered after that many seconds."""
    DELAYS = {}

    def log_message(self, *a):
        pass

    def send_head(self):
        for key, secs in self.DELAYS.items():
            if key in self.path:
                time.sleep(secs)
        if self.path.startswith('/norange/'):
            self.path = self.path[len('/norange'):]
            return super().send_head()
        rng = self.headers.get('Range')
        path = self.translate_path(self.path)
        if not rng or not os.path.isfile(path):
            return super().send_head()
        m = re.match(r'bytes=(\d*)-(\d*)$', rng.strip())
        size = os.path.getsize(path)
        if not m:
            return super().send_head()
        a = int(m.group(1)) if m.group(1) else None
        b = int(m.group(2)) if m.group(2) else None
        if a is None:
            a, b = max(0, size - (b or 0)), size - 1
        if b is None or b >= size:
            b = size - 1
        if a > b or a >= size:
            self.send_response(416)
            self.send_header('Content-Range', 'bytes */%d' % size)
            self.end_headers()
            return None
        f = open(path, 'rb')
        f.seek(a)
        self.send_response(206)
        self.send_header('Content-type', self.guess_type(path))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Range', 'bytes %d-%d/%d' % (a, b, size))
        self.send_header('Content-Length', str(b - a + 1))
        self.end_headers()
        self._range_left = b - a + 1
        return f

    def copyfile(self, source, outputfile):
        left = getattr(self, '_range_left', None)
        if left is None:
            return super().copyfile(source, outputfile)
        while left > 0:
            buf = source.read(min(65536, left))
            if not buf:
                break
            try:
                outputfile.write(buf)
            except (ConnectionError, OSError):
                break
            left -= len(buf)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


class _Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def start_server(root):
    handler = lambda *a, **k: _RangeHandler(*a, directory=root, **k)  # noqa: E731
    srv = _Server(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, srv.server_address[1]


def make_wav(path, seconds=WAV_SECONDS, rate=16000):
    n = int(seconds * rate)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        frames = bytearray()
        for i in range(n):
            frames += struct.pack('<h', int(1200 * math.sin(2 * math.pi * 220 * i / rate)))
        w.writeframes(bytes(frames))


def _slide_html(i, trans, bg):
    n = i + 1
    ti = '' if trans is None else ' data-transition-in="%s"' % trans
    body = {
        1: '<h1 class="anim" data-anim="fadeUp" data-t-rel="0.1" data-dur="0.6">Slide One</h1>'
           '<div class="card" data-shared-id="hero">HERO</div>'
           '<p id="hitA" class="anim" data-anim="fadeIn" data-t-rel="0.3" data-dur="0.4">hit target A</p>',
        2: '<div class="camera" data-camera="0=>scale:1; 2=>scale:1.25,x:-40,y:-20">'
           '<div class="plane-bg" data-plane="0.6"><div class="blob"></div></div>'
           '<div class="plane-fg" data-plane="1.4"><h2 id="planeText" class="anim" data-anim="fadeIn" data-t-rel="0.2">Parallax</h2>'
           '<h3 id="annS2" class="anim" data-anim="circleScribble" data-t-rel="0.5" style="font-size:28px">circled</h3></div>'
           '</div><div class="card small" data-shared-id="hero">hero</div>',
        3: '<ul class="anim-group" data-anim="slideInLeft" data-stagger="0.15" data-t-rel="0.2" data-dur="0.5">'
           '<li>one</li><li>two</li><li>three</li><li>four</li></ul>'
           '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.1" data-exit="slideOutLeft" data-exit-at="1.6">leaves</h2>',
        4: '<div class="anim big" data-anim="counter" data-to="1234" data-t-rel="0.2" data-dur="1.5">0</div>'
           '<h2 class="anim" data-anim="spring" data-t-rel="0.1" data-dur="0.8" data-loop="float" data-loop-amp="12" data-loop-period="1.3">Spring + float</h2>'
           '<p class="anim" data-anim="fadeIn" data-t-rel="0.3" data-dur="0.3" data-hold="breathe">hold</p>',
        5: '<p class="anim" data-anim="typewriter" data-t-rel="0.2" data-dur="1.2" style="font-size:28px">Typing along nicely</p>'
           '<div class="anim box" data-anim="fadeIn" data-t-rel="0.1" data-dur="0.4" data-then="pulse@0.8; glow"></div>'
           '<div class="row"><span class="anim chip" data-anim="wobble" data-t-rel="0.2" data-dur="0.9">wobble text</span>'
           '<span class="anim chip" data-anim="gauge" data-from="-40" data-to="0" data-t-rel="0.2" data-dur="1.0">gauge text</span>'
           '<span id="chainCheck" class="anim chip" data-anim="fadeIn" data-t-rel="0.1" data-dur="0.3" data-then="checkDraw@1.4">check me</span></div>'
           '<p id="chainTw" class="anim" data-anim="fadeIn" data-t-rel="0.1" data-dur="0.3" data-then="typewriter@1.2" style="font-size:26px">Chained typing words</p>'
           '<h3 id="chainU" class="anim" data-anim="fadeIn" data-t-rel="0.1" data-dur="0.3" data-then="underlineDraw@1.0" style="font-size:26px">chained underline</h3>',
        6: '<h2 id="irisTitle" class="anim" data-anim="scaleIn" data-t-rel="0.1" data-dur="0.6">Iris</h2>'
           '<div class="anim bar" data-anim="barGrow" data-dir="h" data-t-rel="0.3" data-dur="1.0"></div>',
        7: '<h2 class="anim" data-anim="rgbGlitch" data-t-rel="0.05" data-dur="1.0">GLITCH</h2>'
           '<div class="anim" data-anim="confettiBurst" data-t-rel="0.3" style="width:10px;height:10px"></div>',
        8: '<h2 class="anim" data-anim="tracking" data-t-rel="0.1" data-dur="1.0">WIPE</h2>'
           '<p class="anim" data-anim="highlight" data-t-rel="0.5" data-dur="0.8">highlighted</p>'
           '<p style="font-size:30px">Say <span id="hitCircle">circled</span>, <span id="hitUnder">underlined</span>, '
           '<span id="hitHi">marked</span> <span id="hitCount" data-to="7">42</span></p>'
           '<p style="font-size:26px"><span id="hitSpark">sparkly</span> and <span id="hitBub">bubble</span></p>',
        9: '<h2 class="anim" data-anim="anticipate" data-t-rel="0.1" data-dur="1.0">Whip</h2>'
           '<canvas class="anim" data-anim="constellation" data-t-rel="0" data-count="24" style="width:400px;height:160px"></canvas>',
        10: '<h2 class="anim" data-anim="fadeUp" data-t-rel="0.1">Default transition</h2>'
            '<div class="anim" data-anim="filmGrain" data-t-rel="0" data-grain-opacity="0.3"></div>',
        11: '<h2 class="anim" data-anim="letterSpring" data-t-rel="0.1" data-dur="1.0">Letters!</h2>',
        12: '<h2 class="anim" data-anim="bounce" data-t-rel="0.1">Blocks</h2>',
    }[n]
    return '<section class="slide" data-slide="%d"%s style="background:%s">%s</section>' % (n, ti, bg, body)


def deck_html(slides_html, init_js, audio_tag='<audio id="voAudio" src="voiceover.wav" preload="auto"></audio>',
              extra_head=''):
    return """<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>engine core test</title>
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%%;height:100%%;overflow:hidden;background:#000;font-family:Arial,Helvetica,sans-serif}
.deck{width:%dpx;height:%dpx;position:relative;overflow:hidden}
.slide{width:%dpx;height:%dpx;position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;color:#fff;font-size:40px}
.anim{opacity:0}.anim.anim-played{opacity:1}
.card{width:300px;height:180px;background:#ffcc00;border-radius:16px;color:#111;display:flex;align-items:center;justify-content:center;font-weight:bold}
.card.small{width:120px;height:72px;position:absolute;left:30px;top:30px;font-size:18px}
.camera{position:relative;width:100%%;height:100%%;display:flex;align-items:center;justify-content:center}
.plane-bg{position:absolute;inset:0}.blob{position:absolute;left:560px;top:120px;width:260px;height:260px;border-radius:50%%;background:#e94560}
.plane-fg{position:relative}
.big{font-size:90px;font-weight:bold}.box{width:160px;height:90px;background:#fff;border-radius:12px}
.bar{width:500px;height:40px;background:#ffd166}
.row{display:flex;gap:24px}.chip{display:inline-block;font-size:26px;padding:6px 12px;background:#264653;border-radius:8px}
ul{list-style:none;font-size:30px}
.play-controls,#sb-preview-badge,.jump-menu,.play-progress{display:none!important}
</style>%s</head>
<body>
<div class="stage"><div class="deck" id="deck">
%s
</div></div>
%s
<script>window.__aev=[];(function(){var a=document.querySelector('audio');if(a)['play','playing','seeking','seeked'].forEach(function(n){a.addEventListener(n,function(){window.__aev.push(n);});});})();</script>
<script src="storyboard-engine.js"></script>
<script>
%s
</script>
</body></html>
""" % (W, H, W, H, extra_head, slides_html, audio_tag, init_js)


MAIN_INIT = """
  const TIMINGS = [%s];
  const SLIDE_LABELS = [%s];
  const WORD_HITS = [
    {time: 1.2, sel: '#hitA', hit: 'pulse'},
    {time: 3.4, sel: '#planeText', hit: 'shake'},
    {time: 13.6, sel: '#irisTitle', hit: 'glow'},
    {time: 18.4, sel: '#hitCircle', hit: 'circleScribble'},
    {time: 18.7, sel: '#hitUnder', hit: 'underlineDraw'},
    {time: 19.0, sel: '#hitHi', hit: 'highlight'},
    {time: 19.3, sel: '#hitCount', hit: 'counter'},
    {time: 18.1, sel: '#hitSpark', hit: 'sparkle'},
    {time: 18.3, sel: '#hitBub', hit: 'speechBubble'}
  ];
  const WORDS = [{text:'Hello', start:0.1, end:0.4}, {text:'world', start:0.45, end:0.9}];
  Storyboard.init({ timings: TIMINGS, labels: SLIDE_LABELS, wordHits: WORD_HITS, words: WORDS, fallbackDuration: 31 });
""" % (', '.join('{time:%.2f, slide:%d}' % (i * CUE_STEP, i + 1) for i in range(len(SLIDES))),
       ', '.join("'S%d'" % (i + 1) for i in range(len(SLIDES))))


def build_test_deck(d):
    shutil.copyfile(ENGINE, os.path.join(d, 'storyboard-engine.js'))
    make_wav(os.path.join(d, 'voiceover.wav'))
    slides = '\n'.join(_slide_html(i, tr, bg) for i, (tr, bg) in enumerate(SLIDES))
    with open(os.path.join(d, 'deck.html'), 'w', encoding='utf-8') as f:
        f.write(deck_html(slides, MAIN_INIT))
    return os.path.join(d, 'deck.html')


DECODER_JS = """async ([a, b]) => {
  const load = async (s) => { const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
  const A = await load(a);
  if (!b) {                                   // dominant colour + share of pixels far from it
    const hist = new Map();
    for (let i = 0; i < A.length; i += 4) { const k = (A[i] >> 3) << 10 | (A[i+1] >> 3) << 5 | (A[i+2] >> 3); hist.set(k, (hist.get(k) || 0) + 1); }
    let best = 0, bk = 0; hist.forEach((v, k) => { if (v > best) { best = v; bk = k; } });
    const dom = [(bk >> 10 & 31) * 8 + 4, (bk >> 5 & 31) * 8 + 4, (bk & 31) * 8 + 4];
    let far = 0; const n = A.length / 4;
    for (let i = 0; i < A.length; i += 4) { if (Math.abs(A[i]-dom[0]) + Math.abs(A[i+1]-dom[1]) + Math.abs(A[i+2]-dom[2]) > 60) far++; }
    return { dominant: dom, farFrac: far / n, domFrac: best / n };
  }
  const B = await load(b); let diff = 0;
  for (let i = 0; i < A.length; i += 4) { if (Math.abs(A[i]-B[i]) + Math.abs(A[i+1]-B[i+1]) + Math.abs(A[i+2]-B[i+2]) > 24) diff++; }
  return { diffFrac: diff / (A.length / 4) };
}"""


def hex_rgb(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


# --------------------------------------------------------------------------- tests
@unittest.skipUnless(HAVE_PW, 'playwright not installed')
class EngineCoreTest(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix='sb_engine_core_')
        build_test_deck(cls.tmp)
        cls.srv, cls.port = start_server(cls.tmp)
        cls.base = 'http://127.0.0.1:%d/' % cls.port
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required', '--mute-audio'])
        cls.ctx = cls.browser.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1)
        cls.decoder = cls.ctx.new_page()
        cls.decoder.goto('about:blank')
        # the offline deck page shared by most tests
        cls.errors = []
        cls.page = cls.ctx.new_page()
        cls.page.on('pageerror', lambda e: cls.errors.append(str(e)))
        cls.page.add_init_script('window.SB_OFFLINE = true;')
        cls.page.goto(cls.base + 'deck.html')
        cls.page.wait_for_function('window.Storyboard && Storyboard.cues && Storyboard.cues.length > 0', timeout=20000)
        cls.page.evaluate('Storyboard.ready()')

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
    def shot(self, t, page=None):
        page = page or self.page
        page.evaluate('(t) => Storyboard.renderAt(t)', t)
        page.evaluate('() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')
        return page.screenshot(clip={'x': 0, 'y': 0, 'width': W, 'height': H})

    def stats(self, png):
        return self.decoder.evaluate(DECODER_JS, [base64.b64encode(png).decode(), None])

    def diff(self, a, b):
        return self.decoder.evaluate(DECODER_JS, [base64.b64encode(a).decode(), base64.b64encode(b).decode()])['diffFrac']

    @staticmethod
    def cue(i):
        return i * CUE_STEP

    # times that hit the interesting windows of the test deck (+ random fill)
    @classmethod
    def det_times(cls, n=48):
        rnd = random.Random(1234)
        times = set()
        for i in range(1, len(SLIDES)):
            d = DUR[EXPECTED_NAMES[i]]
            times.update({round(cls.cue(i) + d * 0.5, 3), round(cls.cue(i) + 0.2, 3)})
        times.update({10.35, 10.6, 11.25, 11.45, 12.0, 12.3,      # slide 5: wobble/gauge mid + settled, data-then steps
                      15.1, 15.25, 15.4, 16.2,                    # slide 7: confetti before/while it bursts, mid-glitch
                      18.2, 18.6, 18.9, 19.2, 19.5, 19.95,        # slide 8: word hits (annotations, highlight, counter)
                      4.2, 23.0})                                 # slide 2 annotation held; later slides with it off-screen
        while len(times) < n:
            times.add(round(rnd.uniform(0, len(SLIDES) * CUE_STEP + 1.5), 3))
        return sorted(times)

    # (a) determinism: shuffled == sorted == reversed, pixel for pixel
    def test_a_render_is_pure_function_of_t(self):
        rnd = random.Random(99)
        times = self.det_times()
        t0 = time.time()
        sorted_hash = {t: hashlib.sha256(self.shot(t)).hexdigest() for t in times}
        per_frame = (time.time() - t0) / len(times)
        sys.stderr.write('\n[engine-core] renderAt + 2 rAF + screenshot (%dx%d): %.1f ms/frame\n' % (W, H, per_frame * 1000))
        shuffled = times[:]
        rnd.shuffle(shuffled)
        mismatches = []
        for t in shuffled:
            h = hashlib.sha256(self.shot(t)).hexdigest()
            if h != sorted_hash[t]:
                mismatches.append(t)
        for t in reversed(times[:16]):                  # and backwards over the first part
            if hashlib.sha256(self.shot(t)).hexdigest() != sorted_hash[t]:
                mismatches.append(('rev', t))
        self.assertEqual(mismatches, [], 'frames differ depending on render order at t=%r' % mismatches)
        self.assertGreater(len(set(sorted_hash.values())), 36, 'frames should actually change over time')
        self.assertEqual(self.errors, [])

    # (a3) the DOM too — including slides that are off screen — is a pure function of t
    def test_a3_dom_is_pure_function_of_t(self):
        snap = """(t) => { Storyboard.renderAt(t);
            const fnv = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(16); };
            return [...document.querySelectorAll('.slide')].map(s => fnv(s.outerHTML)); }"""
        times = self.det_times(40)
        ref = {t: self.page.evaluate(snap, t) for t in times}
        order = times[:]
        random.Random(5).shuffle(order)
        bad = []
        for t in order + times[::-1]:
            got = self.page.evaluate(snap, t)
            bad += [(t, i + 1) for i, (a, b) in enumerate(zip(got, ref[t])) if a != b]
        self.assertEqual(bad, [], 'slide DOM depends on render order at (t, slide): %r' % sorted(set(bad))[:12])

    # (a2) a frame rendered first thing on a fresh page == the same frame inside a long run
    def test_a2_fresh_page_frames_match(self):
        times = [4.2, 10.6, 12.3, 15.25, 18.9, 19.95, 23.0, 26.3]
        ref = {t: hashlib.sha256(self.shot(t)).hexdigest() for t in times}
        for t in times[::-1]:                           # the shared page again, after later frames
            ref[t] = ref[t] if hashlib.sha256(self.shot(t)).hexdigest() == ref[t] else 'order-dependent'
        bad = []
        for t in times:
            page = self.ctx.new_page()
            page.add_init_script('window.SB_OFFLINE = true;')
            page.goto(self.base + 'deck.html')
            page.wait_for_function('window.Storyboard && Storyboard.cues && Storyboard.cues.length > 0', timeout=20000)
            page.evaluate('Storyboard.ready()')
            if hashlib.sha256(self.shot(t, page)).hexdigest() != ref[t]:
                bad.append(t)
            page.close()
        self.assertEqual(bad, [], 'a fresh page renders these frames differently: %r' % bad)

    # (b) transitions render offline: mid frames differ from both ends
    def test_b_mid_transition_frames_render(self):
        for i in range(1, len(SLIDES)):
            name = EXPECTED_NAMES[i]
            d = DUR[name]
            c = self.cue(i)
            pre, mid, post = self.shot(c - 0.02), self.shot(c + d * 0.5), self.shot(c + d + 0.02)
            d_pre, d_post = self.diff(mid, pre), self.diff(mid, post)
            self.assertGreater(d_pre, 0.02, '%s mid-frame looks like the outgoing slide (%.4f)' % (name, d_pre))
            self.assertGreater(d_post, 0.02, '%s mid-frame looks like the settled incoming slide (%.4f)' % (name, d_post))
            info = self.page.evaluate("""(t) => { Storyboard.renderAt(t);
                const vis = [...document.querySelectorAll('.slide')].filter(s => s.style.visibility === 'visible').map(s => +s.dataset.slide);
                return vis; }""", c + d * 0.5)
            self.assertEqual(sorted(info), [i, i + 1], '%s: both slides must be on screen mid-transition' % name)
        # outside every window all transition styles are cleared and exactly one slide shows
        for i in range(len(SLIDES)):
            st = self.page.evaluate("""(t) => { Storyboard.renderAt(t);
                const ss = [...document.querySelectorAll('.slide')];
                return { vis: ss.filter(s => s.style.visibility === 'visible').map(s => +s.dataset.slide),
                         styled: ss.filter(s => (s.style.transform !== 'none') || (s.style.filter !== 'none') || (s.style.clipPath !== 'none')).length,
                         overlay: document.getElementById('transitionOverlay').style.opacity }; }""", self.cue(i) + 1.2)
            self.assertEqual(st['vis'], [i + 1])
            self.assertEqual(st['styled'], 0)
            self.assertEqual(st['overlay'], '0')

    # (c) no blank slides after jumping back
    def test_c_back_jump_shows_content(self):
        expect = {}
        for i in (1, 2, 4, 6):                          # settled frames of slides 2,3,5,7 from a clean order
            t = self.cue(i) + 1.5
            expect[i] = self.shot(t)
        for late in (self.cue(len(SLIDES) - 1) + 0.3, self.cue(9) + 0.4, self.cue(5) + 0.3):
            self.shot(late)
            for i, want in expect.items():
                got = self.shot(self.cue(i) + 1.5)
                st = self.stats(got)
                bg = hex_rgb(SLIDES[i][1])
                self.assertLess(sum(abs(a - b) for a, b in zip(st['dominant'], bg)), 30,
                                'slide %d background not on screen after jumping back (dominant %r)' % (i + 1, st['dominant']))
                self.assertGreater(st['farFrac'], 0.005, 'slide %d shows no content after jumping back' % (i + 1))
                self.assertEqual(got, want, 'slide %d frame differs after jumping back from t=%.2f' % (i + 1, late))
        # word hit + shared morph + exit are transient: they leave nothing behind
        dom = self.page.evaluate("""() => {
            const q = s => document.querySelector(s), out = {};
            Storyboard.renderAt(1.2 + 0.3); out.hitOn = q('#hitA').style.transform;
            Storyboard.renderAt(1.2 + 0.9); out.hitOff = q('#hitA').style.transform;
            Storyboard.renderAt(%f); out.morphOn = q('.card.small').style.transform;
            Storyboard.renderAt(%f); out.morphOff = q('.card.small').style.transform;
            Storyboard.renderAt(%f); out.exitOn = q('[data-exit]').style.transform;
            Storyboard.renderAt(%f); out.exitBefore = q('[data-exit]').style.transform;
            return out; }""" % (self.cue(1) + 0.15, self.cue(1) + 1.5, self.cue(2) + 2.2, self.cue(2) + 1.0))
        self.assertIn('scale', dom['hitOn'])
        self.assertEqual(dom['hitOff'], '')
        self.assertIn('translate', dom['morphOn'])
        self.assertNotIn('translate(0px, 0px)', dom['morphOn'])
        self.assertEqual(dom['morphOff'], '')
        self.assertIn('translateX(-', dom['exitOn'])
        self.assertNotIn('translateX(-', dom['exitBefore'])

    # (d) API per contract
    def test_d_api_contract(self):
        p = self.page
        self.assertEqual(p.evaluate('Storyboard.VERSION'), '0.8.0')
        self.assertTrue(p.evaluate('window.STORYBOARD === window.Storyboard'))
        t0 = time.time()
        self.assertTrue(p.evaluate('(() => { const r = Storyboard.ready(); return r instanceof Promise && r.then(() => true); })()'))
        self.assertLess(time.time() - t0, 10)
        p.wait_for_function("document.getElementById('voAudio').readyState >= 1", timeout=10000)
        self.assertAlmostEqual(p.evaluate('Storyboard.duration()'), WAV_SECONDS, delta=0.1)
        m = p.evaluate('Storyboard.meta()')
        self.assertEqual((m['version'], m['width'], m['height'], m['slides'], m['aspect']), ('0.8.0', W, H, len(SLIDES), '16:9'))
        self.assertTrue(m['audioSrc'].startswith('http://127.0.0.1:') and m['audioSrc'].endswith('/voiceover.wav'), m['audioSrc'])
        ev = p.evaluate('Storyboard.events()')
        self.assertEqual([e['t'] for e in ev], sorted(e['t'] for e in ev))
        for e in ev:
            self.assertTrue({'t', 'type', 'name', 'slide'} <= set(e), e)
            self.assertIn(e['type'], ('slide', 'entrance', 'hit', 'exit', 'fun'))
        slides = [e for e in ev if e['type'] == 'slide']
        self.assertEqual([e['name'] for e in slides], EXPECTED_NAMES)
        self.assertEqual([e['slide'] for e in slides], list(range(1, len(SLIDES) + 1)))
        self.assertEqual(len([e for e in ev if e['type'] == 'hit']), 9)
        self.assertEqual([e['name'] for e in ev if e['type'] == 'exit'], ['slideOutLeft'])
        emph = {e['name'] for e in ev if e['type'] == 'entrance' and e.get('emphasis')}
        self.assertTrue({'spring', 'anticipate', 'scaleIn', 'bounce'} <= emph, emph)
        self.assertNotIn('fadeUp', emph)
        hit = [e for e in ev if e['type'] == 'hit'][0]
        self.assertEqual((hit['sel'], hit['slide'], hit['name']), ('#hitA', 1, 'pulse'))
        self.assertEqual(p.evaluate('Storyboard.words.length'), 2)
        self.assertIsNone(p.evaluate('Storyboard.captions'))
        # renderAt performance (reported)
        ms = p.evaluate('(() => { const a = performance.now(); for (let i = 0; i < 300; i++) Storyboard.renderAt((i * 0.1037) % 31); return (performance.now() - a) / 300; })()')
        sys.stderr.write('\n[engine-core] renderAt: %.3f ms/frame (JS only, %d-slide test deck)\n' % (ms, len(SLIDES)))
        self.assertLess(ms, 50)

    # (e) degenerate timings never throw
    def test_e_empty_and_degenerate_timings(self):
        slides = ('<section class="slide" data-slide="1" style="background:#224"><h1 class="anim" data-anim="fadeIn">A</h1></section>'
                  '<section class="slide" data-slide="2" style="background:#442"><h1>B</h1></section>')
        cases = {
            'empty.html': "Storyboard.init({ timings: [], labels: [], wordHits: [] });",
            'garbage.html': "Storyboard.init({ timings: [{time:'x', slide:1}, null, {slide:2}, {time:1, slide:9}], wordHits: [{time:'?', sel:5}] });",
            'noopts.html': "Storyboard.init();",
        }
        for name, js in cases.items():
            with open(os.path.join(self.tmp, name), 'w', encoding='utf-8') as f:
                f.write(deck_html(slides, js, audio_tag=''))
            page = self.ctx.new_page()
            errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            page.add_init_script('window.SB_OFFLINE = true;')
            page.goto(self.base + name)
            page.wait_for_function('window.Storyboard && Storyboard.cues', timeout=10000)
            r = page.evaluate("""async () => { Storyboard.renderAt(3); Storyboard.seek(2); Storyboard.renderAt(0.5);
                Storyboard.reset(); Storyboard.play(); Storyboard.pause(); await Storyboard.ready();
                const d0 = Storyboard.duration(); window.SB_DURATION = 7; const d1 = Storyboard.duration();
                return { cues: Storyboard.cues.length, ev: Storyboard.events().length, d0, d1,
                         vis: [...document.querySelectorAll('.slide')].filter(s => s.style.visibility === 'visible').length }; }""")
            self.assertEqual(errs, [], name)
            self.assertGreaterEqual(r['cues'], 1, name)
            self.assertEqual(r['vis'], 1, name)
            self.assertEqual(r['d1'], 7, name)
            if name == 'empty.html':
                self.assertEqual(r['d0'], 5)               # last cue (0) + 5
            page.close()

    # (f) SB_OFFLINE: the audio element is never touched
    def test_f_offline_never_touches_audio(self):
        p = self.page
        p.evaluate("""() => { Storyboard.renderAt(12.3); Storyboard.seek(7.1); Storyboard.play(); Storyboard.renderAt(20);
                              Storyboard.pause(); Storyboard.reset(); Storyboard.jumpToSlide(4); }""")
        time.sleep(0.3)
        a = p.evaluate("(() => { const a = document.getElementById('voAudio'); return { t: a.currentTime, paused: a.paused, ev: window.__aev }; })()")
        self.assertEqual(a['t'], 0)
        self.assertTrue(a['paused'])
        self.assertEqual([e for e in a['ev'] if e in ('play', 'playing', 'seeking')], [])
        self.assertTrue(p.evaluate('Storyboard.isOffline()'))
        self.assertFalse(p.evaluate('Storyboard.isPlaying()'))

    # (g) the baseline template.html still initialises under the new engine
    def test_g_baseline_template_inits(self):
        try:
            html = subprocess.run(['git', '-C', SKILL_DIR, 'show', 'v0.7-baseline:template.html'], capture_output=True, check=True).stdout.decode('utf-8')
        except Exception as e:  # pragma: no cover
            self.skipTest('git show v0.7-baseline:template.html unavailable: %s' % e)
        with open(os.path.join(self.tmp, 'baseline.html'), 'w', encoding='utf-8') as f:
            f.write(html)
        for offline in (False, True):
            page = self.ctx.new_page()
            errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            if offline:
                page.add_init_script('window.SB_OFFLINE = true;')
            page.goto(self.base + 'baseline.html')
            page.wait_for_function('window.Storyboard && Storyboard.cues && Storyboard.cues.length === 6', timeout=10000)
            r = page.evaluate("""async () => {
                await Storyboard.ready();
                const out = { names: Storyboard.events().filter(e => e.type === 'slide').map(e => e.name) };
                for (const t of [0, 5, 8.3, 9, 20.4, 37, 50.5, 66, 70]) Storyboard.renderAt(t);
                Storyboard.renderAt(9); out.slide = Storyboard.currentSlide();
                out.vis = [...document.querySelectorAll('.slide')].filter(s => s.style.visibility === 'visible').map(s => +s.dataset.slide);
                const m = Storyboard.meta(); out.meta = [m.width, m.height, m.aspect];
                const box = e => { const b = e.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map(v => Math.round(v)); };
                out.deck = box(document.querySelector('.deck')); out.slideBox = box(document.querySelector('.slide[data-slide="2"]'));
                return out; }""")
            self.assertEqual(errs, [], 'offline=%s' % offline)
            self.assertEqual(r['names'], ['cut', 'crossDissolve', 'barWipe', 'flash', 'crossDissolve', 'whipPan'])
            self.assertEqual(r['slide'], 2)
            self.assertEqual(r['vis'], [2])
            # a 1920x1080 deck (flex item of a 100vw .stage) opened in a 960x540 viewport: meta() reports the
            # authored frame, and scale-to-fit shows the whole slide (the deck box must not shrink and clip it)
            self.assertEqual(r['meta'], [1920, 1080, '16:9'])
            self.assertEqual(r['deck'], [0, 0, W, H])
            self.assertEqual(r['slideBox'], [0, 0, W, H])
            if not offline:                                 # live synthetic clock still plays
                page.wait_for_function('Storyboard.isSynthetic()', timeout=5000)
                page.evaluate('Storyboard.seek(7.5); Storyboard.play()')
                time.sleep(1.0)
                t = page.evaluate('Storyboard.time()')
                self.assertGreater(t, 8.0)
                self.assertEqual(page.evaluate('Storyboard.currentSlide()'), 2)
                page.evaluate('Storyboard.pause()')
                self.assertEqual(errs, [])
            page.close()

    # live mode: late audio hands the clock over; seek never waits for async audio events
    def test_h_live_late_audio_and_seek(self):
        slides = '\n'.join(_slide_html(i, tr, bg) for i, (tr, bg) in enumerate(SLIDES))
        with open(os.path.join(self.tmp, 'late.html'), 'w', encoding='utf-8') as f:
            f.write(deck_html(slides, MAIN_INIT + "\nsetTimeout(() => { const a = document.getElementById('voAudio'); a.src = 'voiceover.wav'; a.load(); }, 1800);",
                              audio_tag='<audio id="voAudio" preload="auto"></audio>'))
        page = self.ctx.new_page()
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.goto(self.base + 'late.html')
        page.wait_for_function('window.Storyboard && Storyboard.isSynthetic()', timeout=5000)
        page.evaluate('Storyboard.play()')
        page.wait_for_function('!Storyboard.isSynthetic()', timeout=10000)      # audio arrived -> audio clock
        self.assertIsNone(page.query_selector('#sb-preview-badge'))
        page.wait_for_function("!document.getElementById('voAudio').paused", timeout=5000)
        t1 = page.evaluate('Storyboard.time()')
        self.assertLess(t1, 3.0)                          # continued from the synthetic clock, not restarted/jumped
        samples = [t1]
        deadline = time.time() + 10
        while samples[-1] < t1 + 0.5 and time.time() < deadline:   # (the audio may still be buffering)
            time.sleep(0.1)
            samples.append(page.evaluate('Storyboard.time()'))
            self.assertFalse(page.evaluate('Storyboard.isSynthetic()'))
        self.assertGreater(samples[-1], t1 + 0.5, 'the audio clock should drive the deck now')
        self.assertEqual(samples, sorted(samples), 'clock went backwards: %r' % samples)
        self.assertAlmostEqual(page.evaluate("document.getElementById('voAudio').currentTime"), page.evaluate('Storyboard.time()'), delta=0.25)
        r = page.evaluate("""() => { Storyboard.pause(); Storyboard.seek(%f);
            return { slide: Storyboard.currentSlide(), time: Storyboard.time(),
                     vis: [...document.querySelectorAll('.slide')].filter(s => s.style.visibility === 'visible').map(s => +s.dataset.slide) }; }""" % (self.cue(4) + 1.3))
        self.assertEqual(r['slide'], 5)
        self.assertEqual(r['vis'], [5])
        self.assertAlmostEqual(r['time'], self.cue(4) + 1.3, delta=0.01)
        # paused + native <audio controls> scrubbing: the deck follows (engine's own seeks excepted)
        time.sleep(1.6)
        page.evaluate("document.getElementById('voAudio').currentTime = 4.0")
        page.wait_for_function('Math.abs(Storyboard.time() - 4.0) < 0.05', timeout=5000)
        self.assertEqual(page.evaluate('Storyboard.currentSlide()'), 2)
        page.evaluate('Storyboard.seek(21.3)')
        time.sleep(0.8)
        self.assertAlmostEqual(page.evaluate('Storyboard.time()'), 21.3, delta=0.01)
        self.assertEqual(errs, [])
        page.close()

    # live seek on a server WITHOUT Range support: the frame is the seek target, whatever the audio does
    def test_m_live_seek_without_range(self):
        page = self.ctx.new_page()
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.goto(self.base + 'norange/deck.html')
        page.wait_for_function("window.Storyboard && document.getElementById('voAudio').readyState >= 1", timeout=10000)
        page.evaluate('Storyboard.seek(21.3)')
        time.sleep(1.0)
        r = page.evaluate("""() => ({ t: Storyboard.time(), slide: Storyboard.currentSlide(), synthetic: Storyboard.isSynthetic(),
            vis: [...document.querySelectorAll('.slide')].filter(s => s.style.visibility === 'visible').map(s => +s.dataset.slide) })""")
        self.assertFalse(r['synthetic'])
        self.assertAlmostEqual(r['t'], 21.3, delta=0.01)
        self.assertEqual((r['slide'], r['vis']), (9, [9]))
        self.assertEqual(errs, [])
        page.close()

    # (i) data-then steps and word hits that write text / SVG / children are pure in t, hold their
    #     end state, and never leave anything behind before their window or on an off-screen slide:
    #     until the step / hit starts the host shows its OWN content (what the preset's setup
    #     builds — children, classes, host setup styles — is only on the host inside the window)
    def test_i_overlay_layers_are_pure(self):
        q = """(t) => { Storyboard.renderAt(t); const q = s => document.querySelector(s);
            const box = e => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; };
            const ann = s => { const e = q(s), sv = e.querySelector('svg.sb-ann'), pa = sv && sv.querySelector('path');
                return sv ? { vis: getComputedStyle(sv).visibility, off: parseFloat(pa.style.strokeDashoffset), len: parseFloat(pa.style.strokeDasharray),
                              pos: e.style.position, svg: box(sv), host: box(e) } : null; };
            const host = s => { const e = q(s); return { text: e.textContent, kids: e.childElementCount, cls: e.getAttribute('class') || '', css: e.style.cssText }; };
            return { circle: ann('#hitCircle'), under: ann('#hitUnder'), chainU: ann('#chainU'), s2: ann('#annS2'),
                     hi: q('#hitHi').style.backgroundImage, count: q('#hitCount').textContent, tw: q('#chainTw').textContent,
                     css: ['#hitCircle', '#hitUnder', '#hitHi', '#hitCount'].map(s => q(s).style.cssText),
                     spark: host('#hitSpark'), sparkOn: q('#hitSpark').querySelectorAll('.sk-s').length,
                     bub: host('#hitBub'), check: host('#chainCheck'), checkOn: !!q('#chainCheck .ck-p') }; }"""
        st = lambda t: self.page.evaluate(q, t)  # noqa: E731
        fresh = self.ctx.new_page()                                    # untouched state, straight after init
        fresh.add_init_script('window.SB_OFFLINE = true;')
        fresh.goto(self.base + 'deck.html')
        fresh.wait_for_function('window.Storyboard && Storyboard.cues && Storyboard.cues.length > 0', timeout=20000)
        init_hosts = fresh.evaluate("""() => ['#hitSpark', '#hitBub', '#chainCheck', '#hitCount', '#chainTw', '#hitCircle'].map(s => {
            const e = document.querySelector(s); return [e.innerHTML, e.getAttribute('class') || '']; })""")
        fresh.close()
        self.assertEqual([h[0] for h in init_hosts], ['sparkly', 'bubble', 'check me', '42', 'Chained typing words', 'circled'],
                         'an overlay preset rewrote its host at init, before its step / hit')
        # word hits (slide 8): before / in / after the window
        px_before, s_before = self.shot(18.05), st(18.05)
        self.assertEqual((s_before['circle'], s_before['under'], s_before['hi'], s_before['count']), (None, None, '', '42'))
        self.assertEqual(s_before['css'], ['', '', '', ''])            # BASE only: no setup styles before the hit
        self.assertEqual(s_before['spark'], {'text': 'sparkly', 'kids': 0, 'cls': '', 'css': ''})
        self.assertEqual(s_before['bub'], {'text': 'bubble', 'kids': 0, 'cls': '', 'css': ''})
        s_spark = st(18.2)                                              # sparkle hit (18.1) built, bubble (18.3) not yet
        self.assertEqual(s_spark['sparkOn'], 14)
        self.assertEqual(s_spark['bub']['text'], 'bubble')
        s_mid = st(18.7)
        self.assertEqual(s_mid['circle']['vis'], 'visible')
        self.assertTrue(0 < s_mid['circle']['off'] < s_mid['circle']['len'], s_mid['circle'])
        self.assertIn('sb-speech', s_mid['bub']['cls'])                 # speechBubble: class + typed text inside its window
        self.assertTrue(0 < len(s_mid['bub']['text']) <= len('bubble'), s_mid['bub'])
        s_after = st(19.95)
        for k in ('circle', 'under'):
            a = s_after[k]
            self.assertEqual((a['vis'], a['off'], a['pos']), ('visible', 0, 'relative'), (k, a))
        self.assertIn('100%', s_after['hi'])                          # highlight holds (v0.7 look)
        self.assertEqual(s_after['count'], '7')                       # counter hit counts to data-to and holds
        self.assertEqual((s_after['sparkOn'], s_after['bub']['text']), (14, 'bubble'))   # both held
        self.assertEqual(self.shot(18.05), px_before, 'word-hit state leaked into an earlier frame')
        self.assertEqual(st(18.05), s_before)
        # data-then steps (slide 5): typewriter@ / underlineDraw@ / checkDraw@
        px_chain, c_before = self.shot(10.9), st(10.9)
        self.assertEqual((c_before['tw'], c_before['chainU']), ('Chained typing words', None))
        self.assertEqual((c_before['check']['text'], c_before['check']['kids'], c_before['checkOn']), ('check me', 0, False))
        c_mid = st(11.9)
        self.assertTrue(0 < len(c_mid['tw']) < len('Chained typing words'), c_mid['tw'])
        self.assertEqual((c_mid['chainU']['vis'], c_mid['chainU']['off']), ('visible', 0))
        self.assertTrue(c_mid['checkOn'])
        self.assertEqual(st(13.0)['tw'], 'Chained typing words')
        self.assertEqual(self.shot(10.9), px_chain, 'data-then state leaked into an earlier frame')
        self.assertEqual(st(10.9), c_before)
        # forward 30 fps through the hits (the MP4 path): the annotation stays on its word
        self.page.evaluate('() => { for (let i = 0; i <= 60; i++) Storyboard.renderAt(18 + i / 30); }')
        a = st(20.0)['circle']
        self.assertEqual(a['pos'], 'relative')
        for got, host in zip(a['svg'], a['host']):
            self.assertTrue(host * 1.0 <= got <= host * 1.5, 'annotation svg %r vs its word %r' % (a['svg'], a['host']))
        # a held annotation on a slide that is off screen stays hidden with it
        self.assertEqual(st(4.2)['s2']['vis'], 'visible')
        self.assertEqual(st(23.0)['s2']['vis'], 'hidden')
        self.assertEqual(self.errors, [])

    # (k) a web font that arrives after init: annotations measure the real text box
    def test_k_late_webfont_annotation(self):
        cands = ['C:/Windows/Fonts/cour.ttf', 'C:/Windows/Fonts/georgia.ttf', 'C:/Windows/Fonts/times.ttf',
                 '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf',
                 '/System/Library/Fonts/Supplemental/Courier New.ttf', '/Library/Fonts/Courier New.ttf']
        font = next((c for c in cands if os.path.isfile(c)), None)
        if not font:
            self.skipTest('no local .ttf font to serve')
        d = os.path.join(self.tmp, 'font')
        os.makedirs(d, exist_ok=True)
        shutil.copyfile(ENGINE, os.path.join(d, 'storyboard-engine.js'))
        shutil.copyfile(font, os.path.join(d, 'slowfont.ttf'))
        head = "<style>@font-face{font-family:'SlowF';src:url('slowfont.ttf');font-display:swap} h2{font-family:'SlowF',Arial,sans-serif;font-size:48px}</style>"
        slides = ('<section class="slide" data-slide="1" style="background:#223">'
                  '<h2 id="u" class="anim" data-anim="underlineDraw" data-t-rel="0.5">Underline this line</h2>'
                  '<h2><span id="c" class="anim" data-anim="circleScribble" data-t-rel="0.5">circled</span> word</h2></section>')
        with open(os.path.join(d, 'deck.html'), 'w', encoding='utf-8') as f:
            f.write(deck_html(slides, "Storyboard.init({ timings: [{time:0, slide:1}] }); window.__w0 = document.getElementById('u').offsetWidth;",
                              audio_tag='', extra_head=head))
        _RangeHandler.DELAYS['slowfont'] = 1.5
        page = self.ctx.new_page()
        try:
            page.add_init_script('window.SB_OFFLINE = true;')
            page.goto(self.base + 'font/deck.html')
            page.wait_for_function('window.Storyboard && Storyboard.cues && Storyboard.cues.length > 0', timeout=20000)
            page.evaluate('Storyboard.ready()')
            r = page.evaluate("""() => { Storyboard.renderAt(2);
                const m = s => { const e = document.querySelector(s); return [e.offsetWidth, e.offsetHeight, e.querySelector('svg.sb-ann').getAttribute('viewBox')]; };
                return { status: [...document.fonts].map(f => f.status), w0: window.__w0, u: m('#u'), c: m('#c') }; }""")
        finally:
            _RangeHandler.DELAYS.pop('slowfont', None)
            page.close()
        self.assertIn('loaded', r['status'])
        if r['w0'] == r['u'][0]:
            self.skipTest('the served font has the fallback font metrics')
        for w, h, vb in (r['u'], r['c']):
            self.assertEqual(vb, '0 0 %d %d' % (w, h))

    # (l) captions option vs <body data-captions>, events() visibility, meta().aspect, goToSlide()
    def test_l_captions_events_meta_goto(self):
        def run(name, body_attrs, init, js, size=(W, H), slides=None):
            slides = slides or '<section class="slide" data-slide="1"><h1 class="anim" data-anim="fadeIn">x</h1></section>'
            html = ('<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0}.deck{width:%dpx;height:%dpx;position:relative}'
                    '.slide{width:100%%;height:100%%}</style></head><body %s><div class="deck">%s</div><script src="storyboard-engine.js"></script>'
                    '<script>%s</script></body></html>') % (size[0], size[1], body_attrs, slides, init)
            with open(os.path.join(self.tmp, name), 'w', encoding='utf-8') as f:
                f.write(html)
            page = self.ctx.new_page()
            errs, warns = [], []
            page.on('pageerror', lambda e: errs.append(str(e)))
            page.on('console', lambda m: warns.append(m.text) if m.type == 'warning' else None)
            page.add_init_script('window.SB_OFFLINE = true;')
            page.goto(self.base + name)
            page.wait_for_function('window.Storyboard && Storyboard.cues && Storyboard.cues.length > 0', timeout=10000)
            out = page.evaluate(js)
            page.close()
            self.assertEqual(errs, [], name)
            return out, warns
        caps = [('data-captions="pop"', 'captions: false', None),
                ('data-captions="line"', 'captions: true', {'mode': 'line', 'position': 'bottom'}),
                ('data-captions="pop"', "captions: {position: 'lower-third'}", {'mode': 'pop', 'position': 'lower-third'}),
                ('data-captions="karaoke" data-captions-position="lower-third"', '', {'mode': 'karaoke', 'position': 'lower-third'}),
                ('data-captions="pop"', "captions: 'off'", None),
                ('', "captions: {mode: 'line'}", {'mode': 'line', 'position': 'bottom'}),
                ('', '', None)]
        for i, (body, opt, want) in enumerate(caps):
            got, _ = run('caps%d.html' % i, body, 'Storyboard.init({ timings: [{time:0, slide:1}], %s });' % opt, 'Storyboard.captions')
            self.assertEqual(got, want, (body, opt))
        # events(): only what is on screen by default; {all:true} flags the rest
        ev_slides = ('<section class="slide" data-slide="1"><h1 class="anim" data-anim="spring" data-t-rel="0.2">A</h1>'
                     '<h2 class="anim" data-anim="bounce" data-t-rel="5">late</h2></section>'
                     '<section class="slide" data-slide="2" data-transition-in="pushLeft"><h1 class="anim" data-anim="fadeIn" data-t-rel="0.1">B</h1></section>'
                     '<section class="slide" data-slide="3"><h1 id="c3" class="anim" data-anim="spring" data-t-rel="1">C</h1></section>')
        ev, _ = run('events.html', '', "Storyboard.init({ timings: [{time:0, slide:1}, {time:2, slide:2}], wordHits: [{time:0.5, sel:'#c3', hit:'shake'}, {time:2.3, sel:'#nope', hit:'pulse'}] });",
                    "({ d: Storyboard.events().map(e => [e.t, e.type, e.name]), a: Storyboard.events({all: true}).map(e => [e.t, e.type, e.visible]) })",
                    slides=ev_slides)
        self.assertEqual(ev['d'], [[0, 'slide', 'cut'], [0.2, 'entrance', 'spring'], [2, 'slide', 'pushLeft'], [2.1, 'entrance', 'fadeIn']])
        self.assertEqual(ev['a'], [[0, 'slide', True], [0.2, 'entrance', True], [0.5, 'hit', False], [1, 'entrance', False],
                                   [2, 'slide', True], [2.1, 'entrance', True], [2.3, 'hit', False], [5, 'entrance', False]])
        # meta().aspect snaps to the common ratio it is within 1% of
        for size, want in (((1366, 768), '16:9'), ((1080, 1350), '4:5'), ((1000, 700), '10:7')):
            got, _ = run('aspect.html', '', 'Storyboard.init({ timings: [{time:0, slide:1}] });', 'Storyboard.meta().aspect', size=size)
            self.assertEqual(got, want, size)
        # adopt-style root whose children are the slides: the root collapses once they are stacked,
        # meta() still reports the slides' frame
        got, _ = run('adoptmeta.html', '', "Storyboard.init({ root: '#myroot', slideSelector: '.pg', scaleDeck: false, timings: [{time:0, slide:1}, {time:2, slide:2}] });",
                     "(() => { const m = Storyboard.meta(); return [m.width, m.height, m.aspect, m.slides, document.getElementById('myroot').offsetHeight]; })()",
                     slides='<div id="myroot"><div class="pg" style="width:800px;height:450px">A</div><div class="pg" style="width:800px;height:450px">B</div></div>')
        self.assertEqual(got, [800, 450, '16:9', 2, 0])
        # goToSlide(n, type, instant): v0.7 signature still works — seeks the clock; type is ignored (warned once)
        got, warns = run('goto.html', '', 'Storyboard.init({ timings: [{time:0, slide:1}, {time:2, slide:2}] });',
                         "(() => { Storyboard.goToSlide(2, 'cut', true); const a = [Storyboard.time(), Storyboard.currentSlide()];"
                         " Storyboard.goToSlide(1); return a.concat([Storyboard.time(), Storyboard.currentSlide()]); })()",
                         slides=ev_slides)
        self.assertAlmostEqual(got[0], 2 + 0.75 + 0.01, places=6)
        self.assertEqual((got[1], got[3]), (2, 1))
        self.assertEqual(len([w for w in warns if 'goToSlide' in w]), 1)


if __name__ == '__main__':
    unittest.main()

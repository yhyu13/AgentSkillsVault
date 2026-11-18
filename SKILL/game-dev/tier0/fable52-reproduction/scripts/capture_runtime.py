#!/usr/bin/env python3
"""Capture a local demo's startup evidence with a real browser.

Records served bytes, requests, failures, console, WebGL strings, a screenshot
and optional evaluated state. Requires Python Playwright and a Chromium build.
It does not prove playability, audio, sustained performance or visual quality.
"""
from __future__ import annotations

import argparse
import datetime as dt
import functools
import hashlib
import http.server
import json
import socket
import sys
import tempfile
import threading
from pathlib import Path


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve(directory):
    handler = functools.partial(Quiet, directory=str(directory))
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def capture(demo, out, screenshot, wait_ms, width, height, eval_js):
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise SystemExit('Playwright is required: pip install playwright && playwright install chromium')
    demo = Path(demo).resolve()
    if not demo.is_file():
        raise SystemExit(f'demo not found: {demo}')
    if Path(out).exists():
        raise SystemExit(f'refusing to overwrite {out}')
    if Path(screenshot).exists():
        raise SystemExit(f'refusing to overwrite {screenshot}')
    local_sha = sha256(demo)
    httpd = serve(demo.parent)
    port = httpd.server_address[1]
    url = f'http://127.0.0.1:{port}/{demo.name}'
    console, errors, failed, requests = [], [], [], []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            page = browser.new_page(viewport={'width': width, 'height': height})
            page.on('console', lambda m: console.append({'type': m.type, 'text': m.text}))
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('requestfailed', lambda r: failed.append({'url': r.url, 'error': r.failure}))
            response = page.goto(url, wait_until='load', timeout=60000)
            page.wait_for_timeout(wait_ms)
            webgl = page.evaluate("""() => {
              const c = document.querySelector('canvas');
              const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
              if (!gl) return null;
              const ext = gl.getExtension('WEBGL_debug_renderer_info');
              return {
                version: gl.getParameter(gl.VERSION),
                shading: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
                vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
                renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
                drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight]
              };
            }""")
            state = page.evaluate(eval_js) if eval_js else None
            timing = page.evaluate("""() => performance.getEntriesByType('resource').map(e => ({
              url: e.name, type: e.initiatorType, transfer: e.transferSize,
              duration: Math.round(e.duration), status: e.responseStatus || null
            }))""")
            Path(screenshot).parent.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(screenshot))
            report = {
                'generated_at': dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00', 'Z'),
                'demo': str(demo),
                'demo_sha256': local_sha,
                'url': url,
                'http_status': response.status if response else None,
                'title': page.title(),
                'ready_state': page.evaluate('document.readyState'),
                'viewport': {'width': width, 'height': height},
                'console': console,
                'page_errors': errors,
                'failed_requests': failed,
                'resources': timing,
                'webgl': webgl,
                'evaluated_state': state,
                'screenshot': {'path': str(Path(screenshot).resolve()),
                               'sha256': sha256(screenshot),
                               'bytes': Path(screenshot).stat().st_size},
                'limits': 'One headless load on this machine; no input, audio, gameplay or sustained performance test.',
            }
            browser.close()
    finally:
        httpd.shutdown()
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    Path(out).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"captured {url} -> {out} (resources={len(requests) or len(report['resources'])}, console={len(console)}, errors={len(errors)})")
    return 0


def self_test():
    with tempfile.TemporaryDirectory(prefix='fable52-capture-') as tmp:
        root = Path(tmp)
        (root / 'data.json').write_text('{"ok": true}', encoding='utf-8')
        (root / 'index.html').write_text("""<!doctype html><meta charset=utf-8><title>fixture</title>
<canvas width=320 height=200></canvas>
<script>
fetch('data.json').then(r => r.json()).then(d => { window.__state = { fetched: d.ok, ready: true }; });
const gl = document.querySelector('canvas').getContext('webgl2');
window.__gl = gl ? gl.getParameter(gl.VERSION) : 'none';
</script>""", encoding='utf-8')
        out = root / 'capture.json'
        shot = root / 'shot.png'
        capture(root / 'index.html', out, shot, 400, 800, 600, 'window.__state || null')
        report = json.loads(out.read_text(encoding='utf-8'))
        assert report['demo_sha256'] == sha256(root / 'index.html'), report['demo_sha256']
        assert report['webgl'] and report['webgl']['version'], report['webgl']
        assert report['evaluated_state']['fetched'] is True, report['evaluated_state']
        assert report['screenshot']['bytes'] > 0
        assert any('data.json' in r['url'] for r in report['resources']), report['resources']
        try:
            capture(root / 'index.html', out, shot, 0, 800, 600, None)
        except SystemExit as exc:
            assert 'refusing to overwrite' in str(exc), exc
        else:
            raise AssertionError('overwrite was not refused')
        print('PASS: capture wrote a browser record, WebGL string, evaluated state, request list and screenshot; overwrite refused')
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--demo', help='path to the pinned HTML file')
    parser.add_argument('--out', help='runtime JSON output path')
    parser.add_argument('--screenshot', help='screenshot PNG output path')
    parser.add_argument('--wait-ms', type=int, default=1500)
    parser.add_argument('--width', type=int, default=1440)
    parser.add_argument('--height', type=int, default=900)
    parser.add_argument('--eval', dest='eval_js', default='',
                        help='optional JS expression returning a JSON-serializable state')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if not args.demo or not args.out or not args.screenshot:
        parser.error('--demo, --out and --screenshot are required')
    return capture(args.demo, args.out, args.screenshot, args.wait_ms,
                   args.width, args.height, args.eval_js or None)


if __name__ == '__main__':
    sys.exit(main())

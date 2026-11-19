#!/usr/bin/env python3
"""Capture a web page observation: screenshot, console, WebGL and timings.

This produces raw observation data for a quality record. It does not judge the
result, and one headless load is not a real-device or performance test.
Requires Python Playwright and a Chromium build.
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
import threading
from pathlib import Path


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve(directory):
    handler = functools.partial(Quiet, directory=str(directory))
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def observe(target, out, screenshot, width, height, wait_ms, eval_js):
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise SystemExit('Playwright is required: pip install playwright && playwright install chromium')
    httpd = None
    url = target
    if not target.startswith(('http://', 'https://')):
        path = Path(target).resolve()
        if not path.is_file():
            raise SystemExit(f'file not found: {path}')
        httpd = serve(path.parent)
        url = f'http://127.0.0.1:{httpd.server_address[1]}/{path.name}'
    if Path(out).exists() or Path(screenshot).exists():
        raise SystemExit('refusing to overwrite an existing report or screenshot')
    console, errors, failed = [], [], []
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
              return {version: gl.getParameter(gl.VERSION),
                      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)};
            }""")
            state = page.evaluate(eval_js) if eval_js else None
            timing = page.evaluate("""() => ({
              navigation: performance.getEntriesByType('navigation').map(e => ({
                domContentLoaded: Math.round(e.domContentLoadedEventEnd),
                load: Math.round(e.loadEventEnd), transfer: e.transferSize})),
              resources: performance.getEntriesByType('resource').length
            })""")
            Path(screenshot).parent.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(screenshot))
            report = {
                'generated_at': dt.datetime.now(dt.timezone.utc).isoformat().replace('+00:00', 'Z'),
                'url': url,
                'http_status': response.status if response else None,
                'title': page.title(),
                'viewport': {'width': width, 'height': height},
                'console': console,
                'page_errors': errors,
                'failed_requests': failed,
                'webgl': webgl,
                'timing': timing,
                'evaluated_state': state,
                'screenshot': {'path': str(Path(screenshot).resolve()),
                               'sha256': sha256(screenshot),
                               'bytes': Path(screenshot).stat().st_size},
                'limits': 'One headless load; not a real-device, input, audio or sustained-performance test.',
            }
            browser.close()
    finally:
        if httpd:
            httpd.shutdown()
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    Path(out).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"observed {url} -> {out}")
    return 0


def self_test():
    import tempfile
    with tempfile.TemporaryDirectory(prefix='quality-observe-') as tmp:
        root = Path(tmp)
        (root / 'index.html').write_text("""<!doctype html><meta charset=utf-8><title>obs</title>
<canvas width=200 height=120></canvas><button>Go</button>
<script>document.querySelector('button').onclick = () => { window.__clicked = true; };</script>""",
                                        encoding='utf-8')
        out, shot = root / 'obs.json', root / 'obs.png'
        observe(str(root / 'index.html'), out, shot, 800, 600, 200, 'window.__clicked || false')
        report = json.loads(out.read_text(encoding='utf-8'))
        assert report['title'] == 'obs' and report['webgl'], report
        assert report['screenshot']['bytes'] > 0
        try:
            observe(str(root / 'index.html'), out, shot, 800, 600, 0, None)
        except SystemExit as exc:
            assert 'refusing to overwrite' in str(exc), exc
        else:
            raise AssertionError('overwrite was not refused')
        print('PASS: observation wrote screenshot, WebGL and timings; overwrite refused')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--target', help='http(s) URL or local HTML file')
    parser.add_argument('--out', help='JSON output path')
    parser.add_argument('--screenshot', help='PNG output path')
    parser.add_argument('--width', type=int, default=1440)
    parser.add_argument('--height', type=int, default=900)
    parser.add_argument('--wait-ms', type=int, default=1200)
    parser.add_argument('--eval', dest='eval_js', default='', help='optional JS expression returning JSON state')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if not args.target or not args.out or not args.screenshot:
        parser.error('--target, --out and --screenshot are required')
    return observe(args.target, args.out, args.screenshot, args.width, args.height,
                   args.wait_ms, args.eval_js or None)


if __name__ == '__main__':
    sys.exit(main())

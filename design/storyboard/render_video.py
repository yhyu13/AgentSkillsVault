#!/usr/bin/env python
"""
render_video.py
Headless-render a storyboard.html into a finished MP4.

Pipeline:
  1. Playwright launches Chromium at 1920x1080 (headless, muted, autoplay allowed)
  2. Loads the storyboard.html, waits for STORYBOARD engine + audio metadata
  3. Resets the deck, presses play, records the viewport for `audio.duration` seconds
  4. ffmpeg trims the lead-in time from the WebM, muxes with the source MP3
     into a final H.264 MP4 with AAC audio (broadcast quality)

Output: MP4 at the path you choose (default: alongside the HTML).

Requires:
  pip install playwright imageio-ffmpeg
  python -m playwright install chromium

Usage:
  python render_video.py storyboard.html
  python render_video.py storyboard.html --out final.mp4
  python render_video.py storyboard.html --audio "VO English.mp3" --quality high
  python render_video.py storyboard.html --quality fast    # crf 23, faster encode
  python render_video.py storyboard.html --no-audio --frames   # OFFLINE GPU frame render (best for 3D/WebGL)

Two render paths:
  * default        real-time: Playwright records the page as it plays, then ffmpeg muxes audio.
  * --frames       offline: steps the engine clock frame-by-frame (Storyboard.renderAt), screenshots
                   each frame, assembles a PNG sequence. Runs on the real GPU (ANGLE), supersamples
                   the WebGL buffer, and is perfectly smooth (no dropped frames). Use for scene3d decks.
"""
import argparse
import asyncio
import http.server
import shutil
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path


# ---------------------------------------------------------------------------
# Embedded HTTP server — serves the HTML directory over localhost so
# headless Chromium can load audio (file:// blocks audio in headless mode)
# ---------------------------------------------------------------------------
class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass   # suppress per-request log noise

def _start_server(directory: Path):
    """Start a temporary HTTP server in a daemon thread. Returns (port, server)."""
    with socket.socket() as s:
        s.bind(('', 0))
        port = s.getsockname()[1]
    handler = lambda *a, **kw: _QuietHandler(*a, directory=str(directory), **kw)
    srv = http.server.HTTPServer(('127.0.0.1', port), handler)
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    return port, srv

try:
    from playwright.async_api import async_playwright
except ImportError:
    sys.exit(
        "playwright not installed.\n"
        "  pip install playwright\n"
        "  python -m playwright install chromium"
    )

try:
    import imageio_ffmpeg
    FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    FFMPEG = shutil.which('ffmpeg')
    if not FFMPEG:
        sys.exit(
            "ffmpeg not found.\n"
            "  Easiest:  pip install imageio-ffmpeg   (auto-downloads ffmpeg)\n"
            "  Or install ffmpeg system-wide and ensure it is on PATH."
        )


def _gpu_flags():
    """Force headless Chromium onto the real GPU via ANGLE instead of falling back to
    SwiftShader (software). On a discrete GPU this is the difference between a soft, choppy
    software render and a sharp, smooth one — essential for WebGL (data-anim="scene3d") decks.
    Degrades gracefully to the platform's software path when no GPU is present."""
    base = ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-zero-copy', '--disable-gpu-vsync']
    if sys.platform.startswith('win'):
        base.insert(0, '--use-angle=d3d11')
    elif sys.platform == 'darwin':
        base.insert(0, '--use-angle=metal')
    else:
        base.insert(0, '--use-angle=gl')
    return base


async def render(html_path: Path, audio_path, out_mp4: Path, quality: str = 'high', no_audio: bool = False, duration_override=None, cpu: bool = False) -> None:
    # Per-output temp dir so concurrent renders into the same folder don't collide
    # (a fixed '.render-tmp' lets two renders clobber each other's WebM frames).
    tmp_dir = out_mp4.parent / ('.render-tmp-' + out_mp4.stem)
    if tmp_dir.exists():
        shutil.rmtree(tmp_dir, ignore_errors=True)
    tmp_dir.mkdir(parents=True, exist_ok=True)

    # Serve the storyboard dir over HTTP so headless Chromium can load audio
    srv_port, srv = _start_server(html_path.parent)
    page_url = f"http://127.0.0.1:{srv_port}/{html_path.name}"
    print(f"[ok] Local HTTP server on port {srv_port}")

    print(f"[ in] HTML  : {html_path}")
    print(f"[ in] Audio : {audio_path if not no_audio else '(none - silent render)'}")
    print(f"[out] MP4   : {out_mp4}")
    print()

    # First pass: open the page at a default 1920x1080, read the deck's
    # actual size (.deck width/height) so we can re-record at the right
    # aspect. This lets the same renderer handle 1920x1080 horizontal
    # and 1080x1920 vertical templates transparently.
    async with async_playwright() as p:
        probe_browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
        probe_ctx = await probe_browser.new_context(viewport={'width': 1920, 'height': 1080})
        probe_page = await probe_ctx.new_page()
        await probe_page.goto(page_url)
        try:
            await probe_page.wait_for_selector('.deck', timeout=5000)
            deck_dims = await probe_page.evaluate(
                "(() => { const d = document.querySelector('.deck');"
                " return d ? [d.offsetWidth, d.offsetHeight] : [1920, 1080]; })()"
            )
        except Exception:
            deck_dims = [1920, 1080]
        await probe_ctx.close()
        await probe_browser.close()

    deck_w, deck_h = int(deck_dims[0]), int(deck_dims[1])
    print(f"[ok] Detected deck size: {deck_w}x{deck_h}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--autoplay-policy=no-user-gesture-required',
                '--no-sandbox',
                '--mute-audio',                 # silent playback; we mux real audio later
                '--disable-blink-features=AutomationControlled',
                '--enable-features=NetworkService',
                '--allow-file-access-from-files',  # allows file:// pages to load local audio
                # CPU mode: software compositing — Playwright's screencast reliably captures
                # CSS/SVG composited layers (GPU compositing can yield blank frames on some
                # Windows/ANGLE setups). GPU mode keeps the real GPU for WebGL/3D decks.
                *(['--disable-gpu', '--disable-gpu-compositing'] if cpu else _gpu_flags()),
            ]
        )
        context = await browser.new_context(
            viewport={'width': deck_w, 'height': deck_h},
            device_scale_factor=1,
            record_video_dir=str(tmp_dir),
            record_video_size={'width': deck_w, 'height': deck_h},
        )
        page = await context.new_page()

        recording_start = time.perf_counter()
        await page.goto(page_url)

        # Hide UI chrome (controls / preview badge / jump menu) for a clean reel
        await page.add_style_tag(content=".play-controls,#sb-preview-badge,.jump-menu,.play-progress{display:none!important}")

        TAIL_SEC = 0.6
        if no_audio:
            # Silent render: drive the engine's synthetic clock (no VO needed)
            print("[..] No audio — driving via synthetic clock...")
            try:
                await page.wait_for_function("window.Storyboard", timeout=20000)
            except Exception:
                sys.exit("Engine failed to initialize within 20s.")
            await asyncio.sleep(1.6)  # let the synthetic clock activate (missing-audio timeout)
            if duration_override:
                duration = float(duration_override)
            else:
                last = await page.evaluate(
                    "(()=>{const c=window.Storyboard&&window.Storyboard.cues;"
                    "return c&&c.length?c[c.length-1].time:0;})()")
                duration = float(last) + 8.0
            print(f"[ok] Timeline duration: {duration:.2f}s")
            await page.evaluate("Storyboard.reset()")
            await asyncio.sleep(0.4)
            play_start = time.perf_counter()
            lead_in = play_start - recording_start
            print(f"[ok] Lead-in before play(): {lead_in:.3f}s")
            await page.evaluate("Storyboard.play()")
            print(f"[..] Recording for {duration + TAIL_SEC:.2f}s...")
            await asyncio.sleep(duration + TAIL_SEC)
        else:
            # Wait for engine + audio metadata
            print("[..] Loading deck + waiting for audio metadata...")
            try:
                await page.wait_for_function(
                    "window.Storyboard && document.getElementById('voAudio') && document.getElementById('voAudio').readyState >= 2",
                    timeout=20000,
                )
            except Exception:
                sys.exit("Engine or audio failed to initialize within 20s. "
                         "Check the HTML opens correctly in a normal browser.")

            duration = await page.evaluate("document.getElementById('voAudio').duration")
            if not duration or duration <= 0:
                sys.exit("Could not read audio duration. Is the MP3 referenced by the HTML present?")
            print(f"[ok] Audio duration: {duration:.2f}s")

            await page.evaluate("Storyboard.reset()")
            await asyncio.sleep(0.4)
            play_start = time.perf_counter()
            lead_in = play_start - recording_start
            print(f"[ok] Lead-in before play(): {lead_in:.3f}s")
            # Drive playback through the engine (NOT voAudio.play() directly): the rAF
            # animation loop that reveals elements only starts inside Storyboard.play().
            # A raw voAudio.play() advances audio but leaves every .anim element hidden.
            await page.evaluate("window.Storyboard.play()")
            print(f"[..] Recording for {duration + TAIL_SEC:.2f}s...")
            await asyncio.sleep(duration + TAIL_SEC)

        await context.close()
        await browser.close()

    # Find the recorded WebM
    webms = list(tmp_dir.glob('*.webm'))
    if not webms:
        sys.exit("Playwright produced no video. Recording may have been disabled.")
    webm = max(webms, key=lambda p: p.stat().st_size)
    print(f"[ok] Raw recording: {webm.name} ({webm.stat().st_size / 1_048_576:.1f} MB)")

    # ffmpeg: trim lead-in from video, mux with audio MP3, encode to H.264 MP4
    print(f"[..] Encoding MP4 (quality={quality})...")
    crf = '18' if quality == 'high' else '23'
    preset = 'medium' if quality == 'high' else 'veryfast'
    if no_audio:
        cmd = [
            FFMPEG, '-y', '-ss', f'{lead_in:.3f}', '-i', str(webm),
            '-map', '0:v:0', '-c:v', 'libx264', '-preset', preset, '-crf', crf,
            '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', str(out_mp4),
        ]
    else:
        cmd = [
            FFMPEG, '-y', '-ss', f'{lead_in:.3f}', '-i', str(webm), '-i', str(audio_path),
            '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', preset, '-crf', crf,
            '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest',
            '-movflags', '+faststart', str(out_mp4),
        ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        print("\n[ERROR] ffmpeg failed:\n")
        print(proc.stderr[-2000:])
        sys.exit(1)

    for _attempt in range(5):
        shutil.rmtree(tmp_dir, ignore_errors=True)
        if not tmp_dir.exists():
            break
        time.sleep(0.6)  # Windows: wait for Chromium to release the .webm lock
    srv.shutdown()

    size_mb = out_mp4.stat().st_size / 1_048_576
    print(f"\n[OK] Wrote {out_mp4.name} ({size_mb:.1f} MB)")


async def render_frames(html_path: Path, audio_path, out_mp4: Path, fps: int = 30,
                        quality: str = 'high', no_audio: bool = False,
                        duration_override=None, supersample: float = 1.5) -> None:
    """Deterministic OFFLINE render: step the engine clock frame-by-frame, screenshot each
    frame, then assemble a PNG sequence into the MP4. Decouples quality from real-time
    performance — every frame renders on the GPU with no fps pressure, so scenes can be heavy
    and motion is perfectly smooth (exact t per frame). The WebGL buffer is supersampled
    (window.SB_SS) for crisp antialiasing. Best path for data-anim="scene3d" decks."""
    tmp_dir = out_mp4.parent / ('.frames-tmp-' + out_mp4.stem)
    if tmp_dir.exists():
        shutil.rmtree(tmp_dir)
    frames_dir = tmp_dir / 'frames'
    frames_dir.mkdir(parents=True)

    srv_port, srv = _start_server(html_path.parent)
    page_url = f"http://127.0.0.1:{srv_port}/{html_path.name}"
    print(f"[ok] Local HTTP server on port {srv_port}")
    print(f"[ in] HTML  : {html_path}")
    print(f"[out] MP4   : {out_mp4}")
    print(f"[ok] Offline frame render @ {fps}fps, supersample {supersample}x")
    print()

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--autoplay-policy=no-user-gesture-required', '--no-sandbox', '--mute-audio', *_gpu_flags()],
        )
        context = await browser.new_context(viewport={'width': 1920, 'height': 1080}, device_scale_factor=1)
        page = await context.new_page()
        # Mark offline + set supersample BEFORE any deck/engine script runs.
        await page.add_init_script(f"window.SB_OFFLINE=1; window.SB_SS={supersample};")
        await page.goto(page_url)

        # Read real deck size, resize viewport to match (handles vertical templates).
        try:
            await page.wait_for_selector('.deck', timeout=8000)
            dd = await page.evaluate("(()=>{const d=document.querySelector('.deck');return d?[d.offsetWidth,d.offsetHeight]:[1920,1080];})()")
        except Exception:
            dd = [1920, 1080]
        deck_w, deck_h = int(dd[0]), int(dd[1])
        if (deck_w, deck_h) != (1920, 1080):
            await page.set_viewport_size({'width': deck_w, 'height': deck_h})
        print(f"[ok] Deck size: {deck_w}x{deck_h}")

        await page.add_style_tag(content=".play-controls,#sb-preview-badge,.jump-menu,.play-progress{display:none!important}")
        try:
            await page.wait_for_function("window.Storyboard && window.THREE", timeout=20000)
        except Exception:
            try:
                await page.wait_for_function("window.Storyboard", timeout=8000)
            except Exception:
                sys.exit("Engine failed to initialize within 20s.")
        await asyncio.sleep(1.6)  # let the synthetic clock + lazy inits settle

        if duration_override:
            duration = float(duration_override)
        elif no_audio:
            last = await page.evaluate("(()=>{const c=window.Storyboard&&window.Storyboard.cues;return c&&c.length?c[c.length-1].time:0;})()")
            duration = float(last) + 8.0
        else:
            d = await page.evaluate("(()=>{const a=document.getElementById('voAudio');return a&&isFinite(a.duration)?a.duration:0;})()")
            if d and d > 0:
                duration = float(d)
            else:
                last = await page.evaluate("(()=>{const c=window.Storyboard&&window.Storyboard.cues;return c&&c.length?c[c.length-1].time:0;})()")
                duration = float(last) + 8.0
        total = int(round(duration * fps))
        print(f"[ok] Duration {duration:.2f}s -> {total} frames")

        # Warm up: first renderAt builds the WebGL context(s) for each scene3d element.
        await page.evaluate("Storyboard.reset && Storyboard.reset()")
        await page.evaluate("Storyboard.renderAt && Storyboard.renderAt(0)")
        await asyncio.sleep(0.5)

        clip = {'x': 0, 'y': 0, 'width': deck_w, 'height': deck_h}
        t0 = time.perf_counter()
        for i in range(total):
            t = i / float(fps)
            await page.evaluate("(t)=>window.Storyboard.renderAt(t)", t)
            # Let the compositor pick up the freshly rendered WebGL buffer before capture.
            await page.evaluate("()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))")
            await page.screenshot(path=str(frames_dir / f"f{i:05d}.png"), clip=clip, animations='disabled')
            if i and i % 30 == 0:
                rate = i / (time.perf_counter() - t0)
                print(f"  [{i}/{total}] {rate:.1f} fps render", flush=True)

        await context.close()
        await browser.close()

    print("[..] Encoding MP4 from frame sequence...")
    crf = '18' if quality == 'high' else '22'
    cmd = [FFMPEG, '-y', '-framerate', str(fps), '-i', str(frames_dir / 'f%05d.png')]
    if not no_audio and audio_path:
        cmd += ['-i', str(audio_path)]
    cmd += ['-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p']
    if not no_audio and audio_path:
        cmd += ['-c:a', 'aac', '-b:a', '192k', '-shortest']
    else:
        cmd += ['-an']
    cmd += ['-movflags', '+faststart', str(out_mp4)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        print("\n[ERROR] ffmpeg failed:\n")
        print(proc.stderr[-2000:])
        sys.exit(1)

    for _attempt in range(5):
        shutil.rmtree(tmp_dir, ignore_errors=True)
        if not tmp_dir.exists():
            break
        time.sleep(0.6)  # Windows: wait for Chromium to release the .webm lock
    srv.shutdown()
    size_mb = out_mp4.stat().st_size / 1_048_576
    print(f"\n[OK] Wrote {out_mp4.name} ({size_mb:.1f} MB)")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('html', help='Path to storyboard.html')
    ap.add_argument('--audio', help='Path to source MP3 (default: first *.mp3 next to HTML)')
    ap.add_argument('--out', default=None, help='Output MP4 path (default: storyboard.mp4 next to HTML)')
    ap.add_argument('--quality', choices=['high', 'fast'], default='high',
                    help='high = crf 18, medium preset (best); fast = crf 23, veryfast preset (lower size)')
    ap.add_argument('--no-audio', action='store_true',
                    help='Silent render: drive the synthetic clock, encode video-only (no VO/MP3 needed)')
    ap.add_argument('--duration', type=float, default=None,
                    help='Override timeline length in seconds (no-audio mode; default = last cue + 8s)')
    ap.add_argument('--frames', action='store_true',
                    help='OFFLINE deterministic render: step the clock frame-by-frame, screenshot each, '
                         'assemble a PNG sequence. Perfectly smooth + supersampled — best for 3D/WebGL decks.')
    ap.add_argument('--fps', type=int, default=30, help='Frame rate for --frames mode (default 30)')
    ap.add_argument('--cpu', action='store_true',
                    help='Software compositing for the recording (no GPU). Fixes blank/white video '
                         'capture on machines where GPU-composited layers are not screencast. '
                         'Use for CSS/SVG decks; omit for WebGL/3D decks.')
    ap.add_argument('--supersample', type=float, default=1.5,
                    help='--frames mode: internal WebGL supersample factor for antialiasing (default 1.5)')
    args = ap.parse_args()

    html = Path(args.html).resolve()
    if not html.exists():
        sys.exit(f"HTML not found: {html}")

    audio = None
    if not args.no_audio:
        if args.audio:
            audio = Path(args.audio).resolve()
        else:
            candidates = sorted(html.parent.glob('*.mp3'))
            if not candidates:
                sys.exit("No MP3 found next to the HTML. Pass --audio, or use --no-audio for a silent render.")
            audio = candidates[0]
        if not audio.exists():
            sys.exit(f"Audio not found: {audio}")

    out = Path(args.out).resolve() if args.out else html.parent / (html.stem + '.mp4')

    if args.frames:
        asyncio.run(render_frames(html, audio, out, fps=args.fps, quality=args.quality,
                                  no_audio=args.no_audio, duration_override=args.duration,
                                  supersample=args.supersample))
    else:
        asyncio.run(render(html, audio, out, quality=args.quality, no_audio=args.no_audio, duration_override=args.duration, cpu=args.cpu))


if __name__ == '__main__':
    main()

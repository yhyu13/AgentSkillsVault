# -*- coding: utf-8 -*-
"""Render one episode: content.json + narration -> scene.html -> frames -> mp4 (soft subs + clean).

Usage:
  python render_episode.py content.json 1 --work work --out out
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import shutil
import subprocess
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from common import ROOT, WORK, OUT, FF_PATH, asset, themed_template  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

TEMPLATE = asset("scene/template.html")
VW, VH = 1920, 1080


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, errors="replace", **kw)
    if r.returncode:
        raise RuntimeError("命令失败: " + " ".join(map(str, cmd[:8])) + "\n" + (r.stderr or "")[-1500:])
    return r


def loudness(path):
    r = subprocess.run([FF_PATH, "-hide_banner", "-i", str(path), "-af",
                        "loudnorm=I=-14:TP=-1:LRA=11:print_format=summary", "-f", "null", "-"],
                       capture_output=True, text=True, errors="replace")
    t = (r.stderr or "") + (r.stdout or "")
    i = re.search(r"Input Integrated:\s*(-?\d+\.?\d*)", t)
    tp = re.search(r"Input True Peak:\s*(-?\d+\.?\d*)", t)
    return float(i.group(1)), float(tp.group(1)) if tp else 0.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("content")
    ap.add_argument("episode", type=int)
    ap.add_argument("--work", default=str(WORK))
    ap.add_argument("--out", default=str(OUT))
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--crf", type=int, default=18)
    ap.add_argument("--width", type=int, default=1280)
    ap.add_argument("--height", type=int, default=720)
    ap.add_argument("--keep-frames", action="store_true")
    ap.add_argument("--slug", default="episode", help="输出文件名前缀")
    ap.add_argument("--reuse-frames", action="store_true",
                    help="skip rendering: reuse the PNG frames already in work/epN/frames")
    a = ap.parse_args()

    content = json.loads(pathlib.Path(a.content).read_text(encoding="utf-8"))
    ep = next(e for e in content["episodes"] if e["id"] == a.episode)
    work = pathlib.Path(a.work).resolve() / f"ep{a.episode}"
    work.mkdir(parents=True, exist_ok=True)
    outdir = pathlib.Path(a.out).resolve()
    outdir.mkdir(parents=True, exist_ok=True)

    timing = json.loads((work / "timing.json").read_text(encoding="utf-8"))
    fps = a.fps
    total = timing["total"]
    n_frames = int(round(total * fps))

    # ---- scene.html (embed content + timing; no fetch -> file:// safe) ----
    layout = json.loads(asset("design/layout.json").read_text(encoding="utf-8"))
    payload = {"episode": ep, "layout": layout}
    tpl = themed_template(TEMPLATE, asset("design/design.json"))
    tpl = tpl.replace("/*__CONTENT__*/null/*__END__*/",
                      json.dumps(payload, ensure_ascii=False))
    tpl = tpl.replace("/*__TIMING__*/null/*__END__*/",
                      json.dumps(timing, ensure_ascii=False))
    scene = work / "scene.html"
    scene.write_text(tpl, encoding="utf-8")
    (scene.parent / "timing.js").write_text(
        "window.TIMING = " + json.dumps(timing, ensure_ascii=False) + ";", encoding="utf-8")

    # ---- frames ----
    frames = work / "frames"
    have = sorted(frames.glob("*.png")) if frames.exists() else []
    if a.reuse_frames and len(have) == n_frames:
        print(f"reuse frames: {len(have)} png", flush=True)
    else:
        if frames.exists():
            shutil.rmtree(frames)
        frames.mkdir(parents=True, exist_ok=True)
        from playwright.sync_api import sync_playwright

        t0 = time.time()
        with sync_playwright() as p:
            b = p.chromium.launch(args=["--force-color-profile=srgb", "--hide-scrollbars"])
            pg = b.new_page(viewport={"width": a.width, "height": a.height}, device_scale_factor=1)
            pg.add_init_script("window.TIMING = " + json.dumps(timing, ensure_ascii=False) + ";")
            pg.goto(scene.as_uri())
            pg.wait_for_timeout(500)
            for n in range(n_frames):
                pg.evaluate("t => window.renderAt(t)", n / fps)
                pg.screenshot(path=str(frames / f"{n:05d}.png"), animations="allow")
                if n % 120 == 0:
                    el = time.time() - t0
                    eta = el / max(n, 1) * (n_frames - n)
                    print(f"  frame {n}/{n_frames}  {el:.0f}s  eta {eta:.0f}s", flush=True)
            b.close()
        print(f"frames done: {n_frames} in {time.time()-t0:.0f}s", flush=True)

    # ---- encode ----
    silent = work / "silent.mp4"
    run([FF_PATH, "-y", "-loglevel", "error", "-framerate", str(fps),
         "-i", str(frames / "%05d.png"), "-c:v", "libx264", "-preset", "medium",
         "-crf", str(a.crf), "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(silent)])

    narr = work / "narration.wav"
    norm = work / "narration_norm.wav"
    # single-pass loudnorm lands ~-15.4 on short clips; reserve TP headroom then add makeup gain
    # Limiter LAST and level=disabled: its auto-level otherwise lifts the true peak
    # back to 0 dBTP. Measured: old order shipped -0.6..0 dBTP; this order -1.4 dBTP.
    chain = ("acompressor=threshold=-26dB:ratio=3.5:attack=5:release=150,"
             "loudnorm=I=-14:TP=-3:LRA=11,volume=1.28,alimiter=limit=0.85:level=disabled")
    run([FF_PATH, "-y", "-loglevel", "error", "-i", str(narr), "-af", chain, str(norm)])

    stem = f"{a.slug}-ep{a.episode}"
    out = outdir / f"{stem}.mp4"
    clean = outdir / f"{stem}-clean.mp4"
    run([FF_PATH, "-y", "-loglevel", "error", "-i", str(silent), "-i", str(norm),
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
         "-movflags", "+faststart", str(clean)])

    srt = work / "subtitles.srt"
    args = [FF_PATH, "-y", "-loglevel", "error", "-i", str(clean)]
    if srt.exists():
        args += ["-i", str(srt), "-c:v", "copy", "-c:a", "copy", "-c:s", "mov_text",
                 "-metadata:s:s:0", "language=chi", "-metadata:s:s:0", "title=中文",
                 "-disposition:s:0", "default"]
    else:
        args += ["-c", "copy"]
    args += ["-movflags", "+faststart", str(out)]
    run(args)

    if srt.exists():
        shutil.copy(srt, outdir / f"{stem}.srt")

    i_lufs, tp = loudness(out)
    print(f"OUT {out.name}  {out.stat().st_size//1024}KB  {total:.1f}s  "
          f"{i_lufs:.1f} LUFS / TP {tp:.1f}")
    print(f"     + {clean.name}  + {stem}.srt")

    if not a.keep_frames:
        shutil.rmtree(frames, ignore_errors=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())

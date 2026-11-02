#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""HTML 场景 → 逐帧截图 → MP4(带软字幕 + 响度达标 + 无字幕兜底)。

用法:
    python webvideo.py scene.html --work work/ --out out.mp4 [--dsf 1.5] [--fps 24]

约定(scene.html 必须满足):
    * 从同目录加载 timing.js(tts_timeline.py 生成),里面有 window.TIMING
    * 暴露 window.renderAt(t):给定秒数,画出那一帧,**同一 t 必须同一帧**
      (不许 Date.now()、Math.random()、setTimeout 之类的"自走"状态)

产出:
    work/frames/00000.png …      逐帧
    <out>                        带 mov_text 软字幕(默认开)
    <out 同名>-clean.mp4         同源无字幕,给不支持软轨的播放器兜底

为什么不用 Remotion / HyperFrames 也能干:它们的价值在编辑器和组件库;
这里要的是"网页和视频同一个设计系统",逐帧截图已经能保证,且零依赖、断网可跑。
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

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

FF = shutil.which("ffmpeg") or "ffmpeg"


def run(cmd: list[str]) -> None:
    r = subprocess.run(cmd, capture_output=True, text=True, errors="replace")
    if r.returncode:
        raise RuntimeError("命令失败: " + " ".join(map(str, cmd[:6])) + "\n"
                           + (r.stderr or "")[-1200:])


def loudness(path: pathlib.Path) -> tuple[float, float]:
    r = subprocess.run([FF, "-hide_banner", "-i", str(path), "-af",
                        "loudnorm=I=-14:TP=-1:LRA=11:print_format=summary", "-f", "null", "-"],
                       capture_output=True, text=True, errors="replace")
    t = (r.stderr or "") + (r.stdout or "")
    i = re.search(r"Input Integrated:\s*(-?\d+\.?\d*)", t)
    tp = re.search(r"Input True Peak:\s*(-?\d+\.?\d*)", t)
    if not i:
        raise RuntimeError("读不到响度")
    return float(i.group(1)), float(tp.group(1)) if tp else 0.0


def normalize(src: pathlib.Path, dst: pathlib.Path) -> tuple[float, float]:
    """语音的峰均比高,直接归一化会撞 0 dBTP;先压动态再拉响度。"""
    chain = ("acompressor=threshold=-26dB:ratio=3.5:attack=5:release=150,"
             "alimiter=limit=0.55,loudnorm=I=-14:TP=-1:LRA=11")
    run([FF, "-y", "-loglevel", "error", "-i", str(src), "-af", chain, str(dst)])
    return loudness(dst)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("scene")
    ap.add_argument("--work", default="work")
    ap.add_argument("--out", default="out.mp4")
    ap.add_argument("--dsf", type=float, default=1.5, help="截图倍率:1.5 → 1920×1080")
    ap.add_argument("--fps", type=int, default=None, help="默认取 timing.json 里的 fps")
    ap.add_argument("--crf", type=int, default=18)
    a = ap.parse_args()

    scene = pathlib.Path(a.scene).resolve()
    work = pathlib.Path(a.work).resolve()
    timing = json.loads((work / "timing.json").read_text(encoding="utf-8"))
    fps = a.fps or timing["fps"]
    total = timing["total"]
    n_frames = int(round(total * fps))

    # timing.js 必须和 scene.html 同目录：场景里的 <script src="timing.js">
    # 会在注入之后执行并覆盖 window.TIMING —— 目录里留一份旧的就会静默错拍。
    (scene.parent / "timing.js").write_text(
        "window.TIMING = " + json.dumps(timing, ensure_ascii=False) + ";", encoding="utf-8")

    frames = work / "frames"
    frames.mkdir(parents=True, exist_ok=True)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("缺少 playwright:pip install playwright && playwright install chromium")
        return 2

    t0 = time.time()
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1280, "height": 720}, device_scale_factor=a.dsf)
        # 把时间轴注入在场景脚本之前 —— 场景目录里没有 timing.js 也能渲
        pg.add_init_script("window.TIMING = " + json.dumps(timing, ensure_ascii=False) + ";")
        pg.goto(scene.as_uri())
        pg.wait_for_timeout(400)
        for n in range(n_frames):
            pg.evaluate("t => window.renderAt(t)", n / fps)
            pg.screenshot(path=str(frames / f"{n:05d}.png"), animations="disabled")
            if n % 120 == 0:
                print(f"  frame {n}/{n_frames}  {time.time()-t0:.0f}s", flush=True)
        b.close()

    out = pathlib.Path(a.out).resolve()
    silent = work / "silent.mp4"
    run([FF, "-y", "-loglevel", "error", "-framerate", str(fps), "-i", str(frames / "%05d.png"),
         "-c:v", "libx264", "-preset", "medium", "-crf", str(a.crf), "-pix_fmt", "yuv420p",
         "-movflags", "+faststart", str(silent)])

    narr = work / "narration.wav"
    norm = work / "narration_norm.wav"
    i_lufs, tp = normalize(narr, norm)

    clean = out.with_name(out.stem + "-clean.mp4")
    run([FF, "-y", "-loglevel", "error", "-i", str(silent), "-i", str(norm),
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
         "-movflags", "+faststart", str(clean)])

    srt = work / "subtitles.srt"
    args = [FF, "-y", "-loglevel", "error", "-i", str(clean)]
    if srt.exists():
        args += ["-i", str(srt), "-c:v", "copy", "-c:a", "copy", "-c:s", "mov_text",
                 "-metadata:s:s:0", "language=chi", "-metadata:s:s:0", "title=中文",
                 "-disposition:s:0", "default"]
    else:
        args += ["-c", "copy"]
        print("  [warn] 没有 subtitles.srt → 这条成片没有字幕轨")
    args += ["-movflags", "+faststart", str(out)]
    run(args)

    i_lufs, tp = loudness(out)
    print(f"OUT {out}  {out.stat().st_size//1024} KB  |  "
          f"{n_frames} 帧 @{fps}fps  |  {i_lufs:.1f} LUFS / TP {tp:.1f}")
    print(f"     + {clean.name}(无字幕兜底)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

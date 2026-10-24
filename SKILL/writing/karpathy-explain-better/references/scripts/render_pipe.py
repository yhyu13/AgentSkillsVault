#!/usr/bin/env python3
"""
逐帧亚像素渲染 + 管道编码

用途：把「多段静态画面 + 每段帧数」渲染成 mp4，推镜与转场都是**逐帧生成**的。

为什么不用 ffmpeg 的 zoompan 做推镜：
    zoompan 的裁剪窗口只能取整数像素，而每帧缩放变化通常远小于 1px
    （例如 (1.04-1)/171 ≈ 0.45px/帧），结果是画面「冻住一帧 → 跳一格」，
    在 24fps 下肉眼就是持续抖动。实测：静止帧 15/39、抖动残差 0.161。
    本脚本用 Pillow 的浮点裁切框（Image.resize 的 box 支持小数），
    静止帧降到 1/39、抖动残差 0.002。
    顺带一提：抖动版体积更小（重复帧白拿压缩率），别拿体积当质量指标。

用法：
  python render_pipe.py --timeline timeline.json --out out.mp4 --audio narration.mp3
  python render_pipe.py --timeline timeline.json --out out.mp4 --no-kenburns
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

from ffmedia import require_ffmpeg

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

WIDTH, HEIGHT = 1920, 1080
ZOOM_MAX = 1.04
FADE = 0.35
CRF = "20"
SUPERSAMPLE = 1   # 只会放大裁切框，不存在缩小混叠，通常 1 就够


def render_segments(timeline: dict, resample_name: str, zoom_max: float,
                    supersample: int, fade: float):
    """生成器：按播放顺序产出 WIDTH×HEIGHT 的 RGB 字节

    缩放随「场景内帧序号」连续变化，所以同一场景跨多个分步画面时推镜不会重置；
    淡入淡出按场景首尾各 fade 秒做亮度衰减，**不改变总时长**（不做重叠）。
    """
    from PIL import Image

    frames_dir = Path(timeline.get("frames_dir", "frames"))
    fps = timeline["fps"]
    resample = getattr(Image, resample_name)
    black = Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0))
    fade_frames = max(int(round(fade * fps)), 0)

    for seg in timeline["segments"]:
        source = Image.open(frames_dir / seg["image"]).convert("RGB")
        if supersample > 1:
            source = source.resize((WIDTH * supersample, HEIGHT * supersample), Image.LANCZOS)

        scene_frames = seg.get("scene_frames", seg["frames"])
        offset = seg.get("frame_offset", 0)
        for k in range(seg["frames"]):
            local = offset + k
            z = 1.0
            if zoom_max > 1.0 and scene_frames > 1:
                z = 1.0 + (zoom_max - 1.0) * local / scene_frames

            crop_w, crop_h = WIDTH / z, HEIGHT / z
            left = (WIDTH - crop_w) / 2 * supersample
            top = (HEIGHT - crop_h) / 2 * supersample
            box = (left, top, left + crop_w * supersample, top + crop_h * supersample)
            frame = source.resize((WIDTH, HEIGHT), resample, box=box)

            factor = 1.0
            if fade_frames:
                if local < fade_frames:
                    factor = (local + 1) / (fade_frames + 1)
                remaining = scene_frames - 1 - local
                if remaining < fade_frames:
                    factor = min(factor, (remaining + 1) / (fade_frames + 1))
            if factor < 1.0:
                frame = Image.blend(black, frame, factor)

            yield frame.tobytes()


def main():
    parser = argparse.ArgumentParser(description="逐帧亚像素渲染并编码为 mp4")
    parser.add_argument("--timeline", required=True, help="plan_timeline.py 生成的时间轴 JSON")
    parser.add_argument("--out", default="out.mp4")
    parser.add_argument("--audio", default=None, help="旁白音频；不传则只出画面")
    parser.add_argument("--zoom-max", type=float, default=ZOOM_MAX)
    parser.add_argument("--no-kenburns", action="store_true", help="不推镜（静帧 + 淡入淡出）")
    parser.add_argument("--no-fade", action="store_true", help="不做淡入淡出")
    parser.add_argument("--supersample", type=int, default=SUPERSAMPLE)
    parser.add_argument("--resample", default="LANCZOS", choices=["LANCZOS", "BICUBIC", "BILINEAR"])
    parser.add_argument("--crf", default=CRF, help="文字类画面 20~23 即可")
    args = parser.parse_args()

    require_ffmpeg()
    timeline = json.loads(Path(args.timeline).read_text(encoding="utf-8"))
    out = Path(args.out)
    zoom_max = 1.0 if args.no_kenburns else args.zoom_max
    fade = 0.0 if args.no_fade else FADE
    total = sum(s["frames"] for s in timeline["segments"])

    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{WIDTH}x{HEIGHT}", "-r", str(timeline["fps"]), "-i", "pipe:0",
    ]
    if args.audio:
        cmd += ["-i", str(Path(args.audio).resolve())]
    cmd += ["-map", "0:v"]
    if args.audio:
        cmd += ["-map", "1:a"]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", args.crf,
            "-pix_fmt", "yuv420p", "-r", str(timeline["fps"])]
    if args.audio:
        cmd += ["-c:a", "aac", "-b:a", "192k", "-shortest"]
    cmd += ["-movflags", "+faststart", str(out.resolve())]

    print(f"{len(timeline['segments'])} 段 / {total} 帧 / {total / timeline['fps']:.2f} 秒")
    print(f"推镜上限 {zoom_max:.3f}   重采样 {args.resample}   预放大 {args.supersample}x   "
          f"淡入淡出 {fade}s   CRF {args.crf}")

    started = time.time()
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    written = 0
    try:
        for chunk in render_segments(timeline, args.resample, zoom_max, args.supersample, fade):
            proc.stdin.write(chunk)
            written += 1
            if written % 480 == 0:
                rate = written / max(time.time() - started, 0.1)
                print(f"  {written}/{total} 帧  {rate:.1f} 帧/秒")
    finally:
        if proc.stdin:
            proc.stdin.close()
        code = proc.wait()
    if code != 0:
        raise SystemExit(f"[ERR] ffmpeg 退出码 {code}")

    size_mb = out.stat().st_size / 1024 / 1024
    print(f"[OK] {out.resolve()}  {size_mb:.1f} MB  用时 {time.time() - started:.0f} 秒")
    print("下一步：python verify_video.py --video %s --timeline %s%s"
          % (args.out, args.timeline, f" --audio {args.audio}" if args.audio else ""))


if __name__ == "__main__":
    main()

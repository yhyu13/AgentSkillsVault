#!/usr/bin/env python3
"""
交付前校验：把「这段视频对不对」变成可判定的检查

三项检查（任何一项失败退出码非 0）：

  1. 时长对齐——视频时长 vs 旁白实测时长，偏差 > 0.5s 判失败
  2. 画面命中——每个分步段的中点抽一帧，与所有段画面做最近邻比对（缩略图 MAE），
     命中的必须是该段自己的画面。这一条能一次性覆盖全部时间点，
     替代「人眼看一遍」这种不可复用的验证。
  3. 抖动量化——在某个段内连续抽帧，看逐帧 MAE 序列是否平滑：
     冻结帧比例过高 = 画面在「冻住一帧 → 跳一格」。
     阈值：冻结帧 ≤ 5%、抖动残差 RMS ≤ 0.02
           （阈值在「深色底 + 文字」画面上标定：逐帧亚像素渲染 ≈ 0.002；
            滤镜整数裁剪推镜 ≈ 0.036~0.16。画面本身带故意运动时用 --no-jitter）

用法：
  python verify_video.py --video out.mp4 --timeline timeline.json --audio narration.mp3
  python verify_video.py --video out.mp4 --timeline timeline.json --jitter-only
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from ffmedia import probe_duration, probe_summary, run_ffmpeg

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DURATION_TOLERANCE = 0.5   # 秒
FROZEN_RATIO_MAX = 0.05    # 冻结帧占比上限
FROZEN_MAE = 0.01          # 相邻两帧 MAE 小于此值视为「冻住」
JITTER_RMS_MAX = 0.02      # 抖动残差 RMS 上限（逐帧渲染实测 ≈ 0.002）


def thumb(path, size=(96, 54)):
    import numpy as np
    from PIL import Image
    return np.asarray(Image.open(path).convert("RGB").resize(size), dtype="float32")


def check_duration(video: Path, audio: Path | None) -> bool:
    info = probe_summary(video)
    if info["duration"] is None:
        print("=== 1. 时长对齐 ===")
        print(f"[FAIL] 无法读取 {video} 的时长，文件可能损坏")
        return False

    video_info = info["video"] or {}
    audio_info = info["audio"] or {}
    print("=== 1. 时长对齐 ===")
    print(f"视频 {info['duration']:.2f}s  "
          f"{video_info.get('width')}x{video_info.get('height')}  "
          f"{video_info.get('codec')}/{audio_info.get('codec', '无音轨')}")
    if not audio:
        print("[SKIP] 未提供旁白音频（只校验画面与抖动）")
        return True
    expected = probe_duration(audio)
    if expected is None:
        print(f"[FAIL] 无法读取旁白时长：{audio}")
        return False
    print(f"旁白 {expected:.2f}s")
    if abs(info["duration"] - expected) > DURATION_TOLERANCE:
        print(f"[FAIL] 偏差 {abs(info['duration'] - expected):.2f}s "
              f"> {DURATION_TOLERANCE}s")
        return False
    print(f"[OK] 偏差 {abs(info['duration'] - expected):.2f}s")
    return True


def check_frames(video: Path, timeline: dict, tmp_dir: Path, max_samples: int = 0) -> bool:
    import numpy as np

    frames_dir = Path(timeline.get("frames_dir", "frames"))
    segments = timeline["segments"]
    missing = [s["image"] for s in segments if not (frames_dir / s["image"]).exists()]
    if missing:
        print("=== 2. 画面命中 ===")
        print(f"[SKIP] 缺少画面文件（如 {missing[0]}），跳过")
        return True

    refs = [thumb(frames_dir / s["image"]) for s in segments]
    starts, acc = [], 0.0
    for seg in segments:
        starts.append(acc)
        acc += seg["duration"]

    indices = list(range(len(segments)))
    if max_samples and max_samples < len(indices):
        step = max(len(indices) // max_samples, 1)
        indices = indices[::step]

    print("=== 2. 画面命中 ===")
    print(f"抽取 {len(indices)}/{len(segments)} 个时间点，与全部 {len(segments)} 段画面比对")
    tmp_dir.mkdir(parents=True, exist_ok=True)
    probe_png = tmp_dir / "_probe.png"
    ok = True
    for i in indices:
        seg = segments[i]
        t = starts[i] + min(max(seg["duration"] / 2, 0.4), max(seg["duration"] - 0.2, 0.4))
        run_ffmpeg([
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-ss", f"{t:.3f}", "-i", str(video.resolve()),
            "-frames:v", "1", str(probe_png.resolve()),
        ])
        got = thumb(probe_png)
        scores = sorted(
            ((float(np.abs(got - ref).mean()), j) for j, ref in enumerate(refs)),
            key=lambda x: x[0],
        )
        best = scores[0][1]
        match = best == i
        ok &= match
        print(f"  t={t:7.2f}s  期望 {seg['image']}  最接近 {segments[best]['image']}  "
              f"(MAE={scores[0][0]:.2f})  {'OK' if match else 'MISMATCH'}")
    if probe_png.exists():
        probe_png.unlink()
    print("[OK] 全部命中" if ok else "[FAIL] 存在错位")
    return ok


def check_jitter(video: Path, timeline: dict, tmp_dir: Path, scene: int | None = None) -> bool:
    import glob
    import os

    import numpy as np

    # 选一个够长的段做连续抽帧；优先场景内的第一段
    candidates = [s for s in timeline["segments"]
                  if s["frames"] >= 40 and (scene is None or s["scene"] == scene)]
    if not candidates:
        print("=== 3. 抖动量化 ===")
        print("[SKIP] 没有足够长的段可供检测")
        return True
    seg = candidates[0]

    starts, acc = [], 0.0
    for s in timeline["segments"]:
        starts.append(acc)
        acc += s["duration"]
    index = timeline["segments"].index(seg)
    # 窗口必须完全落在**同一段**内：跨段会带上「新内容出现」的大 MAE，污染指标
    fps = timeline["fps"]
    t0 = starts[index] + min(0.45, seg["duration"] * 0.2)   # 避开开头淡入
    available = int((starts[index] + seg["duration"] - t0) * fps) - 1
    n = min(available, 60)
    if n < 10:
        print("=== 3. 抖动量化 ===")
        print(f"[SKIP] {seg['image']} 太短（{seg['frames']} 帧），无法采样")
        return True

    tmp_dir.mkdir(parents=True, exist_ok=True)
    for f in glob.glob(str(tmp_dir / "_jit*.png")):
        os.remove(f)
    run_ffmpeg([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-ss", f"{t0:.3f}", "-i", str(video.resolve()),
        "-frames:v", str(n), str(tmp_dir / "_jit%03d.png"),
    ])

    import numpy as np
    from PIL import Image
    files = sorted(glob.glob(str(tmp_dir / "_jit*.png")))
    frames = [np.asarray(Image.open(f).convert("L").resize((480, 270)), dtype="float32")
              for f in files]
    for f in files:
        os.remove(f)

    diffs = [float(np.abs(frames[i] - frames[i - 1]).mean()) for i in range(1, len(frames))]
    frozen = sum(1 for d in diffs if d < FROZEN_MAE)
    median = [float(np.median(diffs[max(0, i - 1):i + 2])) for i in range(len(diffs))]
    residual = [abs(diffs[i] - median[i]) for i in range(len(diffs))]
    rms = float(np.sqrt(np.mean(np.square(residual))))
    ratio = frozen / max(len(diffs), 1)

    print("=== 3. 抖动量化 ===")
    print(f"窗口：{seg['image']} 内 t={t0:.2f}s 起 {len(frames)} 帧（画面内容应静止，只有推镜）")
    print(f"冻结帧 {frozen}/{len(diffs)}（{ratio:.0%}）   逐帧 MAE 中位 {np.median(diffs):.3f}   "
          f"最大 {max(diffs):.3f}   抖动残差 RMS {rms:.3f}")
    print(f"逐帧 MAE 序列：{[round(d, 3) for d in diffs[:16]]}")
    ok = ratio <= FROZEN_RATIO_MAX and rms <= JITTER_RMS_MAX
    if not ok:
        print(f"[FAIL] 阈值：冻结帧 ≤ {FROZEN_RATIO_MAX:.0%}、RMS ≤ {JITTER_RMS_MAX}；"
              "建议改用逐帧亚像素渲染，别用滤镜的整数裁剪推镜")
    else:
        print("[OK] 推镜平滑，无冻结-跳动")
    return ok


def main():
    parser = argparse.ArgumentParser(description="视频交付前校验")
    parser.add_argument("--video", required=True)
    parser.add_argument("--timeline", required=True)
    parser.add_argument("--audio", default=None)
    parser.add_argument("--tmp-dir", default="temp/verify")
    parser.add_argument("--max-samples", type=int, default=0, help="画面命中最多抽几个点，0=全查")
    parser.add_argument("--jitter-scene", type=int, default=None, help="抖动检测指定场景 id")
    parser.add_argument("--jitter-only", action="store_true")
    parser.add_argument("--no-jitter", action="store_true")
    args = parser.parse_args()

    video = Path(args.video)
    timeline = json.loads(Path(args.timeline).read_text(encoding="utf-8"))
    tmp_dir = Path(args.tmp_dir)

    results = []
    if not args.jitter_only:
        results.append(check_duration(video, Path(args.audio) if args.audio else None))
        results.append(check_frames(video, timeline, tmp_dir, args.max_samples))
    if not args.no_jitter:
        results.append(check_jitter(video, timeline, tmp_dir, args.jitter_scene))

    print()
    if all(results):
        print("[OK] 校验通过")
        return 0
    print("[FAIL] 校验未通过，先修再交付")
    return 1


if __name__ == "__main__":
    sys.exit(main())

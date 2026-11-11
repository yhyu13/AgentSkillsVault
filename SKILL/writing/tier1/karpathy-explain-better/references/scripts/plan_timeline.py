#!/usr/bin/env python3
"""
时长规划：把「每个场景的若干分步画面」变成「每段画面几帧、几秒」

核心口径（踩过坑，务必遵守）：
  场景时长**以音频实测为准**，manifest 里的 duration 只当备胎。
  历史事故：分镜估算 290 秒、旁白实测 177.8 秒，按估算切帧导致后半段音画全错。

分步揭示的时长怎么分：
  按每个场景内各步的 weight（默认按旁白小句字数）比例分配，
  这样「画面新增内容」的节奏跟着「旁白讲到哪」走。

帧对齐：
  每步的结束帧号 = round(累计时间 × fps)，帧数 = 本次结束帧号 − 上次结束帧号。
  不要逐步 round(时长×fps) 再相加——那样累计误差会越滚越大。

输入 manifest 格式（示例见本目录 README.md）：
  {
    "fps": 24,
    "audio_dir": "audio",
    "scenes": [
      {"id": 0, "audio": "scene_00.mp3", "duration": 10,
       "files": ["scene_00_01.png", "scene_00_02.png"], "weights": [3, 2]}
    ]
  }

用法：
  python plan_timeline.py --manifest frames/steps.json --frames-dir frames --out timeline.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from ffmedia import probe_duration

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def load_manifest(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    if "scenes" not in data:
        raise SystemExit(f"{path} 缺少 scenes 字段")
    data.setdefault("fps", 24)
    return data


def plan(manifest: dict, frames_dir: Path, audio_dir: Path | None) -> dict:
    fps = manifest["fps"]
    segments: list[dict] = []
    scene_start_time = 0.0
    prev_frame = 0
    warnings: list[str] = []

    for scene in manifest["scenes"]:
        files = scene["files"]
        weights = scene.get("weights") or [1.0] * len(files)
        if len(weights) != len(files):
            raise SystemExit(f"场景 {scene.get('id')}: files 与 weights 长度不一致")

        # 时长：音频实测优先，其次 manifest 里的 duration
        audio_path = None
        if audio_dir:
            # 约定：未指定 scene.audio 时，默认找 scene_{id:02d}.mp3
            name = scene.get("audio") or f"scene_{scene.get('id', 0):02d}.mp3"
            audio_path = Path(audio_dir) / name
        measured = probe_duration(audio_path) if audio_path else None
        if measured:
            duration, source = measured, "audio"
        elif scene.get("duration"):
            duration, source = float(scene["duration"]), "estimate"
            warnings.append(f"场景 {scene.get('id')}: 音频不可用，退回估算时长 {duration}s")
        else:
            raise SystemExit(f"场景 {scene.get('id')}: 既没有可用音频也没有 duration")

        total_weight = sum(weights) or float(len(weights))
        entries = []
        cumulative = 0.0
        for file, weight in zip(files, weights):
            cumulative += weight
            end_time = scene_start_time + duration * cumulative / total_weight
            end_frame = max(round(end_time * fps), prev_frame + 1)
            entries.append({"image": file, "frames": end_frame - prev_frame})
            prev_frame = end_frame

        scene_frames = sum(e["frames"] for e in entries)
        for i, entry in enumerate(entries):
            segments.append({
                "image": entry["image"],
                "frames": entry["frames"],
                "duration": round(entry["frames"] / fps, 4),
                "scene": scene.get("id"),
                "step": i + 1,
                "scene_frames": scene_frames,
                "frame_offset": sum(e["frames"] for e in entries[:i]),
                "scene_start": i == 0,
                "scene_end": i == len(entries) - 1,
            })
        scene_start_time += duration

    return {
        "fps": fps,
        "frames_dir": str(frames_dir),
        "total_frames": sum(s["frames"] for s in segments),
        "total_duration": round(sum(s["duration"] for s in segments), 4),
        "segments": segments,
        "warnings": warnings,
    }


def main():
    parser = argparse.ArgumentParser(description="时长规划：分步画面 → 每段帧数与时长")
    parser.add_argument("--manifest", required=True, help="分步清单 JSON")
    parser.add_argument("--frames-dir", default="frames", help="画面所在目录")
    parser.add_argument("--audio-dir", default=None,
                        help="音频目录（manifest 里 scene.audio 相对此目录）；不传则不查音频")
    parser.add_argument("--out", default="timeline.json", help="输出的时间轴 JSON")
    args = parser.parse_args()

    manifest = load_manifest(Path(args.manifest))
    timeline = plan(manifest, Path(args.frames_dir),
                    Path(args.audio_dir) if args.audio_dir else None)

    for warn in timeline["warnings"]:
        print(f"[WARN] {warn}")
    print(f"共 {len(timeline['segments'])} 段 / {timeline['total_frames']} 帧 / "
          f"{timeline['total_duration']:.2f} 秒")
    for seg in timeline["segments"][:10]:
        print(f"  {seg['image']:24s} {seg['frames']:4d} 帧 {seg['duration']:6.2f}s "
              f"场景 {seg['scene']} 第 {seg['step']} 步")
    if len(timeline["segments"]) > 10:
        print(f"  ... 其余 {len(timeline['segments']) - 10} 段省略")

    Path(args.out).write_text(json.dumps(timeline, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n[OK] 时间轴: {args.out}")
    print("下一步：python render_pipe.py --timeline %s --out out.mp4 "
          "--audio <旁白音频>" % args.out)


if __name__ == "__main__":
    main()

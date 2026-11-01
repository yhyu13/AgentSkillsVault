#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""逐句 TTS → 实测时长 → 对齐音轨 + timing.js + subtitles.srt。

用法:
    python tts_timeline.py lines.txt --out work/ [--voice zh-CN-YunxiNeural] [--gap 0.30]

lines.txt: 一行一句旁白(空行忽略)。输出:
    work/audio/sNN.mp3   逐句音频
    work/narration.wav   对齐后的整轨(48k 单声道)
    work/timing.json     每句 start/end(秒) + fps + total
    work/timing.js       window.TIMING = {...}  ← 直接给 scene.html 用
    work/subtitles.srt   同一条时间轴的字幕

**时长只有一个来源:音频实测。** 分镜里写的秒数不算。
"""
from __future__ import annotations

import argparse
import asyncio
import json
import pathlib
import re
import shutil
import subprocess
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

FF = shutil.which("ffmpeg") or "ffmpeg"


def dur(path: pathlib.Path) -> float:
    p = subprocess.run([FF, "-hide_banner", "-i", str(path)],
                       capture_output=True, text=True, errors="replace")
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.?\d+)", p.stderr or "")
    if not m:
        raise RuntimeError(f"读不到时长: {path}")
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))


def ts(sec: float) -> str:
    h = int(sec // 3600); m = int(sec % 3600 // 60); s = sec % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}".replace(".", ",")


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("lines")
    ap.add_argument("--out", default="work")
    ap.add_argument("--voice", default="zh-CN-YunxiNeural")
    ap.add_argument("--gap", type=float, default=0.30)
    ap.add_argument("--fps", type=int, default=24)
    a = ap.parse_args()

    try:
        import edge_tts
    except ImportError:
        print("缺少 edge_tts:pip install edge-tts")
        return 2

    out = pathlib.Path(a.out).resolve()
    aud = out / "audio"
    aud.mkdir(parents=True, exist_ok=True)

    lines = [x.strip() for x in pathlib.Path(a.lines).read_text(encoding="utf-8").splitlines()
             if x.strip()]
    if not lines:
        print("lines 文件是空的")
        return 2

    files = []
    for i, line in enumerate(lines, 1):
        f = aud / f"s{i:02d}.mp3"
        if not f.exists() or f.stat().st_size < 2000:
            await edge_tts.Communicate(line, a.voice).save(str(f))
        files.append(f)

    segs, cur = [], 0.0
    for i, (f, line) in enumerate(zip(files, lines)):
        d = dur(f)
        segs.append({"i": i + 1, "start": round(cur, 3), "end": round(cur + d, 3),
                     "text": line, "file": str(f)})
        cur += d + a.gap
    total = cur - a.gap

    # 按时间轴精确放置(不靠"顺序拼接"——拼接会把 gap 误差累积起来)
    inputs, filters = [], []
    for k, s in enumerate(segs):
        inputs += ["-i", s["file"]]
        ms = int(round(s["start"] * 1000))
        filters.append(f"[{k}:a]aresample=48000,adelay={ms}|{ms},apad[a{k}]")
    mix = "".join(f"[a{k}]" for k in range(len(segs)))
    filters.append(f"{mix}amix=inputs={len(segs)}:normalize=0:dropout_transition=0,"
                   f"atrim=0:{total:.3f},asetpts=N/SR/TB[out]")
    subprocess.run([FF, "-y", "-loglevel", "error", *inputs, "-filter_complex",
                    ";".join(filters), "-map", "[out]", "-c:a", "pcm_s16le",
                    str(out / "narration.wav")], check=True)

    meta = {"fps": a.fps, "total": round(total, 3), "segments": segs}
    (out / "timing.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    (out / "timing.js").write_text("window.TIMING = " + json.dumps(meta, ensure_ascii=False) + ";",
                                   encoding="utf-8")
    with open(out / "subtitles.srt", "w", encoding="utf-8") as f:
        for k, s in enumerate(segs, 1):
            f.write(f"{k}\n{ts(s['start'])} --> {ts(s['end'])}\n{s['text']}\n\n")

    print(f"total {total:.2f}s / {len(segs)} 句  →  {out}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

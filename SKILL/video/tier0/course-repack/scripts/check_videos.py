#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Video gate: duration, audio, loudness, luminance, subtitle stream.

Runs on files already in out/ -- it never re-renders. Each check is a real
measurement parsed from ffmpeg output; a missing measurement counts as a fail.

Usage:
  python check_videos.py out --slug course --lufs -14
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import FF_PATH, WORK  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DUR_RE = re.compile(r"Duration: (\d+):(\d+):(\d+\.?\d*)")
LUFS_RE = re.compile(r"Input Integrated:\s*(-?\d+\.?\d*)")
TP_RE = re.compile(r"Input True Peak:\s*(-?\d+\.?\d*)")
YAVG_RE = re.compile(r"lavfi\.signalstats\.YAVG=(\d+\.?\d*)")
VIDEO_RE = re.compile(r"Stream #\d+:\d+.*: Video:")
AUDIO_RE = re.compile(r"Stream #\d+:\d+.*: Audio:")
SUB_RE = re.compile(r"Stream #\d+:\d+(?:\[[^\]]+\])?(?:\((\w+)\))?.*: Subtitle:")


def ff(*args: str) -> str:
    r = subprocess.run([FF_PATH, "-hide_banner", *args], capture_output=True,
                       text=True, errors="replace")
    return (r.stderr or "") + (r.stdout or "")


def probe(path: Path) -> dict:
    info = ff("-i", str(path))
    d = DUR_RE.search(info)
    return {
        "duration": (int(d.group(1)) * 3600 + int(d.group(2)) * 60 + float(d.group(3))) if d else None,
        "video": bool(VIDEO_RE.search(info)),
        "audio": bool(AUDIO_RE.search(info)),
        "subtitle": bool(SUB_RE.search(info)),
        "sub_lang": (SUB_RE.search(info).group(1) if SUB_RE.search(info) else None),
    }


def lufs(path: Path) -> tuple[float | None, float | None]:
    out = ff("-i", str(path), "-af", "loudnorm=I=-14:TP=-1:LRA=11:print_format=summary",
             "-f", "null", "-")
    i, tp = LUFS_RE.search(out), TP_RE.search(out)
    return (float(i.group(1)) if i else None, float(tp.group(1)) if tp else None)


def mean_luma(path: Path, at: float) -> float | None:
    out = ff("-ss", f"{at:.2f}", "-i", str(path), "-frames:v", "1",
             "-vf", "signalstats,metadata=print", "-f", "null", "-")
    m = YAVG_RE.search(out)
    return float(m.group(1)) if m else None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--slug", default="")
    ap.add_argument("--lufs", type=float, default=-14.0)
    ap.add_argument("--lufs-tol", type=float, default=1.0)
    ap.add_argument("--work", default=str(WORK))
    ap.add_argument("--min-luma", type=float, default=17.0)
    a = ap.parse_args()

    out = Path(a.out)
    files = sorted(p for p in out.glob("*.mp4")
                   if not p.stem.endswith(("-clean", "-burn"))
                   and (not a.slug or p.name.startswith(a.slug)))
    if not files:
        print(f"FAIL: {out} 下没有可检的 mp4（--slug {a.slug!r}）")
        return 1

    fails: list[str] = []
    for p in files:
        m = re.search(r"ep(\d+)", p.stem)
        ep = int(m.group(1)) if m else None
        info = probe(p)
        problems = []
        if info["duration"] is None:
            problems.append("读不到时长")
        if not info["video"]:
            problems.append("没有视频流")
        if not info["audio"]:
            problems.append("没有音轨")
        if ep is not None:
            t = Path(a.work) / f"ep{ep}" / "timing.json"
            if t.exists():
                want = json.loads(t.read_text(encoding="utf-8"))["total"]
                if info["duration"] is not None and abs(info["duration"] - want) > 0.2:
                    problems.append(f"时长 {info['duration']:.2f}s 与 timing {want:.2f}s 不符")
            else:
                problems.append(f"缺 {t}，无法核对时长")
        i, tp = lufs(p)
        if i is None:
            problems.append("测不到响度")
        elif abs(i - a.lufs) > a.lufs_tol:
            problems.append(f"响度 {i:.1f} LUFS 偏离 {a.lufs:g}±{a.lufs_tol:g}")
        if tp is not None and tp > -1.0:
            problems.append(f"真峰值 {tp:.1f} dB 超过 -1")
        if info["duration"]:
            for frac in (0.05, 0.5, 0.95):
                y = mean_luma(p, info["duration"] * frac)
                if y is None:
                    problems.append(f"抽帧测不到亮度 @{frac:.0%}")
                elif y <= a.min_luma:
                    problems.append(f"画面接近黑帧 YAVG={y:.0f} @{frac:.0%}")
        if not info["subtitle"]:
            problems.append("没有字幕流")
        elif info["sub_lang"] not in ("chi", "zho"):
            problems.append(f"字幕语言标记是 {info['sub_lang']!r}，应为 chi")
        status = "OK  " if not problems else "FAIL"
        print(f"{status} {p.name}  {info['duration'] or 0:.1f}s  LUFS={i if i is not None else '?'}")
        for x in problems:
            print("     - " + x)
        if problems:
            fails.append(p.name)
    print(f"\n{len(files)} 个文件，" + ("全部通过" if not fails else f"{len(fails)} 个不合格"))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())

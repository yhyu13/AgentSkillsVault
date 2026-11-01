#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""explain-better 交付机检。

用法:
    python check_explain.py <文件|目录> [...]

检查项(每条都打印 [OK]/[FAIL],有 FAIL 退出码 1):
  * 文本/HTML : 禁用词、每页字数、外链、海报必备标记
  * 视频      : 字幕轨、是否默认开、响度、时长、背景是否真的在动(逐帧差分)

只依赖 ffmpeg + Pillow,不依赖 ffprobe。
"""
from __future__ import annotations

import io
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HERE = Path(__file__).resolve().parent
WORD_BAN = HERE.parent / "word-ban.md"

CJK = re.compile(r"[\u4e00-\u9fff]")
TAG = re.compile(r"<[^>]+>")
SCRIPT = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.S | re.I)

results: list[tuple[bool, str]] = []


def ok(msg: str) -> None:
    results.append((True, msg))
    print(f"  [OK]   {msg}")


def bad(msg: str) -> None:
    results.append((False, msg))
    print(f"  [FAIL] {msg}")


# ---------------------------------------------------------------- banned words
def load_banned() -> list[str]:
    if not WORD_BAN.exists():
        return []
    words: list[str] = []
    for line in WORD_BAN.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s.startswith("|") or s.startswith("|---") or "禁用" in s or "Banned" in s:
            continue
        cells = [c.strip() for c in s.strip("|").split("|")]
        if len(cells) < 2:
            continue
        for w in re.split(r"[/,、]", cells[0]):
            w = w.strip().strip("`")
            if len(w) >= 2:
                words.append(w)
    return words


BANNED = load_banned()


def check_text_prose(text: str, label: str, limit: int = 0) -> None:
    hits = []
    for line in text.splitlines():
        if line.strip().startswith("引:"):
            continue
        for w in BANNED:
            if w in line:
                hits.append((w, line.strip()[:50]))
    if hits:
        uniq = sorted({h[0] for h in hits})
        bad(f"{label} 命中禁用词 {len(hits)} 处:{', '.join(uniq[:8])}")
    else:
        ok(f"{label} 无禁用词")
    if limit:
        n = len(CJK.findall(text))
        (ok if n <= limit * 3 else bad)(f"{label} 汉字数 {n}(上限 {limit*3},3 页 ×{limit})")


# ---------------------------------------------------------------- html
def check_html(path: Path) -> None:
    print(f"\n== HTML: {path.name}")
    raw = path.read_text(encoding="utf-8", errors="replace")
    body = SCRIPT.sub(" ", raw)

    check_text_prose(TAG.sub(" ", body), path.name, limit=45)

    ext = re.findall(r'(?:src|href)="(https?://[^"]+)"', raw)
    (bad if ext else ok)(f"外链 {len(ext)} 个" + (f":{ext[:3]}" if ext else "(单文件)"))

    pages = re.findall(r'data-page="(\d+)"', raw)
    if not pages:
        bad("未找到 data-page 分页标记")
    elif len(pages) != 3:
        bad(f"页数 {len(pages)},Boss 海报应为 3 页")
    else:
        ok("3 页 data-page")

    # 逐页字数（每页 ≤ 45 汉字）
    if pages:
        for n, ch in enumerate(re.findall(
                r'<section[^>]*data-page="(\d+)"[^>]*>(.*?)</section>', body, re.S), 1):
            cnt = len(CJK.findall(TAG.sub(" ", ch[1])))
            (ok if cnt <= 45 else bad)(f"P{ch[0]} 汉字 {cnt} / 45")

    for attr, why in [
        ("data-hero", "hero 数字"),
        ("data-motion", "背景动效 canvas"),
        ("data-flow", "逻辑链折叠区"),
    ]:
        (ok if attr in raw else bad)(f"{why}({attr})")

    if "translateX" in raw and (
        "pointerdown" in raw or "touchstart" in raw or "touch-action" in raw
    ):
        ok("左右滑动翻页已实现")
    else:
        bad("未找到滑动翻页实现(translateX + pointer/touch)")

    auto = sum(k in raw for k in ("setInterval", "setTimeout", "requestAnimationFrame"))
    (ok if auto else bad)("自动播放/动画循环已实现" if auto else "未找到自动播放/动画循环")


# ---------------------------------------------------------------- video
def ff_meta(path: Path) -> str:
    exe = shutil.which("ffmpeg") or "ffmpeg"
    p = subprocess.run([exe, "-hide_banner", "-i", str(path)],
                       capture_output=True, text=True, errors="replace")
    return (p.stderr or "") + (p.stdout or "")


def ff_loudness(path: Path) -> tuple[float | None, float | None]:
    exe = shutil.which("ffmpeg") or "ffmpeg"
    p = subprocess.run(
        [exe, "-hide_banner", "-i", str(path), "-af",
         "loudnorm=print_format=summary", "-f", "null", "-"],
        capture_output=True, text=True, errors="replace")
    text = (p.stderr or "") + (p.stdout or "")
    i = re.search(r"Input Integrated:\s*(-?\d+\.?\d*)", text)
    tp = re.search(r"Input True Peak:\s*(-?\d+\.?\d*)", text)
    return (float(i.group(1)) if i else None, float(tp.group(1)) if tp else None)


def motion_score(path: Path, samples: int = 12, dt: float = 0.2):
    """同一镜头内 0.2s 前后的帧差中位数。

    用中位数而不是均值:切镜/转场只会污染 1-2 个采样点,中位数能把它们剔除,
    从而真正区分"镜头内部在动"和"一帧静止放 12 秒的 PPT"。
    返回 -1 表示读不到帧。
    """
    from PIL import Image, ImageChops, ImageStat

    exe = shutil.which("ffmpeg") or "ffmpeg"
    meta = ff_meta(path)
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.?\d+)", meta)
    if not m:
        return -1.0
    dur = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
    diffs: list[float] = []
    with tempfile.TemporaryDirectory() as td:
        for k in range(samples):
            t0 = dur * (k + 0.5) / samples - dt / 2
            pair = []
            for j, t in enumerate((t0, t0 + dt)):
                out = Path(td) / f"f{k:02d}{j}.png"
                subprocess.run([exe, "-y", "-loglevel", "error", "-ss", f"{max(t,0):.2f}",
                                "-i", str(path), "-frames:v", "1",
                                "-vf", "scale=320:-2,format=gray", str(out)],
                               capture_output=True)
                if out.exists():
                    pair.append(Image.open(out).convert("L").copy())
            if len(pair) == 2:
                diffs.append(ImageStat.Stat(ImageChops.difference(*pair)).mean[0])
    if not diffs:
        return -1.0, -1.0
    frozen = sum(1 for x in diffs if x < 0.05) / len(diffs)
    diffs.sort()
    return diffs[len(diffs) // 2], frozen


def check_video(path: Path) -> None:
    print(f"\n== VIDEO: {path.name}")
    meta = ff_meta(path)

    subs = re.findall(r"Stream #\d+:\d+.*?Subtitle:\s*(\w+)", meta)
    if not subs:
        bad("无字幕轨(应挂 mov_text 软字幕,默认开)")
    else:
        ok(f"字幕轨 {subs[0]}")
        if re.search(r"Stream #\d+:\d+.*?Subtitle:.*\(default\)", meta):
            ok("字幕轨默认开")
        else:
            bad("字幕轨未标 default(播放器里默认不显示)")

    i, tp = ff_loudness(path)
    if i is None:
        bad("读不到响度")
    elif -16.0 <= i <= -12.0:
        ok(f"响度 {i} LUFS(目标 -14),峰值 {tp} dBTP")
    else:
        bad(f"响度 {i} LUFS 不在 -16…-12(手机要开满格才听清)")

    s, frozen = motion_score(path)
    if s < 0:
        bad("无法抽帧,动效未知")
    elif s >= 0.15 and frozen <= 0.25:
        ok(f"背景动效 中位数 {s:.2f} / 冻结帧 {frozen:.0%}(镜头内在动)")
    else:
        bad(f"背景动效 中位数 {s:.2f} / 冻结帧 {frozen:.0%}"
            f"(静止/像 PPT:参照 纯静态分镜=0.00/100%,低频动效≈0.3–0.5/0%)")

    m = re.search(r"Duration:\s*(\S+),", meta)
    if m:
        ok(f"时长 {m.group(1)}")
    if "Video: h264" not in meta and "Video: hevc" not in meta:
        bad("不是 h264/hevc,浏览器可能放不了")


# ---------------------------------------------------------------- main
def main(argv: list[str]) -> int:
    targets = [Path(a) for a in argv[1:]] or [Path(".")]
    files: list[Path] = []
    for t in targets:
        if t.is_dir():
            files += sorted(p for p in t.rglob("*") if p.suffix.lower() in
                            {".html", ".htm", ".mp4", ".md", ".txt"})
        elif t.exists():
            files.append(t)

    if not files:
        print("没有可检查的文件")
        return 2

    for f in files:
        if f.suffix.lower() in {".html", ".htm"}:
            check_html(f)
        elif f.suffix.lower() == ".mp4":
            check_video(f)
        else:
            print(f"\n== TEXT: {f.name}")
            check_text_prose(f.read_text(encoding="utf-8", errors="replace"), f.name)

    fails = [m for good, m in results if not good]
    print("\n" + "-" * 60)
    print(f"通过 {len(results) - len(fails)} / {len(results)}")
    if fails:
        print("未通过:")
        for m in fails:
            print("  - " + m)
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

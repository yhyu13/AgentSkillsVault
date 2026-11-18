#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Narrate one episode: text lines -> per-sentence audio -> timing.json + subtitles.srt.

One sentence per line in the input .txt (that is what make_narration produces).
Each sentence becomes one subtitle cue and one segment of the timeline; `map.json`
tells which slide a sentence belongs to, so a slide can hold across several cues.

Requires edge-tts (network) and ffmpeg.

Usage:
  python tts_episode.py work/narration/ep1.txt --map work/narration/ep1.map.json \
      --out work/ep1 --voice zh-CN-YunyangNeural --gap 0.35
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import FF_PATH  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

CJK = re.compile(r"[\u4e00-\u9fff]")
DUR_RE = re.compile(r"Duration: (\d+):(\d+):(\d+\.?\d*)")


def dur_of(p: Path) -> float:
    r = subprocess.run([FF_PATH, "-hide_banner", "-i", str(p)],
                       capture_output=True, text=True, errors="replace")
    m = DUR_RE.search((r.stderr or "") + (r.stdout or ""))
    if not m:
        raise RuntimeError(f"读不到时长: {p}")
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))


def to_wav(src: Path, dst: Path) -> None:
    subprocess.run([FF_PATH, "-y", "-loglevel", "error", "-i", str(src),
                    "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", str(dst)], check=True)


def silence(dst: Path, seconds: float) -> None:
    subprocess.run([FF_PATH, "-y", "-loglevel", "error", "-f", "lavfi", "-i",
                    f"anullsrc=r=24000:cl=mono", "-t", f"{seconds:.3f}",
                    "-c:a", "pcm_s16le", str(dst)], check=True)


def wrap_cue(text: str, max_cjk: int) -> list[str]:
    """Split one sentence into at most two lines of at most max_cjk CJK characters.

    Punctuation does not count toward the width (the subtitle gate counts CJK), so a
    36-character sentence with many commas still fits two lines. Prefer a break at
    punctuation, but never let either side exceed max_cjk.

    Precondition: at most 2 * max_cjk CJK characters. check_content enforces that;
    a longer input cannot be two lines and is not handled here.
    """
    total = len(CJK.findall(text))
    if total <= max_cjk:
        return [text]
    target = (total + 1) // 2
    best_i, best_score = max_cjk, None
    for i in range(1, len(text)):
        left = len(CJK.findall(text[:i]))
        if left > max_cjk or total - left > max_cjk:
            continue
        score = abs(left - target)
        if text[i - 1] in "，、；：,;: ":
            score -= 3
        if best_score is None or score < best_score:
            best_i, best_score = i, score
    return [text[:best_i], text[best_i:]]


def ts(t: float) -> str:
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


async def synth(text: str, voice: str, dst: Path, rate: str, volume: str) -> None:
    import edge_tts
    await edge_tts.Communicate(text, voice, rate=rate, volume=volume).save(str(dst))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("txt")
    ap.add_argument("--map", default="")
    ap.add_argument("--out", required=True)
    ap.add_argument("--voice", default="zh-CN-YunyangNeural")
    ap.add_argument("--rate", default="+0%")
    ap.add_argument("--volume", default="+0%")
    ap.add_argument("--gap", type=float, default=0.35, help="句间静音，秒")
    ap.add_argument("--lead", type=float, default=0.25, help="开场静音，秒")
    ap.add_argument("--max-cjk", type=int, default=18)
    ap.add_argument("--reuse", action="store_true", help="已有 wav 的句子跳过合成")
    a = ap.parse_args()

    try:
        import edge_tts  # noqa: F401
    except ImportError:
        print("缺 edge-tts：python -m pip install edge-tts（需要联网）")
        return 2

    lines = [x.strip() for x in Path(a.txt).read_text(encoding="utf-8").splitlines() if x.strip()]
    if not lines:
        print(f"{a.txt} 是空的")
        return 1
    slide_of = list(range(len(lines)))
    if a.map:
        m = json.loads(Path(a.map).read_text(encoding="utf-8"))
        if len(m["slide_of"]) != len(lines):
            print(f"map 与文本行数不一致: {len(m['slide_of'])} vs {len(lines)}")
            return 1
        slide_of = m["slide_of"]

    out = Path(a.out)
    seg_dir = out / "tts"
    seg_dir.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp(prefix="tts_"))

    cursor = a.lead
    segments, srt, parts = [], [], []
    if a.lead > 0:
        lead = tmp / "lead.wav"
        silence(lead, a.lead)
        parts.append(lead)
    for i, line in enumerate(lines):
        wav = seg_dir / f"{i:03d}.wav"
        if not (a.reuse and wav.exists() and wav.stat().st_size > 2000):
            mp3 = tmp / f"{i:03d}.mp3"
            try:
                asyncio.run(synth(line, a.voice, mp3, a.rate, a.volume))
            except Exception as e:  # noqa: BLE001
                print(f"第 {i + 1} 句合成失败（voice={a.voice}，需要联网）：{e}")
                print("已合成的句子留在 tts/ 下，加 --reuse 可从这里续跑。")
                return 2
            to_wav(mp3, wav)
        d = dur_of(wav)
        segments.append({"start": round(cursor, 3), "end": round(cursor + d, 3),
                         "text": line, "slide": slide_of[i]})
        cue = wrap_cue(line, a.max_cjk)
        srt.append(f"{len(srt) + 1}\n{ts(cursor)} --> {ts(cursor + d)}\n" + "\n".join(cue) + "\n")
        parts.append(wav)
        cursor += d
        gap = tmp / f"{i:03d}_gap.wav"
        silence(gap, a.gap)
        parts.append(gap)
        cursor += a.gap
        print(f"  {i + 1}/{len(lines)}  {d:.2f}s  {line[:24]}", flush=True)

    listing = tmp / "list.txt"
    listing.write_text("".join(f"file '{p.as_posix()}'\n" for p in parts), encoding="utf-8")
    narr = out / "narration.wav"
    subprocess.run([FF_PATH, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
                    "-i", str(listing), "-c:a", "pcm_s16le", "-ar", "24000", "-ac", "1",
                    str(narr)], check=True)

    total = dur_of(narr)
    timing = {"total": round(total, 3), "segments": segments,
              "voice": a.voice, "gap": a.gap}
    (out / "timing.json").write_text(json.dumps(timing, ensure_ascii=False, indent=2), encoding="utf-8")
    (out / "subtitles.srt").write_text("\n".join(srt), encoding="utf-8")
    print(f"OK {len(segments)} 句 / {total:.1f}s -> {narr}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

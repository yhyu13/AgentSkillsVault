# -*- coding: utf-8 -*-
"""Re-time one over-long segment with word timestamps, then split it by sentence.

    python refine_segment.py source/audio.wav transcript_clean.txt --line 46

Whisper occasionally emits one segment for a whole 30 s window when the speaker
never pauses. That is fine for reading and useless for cutting. This script
re-transcribes only that window with `word_timestamps=True`, groups words into
sentences at Chinese/Latin punctuation, and replaces the single line in place.

Refuses to run when the segment is shorter than --min-seconds (nothing to fix)
or when the re-run finds a wildly different word count (that means the slice is
wrong, not that the text is).
"""
import argparse
import re
import subprocess
import sys

import numpy as np
from faster_whisper import WhisperModel

LINE = re.compile(r"^\[(\d+\.\d+)-(\d+\.\d+)\]\s*(.+)$")
DEFAULT_PROMPT = "以下是一段中文讲解，可能夹带英文产品名与命令名。"
PUNCT = "。！？!?；;"


def to_audio(path):
    ff = subprocess.check_output(
        [sys.executable, "-c", "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"],
        text=True).strip()
    raw = subprocess.check_output([ff, "-i", path, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                                  stderr=subprocess.DEVNULL)
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("wav")
    ap.add_argument("transcript")
    ap.add_argument("--line", type=int, required=True, help="1-based line number to refine")
    ap.add_argument("--model", default="medium")
    ap.add_argument("--threads", type=int, default=8)
    ap.add_argument("--min-seconds", type=float, default=12.0)
    ap.add_argument("--prompt", default=DEFAULT_PROMPT)
    a = ap.parse_args()

    lines = open(a.transcript, encoding="utf-8").read().splitlines()
    idx = a.line - 1
    m = LINE.match(lines[idx].strip())
    if not m:
        print("line %d is not a timed segment" % a.line)
        return 2
    start, end = float(m.group(1)), float(m.group(2))
    if end - start < a.min_seconds:
        print("segment is %.1fs, nothing to refine" % (end - start))
        return 0

    audio = to_audio(a.wav)
    lo, hi = int(start * 16000), min(len(audio), int(end * 16000))
    model = WhisperModel(a.model, device="cpu", compute_type="int8", cpu_threads=a.threads)
    segments, info = model.transcribe(audio[lo:hi], language="zh", word_timestamps=True,
                                      beam_size=5, initial_prompt=a.prompt,
                                      condition_on_previous_text=False)
    words = [(w.start, w.end, w.word) for seg in segments for w in (seg.words or [])]
    if len(words) < 8:
        print("re-run produced %d words — slice or model is wrong" % len(words))
        return 1
    old_words = sum(1 for c in m.group(3) if '\u4e00' <= c <= '\u9fff')
    new_words = sum(1 for _, _, w in words if '\u4e00' <= w <= '\u9fff')
    if old_words and abs(new_words - old_words) / old_words > 0.25:
        print("word count moved %d -> %d; refusing to overwrite" % (old_words, new_words))
        return 1

    out, cur = [], []
    for s, e, w in words:
        cur.append((s, e, w))
        if w.strip() and w.strip()[-1] in PUNCT and len(cur) >= 6:
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    rows = []
    for group in out:
        s = start + group[0][0]
        e = start + group[-1][1]
        text = "".join(w for _, _, w in group).strip()
        if text:
            rows.append("[%.1f-%.1f] %s" % (s, e, text))

    lines[idx:idx + 1] = rows
    open(a.transcript, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("split into %d segments: %s" % (len(rows), " / ".join(r[:24] for r in rows)))
    return 0


if __name__ == "__main__":
    sys.exit(main())

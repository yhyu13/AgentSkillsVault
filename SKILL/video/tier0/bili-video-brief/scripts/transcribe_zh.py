# -*- coding: utf-8 -*-
"""Transcribe one Chinese chunk with faster-whisper (CPU int8).

    python transcribe_zh.py <chunk.wav> <out.txt> [--model medium]

- 16 kHz mono wav in, "[start-end] text" lines out.
- Language is pinned to zh: auto-detect flips to en on a chunk full of product
  names and then writes English-looking output for Chinese speech.
- initial_prompt carries the domain vocabulary so 专名 come out in their written
  form instead of pinyin homophones. It is a hint, not a fact source.
"""
import argparse
import subprocess
import sys
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

DEFAULT_PROMPT = "以下是一段中文讲解，可能夹带英文产品名与命令名。"


def to_audio(src):
    ff = subprocess.check_output(
        [sys.executable, "-c", "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"],
        text=True).strip()
    raw = subprocess.check_output(
        [ff, "-i", src, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
        stderr=subprocess.DEVNULL)
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--model", default="medium")
    ap.add_argument("--threads", type=int, default=6)
    ap.add_argument("--prompt", default=DEFAULT_PROMPT,
                    help="domain vocabulary for this episode; keep it under ~80 chars")
    ap.add_argument("--prompt-file", default="",
                    help="read the prompt from a UTF-8 file (one line) instead of --prompt")
    a = ap.parse_args()
    prompt = (Path(a.prompt_file).read_text(encoding="utf-8").strip()
              if a.prompt_file else a.prompt)

    audio = to_audio(a.src)
    if audio.size < 16000:
        raise SystemExit("chunk shorter than 1 s: %s" % a.src)
    model = WhisperModel(a.model, device="cpu", compute_type="int8",
                         cpu_threads=a.threads)
    segments, info = model.transcribe(
        audio, language="zh", vad_filter=True, beam_size=5,
        condition_on_previous_text=False, initial_prompt=prompt,
    )
    lines = []
    for s in segments:
        text = s.text.strip()
        if text:
            lines.append("[%.1f-%.1f] %s" % (s.start, s.end, text))
    if not lines:
        raise SystemExit("no speech recognised in %s" % a.src)
    with open(a.dst, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("OK %s segs=%d dur=%.1fs" % (a.dst, len(lines), audio.size / 16000))


if __name__ == "__main__":
    main()

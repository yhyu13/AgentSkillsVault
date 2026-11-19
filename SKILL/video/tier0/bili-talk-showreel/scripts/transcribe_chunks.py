# -*- coding: utf-8 -*-
"""Transcribe 115s English chunks with faster-whisper small.en.

One process per chunk so they can run in parallel. Writes chunk_XX.txt.
"""
import subprocess
import sys
import numpy as np
from faster_whisper import WhisperModel

def to_audio(src):
    ff = subprocess.check_output(
        [sys.executable, "-c", "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"],
        text=True).strip()
    raw = subprocess.check_output(
        [ff, "-i", src, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
        stderr=subprocess.DEVNULL)
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0

def main():
    src, dst = sys.argv[1], sys.argv[2]
    audio = to_audio(src)
    model = WhisperModel("small.en", device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        audio, language="en", vad_filter=True, beam_size=5,
        condition_on_previous_text=False,
    )
    lines = []
    for s in segments:
        lines.append("[%.1f-%.1f] %s" % (s.start, s.end, s.text.strip()))
    text = "\n".join(lines)
    with open(dst, "w", encoding="utf-8") as f:
        f.write(text)
    print("OK %s segs=%d lang=%s" % (dst, len(lines), info.language))

if __name__ == "__main__":
    main()

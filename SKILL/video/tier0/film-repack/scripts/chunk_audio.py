# -*- coding: utf-8 -*-
"""Stage 2a — one 16 kHz mono wav, cut into fixed-length chunks for ASR.

    python "$SKILL/scripts/chunk_audio.py" --project <dir> [--span 110]

Chunking exists for two reasons: whisper quality degrades on hour-long inputs,
and a 110 s chunk can be re-transcribed alone when one chunk fails the gate.
Exit 2 when source/source.mp4 is missing.
"""
import argparse
import json
import pathlib
import shutil
import subprocess
import sys
import wave


def ffmpeg() -> str:
    found = shutil.which("ffmpeg")
    if found:
        return found
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        raise SystemExit("ffmpeg not found; install ffmpeg or `pip install imageio-ffmpeg`")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    ap.add_argument("--span", type=float, default=110.0)
    args = ap.parse_args()
    root = pathlib.Path(args.project).expanduser().resolve()
    video = root / "source" / "source.mp4"
    if not video.exists():
        raise SystemExit("missing %s — run fetch_source.py first" % video)
    src = root / "source"
    wav = src / "audio16k.wav"
    subprocess.run([ffmpeg(), "-y", "-hide_banner", "-loglevel", "error", "-i", str(video),
                    "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", str(wav)], check=True)
    chunks = src / "chunks"
    chunks.mkdir(parents=True, exist_ok=True)
    for old in chunks.glob("chunk_*.wav"):
        old.unlink()
    with wave.open(str(wav), "rb") as w:
        sr, n = w.getframerate(), w.getnframes()
        per = int(args.span * sr)
        index = 0
        while index * per < n:
            w.setpos(index * per)
            frames = w.readframes(min(per, n - index * per))
            if not frames:
                break
            out = chunks / ("chunk_%02d.wav" % index)
            with wave.open(str(out), "wb") as p:
                p.setnchannels(1)
                p.setsampwidth(2)
                p.setframerate(sr)
                p.writeframes(frames)
            index += 1
    record_path = src / "source.json"
    if record_path.exists():
        record = json.loads(record_path.read_text(encoding="utf-8"))
        record["chunk_span_s"] = args.span
        record["chunks"] = index
        record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    print("audio %.2fs -> %d chunks of %.0fs in source/chunks/" % (n / sr, index, args.span))
    return 0


if __name__ == "__main__":
    sys.exit(main())

# -*- coding: utf-8 -*-
"""Stage 2b — transcribe every chunk with faster-whisper, in parallel.

    python "$SKILL/scripts/asr_chunks.py" --project <dir> --lang en [--model small]
                                 [--jobs 4] [--threads 6] [--force]

Writes source/asr/<lang>/chunk_NN.txt (`[start-end] text`, chunk-local seconds)
and chunk_NN.json (segment count, detected language, probability, audio seconds).
Finished chunks are skipped, so an interrupted run resumes instead of restarting.

The wav is decoded with `wave`, not through PyAV: faster-whisper 1.2.x calls
PyAV's `open(metadata_errors=…)`, which newer PyAV rejects, and the audio path
would fail before a single word is transcribed.

Exit 1 for bad input (no chunks found), 6 when a chunk produced zero segments (re-run that chunk
with --only NN and a larger model; do not paper over it in the transcript).
"""
import argparse
import json
import os
import pathlib
import sys
import time
import wave
from concurrent.futures import ProcessPoolExecutor, as_completed

_STATE = {}


def _init(model_name: str, threads: int):
    from faster_whisper import WhisperModel
    _STATE["model"] = WhisperModel(model_name, device="cpu", compute_type="int8",
                                   cpu_threads=threads)


def _one(job):
    chunk, out_dir, lang, force = job
    chunk = pathlib.Path(chunk)
    stem = chunk.stem
    txt = pathlib.Path(out_dir) / (stem + ".txt")
    meta = pathlib.Path(out_dir) / (stem + ".json")
    if not force and txt.exists() and txt.stat().st_size > 0 and meta.exists():
        return ("skip", stem, 0, json.loads(meta.read_text(encoding="utf-8")))
    with wave.open(str(chunk), "rb") as w:
        seconds = w.getnframes() / w.getframerate()
        raw = w.readframes(w.getnframes())
    import numpy as np
    audio = np.frombuffer(raw, np.int16).astype("float32") / 32768.0
    t0 = time.time()
    segments, info = _STATE["model"].transcribe(
        audio, language=lang, vad_filter=True, beam_size=5,
        condition_on_previous_text=False)
    lines = ["[%.1f-%.1f] %s" % (s.start, s.end, s.text.strip())
             for s in segments if s.text.strip()]
    txt.write_text("\n".join(lines) + "\n", encoding="utf-8")
    record = {"chunk": stem, "segments": len(lines), "audio_s": round(seconds, 2),
              "language": info.language, "language_probability": round(info.language_probability, 3),
              "model": os.environ.get("FILM_ASR_MODEL", ""), "wall_s": round(time.time() - t0, 1)}
    meta.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    return ("done", stem, len(lines), record)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    ap.add_argument("--lang", required=True, help="ISO code: en, zh, ja …")
    ap.add_argument("--model", default="small")
    ap.add_argument("--jobs", type=int, default=0)
    ap.add_argument("--threads", type=int, default=6)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--only", default="", help="comma list of chunk numbers, e.g. 3,7")
    args = ap.parse_args()

    root = pathlib.Path(args.project).expanduser().resolve()
    chunks = sorted((root / "source" / "chunks").glob("chunk_*.wav"))
    if not chunks:
        raise SystemExit("no chunks in source/chunks — run chunk_audio.py first")
    out = root / "source" / "asr" / args.lang
    out.mkdir(parents=True, exist_ok=True)
    if args.only:
        wanted = {int(x) for x in args.only.replace(" ", "").split(",") if x}
        chunks = [c for c in chunks if int(c.stem.split("_")[1]) in wanted]
        if not chunks:
            raise SystemExit("--only matched no chunk")

    jobs = args.jobs or max(1, min(4, (os.cpu_count() or 4) // args.threads))
    os.environ["FILM_ASR_MODEL"] = args.model
    print("model=%s lang=%s jobs=%d threads=%d chunks=%d"
          % (args.model, args.lang, jobs, args.threads, len(chunks)))
    work = [(str(c), str(out), args.lang, args.force) for c in chunks]
    empty = []
    t0 = time.time()
    with ProcessPoolExecutor(max_workers=jobs, initializer=_init,
                             initargs=(args.model, args.threads)) as pool:
        futures = {pool.submit(_one, job): job for job in work}
        for fut in as_completed(futures):
            status, stem, count, record = fut.result()
            print("  %-9s %s segs=%d %.0fs" % (status, stem, count,
                                               record.get("wall_s", 0)), flush=True)
            if count == 0:
                empty.append(stem)
    print("elapsed %.0fs" % (time.time() - t0))
    if empty:
        print("! zero segments: %s — re-run `--only %s` with --model medium before merging"
              % (", ".join(empty), ",".join(c.split("_")[1] for c in empty)))
        return 6
    return 0


if __name__ == "__main__":
    sys.exit(main())

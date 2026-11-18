#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Chunked Chinese transcription driver with resume.

Usage:
    python transcribe_all.py source/source.mp4 source/transcript [--model large-v3] [--chunk 115]
    python transcribe_all.py source/source.mp4 source/transcript --engine funasr

Why chunk: one 20-minute pass through a large model can be killed by the OS
without a traceback, and a kill loses everything. 115-second chunks keep memory
flat and let a rerun continue after `chunk_03.txt` instead of from zero.

Resume rule: a chunk file is skipped only when an `.asr_manifest.json` in the
output dir matches the current (engine, model, prompt, chunk size, source size):
chunks written by another engine or model are not the same transcript, and
mixing whisper chunks with funasr chunks produces a file that reads fine and is
wrong. A zero-byte file (crash mid-write) is always rewritten. The final transcript
is assembled from the files on disk, in filename order, never from an in-memory
list, so an interrupted run can be resumed by simply running the command again.

--engine funasr is forwarded to transcribe_zh.py for every chunk. Chunk files
written by either engine have the same line format, so resume works across a
switch: delete the chunk files if the old ones came from a different engine.
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LINE = re.compile(r"^\[(\d{2}):(\d{2})-(\d{2}):(\d{2})\]\s*(.*)$")


def ffmpeg():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


def duration(src):
    """Read the container header. The progress line prints time=N/A on some builds."""
    p = subprocess.run([ffmpeg(), "-i", src], stdout=subprocess.DEVNULL,
                       stderr=subprocess.PIPE, universal_newlines=True,
                       encoding="utf-8", errors="replace")
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", p.stderr)
    if not m:
        raise SystemExit("cannot read duration of %s" % src)
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))


def source_hash(path):
    """Cheap identity for the media: size + first/last 1 MB. Full hashing a 300 MB
    mp4 costs more than re-cutting the chunks."""
    size = os.path.getsize(path)
    h = hashlib.sha1(str(size).encode())
    with open(path, "rb") as f:
        h.update(f.read(1024 * 1024))
        if size > 2 * 1024 * 1024:
            f.seek(-1024 * 1024, os.SEEK_END)
            h.update(f.read(1024 * 1024))
    return h.hexdigest()[:16]


def build_chunks(src, outdir, size, stale_audio=False):
    total = duration(src)
    n = int(-(-total // size))
    paths = []
    for i in range(n):
        p = os.path.join(outdir, "audio_%02d.mp3" % (i + 1))
        paths.append(p)
        # audio chunks are only valid for one (source, chunk size) pair: reusing
        # them after a source swap runs the new offsets over the old audio
        if not stale_audio and os.path.exists(p) and os.path.getsize(p) > 4096:
            continue
        tmp = p + ".tmp.mp3"
        subprocess.check_call(
            [ffmpeg(), "-y", "-v", "error", "-ss", str(i * size),
             "-t", str(size), "-i", src, "-ac", "1", "-ar", "16000",
             "-b:a", "64k", tmp])
        # rename only after ffmpeg exits 0: an interrupted cut used to leave a
        # playable partial mp3 that a rerun happily reused
        os.replace(tmp, p)
    return paths, total, n


def manifest_for(args, total):
    return {
        "engine": args.engine,
        "model": args.model if args.engine == "whisper" else "paraformer-zh",
        "prompt": args.prompt or "",
        "chunk": args.chunk,
        "accept_lang": args.accept_lang,
        "source_size": os.path.getsize(args.src),
        "source_seconds": round(total, 2),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("outdir")
    ap.add_argument("--model", default="large-v3")
    ap.add_argument("--chunk", type=float, default=115.0)
    ap.add_argument("--prompt", default="")
    ap.add_argument("--accept-lang", default="zh")
    ap.add_argument("--engine", default="whisper", choices=("whisper", "funasr"),
                    help="forwarded to transcribe_zh.py")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    os.makedirs(args.outdir, exist_ok=True)
    stamp_path = os.path.join(args.outdir, ".asr_manifest.json")
    want = manifest_for(args, duration(args.src))
    want["source_hash"] = source_hash(args.src)
    have = None
    if os.path.exists(stamp_path):
        try:
            have = json.load(open(stamp_path, encoding="utf-8"))
        except ValueError:
            have = None
    # no manifest at all but audio on disk: the chunks cannot be shown to belong to
    # this source, so re-cut them (a missing manifest is not evidence of freshness)
    leftovers = [f for f in os.listdir(args.outdir) if re.match(r"audio_\d+\.mp3$", f)]
    stale_audio = bool(leftovers) and (
        have is None
        or have.get("source_hash") != want["source_hash"]
        or have.get("chunk") != want["chunk"])
    if have != want:
        stale = [f for f in os.listdir(args.outdir) if re.match(r"chunk_\d+\.txt$", f)]
        if stale:
            print("asr: 转写设置变了（%s -> %s），丢弃 %d 个旧 chunk"
                  % (have and have.get("engine", "?"), want["engine"], len(stale)))
            for f in stale:
                os.remove(os.path.join(args.outdir, f))
        with open(stamp_path, "w", encoding="utf-8") as f:
            json.dump(want, f, ensure_ascii=False, indent=1)
    if stale_audio:
        gone = [f for f in os.listdir(args.outdir) if re.match(r"audio_\d+\.mp3$", f)]
        print("asr: 音源或分段长度变了，重切 %d 个音频块" % len(gone))
        for f in gone:
            os.remove(os.path.join(args.outdir, f))

    paths, total, n = build_chunks(args.src, args.outdir, args.chunk, stale_audio)

    for i, p in enumerate(paths):
        dst = os.path.join(args.outdir, "chunk_%02d.txt" % (i + 1))
        if os.path.exists(dst) and os.path.getsize(dst) > 20 and not args.force:
            print("skip %s" % dst)
            continue
        cmd = [sys.executable, os.path.join(HERE, "transcribe_zh.py"),
               p, dst, "--model", args.model,
               "--offset", str(i * args.chunk),
               "--engine", args.engine]
        if i == len(paths) - 1:
            cmd.append("--allow-short")     # 片尾常是静音或一句话，不该判死
        if args.prompt:
            cmd += ["--prompt", args.prompt]
        if args.accept_lang != "zh":
            cmd += ["--accept-lang", args.accept_lang]
        subprocess.check_call(cmd)
        last = i == len(paths) - 1
        if not os.path.exists(dst):
            open(dst, "w", encoding="utf-8").close()
        if os.path.getsize(dst) <= 20 and not last:
            raise SystemExit("chunk %d produced no text; stop before assembling" % (i + 1))
        if os.path.getsize(dst) <= 20:
            print("chunk %d 是空稿（片尾静音），保留空文件" % (i + 1))

    merged = []
    for i in range(n):
        f = os.path.join(args.outdir, "chunk_%02d.txt" % (i + 1))
        if not os.path.exists(f):
            raise SystemExit("missing chunk %s" % f)
        body = open(f, encoding="utf-8").read().strip()
        if not body and i != n - 1:
            raise SystemExit("chunk %d is empty; only the last chunk may be silent" % (i + 1))
        if body:
            merged.append(body)

    body = "\n".join(merged) + "\n"
    out = os.path.join(args.outdir, "transcript_clean.txt")
    with open(out, "w", encoding="utf-8") as f:
        f.write(body)

    lines = [l for l in body.splitlines() if LINE.match(l)]
    chars = sum(len(LINE.match(l).group(5)) for l in lines)
    print("OK %s lines=%d chars=%d total=%.1fs chunks=%d"
          % (out, len(lines), chars, total, n))


if __name__ == "__main__":
    main()

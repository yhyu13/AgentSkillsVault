# -*- coding: utf-8 -*-
"""Stage 2d — refuse a transcript that ASR only pretended to produce.

    python "$SKILL/scripts/check_transcript.py" --project <dir> [--max-gap 25] [--lang en]

Six checks, each one attached to a real failure mode:
  coverage   every chunk file exists and is non-empty  (a silent chunk = missing minutes)
  gaps       no stamp gap longer than --max-gap        (music is fine; a dropped reel is not)
  rate       words per minute inside a speech band     (whisper loops give 400+ wpm)
  loops      no line repeated 3+ times in a row        (the classic hallucination)
  stamps     monotonic timestamps, text on every line   (merge bugs)
  language   mean detected language probability >= 0.60 (wrong --lang sounds fluent and is wrong)

This gate cannot tell whether a sentence is *correct*; it only proves the
transcript covers the film. Nothing here replaces listening to a spot check.
Exit 1 on any failure, listing the chunk to redo.
"""
import argparse
import json
import pathlib
import re
import sys

LINE_RE = re.compile(r"^\[([\d.]+)-([\d.]+)\]\s*(.+)$")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    ap.add_argument("--lang", default="en")
    ap.add_argument("--max-gap", type=float, default=25.0)
    ap.add_argument("--min-wpm", type=float, default=90.0)
    ap.add_argument("--max-wpm", type=float, default=240.0)
    args = ap.parse_args()
    root = pathlib.Path(args.project).expanduser().resolve()
    src = root / "source"
    transcript = src / "transcript.txt"
    if not transcript.exists():
        raise SystemExit("missing source/transcript.txt — run merge_transcript.py first")
    meta = json.loads((src / "transcript.meta.json").read_text(encoding="utf-8")) \
        if (src / "transcript.meta.json").exists() else {}
    total = meta.get("total_s")
    span = meta.get("chunk_span_s")

    rows, problems = [], []
    previous_end = 0.0
    worst_gap, worst_gap_at = 0.0, 0.0
    repeats, run, last_text = 0, 0, ""
    for raw in transcript.read_text(encoding="utf-8").splitlines():
        m = LINE_RE.match(raw.strip())
        if not m:
            if raw.strip():
                problems.append("unparsed line: %r" % raw[:80])
            continue
        a, b, text = float(m.group(1)), float(m.group(2)), m.group(3).strip()
        if not text:
            problems.append("empty text at %.1fs" % a)
        if b < a:
            problems.append("reversed stamp at %.1fs" % a)
        if a < previous_end - 0.5:
            problems.append("non-monotonic stamp at %.1fs" % a)
        gap = a - previous_end
        if gap > worst_gap:
            worst_gap, worst_gap_at = gap, previous_end
        previous_end = max(previous_end, b)
        run = run + 1 if text == last_text else 1
        last_text = text
        if run == 3:
            repeats += 1
            problems.append("line repeated 3x near %.1fs: %r" % (a, text[:50]))
        rows.append((a, b, text))

    if not rows:
        print("FAIL: transcript has no timestamped lines")
        return 1
    duration = max(total or 0.0, rows[-1][1])
    words = sum(len(t.split()) for _, _, t in rows)
    wpm = words / (duration / 60.0) if duration else 0.0

    # chunk coverage
    chunk_dir = src / "asr" / args.lang
    chunk_files = sorted(chunk_dir.glob("chunk_*.txt"))
    empty_chunks = [p.name for p in chunk_files if not p.read_text(encoding="utf-8").strip()]
    probs = []
    for p in sorted(chunk_dir.glob("chunk_*.json")):
        try:
            probs.append(float(json.loads(p.read_text(encoding="utf-8"))
                              .get("language_probability") or 0))
        except Exception:
            pass
    mean_prob = sum(probs) / len(probs) if probs else None
    expected_chunks = int(round(total / span)) if (total and span) else len(chunk_files)

    fails = []
    if empty_chunks:
        fails.append("empty chunks: %s" % ", ".join(empty_chunks))
    if len(chunk_files) < expected_chunks:
        fails.append("only %d of %d chunk files present" % (len(chunk_files), expected_chunks))
    if worst_gap > args.max_gap:
        fails.append("gap %.1fs at %.1fs (limit %.0fs)" % (worst_gap, worst_gap_at, args.max_gap))
    if not args.min_wpm <= wpm <= args.max_wpm:
        fails.append("words/min %.0f outside %.0f–%.0f" % (wpm, args.min_wpm, args.max_wpm))
    if repeats:
        fails.append("%d repeated-line loops" % repeats)
    if mean_prob is not None and mean_prob < 0.60:
        fails.append("mean language probability %.2f — wrong --lang?" % mean_prob)
    if problems:
        fails.extend(problems[:5])

    print("lines=%d words=%d duration=%.1fs wpm=%.0f longest_gap=%.1fs@%.1fs"
          % (len(rows), words, duration, wpm, worst_gap, worst_gap_at))
    print("chunks=%d/%d language_probability=%s"
          % (len(chunk_files), expected_chunks,
             "n/a" if mean_prob is None else "%.2f" % mean_prob))
    if fails:
        for f in fails:
            print("FAIL %s" % f)
        if empty_chunks or len(chunk_files) < expected_chunks:
            print('next: python "$SKILL/scripts/asr_chunks.py" --project . --lang %s '
                  '--only <n> --model medium' % args.lang)
        return 1
    print("PASS transcript gate")
    return 0


if __name__ == "__main__":
    sys.exit(main())

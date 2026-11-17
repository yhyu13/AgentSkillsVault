# -*- coding: utf-8 -*-
"""Stage 2c — merge chunk transcripts onto the film clock.

    python "$SKILL/scripts/merge_transcript.py" --project <dir> [--lang en] [--span 110]

chunk i covers [i*span, (i+1)*span), so every line gains i*span. The span is read
from source/source.json when chunk_audio.py recorded it, otherwise --span.
Writes source/transcript.txt plus source/transcript.meta.json (line and word
counts, coverage, first/last stamp) so later stages never guess.
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
    ap.add_argument("--span", type=float, default=0.0)
    args = ap.parse_args()
    root = pathlib.Path(args.project).expanduser().resolve()
    src = root / "source"
    meta_path = src / "source.json"
    span = args.span
    total = None
    if meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        total = (meta.get("actual") or {}).get("duration_s")
        span = span or float(meta.get("chunk_span_s") or 0)
    if not span:
        raise SystemExit("no chunk span on record — pass --span (must equal chunk_audio.py --span)")
    out_dir = src / "asr" / args.lang
    files = sorted(out_dir.glob("chunk_*.txt"))
    if not files:
        raise SystemExit("no transcripts in %s" % out_dir)
    rows = []
    for path in files:
        offset = int(path.stem.split("_")[1]) * span
        for raw in path.read_text(encoding="utf-8").splitlines():
            m = LINE_RE.match(raw.strip())
            if not m:
                continue
            a, b, text = float(m.group(1)) + offset, float(m.group(2)) + offset, m.group(3).strip()
            if not text:
                continue
            rows.append((a, b, text))
    # Chunk seams: whisper's last segment in chunk N can end after the first segment of
    # chunk N+1 starts. Sort by start and clip the overlap, or the shipped transcript
    # has a clock that goes backwards and every later citation inherits the drift.
    rows.sort(key=lambda r: (r[0], r[1]))
    lines, words, last_end = [], 0, 0.0
    for a, b, text in rows:
        if b <= a:
            continue
        if a < last_end - 0.4:
            if b <= last_end + 0.4:
                continue
            a = last_end
        lines.append("[%.1f-%.1f] %s" % (a, b, text))
        words += len(text.split())
        last_end = max(last_end, b)
    dest = src / "transcript.txt"
    dest.write_text("\n".join(lines) + "\n", encoding="utf-8")
    record = {"lang": args.lang, "chunk_span_s": span, "chunks": len(files),
              "lines": len(lines), "words": words,
              "first": lines[0] if lines else None, "last": lines[-1] if lines else None,
              "total_s": total}
    (src / "transcript.meta.json").write_text(
        json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote source/transcript.txt  lines=%d words=%d" % (len(lines), words))
    print("first %s" % record["first"])
    print("last  %s" % record["last"])
    return 0


if __name__ == "__main__":
    sys.exit(main())

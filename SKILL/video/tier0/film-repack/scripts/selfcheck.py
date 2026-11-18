# -*- coding: utf-8 -*-
"""Is this repack actually finished, or does it just look finished?

    python "$SKILL/scripts/selfcheck.py" --project <dir>

Reads what the pipeline wrote and compares it with what the contract promises.
It does not re-render, re-transcribe or re-time anything; it refuses to call a
project done while an artifact or a report is missing, empty or failing.

Checks
  source      source.json + source.mp4, real dimensions recorded, sha present
  transcript  transcript.txt lines, last stamp near the film length, gate report
  notes       notes/中文总结.md exists with at least 10 [mm:ss] citations
  deck        deck.json valid, .pptx present, qa/report.json passed, PNG count == slides
  reel        narration.json complete, timings complete, timeline DUR set,
              final.mp4 present, reel/qa/report.json passed
Exit 1 with one line per failed check.
"""
import argparse
import hashlib
import json
import pathlib
import re
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import deckkit                                          # noqa: E402

STAMP = re.compile(r"\[(\d{1,2}):(\d{2})(?:[–-](\d{1,2}):(\d{2}))?\]")


def sha(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path: pathlib.Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    ap.add_argument("--min-citations", type=int, default=10)
    args = ap.parse_args()
    root = pathlib.Path(args.project).expanduser().resolve()
    fails, lines = [], []

    def check(label, ok, detail=""):
        lines.append(("PASS" if ok else "FAIL", label, detail))
        if not ok:
            fails.append(label)

    # source
    source = load(root / "source" / "source.json")
    video = root / "source" / "source.mp4"
    actual = (source or {}).get("actual") or {}
    check("source", bool(source) and video.exists() and actual.get("height"),
          "actual %sx%s %.1fs" % (actual.get("width"), actual.get("height"),
                                  actual.get("duration_s") or 0))

    # transcript
    lang = (load(root / "source" / "transcript.meta.json") or {}).get("lang") or "en"
    gate = subprocess.run([sys.executable, str(pathlib.Path(__file__).with_name("check_transcript.py")),
                           "--project", str(root), "--lang", lang],
                          capture_output=True, text=True, encoding="utf-8", errors="replace")
    transcript = root / "source" / "transcript.txt"
    rows = 0
    last = 0.0
    if transcript.exists():
        for raw in transcript.read_text(encoding="utf-8").splitlines():
            m = re.match(r"^\[([\d.]+)-([\d.]+)\]", raw)
            if m:
                rows += 1
                last = max(last, float(m.group(2)))
    span = float(actual.get("duration_s") or 0)
    covered = bool(span) and last >= span * 0.85
    check("transcript", rows > 0 and covered and gate.returncode == 0,
          "%d lines, last stamp %.0fs of %.0fs, gate exit %d"
          % (rows, last, span, gate.returncode))

    # notes
    notes = root / "notes" / "中文总结.md"
    text = notes.read_text(encoding="utf-8") if notes.exists() else ""
    stamps = len(STAMP.findall(text))
    source_owner = (source or {}).get("owner") or ""
    try:
        early = deckkit.read(root)
    except (SystemExit, json.JSONDecodeError, ValueError):
        early = {}
    if not isinstance(early, dict):
        early = {}
    deck_owner = ((early.get("source") or {}).get("owner")) or ""
    # bilibili gives an uploader; a local file does not. Only enforce it when it exists.
    local_source = ((source or {}).get("origin") == "local")
    provenance = ((deck_owner == source_owner and source_owner in text)
                  if (source_owner and not local_source) else True)
    check("notes", stamps >= args.min_citations and provenance,
          "%d timecode citations (need %d), owner %r in notes+deck: %s"
          % (stamps, args.min_citations, source_owner, provenance))

    # deck
    spec = None
    try:
        spec = deckkit.load(root)
        deck_ok = True
    except (SystemExit, json.JSONDecodeError, ValueError):
        deck_ok = False
    if spec is not None and not isinstance(spec, dict):
        spec, deck_ok = None, False
    pptx_files = list((root / "deck").glob("*.pptx")) if (root / "deck").is_dir() else []
    report = load(root / "deck" / "qa" / "report.json")
    pngs = list((root / "deck" / "qa").glob("slide-*.png")) if (root / "deck" / "qa").is_dir() else []
    deck_json = root / "deck" / "deck.json"
    deck_sha = sha(deck_json) if deck_json.exists() else ""
    build_report = load(root / "deck" / "build-report.json") or {}
    # a report is only evidence for the deck it measured; comparing hashes removes the
    # wall-clock window where an edited deck.json looked "newer enough" to pass
    fresh_deck = bool(report) and report.get("deck_sha256") == deck_sha
    # the shipped .pptx must be the one build_deck.py made from the current deck.json
    fresh_pptx = bool(build_report) and build_report.get("deck_sha256") == deck_sha         and any(f.exists() and (build_report.get("file") or "").endswith(f.name)
                and build_report.get("pptx_sha256") == sha(f) for f in pptx_files)
    no_overflow = bool(report) and all(not s.get("overflow") for s in (report or {}).get("slides") or [])
    missing_images = [s["image"] for s in (spec or {}).get("slides", [])
                      if s.get("image") and not (root / s["image"]).exists()]
    deck_pass = (deck_ok and bool(pptx_files) and bool(report)
                 and report.get("passed") is True and no_overflow and not missing_images
                 and fresh_deck and fresh_pptx
                 and len(pngs) >= len(spec["slides"]))
    check("deck", bool(deck_pass),
          "%d slides, %d pptx, %d png, report=%s, missing images=%d"
          % (len(spec["slides"]) if spec else 0, len(pptx_files), len(pngs),
             (report or {}).get("passed"), len(missing_images)))

    # reel
    narration = load(root / "reel" / "narration.json")
    timings = load(root / "reel" / "audio" / "timings.json")
    timeline = load(root / "reel" / "timeline.json")
    reel_report = load(root / "reel" / "qa" / "report.json")
    final = root / "reel" / "out" / "final.mp4"
    segs = (narration or {}).get("segments") or []
    timed = (timings or {}).get("segments") or []
    narration_ok = bool(segs) and all(
        (s.get("text") or "").strip()
        and len(s.get("beats") or []) >= 1
        and (s.get("timecode") or "").strip() for s in segs)
    timings_ok = bool(timed) and not (timings or {}).get("incomplete") \
        and len(timed) == len(segs)
    duration_ok = bool(timeline) and 0 < float(timeline.get("total") or 0) <= 1200
    reel_report_path = root / "reel" / "qa" / "report.json"
    timeline_path = root / "reel" / "timeline.json"
    fresh_reel = (bool(reel_report) and final.exists() and timeline_path.exists()
                  and reel_report.get("timeline_sha256") == sha(timeline_path)
                  and reel_report.get("video_sha256") == sha(final))
    page_ok = (root / "reel" / "index.html").exists() and (root / "reel" / "stage.js").exists()
    no_fails = bool(reel_report) and not (reel_report or {}).get("fails")
    reel_ok = (narration_ok and timings_ok and duration_ok and final.exists()
               and page_ok and fresh_reel and no_fails
               and bool(reel_report) and reel_report.get("passed") is True)
    check("reel", reel_ok,
          "%d segments, %d timed, DUR %.1fs, page=%s, report=%s, fresh=%s"
          % (len(segs), len(timed), float((timeline or {}).get("total") or 0),
             page_ok, (reel_report or {}).get("passed"), fresh_reel))

    width = max(len(a) for a, _, _ in lines)
    for state, label, detail in lines:
        print("%-4s %-*s  %s" % (state, width, label, detail))
    if fails:
        print("not finished: %s" % ", ".join(fails))
        return 1
    print("PASS selfcheck — transcript, notes, deck and reel all present and passing")
    return 0


if __name__ == "__main__":
    sys.exit(main())

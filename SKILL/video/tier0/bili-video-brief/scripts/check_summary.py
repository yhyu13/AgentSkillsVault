# -*- coding: utf-8 -*-
"""Check that a summary actually points back at the transcript.

    python check_summary.py 01-摘要与口径.md --transcript source/transcript/transcript_clean.txt --duration 562

A summary is only "verifiable" if three things hold:
  * it has the four required sections;
  * every MM:SS it cites falls inside the video;
  * every 「quoted line」 can be found in the transcript (punctuation and
    spaces ignored, so a corrected comma does not count as a mismatch).

Failing here is cheap. Failing after the deck and the narrated cut are built is
not, because both inherit the wrong claim.

Exit 0 = pass, 1 = defects, 2 = cannot read the inputs.
"""
import argparse
import re
import sys
from pathlib import Path

SECTIONS = ["一分钟版", "分章要点", "关键概念", "口径", "未核验"]
STAMP = re.compile(r"(\d{1,2}):(\d{2})")
QUOTE = re.compile(r"「([^」]{4,})」|“([^”]{4,})”")
CJK = re.compile(r"[\u4e00-\u9fff]")


def norm(text):
    return "".join(CJK.findall(text))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("summary")
    ap.add_argument("--transcript", required=True)
    ap.add_argument("--duration", type=float, default=0)
    ap.add_argument("--min-stamps", type=int, default=5)
    ap.add_argument("--allow-short-quotes", action="store_true",
                    help="permit up to 3 quotes shorter than 6 Chinese characters")
    a = ap.parse_args()

    sp, tp = Path(a.summary), Path(a.transcript)
    if not sp.is_file() or not tp.is_file():
        print("missing input: %s" % (sp if not sp.is_file() else tp))
        return 2
    text = sp.read_text(encoding="utf-8")
    ttext = tp.read_text(encoding="utf-8")
    haystack = norm(ttext)
    errors = []

    for s in SECTIONS:
        if s not in text:
            errors.append("missing section: %s" % s)

    stamps = [(int(h), int(m)) for h, m in STAMP.findall(text)]
    secs = [h * 60 + m for h, m in stamps]
    if len(secs) < a.min_stamps:
        errors.append("only %d timestamps; the summary is not anchored" % len(secs))
    if a.duration:
        late = [s for s in secs if s > a.duration + 1]
        if late:
            errors.append("timestamp beyond the video (%ds > %ds): %s"
                          % (max(late), int(a.duration),
                             ", ".join("%d:%02d" % (s // 60, s % 60) for s in late[:4])))

    # every chapter heading after 分章要点 should carry at least one timestamp
    if "分章要点" in text:
        block = text.split("分章要点", 1)[1]
        for stop in ("关键概念", "口径", "未核验"):
            block = block.split(stop, 1)[0]
        chapters = [c for c in re.split(r"^#{2,3} ", block, flags=re.M)[1:] if c.strip()]
        bare = [(c.splitlines() or [""])[0].strip() for c in chapters if not STAMP.search(c)]
        if chapters and len(bare) == len(chapters):
            errors.append("no chapter carries a timestamp")
        elif bare:
            errors.append("%d chapter(s) without a timestamp: %s"
                          % (len(bare), "; ".join(bare[:3])))

    quotes = [a or b for a, b in QUOTE.findall(text)]
    missing, short = [], []
    for q in quotes:
        key = norm(q)
        if len(key) < 6:
            short.append(q)
            continue
        # the whole quote must exist, not just its opening words: a real
        # prefix with an invented tail is the exact failure this is for
        if key not in haystack:
            missing.append(q[:24])
    if missing:
        errors.append("%d quote(s) not found in the transcript: %s"
                      % (len(missing), "; ".join(missing[:3])))
    if short and not a.allow_short_quotes:
        if len(short) > 3:
            errors.append("%d quotes are too short to verify (>3): %s — quote a whole "
                          "sentence, or pass --allow-short-quotes and own the risk"
                          % (len(short), "; ".join(short[:3])))
        else:
            print("note: %d short quote(s) not checked (fewer than 6 Chinese characters): %s"
                  % (len(short), "; ".join(short[:2])))

    if errors:
        print("\n".join(errors))
        return 1
    print("OK sections=%d stamps=%d quotes=%d" % (len(SECTIONS), len(secs), len(quotes)))
    return 0


if __name__ == "__main__":
    sys.exit(main())

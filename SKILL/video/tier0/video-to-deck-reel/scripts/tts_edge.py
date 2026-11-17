# -*- coding: utf-8 -*-
"""Synthesize reel/narration.json with edge-tts and record the real durations.

    python tts_edge.py <project> [--voice zh-CN-YunyangNeural] [--only s03,s07]

Reads   <project>/reel/narration.json
Writes  <project>/reel/audio/narration/<id>.mp3
        <project>/reel/audio/timings.json      (characters + measured seconds)

Rules that keep this honest
  * Never estimate a duration: every `seconds` comes from ffmpeg reading the
    file that was just written.
  * Never change the speaking rate to fix a length problem. rate is echoed into
    timings.json and a non-zero rate is reported, so a rewrite (not a speed-up)
    is the visible fix.
  * Three attempts per segment with backoff: edge-tts fails transiently and a
    half-written mp3 would poison the timeline.
  * Reuse is keyed on a hash of (text, voice, rate) per segment, not on "the id
    is not in --only". Before this, changing the voice or editing an unlisted
    segment kept the old mp3 while timings.json claimed the new text and voice:
    new subtitles over old audio, and nothing in the pipeline could see it.
"""
import argparse
import asyncio
import hashlib
import json
import os
import re
import subprocess
import sys

import edge_tts

HERE = os.path.dirname(os.path.abspath(__file__))


def ffmpeg():
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def duration(path):
    p = subprocess.run([ffmpeg(), "-i", path], stdout=subprocess.DEVNULL,
                       stderr=subprocess.PIPE, universal_newlines=True,
                       encoding="utf-8", errors="replace")
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", p.stderr)
    if not m:
        raise SystemExit("ffmpeg cannot read %s: %s" % (path, p.stderr[-200:]))
    h, mi, s = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(s)


async def synth(text, voice, rate, path):
    last = None
    for attempt in range(3):
        try:
            await edge_tts.Communicate(text, voice, rate=rate).save(path)
            if os.path.getsize(path) < 2000:
                raise RuntimeError("output under 2 KB")
            return
        except Exception as exc:                      # network / throttle
            last = exc
            await asyncio.sleep(2 + attempt * 3)
    raise SystemExit("edge-tts failed 3x on %s: %s" % (os.path.basename(path), last))


async def main_async(args):
    root = args.project
    spec = json.load(open(os.path.join(root, "reel", "narration.json"), encoding="utf-8"))
    voice = args.voice or spec.get("voice") or "zh-CN-YunyangNeural"
    rate = spec.get("rate") or "+0%"
    outdir = os.path.join(root, "reel", "audio", "narration")
    os.makedirs(outdir, exist_ok=True)

    only = set(x.strip() for x in args.only.split(",")) if args.only else None
    if only:
        known = {seg.get("id") for seg in spec["segments"]}
        unknown = sorted(x for x in only if x not in known)
        if unknown:
            # a typo made --only a no-op that exited 0 and reused every key
            raise SystemExit("--only 里有不存在的 id：%s（现有 %s）"
                             % (", ".join(unknown), ", ".join(sorted(known))))
    old = {}
    tpath = os.path.join(root, "reel", "audio", "timings.json")
    if os.path.exists(tpath):
        for seg in json.load(open(tpath, encoding="utf-8"))["segments"]:
            old[seg["id"]] = seg

    def seg_key(seg):
        raw = chr(31).join([seg["text"], voice, rate])
        return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]

    timings = []
    for seg in spec["segments"]:
        sid = (seg.get("id") or "").strip()
        if not sid or not re.fullmatch(r"[A-Za-z0-9_-]{1,16}", sid):
            raise SystemExit("id 不能当文件名：%r（只允许字母数字下划线短横线，1-16 位）" % seg.get("id"))
        seg["id"] = sid
        path = os.path.join(outdir, sid + ".mp3")
        chars = len(re.findall(r"[\u3400-\u9fff]", seg["text"]))
        want = seg_key(seg)
        prev = old.get(seg["id"]) or {}
        touched = only is None or seg["id"] in only
        reuse = (not touched and os.path.exists(path) and prev.get("key") == want)
        if not reuse:
            await synth(seg["text"], voice, rate, path)
        secs = duration(path)
        entry = {
            "id": seg["id"], "chapter": seg["chapter"], "text": seg["text"],
            "chars": chars, "seconds": round(secs, 3),
            "cps": round(chars / secs, 2) if secs else 0.0,
            "file": "reel/audio/narration/%s.mp3" % seg["id"],
            "key": want,
        }
        for key in ("visual", "tags", "metric"):      # picture metadata travels
            if key in seg:                            # with the segment, so the
                entry[key] = seg[key]                 # page never re-guesses it
        timings.append(entry)
        print("%-4s %6.2fs %4d字 %5.2f字/秒 %s"
              % (seg["id"], secs, chars, chars / secs if secs else 0, seg["chapter"]))

    total_chars = sum(t["chars"] for t in timings)
    total_secs = sum(t["seconds"] for t in timings)
    with open(os.path.join(root, "reel", "narration.json"), "rb") as fh:
        narr_sha = hashlib.sha1(fh.read()).hexdigest()[:16]
    out = {"voice": voice, "rate": rate, "narration_sha": narr_sha,
           "chars": total_chars,
           "seconds": round(total_secs, 3),
           "cps": round(total_chars / total_secs, 2), "segments": timings}
    json.dump(out, open(tpath, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    est = total_chars / 5.0
    print("TOTAL %.2fs  %.2f字/秒  (5.0字/秒 估算 %.0fs, 偏差 %+.0f%%)"
          % (total_secs, total_chars / total_secs, est, (total_secs - est) / est * 100))
    if rate not in ("+0%", "0%", "", None):
        print("WARN rate=%s：长度问题用改稿解决，不加速" % rate)
    if abs(total_secs - est) / est > 0.20:
        print("WARN 实测与估算相差超过 20%%，先改稿再合成")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--voice", default="")
    ap.add_argument("--only", default="")
    return asyncio.run(main_async(ap.parse_args()))


if __name__ == "__main__":
    sys.exit(main())

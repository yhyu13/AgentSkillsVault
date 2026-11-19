# -*- coding: utf-8 -*-
"""Synthesize narration.json with edge-tts and record real durations."""
import asyncio
import json
import os
import re
import subprocess
import sys

import edge_tts

if len(sys.argv) < 2:
    raise SystemExit("usage: tts_edge.py <project-dir>   (the dir that holds reel/)")
ROOT = os.path.abspath(sys.argv[1])
if not os.path.isfile(os.path.join(ROOT, "reel", "narration.json")):
    raise SystemExit("no reel/narration.json under %s — pass the project dir" % ROOT)
NARR = os.path.join(ROOT, "reel", "narration.json")
OUT = os.path.join(ROOT, "reel", "audio", "narration")


def ffmpeg():
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def duration(path):
    p = subprocess.run([ffmpeg(), "-i", path], capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", p.stderr)
    if not m:
        raise RuntimeError(p.stderr[-300:])
    h, mi, s = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(s)


async def synth(voice, rate, seg, path):
    comm = edge_tts.Communicate(seg["text"], voice, rate=rate)
    await comm.save(path)


async def main():
    os.makedirs(OUT, exist_ok=True)
    spec = json.load(open(NARR, encoding="utf-8"))
    timings = []
    for seg in spec["segments"]:
        path = os.path.join(OUT, seg["id"] + ".mp3")
        await synth(spec["voice"], spec["rate"], seg, path)
        dur = duration(path)
        chars = len(seg["text"])
        timings.append({
            "id": seg["id"], "chapter": seg["chapter"], "text": seg["text"],
            "chars": chars, "seconds": round(dur, 2),
            "cps": round(chars / dur, 2), "file": path,
        })
        print("%s  %5.2fs  %d字  %.2f字/秒" % (seg["id"], dur, chars, chars / dur))
    total_c = sum(t["chars"] for t in timings)
    total_s = sum(t["seconds"] for t in timings)
    out = {"voice": spec["voice"], "rate": spec["rate"],
           "chars": total_c, "seconds": round(total_s, 2),
           "cps": round(total_c / total_s, 2), "segments": timings}
    dest = os.path.join(ROOT, "reel", "audio", "timings.json")
    json.dump(out, open(dest, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("TOTAL %.2fs  %.2f字/秒" % (total_s, total_c / total_s))


if __name__ == "__main__":
    asyncio.run(main())

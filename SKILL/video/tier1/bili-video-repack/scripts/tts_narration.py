# -*- coding: utf-8 -*-
"""Synthesize the narration with MiniMax TTS and record real durations.

Flow: narration.json -> batch_text_to_audio (<=10 per call) -> get_asset_url
-> download mp3 -> measure duration with the bundled ffmpeg -> timings.json
"""
import json
import os
import re
import subprocess
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import mcode_cli  # noqa: E402

ROOT = os.path.dirname(HERE)
NARR = os.path.join(ROOT, "reel", "narration.json")
OUT = os.path.join(ROOT, "reel", "audio", "narration")
TOOL = "connector__matrix__batch_text_to_audio"


def ffmpeg():
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def duration(path):
    p = subprocess.run([ffmpeg(), "-i", path], capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", p.stderr)
    if not m:
        raise RuntimeError("cannot read duration: %s" % p.stderr[-300:])
    h, mi, s = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(s)


def download(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=180) as resp:
        data = resp.read()
    if len(data) < 5000:
        raise RuntimeError("suspiciously small audio: %d bytes" % len(data))
    with open(path, "wb") as f:
        f.write(data)
    return len(data)


def main():
    os.makedirs(OUT, exist_ok=True)
    spec = json.load(open(NARR, encoding="utf-8"))
    voice = spec["voice"]
    segs = spec["segments"]

    reqs = []
    for s in segs:
        reqs.append({
            "text": s["text"],
            "voice_id": voice["voice_id"],
            "speed": voice["speed"],
            "pitch": voice["pitch"],
            "emotion": voice["emotion"],
            "output_file": "%s.mp3" % s["id"],
        })

    res = mcode_cli.mcode_json(["connector", "call", TOOL, "--args",
                                json.dumps({"requests": reqs}, ensure_ascii=False)], timeout=1200)
    ok = res.get("success_items", [])
    print("success=%d failed=%s" % (len(ok), res.get("failed_items")))

    timings = []
    for item, seg in zip(ok, segs):
        url_data = mcode_cli.mcode_json(["get-asset-url", item["node_id"]], timeout=300)
        url = url_data.get("download_url") or url_data.get("url") or url_data.get("temp_url")
        path = os.path.join(OUT, seg["id"] + ".mp3")
        size = download(url, path)
        dur = duration(path)
        timings.append({"id": seg["id"], "chapter": seg["chapter"], "text": seg["text"],
                        "chars": len(seg["text"]), "file": path, "bytes": size,
                        "duration": round(dur, 3), "node_id": item["node_id"]})
        print("%s  %6.2fs  %5d chars  %.2f 字/秒" % (seg["id"], dur, len(seg["text"]), len(seg["text"]) / dur))

    total = sum(t["duration"] for t in timings)
    with open(os.path.join(ROOT, "reel", "audio", "timings.json"), "w", encoding="utf-8") as f:
        json.dump({"voice": voice, "total": round(total, 3), "segments": timings}, f,
                  ensure_ascii=False, indent=2)
    print("TOTAL %.2fs  (%.1f 字, %.2f 字/秒)" % (
        total, sum(t["chars"] for t in timings), sum(t["chars"] for t in timings) / total))


if __name__ == "__main__":
    main()

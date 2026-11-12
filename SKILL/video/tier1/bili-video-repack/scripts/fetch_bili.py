# -*- coding: utf-8 -*-
"""Download a Bilibili video + audio via the public API and DASH streams.

    python fetch_bili.py <url> [-o <dir>] [--quality best|720|480]

Works on b23.tv short links and full /video/BV... URLs. No login needed for
720p video + ~90 kbps AAC audio; login-gated videos raise with the API message.

Output: <dir>/source.mp4, <dir>/source.m4a, <dir>/source.meta.json
"""
import argparse
import json
import os
import re
import subprocess
import sys
import urllib.request

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0 Safari/537.36")
HEADERS = {"User-Agent": UA, "Referer": "https://www.bilibili.com/"}
QN = {"best": 80, "720": 64, "480": 32}


def ffmpeg():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


def fetch_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def resolve(url):
    """Follow the short-link redirect; the BV id lives in the final URL."""
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        final = resp.geturl()
    m = re.search(r"(BV[0-9A-Za-z]{10})", final)
    if not m:
        raise SystemExit("cannot find a BV id in %s" % final)
    return m.group(1), final


def curl(url, out):
    cmd = ["curl.exe" if os.name == "nt" else "curl", "-L", "--fail", "--silent",
           "--show-error", "-A", UA, "-e", "https://www.bilibili.com/", "-o", out, url]
    subprocess.run(cmd, check=True)
    size = os.path.getsize(out)
    # 100 KB floor: an error page is a few KB, a real stream is tens of MB
    if size < 100_000:
        raise SystemExit("payload too small (%d bytes) — probably an error page" % size)
    return size


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("-o", "--out", default=".")
    ap.add_argument("--quality", default="best", choices=list(QN))
    a = ap.parse_args()

    os.makedirs(a.out, exist_ok=True)
    bvid, final_url = resolve(a.url)
    view = fetch_json("https://api.bilibili.com/x/web-interface/view?bvid=%s" % bvid)
    if view.get("code") != 0:
        raise SystemExit("view API: %s" % view.get("message"))
    d = view["data"]
    cid, title = d["cid"], d["title"]
    print("bvid=%s  title=%s  %ss  up=%s" % (bvid, title, d["duration"], d["owner"]["name"]))

    pu = fetch_json("https://api.bilibili.com/x/player/playurl?bvid=%s&cid=%s&qn=%d"
                    "&fnval=16&fnver=0&fourk=0" % (bvid, cid, QN[a.quality]))
    if pu.get("code") != 0:
        raise SystemExit("playurl API: %s" % pu.get("message"))
    dash = pu["data"].get("dash") or {}
    vids, auds = dash.get("video") or [], dash.get("audio") or []
    if not vids or not auds:
        raise SystemExit("no DASH streams — the video is login-gated (need SESSDATA)")

    v = max(vids, key=lambda s: s.get("bandwidth", 0))
    au = max(auds, key=lambda s: s.get("bandwidth", 0))

    v_raw = os.path.join(a.out, "video_raw.m4s")
    a_raw = os.path.join(a.out, "audio_raw.m4s")
    vb = curl(v["baseUrl"], v_raw)
    ab = curl(au["baseUrl"], a_raw)
    with open(v_raw, "rb") as f:
        if b"ftyp" not in f.read(12):
            raise SystemExit("bad video header — retry with a fresh playurl call")

    exe = ffmpeg()
    mp4 = os.path.join(a.out, "source.mp4")
    m4a = os.path.join(a.out, "source.m4a")
    subprocess.run([exe, "-y", "-i", v_raw, "-i", a_raw, "-c", "copy", mp4], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run([exe, "-y", "-i", a_raw, "-vn", "-c:a", "copy", m4a], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    meta = {
        "bvid": bvid, "aid": d["aid"], "cid": cid, "title": title,
        "duration_sec": d["duration"], "owner": d["owner"]["name"],
        "source_url": a.url, "resolved_url": final_url,
        "video_stream": {"id": v.get("id"), "bandwidth": v.get("bandwidth")},
        "audio_stream": {"id": au.get("id"), "bandwidth": au.get("bandwidth")},
        "bytes": {"video": vb, "audio": ab},
        "mp4": mp4, "m4a": m4a,
    }
    with open(os.path.join(a.out, "source.meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    for p in (v_raw, a_raw):
        os.path.exists(p) and os.remove(p)
    print("OK -> %s" % mp4)


if __name__ == "__main__":
    sys.exit(main())

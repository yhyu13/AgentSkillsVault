# -*- coding: utf-8 -*-
"""Get the source: a Bilibili video through the public API, or a local file.

    python fetch_bili.py <url> [-o <dir>] [--quality best|720|480]
    python fetch_bili.py --file <path> -o <dir>

Accepts b23.tv short links and full /video/BV... URLs. Writes:

    <dir>/source.mp4        video + audio, stream-copied
    <dir>/source.m4a        audio only, stream-copied
    <dir>/source.meta.json  bvid, title, up, duration, resolution, size, streams

Hard stops (raise, do not guess):
  * no BV id after the redirect          -> the link is not a video
  * view API code != 0                   -> deleted / region locked
  * no DASH video or audio stream        -> login wall, read the message
  * payload under 100 KB                 -> error page, delete and retry once

Public API caps around 480p; that limits the *source*, never the rebuild.
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
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        final = resp.geturl()
    m = re.search(r"(BV[0-9A-Za-z]{10})", final)
    if not m:
        raise SystemExit("cannot find a BV id in %s" % final)
    return m.group(1), final


def curl(url, out):
    cmd = ["curl.exe" if os.name == "nt" else "curl", "-L", "--fail", "--silent",
           "--show-error", "-A", UA, "-e", "https://www.bilibili.com/",
           "-o", out, url]
    subprocess.run(cmd, check=True)
    size = os.path.getsize(out)
    if size < 100_000:
        raise SystemExit("payload too small (%d bytes) — an error page, not a stream"
                         % size)
    return size


def probe(path):
    """Resolution from ffprobe when present, else from ffmpeg's stream banner.

    The imageio ffmpeg bundle ships no ffprobe on this machine, so the fallback
    is not optional: without it a local import writes null width/height.
    """
    exe = ffmpeg()
    ffprobe = exe.replace("ffmpeg", "ffprobe")
    if os.path.exists(ffprobe) or os.name != "nt":
        try:
            out = subprocess.check_output(
                [ffprobe, "-v", "error", "-select_streams", "v:0",
                 "-show_entries", "stream=width,height", "-of", "json", path],
                stderr=subprocess.DEVNULL)
            st = json.loads(out.decode("utf-8"))["streams"][0]
            return int(st["width"]), int(st["height"])
        except Exception:
            pass
    p = subprocess.run([exe, "-i", path], stdout=subprocess.DEVNULL,
                       stderr=subprocess.PIPE, universal_newlines=True,
                       encoding="utf-8", errors="replace")
    for line in p.stderr.splitlines():
        if "Video:" in line:
            m = re.search(r"(\d{2,4})x(\d{2,4})", line)
            if m:
                return int(m.group(1)), int(m.group(2))
    return None, None


def import_local(src, outdir):
    """Local video: copy it in and describe it the same way the API path does.

    Without this branch, "supports a local file" in the description would be
    false: asr reads source.meta.json, so a bare file has to produce one.
    """
    import shutil
    import json as _json
    if not os.path.isfile(src):
        raise SystemExit("no such file: %s" % src)
    os.makedirs(outdir, exist_ok=True)
    dst = os.path.join(outdir, "source.mp4")
    if os.path.abspath(src) != os.path.abspath(dst):
        shutil.copyfile(src, dst)
    w, h = probe(dst)
    p = subprocess.run([ffmpeg(), "-i", dst], stdout=subprocess.DEVNULL,
                       stderr=subprocess.PIPE, universal_newlines=True,
                       encoding="utf-8", errors="replace")
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", p.stderr)
    if not m:
        raise SystemExit("cannot read duration of %s" % src)
    seconds = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
    meta = {"bvid": "", "title": os.path.basename(src), "desc": "",
            "owner": "", "duration_sec": round(seconds, 1),
            "source_url": "", "local_file": os.path.abspath(src),
            "resolution": [w, h], "mp4": dst, "m4a": ""}
    with open(os.path.join(outdir, "source.meta.json"), "w", encoding="utf-8") as f:
        _json.dump(meta, f, ensure_ascii=False, indent=2)
    print("OK local -> %s  %sx%s  %.0fs" % (dst, w, h, seconds))
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url", nargs="?")
    ap.add_argument("--file", default="")
    ap.add_argument("-o", "--out", default=".")
    ap.add_argument("--quality", default="best", choices=list(QN))
    a = ap.parse_args()

    if a.file:
        return import_local(a.file, a.out)
    if not a.url:
        raise SystemExit("need a URL or --file <path>")
    os.makedirs(a.out, exist_ok=True)
    bvid, final_url = resolve(a.url)
    view = fetch_json("https://api.bilibili.com/x/web-interface/view?bvid=%s" % bvid)
    if view.get("code") != 0:
        raise SystemExit("view API: %s" % view.get("message"))
    d = view["data"]
    cid, title = d["cid"], d["title"]
    print("bvid=%s  %ss  up=%s\n%s" % (bvid, d["duration"], d["owner"]["name"], title))

    pu = fetch_json("https://api.bilibili.com/x/player/playurl?bvid=%s&cid=%s&qn=%d"
                    "&fnval=16&fnver=0&fourk=0" % (bvid, cid, QN[a.quality]))
    if pu.get("code") != 0:
        raise SystemExit("playurl API: %s" % pu.get("message"))
    dash = pu["data"].get("dash") or {}
    vids, auds = dash.get("video") or [], dash.get("audio") or []
    if not vids or not auds:
        raise SystemExit("no DASH streams — the video is login-gated (needs SESSDATA)")

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
    subprocess.run([exe, "-y", "-i", v_raw, "-i", a_raw, "-c", "copy", mp4],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run([exe, "-y", "-i", a_raw, "-vn", "-c:a", "copy", m4a],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    w, h = probe(mp4)

    meta = {
        "bvid": bvid,
        "title": title,
        "desc": d.get("desc", ""),
        "owner": d["owner"]["name"],
        "pubdate": d.get("pubdate"),
        "duration_sec": d["duration"],
        "source_url": a.url,
        "resolved_url": final_url,
        "resolution": [w or v.get("width"), h or v.get("height")],
        "video_stream": {"id": v.get("id"), "bandwidth": v.get("bandwidth")},
        "audio_stream": {"id": au.get("id"), "bandwidth": au.get("bandwidth")},
        "bytes": {"video": vb, "audio": ab},
        "mp4": mp4,
        "m4a": m4a,
    }
    with open(os.path.join(a.out, "source.meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    for p in (v_raw, a_raw):
        if os.path.exists(p):
            os.remove(p)
    print("OK -> %s  %sx%s  %ds" % (mp4, meta["resolution"][0],
                                    meta["resolution"][1], meta["duration_sec"]))


if __name__ == "__main__":
    sys.exit(main())

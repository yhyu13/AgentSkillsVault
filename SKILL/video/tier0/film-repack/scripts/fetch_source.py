# -*- coding: utf-8 -*-
"""Stage 1 — download the film and record what was actually delivered.

    python "$SKILL/scripts/fetch_source.py" --url https://b23.tv/xxxx --project <dir> [--max-height 720]

Writes <dir>/source/source.mp4 and <dir>/source/source.json. The JSON keeps the
requested height next to the real one: bilibili often serves 480p for a BV that
claims 720p, and a later report that says "720p" would be false.

Exit codes: 0 ok · 1 ffprobe missing or the file has no audio/video stream · 2 bad link or
API failure · 3 yt-dlp missing · 4 download failed or a multi-part collection (use
course-repack) · 5 not a film (under 60 s).
"""
import argparse
import hashlib
import json
import pathlib
import re
import shutil
import subprocess
import sys
import urllib.request

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
BV_RE = re.compile(r"(BV[0-9A-Za-z]{10})")


class _Redirect(urllib.request.HTTPRedirectHandler):
    final = ""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        _Redirect.final = newurl
        return urllib.request.HTTPRedirectHandler.redirect_request(
            self, req, fp, code, msg, headers, newurl)


def resolve_bv(url: str) -> str:
    m = BV_RE.search(url)
    if m:
        return m.group(1)
    opener = urllib.request.build_opener(_Redirect())
    req = urllib.request.Request(url, headers={"User-Agent": UA,
                                               "Referer": "https://www.bilibili.com/"})
    try:
        opener.open(req, timeout=30)
    except Exception as exc:                      # a redirect that ends in an error page
        if not _Redirect.final:
            raise SystemExit("cannot resolve %s: %s" % (url, exc))
    m = BV_RE.search(_Redirect.final)
    if not m:
        raise SystemExit("no BV id in %s" % _Redirect.final)
    return m.group(1)


def api(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA,
                                               "Referer": "https://www.bilibili.com/"})
    return json.loads(urllib.request.urlopen(req, timeout=30).read().decode("utf-8"))


def probe(path: pathlib.Path) -> dict:
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        raise SystemExit("ffprobe not found on PATH (ffmpeg installs it)")
    raw = subprocess.run([ffprobe, "-v", "error", "-print_format", "json",
                          "-show_format", "-show_streams", str(path)],
                         capture_output=True, text=True,
                         encoding="utf-8", errors="replace")
    if raw.returncode != 0:
        raise SystemExit("ffprobe failed on %s: %s" % (path, raw.stderr.strip()[:200]))
    data = json.loads(raw.stdout)
    video = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), None)
    audio = next((s for s in data.get("streams", []) if s.get("codec_type") == "audio"), None)
    if video is None or audio is None:
        raise SystemExit("source has no %s stream: %s"
                         % ("audio" if audio is None else "video", path))
    num, _, den = (video.get("r_frame_rate") or "0/1").partition("/")
    fps = float(num) / float(den or 1) if float(den or 1) else 0.0
    return {
        "width": video.get("width"), "height": video.get("height"),
        "fps": round(fps, 3), "video_codec": video.get("codec_name"),
        "audio_codec": audio.get("codec_name"), "audio_rate": audio.get("sample_rate"),
        "duration_s": round(float(data["format"]["duration"]), 3),
        "bytes": int(data["format"].get("size") or path.stat().st_size),
        "container": data["format"].get("format_name"),
    }


def sha256(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for block in iter(lambda: fh.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True, help="b23.tv / BV URL or a local video path")
    ap.add_argument("--project", required=True)
    ap.add_argument("--max-height", type=int, default=720)
    ap.add_argument("--force", action="store_true", help="re-download even if source.mp4 exists")
    args = ap.parse_args()

    root = pathlib.Path(args.project).expanduser().resolve()
    src = root / "source"
    src.mkdir(parents=True, exist_ok=True)
    target = src / "source.mp4"

    local = pathlib.Path(args.url).expanduser()
    meta, url = {}, args.url
    if local.is_file():
        meta = {"owner": ""}
        if target.exists() and not args.force:
            pass
        elif local.resolve() != target.resolve():
            shutil.copy2(local, target)
        meta.update({"origin": "local", "title": local.stem, "path": str(local.resolve())})
    else:
        if not shutil.which("yt-dlp"):
            print("yt-dlp not found. Install it (`pip install -U yt-dlp`) and retry; there is no "
                  "fallback: the direct playurl API needs a WBI signature that changes per release.")
            return 3
        try:
            bvid = resolve_bv(args.url)
        except SystemExit as exc:
            # Not a bilibili link: YouTube and friends go straight to yt-dlp.
            bvid = ""
            print("%s — downloading with yt-dlp as a generic page (no view API metadata)" % exc)
        info = {}
        if bvid:
            try:
                info = api("https://api.bilibili.com/x/web-interface/view?bvid=%s" % bvid)["data"]
            except Exception as exc:
                print("bilibili view API failed for %s: %s" % (bvid, exc))
                return 2
        meta = {
            "origin": "bilibili" if bvid else "other",
            "bvid": bvid, "aid": info.get("aid"),
            "title": info.get("title"), "owner": (info.get("owner") or {}).get("name"),
            "cids": [p.get("cid") for p in info.get("pages") or []],
            "page_count": len(info.get("pages") or []) if bvid else 1,
            "declared_duration_s": info.get("duration"),
            "declared_dimension": info.get("dimension"),
            "pubdate": info.get("pubdate"),
            "url": "https://www.bilibili.com/video/%s" % bvid,
        }
        if meta["page_count"] > 1:
            # record the refusal, so a later step can explain why nothing was downloaded
            (src / "source.json").write_text(json.dumps(
                {"origin": "bilibili", "bvid": bvid, "title": info.get("title"),
                 "owner": (info.get("owner") or {}).get("name"),
                 "page_count": meta["page_count"], "refused": "multi-part"},
                ensure_ascii=False, indent=2), encoding="utf-8")
            print("this BV has %d parts. A playlist is a course, not one film: stop here and "
                  "use course-repack. Downloading part 1 alone would produce a summary that "
                  "claims to cover the whole collection." % meta["page_count"])
            return 4
        if target.exists() and not args.force and (src / "source.json").exists():
            print("source.mp4 already present, reusing (use --force to re-download)")
        else:
            fmt = ("bv*[height<=%d]+ba/b[height<=%d]" % (args.max_height, args.max_height))
            cmd = ["yt-dlp", "-f", fmt, "--merge-output-format", "mp4", "--no-playlist",
                   "-o", str(target), "--newline", url]
            print("$ " + " ".join(cmd))
            rc = subprocess.run(cmd).returncode
            if rc != 0 or not target.exists():
                print("yt-dlp failed (exit %d); check that the link is public and the network "
                      "reaches bilibili" % rc)
                return 4

    real = probe(target)
    if real["duration_s"] < 60:
        print("source is %.1fs; film-repack is for long films — check the link" % real["duration_s"])
        return 5
    record = dict(meta)
    record.update({
        "file": str(target.relative_to(root)).replace("\\", "/"),
        "requested_max_height": args.max_height,
        "actual": real,
        "sha256": sha256(target),
    })
    (src / "source.json").write_text(json.dumps(record, ensure_ascii=False, indent=2),
                                     encoding="utf-8")
    print("title   : %s" % record.get("title", "(local)"))
    print("file    : %s  %.1f MB" % (record["file"], real["bytes"] / 1e6))
    print("actual  : %dx%d %.2ffps %s / %s, %.1fs"
          % (real["width"], real["height"], real["fps"], real["video_codec"],
             real["audio_codec"], real["duration_s"]))
    if record.get("declared_dimension"):
        declared = record["declared_dimension"]
        if declared.get("height") and declared["height"] != real["height"]:
            print("! declared %sp, delivered %sp — report the delivered number"
                  % (declared["height"], real["height"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())

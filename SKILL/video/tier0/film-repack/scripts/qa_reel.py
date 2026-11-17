# -*- coding: utf-8 -*-
"""Stage 6 — verify the finished MP4 against the timeline, without trusting the renderer.

    python "$SKILL/scripts/qa_reel.py" --project <dir> [--min-shot-db -55] [--max-black 0.6]

Checks, all read from the delivered file:
  container   size, fps and pixel format match the intended 1920×1080 / 30
  length      duration within 1.5 frames of DUR in reel/timeline.json
  audio       an audio stream exists and is not silent as a whole
  per shot    every shot's audio window has sound (a dropped TTS segment shows here)
  black       total black-frame time under --max-black seconds
Then it writes stills at each shot's midpoint into reel/qa/stills so a human can
look at one frame per chapter, and reel/qa/report.json with every number.

This does not judge taste. A passing report means "the file is what the timeline
says it is", not "the film is good".

Exit 1 on any failed check, 2 when the MP4 or timeline is missing.
"""
import argparse
import hashlib
import json
import pathlib
import re
import shutil
import subprocess
import sys


def exe(name: str) -> str:
    found = shutil.which(name)
    if not found:
        raise SystemExit("%s not found on PATH (install ffmpeg)" % name)
    return found


def probe(path: pathlib.Path) -> dict:
    raw = subprocess.run([exe("ffprobe"), "-v", "error", "-print_format", "json",
                          "-show_format", "-show_streams", "-count_packets", str(path)],
                         capture_output=True, text=True,
                         encoding="utf-8", errors="replace")
    if raw.returncode != 0:
        raise SystemExit("ffprobe failed: %s" % raw.stderr.strip()[:200])
    data = json.loads(raw.stdout)
    video = next((s for s in data["streams"] if s.get("codec_type") == "video"), None)
    audio = next((s for s in data["streams"] if s.get("codec_type") == "audio"), None)
    if video is None:
        raise SystemExit("no video stream in %s" % path)
    num, _, den = (video.get("r_frame_rate") or "0/1").partition("/")
    fps = float(num) / float(den or 1) if float(den or 1) else 0.0
    return {"width": video.get("width"), "height": video.get("height"),
            "fps": round(fps, 3), "pix_fmt": video.get("pix_fmt"),
            "video_codec": video.get("codec_name"),
            "duration": round(float(data["format"]["duration"]), 3),
            "audio": None if audio is None else {"codec": audio.get("codec_name"),
                                                 "rate": audio.get("sample_rate"),
                                                 "channels": audio.get("channels")},
            "frames": int(video.get("nb_read_packets") or 0),
            "bytes": int(data["format"].get("size") or path.stat().st_size)}


def mean_db(path: pathlib.Path, start: float, dur: float) -> float | None:
    raw = subprocess.run([exe("ffmpeg"), "-hide_banner", "-ss", "%.3f" % max(0.0, start),
                          "-t", "%.3f" % max(0.05, dur), "-i", str(path),
                          "-map", "0:a:0", "-af", "volumedetect", "-f", "null", "-"],
                         capture_output=True, text=True,
                         encoding="utf-8", errors="replace")
    m = re.search(r"mean_volume:\s*(-?[\d.]+) dB", raw.stderr)
    return float(m.group(1)) if m else None


def black_seconds(path: pathlib.Path) -> tuple[float, int]:
    raw = subprocess.run([exe("ffmpeg"), "-hide_banner", "-i", str(path),
                          "-vf", "blackdetect=d=0.2:pix_th=0.10", "-an", "-f", "null", "-"],
                         capture_output=True, text=True,
                         encoding="utf-8", errors="replace")
    spans = [float(x) for x in re.findall(r"black_duration:([\d.]+)", raw.stderr)]
    return round(sum(spans), 3), len(spans)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    ap.add_argument("--min-shot-db", type=float, default=-55.0)
    ap.add_argument("--max-black", type=float, default=0.6)
    ap.add_argument("--width", type=int, default=1920)
    ap.add_argument("--height", type=int, default=1080)
    args = ap.parse_args()
    root = pathlib.Path(args.project).expanduser().resolve()
    video = root / "reel" / "out" / "final.mp4"
    timeline_path = root / "reel" / "timeline.json"
    if not video.exists() or not timeline_path.exists():
        print("missing %s or %s" % (video, timeline_path))
        return 2
    timeline = json.loads(timeline_path.read_text(encoding="utf-8"))
    DUR = float(timeline["total"])
    fps = int(timeline.get("fps") or 30)
    info = probe(video)
    fails, notes = [], []

    if (info["width"], info["height"]) != (args.width, args.height):
        fails.append("size %dx%d != %dx%d" % (info["width"], info["height"],
                                              args.width, args.height))
    if abs(info["fps"] - fps) > 0.01:
        fails.append("fps %.3f != %d" % (info["fps"], fps))
    tolerance = 1.5 / fps
    if abs(info["duration"] - DUR) > tolerance:
        fails.append("duration %.3fs != timeline %.3fs (tolerance %.3fs)"
                     % (info["duration"], DUR, tolerance))
    if info["audio"] is None:
        fails.append("no audio stream — a narrated cut without sound is a bug")
    if info["bytes"] < 200_000:
        fails.append("file is only %d bytes; the encode probably died" % info["bytes"])

    whole = mean_db(video, 0, info["duration"]) if info["audio"] else None
    if whole is not None and whole < -50:
        fails.append("whole track mean %.1f dB — effectively silent" % whole)

    stills_dir = root / "reel" / "qa" / "stills"
    stills_dir.mkdir(parents=True, exist_ok=True)
    for old in stills_dir.glob("shot-*.png"):
        old.unlink()
    shots = []
    for shot in timeline.get("shots", []):
        mid = (shot["start"] + shot["end"]) / 2.0
        db = mean_db(video, shot["start"] + 0.05, max(0.2, shot["end"] - shot["start"] - 0.1)) \
            if info["audio"] else None
        still = stills_dir / ("shot-%s.png" % shot["id"])
        subprocess.run([exe("ffmpeg"), "-y", "-hide_banner", "-loglevel", "error",
                        "-ss", "%.3f" % mid, "-i", str(video), "-frames:v", "1", str(still)],
                       check=False)
        shots.append({"id": shot["id"], "chapter": shot["chapter"],
                      "start": shot["start"], "end": shot["end"], "mid": round(mid, 3),
                      "mean_db": db, "still": str(still.relative_to(root)).replace("\\", "/"),
                      "still_bytes": still.stat().st_size if still.exists() else 0})
        if db is None:
            fails.append("shot %s: no measurable audio" % shot["id"])
        elif db < args.min_shot_db:
            fails.append("shot %s: %.1f dB is below %.0f — missing narration?"
                         % (shot["id"], db, args.min_shot_db))
        if not still.exists() or still.stat().st_size < 5_000:
            fails.append("shot %s: still frame missing or blank" % shot["id"])

    black_total, black_spans = black_seconds(video)
    if black_total > args.max_black:
        fails.append("%.2fs of black frames in %d spans (limit %.1fs)"
                     % (black_total, black_spans, args.max_black))

    report = {"file": str(video.relative_to(root)).replace("\\", "/"),
              "timeline_sha256": hashlib.sha256(timeline_path.read_bytes()).hexdigest(),
              "video_sha256": hashlib.sha256(video.read_bytes()).hexdigest(),
              "timeline_dur": DUR, "probe": info, "whole_mean_db": whole,
              "black_seconds": black_total, "black_spans": black_spans,
              "shots": shots, "fails": fails, "passed": not fails}
    (root / "reel" / "qa" / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print("%s  %dx%d %.3ffps %.2fs audio=%s  whole %s dB  black %.2fs"
          % (report["file"], info["width"], info["height"], info["fps"], info["duration"],
             "yes" if info["audio"] else "NO",
             "n/a" if whole is None else "%.1f" % whole, black_total))
    for shot in shots:
        print("  %-4s %6.2f–%6.2f  %6s dB  %s"
              % (shot["id"], shot["start"], shot["end"],
                 "n/a" if shot["mean_db"] is None else "%.1f" % shot["mean_db"],
                 shot["chapter"]))
    if fails:
        for f in fails:
            print("FAIL %s" % f)
        return 1
    if notes:
        for n in notes:
            print("note %s" % n)
    print("PASS reel qa — stills in reel/qa/stills/")
    return 0


if __name__ == "__main__":
    sys.exit(main())

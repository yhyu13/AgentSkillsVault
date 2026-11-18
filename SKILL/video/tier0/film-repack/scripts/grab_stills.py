# -*- coding: utf-8 -*-
"""Stage 3b — pull one frame per chapter, so the deck and the cut show the film.

    python scripts/grab_stills.py --project <dir> [--count 15] [--width 960]

A documentary repack with no frame from the film reads like a book report. This
step takes the midpoint of every narration segment (or an even spread of --count
points when there is no narration yet), writes source/stills/<id>.jpg plus
stills.json, and records the exact second each frame came from.

The frames are delivery evidence, not decoration: the deck puts one beside the
points, the cut shows it behind the caption. If a still is missing, both fall
back to text — the pipeline never depends on it.
Exit 2 when the source video is missing, 3 when ffmpeg fails on every frame.
"""
import argparse
import json
import pathlib
import shutil
import subprocess
import sys


def ffmpeg() -> str:
    found = shutil.which("ffmpeg")
    if found:
        return found
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        raise SystemExit("ffmpeg not found; install ffmpeg or `pip install imageio-ffmpeg`")


def parse_tc(text: str):
    """'08:16–10:27' -> (496, 627) seconds; tolerates missing end."""
    raw = (text or "").replace("–", "-").replace("—", "-")
    parts = [p.strip() for p in raw.split("-") if p.strip()]
    if not parts:
        return None
    def secs(hhmmss):
        bits = [float(x) for x in hhmmss.split(":")]
        while len(bits) < 3:
            bits.insert(0, 0.0)
        return bits[0] * 3600 + bits[1] * 60 + bits[2]
    try:
        start = secs(parts[0])
        end = secs(parts[-1]) if len(parts) > 1 else start
        return start, max(start, end)
    except ValueError:
        return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    ap.add_argument("--count", type=int, default=15)
    ap.add_argument("--width", type=int, default=960)
    ap.add_argument("--crop-top", type=float, default=0.10,
                    help="fraction of the top to cut; removes the uploader watermark band")
    args = ap.parse_args()
    root = pathlib.Path(args.project).expanduser().resolve()
    video = root / "source" / "source.mp4"
    if not video.exists():
        print("missing %s — run fetch_source.py first" % video)
        return 2
    meta = json.loads((root / "source" / "source.json").read_text(encoding="utf-8"))
    duration = float((meta.get("actual") or {}).get("duration_s") or 0)

    jobs = []
    narration = root / "reel" / "narration.json"
    if narration.exists():
        spec = json.loads(narration.read_text(encoding="utf-8"))
        for seg in spec.get("segments") or []:
            span = parse_tc(seg.get("timecode"))
            if not span:
                continue
            a, b = span
            # three candidates, not one midpoint: a chapter's middle can land on a title
            # card or a page of text, and a wall of type is not a frame from the film
            jobs.append({"id": seg["id"], "timecode": seg["timecode"],
                         "candidates": [round(a + (b - a) * f, 2) for f in (0.3, 0.5, 0.72)]})
    if not jobs and duration > 0:
        step = duration / (args.count + 1)
        for i in range(args.count):
            t = step * (i + 1)
            jobs.append({"id": "f%02d" % (i + 1),
                         "timecode": "%d:%02d" % (int(t // 60), int(t % 60)),
                         "candidates": [round(t, 2)]})
    if not jobs:
        print("no narration timecodes and no duration — nothing to sample")
        return 2

    out = root / "source" / "stills"
    out.mkdir(parents=True, exist_ok=True)
    made = 0
    for job in jobs:
        dest = out / ("%s.jpg" % job["id"])
        best, best_score, best_t = None, -1.0, None
        for t in job["candidates"]:
            probe = out / ("_try_%s_%.0f.jpg" % (job["id"], t))
            cmd = [ffmpeg(), "-y", "-hide_banner", "-loglevel", "error",
                   "-ss", "%.2f" % t, "-i", str(video), "-frames:v", "1",
                   "-vf", "crop=iw:ih*%.3f:0:ih*%.3f,scale=%d:-2:flags=lanczos"
                   % (1.0 - args.crop_top, args.crop_top, args.width), "-q:v", "3", str(probe)]
            if subprocess.run(cmd).returncode != 0 or not probe.exists() or probe.stat().st_size < 4000:
                continue
            score = 0.0
            try:
                from PIL import Image
                im = Image.open(probe)
                small = im.resize((160, 90))
                hsv = small.convert("HSV")
                sat = sum(hsv.getdata(0)) / (160 * 90)
                val = [p[2] for p in hsv.getdata()]
                mean = sum(val) / len(val)
                spread = (sum((v - mean) ** 2 for v in val) / len(val)) ** 0.5
                score = sat / 255.0 + 0.8 * (spread / 128.0)
            except Exception:
                score = 0.0
            if score > best_score:
                if best is not None:
                    best.unlink(missing_ok=True)
                best, best_score, best_t = probe, score, t
            else:
                probe.unlink(missing_ok=True)
        if best is not None:
            best.replace(dest)
            job["file"] = str(dest.relative_to(root)).replace("\\", "/")
            job["time_s"] = best_t
            made += 1
        else:
            job["file"] = ""
    (root / "source" / "stills.json").write_text(
        json.dumps({"stills": jobs}, ensure_ascii=False, indent=2), encoding="utf-8")
    print("stills %d/%d -> source/stills/ (manifest source/stills.json)" % (made, len(jobs)))
    if made == 0:
        print("ffmpeg produced no usable frame; check that source.mp4 is playable")
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())

# -*- coding: utf-8 -*-
"""Stage 5c — join the picture and the mix into the delivered file.

    python "$SKILL/scripts/mux_audio.py" --project <dir> [--video reel/out/video.mp4] [--audio reel/audio/final.wav]

Render the page without audio first, then mux. Two reasons, both observed:
  · motion-showreel's render.mjs muxes with `-af apad -t DUR`; on ffmpeg 7.x the
    packet count read back by its own check comes out 2 higher than the frame
    count, so the render is rejected with "output has N frames, expected M".
    The file is fine — nb_frames and duration are right — only the count is not.
  · keeping video and audio as separate inputs makes the join re-doable in
    seconds without re-rendering 12 000 frames.

The mux uses -shortest: speech never gets padded with silence to hide a timeline
mistake, and the picture is never cut mid-word. Duration is asserted against
reel/timeline.json afterwards.

Exit 2 missing inputs, 3 ffmpeg failed, 4 duration off by more than 2 frames.
"""
import argparse
import json
import pathlib
import shutil
import subprocess
import sys


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    ap.add_argument("--video", default="reel/out/video.mp4")
    ap.add_argument("--audio", default="reel/audio/final.wav")
    ap.add_argument("--out", default="reel/out/final.mp4")
    args = ap.parse_args()
    root = pathlib.Path(args.project).expanduser().resolve()
    video, audio, out = root / args.video, root / args.audio, root / args.out
    timeline = root / "reel" / "timeline.json"
    missing = [str(p) for p in (video, audio, timeline) if not p.exists()]
    if missing:
        print("missing: " + ", ".join(missing))
        return 2
    spec = json.loads(timeline.read_text(encoding="utf-8"))
    DUR, fps = float(spec["total"]), int(spec.get("fps") or 30)
    ffmpeg = shutil.which("ffmpeg")
    ffprobe = shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        print("ffmpeg/ffprobe not found on PATH")
        return 3
    out.parent.mkdir(parents=True, exist_ok=True)
    cmd = [ffmpeg, "-y", "-v", "error", "-i", str(video), "-i", str(audio),
           "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
           "-c:a", "aac", "-b:a", "256k", "-shortest",
           "-movflags", "+faststart", str(out)]
    print("$ " + " ".join(cmd))
    if subprocess.run(cmd).returncode != 0:
        print("ffmpeg could not join the picture and the mix")
        return 3
    probe = json.loads(subprocess.run(
        [ffprobe, "-v", "error", "-print_format", "json", "-show_format", "-show_streams",
         str(out)], capture_output=True, text=True,
                         encoding="utf-8", errors="replace").stdout)
    streams = probe.get("streams", [])
    has_audio = any(s.get("codec_type") == "audio" for s in streams)
    duration = float(probe["format"]["duration"])
    delta = abs(duration - DUR)
    print("%s  %.3fs (timeline %.3fs, Δ%.3fs)  audio=%s  %.1f MB"
          % (out.relative_to(root), duration, DUR, delta,
             "yes" if has_audio else "NO", out.stat().st_size / 1e6))
    if not has_audio:
        print("the joined file has no audio stream")
        return 3
    if delta > 2.0 / fps:
        print("duration differs by more than 2 frames — do not ship it; check that the "
              "timeline and the mix came from the same timings.json")
        return 4
    print('next: python "$SKILL/scripts/qa_reel.py" --project %s' % root)
    return 0


if __name__ == "__main__":
    sys.exit(main())

# -*- coding: utf-8 -*-
"""Stage 5b — lay real TTS durations on one clock, mix voice + bed, write the page timeline.

    python "$SKILL/scripts/build_timeline.py" --project <dir> [--lead 1.6] [--gap 0.5] [--tail 2.8] [--fps 30]

Reads   <dir>/reel/audio/timings.json   (real per-segment durations)
Writes  <dir>/reel/timeline.json, <dir>/reel/timeline.js, <dir>/reel/audio/final.wav (+ .mp3)

The page imports timeline.js for DUR / SEGMENTS / SHOTS, so picture and audio
cannot drift: DUR is derived from the same numbers the mixer used, rounded up to
a whole frame. The bed is synthesized with numpy (no sample library, no licence
question) and ducked under speech at 0.55×.

Exit 6 if a segment file is missing, 7 if the mix exceeds the 1200 s limit of the
renderer, 8 if the audio and the frame grid disagree by more than one frame.
"""
import argparse
import json
import math
import pathlib
import shutil
import subprocess
import sys
import wave

import numpy as np

SR = 44100


def ffmpeg() -> str:
    found = shutil.which("ffmpeg")
    if found:
        return found
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        raise SystemExit("ffmpeg not found; install ffmpeg or `pip install imageio-ffmpeg`")


def decode(path: pathlib.Path) -> np.ndarray:
    tmp = path.with_suffix(".tmp.wav")
    subprocess.run([ffmpeg(), "-y", "-i", str(path), "-ac", "1", "-ar", str(SR), str(tmp)],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    with wave.open(str(tmp), "rb") as w:
        raw = w.readframes(w.getnframes())
    tmp.unlink(missing_ok=True)
    return np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0


def pad_bed(total: float, spans) -> np.ndarray:
    """Slow Am9–Fmaj7–Cmaj7–G6 loop plus a half-bar sub pulse, ducked under speech."""
    n = int(total * SR)
    t = np.arange(n) / SR
    out = np.zeros(n, dtype=np.float32)
    chords = [[220.00, 261.63, 329.63, 493.88],
              [174.61, 220.00, 261.63, 329.63],
              [130.81, 196.00, 261.63, 329.63],
              [196.00, 246.94, 293.66, 392.00]]
    bar = 8.0
    for ci, chord in enumerate(chords):
        for k in range(int(total / (bar * len(chords))) + 2):
            s0 = ci * bar + k * bar * len(chords)
            s1 = s0 + bar + 1.6
            i0, i1 = int(s0 * SR), min(n, int(s1 * SR))
            if i0 >= n:
                continue
            seg = t[i0:i1] - s0
            env = np.minimum(1.0, seg / 1.4) * np.minimum(1.0, np.maximum(0.0, (s1 - s0 - seg) / 1.6))
            for f in chord:
                for det, amp in ((1.0, 0.5), (1.0035, 0.28), (0.9965, 0.28)):
                    out[i0:i1] += (amp * 0.05) * env * np.sin(2 * np.pi * f * det * seg)
    beat = 4.0
    for k in range(int(total / beat) + 1):
        s0 = k * beat
        i0, i1 = int(s0 * SR), min(n, int((s0 + 1.1) * SR))
        if i0 >= n:
            continue
        seg = t[i0:i1] - s0
        out[i0:i1] += 0.045 * np.exp(-seg * 3.2) * np.sin(2 * np.pi * 55 * seg)
    duck = np.ones(n, dtype=np.float32)
    for s, e in spans:
        i0, i1 = int(s * SR), min(n, int((e + 0.25) * SR))
        duck[i0:i1] *= 0.55
    k = int(0.25 * SR)
    duck = np.convolve(duck, np.ones(k, dtype=np.float32) / k, mode="same")
    return out * duck


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    ap.add_argument("--lead", type=float, default=1.6)
    ap.add_argument("--gap", type=float, default=0.5)
    ap.add_argument("--tail", type=float, default=2.8)
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--title", default="")
    ap.add_argument("--source", default="", help="short provenance shown in the frame header")
    args = ap.parse_args()
    root = pathlib.Path(args.project).expanduser().resolve()
    timings_path = root / "reel" / "audio" / "timings.json"
    if not timings_path.exists():
        raise SystemExit("missing reel/audio/timings.json — run tts_segments.py first")
    timings = json.loads(timings_path.read_text(encoding="utf-8"))
    missing = [s["id"] for s in timings["segments"]
               if not (root / "reel" / s["file"]).exists()]
    if missing:
        print("! missing audio: %s" % ", ".join(missing))
        return 6

    cursor, shots = args.lead, []
    for index, seg in enumerate(timings["segments"]):
        dur = float(seg["duration"])
        shots.append({"id": seg["id"], "chapter": seg["chapter"],
                      "timecode": seg["timecode"], "text": seg["text"],
                      "beats": seg["beats"],
                      "audioStart": round(cursor, 3), "audioEnd": round(cursor + dur, 3),
                      "duration": round(dur, 3)})
        cursor += dur + args.gap
    raw_total = cursor - args.gap + args.tail
    DUR = math.ceil(raw_total * args.fps - 1e-6) / args.fps
    for i, shot in enumerate(shots):
        shot["start"] = shots[i - 1]["audioEnd"] + args.gap if i else 0.0
    for i, shot in enumerate(shots):
        shot["end"] = shots[i + 1]["start"] if i + 1 < len(shots) else DUR
    if DUR > 1200:
        print("! mix is %.0fs; the renderer allows 1200s — cut segments, not speech rate" % DUR)
        return 7

    n = int(DUR * SR)
    voice = np.zeros(n, dtype=np.float32)
    for shot, seg in zip(shots, timings["segments"]):
        audio = decode(root / "reel" / seg["file"])
        i0 = int(shot["audioStart"] * SR)
        i1 = min(n, i0 + len(audio))
        voice[i0:i1] += audio[: i1 - i0]
    bed = pad_bed(DUR, [(s["audioStart"], s["audioEnd"]) for s in shots])
    mix = voice + bed * 0.8
    peak = float(np.max(np.abs(mix))) if len(mix) else 0.0
    if peak > 0:
        mix *= 0.92 / peak
    # TTS speech is peaky: peak-normalizing alone leaves the track ~5 dB quieter than
    # other narrated video. Lift the RMS toward -21 dBFS and soft-limit with tanh, so
    # phone speakers do not need to be cranked and transients stay rounded.
    rms = float(np.sqrt(np.mean(mix.astype(np.float64) ** 2))) if len(mix) else 0.0
    if rms > 1e-6:
        gain = min((10 ** (-21 / 20)) / rms, 3.2)
        if gain > 1.0:
            mix = np.tanh(mix * gain * 0.9) / np.tanh(0.9)
            peak = float(np.max(np.abs(mix)))
            mix *= 0.94 / peak
    pcm = (np.clip(mix, -1, 1) * 32767).astype("<i2")

    audio_dir = root / "reel" / "audio"
    wav = audio_dir / "final.wav"
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    subprocess.run([ffmpeg(), "-y", "-i", str(wav), "-c:a", "libmp3lame", "-b:a", "160k",
                    str(audio_dir / "final.mp3")],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    with wave.open(str(wav), "rb") as check:
        written = check.getnframes() / check.getframerate()
    if abs(written - DUR) > 1.0 / args.fps:
        print("mixed audio is %.4fs but DUR is %.4fs — the track and the frame grid disagree"
              % (written, DUR))
        return 8

    stills = {}
    manifest = root / "source" / "stills.json"
    if manifest.exists():
        reel_stills = root / "reel" / "stills"
        reel_stills.mkdir(parents=True, exist_ok=True)
        for item in json.loads(manifest.read_text(encoding="utf-8")).get("stills", []):
            src = root / item.get("file", "")
            if not item.get("file") or not src.exists():
                continue
            dest = reel_stills / src.name
            dest.write_bytes(src.read_bytes())
            stills[item["id"]] = "stills/" + src.name

    timeline = {"title": args.title or root.name, "source": args.source,
                "stills": stills,
                "total": DUR, "fps": args.fps,
                "width": 1920, "height": 1080, "lead": args.lead, "gap": args.gap,
                "tail": args.tail, "shots": shots}
    (root / "reel" / "timeline.json").write_text(
        json.dumps(timeline, ensure_ascii=False, indent=2), encoding="utf-8")
    js = ("// generated by scripts/build_timeline.py — edit narration.json, not this file\n"
          "export const DUR = %s;\n"
          "export const META = %s;\n"
          "export const SEGMENTS = %s;\n"
          "export const STILLS = %s;\n"
          "export const SHOTS = SEGMENTS.map(s => ({ id: s.id, t0: s.start, t1: s.end }));\n"
          % (json.dumps(DUR), json.dumps(timeline, ensure_ascii=False),
             json.dumps(shots, ensure_ascii=False), json.dumps(stills)))
    (root / "reel" / "timeline.js").write_text(js, encoding="utf-8")

    frames = int(round(DUR * args.fps))
    final_rms = float(np.sqrt(np.mean(mix.astype(np.float64) ** 2)))
    print("mix rms %.1f dBFS  peak %.2f dBFS"
          % (20 * np.log10(max(final_rms, 1e-9)), 20 * np.log10(max(float(np.max(np.abs(mix))), 1e-9))))
    print("DUR %.3fs = %d frames @ %dfps  shots=%d  wav %.1f MB"
          % (DUR, frames, args.fps, len(shots), wav.stat().st_size / 1e6))
    for s in shots:
        print("  %s %6.2f–%6.2f  %s" % (s["id"], s["start"], s["end"], s["chapter"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())

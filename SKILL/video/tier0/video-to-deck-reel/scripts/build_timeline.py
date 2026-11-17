# -*- coding: utf-8 -*-
"""Lay the narration on one timeline and render the final audio.

    python build_timeline.py <project> [--lead 1.4] [--gap 0.55] [--tail 2.6] [--bed pad|none]

Reads   <project>/reel/audio/timings.json   (measured seconds, not estimates)
Writes  <project>/reel/audio/final.wav
        <project>/reel/audio/final.mp3
        <project>/reel/timeline.json        (segments, fps, size, gaps)
        <project>/reel/timeline.js          (same object for the canvas page)

The page and the audio must read one source of truth. If the picture is laid
out from an estimate while the sound comes from a measurement, every later
segment drifts.
"""
import argparse
import hashlib
import json
import os
import subprocess
import wave

import numpy as np

SR = 44100


def ffmpeg():
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def decode(path):
    tmp = path + ".tmp.wav"
    subprocess.run([ffmpeg(), "-y", "-v", "error", "-i", path,
                    "-ac", "1", "-ar", str(SR), tmp], check=True)
    with wave.open(tmp, "rb") as w:
        raw = w.readframes(w.getnframes())
    os.remove(tmp)
    return np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0


def box_smooth(x, k):
    """Moving average in O(n) via a cumulative sum.

    np.convolve(x, ones(k)/k) is O(n*k): for a 223 s 44.1 kHz reel that is ~1.3e11
    multiply-accumulates and several seconds of silence at the start of `timeline`
    with no output. The cumulative-sum form is exact for a box kernel and finishes
    in milliseconds.
    """
    k = max(1, int(k))
    if x.size < 2 or k < 2:
        return x
    c = np.concatenate(([0.0], np.cumsum(x, dtype=np.float64)))
    out = np.empty_like(x, dtype=np.float32)
    half = k // 2
    idx = np.arange(x.size)
    lo = np.clip(idx - half, 0, x.size)
    hi = np.clip(idx - half + k, 0, x.size)
    out[:] = ((c[hi] - c[lo]) / np.maximum(1, hi - lo)).astype(np.float32)
    return out


def bed(total, spans):
    """Quiet harmonic bed that gets out of the way when someone speaks."""
    n = int(total * SR)
    t = np.arange(n) / SR
    out = np.zeros(n, dtype=np.float32)
    chords = [
        [146.83, 174.61, 220.00, 329.63],   # Dm-ish, low register
        [196.00, 246.94, 293.66, 392.00],
        [130.81, 196.00, 261.63, 392.00],
        [174.61, 220.00, 261.63, 349.23],
    ]
    bar = 9.0
    for ci, chord in enumerate(chords):
        for k in range(int(total / (bar * len(chords))) + 2):
            s0 = ci * bar + k * bar * len(chords)
            if s0 >= total:
                continue
            s1 = min(total, s0 + bar + 1.8)
            i0, i1 = int(s0 * SR), int(s1 * SR)
            seg = t[i0:i1] - s0
            env = np.minimum(1.0, seg / 1.8) * np.clip((s1 - s0 - seg) / 1.8, 0, 1)
            for f in chord:
                for det, amp in ((1.0, 0.5), (1.003, 0.25), (0.997, 0.25)):
                    out[i0:i1] += (amp * 0.030) * env * np.sin(2 * np.pi * f * det * seg)
    for k in range(int(total / 4.5) + 1):
        s0 = k * 4.5
        i0, i1 = int(s0 * SR), min(n, int((s0 + 1.0) * SR))
        if i0 >= n:
            continue
        seg = t[i0:i1] - s0
        out[i0:i1] += 0.030 * np.exp(-seg * 3.5) * np.sin(2 * np.pi * 51 * seg)

    duck = np.ones(n, dtype=np.float32)
    for s, e in spans:
        duck[int(s * SR):min(n, int((e + 0.3) * SR))] *= 0.45
    duck = box_smooth(duck, int(0.3 * SR))
    return out * duck


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--lead", type=float, default=1.4)
    ap.add_argument("--gap", type=float, default=0.55)
    ap.add_argument("--tail", type=float, default=2.6)
    ap.add_argument("--bed", default="pad", choices=["pad", "none"])
    ap.add_argument("--fps", type=int, default=30)
    a = ap.parse_args()

    root = a.project
    aud = os.path.join(root, "reel", "audio")
    spec = json.load(open(os.path.join(aud, "timings.json"), encoding="utf-8"))
    # narration.json is the source of chapter/visual/tags/metric; if it changed
    # after the last TTS run, timings.json is stale and the reel would carry old
    # metadata while every gate still passes. Refuse instead.
    narr_path = os.path.join(root, "reel", "narration.json")
    if os.path.exists(narr_path):
        with open(narr_path, "rb") as fh:
            made = hashlib.sha1(fh.read()).hexdigest()[:16]
        if spec.get("narration_sha") and spec["narration_sha"] != made:
            raise SystemExit("narration.json 改过但 timings.json 没重建：先跑 tts_edge.py，"
                             "否则时间轴会带着旧的 chapter/tags")

    cursor = a.lead
    placed = []
    for seg in spec["segments"]:
        dur = float(seg["seconds"])
        item = {"id": seg["id"], "chapter": seg["chapter"], "text": seg["text"],
                "start": round(cursor, 3), "end": round(cursor + dur, 3),
                "duration": round(dur, 3)}
        for key in ("visual", "tags", "metric"):
            if key in seg:
                item[key] = seg[key]
        placed.append(item)
        cursor += dur + a.gap
    total = round(cursor - a.gap + a.tail, 3)

    n = int(round(total * SR))
    voice = np.zeros(n, dtype=np.float32)
    for item in placed:
        clip = decode(os.path.join(aud, "narration", item["id"] + ".mp3"))
        i0 = int(round(item["start"] * SR))
        i1 = min(n, i0 + len(clip))
        voice[i0:i1] += clip[: i1 - i0]

    if a.bed == "none":
        mix = voice
    else:
        mix = voice + bed(total, [(p["start"], p["end"]) for p in placed]) * 0.9

    peak = float(np.max(np.abs(mix))) if mix.size else 0.0
    gain = (0.92 / peak) if peak > 0 else 1.0
    mix = mix * gain
    pcm = (np.clip(mix, -1.0, 1.0) * 32767).astype("<i2")

    wav = os.path.join(aud, "final.wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    mp3 = os.path.join(aud, "final.mp3")
    subprocess.run([ffmpeg(), "-y", "-v", "error", "-i", wav,
                    "-c:a", "libmp3lame", "-b:a", "160k", mp3], check=True)

    # frames is written once here and read by both renderers: Python round() and
    # JS Math.round() disagree at .5, which used to produce one extra frame
    timeline = {"total": total, "fps": a.fps,
                "frames": int(round(total * a.fps)),
                "width": 1920, "height": 1080,
                "leadIn": a.lead, "gap": a.gap, "tail": a.tail,
                "voice": spec.get("voice"), "rate": spec.get("rate"),
                "bed": a.bed, "segments": placed}
    json.dump(timeline, open(os.path.join(root, "reel", "timeline.json"), "w",
                             encoding="utf-8"), ensure_ascii=False, indent=2)
    with open(os.path.join(root, "reel", "timeline.js"), "w", encoding="utf-8") as f:
        f.write("// generated by build_timeline.py — do not edit by hand\n")
        f.write("window.TIMELINE = %s;\n"
                % json.dumps(timeline, ensure_ascii=False, indent=2))

    print("total=%.2fs frames=%d peak_in=%.3f gain=%.2f wav=%.1fMB"
          % (total, round(total * a.fps), peak, gain,
             os.path.getsize(wav) / 1e6))
    for p in placed:
        print("  %-4s %7.2f -> %7.2f  %s" % (p["id"], p["start"], p["end"], p["chapter"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

# -*- coding: utf-8 -*-
"""Stage 5a — read the narration script, synthesize one mp3 per segment, time it.

    python "$SKILL/scripts/tts_segments.py" --project <dir> [--voice zh-CN-YunyangNeural]
                                   [--rate +0%] [--min-cps 3.4] [--max-cps 6.8]

Input  <dir>/reel/narration.json   (voice, rate, segments[{id, chapter, timecode, text, beats}])
Output <dir>/reel/audio/narration/<id>.mp3 and <dir>/reel/audio/timings.json

Every duration in timings.json is the real length of the synthesized file from
ffprobe. Characters per second is checked per segment: TTS that runs outside the
band means the script is too dense (unlistenable) or too thin (dead air), and the
fix belongs in the script, not in a speed filter.

The cache key is voice + rate + text, so editing one paragraph re-synthesizes
that paragraph only. Network failures keep finished segments and return 7 with
the ids that still need audio.
"""
import argparse
import asyncio
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def ffprobe_duration(path: pathlib.Path) -> float:
    exe = shutil.which("ffprobe")
    if not exe:
        raise SystemExit("ffprobe not found on PATH")
    raw = subprocess.run([exe, "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", str(path)], capture_output=True, text=True)
    if raw.returncode != 0:
        raise SystemExit("ffprobe failed on %s: %s" % (path, raw.stderr.strip()[:160]))
    return float(raw.stdout.strip())


async def synth(text: str, voice: str, rate: str, dest: pathlib.Path) -> None:
    import edge_tts
    tmp = dest.with_suffix(".part")
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    await communicate.save(str(tmp))
    tmp.replace(dest)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    ap.add_argument("--voice", default="")
    ap.add_argument("--rate", default="")
    ap.add_argument("--min-cps", type=float, default=3.4)
    ap.add_argument("--max-cps", type=float, default=6.8)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    root = pathlib.Path(args.project).expanduser().resolve()
    spec_path = root / "reel" / "narration.json"
    if not spec_path.exists():
        raise SystemExit("missing reel/narration.json — write the narration script first")
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    voice = args.voice or spec.get("voice") or "zh-CN-YunyangNeural"
    rate = args.rate or spec.get("rate") or "+0%"
    segments = spec.get("segments") or []
    if not segments:
        raise SystemExit("reel/narration.json has no segments")
    out_dir = root / "reel" / "audio" / "narration"
    out_dir.mkdir(parents=True, exist_ok=True)

    results, failed, out_of_band = [], [], []
    for seg in segments:
        sid = seg["id"]
        text = (seg.get("text") or "").strip()
        if not text:
            raise SystemExit("segment %s has no text" % sid)
        dest = out_dir / (sid + ".mp3")
        cache = out_dir / (sid + ".key")
        key = sha(voice + "|" + rate + "|" + text)
        reuse = (not args.force) and dest.exists() and cache.exists() \
            and cache.read_text(encoding="utf-8").strip() == key
        if not reuse:
            try:
                asyncio.run(synth(text, voice, rate, dest))
            except Exception as exc:
                failed.append(sid)
                print("! %s synthesis failed: %s" % (sid, str(exc)[:160]))
                continue
            cache.write_text(key, encoding="utf-8")
        duration = ffprobe_duration(dest)
        chars = len([c for c in text if not c.isspace()])
        cps = chars / duration if duration else 0.0
        if not args.min_cps <= cps <= args.max_cps:
            target = int(chars / ((args.min_cps + args.max_cps) / 2))
            out_of_band.append((sid, cps, chars, target))
        results.append({"id": sid, "chapter": seg.get("chapter", ""),
                        "timecode": seg.get("timecode", ""), "text": text,
                        "beats": seg.get("beats") or [], "file": "audio/narration/%s.mp3" % sid,
                        "duration": round(duration, 3), "chars": chars,
                        "cps": round(cps, 2), "key": key})
        print("  %s %6.2fs %4d chars %.2f cps  %s" % (sid, duration, chars, cps,
                                                      seg.get("chapter", "")))
    if failed:
        (root / "reel" / "audio" / "timings.json").write_text(json.dumps(
            {"voice": voice, "rate": rate, "segments": results, "incomplete": failed},
            ensure_ascii=False, indent=2), encoding="utf-8")
        print("! missing audio for %s — fix the network/config and re-run; finished segments are cached"
              % ", ".join(failed))
        return 7
    total = sum(r["duration"] for r in results)
    payload = {"voice": voice, "rate": rate, "segments": results,
               "speech_s": round(total, 3), "chars": sum(r["chars"] for r in results)}
    (root / "reel" / "audio" / "timings.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print("speech %.1fs over %d segments (%.2f chars/s overall)"
          % (total, len(results), payload["chars"] / total if total else 0))
    if out_of_band:
        for sid, cps, chars, target in out_of_band:
            print("FAIL %s: %.2f cps outside %.1f–%.1f; rewrite to about %d characters"
                  % (sid, cps, args.min_cps, args.max_cps, target))
        return 8
    return 0


if __name__ == "__main__":
    sys.exit(main())

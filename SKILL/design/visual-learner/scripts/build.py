#!/usr/bin/env python3
"""Visual Learner builder: content.json -> single-file interactive presentation.

Usage:
  python3 build.py content.json [--out topic.html] [--audio narration.mp3] [--engine auto|mlx|edge|piper|say|silent]

TTS engines (auto-detected, override with --engine or VL_TTS env):
  mlx    mlx-audio + Kokoro (best local, Apple Silicon)   pip install mlx-audio
  edge   edge-tts (free MS neural cloud, needs internet)  pip install edge-tts
  piper  piper-tts (fully offline)                        pip install piper-tts + VL_PIPER_MODEL[_B]
  silent no audio; virtual clock + estimated timings

macOS `say` is intentionally NOT supported - quality is below the bar for this output.
"""
import argparse, base64, hashlib, json, os, shutil, struct, subprocess, sys, tempfile, wave

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(HERE, "..", "assets", "template.html")
GAP_LINE, GAP_SPEAKER, LEAD_IN = 0.35, 0.55, 0.4

VOICE_MAP = {
    "mlx":   {"female": "af_heart", "male": "am_michael"},
    "edge":  {"female": "en-US-AvaNeural", "male": "en-US-AndrewNeural"},
}

def log(*a): print("[visual-learner]", *a, file=sys.stderr)

def have(cmd): return shutil.which(cmd) is not None

def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=False, **kw)
    if r.returncode != 0:
        raise RuntimeError(f"cmd failed: {' '.join(cmd[:4])}...: {r.stderr[-400:].decode(errors='replace') if r.stderr else ''}")
    return r

def wav_duration(path):
    with wave.open(path, "rb") as w:
        return w.getnframes() / w.getframerate()

def to_wav(src, dst, rate=24000):
    """Normalize any audio to mono wav at fixed rate (needs ffmpeg unless already wav@rate)."""
    if have("ffmpeg"):
        run(["ffmpeg", "-y", "-i", src, "-ar", str(rate), "-ac", "1", "-c:a", "pcm_s16le", dst])
        return True
    if src.lower().endswith(".wav"):
        shutil.copy(src, dst); return True
    return False

def concat_wavs(paths, gaps, out, rate=24000):
    """Pure-python concat of mono 16-bit wavs with silence gaps. Returns offsets + total."""
    offsets, total = [], LEAD_IN
    with wave.open(out, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
        w.writeframes(b"\x00\x00" * int(LEAD_IN * rate))
        for p, gap in zip(paths, gaps):
            offsets.append(total)
            with wave.open(p, "rb") as src:
                if src.getframerate() != rate or src.getnchannels() != 1:
                    raise RuntimeError(f"wav param mismatch in {p}")
                frames = src.readframes(src.getnframes())
            w.writeframes(frames)
            dur = len(frames) / 2 / rate
            total += dur + gap
            w.writeframes(b"\x00\x00" * int(gap * rate))
    return offsets, total

# ---------------- engines ----------------
def detect_engine():
    env = os.environ.get("VL_TTS")
    if env: return env
    try:
        import importlib.util as iu
        if iu.find_spec("mlx_audio"): return "mlx"
    except Exception: pass
    try:
        import importlib.util as iu
        if iu.find_spec("edge_tts"): return "edge"
    except Exception: pass
    if have("edge-tts"): return "edge"
    if have("piper") and os.environ.get("VL_PIPER_MODEL"): return "piper"
    return "silent"

def synth_line(engine, text, voice, out_wav, tmp):
    if engine == "edge":
        mp3 = out_wav + ".mp3"
        run([sys.executable, "-m", "edge_tts", "--voice", voice, "--text", text, "--write-media", mp3])
        if not to_wav(mp3, out_wav): raise RuntimeError("edge-tts needs ffmpeg to decode mp3")
    elif engine == "mlx":
        run([sys.executable, "-m", "mlx_audio.tts.generate", "--model", "prince-canuma/Kokoro-82M",
             "--voice", voice, "--text", text, "--file_prefix", out_wav[:-4], "--audio_format", "wav"])
        cand = out_wav if os.path.exists(out_wav) else out_wav[:-4] + "_000.wav"
        if cand != out_wav: shutil.move(cand, out_wav + ".raw.wav"); to_wav(out_wav + ".raw.wav", out_wav)
        else: shutil.move(out_wav, out_wav + ".raw.wav"); to_wav(out_wav + ".raw.wav", out_wav)
    elif engine == "piper":
        model = os.environ.get("VL_PIPER_MODEL_B" if voice == "B" else "VL_PIPER_MODEL",
                               os.environ.get("VL_PIPER_MODEL"))
        raw = out_wav + ".raw.wav"
        r = subprocess.run(["piper", "-m", model, "-f", raw], input=text.encode(), capture_output=True)
        if r.returncode != 0: raise RuntimeError("piper failed")
        if not to_wav(raw, out_wav): shutil.copy(raw, out_wav)
    elif engine == "say":
        raise RuntimeError("macOS `say` is not supported - quality is below the bar. Install mlx-audio or edge-tts, or build silent.")
    else:
        raise RuntimeError(f"unknown engine {engine}")

def resolve_voice(engine, content, spk):
    hint = (content.get("voices") or {}).get(spk, "female" if spk == "A" else "male")
    if engine == "piper": return spk
    return VOICE_MAP.get(engine, {}).get(hint, hint)  # exact ids pass through

def estimate(text): return max(1.2, 0.55 + len(text.split()) / 2.7)

# ---------------- build ----------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("content"); ap.add_argument("--out")
    ap.add_argument("--audio", help="existing narration file; skip TTS, distribute cues proportionally")
    ap.add_argument("--engine", default=None)
    ap.add_argument("--tmpdir", help="persistent work dir; reruns skip already-synthesized lines (resumable)")
    a = ap.parse_args()

    content = json.load(open(a.content))
    lines, slides, gloss = content["lines"], content["slides"], content.get("glossary", [])
    for i, l in enumerate(lines):
        if not (0 <= l["slide"] < len(slides)): sys.exit(f"line {i}: bad slide index")
    out = a.out or os.path.splitext(a.content)[0] + ".html"
    if a.tmpdir:
        tmp = a.tmpdir; os.makedirs(tmp, exist_ok=True)
    else:
        tmp = tempfile.mkdtemp(prefix="vl-")
    gaps = [(GAP_SPEAKER if i + 1 < len(lines) and lines[i + 1]["speaker"] != l["speaker"] else GAP_LINE)
            for i, l in enumerate(lines)]

    audio_b64, has_audio, mime = "", False, "audio/mpeg"
    offsets, total = [], 0.0

    if a.audio:
        durs = [estimate(l["text"]) for l in lines]
        if have("ffprobe"):
            real = float(run(["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
                              "-of", "csv=p=0", a.audio]).stdout.decode().strip())
        else:
            real = sum(durs)
        scale = (real - LEAD_IN) / (sum(durs) + sum(gaps))
        t = LEAD_IN
        for d, g in zip(durs, gaps): offsets.append(t); t += (d + g) * scale
        total = real
        audio_b64 = base64.b64encode(open(a.audio, "rb").read()).decode()
        mime = "audio/wav" if a.audio.lower().endswith(".wav") else "audio/mpeg"
        has_audio = True
        log(f"external audio: {a.audio} ({real:.1f}s), proportional cue distribution")
    else:
        engine = a.engine or detect_engine()
        log("TTS engine:", engine)
        if engine != "silent":
            try:
                wavs = []
                for i, l in enumerate(lines):
                    v = resolve_voice(engine, content, l["speaker"])
                    key = hashlib.md5(f"{engine}|{v}|{l['text']}".encode()).hexdigest()[:10]
                    w = os.path.join(tmp, f"{i:03d}-{key}.wav")
                    if not (os.path.exists(w) and os.path.getsize(w) > 44):
                        synth_line(engine, l["text"], v, w, tmp)
                    wavs.append(w)
                    if i % 10 == 0: log(f"synthesized {i + 1}/{len(lines)}")
                full = os.path.join(tmp, "full.wav")
                offsets, total = concat_wavs(wavs, gaps, full)
                final = full
                if have("ffmpeg"):
                    mp3 = os.path.join(tmp, "full.mp3")
                    run(["ffmpeg", "-y", "-i", full, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-b:a", "112k", mp3])
                    final, mime = mp3, "audio/mpeg"
                else:
                    mime = "audio/wav"
                audio_b64 = base64.b64encode(open(final, "rb").read()).decode()
                has_audio = True
            except Exception as e:
                log("TTS failed, falling back to silent mode:", e)
                engine = "silent"
        if engine == "silent":
            t = LEAD_IN
            for l, g in zip(lines, gaps):
                offsets.append(t); t += estimate(l["text"]) + g
            total = t + 1.0

    # slide start times + cues
    slide_t = [None] * len(slides)
    for off, l in zip(offsets, lines):
        if slide_t[l["slide"]] is None: slide_t[l["slide"]] = off
    prev = 0.0
    for i in range(len(slides)):
        slide_t[i] = prev if slide_t[i] is None else slide_t[i]
        prev = slide_t[i]
    slide_t[0] = 0.0
    data = {
        "title": content["title"],
        "speakers": content.get("speakers", {"A": "Host", "B": "Expert"}),
        "slides": [{"chapter": s.get("chapter", ""), "html": s["html"], "t": round(t, 2)}
                   for s, t in zip(slides, slide_t)],
        "cues": [{"t": round(off, 2), "s": l["speaker"], "x": l["text"], "slide": l["slide"],
                  **({"term": l["term"]} if l.get("term") else {}),
                  **({"note": l["note"]} if l.get("note") else {})}
                 for off, l in zip(offsets, lines)],
        "glossary": gloss,
        "duration": round(total + 0.5, 2),
        "hasAudio": has_audio,
    }
    html = open(TEMPLATE).read()
    html = html.replace("__TITLE__", content["title"])
    html = html.replace("__AUDIO__", f"data:{mime};base64,{audio_b64}" if has_audio else "")
    html = html.replace("__DATA__", json.dumps(data, ensure_ascii=False))
    open(out, "w").write(html)
    if not a.tmpdir: shutil.rmtree(tmp, ignore_errors=True)
    log(f"OK -> {out} | {len(slides)} slides, {len(lines)} cues, {total / 60:.1f} min, audio={'yes' if has_audio else 'SILENT MODE'}")

if __name__ == "__main__":
    main()

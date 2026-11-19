#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Chinese ASR for a B站 explainer. Writes timestamped lines.

Usage:
    python transcribe_zh.py <audio-or-video> <out.txt> [--model large-v3] [--offset 0]
    python transcribe_zh.py <audio-or-video> <out.txt> --engine funasr

Contract
--------
* Chinese audio only. English audio needs a different recipe (see SKILL.md).
* The model is NOT told the language. Whisper is asked to detect it, then this
  script refuses to write a file when the detection is not zh, or when the
  probability is under --min-prob (default 0.50). Forcing language="zh" and then
  checking the returned language proves nothing: it echoes the input.
  If a chunk is genuinely mixed, pass --accept-lang with the language you want
  and the detection is printed so the choice stays visible.
* Reads audio through ffmpeg into float32 at 16 kHz, so a broken
  `av`/faster-whisper pairing cannot take the run down at decode time.
* One process, one file. Parallel large models get killed without a traceback
  on this class of machine; serialise instead of guessing.
* `--engine funasr` is the fallback when faster-whisper cannot start at all
  (`av`/torch mismatch raises about `metadata_errors` before any audio is read).
  It uses paraformer-zh + fsmn-vad + ct-punc on CPU and writes the same line
  format, so every downstream gate keeps working unchanged.
"""
import argparse
import os
import re
import subprocess
import sys

import numpy as np


def ffmpeg_exe():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


def to_audio(src):
    raw = subprocess.check_output(
        [ffmpeg_exe(), "-v", "error", "-i", src, "-f", "s16le",
         "-ac", "1", "-ar", "16000", "-"],
        stderr=subprocess.DEVNULL)
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0


def _ffmpeg_wav(src, keep=True):
    """16 kHz mono wav on disk: funasr wants a path, not a float array."""
    import tempfile
    fd, path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    subprocess.run([ffmpeg_exe(), "-y", "-v", "error", "-i", src,
                    "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", path],
                   check=True)
    return path


def transcribe_funasr(src, offset=0.0):
    """Returns [(start_s, end_s, text)] using FunASR sentence timestamps."""
    from funasr import AutoModel

    wav = _ffmpeg_wav(src)
    try:
        model = AutoModel(model="paraformer-zh", vad_model="fsmn-vad",
                          punc_model="ct-punc", device="cpu",
                          disable_update=True)
        res = model.generate(input=wav, batch_size_s=300,
                             sentence_timestamp=True)
    finally:
        try:
            os.remove(wav)
        except OSError:
            pass
    item = res[0]
    out = []
    for sent in item.get("sentence_info") or []:
        text = (sent.get("text") or "").strip()
        if text:
            out.append((sent["start"] / 1000.0 + offset,
                        sent["end"] / 1000.0 + offset, text))
    if not out:
        # no sentence split (very short clips): one line, duration unknown
        text = (item.get("text") or "").strip()
        if text:
            out.append((offset, offset, text))
    return out


def stamps(seconds, offset=0.0):
    t = int(round(seconds + offset))
    return "%02d:%02d" % (t // 60, t % 60)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--model", default="large-v3",
                    help="默认 large-v3；small/base 会把中文专名听错，只用于试跑")
    ap.add_argument("--offset", type=float, default=0.0)
    ap.add_argument("--min-prob", type=float, default=0.50)
    ap.add_argument("--accept-lang", default="zh",
                    help="language the transcript must be in (default zh)")
    ap.add_argument("--prompt", default="")
    ap.add_argument("--device", default="cpu")
    ap.add_argument("--compute", default="int8")
    ap.add_argument("--engine", choices=("whisper", "funasr"), default="whisper")
    ap.add_argument("--allow-short", action="store_true",
                    help="last chunk may be short/silent: write what came back instead of failing")
    args = ap.parse_args()

    if args.engine == "funasr":
        segs = transcribe_funasr(args.src, args.offset)
        lines = ["[%s-%s] %s" % (stamps(a, 0), stamps(b, 0), t) for a, b, t in segs]
        chars = sum(len(t) for _, _, t in segs)
        if chars < 50 and args.allow_short:
            # 短但非空就留着：片尾一句「我们下期再见」也是内容，删了就丢证据
            if not chars:
                open(args.dst, "w", encoding="utf-8").close()
                print("WARN funasr 这段没有文本（片尾静音），写空稿")
                return
            print("WARN funasr 这段只有 %d 字，仍按原文写出（片尾短块）" % chars)
        elif chars < 50:
            raise SystemExit("only %d chars from funasr; check the 16 kHz wav" % chars)
        # paraformer-zh is Chinese-only: given English it happily writes Chinese.
        # No language head to ask, so gate on the output itself.
        joined = "".join(t for _, _, t in segs)
        cjk = len(re.findall(r"[㐀-鿿]", joined))
        ratio = cjk / max(1, len(re.sub(r"\s+", "", joined)))
        if ratio < 0.5:
            if args.allow_short:
                print("WARN funasr 输出只有 %.0f%% 汉字，片尾短块按空稿处理" % (ratio * 100))
                open(args.dst, "w", encoding="utf-8").close()
                return
            raise SystemExit("funasr output is only %.0f%% CJK; not a Chinese "
                             "transcript, do not trust it" % (ratio * 100))
        tmp = args.dst + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(chr(10).join(lines) + chr(10))
        os.replace(tmp, args.dst)
        print("OK %s segs=%d chars=%d engine=funasr" % (args.dst, len(lines), chars))
        return

    from faster_whisper import WhisperModel

    audio = to_audio(args.src)
    if audio.size < 16000:
        if args.allow_short:
            print("WARN 音频不足一秒（片尾静音？），按 --allow-short 写空稿")
            open(args.dst, "w", encoding="utf-8").close()
            return
        raise SystemExit("audio shorter than one second: %s" % args.src)

    model = WhisperModel(args.model, device=args.device, compute_type=args.compute)
    segments, info = model.transcribe(
        audio,
        language=None,                       # detect, do not echo an input
        vad_filter=True,
        beam_size=5,
        condition_on_previous_text=False,
        initial_prompt=args.prompt or None,
    )
    segs = list(segments)

    if info.language != args.accept_lang or info.language_probability < args.min_prob:
        # 最后一段常常是静音或纯音乐：语言头给出的低概率不该判死整条转写
        if args.allow_short:
            print("WARN 语言判定异常（%s p=%.2f），片尾短块按空稿处理"
                  % (info.language, info.language_probability))
            open(args.dst, "w", encoding="utf-8").close()
            return
        raise SystemExit("language detected as %s (p=%.3f), expected %s; "
                         "do not trust this file"
                         % (info.language, info.language_probability, args.accept_lang))

    lines = ["[%s-%s] %s" % (stamps(s.start, args.offset),
                             stamps(s.end, args.offset),
                             s.text.strip())
             for s in segs if s.text.strip()]
    if not lines and not args.allow_short:
        raise SystemExit("no speech recognised; check the audio track")

    tmp = args.dst + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    os.replace(tmp, args.dst)
    print("OK %s segs=%d lang=%s p=%.3f dur=%.1fs"
          % (args.dst, len(lines), info.language,
             info.language_probability, audio.size / 16000.0))


if __name__ == "__main__":
    main()

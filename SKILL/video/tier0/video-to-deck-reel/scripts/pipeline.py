# -*- coding: utf-8 -*-
"""One entry point for the whole run.

    python pipeline.py <project> [--from fetch] [--to verify] [--only tts,timeline]
    python pipeline.py <project> --stage video
    python pipeline.py <project> --list

Stages, in order:

    fetch     B站 -> source/source.mp4 + source.meta.json      (public API)
    asr       source -> source/transcript/transcript_clean.txt (Chinese ASR)
    narration check_narration.py on reel/narration.json        (no TTS yet)
    tts       edge-tts -> reel/audio/narration/*.mp3 + timings
    timeline  timeline.json/.js + final.wav/.mp3 + bed and ducking
    frames    canvas -> reel/frames/*.png at timeline fps
    video     ffmpeg -> reel/out/final.mp4 + duration probe
    deck      build_deck.js -> ppt/deck.pptx, preview PNGs, check_deck.py
    verify    probe the mp4 and the pptx, print the evidence table

Every stage is idempotent: a rerun skips work that is already on disk
(asr chunks, frames, an existing deck). A stage that fails prints the command
it ran, so the failure is reproducible without this script.

The steps that need a human decision (writing narration.json, choosing deck
copy, looking at preview PNGs) are not stages. The pipeline stops at the gate
and says which file it is waiting for.
"""
import argparse
import json
import re
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CJK = re.compile(r"[\u3400-\u9fff]")
ORDER = ["fetch", "asr", "narration", "tts", "timeline", "frames", "video", "deck", "verify"]


def run(cmd, cwd, label):
    print("\n$ %s" % " ".join(cmd))
    proc = subprocess.run(cmd, cwd=cwd)
    if proc.returncode != 0:
        raise SystemExit("stage %s failed (exit %d): %s" % (label, proc.returncode, cmd[0]))


def ffmpeg_exe():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


def ffprobe_exe():
    """imageio's bundle ships ffmpeg but not ffprobe, so probe falls back to PATH.
    Both stages use this resolver: half the run using the bundle and half using a
    system binary is how a machine with only the pip deps dies at --stage video."""
    probe = shutil.which("ffprobe")
    if probe:
        return probe
    raise SystemExit("ffprobe 不在 PATH：装一个完整 ffmpeg（imageio 的包只有 ffmpeg，没有 ffprobe），"
                     "或只用 --stage timeline / frames")


def py(script, *args):
    return [sys.executable, os.path.join(HERE, script)] + list(args)


def need(root, rel, why):
    path = os.path.join(root, rel)
    if not os.path.exists(path):
        raise SystemExit("缺 %s（%s）" % (rel, why))
    return path


def stage_fetch(root, url, src_file=""):
    meta = os.path.join(root, "source", "source.meta.json")
    video = os.path.join(root, "source", "source.mp4")
    if src_file:
        # subprocesses run with cwd=root, so a relative --file must be made absolute
        src_file = os.path.abspath(src_file)
    if os.path.isfile(video) and os.path.getsize(video) > 1_000_000:
        print("fetch: already have source.mp4, skip (delete source/ to refetch)")
        return
    if src_file:
        run(py("fetch_bili.py", "--file", src_file, "-o", os.path.join(root, "source")),
            root, "fetch")
        return
    if not url:
        raise SystemExit("fetch 需要 URL 或 --file："
                         "python pipeline.py <project> --url https://b23.tv/xxx")
    run(py("fetch_bili.py", url, "-o", os.path.join(root, "source")), root, "fetch")


def stage_asr(root, engine="whisper"):
    meta = json.load(open(need(root, "source/source.meta.json", "先跑 fetch"), encoding="utf-8"))
    src = os.path.join(root, "source", "source.mp4")
    outdir = os.path.join(root, "source", "transcript")
    prompt = meta.get("prompt") or ""
    args = [src, outdir, "--model", "large-v3", "--chunk", "115", "--engine", engine]
    if prompt:
        args += ["--prompt", prompt]
    run(py("transcribe_all.py", *args), root, "asr")


def stage_narration(root):
    path = os.path.join(root, "reel", "narration.json")
    if not os.path.exists(path):
        # The one gate that waits for a human. Stop the whole run instead of
        # printing a notice and letting tts crash on a missing file later.
        print("narration: 停下等你写 reel/narration.json（voice / rate / segments[]）")
        print("          写完再跑同一条命令，或 --stage tts 往下走")
        raise SystemExit(4)
    need(root, "source/transcript/transcript_clean.txt", "先跑 asr")
    run(py("check_narration.py", "reel/narration.json",
           "source/transcript/transcript_clean.txt"), root, "narration")


def stage_tts(root):
    # the gate runs here too: --stage tts and --only tts,timeline used to reach
    # synthesis (network, minutes) before anything checked the script
    stage_narration(root)
    run(py("tts_edge.py", root), root, "tts")


def stage_timeline(root):
    need(root, "reel/audio/timings.json", "先跑 tts")
    run(py("build_timeline.py", root), root, "timeline")
    run(py("check_narration.py", "reel/narration.json",
           "source/transcript/transcript_clean.txt", "reel/timeline.json"), root, "narration")


def stage_frames(root):
    need(root, "reel/timeline.json", "先跑 timeline")
    run(["node", os.path.join(HERE, "render_frames.mjs"), root], root, "frames")
    timeline = json.load(open(os.path.join(root, "reel", "timeline.json"), encoding="utf-8"))
    expected = timeline.get("frames") or round(timeline["total"] * timeline["fps"])
    run(py("check_frames.py", os.path.join(root, "reel", "frames"),
           "--expected", str(expected), "--fps", str(timeline["fps"]),
           "--timeline", os.path.join(root, "reel", "timeline.json"),
           "--width", str(timeline["width"]), "--height", str(timeline["height"])), root, "frames")


def stage_video(root):
    timeline = json.load(open(need(root, "reel/timeline.json", "先跑 timeline"), encoding="utf-8"))
    frames = os.path.join(root, "reel", "frames")
    audio = os.path.join(root, "reel", "audio", "final.wav")
    out = os.path.join(root, "reel", "out")
    os.makedirs(out, exist_ok=True)
    mp4 = os.path.join(out, "final.mp4")
    run([ffmpeg_exe(), "-y", "-v", "error", "-framerate", str(timeline["fps"]),
         "-i", os.path.join(frames, "f_%05d.png"), "-i", audio,
         "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", "-shortest", mp4], root, "video")

    info = json.loads(subprocess.check_output(
        [ffprobe_exe(), "-v", "error", "-show_entries",
         "stream=codec_type,width,height,avg_frame_rate:format=duration",
         "-of", "json", mp4]).decode("utf-8"))
    streams = {s["codec_type"]: s for s in info["streams"]}
    duration = float(info["format"]["duration"])
    if abs(duration - timeline["total"]) > 1.0 / timeline["fps"] + 0.05:
        raise SystemExit("成片 %.2fs 与时间轴 %.2fs 不一致" % (duration, timeline["total"]))
    if "video" not in streams or "audio" not in streams:
        raise SystemExit("成片缺轨道：%s" % list(streams))
    print("video OK %.2fs %dx%d %s %.1fMB"
          % (duration, streams["video"]["width"], streams["video"]["height"],
             streams["video"]["avg_frame_rate"], os.path.getsize(mp4) / 1e6))


def deck_check_args(root):
    """The two facts check_deck cannot invent: how long the source is, and the
    transcript its figures must come from. Passing them here is what makes the
    timecode and figure gates run on the one-command path, not only by hand."""
    args = []
    meta = os.path.join(root, "source", "source.meta.json")
    if os.path.exists(meta):
        seconds = json.load(open(meta, encoding="utf-8")).get("duration_sec") or 0
        if seconds:
            args += ["--duration", str(int(seconds))]
    transcript = os.path.join(root, "source", "transcript", "transcript_clean.txt")
    if os.path.exists(transcript):
        args += ["--transcript", transcript]
    return args


def stage_deck(root):
    need(root, "ppt/deck.json", "先写课件稿")
    need(root, "ppt/theme.json", "缺少主题文件 theme.json")
    if shutil.which("node") is None:
        raise SystemExit("deck 需要 node")
    pptx = os.path.join(root, "ppt", "deck.pptx")
    run(["node", os.path.join(HERE, "build_deck.js"), root], root, "deck")
    # preview comes from the pptx geometry, not from a second layout
    run(py("deck_preview.py", pptx), root, "deck")
    run(["node", os.path.join(HERE, "shot_preview.mjs"), root], root, "deck")
    run(py("check_deck.py", pptx, *deck_check_args(root)), root, "deck")
    shots = os.path.join(root, "ppt", "preview")
    if not os.path.isdir(shots) or not os.listdir(shots):
        raise SystemExit("deck: 预览 PNG 没生成，检查 shot_preview.mjs 的 playwright")


def stage_verify(root, allow_partial=False):
    rows = []
    meta_path = os.path.join(root, "source", "source.meta.json")
    timeline_path = os.path.join(root, "reel", "timeline.json")
    mp4 = os.path.join(root, "reel", "out", "final.mp4")
    pptx = os.path.join(root, "ppt", "deck.pptx")
    for path, label in ((meta_path, "source.meta.json"), (timeline_path, "timeline.json"),
                        (mp4, "final.mp4"), (pptx, "deck.pptx")):
        size = os.path.getsize(path) if os.path.isfile(path) else 0
        # a zero-byte deliverable is MISSING, not OK: exists() alone let empty files pass
        rows.append((label, size > 0, size))
    if os.path.exists(meta_path):
        meta = json.load(open(meta_path, encoding="utf-8"))
        print("source  %s  %s  %ss  %sx%s"
              % (meta.get("bvid"), meta.get("title", "")[:34], meta.get("duration_sec"),
                 *(meta.get("resolution") or ["?", "?"])))
    else:
        print("source  MISSING source/source.meta.json（fetch 阶段没跑过）")
    if os.path.exists(timeline_path):
        tl = json.load(open(timeline_path, encoding="utf-8"))
        # 与 check_narration.py / build_timeline.py 用同一个口径：只数汉字
        chars = sum(len(CJK.findall(s["text"])) for s in tl["segments"])
        print("reel    %.2fs  %d 段  %d fps  %d 帧"
              % (tl["total"], len(tl["segments"]), tl["fps"], round(tl["total"] * tl["fps"])))
        print("narration %d 字  %.2f 字/秒  voice %s"
              % (chars, chars / max(1e-6, sum(s["end"] - s["start"] for s in tl["segments"])),
                 tl.get("voice")))

    def probe_mp4(path):
        info = json.loads(subprocess.check_output(
            [ffprobe_exe(), "-v", "error", "-show_entries",
             "stream=codec_type,width,height,avg_frame_rate:format=duration",
             "-of", "json", path]).decode("utf-8"))
        streams = {x["codec_type"]: x for x in info["streams"]}
        if "video" not in streams or "audio" not in streams:
            raise SystemExit("verify: final.mp4 缺轨道 %s" % list(streams))
        v = streams["video"]
        tl_path = os.path.join(root, "reel", "timeline.json")
        if os.path.exists(tl_path):
            tl = json.load(open(tl_path, encoding="utf-8"))
            want = (int(tl.get("width", 1920)), int(tl.get("height", 1080)))
            got = (int(v["width"]), int(v["height"]))
            if got != want:
                raise SystemExit("verify: 成片 %dx%d 与时间轴 %dx%d 不一致"
                                 % (got[0], got[1], want[0], want[1]))
            num, _, den = str(v.get("avg_frame_rate", "0/1")).partition("/")
            fps = float(num) / float(den or 1)
            if abs(fps - float(tl.get("fps", 30))) > 0.01:
                raise SystemExit("verify: 成片 %.3f fps 与时间轴 %s fps 不一致"
                                 % (fps, tl.get("fps")))
            length = float(info["format"]["duration"])
            if abs(length - float(tl["total"])) > 0.1:
                raise SystemExit("verify: 成片 %.2fs 与时间轴 %.2fs 不一致"
                                 % (length, float(tl["total"])))
        print("mp4     %sx%s %s  %.2fs  %.1f MB"
              % (v["width"], v["height"], v["avg_frame_rate"],
                 float(info["format"]["duration"]), os.path.getsize(path) / 1e6))

    for label, ok, size in rows:
        print("%-18s %-5s %.1f MB" % (label, "OK" if ok else "MISSING", size / 1e6))
    missing = [label for label, ok, _ in rows if not ok]
    if missing:
        raise SystemExit("verify: 缺 %s" % ", ".join(missing))
    probe_mp4(mp4)
    # every deliverable has to pass its own gate here, not merely exist: an edit
    # to narration.json followed by `--stage verify` used to print PASS on
    # narration that its own gate rejects
    tr = os.path.join(root, "source", "transcript", "transcript_clean.txt")
    frames = os.path.join(root, "reel", "frames")
    have_frames = os.path.isdir(frames) and any(f.endswith(".png") for f in os.listdir(frames))
    if not allow_partial:
        # verify is the last line of defence: silently skipping a gate here is how a
        # stale narration or a deleted frame set still prints PASS
        for need_path, why in ((tr, "逐字稿"), (frames, "帧序列")):
            if need_path == frames and not have_frames:
                raise SystemExit("verify: 帧目录是空的（%s）。要跳过就加 --allow-partial-verify，"
                                 "并在交付说明里写明哪道闸门没跑。" % frames)
            if not os.path.exists(need_path):
                raise SystemExit("verify: 缺%s（%s）。要跳过就加 --allow-partial-verify，"
                                 "并在交付说明里写明哪道闸门没跑。" % (why, need_path))
    elif not (os.path.exists(tr) and have_frames):
        print("WARN --allow-partial-verify：逐字稿或帧目录缺失，本次没有跑满四道闸门")
    if os.path.exists(tr) and os.path.exists(timeline_path):
        run(py("check_narration.py", "reel/narration.json",
               "source/transcript/transcript_clean.txt", "reel/timeline.json"), root, "verify")
    if have_frames:
        tl2 = json.load(open(timeline_path, encoding="utf-8"))
        run(py("check_frames.py", frames,
               "--expected", str(tl2.get("frames") or round(tl2["total"] * tl2["fps"])),
               "--fps", str(tl2["fps"]), "--timeline", timeline_path,
               "--width", str(tl2.get("width", 1920)),
               "--height", str(tl2.get("height", 1080))), root, "verify")
    run(py("check_deck.py", pptx, *deck_check_args(root)), root, "verify")
    print("verify PASS")


STAGES = {
    "fetch": stage_fetch,
    "asr": stage_asr,
    "narration": stage_narration,
    "tts": stage_tts,
    "timeline": stage_timeline,
    "frames": stage_frames,
    "video": stage_video,
    "deck": stage_deck,
    "verify": stage_verify,
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--url", default="")
    ap.add_argument("--file", dest="src_file", default="",
                    help="local video instead of a URL")
    ap.add_argument("--from", dest="start", default="", choices=[""] + ORDER,
                    help="start stage (inclusive)")
    ap.add_argument("--to", dest="end", default="", choices=[""] + ORDER,
                    help="end stage (inclusive)")
    ap.add_argument("--only", default="")
    ap.add_argument("--stage", default="", choices=[""] + ORDER)
    ap.add_argument("--engine", default="whisper", choices=("whisper", "funasr"),
                    help="asr engine; funasr is the fallback when faster-whisper "
                         "cannot start (av/torch mismatch)")
    ap.add_argument("--allow-partial-verify", action="store_true",
                    help="verify may skip the narration/frames gates if those inputs are gone")
    ap.add_argument("--list", action="store_true")
    a = ap.parse_args()

    if a.list:
        print(" -> ".join(ORDER))
        return 0

    root = os.path.abspath(a.project)
    os.makedirs(root, exist_ok=True)
    if a.only:
        plan = [s.strip() for s in a.only.split(",") if s.strip()]
        unknown = [s for s in plan if s not in STAGES]
        if unknown:
            raise SystemExit("unknown stage %s" % unknown)
    elif a.stage:
        plan = [a.stage]
    else:
        start = ORDER.index(a.start) if a.start else 0
        end = ORDER.index(a.end) if a.end else len(ORDER) - 1
        plan = ORDER[start:end + 1]

    for name in plan:
        print("\n=== %s ===" % name)
        if name == "fetch":
            STAGES[name](root, a.url, a.src_file)
        elif name == "asr":
            STAGES[name](root, a.engine)
        elif name == "verify":
            STAGES[name](root, a.allow_partial_verify)
        else:
            STAGES[name](root)
    return 0


if __name__ == "__main__":
    sys.exit(main())

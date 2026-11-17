# -*- coding: utf-8 -*-
"""Reject a blank, frozen or wrong-sized frame sequence before encoding.

    python check_frames.py <frames-dir> [--expected N] [--samples 7] [--min-std 3.0]

Three independent failures, each measured on downscaled RGB samples:

  blank   a sampled frame whose pixel standard deviation is under --min-std.
          A near-solid card (dark theme or white theme) is not a frame.
  frozen  with --timeline, every segment is compared at its start and near its
          end: the median segment must move at least --min-change percent of its
          pixels. Without --timeline it falls back to 25 pairs two seconds apart,
          which is the wrong question for a slide-like canvas (a held shot is
          legitimate); pass the timeline.

Why a changed-pixel fraction and not a mean difference: on a top-down plan a
24 px dot moving 40 px changes a few thousand pixels out of two million, so the
mean is ~0.03 while the eye clearly sees movement. Mean difference also punishes
a large dim change and rewards a noisy one. Fraction of pixels above a delta
threshold matches what "did something move" actually means.

Why 2 s and not adjacent frames: at 30 fps a slow camera push changes almost
nothing between neighbours. Measured on this film: median 0.004 mean-diff
between neighbours, 2.4% changed pixels across 2 s. Adjacent-frame gating would
fail every cinematic shot and reward nervous motion.
  size    any PNG that is not the timeline size, or a count shorter than
          --expected.

Std-dev instead of a dark-pixel count: the previous version of this check
assumed a dark theme and failed a light deck. Theme-independent is cheaper than
a theme parameter.
"""
import argparse
import glob
import json
import os
import re
import sys

from PIL import Image, ImageStat


def load(path, size=(320, 180)):
    return Image.open(path).convert("RGB").resize(size, Image.LANCZOS)


def stddev(img):
    return sum(ImageStat.Stat(img).stddev) / 3.0


def mean_abs_diff(a, b):
    from PIL import ImageChops
    return sum(ImageStat.Stat(ImageChops.difference(a, b)).mean) / 3.0


def changed_pct(a, b, delta=8):
    """Percent of pixels whose channel difference exceeds delta."""
    from PIL import ImageChops
    grey = ImageChops.difference(a, b).convert("L")
    hist = grey.histogram()
    total = sum(hist)
    moved = sum(hist[delta + 1:])
    return moved * 100.0 / max(1, total)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("frames")
    ap.add_argument("--expected", type=int, default=0)
    ap.add_argument("--samples", type=int, default=7)
    ap.add_argument("--min-std", type=float, default=3.0)
    ap.add_argument("--min-diff", type=float, default=0.35)
    ap.add_argument("--min-change", type=float, default=0.25,
                    help="percent of pixels that must change across 2 s")
    ap.add_argument("--delta", type=int, default=8,
                    help="channel delta that counts as a changed pixel")
    ap.add_argument("--width", type=int, default=1920)
    ap.add_argument("--height", type=int, default=1080)
    ap.add_argument("--fps", type=int, default=30,
                    help="timeline fps; the 2-second stride is computed from this")
    ap.add_argument("--timeline", default="",
                    help="reel/timeline.json: compare each segment start vs end")
    ap.add_argument("--no-contiguity", action="store_true",
                    help="skip the f_00000..f_NNNNN name check")
    a = ap.parse_args()

    files = sorted(glob.glob(os.path.join(a.frames, "f_*.png")))
    if not files:
        # 传项目根目录也认：帧固定落在 <project>/reel/frames
        alt = os.path.join(a.frames, "reel", "frames")
        alt_files = sorted(glob.glob(os.path.join(alt, "f_*.png")))
        if alt_files:
            print("note: %s 里没有帧，改用 %s" % (a.frames, alt))
            a.frames, files = alt, alt_files
    if not files:
        print("no frames in %s\n"
              "下一步：先跑 pipeline.py <project> --stage frames（帧落在 <project>/reel/frames），"
              "再把那个目录传进来。" % a.frames)
        return 1
    expected = a.expected or len(files)
    if len(files) < expected:
        print("frame count %d < expected %d" % (len(files), expected))
        return 1

    # names must be contiguous: a hole means the renderer died mid-run and a
    # resumed pass would staple two different cuts together
    if not a.no_contiguity:
        want = ["f_%05d.png" % i for i in range(expected)]
        have = [os.path.basename(f) for f in files[:expected]]
        gap = next((w for w, h in zip(want, have) if w != h), None)
        if gap:
            print("frame sequence broken at %s: names must be f_00000..f_%05d"
                  % (gap, expected - 1))
            return 1

    # sizes: check a spread, not all of them, so this stays under a second
    for path in (files[0], files[len(files) // 2], files[-1]):
        with Image.open(path) as im:
            if (im.width, im.height) != (a.width, a.height):
                print("wrong size %s: %dx%d" % (path, im.width, im.height))
                return 1
        m = re.search(r"f_(\d+)\.png$", path)
        if not m:
            print("unexpected frame name %s" % path)
            return 1

    # sparse sampling: this gate can miss a short black flash between two
    # sampled frames. It is a cheap smoke test, not a full scan.
    n = max(2, a.samples)
    idx = sorted({int(round((len(files) - 1) * i / (n - 1))) for i in range(n)})
    # 开场淡入与收尾淡出的首尾 0.2 秒可以接近纯色，不参与空白判定；
    # 中间帧照样查，那里的空白几乎总是漏画。
    edge = max(1, int(round(a.fps * 0.2)))
    idx = [i for i in idx if edge <= i <= len(files) - 1 - edge] or idx
    picks = [files[i] for i in idx]
    images = [load(p) for p in picks]
    stds = [round(stddev(im), 2) for im in images]
    diffs = [round(mean_abs_diff(images[i], images[i + 1]), 2)
             for i in range(len(images) - 1)]
    if not diffs:
        print("note: only %d sample(s) after trimming the fade edges; "
              "adjacent-diff checks skipped (lower --samples?)" % len(images))

    # per-segment motion when a timeline is available: the rule in the skill is
    # "every spoken segment moves", not "every arbitrary 2 s window moves"
    seg_pairs, unpairable, seg_change = [], [], []
    if a.timeline:
        if not os.path.isfile(a.timeline):
            print("FAIL: --timeline %s 不存在；不给时间轴就没法逐段判定" % a.timeline)
            return 1
        tl = json.load(open(a.timeline, encoding="utf-8"))
        if not tl.get("segments"):
            print("FAIL: --timeline 里没有 segments；给不出段就没法逐段判定")
            return 1
        fps = max(1, a.fps)
        for seg in tl.get("segments", []):
            i0 = int(round((float(seg["start"]) + 0.15) * fps))
            i1 = int(round((float(seg["end"]) - 0.25) * fps))
            if 0 <= i0 < i1 < len(files):
                seg_pairs.append((seg.get("id", "?"), i0, i1))
            else:
                unpairable.append(seg.get("id", "?"))
        if unpairable:
            print("FAIL: 这些段在帧序列里找不到可比的起止帧（段太短或帧数不足）：%s"
                  % ", ".join(map(str, unpairable)))
            return 1
    if seg_pairs:
        for sid, i0, i1 in seg_pairs:
            a_img = load(files[i0], (320, 180))
            b_img = load(files[i1], (320, 180))
            seg_change.append((round(changed_pct(a_img, b_img, a.delta), 3), sid))
        values = sorted(c for c, _ in seg_change)
        median = values[len(values) // 2]
        stride = 0
        pair_change = [c for c, _ in seg_change]
        still_pairs = sum(1 for c in pair_change if c < 0.02)
        print("segment change%% (start vs end): %s"
              % ", ".join("%s=%.2f" % (sid, c) for c, sid in seg_change))
    else:
        # fallback: 25 adjacent pairs across the whole range, cheap at 320x180
        n_pairs = 25
        fps = max(1, a.fps)
        stride = max(1, fps * 2)                   # 2 seconds
        if len(files) <= stride + 1:
            print("only %d frames, shorter than the %d-frame stride; pair scan skipped"
                  % (len(files), stride))
            pair_idx = []
        else:
            pair_idx = [int(round((len(files) - 1 - stride) * i / (n_pairs - 1)))
                        for i in range(n_pairs)]
        pair_change = []
        for i in pair_idx:
            first = load(files[i], (320, 180))
            second = load(files[min(len(files) - 1, i + stride)], (320, 180))
            pair_change.append(round(changed_pct(first, second, a.delta), 3))
        if pair_change:
            pair_change_sorted = sorted(pair_change)
            median = pair_change_sorted[len(pair_change_sorted) // 2]
        else:
            pair_change_sorted, median = [1.0], 1.0
        still_pairs = sum(1 for c in pair_change if c < 0.02)

    print("frames=%d sampled=%s" % (len(files), idx))
    print("stddev=%s" % stds)
    print("consecutive diff=%s" % diffs)
    if pair_change:
        scope = "start vs end" if seg_pairs else "stride=%d frames" % stride
        print("changed%% (%s) median=%.3f min=%.3f max=%.3f still=%d/%d"
              % (scope, median, min(pair_change), max(pair_change),
                 still_pairs, len(pair_change)))

    if min(stds) < a.min_std:
        print("BLANK frame at index %s（该帧近乎纯色：检查段落是否忘了画东西）"
              % idx[stds.index(min(stds))])
        return 1
    # --min-diff 只在没有 --timeline 时生效：两个采样点落进同一段静止画面是常态，
    # 中位数也会被静态排版拉低。给了时间轴就以逐段运动为准（每段都在动才算过）。
    med_diff = sorted(diffs)[len(diffs) // 2] if diffs else 1.0
    if med_diff < a.min_diff and not seg_pairs:
        print("STILL: median consecutive diff %.2f under %.2f (min %.2f)"
              % (med_diff, a.min_diff, min(diffs)))
        return 1
    if seg_pairs:
        dead = [sid for c, sid in seg_change if c < 0.02]
        if dead:
            print("DEAD SEGMENTS (start and end frame identical): %s" % ", ".join(dead))
            return 1
    # every segment must move: a single dead segment is 10-20 seconds of frozen
    # picture in the finished cut, and the median would hide exactly one.
    dead = [(sid, c) for c, sid in seg_change if c < a.min_change]
    if dead:
        print("FROZEN segment(s): %s（这几段几乎不动，低于 %.2f%%）"
              % (", ".join("%s=%.2f%%" % (sid, c) for sid, c in dead), a.min_change))
        return 1
    if median < a.min_change:
        where = ("中位段只有" if seg_pairs else "每 2 秒采样中位只有")
        print("FROZEN: %s %.3f%% 的像素在动，低于 %.2f%%"
              "（该段几乎静止：检查这一段是不是只有数字在跳）"
              % (where, median, a.min_change))
        return 1
    print("PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())

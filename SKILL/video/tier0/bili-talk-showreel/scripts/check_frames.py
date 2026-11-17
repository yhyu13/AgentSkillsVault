# -*- coding: utf-8 -*-
"""Sample rendered frames and reject a blank or frozen reel."""
import glob
import os
import sys

from PIL import Image, ImageChops, ImageStat


def ink(path):
    image = Image.open(path).convert("RGB").resize((192, 108))
    return sum(1 for r, g, b in image.getdata() if r < 180 or g < 150 or b < 130)


def main():
    frames = sorted(glob.glob(os.path.join(sys.argv[1], "f_*.png")))
    if len(frames) < 30:
        print("frames too few: %d" % len(frames))
        return 1
    picks = [frames[int(len(frames) * p)] for p in (0.05, 0.3, 0.55, 0.8, 0.95)]
    counts = [ink(path) for path in picks]
    if min(counts) < 100:
        print("blank frame", list(zip(picks, counts)))
        return 1
    diff = ImageChops.difference(Image.open(picks[0]), Image.open(picks[-1]))
    if max(ImageStat.Stat(diff).mean) < 2:
        print("frozen reel")
        return 1
    print("frames checked", counts)
    return 0


if __name__ == "__main__":
    sys.exit(main())

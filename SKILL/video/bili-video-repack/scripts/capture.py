# -*- coding: utf-8 -*-
"""Frame-accurate capture of reel/index.html with Playwright.

Two modes:
  --stills 1.2,8.5,...   -> qa/still_<t>.png  (self-check before the long render)
  --video                -> frames/f_00000.png ... at TL.fps, then nothing else
The page exposes renderAt(t); we never rely on CSS animation or timers.
"""
import argparse
import json
import os
import sys
import time

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REEL = os.path.join(ROOT, "reel")
PAGE = "file:///" + os.path.join(REEL, "index.html").replace("\\", "/")


def load_tl():
    with open(os.path.join(REEL, "timeline.json"), encoding="utf-8") as f:
        return json.load(f)


def shot(page, t, path, clip=None):
    page.evaluate("window.renderAt(%f)" % t)
    page.wait_for_timeout(45)
    page.screenshot(path=path, clip=clip)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stills", default=None)
    ap.add_argument("--video", action="store_true")
    ap.add_argument("--out", default=os.path.join(ROOT, "qa"))
    ap.add_argument("--frames", default=os.path.join(REEL, "frames"))
    ap.add_argument("--sheet", action="store_true")
    a = ap.parse_args()

    tl = load_tl()
    W, H, FPS = tl["width"], tl["height"], tl["fps"]

    with sync_playwright() as pw:
        b = pw.chromium.launch(args=["--force-device-scale-factor=1", "--font-render-hinting=none"])
        page = b.new_page(viewport={"width": W, "height": H}, device_scale_factor=1)
        page.goto(PAGE + "?capture=1&t=0")
        page.wait_for_function("window.__ready === true", timeout=30000)
        page.wait_for_timeout(250)

        if a.stills:
            os.makedirs(a.out, exist_ok=True)
            paths = []
            for part in a.stills.split(","):
                t = float(part)
                p = os.path.join(a.out, "still_%06.2f.png" % t)
                shot(page, t, p)
                paths.append((t, p))
                print("still t=%.2fs -> %s" % (t, p))
            if a.sheet:
                make_sheet(paths, a.out)

        if a.video:
            os.makedirs(a.frames, exist_ok=True)
            n = int(round(tl["total"] * FPS))
            t0 = time.time()
            for i in range(n):
                p = os.path.join(a.frames, "f_%05d.png" % i)
                shot(page, i / FPS, p)
                if i % 300 == 0 or i == n - 1:
                    el = time.time() - t0
                    print("frame %d/%d  %.1fs  eta %.1f min" % (i + 1, n, el, (el / (i + 1)) * (n - i - 1) / 60),
                          flush=True)
            print("captured %d frames -> %s" % (n, a.frames))

        b.close()


def make_sheet(paths, out):
    from PIL import Image
    cols = 3
    tw = 640
    rows = (len(paths) + cols - 1) // cols
    ims = [Image.open(p) for _, p in paths]
    th = int(tw * ims[0].height / ims[0].width)
    sheet = Image.new("RGB", (cols * tw, rows * th), (30, 28, 26))
    for i, im in enumerate(ims):
        sheet.paste(im.resize((tw, th), Image.LANCZOS), ((i % cols) * tw, (i // cols) * th))
    p = os.path.join(out, "sheet.png")
    sheet.save(p)
    print("sheet -> %s" % p)


if __name__ == "__main__":
    sys.exit(main())

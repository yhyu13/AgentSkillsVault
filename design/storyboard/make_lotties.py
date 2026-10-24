#!/usr/bin/env python
"""
make_lotties.py
Generate a set of OWNED, brand-colored Lottie animations (MIT, no external
assets) and a single bundle for offline/file:// playback.

Outputs:
  skill/assets/lottie/<name>.json   - individual Lottie files (use with data-src)
  skill/assets/lottie-bundle.js     - window.SB_LOTTIE map (use with data-key)

Play in a deck (engine has a real `lottie` preset):
  <div class="anim" data-anim="lottie" data-key="confetti" data-t-rel="0.2" data-dur="2.0"></div>
  <div class="anim" data-anim="lottie" data-src="assets/lottie/check.json" ...></div>

These are procedurally authored from primitives + straight-line paths, so they
are 100% owned and reproducible. Re-run after editing to regenerate.
"""
import json
import math
from pathlib import Path

FR = 30
W = H = 512
CX = CY = 256

# Brand palette as Lottie [r,g,b] floats (0..1)
ACC  = [0.486, 0.361, 1.000]   # #7C5CFF
ACC2 = [0.098, 0.890, 0.694]   # #19E3B1
ACC3 = [1.000, 0.361, 0.541]   # #FF5C8A
GOLD = [1.000, 0.820, 0.400]   # #FFD166
WHITE= [0.918, 0.941, 1.000]
SOFT = [0.604, 0.639, 0.753]
PALETTE = [ACC, ACC2, ACC3, GOLD]


# ---------------------------------------------------------------- primitives
def seed(i):
    return ((i * 9301 + 49297) % 233280) / 233280.0

def kf(frames, ease_in=0.6, ease_out=0.4):
    """frames=[(t,[vals]),...] -> animated property with array-form eases."""
    out = []
    for idx, (t, v) in enumerate(frames):
        k = {"t": t, "s": v}
        if idx < len(frames) - 1:
            k["i"] = {"x": [ease_in], "y": [1]}
            k["o"] = {"x": [ease_out], "y": [0]}
        out.append(k)
    return {"a": 1, "k": out}

def stat(v):
    return {"a": 0, "k": v}

def fill(c, o=100):
    return {"ty": "fl", "c": stat(c), "o": stat(o), "r": 1, "nm": "fill"}

def stroke(c, w, o=100):
    return {"ty": "st", "c": stat(c), "o": stat(o), "w": stat(w),
            "lc": 2, "lj": 2, "ml": 4, "nm": "stroke"}

def trim(end_prop, start=0):
    return {"ty": "tm", "s": stat(start), "e": end_prop, "o": stat(0), "m": 1, "nm": "trim"}

def grtr(p=(0, 0), s=(100, 100), r=0, o=100):
    return {"ty": "tr", "p": stat(list(p)), "a": stat([0, 0]),
            "s": stat(list(s)), "r": stat(r), "o": stat(o)}

def ellipse(w, h, p=(0, 0)):
    return {"ty": "el", "d": 1, "s": stat([w, h]), "p": stat(list(p))}

def rect(w, h, p=(0, 0), r=0):
    return {"ty": "rc", "d": 1, "s": stat([w, h]), "p": stat(list(p)), "r": stat(r)}

def path(verts, closed=True):
    return {"ty": "sh", "d": 1, "ks": stat({
        "c": closed,
        "v": [[round(x, 2), round(y, 2)] for x, y in verts],
        "i": [[0, 0] for _ in verts],
        "o": [[0, 0] for _ in verts],
    })}

def group(items, tr_kw=None):
    it = list(items)
    it.append({"ty": "tr", "p": stat([0, 0]), "a": stat([0, 0]),
               "s": stat([100, 100]), "r": stat(0), "o": stat(100)} if tr_kw is None else tr_kw)
    return {"ty": "gr", "it": it, "nm": "g"}

def layer(ind, shapes, ks=None, op=None, ip=0):
    if ks is None:
        ks = {}
    K = {"o": ks.get("o", stat([100])), "r": ks.get("r", stat([0])),
         "p": ks.get("p", stat([CX, CY, 0])), "a": ks.get("a", stat([0, 0, 0])),
         "s": ks.get("s", stat([100, 100, 100]))}
    return {"ddd": 0, "ind": ind, "ty": 4, "nm": "l%d" % ind, "sr": 1,
            "ks": K, "ao": 0, "shapes": shapes, "ip": ip,
            "op": op if op is not None else OP_DEFAULT, "st": 0, "bm": 0}

def doc(name, layers, op):
    return {"v": "5.7.4", "fr": FR, "ip": 0, "op": op, "w": W, "h": H,
            "nm": name, "ddd": 0, "assets": [], "layers": layers}

def star_verts(cx, cy, outer, inner, points=5, rot=-90):
    v = []
    for i in range(points * 2):
        r = outer if i % 2 == 0 else inner
        a = math.radians(rot + i * 180.0 / points)
        v.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return v

OP_DEFAULT = 60


# ---------------------------------------------------------------- animations
def make_check():
    op = 34
    circle = layer(1, [group([ellipse(300, 300), stroke(ACC2, 18),
                              trim(kf([(0, [0]), (16, [100])]))])], op=op)
    chk = layer(2, [group([
        path([(190, 262), (236, 308), (322, 206)], closed=False),
        stroke(ACC2, 22),
        trim(kf([(10, [0]), (28, [100])]))])], op=op)
    return doc("check", [chk, circle], op)

def make_confetti():
    op = 46
    N = 28
    layers = []
    for i in range(N):
        a = (i / N) * 2 * math.pi + seed(i) * 2.0
        dist = 150 + seed(i + 3) * 120
        col = PALETTE[i % 4]
        midx, midy = CX + math.cos(a) * dist * 0.55, CY + math.sin(a) * dist * 0.55 - 70
        endx, endy = CX + math.cos(a) * dist, CY + math.sin(a) * dist + 150
        rot_end = (1 if i % 2 else -1) * (360 + seed(i + 7) * 360)
        shp = rect(16, 24, r=3) if i % 3 else ellipse(18, 18)
        ks = {
            "p": kf([(0, [CX, CY]), (12, [midx, midy]), (op, [endx, endy])]),
            "r": kf([(0, [0]), (op, [rot_end])]),
            "o": {"a": 1, "k": [
                {"t": 0, "s": [100], "i": {"x": [0.6], "y": [1]}, "o": {"x": [0.4], "y": [0]}},
                {"t": int(op * 0.6), "s": [100], "i": {"x": [0.6], "y": [1]}, "o": {"x": [0.4], "y": [0]}},
                {"t": op, "s": [0]}]},
            "s": stat([100, 100, 100]),
        }
        layers.append(layer(i + 1, [group([shp, fill(col)])], ks=ks, op=op))
    return doc("confetti", layers, op)

def make_heart():
    op = 34
    # composite heart from 2 circles + a rotated square (all primitives)
    left = group([ellipse(220, 220, p=(-58, -34)), fill(ACC3)])
    right = group([ellipse(220, 220, p=(58, -34)), fill(ACC3)])
    sq = group([rect(220, 220, p=(0, 36), r=14), fill(ACC3)],
               tr_kw={"ty": "tr", "p": stat([0, 0]), "a": stat([0, 36]),
                      "s": stat([100, 100]), "r": stat(45), "o": stat(100)})
    ks = {
        "s": kf([(0, [0, 0, 100]), (9, [118, 118, 100]), (16, [100, 100, 100]),
                 (23, [110, 110, 100]), (30, [100, 100, 100])]),
        "o": kf([(0, [0]), (6, [100])]),
        "p": stat([CX, CY + 10, 0]),
    }
    return doc("heart", [layer(1, [sq, left, right], ks=ks, op=op)], op)

def make_stars():
    op = 30
    layers = []
    for i in range(5):
        x = CX + (i - 2) * 96
        verts = star_verts(0, 0, 46, 19)
        t0 = i * 3
        ks = {
            "p": stat([x, CY, 0]),
            "s": kf([(t0, [0, 0, 100]), (t0 + 11, [110, 110, 100]), (t0 + 16, [100, 100, 100])]),
            "o": kf([(t0, [0]), (t0 + 2, [100])]),
            "r": kf([(t0, [-60]), (t0 + 14, [0])]),
        }
        layers.append(layer(i + 1, [group([path(verts), fill(GOLD)])], ks=ks, op=op))
    return doc("stars", layers, op)

def make_sparkles():
    op = 60
    layers = []
    pts = [(150, 160), (370, 140), (256, 256), (160, 380), (380, 360), (300, 220)]
    for i, (x, y) in enumerate(pts):
        verts = star_verts(0, 0, 34 + seed(i) * 18, 9, points=4, rot=-90)
        col = PALETTE[i % 4]
        phase = (i / len(pts)) * op
        # twinkle: scale/opacity up then down, wrapped to loop
        def wrap(t):
            return int(t % op)
        sframes = sorted([(wrap(phase), [10, 10, 100]),
                          (wrap(phase + 12), [100, 100, 100]),
                          (wrap(phase + 24), [10, 10, 100])])
        oframes = sorted([(wrap(phase), [0]),
                          (wrap(phase + 12), [100]),
                          (wrap(phase + 24), [0])])
        ks = {"p": stat([x, y, 0]), "s": kf(sframes), "o": kf(oframes),
              "r": kf([(0, [0]), (op, [180])])}
        layers.append(layer(i + 1, [group([path(verts), fill(col)])], ks=ks, op=op))
    return doc("sparkles", layers, op)

def make_loader():
    op = 60
    ring = layer(1, [group([ellipse(220, 220), stroke(ACC, 22),
                            trim(stat(72), start=8)])],
                 ks={"r": kf([(0, [0]), (op, [360])], ease_in=1, ease_out=0),
                     "p": stat([CX, CY, 0])}, op=op)
    # linear rotation
    ring["ks"]["r"] = {"a": 1, "k": [
        {"t": 0, "s": [0], "i": {"x": [1], "y": [1]}, "o": {"x": [0], "y": [0]}},
        {"t": op, "s": [360]}]}
    return doc("loader", [ring], op)

def make_fireworks():
    op = 60
    layers = []
    bursts = [(180, 200, 0), (340, 170, 14), (256, 320, 26)]
    ind = 1
    for (bx, by, t0) in bursts:
        n = 12
        for i in range(n):
            a = (i / n) * 2 * math.pi
            col = PALETTE[(ind) % 4]
            dist = 90 + seed(ind) * 40
            ex, ey = bx + math.cos(a) * dist, by + math.sin(a) * dist + 30
            ks = {
                "p": kf([(t0, [bx, by]), (t0 + 18, [ex, ey])]),
                "o": {"a": 1, "k": [
                    {"t": t0, "s": [0]},
                    {"t": t0 + 2, "s": [100], "i": {"x": [0.6], "y": [1]}, "o": {"x": [0.4], "y": [0]}},
                    {"t": t0 + 22, "s": [0]}]},
                "s": stat([100, 100, 100]),
            }
            layers.append(layer(ind, [group([ellipse(12, 12), fill(col)])], ks=ks, op=op))
            ind += 1
    return doc("fireworks", layers, op)


BUILDERS = {
    "check": make_check,
    "confetti": make_confetti,
    "heart": make_heart,
    "stars": make_stars,
    "sparkles": make_sparkles,
    "loader": make_loader,
    "fireworks": make_fireworks,
}


def main():
    base = Path(__file__).resolve().parent
    out_dir = base / "assets" / "lottie"
    out_dir.mkdir(parents=True, exist_ok=True)
    bundle = {}
    for name, fn in BUILDERS.items():
        data = fn()
        (out_dir / (name + ".json")).write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
        bundle[name] = data
        print("[ok] %s.json  (%d layers, %d frames)" % (name, len(data["layers"]), data["op"]))
    bundle_js = "/* Owned Lottie animations (generated by make_lotties.py). MIT. */\n" \
                "window.SB_LOTTIE = " + json.dumps(bundle, separators=(",", ":")) + ";\n"
    (base / "assets" / "lottie-bundle.js").write_text(bundle_js, encoding="utf-8")
    print("[ok] lottie-bundle.js  (%d animations, %d KB)" % (len(bundle), len(bundle_js) // 1024))


if __name__ == "__main__":
    main()

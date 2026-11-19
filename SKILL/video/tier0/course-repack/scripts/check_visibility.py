# -*- coding: utf-8 -*-
"""Video scene gate: every slide must be fully visible and must not overflow.

For each episode we render the scene in Playwright and, at the end of every
slide's time span, assert:
  1. every child of the active slide has opacity == 1 (the staggered fade-in
     actually finishes — a fixed stagger used to strand the tail of busy slides);
  2. the rendered text's line boxes stay inside their own box
     (tolerance max(8px, 0.25 of font size), which absorbs line-height rounding);
  3. no element sticks out of the 1920x1080 frame.

Usage: python check_visibility.py <content.json> [--work work] [--episodes 1,2,3]
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from common import ROOT, WORK, asset, themed_template  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

TEMPLATE = asset("scene/template.html")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("content")
    ap.add_argument("--work", default=str(WORK))
    ap.add_argument("--episodes", default="")
    a = ap.parse_args()

    content = json.loads(pathlib.Path(a.content).read_text(encoding="utf-8"))
    layout = json.loads(asset("design/layout.json").read_text(encoding="utf-8"))
    work = pathlib.Path(a.work)
    wanted = [int(x) for x in a.episodes.split(",") if x.strip()] or \
        [e["id"] for e in content["episodes"]]

    from playwright.sync_api import sync_playwright

    fails = []
    checked = 0
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--force-color-profile=srgb", "--hide-scrollbars"])
        for ep in content["episodes"]:
            if ep["id"] not in wanted:
                continue
            timing = json.loads((work / f"ep{ep['id']}" / "timing.json").read_text(encoding="utf-8"))
            payload = {"episode": ep, "layout": layout}
            tpl = themed_template(TEMPLATE, asset("design/design.json"))
            tpl = tpl.replace("/*__CONTENT__*/null/*__END__*/", json.dumps(payload, ensure_ascii=False))
            tpl = tpl.replace("/*__TIMING__*/null/*__END__*/", json.dumps(timing, ensure_ascii=False))
            scene = work / f"ep{ep['id']}" / "scene_check.html"
            scene.write_text(tpl, encoding="utf-8")

            pg = b.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
            pg.add_init_script("window.TIMING = " + json.dumps(timing, ensure_ascii=False) + ";")
            pg.goto(scene.as_uri())
            pg.wait_for_timeout(300)

            # end time of every slide
            ends = {}
            for seg in timing["segments"]:
                s = seg.get("slide")
                ends[s] = max(ends.get(s, 0.0), seg["end"])

            for s, t_end in sorted(ends.items()):
                pg.evaluate("t => window.renderAt(t)", max(t_end - 0.02, 0.0))
                res = pg.evaluate("""() => {
                  const out = {dim: [], over: [], out: [], hit: []};
                  const slides = document.querySelectorAll('#stage .slide');
                  let active = null;
                  for (const sl of slides) if (sl.classList.contains('on')) active = sl;
                  if (!active) return {err: 'no active slide'};
                  const texts = [];
                  for (const k of active.children) {
                    const op = parseFloat(getComputedStyle(k).opacity);
                    if (op < 0.99) out.dim.push([Math.round(op*100), (k.textContent||'').slice(0,16)]);
                    if (k.classList.contains('box')) {
                      // real line-box extent of the rendered text
                      const r = document.createRange();
                      r.selectNodeContents(k);
                      const rects = Array.from(r.getClientRects());
                      if (rects.length) {
                        let l=Infinity,t=Infinity,rr=-Infinity,b=-Infinity;
                        for (const q of rects) {
                          if (q.width < 0.5 && q.height < 0.5) continue;
                          l=Math.min(l,q.left); t=Math.min(t,q.top);
                          rr=Math.max(rr,q.right); b=Math.max(b,q.bottom);
                        }
                        if (l < Infinity) {
                          const br = k.getBoundingClientRect();
                          // line-box rounding leaves 5-8 px of visual slack; a real
                          // spill is at least a quarter of a line.
                          const fs0 = parseFloat(getComputedStyle(k).fontSize);
                          const tol = Math.max(8, fs0 * 0.25);
                          if (b - br.bottom > tol || br.top - t > tol ||
                              rr - br.right > tol || br.left - l > tol)
                            out.over.push(['text',
                              Math.round(Math.max(b - br.bottom, br.top - t)),
                              Math.round(br.height), (k.textContent||'').slice(0,18)]);
                          texts.push({l,t,r:rr,b,tx:(k.textContent||'').slice(0,20),
                                      fs:parseFloat(getComputedStyle(k).fontSize)});
                          if (l < -1 || t < -1 || rr > 1921 || b > 1081)
                            out.out.push([Math.round(l),Math.round(t),Math.round(rr),Math.round(b),
                                          (k.textContent||'').slice(0,22)]);
                        }
                      }
                    }
                  }
                  // pairwise collision between text blocks
                  for (let i=0;i<texts.length;i++){
                    for (let j=i+1;j<texts.length;j++){
                      const a=texts[i], b=texts[j];
                      const ox = Math.min(a.r,b.r) - Math.max(a.l,b.l);
                      const oy = Math.min(a.b,b.b) - Math.max(a.t,b.t);
                      if (ox > 3 && oy > 3)
                        out.hit.push([Math.round(ox),Math.round(oy),a.tx,b.tx]);
                    }
                  }
                  return out;
                }""")
                checked += 1
                tag = f"ep{ep['id']} slide {s} ({ep['slides'][s].get('type')})"
                if res.get("err"):
                    fails.append(f"{tag}: {res['err']}")
                    continue
                for op, txt in res["dim"]:
                    fails.append(f"{tag}: 元素未完全显示 opacity={op}% :: {txt!r}")
                for kind, need, have, txt in res["over"]:
                    fails.append(f"{tag}: 文本溢出({kind}) {need}>{have} :: {txt!r}")
                for l, t, rr, bb, txt in res["out"]:
                    fails.append(f"{tag}: 元素出框 ({l},{t})-({rr},{bb}) :: {txt!r}")
                for ox, oy, txt_a, txt_b in res["hit"]:
                    fails.append(f"{tag}: 文字重叠 {ox}x{oy}px :: {txt_a!r} × {txt_b!r}")
            pg.close()
            print(f"  ep{ep['id']}: {len(ends)} slides checked", flush=True)
        b.close()

    print(f"\n检查 {checked} 个分镜")
    if fails:
        print(f"FAIL {len(fails)}:")
        for f in fails[:80]:
            print("  - " + f)
        return 1
    print("全部通过：元素完全显示、无溢出、不出框。")
    return 0


if __name__ == "__main__":
    sys.exit(main())

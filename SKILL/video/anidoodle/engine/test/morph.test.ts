// MORPH TESTS. resample, centreOf, handoff, coverShape, shapeGap and checkShapes in
// src/canvas-core/morph.ts are pure and are held to numbers here. pathShape / fillShape get a
// tiny recording ctx; nothing else draws.   node tools/test.mjs
import { blotShape, centreOf, checkShapes, circleShape, coverShape, fillShape, handoff, pathShape, rectShape, resample, shapeGap, type Shape } from "../src/canvas-core/morph";
import type { Ctx, Env, P } from "../src/canvas-core/core";

export const name = "morph";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;
  const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };
  const inside = (p: P, s: Shape) => { let c = false; for (let i = 0, j = s.length - 1; i < s.length; j = i++) { const a = s[i], b = s[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const area = (s: Shape) => s.reduce((a, p, i) => { const q = s[(i + 1) % s.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
  const centred = (s: Shape, c: P): Shape => { const m = centreOf(s); return s.map(([x, y]): P => [x - m[0] + c[0], y - m[1] + c[1]]); };
  const sq = rectShape(0, 0, 100, 50);

  // 1. resample: exactly n points, clockwise on screen whatever the input winding, evenly
  //    spaced along the outline; degenerate shapes are refused
  const r60 = resample(sq, 60);
  ok(r60.length === 60 && resample(sq, 160).length === 160, "resample returns exactly n points");
  ok(area(r60) > 0 && area(resample([...sq].reverse(), 60)) > 0, "resampled outlines run clockwise on screen, either input winding");
  const circ = resample(circleShape([0, 0], 30, 72), 60), step = (2 * Math.PI * 30) / 60;
  const gaps = circ.map((p, i) => Math.hypot(p[0] - circ[(i + 59) % 60][0], p[1] - circ[(i + 59) % 60][1]));
  ok(gaps.every((g) => g > step * 0.98 && g <= step * 1.000001), `resample spaces points evenly along the outline (step ${step.toFixed(2)} px)`);
  ok(JSON.stringify(resample(sq, 60)) === JSON.stringify(r60), "resample is deterministic");
  ok(throws(() => resample([[0, 0], [1, 1]], 60)) && throws(() => resample([[5, 5], [5, 5], [5, 5]], 60)), "resample refuses fewer than 3 points or a zero-size shape");

  // 2. the shape builders and centreOf
  ok(circleShape([10, 20], 5).every((p) => near(Math.hypot(p[0] - 10, p[1] - 20), 5)), "circleShape's points sit on the circle");
  ok(JSON.stringify(rectShape(0, 0, 100, 50)) === JSON.stringify([[100, 0], [100, 50], [0, 50], [0, 0]]), "a sharp rect is its four corners, clockwise");
  const rr = rectShape(0, 0, 100, 50, 10, 4);
  ok(rr.length === 20 && rr.every(([x, y]) => x >= -1e-9 && x <= 100 + 1e-9 && y >= -1e-9 && y <= 50 + 1e-9), "a rounded rect is perCorner points a corner, inside the box");
  ok(blotShape([0, 0], 40, 7).every((p) => { const d = Math.hypot(p[0], p[1]); return d >= 40 * 0.9 - 1e-9 && d <= 40 * 1.12 + 1e-9; }), "blotShape's rim wobbles inside [0.9, 1.12] R");
  ok(centreOf(sq)[0] === 50 && centreOf(sq)[1] === 25, "centreOf is the middle of the bounding box");
  ok(centreOf([[0, 0], [10, 0], [0, 40]])[0] === 5 && centreOf([[0, 0], [10, 0], [0, 40]])[1] === 20, "centreOf uses the box, not the centroid");

  // 3. handoff: exact at both ends, the centre rides the arc, stretch is zero at the ends
  ok(throws(() => handoff({ from: circleShape([0, 0], 10), to: circleShape([100, 0], 10), t0: 50, t1: 50 })) && throws(() => handoff({ from: sq, to: sq, t0: 50, t1: 40 })), "t1 <= t0 throws");
  const from = circleShape([820, 300], 16), to = rectShape(240, 420, 600, 380, 28);
  const h = handoff({ from, to, t0: 45, t1: 80, arc: 90 });
  ok(h.at(0) === from && h.at(45) === from && h.at(80) === to && h.at(200) === to, "handoff returns exactly the source until t0 and exactly the target from t1");
  const ca = centreOf(resample(from, 160)), cb = centreOf(resample(to, 160));
  ok(near(h.centre(45)[0], ca[0]) && near(h.centre(45)[1], ca[1]) && near(h.centre(80)[0], cb[0], 1e-6) && near(h.centre(80)[1], cb[1], 1e-6), "the centre starts and lands on the two shapes' centres");
  const cm = h.centre(62.5); // u = 0.5 -> e = 0.5
  ok(near(cm[0], (ca[0] + cb[0]) / 2, 1e-6) && near(cm[1], (ca[1] + cb[1]) / 2 - 90, 1e-6), "mid-flight the centre is the eased midpoint, lifted by the arc");
  const long = handoff({ from, to, t0: 0, t1: 200, arc: 90 });
  ok(shapeGap(long.at(1), centred(resample(from, 160), long.centre(1))) < 0.5, "just after t0 the outline is the un-stretched source at its centre");
  ok(shapeGap(long.at(199), centred(resample(to, 160), long.centre(199))) < 0.5, "just before t1 the outline is the un-stretched target at its centre");
  const spec = { from, to, t0: 45, t1: 80, arc: 90 };
  ok(JSON.stringify(handoff(spec).at(60)) === JSON.stringify(h.at(60)), "a handoff is a pure function of its spec");

  // 4. coverShape: a uniform scale about the frame's centre until every corner is inside
  for (const s of [circleShape([820, 300], 16), sq, blotShape([500, 300], 40, 3)]) {
    const cov = coverShape(s, 1920, 1080, 24), cs: P[] = [[-24, -24], [1944, -24], [1944, 1104], [-24, 1104]];
    ok(cs.every((q) => inside(q, cov)), "coverShape puts every padded frame corner inside");
  }
  const wide = rectShape(300, 300, 100, 40), cov = coverShape(wide, 1920, 1080, 24);
  const box = (s: Shape) => { const xs = s.map((p) => p[0]), ys = s.map((p) => p[1]); return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]; };
  const [w0, h0] = box(wide), [w1, h1] = box(cov);
  ok(near(w1 / h1, w0 / h0), `coverShape keeps the shape's proportions (aspect ${(w1 / h1).toFixed(3)} = the source's)`);
  ok(near(centreOf(cov)[0], 960, 1e-6) && near(centreOf(cov)[1], 540, 1e-6), "the shape's centre lands on the frame's centre");
  // a shape whose bounding-box centre sits in its own hole can never cover the frame
  const ring: Shape = [];
  for (let i = 0; i <= 40; i++) { const a = -2.97 + (i * 5.94) / 40; ring.push([400 + Math.cos(a) * 60, 300 + Math.sin(a) * 60]); }
  for (let i = 40; i >= 0; i--) { const a = -2.97 + (i * 5.94) / 40; ring.push([400 + Math.cos(a) * 40, 300 + Math.sin(a) * 40]); }
  ok(!inside(centreOf(ring), ring), "the test ring's centre is in its hole");
  ok(throws(() => coverShape(ring, 1920, 1080)), "coverShape throws when no scale can cover");

  // 5. shapeGap and checkShapes: 0 for identical outlines, a real offset measured, tol enforced
  const selfGap = shapeGap(sq, sq);
  ok(selfGap < 1e-9, `a shape has zero gap to itself (${selfGap.toExponential(1)} of resample noise)`);
  const c0 = circleShape([0, 0], 30), drift: Shape = c0.map(([x, y]): P => [x + 10, y]);
  const g = shapeGap(c0, drift);
  ok(Math.abs(g - 10) <= 0.5, `a 10 px offset is measured as ${g.toFixed(2)} px`);
  ok(near(shapeGap(drift, c0), g), "shapeGap is symmetric");
  ok(near(checkShapes(sq, sq), selfGap) && !throws(() => checkShapes(sq, sq, "self")), "checkShapes passes on a matching outline");
  ok(throws(() => checkShapes(c0, drift, "probe", 2)), "checkShapes throws past tol");
  ok(near(checkShapes(c0, drift, "probe", 20), g), "checkShapes returns the measured gap inside tol");

  // 6. pathShape / fillShape on a recording ctx
  const calls: string[] = [];
  const fx = { beginPath() { calls.push("begin"); }, moveTo() { calls.push("m"); }, lineTo() { calls.push("l"); }, closePath() { calls.push("close"); }, setTransform(...a: number[]) { calls.push(`t${a.join("/")}`); }, fill() { calls.push("fill"); }, fillStyle: "", globalAlpha: 0 };
  pathShape(fx as unknown as Ctx, sq);
  ok(calls.join(",") === "begin,m,l,l,l,close", "pathShape traces the outline and closes it");
  calls.length = 0;
  fillShape(fx as unknown as Ctx, { scale: 2 } as unknown as Env, sq, "#123456");
  ok(calls.includes("fill") && fx.fillStyle === "#123456" && calls.includes("t2/0/0/2/0/0"), "fillShape fills the outline in the film's scale");

  // 7. the checks refuse bad input: NaN in a shape, a turn that ends where it starts, a NaN
  //    landing frame; a points: 2 ask still gets a usable outline (the floor is 8)
  const nanShape: Shape = [[NaN, 0], [0, 10], [10, 0]];
  ok(throws(() => checkShapes(nanShape, sq, "nan-out")) && throws(() => checkShapes(sq, nanShape, "nan-into")), "checkShapes throws when a shape contains NaN");
  ok(throws(() => handoff({ from, to, t0: 45, t1: 80, turn: [0.5, 0.5] })) && throws(() => handoff({ from, to, t0: 45, t1: 80, turn: [1, 0.2] })), "a turn that does not end after it starts throws");
  ok(throws(() => handoff({ from, to, t0: 45, t1: NaN })) && throws(() => handoff({ from, to, t0: NaN, t1: 80 })), "a NaN t0 or t1 throws");
  const coarse = handoff({ from, to, t0: 45, t1: 80, points: 2 }).at(60);
  ok(coarse.length === 8 && coarse.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)), "points: 2 still yields a valid outline (8 finite points)");
};

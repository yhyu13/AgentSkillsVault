// TRANSITION TESTS. The seam math in src/canvas-core/transitions.ts is pure (wipeFront,
// irisRadius, flashAlpha, checkFlashes, seam), so it is held to numbers here with no browser.
// brushWipe / iris / flashCut draw through layers and are not covered; flash gets a tiny
// recording ctx.   node tools/test.mjs
import { checkFlashes, flash, flashAlpha, irisRadius, irisRim, seam, wipeFront } from "../src/canvas-core/transitions";
import { blot } from "../src/canvas-core/launchKit";
import type { Ctx, Env, P } from "../src/canvas-core/core";

export const name = "transitions";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;
  const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };
  // the same point-in-polygon ray cast morph.ts uses (it is private there)
  const inside = (p: P, s: P[]) => { let c = false; for (let i = 0, j = s.length - 1; i < s.length; j = i++) { const a = s[i], b = s[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const W = 1920, H = 1080, corners: P[] = [[0, 0], [W, 0], [W, H], [0, H]];

  // 1. seam: a clamped ramp over [at, at + len]
  ok(seam(100, 120, 22) === 0 && seam(119.9, 120, 22) === 0, "seam is 0 before its window");
  ok(seam(131, 120, 22) === 0.5 && seam(142, 120, 22) === 1 && seam(500, 120, 22) === 1, "seam is 0.5 mid-window and 1 from at+len on");

  // 2. wipeFront: at p = 0 nothing of the frame is inside the picture polygon, at p = 1 all
  //    four corners are - for a straight, a diagonal, a vertical and a backwards stroke
  const mid: P[] = [[W / 2, H / 2], [W * 0.25, H * 0.75], [W * 0.8, H * 0.2]];
  for (const angle of [0, 0.22, Math.PI / 2, Math.PI]) for (const ink of [undefined, "#1d1a16"] as (string | undefined)[]) {
    const o = { angle, ink, seed: 11 };
    ok([...corners, ...mid].every((c) => !inside(c, wipeFront(0, W, H, o))), `wipeFront p=0 angle ${angle.toFixed(2)} ink ${!!ink}: nothing of the frame is inside`);
    ok(corners.every((c) => inside(c, wipeFront(1, W, H, o))), `wipeFront p=1 angle ${angle.toFixed(2)} ink ${!!ink}: all four corners are inside`);
  }

  // 3. the ink edge never trails the picture edge: a point inside the picture polygon is
  //    inside the ink polygon too, at any progress and any angle
  for (const angle of [0, 0.22, Math.PI / 2, Math.PI]) for (const p of [0.15, 0.5, 0.85]) {
    const pic = wipeFront(p, W, H, { angle, ink: "#1d1a16", seed: 5 }), inked = wipeFront(p, W, H, { angle, ink: "#1d1a16", seed: 5 }, "ink");
    let lead = true;
    for (let y = 0; y <= 20 && lead; y++) for (let x = 0; x <= 36 && lead; x++) { const q: P = [(x * W) / 36, (y * H) / 20]; if (inside(q, pic) && !inside(q, inked)) lead = false; }
    ok(lead, `wipeFront angle ${angle.toFixed(2)} p ${p}: the ink edge is ahead of or equal to the picture edge`);
  }

  // 4. the stroke is a pure function of its arguments: same seed, same points
  const w1 = wipeFront(0.5, W, H, { angle: 0.3, seed: 7 });
  ok(JSON.stringify(w1) === JSON.stringify(wipeFront(0.5, W, H, { angle: 0.3, seed: 7 })), "wipeFront: same seed gives identical points");
  ok(JSON.stringify(w1) !== JSON.stringify(wipeFront(0.5, W, H, { angle: 0.3, seed: 8 })), "wipeFront: a different seed is a different brush");

  // 5. irisRadius: 0 at p = 0, past the farthest corner at p = 1 even off-centre, reversed
  //    with close; a blot's wobbling rim needs more radius than a clean circle
  ok(irisRadius(0, W, H) === 0, "irisRadius is 0 at p = 0");
  const c: P = [120, 90], far = Math.max(...corners.map(([x, y]) => Math.hypot(x - c[0], y - c[1])));
  ok(irisRadius(1, W, H, { center: c }) >= far, `irisRadius at p = 1 covers the farthest corner (${far.toFixed(0)} px from an off-centre centre)`);
  ok(irisRadius(0, W, H, { center: c, close: true }) >= far && near(irisRadius(1, W, H, { close: true }), 0), "close: full radius at p = 0, 0 at p = 1");
  const rb = irisRadius(1, W, H, { shape: "blot", center: [300, 200] }), rc = irisRadius(1, W, H, { center: [300, 200] });
  ok(rb > rc, `a blot needs more radius than a circle (${rb.toFixed(0)} > ${rc.toFixed(0)})`);
  ok([1, 42, 99].every((seed) => corners.every((q) => inside(q, blot([300, 200], rb, seed)))), "the blot's deepest rim dip still covers every corner at p = 1");

  // 6. flashAlpha: peak on the cut frame, 0 outside [cut - inF, cut + outF), and the legal
  //    minimum still lights four frames - a one-frame flash cannot be built
  ok(near(flashAlpha(100, 100), 0.86), "flashAlpha peaks on the cut frame");
  const lit = Array.from({ length: 30 }, (_, i) => i + 90).filter((f) => flashAlpha(f, 100) > 0);
  ok(lit.length === 11 && lit[0] === 98 && lit[10] === 108, `flashAlpha is > 0 on exactly the inF + outF frames around the cut (${lit.length})`);
  ok(flashAlpha(97, 100) === 0 && flashAlpha(109, 100) === 0, "flashAlpha is 0 outside its window");
  ok(flashAlpha(98, 100) < flashAlpha(99, 100) && flashAlpha(99, 100) < flashAlpha(100, 100), "the light rises into the cut");
  ok(Array.from({ length: 10 }, (_, i) => i + 95).filter((f) => flashAlpha(f, 100, { inF: 1, outF: 3 }) > 0).length === 4, "the tightest legal flash lights 4 frames: never a one-frame flash");
  ok(throws(() => flashAlpha(50, 100, { outF: 2 })) && throws(() => flashAlpha(50, 100, { inF: 0 })), "flashAlpha throws for outF < 3 or inF < 1");

  // 7. checkFlashes: one rule - any two flashes closer than half a second throw; the
  //    boundary is strict, and however many flashes there are, only the nearest pair matters
  ok(throws(() => checkFlashes([0, 14], 30)), "two flashes 0.47 s apart throw");
  ok(!throws(() => checkFlashes([0, 15], 30)), "two flashes exactly 0.5 s apart pass");
  ok(!throws(() => checkFlashes([0, 15, 30, 45], 30)), "four flashes, all at least half a second apart, pass: the only rule is the pair rule");
  ok(throws(() => checkFlashes([0, 29, 14], 30)), "a close pair throws however the cuts were listed");
  const cuts = [400, 240];
  ok(checkFlashes(cuts, 30) === cuts, "checkFlashes sorts a copy and returns the argument");

  // 8. flash() on a recording ctx: one full-frame fill at the computed alpha
  let seen: { a: number; r: number[] } | undefined;
  const rec = { setTransform() {}, globalCompositeOperation: "", globalAlpha: 0, fillStyle: "", fillRect: (...r: number[]) => { seen = { a: rec.globalAlpha, r }; } };
  flash(rec as unknown as Ctx, { W, H, scale: 2 } as unknown as Env, 100, 100);
  ok(near(seen?.a ?? -1, 0.86) && JSON.stringify(seen?.r) === JSON.stringify([0, 0, W, H]), "flash paints the whole frame at the computed alpha");

  // 9. seam with len 0 is a hard cut that still answers 0 or 1, never NaN
  ok(seam(119.9, 120, 0) === 0 && seam(120, 120, 0) === 1 && seam(500, 120, 0) === 1, "seam(local, at, 0): 0 before at, 1 from at");
  ok(seam(119.9, 120, -3) === 0 && seam(120, 120, -3) === 1, "a negative len behaves the same");
  ok([seam(NaN, 120, 0), seam(-1e9, 120, 0), seam(1e9, 120, 0)].every((v) => v === 0 || v === 1), "seam is never NaN");

  // 10. irisRim: 0 at R = 0, grows without a step bigger than rim/20 per px, full width by
  //     R = 70 - so the ink rim never appears or vanishes in one frame
  for (const [o, rim] of [[{ shape: "blot" }, 22], [{ rim: 10 }, 10]] as const) {
    ok(irisRim(0, o) === 0 && irisRim(70, o) === rim && irisRim(200, o) === rim, `irisRim (rim ${rim}): 0 at R = 0, full ${rim} px from R = 70`);
    let prev = 0, stepOk = true;
    for (let R = 0.5; R <= 100; R += 0.5) { const v = irisRim(R, o); if (v - prev > rim / 20 + 1e-12 || v < prev - 1e-12) stepOk = false; prev = v; }
    ok(stepOk, `irisRim (rim ${rim}) grows continuously, no step over ${(rim / 20).toFixed(2)} px`);
  }
  ok(irisRim(50, {}) === 0 && irisRim(50, { shape: "circle" }) === 0, "a clean circle has no rim");

  // 11. wipeFront stays finite on degenerate input: no bristles, an ease that overshoots
  const finite = (s: P[]) => s.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  ok(finite(wipeFront(0.5, W, H, { bristles: 0 })), "wipeFront with bristles: 0 still gives finite points");
  ok(finite(wipeFront(0.5, W, H, { ease: () => 1.7 })) && finite(wipeFront(0.5, W, H, { ease: () => -0.4 })), "wipeFront with an ease returning 1.7 or -0.4 still gives finite points");
};

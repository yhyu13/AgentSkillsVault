// CALLOUT TESTS. calloutPose, calloutReady, leaderPath and checkHandoff in
// src/canvas-core/callout.ts are pure and are held to numbers here. drawCallout and drawLabel
// draw through kinetic.ts (writeOn / setType) and are not covered.   node tools/test.mjs
import { CALLOUT_T, calloutPose, calloutReady, checkHandoff, leaderPath, type Callout, type LabelPose } from "../src/canvas-core/callout";
import type { P } from "../src/canvas-core/core";

export const name = "callout";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;
  const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };
  const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const anchor = (): P => [500, 600];
  const base: Callout = { text: "LIVE PREVIEW", anchor, label: { p: [1000, 300], size: 40 }, t0: 60 };
  const same = (a: LabelPose | null, b: LabelPose) => !!a && near(a.p[0], b.p[0]) && near(a.p[1], b.p[1]) && near(a.size, b.size);

  // 1. calloutPose: null before t0, the label's own pose until a handoff leaves, exactly the
  //    destination pose on `at`
  ok(calloutPose(base, 0) === null && calloutPose(base, 59) === null, "calloutPose is null before t0");
  ok(same(calloutPose(base, 60), base.label) && same(calloutPose({ ...base, out: 100 }, 500), base.label), "without a handoff the pose is the label's, leaving included");
  const hc: Callout = { ...base, handoff: { leave: 120, at: 150, pose: { p: [200, 800], size: 80 }, arc: 60 } };
  ok(same(calloutPose(hc, 120), base.label), "until leave the pose is still the label's");
  const landed = calloutPose(hc, 150)!;
  ok(near(landed.p[0], 200) && near(landed.p[1], 800) && near(landed.size, 80), "on the handoff frame the pose is exactly the next scene's heading");
  const mid = calloutPose(hc, 135)!; // u = 0.5 -> e = 0.5
  ok(near(mid.p[0], 600) && near(mid.p[1], 550 - 60, 1e-6), "mid-handoff the label sits on the eased midpoint, lifted by the arc");
  ok(near(mid.size, Math.sqrt(40 * 80)), `size is eased as a ratio (${mid.size.toFixed(1)} = the geometric mean, not 60)`);

  // 2. calloutReady: the frame the label is fully written
  ok(calloutReady(base) === 60 + CALLOUT_T.text[1] && calloutReady(base) === 90, "calloutReady is t0 + the text's write-on time");

  // 3. leaderPath, both registers, label to the right and to the left of the anchor
  const pose: LabelPose = { p: [1000, 300], size: 40 }, w = 300, dot = pose.size * 0.16;
  const drawn = leaderPath(anchor(), pose, w, "drawn");
  ok(drawn.length === 25, "a drawn leader is a 25-point bowed stroke");
  ok(near(dist(drawn[0], anchor()), dot * 2.2), "the drawn line starts off the anchor by the dot gap");
  ok(near(drawn[24][0], 1000 - 40 * 0.35) && near(drawn[24][1], 300 - 40 * 0.42), "the drawn line ends at the label");
  const chord: P = [(drawn[0][0] + drawn[24][0]) / 2, (drawn[0][1] + drawn[24][1]) / 2];
  ok(dist(chord, drawn[12]) > 2, `the drawn line bows off its chord (${dist(chord, drawn[12]).toFixed(1)} px)`);
  const drawnL = leaderPath([1500, 600], pose, w, "drawn");
  ok(near(drawnL[24][0], 1000 + w + 40 * 0.35), "label left of the thing: the drawn line lands on its right edge");

  const clean = leaderPath(anchor(), pose, w, "clean");
  ok(clean.length === 3, "a clean leader is an elbow and an underline");
  ok(near(dist(clean[0], anchor()), dot * 2), "the clean line starts off the anchor by the dot gap");
  ok(clean[1][1] === clean[2][1] && near(clean[1][1], 300 + 40 * 0.34), "the underline is horizontal, just under the baseline");
  ok(clean[1][0] <= 1000 && clean[2][0] >= 1300, "the underline spans the label's whole width");
  const cleanL = leaderPath([1500, 600], pose, w, "clean");
  ok(near(cleanL[1][0], 1000 + w + 40 * 0.1) && near(cleanL[2][0], 1000 - 40 * 0.1), "label left of the thing: the elbow meets its right edge and the underline runs left");

  // 4. checkHandoff: a matching pose passes; a 5 px miss, an early leave, or a backwards
  //    window all throw
  ok(checkHandoff(hc, hc.handoff!.pose).every((g) => g.dp < 1e-6 && g.dr < 1e-6), "a matching pose passes within tolerance");
  ok(throws(() => checkHandoff(hc, { p: [205, 800], size: 80 })), "a 5 px miss throws");
  ok(throws(() => checkHandoff(hc, { p: [200, 800], size: 84 })), "a 4 px size miss throws");
  const early: Callout = { ...base, handoff: { leave: 80, at: 150, pose: { p: [200, 800], size: 80 } } };
  ok(throws(() => checkHandoff(early, { p: [200, 800], size: 80 })), "leaving at 80, before the label is readable at 90, throws");
  const back: Callout = { ...base, handoff: { leave: 160, at: 150, pose: { p: [200, 800], size: 80 } } };
  ok(throws(() => checkHandoff(back, { p: [200, 800], size: 80 })), "landing before it leaves throws");
  ok(throws(() => checkHandoff(base, { p: [0, 0], size: 10 })), "a callout with no handoff has nothing to check: throws");

  // 5. checkHandoff needs the dot and line's CALLOUT_T.leave frames to retract: a shorter
  //    trip throws even when the pose matches, exactly CALLOUT_T.leave frames is legal
  const tight: Callout = { ...base, handoff: { leave: 130, at: 141, pose: { p: [200, 800], size: 80 } } };
  ok(throws(() => checkHandoff(tight, { p: [200, 800], size: 80 })), `a handoff trip under ${CALLOUT_T.leave} frames throws even with a matching pose`);
  const just: Callout = { ...base, handoff: { leave: 130, at: 130 + CALLOUT_T.leave, pose: { p: [200, 800], size: 80 } } };
  ok(!throws(() => checkHandoff(just, { p: [200, 800], size: 80 })), `a trip of exactly ${CALLOUT_T.leave} frames is legal`);

  // 6. calloutPose with a size of 0 on either side falls back to a linear ease: finite numbers
  const zeroA: Callout = { ...base, label: { p: [1000, 300], size: 0 }, handoff: { leave: 120, at: 150, pose: { p: [200, 800], size: 80 } } };
  const zeroB: Callout = { ...base, handoff: { leave: 120, at: 150, pose: { p: [200, 800], size: 0 } } };
  for (const c of [zeroA, zeroB]) for (const f of [120, 135, 149, 150]) {
    const p = calloutPose(c, f)!;
    ok(Number.isFinite(p.p[0]) && Number.isFinite(p.p[1]) && Number.isFinite(p.size), `a size of 0 gives finite numbers through the handoff (f=${f})`);
  }
  ok(near(calloutPose(zeroA, 135)!.size, 40), "0 -> 80 eases linearly through 40 at the midpoint");

  // 7. leaderPath's `side` pins which edge the line meets, wherever the anchor sits
  ok(near(leaderPath([500, 600], pose, w, "drawn", undefined, false)[24][0], 1000 + w + 40 * 0.35), "side=false: the drawn line meets the label's right edge though the anchor is left of it");
  ok(near(leaderPath([1500, 600], pose, w, "drawn", undefined, true)[24][0], 1000 - 40 * 0.35), "side=true: the drawn line meets the label's left edge though the anchor is right of it");
  const pinned = leaderPath([500, 600], pose, w, "clean", undefined, false);
  ok(near(pinned[1][0], 1000 + w + 40 * 0.1) && near(pinned[2][0], 1000 - 40 * 0.1), "side=false pins the clean elbow and underline the same way");
};

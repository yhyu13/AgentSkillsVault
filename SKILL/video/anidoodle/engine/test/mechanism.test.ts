// MECHANISM KIT TESTS. The kit's claims are arithmetic: the camera is the house dimetric at 45/30, the
// light ladder is monotone, the springs are exact closed forms, an exploded view staggers out and folds
// back last-out-first-home, hatching stays inside its shape, and the music box's words come from its pins.
//   node tools/test.mjs mechanism
import { Cam, level, springAt, sharesAt, type ExplodePlan, hand, flatHand, spin } from "../src/canvas-core/mechanismKit";
import { Iso } from "../src/canvas-core/isometricKit";
import { hatchSegs } from "../src/canvas-core/mechanismHands";
import { play, PLAN, REV } from "../src/canvas-core/mechanism";

export const name = "mechanism";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;

  // 1. the camera at 45/30 is exactly the house 2:1 dimetric
  const k = 20, c = new Cam(45, 30, k, 300, 200), iso = new Iso(null as unknown as CanvasRenderingContext2D, (k * Math.SQRT2) / 2, 300, 200);
  const pts: [number, number, number][] = [[0, 0, 0], [3, -2, 5], [-4, 7, 1.5]];
  ok(pts.every((q) => { const a = c.p(q), b = iso.p(...q); return near(a[0], b[0], 1e-3) && near(a[1], b[1], 1e-2); }), "Cam(45, 30) projects like Iso.p (Iso rounds cos 30 to 4 places)");
  ok(c.depth(c.V) > c.depth([0, 0, 0]), "depth grows toward the viewer");
  const off = c.dv([2, -1, 3]), a0 = c.p([1, 1, 1]), a1 = c.p([3, 0, 4]);
  ok(near(a1[0] - a0[0], off[0], 1e-9) && near(a1[1] - a0[1], off[1], 1e-9), "dv is the screen offset of a world move");

  // 2. the light ladder: 0 to 4, monotone, whole numbers away from the thresholds
  const xs = Array.from({ length: 201 }, (_, i) => -1 + i / 100), ls = xs.map((x) => level(x));
  ok(ls.every((v, i) => !i || v >= ls[i - 1]), "level never falls as the light score rises");
  ok(near(level(-1), 0) && near(level(1), 4) && near(level(0.1), 1) && near(level(0.3), 2) && near(level(0.5), 3), "level is 0..4 and an integer between thresholds");
  ok(level(0.2) > 1.4 && level(0.2) < 1.6, "level crossfades across a threshold instead of flipping");

  // 3. springs: exact, continuous, and the damping ratio means what it says
  const step = (z: number) => Array.from({ length: 400 }, (_, i) => springAt(8, z, 0, 0, 1, i / 100).x);
  const crit = step(1), under = step(0.89), over = step(1.6);
  ok(crit.every((x) => x <= 1 + 1e-12), "critically damped: never overshoots");
  ok(Math.max(...under) > 1.0005 && Math.max(...under) < 1.05, `z 0.89: one faint overshoot (peak ${Math.max(...under).toFixed(4)})`);
  ok(over.every((x) => x <= 1 + 1e-12) && over[50] < crit[50], "overdamped: slower, no overshoot");
  ok([crit, under, over].every((s) => Math.abs(s[399] - 1) < 2e-3), "every spring arrives");
  for (const z of [0.6, 1, 1.4]) { const t = 0.37, h = 1e-6, v = springAt(8, z, 0.2, -0.5, 1, t).v, num = (springAt(8, z, 0.2, -0.5, 1, t + h).x - springAt(8, z, 0.2, -0.5, 1, t - h).x) / (2 * h); ok(Math.abs(v - num) < 1e-4, `z ${z}: velocity is the derivative of position`); }
  ok(springAt(8, 0.89, 0.3, 2, 1, 0).x === 0.3, "at tau 0 a spring is where it starts");

  // 4. the exploded view
  const P: ExplodePlan = { order: ["a", "b", "c", "d"], stagger: 0.1, w: 8, z: 0.89 };
  const open = [{ t: 1, apart: true }];
  ok(Object.values(sharesAt(P, open, 0.99)).every((v) => v === 0), "nothing moves before the cue");
  const early = sharesAt(P, open, 1.15); ok(early.a > early.b && early.b > 0 && early.c === 0 && early.d === 0, "it opens in order, one stagger apart");
  ok(Object.values(sharesAt(P, open, 5)).every((v) => Math.abs(v - 1) < 1e-3), "and arrives apart");
  const cycle = [{ t: 1, apart: true }, { t: 4, apart: false }], back = sharesAt(P, cycle, 4.12);
  ok(back.d < back.a && back.c < back.a, "it folds back last-out first-home");
  ok(Object.values(sharesAt(P, cycle, 9)).every((v) => Math.abs(v) < 1e-3), "and comes all the way home");
  const rev = [{ t: 1, apart: true }, { t: 1.15, apart: false }], r = sharesAt(P, rev, 1.2);
  ok(r.c === 0 && r.d === 0, "a reversal mid-stagger cancels the moves still pending");
  ok(Object.values(sharesAt(P, rev, 8)).every((v) => Math.abs(v) < 1e-3), "and what had left comes home");
  ok(JSON.stringify(sharesAt(P, cycle, 2.5)) === JSON.stringify(sharesAt(P, [...cycle].reverse(), 2.5)), "cue order in the list does not matter");

  // 5. hatching stays inside its shape and is anchored, not screen-locked
  const sq: [number, number][] = [[0, 0], [40, 0], [40, 30], [0, 30]], segs = hatchSegs(sq, Math.PI / 4, 4);
  ok(segs.length > 10 && segs.every(([a, b]) => [a, b].every(([x, y]) => x >= -1e-6 && x <= 40 + 1e-6 && y >= -1e-6 && y <= 30 + 1e-6)), `hatching: ${segs.length} lines, all inside the square`);
  const moved = hatchSegs(sq.map(([x, y]) => [x + 7, y + 3] as [number, number]), Math.PI / 4, 4, [7, 3]);
  ok(moved.length === segs.length && moved.every(([a], i) => near(a[0], segs[i][0][0] + 7, 1e-6) && near(a[1], segs[i][0][1] + 3, 1e-6)), "anchored hatching travels with its part");

  // 6. the music box: one model for pins, teeth and words
  ok(PLAN.order.length === 8, "eight assemblies");
  const quiet = play(0.0001);
  ok(/^PIN [12] · TOOTH \d+ · [A-G]#?\d \d+ HZ$/.test(quiet.read), `at the start the first chord speaks (its top note): ${quiet.read}`);
  const a4 = play(2 * Math.PI * (16 / 32) + 1e-6).read; ok(a4.includes("A4 440 HZ") || a4.includes("F3"), `at step 16 the readout names that step's pin: ${a4}`);
  const loop = play(2 * Math.PI * 3 + 0.4), first = play(0.4);
  ok(loop.read === first.read && loop.bend.every((v, i) => near(v, first.bend[i], 0.05)), "the drum's story repeats every turn");
  ok(REV > 0 && hand().id === "flat", "the kit's default hand is the plain reference hand");
  void flatHand;

  // 7. spin: a slow turn draws the blades once; a fast one first paints fainter echoes, each further back along the turn
  const calls = (sweep: number) => { const a: number[] = []; spin(1, sweep, (ang) => a.push(ang)); return a; };
  ok(calls(0).length === 1 && calls(0)[0] === 1, "a slow turn draws only the blades");
  const fast = calls(1.2); ok(fast.length === 5 && fast[fast.length - 1] === 1 && fast.slice(0, -1).every((v) => v < 1), `a fast turn paints ${fast.length - 1} fainter echoes before the blades`);
};

// ARC TESTS. src/canvas-core/music/arc.ts reads the shape of a finished score from its loudness
// over time. Built signals with a known shape go in; the numbers and the findings must say so.
//   node tools/test.mjs arc
import { arcReport, arcText } from "../src/canvas-core/music/arc";

export const name = "arc";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const SR = 48000;
  // a steady tone whose level follows `db(t)`: loudness then tracks the envelope and nothing else
  const tone = (seconds: number, db: (t: number) => number) => { const n = Math.round(seconds * SR), x = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; x[i] = Math.pow(10, db(t) / 20) * Math.sin(2 * Math.PI * 997 * t); } return [x, x]; };
  const has = (r: { findings: { msg: string }[] }, s: string) => r.findings.some((f) => f.msg.includes(s));

  // 1. a shaped piece: soft way in, a body, one high point on the payoff, an ending that drops away
  const shaped = arcReport(tone(24, (t) => (t < 2.5 ? -30 : t < 9 ? -22 : t < 12 ? -16 : t < 20 ? -22 : t < 22 ? -26 : -40)), SR, { payoffS: 10.5 });
  ok(shaped.peakS > 9 && shaped.peakS < 12, `the loudest moment is found inside the loud section (${shaped.peakS.toFixed(1)} s)`);
  ok(Math.abs(shaped.peakOverMedian - 6) < 0.6 && Math.abs(shaped.introUnderBody - 8) < 1, `the peak reads 6 LU over the body and the way in 8 LU under it (${shaped.peakOverMedian.toFixed(1)}, ${shaped.introUnderBody.toFixed(1)})`);
  ok(shaped.endUnderPeak > 20 && shaped.findings.length === 0, `a shaped piece has nothing to answer (the end sits ${shaped.endUnderPeak.toFixed(0)} LU under the peak)`);
  ok(arcText(shaped).includes("the shape holds") && arcText(shaped).startsWith("ARC"), "the report says so in one line");

  // 2. each way a score wanders is named
  const flat = arcReport(tone(24, () => -20), SR);
  ok(has(flat, "nothing is the high point") && has(flat, "little contrast"), "one level from start to finish: no high point, no contrast");
  ok(has(arcReport(tone(24, (t) => (t < 20 ? -24 : -14)), SR), "the ending out-shouts"), "the loudest moment in the last fifth is flagged");
  ok(has(arcReport(tone(24, (t) => (t < 2.5 ? -14 : t < 12 ? -22 : t < 14 ? -17 : t < 22 ? -22 : -40)), SR), "nothing left to build to"), "opening over the body's level is flagged");
  ok(has(arcReport(tone(24, (t) => (t < 2.5 ? -50 : t < 12 ? -22 : t < 14 ? -16 : t < 22 ? -22 : -40)), SR), "nothing happening yet"), "a first 2.5 s far under the rest is flagged");
  ok(has(arcReport(tone(24, (t) => (t < 2.5 ? -30 : t < 9 ? -22 : t < 12 ? -16 : -19)), SR), "only 3.0 LU under"), "an ending that barely comes down is flagged");
  ok(has(arcReport(tone(24, (t) => (t < 2.5 ? -30 : t < 9 ? -22 : t < 12 ? -16 : t < 22 ? -22 : -40)), SR, { payoffS: 18 }), "the picture pays off at 18.0 s"), "a high point away from the picture's payoff is flagged");

  // 3. a loop has no beginning and no end: only its seam and its contrast are read
  const loop = arcReport(tone(12, (t) => (t < 6 ? -24 : -18)), SR, { loop: true });
  ok(has(loop, "where the loop comes round") && !has(loop, "out-shouts") && !has(loop, "build to"), `a loop that ends 6 LU over where it starts is flagged at the seam only (${loop.seamJump.toFixed(1)} LU)`);
  ok(arcReport(tone(12, (t) => (t < 4 ? -24 : t < 8 ? -18 : -24)), SR, { loop: true }).findings.length === 0, "a loop that swells in the middle and returns has nothing to answer");
  // a phrase that ends into a quiet bar: the join is no bigger a step than the piece makes inside itself
  const breath = arcReport(tone(12, (t) => (t < 3 ? -30 : t < 6 ? -18 : t < 9 ? -30 : -21)), SR, { loop: true }); ok(breath.seamJump > 3 && breath.insideJump >= breath.seamJump && !has(breath, "comes round"), `a loop whose join steps ${breath.seamJump.toFixed(1)} LU is left alone when it steps ${breath.insideJump.toFixed(1)} LU inside too`);

  // 4. short pieces and silence do not crash or nag
  ok(arcReport(tone(3, () => -20), SR).findings.length === 0, "a three-second sting is not asked for an arc");
  const quiet = arcReport([new Float32Array(SR * 2), new Float32Array(SR * 2)], SR); ok(Number.isFinite(quiet.peakS) && quiet.findings.length === 0 && !arcText(quiet).includes("NaN"), "two seconds of silence give finite numbers and no findings");
  const long = arcReport([new Float32Array(SR * 24), new Float32Array(SR * 24)], SR), longLoop = arcReport([new Float32Array(SR * 24)], SR, { loop: true }); ok(long.findings.length === 0 && longLoop.findings.length === 0 && !arcText(long).includes("NaN"), "24 seconds of silence are not told they lack a high point");
  let threw = false; try { arcReport([], SR); } catch { threw = true; } ok(threw, "no channels at all is refused with a message");
  ok(!arcText(arcReport(tone(2, () => -20), SR)).includes("NaN"), "a two-second piece prints no NaN");
};

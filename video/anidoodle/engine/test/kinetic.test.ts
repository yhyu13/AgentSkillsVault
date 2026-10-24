// KINETIC SPACING TESTS. The drawn lettering is spaced by its ink: the mean gap between two letters is
// the same across the cap height (track + AIR), no ink comes closer than MIN_GAP, and measure() is the
// width the layout writes.
import { advance, measure, profileOf, SPACING } from "../src/canvas-core/kinetic";

export const name = "kinetic";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const tr = 1.5, box = 4 + tr, { BANDS, MIN_GAP, AIR } = SPACING;
  const minGap = (a: string, b: string) => { const pa = profileOf(a)!, pb = profileOf(b)!, o = advance(a, b, tr); let m = Infinity; for (let i = 0; i < BANDS; i++) if (pa.ink[i] && pb.ink[i]) m = Math.min(m, o + pb.L[i] - pa.R[i]); return m; };
  const meanGap = (a: string, b: string) => advance(a, b, tr) - profileOf(a)!.mR + profileOf(b)!.mL;
  ok(advance("C", "T", tr) < box - 0.5, `C then T sits closer than the box spacing (${advance("C", "T", tr).toFixed(2)} vs ${box}): no hole before the T`);
  ok(advance("E", "A", tr) < box - 0.5, `E then A closes up the same way (${advance("E", "A", tr).toFixed(2)})`);
  ok(minGap("I", "D") >= tr + AIR - 1e-9, `a narrow I is as far from its neighbour's stem as any two stems (${minGap("I", "D").toFixed(2)} units)`);
  const pairs = "YOUR PRODUCT IDEA IN ART OUT".split(" ").flatMap((w) => [...w].slice(1).map((ch, i) => [w[i], ch] as [string, string]));
  ok(pairs.every(([a, b]) => minGap(a, b) >= MIN_GAP - 1e-9), `no two letters' ink comes closer than ${MIN_GAP} units (${pairs.map(([a, b]) => `${a}${b} ${minGap(a, b).toFixed(2)}`).join(", ")})`);
  const free = pairs.filter(([a, b]) => minGap(a, b) > MIN_GAP + 1e-6);
  ok(free.length > 5 && free.every(([a, b]) => Math.abs(meanGap(a, b) - (tr + AIR)) < 1e-9), `where ink does not bind, every pair's mean gap is the track plus AIR (${free.map(([a, b]) => `${a}${b}`).join(" ")})`);
  ok(Math.abs(measure("CT", 60, { slant: 0 }) - (advance("C", "T", 1.5) + 4) * 10) < 1e-9 && Math.abs(measure("A B", 60, { slant: 0 }) - (advance("A", " ", 1.5) + advance(" ", "B", 1.5) + 4) * 10) < 1e-9, "measure() is the advances plus the last letter's box (a space keeps its box)");
};

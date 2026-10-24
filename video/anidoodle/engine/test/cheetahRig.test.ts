// CHEETAH RIG TESTS. The skeleton (src/canvas-core/cheetahRig.ts) is pure arithmetic, so the things
// that make her move like an animal and not like rubber are held to numbers here: node tools/test.mjs
import { BOW, CROUCH, fk, FORE_BONES, gallopRig, gallopY, HIND_BONES, lowest, mixRig, settle, SKID, STAND, TAIL_BONES } from "../src/canvas-core/cheetahRig";
import type { P } from "../src/canvas-core/core";

export const name = "cheetahRig";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const bones = (pts: P[], B: number[]) => Math.max(...B.map((b, i) => Math.abs(dist(pts[i], pts[i + 1]) - b)));

  // 1. bones never change length, in the stride or in a blend between two held poses
  let worst = 0, finite = true;
  for (let i = 0; i < 400; i++) {
    const q = fk(i % 2 ? gallopRig(i / 400) : mixRig(STAND, BOW, i / 400), 0, 0, 0);
    worst = Math.max(worst, bones(q.foreN, FORE_BONES), bones(q.foreF, FORE_BONES), bones(q.hindN, HIND_BONES), bones(q.hindF, HIND_BONES), bones(q.tail, TAIL_BONES));
    for (const pts of [q.spine, q.tail, q.foreN, q.foreF, q.hindN, q.hindF]) for (const p of pts) if (!Number.isFinite(p[0]) || !Number.isFinite(p[1])) finite = false;
  }
  ok(worst < 1e-6, `every leg and tail bone keeps its length (worst error ${worst.toExponential(1)} px)`);
  ok(finite, "every point is finite through the stride and the blends");

  // 2. the stride is a loop: phase 1 is phase 0, and no joint jumps between neighbouring frames
  const a = fk(gallopRig(0), 0, gallopY(0), 0), b = fk(gallopRig(1), 0, gallopY(1), 0);
  ok(dist(a.foreN[4], b.foreN[4]) < 1e-6 && dist(a.hindN[4], b.hindN[4]) < 1e-6 && dist(a.tail[5], b.tail[5]) < 1e-6, "the stride closes: phase 1 lands exactly on phase 0");
  let jump = 0; const at = (ph: number) => fk(gallopRig(ph), 0, gallopY(ph), 0);
  for (let i = 0; i < 300; i++) { const p = at(i / 300), q = at((i + 1) / 300); for (const k of ["foreN", "foreF", "hindN", "hindF"] as const) jump = Math.max(jump, dist(p[k][4], q[k][4])); }
  ok(jump < 12, `no foot jumps within the stride (largest move in 1/300 of a stride: ${jump.toFixed(1)} px)`);

  // 3. she never goes through the ground, and she really leaves it twice a stride
  const lowAt = (ph: number) => { const l = lowest(fk(gallopRig(ph), 0, gallopY(ph), 0)); return Math.max(l.fore, l.hind); };
  let sink = -Infinity, flights = 0, wasAir = lowAt(299 / 300) < -12; // the stride is a loop: start from where the last one ended
  for (let i = 0; i < 300; i++) { const low = lowAt(i / 300); sink = Math.max(sink, low); const air = low < -12; if (air && !wasAir) flights++; wasAir = air; }
  ok(sink < 0.01, `no foot below the ground in the stride (lowest ${sink.toFixed(2)} px)`);
  ok(flights === 2, `two flight phases a stride, the extended and the gathered (found ${flights})`);

  // 4. the spine folds and opens: the hips come well forward under her in the gathered phase
  const span = (ph: number) => { const q = at(ph); return q.spine[6][0] - q.spine[1][0]; };
  ok(span(0) - span(0.52) > 20, `shoulder-to-hip distance closes in the gathered phase (${span(0).toFixed(0)} px extended, ${span(0.52).toFixed(0)} px gathered)`);
  const g = at(0.56); ok(Math.max(g.hindN[4][0], g.hindF[4][0]) > Math.min(g.foreN[4][0], g.foreF[4][0]), "gathered, a hind foot reaches past a forefoot");

  // 5. the head rides level while the body works under it
  let hi = Infinity, lo = -Infinity, hipHi = Infinity, hipLo = -Infinity;
  for (let i = 0; i < 100; i++) { const q = at(i / 100); hi = Math.min(hi, q.spine[9][1]); lo = Math.max(lo, q.spine[9][1]); hipHi = Math.min(hipHi, q.spine[1][1]); hipLo = Math.max(hipLo, q.spine[1][1]); }
  ok(lo - hi < 4 && hipLo - hipHi > 30, `the head moves ${(lo - hi).toFixed(1)} px through a stride while the hips move ${(hipLo - hipHi).toFixed(0)} px`);

  // 6. a held pose stands on all four feet
  for (const [n, r] of Object.entries({ STAND, BOW, CROUCH, SKID })) { const s = settle(r), l = lowest(fk(s.rig, 0, s.y, 0)); ok(Math.abs(l.fore) < 2 && Math.abs(l.hind) < 2, `${n} settles with fore and hind feet on the ground (${l.fore.toFixed(1)}, ${l.hind.toFixed(1)} px)`); }
  const s = settle(BOW), q = fk(s.rig, 0, s.y, 0); ok(q.spine[1][1] < q.spine[6][1] - 120, "in the bow the hips stay high above the shoulders");
};

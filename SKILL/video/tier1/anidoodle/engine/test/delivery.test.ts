// DELIVERY TESTS. The whole film mix lands on its loudness target under the -1 dBTP ceiling, a quiet
// effects-only film is brought to the target, the limiter's work is capped (the gain gives way and says
// so), and "none" leaves the mix alone.
//   node tools/test.mjs delivery
import { deliver, targetOf } from "../src/canvas-core/music/delivery";
import { loudness, truePeak } from "../src/canvas-core/music/meter";
import { mixSfx } from "../src/canvas-core/music/sfxMix";
// @ts-ignore: a plain ES module shared with the tools
import { filmShape } from "../tools/filmshape.mjs";

export const name = "delivery";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const sr = 48000, n = sr * 4;
  const tone = (amp: number, hits = false) => { const L = new Float32Array(n), R = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / sr, h = hits ? (i % (sr / 2) < 200 ? 0.9 : 0) : 0, v = amp * Math.sin(2 * Math.PI * 220 * t) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 0.5 * t)) + h * Math.sin(2 * Math.PI * 3000 * t); L[i] = v; R[i] = v * 0.95; } return [L, R] as [Float32Array, Float32Array]; };

  for (const mode of ["gentle", "dense"] as const) {
    const [L, R] = tone(0.01), d = deliver(L, R, sr, mode);
    ok(Math.abs(d.lufs - targetOf(mode)) <= 0.5 && d.dbtp <= -1 + 1e-6, `${mode}: a quiet mix lands on ${targetOf(mode)} LUFS (${d.lufs.toFixed(2)}) under -1 dBTP (${d.dbtp.toFixed(2)})`);
  }
  const [L2, R2] = tone(0.002, true), d2 = deliver(L2, R2, sr, "gentle");
  ok(d2.limitDb <= 4 + 0.1 && d2.dbtp <= -1 + 1e-6, `sharp hits over near silence: the limiter takes at most 4 dB (${d2.limitDb.toFixed(2)})`);
  ok(d2.shortLu < 0.1 || d2.limitDb > 3.8, `and uses its allowance before falling short (${d2.limitDb.toFixed(2)} dB limited, ${d2.shortLu.toFixed(2)} LU short)`);
  ok(Math.abs(d2.shortLu - Math.max(0, -16 - d2.lufs)) < 1e-9, `and any shortfall is reported (${d2.shortLu.toFixed(2)} LU short)`);
  const [L3, R3] = tone(0.3), before = L3.slice(), d3 = deliver(L3, R3, sr, "none");
  ok(d3.gainDb === 0 && L3.every((v, i) => v === before[i]), "none leaves the mix untouched");
  ok(Math.abs(loudness(tone(0.01), sr).integrated - loudness(tone(0.01), sr).integrated) < 1e-12, "the master is deterministic in, deterministic out");

  // an effects-only film is delivered at the gentle target
  const fx = mixSfx(null, { fps: 30, frames: 120, cues: [{ frame: 10, kind: "tick" }, { frame: 40, kind: "pop" }, { frame: 80, kind: "impact" }] } as never, sr);
  ok(fx.delivered !== undefined && fx.dbtp <= -1 + 1e-6, `effects-only mix: delivered (${fx.lufs.toFixed(1)} LUFS, ${fx.dbtp.toFixed(2)} dBTP, limiter ${fx.limiterDb.toFixed(1)} dB)`);
  const old = mixSfx(null, { fps: 30, frames: 120, master: "none", cues: [{ frame: 10, kind: "tick" }, { frame: 40, kind: "pop" }, { frame: 80, kind: "impact" }] } as never, sr);
  ok(Math.abs(fx.lufs + 16) <= 0.5, `on target (the peak-only master gives ${old.lufs.toFixed(1)} LUFS)`);
  void truePeak;

  // between its cues an effects-only film sits on room tone, never on digital silence
  const sparse = { fps: 30, frames: 240, cues: [{ frame: 6, kind: "tick" }, { frame: 150, kind: "impact" }] } as never;
  const bedded = mixSfx(null, sparse, sr), bare = mixSfx(null, { ...(sparse as object), bed: false } as never, sr);
  ok(filmShape(bare.L, bare.R, sr).problems.some((p: { kind: string }) => p.kind === "hole"), "without a bed, two cues 5 s apart leave a hole");
  ok(!filmShape(bedded.L, bedded.R, sr).problems.some((p: { kind: string }) => p.kind === "hole"), "with room tone the hole is gone");
  let c = 0, l2 = 0, r2 = 0; for (let i = sr; i < 3 * sr; i++) { c += bedded.L[i] * bedded.R[i]; l2 += bedded.L[i] ** 2; r2 += bedded.R[i] ** 2; }
  ok(c / Math.sqrt(l2 * r2) > 0.7, `room tone is nearly mono, so a phone keeps it (correlation ${(c / Math.sqrt(l2 * r2)).toFixed(2)})`);
};

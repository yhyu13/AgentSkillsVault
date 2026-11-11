// DRUM KIT TESTS (music/drums.ts): the anti-MIDI checks from the music research (section 9) that a
// kit can fail on its own, with no human: determinism, no two hits alike, velocity changes the
// timbre (not just the level), open hats choke, pieces sit where the stage puts them, the low end
// stays mono, GM notes and lane kinds pick the right piece, and the legacy kit is untouched.
import { kitVoice, timpani, pieceOf, chokeTimes, KITS, type KitId } from "../src/canvas-core/music/drums";
import { drumVoice, kick as legacyKick } from "../src/canvas-core/music/instruments";
import { laneKind } from "../src/canvas-core/music/grooves";
import type { Played } from "../src/canvas-core/music/perform";
import { rng } from "../src/canvas-core/core";

export const name = "drums";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const SR = 24000, hit = (t: number, v: number, p = 60, kind?: string): Played => ({ t, off: t + 0.2, p, v, role: "drum", kind, w: v });
  const render = (inst: string, keys: Played[], kit: KitId, seed = 1, secs = 3, extra: Record<string, number | boolean | string> = {}) => kitVoice(inst, keys, SR, Math.round(secs * SR), { kit, grid: true, ...extra }, rng(seed), { choke: chokeTimes([{ inst, opts: { kit, ...extra }, keys }]) });
  const seg = (x: Float32Array, t: number, ms: number) => x.subarray(Math.round(t * SR), Math.round(t * SR) + Math.round((ms / 1000) * SR));
  const corr = (a: Float32Array, b: Float32Array) => { let ab = 0, aa = 0, bb = 0; for (let i = 0; i < a.length; i++) { ab += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; } return ab / Math.sqrt(aa * bb + 1e-30); };
  const rms = (x: Float32Array) => { let s = 0; for (const v of x) s += v * v; return Math.sqrt(s / Math.max(1, x.length)); };
  // spectral centroid by zero-crossing-free proxy: the share of energy in the first difference (a tilt meter)
  const bright = (x: Float32Array) => { let d = 0, e = 0; for (let i = 1; i < x.length; i++) { d += (x[i] - x[i - 1]) ** 2; e += x[i] ** 2; } return d / (e + 1e-30); };
  const finite = (o: { L: Float32Array; R: Float32Array }) => { let m = 0; for (const x of [o.L, o.R]) for (const v of x) { if (!Number.isFinite(v)) return false; m = Math.max(m, Math.abs(v)); } return m < 4; };

  // 1. determinism, finite output, every piece of every kit sounds
  const GM = [36, 38, 37, 40, 39, 42, 44, 46, 41, 45, 48, 49, 51, 53, 54, 56, 70, 61, 62, 64];
  let silent: string[] = [], same = true, sane = true;
  for (const kit of KITS) {
    const keys = GM.map((p, i) => hit(i * 0.35, 0.8, p)), a = render("snare", keys, kit, 7, GM.length * 0.35 + 2), b = render("snare", keys, kit, 7, GM.length * 0.35 + 2);
    same &&= a.L.every((v, i) => v === b.L[i]) && a.R.every((v, i) => v === b.R[i]); sane &&= finite(a);
    GM.forEach((p, i) => { if (rms(seg(a.L, i * 0.35 + 0.02, 60)) + rms(seg(a.R, i * 0.35 + 0.02, 60)) < 1e-5) silent.push(`${kit}:${p}`); });
  }
  ok(same, "same keys + seed = identical samples, every kit");
  ok(sane, "every kit renders finite, bounded output");
  ok(silent.length === 0, `every GM piece of every kit sounds${silent.length ? ` (silent: ${silent.join(", ")})` : ""}`);

  // 2. no clones: the same piece at the same velocity, eight times, never repeats a waveform. Clone score (research sec. 9):
  // the mean correlation of a repeat with the first hit < 0.98 per piece, and no pair ever near-identical (< 0.998)
  let worstMean = 0, worstMax = 0, worstAt = "";
  for (const kit of KITS) for (const [inst, p] of [["kick", 60], ["snare", 60], ["hat", 60], ["hat", 46], ["snare", 39], ["snare", 45], ["hat", 51], ["hat", 70]] as [string, number][]) {
    const keys = Array.from({ length: 8 }, (_, i) => hit(i * 0.5, 0.75, p)), o = render(inst, keys, kit, 3, 4.6), cs: number[] = [];
    for (let i = 1; i < 8; i++) cs.push(corr(seg(o.L, 0, 80), seg(o.L, i * 0.5, 80)));
    const mean = cs.reduce((a, b) => a + b, 0) / cs.length; if (mean > worstMean) { worstMean = mean; worstAt = `${kit} ${inst}/${p}`; } worstMax = Math.max(worstMax, ...cs);
  }
  ok(worstMean < 0.98 && worstMax < 0.998, `repeated hits never clone: worst mean correlation ${worstMean.toFixed(3)} (${worstAt}) < 0.98, closest pair ${worstMax.toFixed(3)} < 0.998`);

  // 3. velocity changes the timbre: a hard snare / hat is brighter than a soft one (level-independent measure)
  const vb = (inst: string, kit: KitId) => { const S = 48000, o = kitVoice(inst, [hit(0, 0.25), hit(1, 1)], S, S * 2, { kit, grid: true }, rng(5)), at = (t: number) => o.L.subarray(t * S, t * S + 0.12 * S); return [bright(at(0)), bright(at(1))]; };
  const vbad = KITS.flatMap((kit) => (["snare", "hat", "kick"] as const).filter((i) => { const [s, h] = vb(i, kit); return !(h > s * 1.03); }).map((i) => `${kit} ${i}`));
  ok(vbad.length === 0, `velocity -> brightness on kick, snare, hat of every kit${vbad.length ? ` (flat: ${vbad.join(", ")})` : ""}`);

  // 4. choke: a closed hat stops an open hat
  { const open = render("hat", [hit(0, 0.8, 46)], "acoustic", 2, 1.5), choked = render("hat", [hit(0, 0.8, 46), hit(0.3, 0.05, 44)], "acoustic", 2, 1.5);
    const tail = (o: { L: Float32Array }) => rms(seg(o.L, 0.4, 300));
    ok(tail(choked) < tail(open) * 0.05, `an open hat is choked by the pedal hat (tail ${(20 * Math.log10(tail(choked) / tail(open))).toFixed(0)} dB)`); }

  // 5. the stage: hats right, ride and floor tom left, kick centred and mono in the lows
  { const side = (inst: string, p: number) => { const o = render(inst, [hit(0, 0.8, p)], "acoustic", 4, 1.2); return 20 * Math.log10(rms(o.R) / rms(o.L)); };
    const hr = side("hat", 42), rd = side("hat", 51), ft = side("snare", 41), kk = side("kick", 36);
    ok(hr > 2 && rd < -2 && ft < -2 && Math.abs(kk) < 1, `stage: hat R ${hr.toFixed(1)} dB, ride ${rd.toFixed(1)}, floor tom ${ft.toFixed(1)}, kick ${kk.toFixed(1)}`);
    const k = render("kick", [hit(0, 0.9, 36)], "acoustic", 4, 1), lo = (x: Float32Array) => { const y = new Float32Array(x.length); let z = 0; const a = 1 - Math.exp((-2 * Math.PI * 120) / SR); for (let i = 0; i < x.length; i++) { z += a * (x[i] - z); y[i] = z; } return y; };
    const icc = corr(lo(k.L), lo(k.R)); ok(icc > 0.95, `kick below 120 Hz stays mono (ICC ${icc.toFixed(3)})`);
    const cr = render("hat", [hit(0, 0.9, 49)], "acoustic", 4, 2.5), hi = corr(seg(cr.L, 0.05, 800), seg(cr.R, 0.05, 800)); ok(hi < 0.9, `a crash is wide (L/R correlation ${hi.toFixed(2)} < 0.9)`); }

  // 6. notes pick pieces: GM pitch > the part's piece > the lane kind > the inst's own piece
  ok(pieceOf({ p: 60 }, "hat", {}) === "hat" && pieceOf({ p: 60 }, "snare", { rim: true }) === "cross" && pieceOf({ p: 60, kind: "o" }, "hat", {}) === "open" && pieceOf({ p: 49 }, "snare", {}) === "crash" && pieceOf({ p: 60, kind: "ride" }, "hat", { piece: "shaker" }) === "shaker", "pieceOf: GM notes, part piece, kinds, inst defaults");
  ok(laneKind({ family: "fourFloor" }, "snare") === "clap" && laneKind({ family: "swing" }, "hat") === "ride" && laneKind({ kick: ["C4:4"] }, "hat") === "hat", "lane kinds: a fourFloor snare lane is a clap, a swing hat lane a ride, written grooves keep their lanes");

  // 7. timpani: pitched (energy peaks near the written note), a roll is many strokes, deterministic
  { const t = timpani([hit(0, 0.8, 43)], SR, SR * 3, {}, rng(1)), f = 440 * Math.pow(2, (43 - 69) / 12), x = seg(t.L, 0.1, 500);
    const mag = (hz: number) => { let c = 0, s = 0; for (let i = 0; i < x.length; i++) { c += x[i] * Math.cos((2 * Math.PI * hz * i) / SR); s += x[i] * Math.sin((2 * Math.PI * hz * i) / SR); } return Math.hypot(c, s); };
    ok(mag(f) > 3 * mag(f * 1.25) && mag(f) > 3 * mag(f * 0.8), `timpani rings at its note (${f.toFixed(0)} Hz)`);
    const a = timpani([{ ...hit(0, 0.8, 43), off: 2, kind: "roll" }], SR, SR * 3, {}, rng(1)), b = timpani([{ ...hit(0, 0.8, 43), off: 2, kind: "roll" }], SR, SR * 3, {}, rng(1));
    ok(a.L.every((v, i) => v === b.L[i]) && rms(seg(a.L, 1.5, 200)) > 4 * rms(seg(t.L, 1.5, 200)), "a timpani roll sustains (many strokes), deterministically"); }

  // 8. legacy: the frozen launch film's kit is the old voice, bit for bit
  { const keys = [hit(0, 0.8), hit(0.5, 0.6)], a = drumVoice("kick", keys, SR, SR, { legacy: true }, rng(1)), b = legacyKick(keys, SR, SR, {});
    ok(a.L.every((v, i) => v === b.L[i]), "legacy: true renders the original soft kit"); }
};

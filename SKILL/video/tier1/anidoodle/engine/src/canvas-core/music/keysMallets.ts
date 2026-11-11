// Mallets, bells, celesta, glockenspiel, music box: modal synthesis on MEASURED mode tables
// (keysTables.ts, VCSL CC0) instead of harmonic guesses.
//   bar/tube   each mode = a decaying sinusoid at ratio x f0, its level and T60 measured at a reference
//              pitch and scaled by frequency (T60 ~ f^-alpha: alpha 1.0 rosewood, 0.6 aluminium/steel)
//   mallet     a half-sine contact of tc ms: its spectrum |cos(pi f tc) / (1 - (2 f tc)^2)| weights the
//              modes, so a soft yarn mallet (4-6 ms) is round and a hard one (0.4 ms) rings the top modes;
//              velocity shortens the contact (harder blow) and adds a band-passed "tock"
//   resonator  marimba/vibes/celesta tubes or box: a coupled copy of the fundamental with a slower rise
//              ("bloom"); the vibraphone's motor tremolo modulates ONLY this coupled fundamental, as the
//              rotating discs do on the real instrument
//   dampers    vibes and celesta damp on key-up; a restrike re-damps the bar
//   music box  a steel comb tooth = a cantilever (modes 1 : 6.27 : 17.55) plucked by a pin, a tiny tick,
//              ringing through a small wooden box (fixed resonances seeded per instrument)
// Anti-clone: per note +-0.8 dB per mode, +-10 % contact time, +-6 % decay, onset phase jitter, seeded ticks.
import { TAU, clamp, SVF, gauss, pan } from "./dsp";
import { rng as mkRng } from "../core";
import type { Played } from "./perform";
import { type Out, type Opts, num, out0, mtof, dbA, noteVar, strikeCounter, partial, noiseBurst, byTime, nextSameKey, pitchPan } from "./keysCore";
import { MARIMBA, MARIMBA_T60_REF_HZ, VIBES, VIBES_T60_REF_HZ, GLOCK, GLOCK_T60_REF_HZ, CHIME, CHIME_T60_REF_HZ, type ModeRow } from "./keysTables";

type Spec = {
  modes: ModeRow[]; refHz: number; alpha: number; tcMs: [number, number]; // contact ms at v=0 / v=1
  bloom: number; damped: boolean; dampSigma: number; tock: [number, number]; level: number; maxS: number; width: number; octave?: number; t60Mul?: number;
};
const SPECS: Record<string, Spec> = {
  marimba: { modes: MARIMBA, refHz: MARIMBA_T60_REF_HZ, alpha: 1.0, tcMs: [5.5, 1.6], bloom: 0.45, damped: false, dampSigma: 0, tock: [1800, 0.05], level: 0.4, maxS: 9, width: 0.7 },
  vibes: { modes: VIBES, refHz: VIBES_T60_REF_HZ, alpha: 0.6, tcMs: [3.5, 0.9], bloom: 0.5, damped: true, dampSigma: 7, tock: [2600, 0.03], level: 0.4, maxS: 12, width: 0.6 },
  glockenspiel: { modes: GLOCK, refHz: GLOCK_T60_REF_HZ, alpha: 0.6, tcMs: [0.9, 0.3], bloom: 0, damped: false, dampSigma: 0, tock: [5500, 0.04], level: 0.2, maxS: 10, width: 0.5 },
  celesta: { modes: GLOCK.slice(0, 4).map(([r, d, t]) => [r, d - 6, t * 0.5] as ModeRow), refHz: GLOCK_T60_REF_HZ, alpha: 0.55, tcMs: [2.8, 1.4], bloom: 0.6, damped: true, dampSigma: 9, tock: [1400, 0.025], level: 0.8, maxS: 8, width: 0.5, t60Mul: 0.35 },
  bell: { modes: CHIME, refHz: CHIME_T60_REF_HZ, alpha: 0.7, tcMs: [1.2, 0.5], bloom: 0, damped: false, dampSigma: 0, tock: [3000, 0.02], level: 0.48, maxS: 14, width: 0.3, t60Mul: 0.35 },
};

/** Spectrum of a half-sine force pulse of duration tc (s) at f: 1 at DC, first zero at 1.5/tc. */
const pulseW = (f: number, tc: number) => { const x = 2 * f * tc; if (Math.abs(x - 1) < 1e-6) return Math.PI / 4; return Math.abs(Math.cos(Math.PI * f * tc) / (1 - x * x)); };

export const bars = (keys: Played[], sr: number, n: number, o: Opts, seed: number, kind: keyof typeof SPECS): Out => {
  const S = SPECS[kind], out = out0(n), sorted = byTime(keys), width = num(o, "width", S.width);
  const trem = kind === "vibes" ? num(o, "trem", 5.2) : 0, tremDepth = num(o, "tremDepth", 0.45);
  const buf = new Float64Array(Math.ceil(S.maxS * sr)), res = kind === "vibes" && trem > 0 ? new Float64Array(n) : null;
  const resBuf = new Float64Array(buf.length), strike = strikeCounter();
  sorted.forEach((k, idx) => {
    const i0 = Math.round(k.t * sr); if (i0 >= n) return;
    const nv = noteVar(seed, idx, k, { cents: 1.0, db: 0.5, bright: 0.1, decay: 0.06 }, strike(k.p));
    const v = clamp(k.v, 0.02, 1), f0 = mtof(k.p) * Math.pow(2, nv.cents / 1200);
    const tc = ((S.tcMs[0] + (S.tcMs[1] - S.tcMs[0]) * Math.pow(v, 0.8)) / 1000) * clamp(Math.pow(262 / f0, 0.6), 0.15, 2) * (1 + 0.1 * clamp(gauss(nv.r), -2, 2)) / nv.bright; // shorter, stiffer bars up high: shorter contact
    let damp = Infinity;
    if (S.damped) damp = Math.min(k.off, nextSameKey(sorted, idx));
    else { const nx = nextSameKey(sorted, idx); if (nx < Infinity) damp = nx + 0.003; } // a restrike stops the old ring
    const dI = damp === Infinity ? Infinity : Math.round((damp - k.t) * sr);
    const len = Math.min(buf.length, n - i0); if (len <= 0) return;
    const b = buf.subarray(0, len); b.fill(0);
    const rb = resBuf.subarray(0, len); rb.fill(0);
    const W0 = Math.max(0.3, pulseW(f0, tc)); // never divide by a spectral zero of the pulse (contact ~1.5 periods): that blew a mode up 20 dB
    for (const [ratio, db, t60ref] of S.modes) {
      const f = ratio * f0; if (f > sr * 0.45) continue;
      const t60 = clamp(t60ref * (S.t60Mul ?? 1) * Math.pow((ratio * S.refHz) / f, S.alpha), 0.02, 60) * nv.decay;
      const a = dbA(db + (ratio === S.modes[0][0] ? 0 : 2 * (ratio < 5 ? nv.seq2 : -nv.seq2)) + 0.6 * clamp(gauss(nv.r), -2, 2)) * (Math.max(0.02, pulseW(f, tc)) / W0); // strike position moves the upper modes against each other
      if (a < 1e-4) continue;
      const ph = 0.35 * nv.seq2 + 0.1 * clamp(gauss(nv.r), -2, 2);
      if (ratio === S.modes[0][0] && S.bloom > 0) {
        partial(b, 0, f, a * (1 - S.bloom * 0.5), 6.91 / t60, ph, sr, dI, S.dampSigma);
        // the resonator: the same pitch (a hair sharp), a slower rise, a little longer ring
        partial(rb, 0, f * 1.0015, a * S.bloom * (1 + 0.25 * nv.seq), 6.91 / (t60 * 1.15), ph + 0.3 + 0.8 * nv.seq, sr, dI, S.dampSigma); // the air column's phase vs the bar's differs strike to strike
        const rise = Math.max(1, Math.round(0.012 * sr));
        for (let i = 0; i < Math.min(rise, len); i++) rb[i] *= i / rise;
      } else partial(b, 0, f, a, 6.91 / t60, ph, sr, dI, S.dampSigma || 12);
    }
    if (!res) for (let i = 0; i < len; i++) b[i] += rb[i];
    // contact ramp (the mallet is on the bar for tc)
    const rampN = Math.max(2, Math.round(tc * sr));
    for (let i = 0; i < Math.min(rampN, len); i++) b[i] *= Math.sin((0.5 * Math.PI * i) / rampN);
    // the "tock": wood/metal contact noise, louder and brighter for harder blows
    noiseBurst(b, 0, Math.round((0.004 + tc) * sr), S.tock[0] * (0.7 + 0.6 * v), 0.9, S.tock[1] * v * v, nv.r, sr, 0.0025);
    const g = Math.pow(v, 1.25) * S.level * nv.gain, p = pitchPan(k.p, width);
    const [gl, gr] = pan(p);
    for (let i = 0; i < len; i++) { const y = b[i] * g; out.L[i0 + i] += y * gl; out.R[i0 + i] += y * gr; }
    if (res) for (let i = 0; i < len; i++) res[i0 + i] += rb[i] * g;
  });
  if (res) { // vibraphone motor: the discs open and close the resonators; only the coupled fundamental pulses
    const ph = ((seed * 0.381966) % 1) * TAU;
    for (let i = 0; i < n; i++) { const m = 1 - tremDepth * (0.5 + 0.5 * Math.sin((TAU * trem * i) / sr + ph)), y = res[i] * m; out.L[i] += y * 0.72; out.R[i] += y * 0.69; }
  }
  return out;
};

/** Music box: comb teeth (cantilever modes), a pin tick, and a small wooden box. */
export const musicBoxV2 = (keys: Played[], sr: number, n: number, o: Opts, seed: number): Out => {
  const out = out0(n), sorted = byTime(keys), width = num(o, "width", 0.5), buf = new Float64Array(Math.ceil(7 * sr)), strike = strikeCounter();
  const dry = new Float64Array(n);
  sorted.forEach((k, idx) => {
    const i0 = Math.round(k.t * sr); if (i0 >= n) return;
    const nv = noteVar(seed, idx, k, { cents: 1.2, db: 0.7, bright: 0.12, decay: 0.08 }, strike(k.p)), v = clamp(k.v, 0.05, 1);
    const f = mtof(k.p) * Math.pow(2, nv.cents / 1200), T60 = clamp(3.1 * Math.sqrt(440 / f), 0.6, 7) * nv.decay;
    const nx = nextSameKey(sorted, idx), dI = nx < Infinity ? Math.round((nx - k.t) * sr) : Infinity; // the pin re-plucks: the old ring is damped
    const len = Math.min(buf.length, n - i0, Math.ceil(T60 * 1.2 * sr)); if (len <= 0) return;
    const b = buf.subarray(0, len); b.fill(0);
    const pluck = 0.55 + 0.45 * v * nv.bright; // how far the pin bends the tooth: brighter when faster
    partial(b, 0, f, 1, 6.91 / T60, 0.35 * nv.seq2, sr, dI, 40);
    partial(b, 0, f * 6.267, 0.16 * pluck * pluck, 6.91 / clamp(0.35 * Math.sqrt(440 / f), 0.05, 0.6), nv.phase(), sr, dI, 40);
    partial(b, 0, f * 17.55, 0.05 * pluck * pluck, 6.91 / 0.05, nv.phase(), sr, dI, 40);
    partial(b, 0, f * 2, 0.06, 6.91 / (T60 * 0.5), nv.phase(), sr, dI, 40); // the tooth's nonlinear 2nd (large swings)
    noiseBurst(b, 0, Math.round(0.0025 * sr), 4200, 1.1, 0.05 * v, nv.r, sr, 0.0008); // pin tick
    const g = Math.pow(v, 1.2) * 0.27 * nv.gain, p = pitchPan(k.p, width);
    const [gl, gr] = pan(p);
    for (let i = 0; i < len; i++) { const y = b[i] * g; out.L[i0 + i] += y * gl; out.R[i0 + i] += y * gr; dry[i0 + i] += y; }
  });
  // the box: a handful of wooden resonances (seeded per instrument), fed by the comb
  const br = mkRng(seed * 71 + 3);
  for (let j = 0; j < 7; j++) {
    const f = 380 * Math.pow(6, (j + br()) / 7), q = 6 + 10 * br(), g = (0.05 + 0.05 * br()) * (j % 2 ? 1 : -1), sv = new SVF(sr, f, q);
    for (let i = 0; i < n; i++) { sv.tick(dry[i]); const y = sv.bp * g; out.L[i] += y; out.R[i] += y * 0.9; }
  }
  return out;
};

/** FM bell (lead bell in many styles): 2 detuned carriers (beating), free modulator phase, the tierce, index decaying faster than loudness. */
export const fmBellV2 = (keys: Played[], sr: number, n: number, o: Opts, seed: number): Out => {
  const out = out0(n), width = num(o, "width", 0.5), ratio = num(o, "ratio", 3.5), sorted = byTime(keys), strike = strikeCounter();
  sorted.forEach((k, idx) => {
    const i0 = Math.round(k.t * sr); if (i0 >= n) return;
    const nv = noteVar(seed, idx, k, { cents: 1, db: 0.6, bright: 0.1, decay: 0.08 }, strike(k.p)), v = clamp(k.v, 0.02, 1);
    const f = mtof(k.p) * Math.pow(2, nv.cents / 1200), ta = clamp(2.2 * Math.pow(440 / f, 0.4), 0.5, 6) * nv.decay, ti = ta * 0.25, I0 = (1.2 + 2.4 * v) * nv.bright, g = Math.pow(v, 1.3) * 0.26 * nv.gain;
    const len = Math.min(n - i0, Math.ceil(ta * 7 * sr)), p = pitchPan(k.p, width), [gl, gr] = pan(p);
    const pm = nv.phase(), pt = nv.phase(), dA = Math.pow(2, 0.9 / 1200), dB = Math.pow(2, -0.9 / 1200), w = (TAU * f) / sr;
    const eA = Math.exp(-1 / (ta * sr)), eI = Math.exp(-1 / (ti * sr)), eT = Math.exp(-1 / (ta * 0.5 * sr));
    let a = 1, I = I0, tA = 0.3;
    for (let i = 0; i < len; i++) {
      const t = i * w, mod = I * Math.sin(ratio * t + pm), atk = Math.min(1, i / (0.0007 * sr));
      const y = (0.5 * Math.sin(t * dA + mod) + 0.5 * Math.sin(t * dB + mod * 0.97) + tA * Math.sin(2.4 * t + pt)) * a * atk * g;
      out.L[i0 + i] += y * gl; out.R[i0 + i] += y * gr; a *= eA; I *= eI; tA *= eT;
    }
  });
  return out;
};

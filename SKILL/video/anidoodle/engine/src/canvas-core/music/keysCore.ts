// Shared pieces for the keys voices (keysPiano, keysEP, keysMallets, keysOrgan).
// Anti-clone rule: every note draws its own seeded variation (pitch, level, brightness, decay,
// phase) from rng(seed, note index), so a repeated key never renders the same waveform twice,
// while the same piece + seed always renders the same samples.
import { type Rng, TAU, clamp, pan, gauss } from "./dsp";
import { rng as mkRng } from "../core";
import type { Played } from "./perform";

export type Out = { L: Float32Array; R: Float32Array };
export type Opts = Record<string, number | boolean | string>;
export const num = (o: Opts, k: string, d: number) => (typeof o[k] === "number" ? (o[k] as number) : d);
export const str = (o: Opts, k: string, d: string) => (typeof o[k] === "string" ? (o[k] as string) : d);
export const out0 = (n: number): Out => ({ L: new Float32Array(n), R: new Float32Array(n) });
export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
export const dbA = (x: number) => Math.pow(10, x / 20);

/**
 * Per-note variation, seeded by (instrument seed, note index, onset). Sizes follow research sec. 2 item 3.
 * Repeats of ONE key walk a golden-ratio sequence (`seq`, -1..1) instead of iid noise, so two strikes of the
 * same key never land on nearly the same pitch/phase by chance (iid draws sometimes do: a clone).
 */
export type NoteVar = { r: Rng; cents: number; gain: number; bright: number; decay: number; seq: number; seq2: number; phase: () => number };
const frac = (x: number) => x - Math.floor(x);
export const noteVar = (seed: number, idx: number, k: Played, o: { cents?: number; db?: number; bright?: number; decay?: number } = {}, strike = idx): NoteVar => {
  const r = mkRng((seed * 7919 + idx * 104729 + Math.round(k.t * 1000) * 13 + k.p * 31) >>> 0);
  const g = () => clamp(gauss(r), -2.5, 2.5), h = frac(Math.sin(k.p * 12.9898 + seed * 78.233) * 43758.5453);
  const seq = 2 * frac(h + (strike + 1) * 0.6180339887) - 1, seq2 = 2 * frac(h * 1.7 + (strike + 1) * 0.7548776662) - 1;
  return {
    r, seq, seq2,
    cents: (seq * 1.6 + g() * 0.25) * (o.cents ?? 1.2),
    gain: dbA(g() * (o.db ?? 0.6)),
    bright: 1 + g() * (o.bright ?? 0.05),
    decay: 1 + g() * (o.decay ?? 0.06),
    phase: () => r() * TAU,
  };
};
/** Counts strikes per key while walking notes in time order: strike(p) = how many times p sounded before. */
export const strikeCounter = () => { const m = new Map<number, number>(); return (p: number) => { const c = m.get(p) ?? 0; m.set(p, c + 1); return c; }; };

/** A slow 1/f-ish pitch wander shared by a whole instrument (cents), two octave-spaced smoothed random walks. */
export const drift = (seed: number, n: number, sr: number, cents: number): Float32Array => {
  const r = mkRng(seed * 131 + 17), out = new Float32Array(n);
  if (cents <= 0) return out;
  const step = Math.max(1, Math.round(sr / 200)); // control rate 200 Hz
  let a = 0, b = 0, va = 0, vb = 0;
  const ka = 1 - Math.exp(-TAU * 0.15 / 200), kb = 1 - Math.exp(-TAU * 0.6 / 200);
  let prev = 0, next = 0;
  for (let i = 0; i < n; i += step) {
    va += ka * (gauss(r) * 3 - va); a += ka * (va - a);
    vb += kb * (gauss(r) * 1.5 - vb); b += kb * (vb - b);
    prev = next; next = (a + 0.5 * b) * cents;
    for (let j = 0; j < step && i + j < n; j++) out[i + j] = prev + ((next - prev) * j) / step;
  }
  return out;
};

/**
 * Decaying sinusoid added into a mono buffer from sample i0: amplitude a, frequency f, T60-ish decay
 * sigma (1/s), start phase ph (sine start = 0), optional damping from sample dI on with extra sigma sD.
 * Stops once the partial is `floorRel` below its start. Recursive rotation, no sin() per sample.
 */
export const partial = (buf: Float64Array, i0: number, f: number, a: number, sigma: number, ph: number, sr: number, dI = Infinity, sD = 0, floorRel = 1e-4) => {
  if (a <= 0 || f <= 0 || f >= sr * 0.49) return;
  const n = buf.length, w = (TAU * f) / sr, cw = Math.cos(w), sw = Math.sin(w);
  const d1 = Math.exp(-sigma / sr), d2 = Math.exp(-(sigma + sD) / sr);
  let c = a * Math.cos(ph), s = a * Math.sin(ph);
  const floor2 = a * a * floorRel * floorRel;
  const end = Math.min(n - i0, Math.ceil((Math.log(1 / floorRel) / Math.max(sigma, 1e-3)) * sr) + 2);
  for (let i = Math.max(0, -i0); i < end; i++) {
    buf[i0 + i] += s;
    const d = i < dI ? d1 : d2, c2 = (c * cw - s * sw) * d; s = (c * sw + s * cw) * d; c = c2;
    if (i > dI && (i & 255) === 0 && c * c + s * s < floor2) break;
  }
};

/** Add a mono Float64 buffer into the stereo out with an equal-power pan and gain. */
export const mixIn = (out: Out, buf: Float64Array | Float32Array, p: number, g: number, from = 0, to = buf.length) => {
  const [gl, gr] = pan(p);
  for (let i = from; i < to; i++) { const v = buf[i] * g; out.L[i] += v * gl; out.R[i] += v * gr; }
};

/** One-pole DC blocker in place. */
export const dcBlock = (x: Float64Array | Float32Array, sr: number, fc = 12) => {
  const R = Math.exp((-TAU * fc) / sr); let x1 = 0, y1 = 0;
  for (let i = 0; i < x.length; i++) { const y = x[i] - x1 + R * y1; x1 = x[i]; y1 = y; x[i] = y; }
};

/** 2x-oversampled waveshaper (linear-interpolated upsample, two-tap average down): cheap alias control for tanh-style drives. */
export const shape2x = (x: Float64Array | Float32Array, fn: (v: number) => number, from = 0, to = x.length) => {
  let prev = from > 0 ? x[from - 1] : 0, prevY = fn(prev);
  for (let i = from; i < to; i++) { const cur = x[i], mid = fn(0.5 * (prev + cur)), y = fn(cur); x[i] = 0.25 * prevY + 0.5 * mid + 0.25 * y; prev = cur; prevY = y; }
};

/** Band-limited noise burst (seeded): a raised-cosine-windowed gaussian through a 2-pole band-pass. */
export const noiseBurst = (buf: Float64Array, i0: number, len: number, fc: number, q: number, g: number, r: Rng, sr: number, decayS = 0) => {
  const w = (TAU * Math.min(fc, sr * 0.45)) / sr, al = Math.sin(w) / (2 * q), a0 = 1 + al, b0 = al / a0, a1 = (-2 * Math.cos(w)) / a0, a2 = (1 - al) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < len && i0 + i < buf.length; i++) {
    const env = decayS > 0 ? Math.exp(-i / (decayS * sr)) * Math.min(1, i / 8) : Math.sin((Math.PI * i) / len);
    const x = gauss(r), y = b0 * x - b0 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y;
    if (i0 + i >= 0) buf[i0 + i] += y * env * g;
  }
};

/** Keys that the next strike of the same key cuts (a restrike re-damps the strings/bar): onset of the next same-pitch key, or Infinity. */
export const nextSameKey = (sorted: Played[], idx: number) => { const k = sorted[idx]; for (let j = idx + 1; j < sorted.length; j++) if (sorted[j].p === k.p && sorted[j].t > k.t) return sorted[j].t; return Infinity; };
export const byTime = (keys: Played[]) => keys.slice().sort((a, b) => a.t - b.t || a.p - b.p);
export const pitchPan = (m: number, w: number) => clamp((m - 64) / 30, -1, 1) * w;

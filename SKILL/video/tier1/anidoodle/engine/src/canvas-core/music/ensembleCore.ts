// Shared machinery for the ensemble voices (ensemble.ts): per-note seeded variation, slow random
// drift, an extended Karplus-Strong string, commuted body impulse responses, formant resonators and
// the "measured physics" tables (body modes, formants, spectra) with their provenance.
// Everything is pure in its inputs: same keys + seed -> the same samples.
import { type Rng, TAU, clamp, Biquad } from "./dsp";
import { rng as mkRng } from "../core";
import type { Played } from "./perform";

export type Out = { L: Float32Array; R: Float32Array };
export type Opts = Record<string, number | boolean | string>;
export const num = (o: Opts, k: string, d: number) => (typeof o[k] === "number" ? (o[k] as number) : d);
export const f0 = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
export const out0 = (n: number): Out => ({ L: new Float32Array(n), R: new Float32Array(n) });
/** Fast unit-variance noise (uniform, sqrt 12 scaled): cheap enough to run per sample per player. */
export const wn = (r: Rng) => (r() - 0.5) * 3.4641016;
export const gn = (r: Rng) => { let u = r(); if (u < 1e-12) u = 1e-12; return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * r()); };
/** An independent stream per note, drawn from the part's stream: a note's randomness never shifts its neighbours'. */
export const subRng = (r: Rng): Rng => mkRng(Math.floor(r() * 4294967296));
/** A part stream for voices the renderer hands no rng: a hash of the performed keys (deterministic). */
export const keysRng = (keys: Played[], salt: number): Rng => {
  let h = (2166136261 ^ salt) >>> 0;
  for (const k of keys) { h = Math.imul(h ^ Math.round(k.t * 1000), 16777619); h = Math.imul(h ^ k.p, 16777619); h = Math.imul(h ^ Math.round(k.v * 1000), 16777619); }
  return mkRng(h >>> 0);
};
/** How many keys sound at each key's onset (itself included): a section divides its players across a chord (divisi). */
export const concurrency = (keys: Played[]) => {
  const idx = keys.map((_, i) => i).sort((a, b) => keys[a].t - keys[b].t), c = new Array<number>(keys.length).fill(1);
  for (let a = 0; a < idx.length; a++) { const k = keys[idx[a]]; let m = 0;
    for (let b = a; b >= 0; b--) { const q = keys[idx[b]]; if (q.off > k.t && q.t <= k.t + 0.03) m++; if (k.t - q.t > 12) break; }
    for (let b = a + 1; b < idx.length && keys[idx[b]].t <= k.t + 0.03; b++) m++;
    c[idx[a]] = Math.max(1, m); }
  return c;
};

/**
 * Slow random drift (Ornstein-Uhlenbeck, unit standard deviation), updated every `block` samples
 * and interpolated between, so pitch and level wander the way a player does instead of a sine LFO.
 */
export class Drift {
  private a = 0; private b = 0; private i = 0; private k: number; private s: number;
  constructor(private r: Rng, hz: number, sr: number, private block = 64) { const th = TAU * hz * (block / sr); this.k = Math.exp(-th); this.s = Math.sqrt(1 - this.k * this.k); this.a = gn(r); this.b = this.a * this.k + this.s * gn(r); }
  tick() { if (this.i >= this.block) { this.i = 0; this.a = this.b; this.b = this.b * this.k + this.s * wn(this.r); } return this.a + ((this.b - this.a) * this.i++) / this.block; }
}

/** Klatt-style resonator (unity gain at DC); a cascade of five is a vowel's vocal tract. */
export class Reson {
  private y1 = 0; private y2 = 0; A = 1; B = 0; C = 0;
  set(sr: number, f: number, bw: number) { const T = 1 / sr, fr = clamp(f, 20, sr * 0.46); this.C = -Math.exp(-TAU * bw * T); this.B = 2 * Math.exp(-Math.PI * bw * T) * Math.cos(TAU * fr * T); this.A = 1 - this.B - this.C; }
  tick(x: number) { const y = this.A * x + this.B * this.y1 + this.C * this.y2; this.y2 = this.y1; this.y1 = y; return y; }
  /** |H| at frequency f (for level normalisation) */
  mag(sr: number, f: number) { const w = (TAU * f) / sr, cr = 1 - this.B * Math.cos(w) - this.C * Math.cos(2 * w), ci = this.B * Math.sin(w) + this.C * Math.sin(2 * w); return Math.abs(this.A) / Math.hypot(cr, ci); }
}

/** Mono below `f` Hz (M/S: the side channel high-passed), the mix rule for low end; the highs keep their width. */
export const monoLows = (o: Out, sr: number, f = 160) => { const h1 = Biquad.make(sr, "hp", f, 0.54), h2 = Biquad.make(sr, "hp", f, 1.31); // 4th-order Butterworth on the side
  for (let i = 0; i < o.L.length; i++) { const m = 0.5 * (o.L[i] + o.R[i]), sd = h2.tick(h1.tick(0.5 * (o.L[i] - o.R[i]))); o.L[i] = m + sd; o.R[i] = m - sd; } return o; };
/** A body as a chain of peaking filters (strings): run on a whole bus, one chain per channel. */
export type PeakBody = { peaks: [number, number, number][]; shelf: [number, number]; hp: number };
export const runBody = (buf: Float32Array, sr: number, b: PeakBody, scale = 1) => {
  const ny = sr * 0.45;
  Biquad.make(sr, "hp", Math.min(b.hp * scale, ny), 0.7).run(buf);
  for (const [f, q, g] of b.peaks) if (f * scale < ny) Biquad.make(sr, "peak", f * scale, q, g).run(buf);
  if (b.shelf[0] * scale < ny) Biquad.make(sr, "highshelf", b.shelf[0] * scale, 0.7, b.shelf[1]).run(buf);
};

// ------------------------------------------------------------------ measured-physics tables
// Provenance: mode FREQUENCIES are published measurements; gains, Q and amplitudes are voiced by
// hand to those measurements (no recording was fitted, none ships). Sources:
//  violin: Bissinger, "Structural acoustics of good and bad violins", JASA 124(3) 2008 (A0 ~275,
//    CBR ~405, B1- ~470, B1+ ~540 Hz; the 2-3 kHz bridge hill); Jansson, "Acoustics for Violin and
//    Guitar Makers" (KTH, 2002) ch. 7-8; Duennwald 1991 bands (a dip in the 1.3-1.6 kHz "nasal" band).
//  viola = violin modes x0.82 (Rossing, "The Science of String Instruments", 2010, ch. 13).
//  cello: Bynum & Rossing in Rossing 2010 ch. 13 (A0 ~100, B1- ~175, B1+ ~210 Hz, bridge hill ~1.6 kHz).
export const VIOLIN_BODY: PeakBody = { hp: 180, shelf: [5200, -9], peaks: [[275, 6, 5], [405, 8, 2], [470, 7, 6], [540, 7, 5.5], [700, 4, 1.5], [1000, 3, 3], [1450, 2, -4], [2500, 1.2, 6], [3500, 2.5, 2]] };
export const CELLO_BODY: PeakBody = { hp: 55, shelf: [4200, -9], peaks: [[100, 5, 5], [150, 6, 2], [175, 6, 6], [210, 6, 5], [340, 4, 2], [600, 3, 2], [900, 2, -3], [1650, 1.2, 5], [2800, 2.5, 1.5]] };

/** A commuted body impulse response: low modes from measurements, a seeded dense modal field above. */
export type IRSpec = { key: string; modes: [number, number, number][]; dense: [number, number, number, number]; len: number; direct: number };
//  nylon: Christensen & Vistisen, JASA 68 (1980); Rossing & Fletcher, "The Physics of Musical
//    Instruments" (1998) ch. 9: A0 ~98, T(1,1)1 ~204, T(1,1)2 ~240, (1,2) ~385 Hz, then plate modes.
//  steel: Rossing 2010 ch. 12 (dreadnought: A0 ~102, T1 ~195, ~225, ~370, ~440 Hz).
//  harp: soundboard modes after Le Carrou et al., JASA 2005 (concert harp, 60-700 Hz region).
//  upright bass: Askenfelt, "Eigenmodes and tone quality of the double bass" (KTH STL-QPSR 1982): A0 ~57 Hz, ~105, ~130 Hz.
export const IR_NYLON: IRSpec = { key: "nylon", len: 0.09, direct: 1, dense: [800, 5000, 60, 0.35], modes: [[98, 16, 1], [204, 24, 0.9], [240, 28, 0.55], [290, 30, 0.3], [385, 34, 0.45], [455, 38, 0.3], [550, 40, 0.35], [650, 44, 0.25]] };
export const IR_STEEL: IRSpec = { key: "steel", len: 0.08, direct: 1, dense: [700, 7000, 80, 0.45], modes: [[102, 15, 1], [195, 22, 0.8], [225, 26, 0.6], [370, 34, 0.5], [440, 38, 0.4], [540, 40, 0.4], [690, 44, 0.3], [870, 48, 0.25]] };
export const IR_HARP: IRSpec = { key: "harp", len: 0.07, direct: 1.2, dense: [700, 4000, 40, 0.25], modes: [[75, 10, 0.5], [150, 14, 0.6], [250, 20, 0.5], [400, 24, 0.4], [600, 28, 0.3]] };
export const IR_UPRIGHT: IRSpec = { key: "upright", len: 0.11, direct: 0.9, dense: [400, 2500, 40, 0.3], modes: [[57, 9, 0.8], [105, 13, 1], [130, 15, 0.8], [180, 18, 0.5], [250, 22, 0.4], [350, 28, 0.3]] };
const IR_CACHE = new Map<string, Float64Array>();
export const bodyIR = (sr: number, s: IRSpec): Float64Array => {
  const ck = `${s.key}@${sr}`, hit = IR_CACHE.get(ck); if (hit) return hit;
  const n = Math.round(s.len * sr), ir = new Float64Array(n), r = mkRng(0x5eed + s.key.length * 977 + s.key.charCodeAt(0));
  const modes = s.modes.slice(), [lo, hi, cnt, amp] = s.dense;
  for (let i = 0; i < cnt; i++) { const f = lo * Math.pow(hi / lo, r()); modes.push([f, 25 + 35 * r(), amp * Math.sqrt(lo / f) * (0.4 + 0.6 * r())]); }
  for (const [f, q, a] of modes) { if (f > sr * 0.45) continue; const dec = Math.exp(-Math.PI * f / q / sr), w = (TAU * f) / sr, cw = Math.cos(w), sw = Math.sin(w); let c = a, sn = 0;
    for (let i = 0; i < n; i++) { ir[i] += sn; const c2 = (c * cw - sn * sw) * dec; sn = (c * sw + sn * cw) * dec; c = c2; } }
  let e = 0; for (let i = 0; i < n; i++) e += ir[i] * ir[i]; const k = 1 / Math.sqrt(e / 40 + 1e-12); // modal energy relative to the direct pulse
  for (let i = 0; i < n; i++) ir[i] *= k * 0.55; ir[0] += s.direct;
  const fade = Math.round(0.01 * sr); for (let i = 0; i < fade; i++) ir[n - 1 - i] *= i / fade;
  IR_CACHE.set(ck, ir); return ir;
};
export const convolve = (x: Float64Array, h: Float64Array) => { const y = new Float64Array(x.length + h.length - 1);
  for (let i = 0; i < x.length; i++) { const xi = x[i]; if (xi === 0) continue; for (let j = 0; j < h.length; j++) y[i + j] += xi * h[j]; } return y; };

/**
 * A pluck's excitation (bridge force): a raised-cosine contact `width` s long plus a little
 * seeded contact noise, low-passed above `lp` Hz (the 1/n fall of a plucked string's spectrum),
 * then the pick-position comb (harmonics at multiples of 1/beta vanish). No DC by construction.
 */
export const pluckExc = (sr: number, f: number, o: { width: number; beta: number; noise: number; lp: number }, r: Rng) => {
  const W = Math.max(2, Math.round(o.width * sr)), D = o.beta * (sr / f), Di = Math.floor(D), Df = D - Di, n = W + Di + 3, e = new Float64Array(n), c = new Float64Array(n);
  const a = Math.exp((-TAU * Math.min(o.lp, sr * 0.45)) / sr); let y = 0;
  for (let i = 0; i < n; i++) { const x = i < W ? 0.5 * (1 - Math.cos((TAU * (i + 0.5)) / W)) * (1 + o.noise * wn(r)) : 0; y = (1 - a) * x + a * y; e[i] = y; }
  for (let i = 0; i < n; i++) { const j = i - D, j0 = Math.floor(j), fr = j - j0, v = j0 >= 0 ? e[j0] * (1 - fr) + (j0 + 1 < n ? e[j0 + 1] : 0) * fr : j0 === -1 ? e[0] * fr : 0; c[i] = e[i] - v; }
  void Df; return c;
};

export type KSOpts = { f: number; T60: number; loss: number; exc: Float64Array; len: number; relI: number; relT60: number;
  /** second polarisation: detune (cents), level, decay factor vs the first, share of the pluck (0..1) */ pol2?: { cents: number; mix: number; t60: number; share: number };
  /** tension-modulation pitch glide at the attack: +cents decaying with tau s (Lagrange-read line) */ glide?: { cents: number; tau: number } };
/**
 * Extended Karplus-Strong (Jaffe & Smith 1983; Karjalainen, Valimaki & Tolonen 1998): a loop of
 * delay + one-pole loss + Thiran allpass tuning, with the excitation INJECTED over time (so a
 * commuted body can ride on it), two polarisations (a detuned, faster-decaying vertical one gives
 * the two-stage decay and slow beating) and finger damping after release. The loss filter's phase
 * delay is subtracted from the loop so every note is in tune (checked in tools/ensemble-check.mjs).
 */
export const ksRender = (sr: number, o: KSOpts): Float64Array => {
  const out = new Float64Array(o.len);
  const run = (fHz: number, T60: number, share: number, mix: number) => {
    const a = o.loss, w = (TAU * fHz) / sr, pd = Math.atan2(a * Math.sin(w), 1 - a * Math.cos(w)) / w, mag = (1 - a) / Math.sqrt(1 - 2 * a * Math.cos(w) + a * a);
    // the loop's DC gain is g (the one-pole passes DC at unity): keep it below 1 or low frequencies grow without bound
    const g = Math.min(0.99995, Math.pow(10, -3 / (T60 * fHz)) / mag), gRel = Math.min(g, Math.pow(10, -3 / (Math.max(0.02, o.relT60) * fHz)) / mag), L = sr / fHz - pd;
    const kRel = Math.exp(-1 / (0.012 * sr)); let gc = g, lp = 0;
    if (!o.glide) {
      const N = Math.max(2, Math.floor(L - 0.5)), d = L - N, c = (1 - d) / (1 + d), buf = new Float64Array(N); let idx = 0, apx = 0, apy = 0;
      for (let i = 0; i < o.len; i++) {
        if (i >= o.relI) gc = gRel + (gc - gRel) * kRel;
        lp = (1 - a) * buf[idx] + a * lp; const v = gc * lp, ap = c * v + apx - c * apy; apx = v; apy = ap;
        const y = ap + (i < o.exc.length ? o.exc[i] * share : 0); buf[idx] = y; idx = idx + 1 === N ? 0 : idx + 1; out[i] += y * mix;
      }
    } else {
      const M = Math.ceil(L * (1 + o.glide.cents / 1000)) + 8, buf = new Float64Array(M); let wi = 0; const kg = Math.exp(-1 / (o.glide.tau * sr));
      let cents = o.glide.cents;
      for (let i = 0; i < o.len; i++) {
        if (i >= o.relI) gc = gRel + (gc - gRel) * kRel;
        const D = clamp(L / Math.pow(2, cents / 1200), 3, M - 4); cents *= kg;
        let pos = wi - D; if (pos < 0) pos += M; const i1 = Math.floor(pos), x = pos - i1;
        const ym1 = buf[(i1 - 1 + M) % M], y0 = buf[i1 % M], y1 = buf[(i1 + 1) % M], y2 = buf[(i1 + 2) % M];
        const rd = (-x * (x - 1) * (x - 2) / 6) * ym1 + ((x + 1) * (x - 1) * (x - 2) / 2) * y0 - ((x + 1) * x * (x - 2) / 2) * y1 + ((x + 1) * x * (x - 1) / 6) * y2; // 3rd-order Lagrange
        lp = (1 - a) * rd + a * lp; const y = gc * lp + (i < o.exc.length ? o.exc[i] * share : 0); buf[wi] = y; wi = wi + 1 === M ? 0 : wi + 1; out[i] += y * mix;
      }
    }
  };
  const p2 = o.pol2;
  run(o.f, o.T60, p2 ? Math.sqrt(1 - p2.share) : 1, 1);
  if (p2 && p2.mix > 0) run(o.f * Math.pow(2, p2.cents / 1200), o.T60 * p2.t60, Math.sqrt(p2.share), p2.mix);
  return out;
};
/** RMS of the first `sec` seconds (note-level normalisation, so level follows velocity, not period or pluck width). */
export const headRms = (x: Float64Array, sr: number, sec = 0.08) => { const m = Math.min(x.length, Math.round(sec * sr)); let e = 0; for (let i = 0; i < m; i++) e += x[i] * x[i]; return Math.sqrt(e / Math.max(1, m)) + 1e-12; };

// Formants: Peterson & Barney, JASA 24 (1952), average adult men / women F1-F3 (a = /A/ "hod",
// e = /E/ "head", i = /i/ "heed", o = /O/ "hawed" with F1 x0.88 for the rounded sung "oh",
// u = /u/ "who'd"); F4, F5 and the bandwidths are typical values (Sundberg, "The Science of the
// Singing Voice", 1987; F1 bandwidth 60-90 Hz rising to ~200 Hz at F5).
export const FORMANTS: Record<string, { m: number[]; w: number[] }> = {
  a: { m: [730, 1090, 2440, 3350, 3850], w: [850, 1220, 2810, 3950, 4650] },
  e: { m: [530, 1840, 2480, 3350, 3850], w: [610, 2330, 2990, 4000, 4700] },
  i: { m: [270, 2290, 3010, 3400, 3900], w: [310, 2790, 3310, 4100, 4800] },
  o: { m: [500, 840, 2410, 3300, 3800], w: [520, 920, 2710, 3900, 4600] },
  u: { m: [300, 870, 2240, 3300, 3800], w: [370, 950, 2670, 3900, 4600] },
};
export const FORMANT_BW = { m: [70, 80, 110, 140, 180], w: [85, 95, 125, 160, 200] };

// Brass radiation formants in dB bumps on a log-frequency axis [fc, width octaves, dB] plus a
// roll-off corner and slope. Trumpet regions ~1.2 and ~2.5 kHz, trombone ~520 Hz / 1.2 kHz, horn
// ~340-450 Hz with a dark top (Meyer, "Acoustics and the Performance of Music", 2009, ch. 2;
// Luce & Clark, JASA 1967). Shapes voiced by hand.
export const BRASS_FORMANT: Record<string, { bumps: [number, number, number][]; roll: number; slope: number }> = {
  trumpet: { bumps: [[1250, 0.45, 6], [2500, 0.5, 4]], roll: 4200, slope: 12 },
  trombone: { bumps: [[540, 0.5, 5], [1200, 0.6, 3]], roll: 2600, slope: 12 },
  horn: { bumps: [[420, 0.55, 6], [850, 0.6, 1]], roll: 1300, slope: 16 },
};
export const bumpDb = (fr: number, b: { bumps: [number, number, number][]; roll: number; slope: number }) => {
  let g = 0; for (const [fc, wo, db] of b.bumps) { const x = Math.log2(fr / fc) / wo; g += db * Math.exp(-0.5 * x * x); }
  if (fr > b.roll) g -= b.slope * Math.log2(fr / b.roll); return g;
};

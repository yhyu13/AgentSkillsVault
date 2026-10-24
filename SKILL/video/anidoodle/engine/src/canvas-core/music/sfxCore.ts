// Sound-effect building blocks. Every effect is built from LAYERS (a transient, a body, a tail),
// each a pure function of (sampleRate, rng). Nothing here reads a clock or Math.random, so the
// same seed always renders the same samples.
import { Biquad, SVF, pan as panGains, room, TAU, clamp, type Rng } from "./dsp";

export type SfxStereo = [Float32Array, Float32Array];
export const buf = (n: number) => new Float64Array(Math.max(0, Math.round(n)));
export const secs = (sr: number, s: number) => Math.max(0, Math.round(s * sr));

/** 32-bit integer hash of two values: per-cue seeds that stay put when other cues move. */
export const mixSeed = (a: number, b: number) => {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0; h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};
export const strSeed = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/** A stereo bus. Mono layers are placed with a pan (constant, or per sample) and an optional Haas offset (ms, + delays R). */
export class Bus {
  L: Float64Array; R: Float64Array;
  constructor(readonly sr: number, readonly n: number) { this.L = buf(n); this.R = buf(n); }
  add(sig: ArrayLike<number>, at = 0, g = 1, p: number | ((i: number) => number) = 0, haasMs = 0) {
    const d = Math.round((Math.abs(haasMs) * this.sr) / 1000), dL = haasMs < 0 ? d : 0, dR = haasMs > 0 ? d : 0;
    const fixed = typeof p === "number" ? panGains(p) : null;
    for (let i = 0; i < sig.length; i++) {
      const v = sig[i] * g; if (v === 0) continue;
      const [gl, gr] = fixed ?? panGains((p as (i: number) => number)(i));
      const a = at + i + dL, b = at + i + dR;
      if (a >= 0 && a < this.n) this.L[a] += v * gl;
      if (b >= 0 && b < this.n) this.R[b] += v * gr;
    }
  }
  /** Add an already-stereo pair (for decorrelated layers). */
  add2(l: ArrayLike<number>, r: ArrayLike<number>, at = 0, g = 1) {
    for (let i = 0; i < l.length; i++) { const k = at + i; if (k < 0 || k >= this.n) continue; this.L[k] += l[i] * g; this.R[k] += r[i] * g; }
  }
}

// ---- sources
export const white = (r: Rng, n: number) => { const o = buf(n); for (let i = 0; i < o.length; i++) o[i] = r() * 2 - 1; return o; };
/** Pink noise (Paul Kellet's refined filter), ~unit RMS-ish. */
export const pink = (r: Rng, n: number) => {
  const o = buf(n); let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < o.length; i++) {
    const w = r() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    o[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
  }
  return o;
};

/** One mode of a struck object: a damped sinusoid, optionally gliding (bubbles rise, bodies drop). */
export type Mode = { f: number; tau: number; a: number; t0?: number; att?: number; ph?: number; glide?: number; glideTau?: number; rise?: number };
/**
 * Modal synthesis: sum of damped sinusoids. f(t) = f * (1 + glide*(1 - e^(-t/glideTau))) * (1 + rise*t), the
 * rise frozen once the mode is 60 dB down. Frequencies are held under 0.45*sr (no aliasing); a mode
 * stops once it has decayed 100 dB.
 */
export const modal = (sr: number, n: number, modes: Mode[]) => {
  const o = buf(n), ny = 0.45 * sr;
  for (const m of modes) {
    if (!(m.f > 0) || m.f > ny) continue;
    const i0 = secs(sr, m.t0 ?? 0), att = m.att ?? 0.00006, end = Math.min(o.length, i0 + Math.ceil(m.tau * 11.5 * sr)), riseEnd = m.tau * 6.9;
    let ph = m.ph ?? 0;
    for (let i = i0; i < end; i++) {
      const t = (i - i0) / sr, f = m.f * (1 + (m.glide ?? 0) * (1 - Math.exp(-t / (m.glideTau ?? 0.01)))) * (1 + (m.rise ?? 0) * Math.min(t, riseEnd));
      o[i] += Math.sin(ph) * m.a * (1 - Math.exp(-t / att)) * Math.exp(-t / m.tau);
      ph += (TAU * Math.min(f, ny)) / sr;
    }
  }
  return o;
};
/** Raised-cosine fade over the last `s` seconds of a layer: a layer cut while still sounding would click. */
export const endFade = (o: Float64Array, sr: number, s = 0.008) => { const f = Math.min(o.length, secs(sr, s)); for (let i = 0; i < f; i++) o[o.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / f); return o; };
/** A sine whose frequency and amplitude are functions of time (phase-accumulated, so glides never click). */
export const chirp = (sr: number, n: number, f: (t: number) => number, env: (t: number) => number, ph0 = 0) => {
  const o = buf(n); let ph = ph0;
  for (let i = 0; i < o.length; i++) { const t = i / sr, e = env(t); o[i] = Math.sin(ph) * e; ph += (TAU * Math.min(f(t), sr * 0.45)) / sr; }
  return endFade(o, sr, 0.03);
};
/** Enveloped noise burst, optionally band-limited: the contact transient of almost every hit. */
export const burst = (sr: number, r: Rng, len: number, tau: number, o: { hp?: number; lp?: number; bp?: number; q?: number; pink?: boolean } = {}) => {
  const n = secs(sr, len), s = o.pink ? pink(r, n) : white(r, n);
  for (let i = 0; i < n; i++) s[i] *= Math.exp(-i / sr / tau) * Math.min(1, i / (sr * 0.00008) + 0.35);
  filt(s, sr, o); return endFade(s, sr, 0.008);
};
export const filt = (s: Float64Array, sr: number, o: { hp?: number; lp?: number; bp?: number; q?: number }) => {
  const run = (bq: Biquad) => { for (let i = 0; i < s.length; i++) s[i] = bq.tick(s[i]); };
  if (o.hp) run(Biquad.make(sr, "hp", o.hp, 0.707));
  if (o.lp) run(Biquad.make(sr, "lp", o.lp, 0.707));
  if (o.bp) run(Biquad.make(sr, "bp", o.bp, o.q ?? 1));
  return s;
};
/** Time-varying state-variable filter (a sweep): f(t) in Hz, returns the chosen output. */
export const sweep = (s: Float64Array, sr: number, f: (t: number) => number, q: number | ((t: number) => number), mode: "lp" | "bp" | "hp") => {
  const sv = new SVF(sr, f(0), typeof q === "number" ? q : q(0));
  for (let i = 0; i < s.length; i++) {
    if ((i & 15) === 0) { const t = i / sr; sv.set(clamp(f(t), 20, sr * 0.45), typeof q === "number" ? q : q(t)); }
    sv.tick(s[i]); s[i] = mode === "lp" ? sv.lp : mode === "bp" ? sv.bp : sv.hp;
  }
  return s;
};
export const shape = (s: Float64Array, sr: number, env: (t: number) => number) => { for (let i = 0; i < s.length; i++) s[i] *= env(i / sr); return s; };
/** Attack-decay envelope: raised-cosine attack of `a` seconds, exponential decay of time constant `tau`. */
export const ad = (a: number, tau: number) => (t: number) => (t < a ? 0.5 - 0.5 * Math.cos((Math.PI * t) / a) : Math.exp(-(t - a) / tau));
export const smooth = (u: number) => { const x = clamp(u, 0, 1); return x * x * (3 - 2 * x); };

/** Put the bus in a small space: dsp.room's wet signal, mixed in. Stereo width comes from here. */
export const space = (b: Bus, r: Rng, o: { rt60: number; mix: number; er?: number; predelay?: number; hp?: number; lp?: number }) => {
  const L = Float32Array.from(b.L), R = Float32Array.from(b.R);
  const [wL, wR] = room(L, R, b.sr, { er: o.er ?? 0.5, late: 0.6, rt60: o.rt60, predelay: o.predelay ?? 0.012, hp: o.hp ?? 250, lp: o.lp ?? 7000, seed: 0, rng: r });
  for (let i = 0; i < b.n; i++) { b.L[i] += wL[i] * o.mix; b.R[i] += wR[i] * o.mix; }
};

/** DC block (2nd-order 22 Hz high-pass), air roll-off (4th-order 16.5 kHz: no fizz for the encoder), NaN guard, trailing silence trimmed, 4 ms end fade. */
export const finish = (b: Bus, keep: number): SfxStereo => {
  const sr = b.sr;
  const top = Math.min(16500, sr * 0.4);
  for (const c of [b.L, b.R]) {
    const h = Biquad.make(sr, "hp", 22, 0.707), l1 = Biquad.make(sr, "lp", top, 0.5412), l2 = Biquad.make(sr, "lp", top, 1.3066);
    for (let i = 0; i < c.length; i++) { const v = l2.tick(l1.tick(h.tick(c[i]))); c[i] = Number.isFinite(v) ? v : 0; }
  }
  let peak = 0; for (let i = 0; i < b.n; i++) peak = Math.max(peak, Math.abs(b.L[i]), Math.abs(b.R[i]));
  let end = b.n; const floor = peak * 1e-4; // -80 dB under the peak
  while (end > keep + 1 && Math.abs(b.L[end - 1]) < floor && Math.abs(b.R[end - 1]) < floor) end--;
  const rang = end === b.n; // still ringing at the buffer's end: a long fade instead of a cut
  end = Math.min(b.n, end + secs(sr, 0.004));
  const L = new Float32Array(end), R = new Float32Array(end), fade = Math.min(end, rang ? Math.min(secs(sr, 0.4), Math.round(end * 0.2)) : secs(sr, 0.004));
  for (let i = 0; i < end; i++) { const g = i >= end - fade ? 0.5 - 0.5 * Math.cos((Math.PI * (end - 1 - i)) / fade) : 1; L[i] = b.L[i] * g; R[i] = b.R[i] * g; }
  return [L, R];
};

// ---- measurement: K-weighted (BS.1770) power over a window, the same yardstick for levels and audibility
export const kWeight = (x: ArrayLike<number>, sr: number) => {
  const out = new Float64Array(x.length);
  { const G = 3.999843853973347, Q = 0.7071752369554196, fc = 1681.974450955533, K = Math.tan((Math.PI * fc) / sr), Vh = Math.pow(10, G / 20), Vb = Math.pow(Vh, 0.4996667741545416);
    const a0 = 1 + K / Q + K * K, b0 = (Vh + (Vb * K) / Q + K * K) / a0, b1 = (2 * (K * K - Vh)) / a0, b2 = (Vh - (Vb * K) / Q + K * K) / a0, a1 = (2 * (K * K - 1)) / a0, a2 = (1 - K / Q + K * K) / a0;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const y = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = y; out[i] = y; } }
  { const fc = 38.13547087602444, Q = 0.5003270373238773, K = Math.tan((Math.PI * fc) / sr), a0 = 1 + K / Q + K * K, a1 = (2 * (K * K - 1)) / a0, a2 = (1 - K / Q + K * K) / a0;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < out.length; i++) { const xi = out[i], y = xi - 2 * x1 + x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = xi; y2 = y1; y1 = y; out[i] = y; } }
  return out;
};
/** Loudness (LUFS-scaled, ungated) of K-weighted channels over samples [a, b). */
export const winLufs = (kL: Float64Array, kR: Float64Array, a: number, b: number) => {
  let s = 0; const lo = Math.max(0, a), hi = Math.min(kL.length, b), len = Math.max(1, hi - lo);
  for (let i = lo; i < hi; i++) s += kL[i] * kL[i] + kR[i] * kR[i];
  return -0.691 + 10 * Math.log10(Math.max(s / len, 1e-20));
};
/**
 * The window where a sound actually speaks: the 10 ms frames within 10 dB of its loudest frame,
 * grown to the contiguous run around that frame, clamped to 15..500 ms. Returns [a, b) in samples.
 */
export const speakingWindow = (kL: Float64Array, kR: Float64Array, sr: number): [number, number] => {
  const hop = Math.max(1, secs(sr, 0.01)), nf = Math.ceil(kL.length / hop), e = new Float64Array(nf);
  for (let f = 0; f < nf; f++) { let s = 0; for (let i = f * hop; i < Math.min(kL.length, (f + 1) * hop); i++) s += kL[i] * kL[i] + kR[i] * kR[i]; e[f] = s; }
  let mx = 0, at = 0; for (let f = 0; f < nf; f++) if (e[f] > mx) { mx = e[f]; at = f; }
  let a = at, b = at; const th = mx * 0.1;
  while (a > 0 && e[a - 1] >= th) a--;
  while (b < nf - 1 && e[b + 1] >= th) b++;
  let s0 = a * hop, s1 = Math.min(kL.length, (b + 1) * hop);
  const min = secs(sr, 0.015), max = secs(sr, 0.5);
  if (s1 - s0 > max) { const c = at * hop + hop / 2; s0 = Math.max(s0, Math.round(c - max / 2)); s1 = Math.min(s1, s0 + max); }
  if (s1 - s0 < min) s1 = Math.min(kL.length, s0 + min);
  return [s0, s1];
};

// Reverbs (sound v2). Three spaces, all deterministic from a seed, all returning the wet signal as
// [full L, full R, late L, late R] (late = the diffuse tail only, which the reverb guard measures):
//   fdn    diffuser (4 steps of random delays, random polarity, Hadamard mix) into a 16-line
//          Householder feedback network, each line delay-modulated (+-0.3 ms, 0.1-1 Hz) with
//          frequency-dependent loss (low T60 x lowMult, high T60 x highMult). After Signalsmith's
//          "Let's Write a Reverb" (design re-implemented, no code copied).
//   plate  Dattorro 1997 (AES "Effect Design, Part 1"): 4 input allpasses into a modulated
//          figure-of-eight tank, the paper's output taps. Implemented from the published algorithm.
//   conv   convolution with a SYNTHESIZED impulse response: decorrelated L/R noise in 8 octave
//          bands, each with its own exponential decay (T60 falls above 4 kHz), a sparse early-
//          reflection pattern and a 20 ms fade-in; FFT overlap-add. Optional recorded rooms use
//          the same convolution, with their first 40 ms counted as early reflections.
import { Biquad, onePoleCoef, gauss, type Rng } from "./dsp";
import { fft } from "./meter";

export type SpaceKind = "fdn" | "plate" | "conv";
export type Space = { kind: SpaceKind; room?: string; rt60: number; predelayMs: number; /** send filter */ hp: number; lp: number; /** early reflections level (0..1) and the late tail level (0..1) */ er: number; late: number; /** room size 0..1 (fdn/conv delay spread) */ size?: number; /** HF / LF decay multipliers */ highMult?: number; lowMult?: number; /** tank modulation depth 0..1 */ mod?: number };
type Wet = readonly [Float32Array, Float32Array, Float32Array, Float32Array];
export type RecordedRoom = { L: Float32Array; R: Float32Array; rt60: number; sha256: string; directFrames?: number };
const rooms = new Map<string, RecordedRoom>();
export const roomFor = (id?: string) => id ? rooms.get(id) : undefined;
export const clearRooms = () => rooms.clear();
export const registerRoom = (id: string, room: RecordedRoom) => {
  if (!id || !(room.L instanceof Float32Array) || !(room.R instanceof Float32Array) || !room.L.length || room.L.length !== room.R.length || !room.L.every(Number.isFinite) || !room.R.every(Number.isFinite) || !(room.rt60 > 0) || !Number.isFinite(room.rt60) || !/^[a-f0-9]{64}$/i.test(room.sha256)) throw new Error(`${id}: invalid recorded room`);
  const directFrames = room.directFrames ?? 0;
  if (!Number.isInteger(directFrames) || directFrames < 0 || directFrames > room.L.length) throw new Error(`${id}: invalid directFrames`);
  const r = { ...room, directFrames, sha256: room.sha256.toLowerCase() }; rooms.set(id, r); return r;
};
/** A missing room-only override must not create a space on styles that have none. */
export const effectiveSpace = (s?: Partial<Space>): Partial<Space> | undefined => {
  if (!s?.room || roomFor(s.room)) return s;
  const { room: _room, ...rest } = s;
  return Object.keys(rest).length ? rest : undefined;
};

const sendFilter = (L: Float32Array, R: Float32Array, sr: number, s: Space) => {
  const a = Float32Array.from(L), b = Float32Array.from(R);
  for (const c of [a, b]) { Biquad.make(sr, "hp", s.hp, 0.7071).run(c); Biquad.make(sr, "lp", s.lp, 0.7071).run(c); }
  return [a, b] as const;
};
/** A delay line with a fractional (cubic Hermite) read. */
class Line {
  buf: Float64Array; w = 0; mask: number;
  constructor(len: number) { let s = 1; while (s < len + 8) s <<= 1; this.buf = new Float64Array(s); this.mask = s - 1; }
  push(x: number) { this.buf[this.w] = x; this.w = (this.w + 1) & this.mask; }
  at(d: number) { return this.buf[(this.w - 1 - d) & this.mask]; } // integer delay d >= 0 (0 = last pushed)
  frac(d: number) { const i = Math.floor(d), f = d - i, y0 = this.at(i - 1), y1 = this.at(i), y2 = this.at(i + 1), y3 = this.at(i + 2); const c1 = 0.5 * (y2 - y0), c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3, c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2); return ((c3 * f + c2) * f + c1) * f + y1; }
}
const HAD_K = new Map<number, number>(); // 1 / sqrt(N), computed once per size (the same double every call)
const hadamard = (h: Float64Array) => { const N = h.length; for (let s = 1; s < N; s <<= 1) for (let j = 0; j < N; j += s << 1) for (let q = j; q < j + s; q++) { const a = h[q], b = h[q + s]; h[q] = a + b; h[q + s] = a - b; } let k = HAD_K.get(N); if (k === undefined) { k = 1 / Math.sqrt(N); HAD_K.set(N, k); } for (let j = 0; j < N; j++) h[j] *= k; };

// ---------------------------------------------------------------- FDN
export const fdnReverb = (L: Float32Array, R: Float32Array, sr: number, s: Space, rng: Rng): Wet => {
  const n = L.length, [inL, inR] = sendFilter(L, R, sr, s), size = s.size ?? 0.6, pd = Math.round((s.predelayMs / 1000) * sr);
  const wL = new Float32Array(n), wR = new Float32Array(n), tL = new Float32Array(n), tR = new Float32Array(n);
  // diffuser: 4 steps x 8 channels, each step's delays random inside a range that halves each step
  const DC = 8, steps = 4, dif: { lines: Line[]; d: number[]; flip: number[] }[] = [];
  let range = (0.012 + 0.03 * size) * sr;
  for (let k = 0; k < steps; k++) { const d = Array.from({ length: DC }, (_, c) => Math.max(1, Math.round((range * (c + rng())) / DC))); dif.push({ lines: d.map((x) => new Line(x + 2)), d, flip: d.map(() => (rng() < 0.5 ? -1 : 1)) }); range /= 2; }
  // feedback network: 16 lines, 0.6-1.6 x base, base 45-110 ms by size
  const N = 16, base = (0.045 + 0.065 * size) * sr, lens = Array.from({ length: N }, (_, j) => Math.round(base * Math.pow(2, (j / N) * 1.3) * (0.92 + 0.16 * rng())));
  const lines = lens.map((l) => new Line(l + 64)), rate = lens.map(() => 0.1 + 0.9 * rng()), phase = lens.map(() => rng() * Math.PI * 2), depth = (s.mod ?? 1) * 0.0003 * sr;
  const rtH = s.rt60 * (s.highMult ?? 0.45), rtL = s.rt60 * (s.lowMult ?? 1.15);
  // per line: Jot's absorptive one-pole, DC gain from the low T60 and Nyquist gain from the high T60 (monotone, so always stable)
  const gDc = lens.map((l) => Math.pow(10, (-3 * l) / (sr * rtL))), gNy = lens.map((l) => Math.pow(10, (-3 * l) / (sr * rtH * 0.7)));
  const pa = lens.map((_, j) => (gDc[j] - gNy[j]) / (gDc[j] + gNy[j])), pb = lens.map((_, j) => gDc[j] * (1 - pa[j])), zf = new Float64Array(N);
  const x8 = new Float64Array(DC), fb = new Float64Array(N), out = new Float64Array(N), twoPi = Math.PI * 2;
  const erG = s.er * 0.75, lateG = s.late * 1.6; // calibrated: at late 0.3 the tail sits where the legacy hall's did (same input, -19.5 dB)
  const w = rate.map((r) => twoPi * r); // twoPi * rate[j], the same product the per-sample expression starts with
  for (let i = 0; i < n; i++) {
    const xl = i >= pd ? inL[i - pd] : 0, xr = i >= pd ? inR[i - pd] : 0;
    for (let c = 0; c < DC; c++) x8[c] = c % 2 ? xr : xl;
    for (let k = 0; k < steps; k++) { const st = dif[k], ln = st.lines, d = st.d, fl = st.flip; for (let c = 0; c < DC; c++) { ln[c].push(x8[c]); x8[c] = ln[c].at(d[c]) * fl[c]; } hadamard(x8); }
    // early: the diffuser output, alternate channels to each side
    const el = x8[0] - x8[2] + x8[4] - x8[6], er = x8[1] - x8[3] + x8[5] - x8[7], t = i / sr;
    for (let j = 0; j < N; j++) { const md = depth * Math.sin(w[j] * t + phase[j]); out[j] = lines[j].frac(lens[j] + md); }
    // Householder: y = x - 2/N sum(x)
    let sum = 0; for (let j = 0; j < N; j++) sum += out[j]; sum *= 2 / N;
    for (let j = 0; j < N; j++) {
      const v = out[j] - sum;
      zf[j] = pb[j] * v + pa[j] * zf[j]; fb[j] = zf[j];
      lines[j].push(fb[j] + x8[j % DC] * 0.5);
    }
    let ll = 0, rr = 0; for (let j = 0; j < N; j++) { const sg = (j >> 1) % 2 ? -1 : 1; if (j % 2) rr += out[j] * sg; else ll += out[j] * sg; }
    tL[i] = ll * lateG * 0.25; tR[i] = rr * lateG * 0.25;
    wL[i] = tL[i] + el * erG * 0.35; wR[i] = tR[i] + er * erG * 0.35;
  }
  return [wL, wR, tL, tR];
};

// ---------------------------------------------------------------- Dattorro plate
export const plateReverb = (L: Float32Array, R: Float32Array, sr: number, s: Space, rng: Rng): Wet => {
  const n = L.length, [inL, inR] = sendFilter(L, R, sr, s), k = sr / 29761, S = (x: number) => Math.max(1, Math.round(x * k * (0.6 + 0.8 * (s.size ?? 0.5))));
  const wL = new Float32Array(n), wR = new Float32Array(n), tL = new Float32Array(n), tR = new Float32Array(n), pd = Math.round((s.predelayMs / 1000) * sr);
  const bw = onePoleCoef(sr, s.lp * 0.9);
  const ap = (len: number) => ({ l: new Line(len + 40), len });
  const ind = [ap(S(142)), ap(S(107)), ap(S(379)), ap(S(277))], indG = [0.75, 0.75, 0.625, 0.625];
  const mA = ap(S(672)), dA = new Line(S(4453) + 4), aA2 = ap(S(1800)), dA2 = new Line(S(3720) + 4);
  const mB = ap(S(908)), dB = new Line(S(4217) + 4), aB2 = ap(S(2656)), dB2 = new Line(S(3163) + 4);
  const lA = S(4453), lA2 = S(3720), lB = S(4217), lB2 = S(3163);
  const half = (S(672) + lA + S(1800) + lA2) / sr, decay = Math.min(0.97, Math.pow(10, (-3 * half) / s.rt60));
  const dampF = onePoleCoef(sr, Math.min(sr * 0.45, 2500 + 6000 * (s.highMult ?? 0.5))), exc = 16 * k * (s.mod ?? 1), rA = 0.5 + 0.4 * rng(), rB = 0.6 + 0.4 * rng();
  let bwz = 0, zA = 0, zB = 0, fbA = 0, fbB = 0;
  const apTick = (a: { l: Line; len: number }, x: number, g: number, d = a.len) => { const z = d === a.len ? a.l.at(a.len - 1) : a.l.frac(d - 1); const v = x - g * z; a.l.push(v); return z + g * v; };
  const tap = (l: Line, d: number) => l.at(Math.max(0, S(d) - 1));
  const tapAp = (a: { l: Line }, d: number) => a.l.at(Math.max(0, S(d) - 1));
  for (let i = 0; i < n; i++) {
    const x = i >= pd ? 0.5 * (inL[i - pd] + inR[i - pd]) : 0;
    bwz += bw * (x - bwz); let v = bwz;
    for (let j = 0; j < 4; j++) v = apTick(ind[j], v, indG[j]);
    const t = i / sr;
    // branch A
    let a = apTick(mA, v + fbB * decay, -0.7, mA.len + exc * Math.sin(2 * Math.PI * rA * t)); dA.push(a); a = dA.at(lA - 1);
    zA += dampF * (a - zA); a = zA * decay; a = apTick(aA2, a, 0.5); dA2.push(a); const outA = dA2.at(lA2 - 1);
    // branch B
    let b = apTick(mB, v + fbA * decay, -0.7, mB.len + exc * Math.sin(2 * Math.PI * rB * t + 1.3)); dB.push(b); b = dB.at(lB - 1);
    zB += dampF * (b - zB); b = zB * decay; b = apTick(aB2, b, 0.5); dB2.push(b); const outB = dB2.at(lB2 - 1);
    fbA = outA; fbB = outB;
    const yl = tap(dB, 266) + tap(dB, 2974) - tapAp(aB2, 1913) + tap(dB2, 1996) - tap(dA, 1990) - tapAp(aA2, 187) - tap(dA2, 1066);
    const yr = tap(dA, 353) + tap(dA, 3627) - tapAp(aA2, 1228) + tap(dA2, 2673) - tap(dB, 2111) - tapAp(aB2, 335) - tap(dB2, 121);
    tL[i] = yl * 0.62 * s.late; tR[i] = yr * 0.62 * s.late; wL[i] = tL[i]; wR[i] = tR[i];
  }
  return [wL, wR, tL, tR];
};

// ---------------------------------------------------------------- synthesized IR + convolution
/** A stereo IR: [er L, er R, late L, late R], each normalized so the late tail has unit energy per channel. */
export const synthIR = (sr: number, s: Space, rng: Rng) => {
  const len = Math.min(Math.round(Math.max(0.3, s.rt60 * 1.25) * sr), Math.round(8 * sr)), size = s.size ?? 0.6;
  const erL = new Float32Array(len), erR = new Float32Array(len), lL = new Float32Array(len), lR = new Float32Array(len);
  // sparse early reflections, 4-60 ms scaled by size, falling gain, random sign, each side its own pattern
  const nEr = 10, erEnd = (0.02 + 0.045 * size) * sr;
  for (const [buf, off] of [[erL, 0], [erR, 0.3]] as const) for (let t = 0; t < nEr; t++) { const d = Math.round(0.004 * sr + erEnd * Math.pow((t + rng() * 0.8 + off) / nEr, 1.4)); if (d < len) buf[d] += (rng() < 0.5 ? -1 : 1) * Math.pow(0.82, t) * (0.6 + 0.4 * rng()); }
  // late: 8 octave bands (63 Hz .. 8 kHz), per band T60, onset fade over 20 ms from the end of the early part
  const bands = [63, 125, 250, 500, 1000, 2000, 4000, 8000], fadeA = Math.round(0.006 * sr + erEnd * 0.4), fade = Math.round(0.02 * sr);
  const t60 = (f: number) => s.rt60 * (f <= 250 ? (s.lowMult ?? 1.15) : f >= 4000 ? (s.highMult ?? 0.5) * (f >= 8000 ? 0.75 : 1) : f >= 2000 ? 0.5 + 0.5 * (s.highMult ?? 0.5) : 1);
  for (const [buf] of [[lL], [lR]] as const) {
    for (const f of bands) {
      if (f > sr * 0.45) continue;
      const noise = new Float32Array(len); for (let i = 0; i < len; i++) noise[i] = gauss(rng);
      const q = 1.2; Biquad.make(sr, "bp", f, q).run(noise); Biquad.make(sr, "bp", f, q).run(noise);
      const tau = t60(f) / 6.91; // exp(-t/tau) reaches -60 dB at T60
      for (let i = 0; i < len; i++) { const env = i < fadeA ? 0 : i < fadeA + fade ? (i - fadeA) / fade : 1; buf[i] += noise[i] * env * Math.exp(-i / sr / tau); }
    }
  }
  const norm = (a: Float32Array, b: Float32Array) => { let e = 0; for (let i = 0; i < len; i++) e += a[i] * a[i] + b[i] * b[i]; const g = e > 0 ? Math.sqrt(2 / e) : 0; for (let i = 0; i < len; i++) { a[i] *= g; b[i] *= g; } };
  norm(lL, lR); norm(erL, erR);
  return { erL, erR, lL, lR, len };
};
/** Linear convolution of x with h by FFT overlap-add (block = the FFT size minus the IR). */
export const convolve = (x: Float32Array, h: Float32Array, out: Float32Array, gain = 1) => {
  const n = x.length, m = h.length; let N = 1; while (N < 2 * m) N <<= 1; N = Math.max(N, 1 << 15); const B = N - m + 1;
  const Hr = new Float64Array(N), Hi = new Float64Array(N); Hr.set(h); fft(Hr, Hi);
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let a = 0; a < n; a += B) {
    re.fill(0); im.fill(0); let any = false;
    for (let i = 0; i < B && a + i < n; i++) { re[i] = x[a + i]; if (x[a + i] !== 0) any = true; }
    if (!any) continue;
    fft(re, im);
    for (let k = 0; k < N; k++) { const r = re[k] * Hr[k] - im[k] * Hi[k], ii = re[k] * Hi[k] + im[k] * Hr[k]; re[k] = r; im[k] = -ii; } // conjugate for the inverse via forward fft
    fft(re, im);
    for (let i = 0; i < N && a + i < out.length; i++) out[a + i] += (re[i] / N) * gain;
  }
};
export const convReverb = (L: Float32Array, R: Float32Array, sr: number, s: Space, rng: Rng): Wet => {
  const n = L.length, [inL, inR] = sendFilter(L, R, sr, s), ir = synthIR(sr, s, rng), pd = Math.round((s.predelayMs / 1000) * sr);
  const xL = new Float32Array(n), xR = new Float32Array(n); for (let i = pd; i < n; i++) { xL[i] = inL[i - pd]; xR[i] = inR[i - pd]; }
  const wL = new Float32Array(n), wR = new Float32Array(n), tL = new Float32Array(n), tR = new Float32Array(n), eL = new Float32Array(n), eR = new Float32Array(n);
  // true stereo: L feeds both sides through decorrelated responses (the cross path 6 dB down)
  const lateG = s.late * 0.36, erG = s.er * 0.51; // calibrated against the legacy room (see fdn)
  convolve(xL, ir.lL, tL, lateG); convolve(xR, ir.lR, tR, lateG); convolve(xR, ir.lL, tL, lateG * 0.5); convolve(xL, ir.lR, tR, lateG * 0.5);
  convolve(xL, ir.erL, eL, erG); convolve(xR, ir.erR, eR, erG);
  for (let i = 0; i < n; i++) { wL[i] = tL[i] + eL[i]; wR[i] = tR[i] + eR[i]; }
  return [wL, wR, tL, tR];
};

const recordedReverb = (L: Float32Array, R: Float32Array, sr: number, s: Space, room: RecordedRoom): Wet => {
  const n = L.length, [a, b] = sendFilter(L, R, sr, s), pd = Math.round(s.predelayMs * sr / 1000), xL = new Float32Array(n), xR = new Float32Array(n);
  for (let i = pd; i < n; i++) { xL[i] = a[i - pd]; xR[i] = b[i - pd]; }
  const rate = 48000 / sr, len = Math.ceil(room.L.length / rate), split = Math.round(0.04 * sr), direct = Math.round((room.directFrames ?? 0) / rate);
  const responses = [room.L, room.R].map((src) => {
    const pcm = Float32Array.from(src); if (rate > 1) for (let j = 0; j < 2; j++) Biquad.make(48000, "lp", sr * 0.45, 0.7071).run(pcm);
    const early = new Float32Array(len), late = new Float32Array(len);
    for (let i = direct; i < len; i++) { const x = i * rate, j = Math.floor(x), f = x - j; (i < split ? early : late)[i] = (pcm[j] + f * ((pcm[j + 1] ?? 0) - pcm[j])) * rate; }
    return { early, late };
  });
  // synthIR normalizes each stereo component to total energy 2, preserving channel balance.
  for (const key of ['early', 'late'] as const) {
    const a = responses[0][key], b = responses[1][key]; let e = 0;
    for (let i = 0; i < len; i++) e += a[i] * a[i] + b[i] * b[i];
    const g = e > 0 ? Math.sqrt(2 / e) : 0;
    for (let i = 0; i < len; i++) { a[i] *= g; b[i] *= g; }
  }
  const wL = new Float32Array(n), wR = new Float32Array(n), tL = new Float32Array(n), tR = new Float32Array(n);
  convolve(xL, responses[0].late, tL, s.late * 0.36); convolve(xR, responses[1].late, tR, s.late * 0.36);
  convolve(xR, responses[0].late, tL, s.late * 0.18); convolve(xL, responses[1].late, tR, s.late * 0.18);
  convolve(xL, responses[0].early, wL, s.er * 0.51); convolve(xR, responses[1].early, wR, s.er * 0.51);
  for (let i = 0; i < n; i++) { wL[i] += tL[i]; wR[i] += tR[i]; }
  return [wL, wR, tL, tR];
};
export const reverb = (L: Float32Array, R: Float32Array, sr: number, s: Space, rng: Rng): Wet => {
  const r = roomFor(s.room); if (r) return recordedReverb(L, R, sr, s, r);
  return s.kind === "plate" ? plateReverb(L, R, sr, s, rng) : s.kind === "conv" ? convReverb(L, R, sr, s, rng) : fdnReverb(L, R, sr, s, rng);
};

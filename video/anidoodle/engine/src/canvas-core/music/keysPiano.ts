// Piano v2: a modal piano whose spectrum, inharmonicity and decays are MEASURED (keysTables.ts,
// fitted from the CC0 VCSL Steinway B) instead of guessed. Every sample is still synthesized.
//
//   strings     f_n = n f0 sqrt(1 + B n^2), B per key from the Steinway fit (1.3e-4 in the bass,
//               3.5e-4 at C4, 1.2e-3 at C5, 1.1e-2 at C7), stretched octaves (Railsback)
//   hammer      the attack spectrum per key AND per velocity is the measured envelope (p/mf/ff layers,
//               interpolated), so a harder blow is brighter the way a Steinway is; the strike point
//               (~1/8.5 of the string, per key) notches its own partials; contact time 0.7-4 ms
//   unisons     1-3 strings per key, detuned 0.3-2 c: a fast "prompt" decay and a slow, beating
//               "aftersound", both T60s and the aftersound level fitted per register
//   phantoms    longitudinal sum partials in the bass (f_i + f_j, -34 dB, louder at ff)
//   body        a dense soundboard (hundreds of modes, 60 Hz-7 kHz, T60 40-350 ms) rung by each hammer
//               blow, plus the key/keybed thump and the hammer's contact noise; all seeded per note
//   dampers     felt lands on key-up (or pedal-up): fast decay by register + felt noise + key-return tick
//   pedal       dampers off; strings whose partials coincide ring in sympathy; damper-lift whoosh and
//               pedal-up thud; the pedal halo feeds the room
//   anti-clone  per note: phase jitter, +-0.6 dB, +-5 % brightness, +-6 % decay, micro-detune of the unisons,
//               round-robin noises. Same seed = same samples.
// Variants (opts.variant): grand (default), felt (felt strip between hammer and string: dark, soft,
// close and noisy), upright (shorter strings: more inharmonic, shorter sustain, boxy mids),
// honky (upright with unisons 6-14 c apart, bright hammers).
import { TAU, clamp, pan, SVF, gauss } from "./dsp";
import { rng as mkRng } from "../core";
import type { KeyPress, PedalSpan } from "./piano";
import { GRAND_ENV, GRAND_LAYER_V, GRAND_DECAY, PIANO_BANDS } from "./keysTables";
import { partial, noiseBurst, dbA, strikeCounter, type Opts } from "./keysCore";

export type PianoVariant = "grand" | "felt" | "upright" | "honky";
type Voicing = { noiseHz: number; bMul: number; promptMul: number; afterMul: number; detuneC: [number, number]; tilt: (f: number, v: number) => number; contactMs: (v: number) => number; knock: number; noise: number; board: number; width: number; level: number };

const LOG_BANDS = PIANO_BANDS.map(Math.log);
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
const interpBands = (row: number[], f: number) => {
  const lf = Math.log(f);
  if (lf <= LOG_BANDS[0]) return row[0];
  for (let i = 1; i < LOG_BANDS.length; i++) if (lf <= LOG_BANDS[i]) return lerp(row[i - 1], row[i], (lf - LOG_BANDS[i - 1]) / (LOG_BANDS[i] - LOG_BANDS[i - 1]));
  return row[row.length - 1] - 24 * Math.log2(f / PIANO_BANDS[PIANO_BANDS.length - 1]);
};
/** One measured row's envelope at velocity v (layers interpolated; extrapolated gently past p and ff). */
const rowAtV = (layers: Record<number, number[]>, v: number) => {
  const ks = Object.keys(layers).map(Number).sort(), vs = ks.map((k) => GRAND_LAYER_V[k]);
  const at = (i: number) => layers[ks[i]];
  const out: number[] = [];
  for (let b = 0; b < PIANO_BANDS.length; b++) {
    let y: number;
    if (v <= vs[0]) { const lo = at(0)[b], hi = at(ks.length - 1)[b], slope = (hi - lo) / (vs[vs.length - 1] - vs[0]); y = lo - Math.min(22, slope * (vs[0] - v) * 0.9); }
    else if (v >= vs[vs.length - 1]) { const lo = at(0)[b], hi = at(ks.length - 1)[b], slope = (hi - lo) / (vs[vs.length - 1] - vs[0]); y = hi + Math.min(6, slope * (v - vs[vs.length - 1]) * 0.5); }
    else { let i = 0; while (v > vs[i + 1]) i++; y = lerp(at(i)[b], at(i + 1)[b], (v - vs[i]) / (vs[i + 1] - vs[i])); }
    out.push(Math.min(0, y));
  }
  return out;
};
/** Envelope bands for key m at velocity v, interpolated between the measured keys. */
const envBands = (m: number, v: number) => {
  const T = GRAND_ENV;
  if (m <= T[0][0]) return rowAtV(T[0][2], v);
  if (m >= T[T.length - 1][0]) return rowAtV(T[T.length - 1][2], v);
  let i = 0; while (m > T[i + 1][0]) i++;
  const a = rowAtV(T[i][2], v), b = rowAtV(T[i + 1][2], v), x = (m - T[i][0]) / (T[i + 1][0] - T[i][0]);
  return a.map((y, j) => lerp(y, b[j], x));
};
const tableAt = (m: number, col: number, T: number[][]) => {
  if (m <= T[0][0]) return T[0][col];
  if (m >= T[T.length - 1][0]) return T[T.length - 1][col];
  let i = 0; while (m > T[i + 1][0]) i++;
  const x = (m - T[i][0]) / (T[i + 1][0] - T[i][0]);
  return col === 3 ? lerp(T[i][col], T[i + 1][col], x) : Math.exp(lerp(Math.log(T[i][col]), Math.log(T[i + 1][col]), x));
};
/** Inharmonicity by key: the Steinway fit, log-interpolated. */
export const measuredB = (m: number) => {
  const T = GRAND_ENV;
  if (m <= T[0][0]) return T[0][1];
  if (m >= T[T.length - 1][0]) return T[T.length - 1][1] * Math.pow(2, (m - T[T.length - 1][0]) / 12 * 1.1);
  let i = 0; while (m > T[i + 1][0]) i++;
  const x = (m - T[i][0]) / (T[i + 1][0] - T[i][0]);
  return Math.exp(lerp(Math.log(T[i][1]), Math.log(T[i + 1][1]), x));
};

const VOICINGS: Record<PianoVariant, Voicing> = {
  grand: { noiseHz: 2200, bMul: 1, promptMul: 1, afterMul: 1, detuneC: [0.3, 1.8], tilt: () => 0, contactMs: (v) => 4.2 - 3.3 * v, knock: 1, noise: 1, board: 1, width: 0.55, level: 1 },
  // felt strip: the felt eats the hammer's highs (-12 dB/oct above ~0.6-1.4 kHz), a soft, slow contact, and the
  // mechanism right in the microphone
  felt: { noiseHz: 650, bMul: 1, promptMul: 0.9, afterMul: 0.85, detuneC: [0.3, 1.6], tilt: (f, v) => -12 * Math.max(0, Math.log2(f / (600 + 800 * v))), contactMs: (v) => 8 - 3 * v, knock: 2.6, noise: 3.2, board: 1.2, width: 0.35, level: 1.25 },
  // shorter, stiffer strings on a smaller board: more inharmonic, less bass, a boxy 1-2 kHz, a shorter ring
  upright: { noiseHz: 1800, bMul: 1.8, promptMul: 0.75, afterMul: 0.5, detuneC: [0.8, 3], tilt: (f) => -6 * Math.max(0, Math.log2(110 / f)) + 3 * Math.exp(-Math.pow(Math.log2(f / 1400), 2) * 2), contactMs: (v) => 3.4 - 2.6 * v, knock: 1.4, noise: 1.4, board: 1.5, width: 0.3, level: 1.1 },
  honky: { noiseHz: 2600, bMul: 2, promptMul: 0.7, afterMul: 0.45, detuneC: [6, 14], tilt: (f) => -6 * Math.max(0, Math.log2(110 / f)) + 4 * Math.exp(-Math.pow(Math.log2(f / 2000), 2) * 1.5), contactMs: (v) => 2.2 - 1.6 * v, knock: 1.6, noise: 1.5, board: 1.5, width: 0.3, level: 1.05 },
};

const stretchCents = (m: number) => (m > 60 ? 0.012 * Math.pow(m - 60, 1.9) : -0.02 * Math.pow(60 - m, 1.6));
const nStrings = (m: number) => (m < 29 ? 1 : m < 41 ? 2 : 3);
export const pianoVelocity = (v: number) => v < 0.6 ? Math.pow(v, 1.55) : Math.pow(0.6, 1.55) * Math.pow(v / 0.6, 0.9);
/** Register trim (dB): matches the legacy piano's listened register balance (tools/keys-demo.mjs + a C1-C8 probe at mf, first second RMS), smoothed. */
const REG_TRIM = [[21, -0.9], [28, -1.1], [36, -1.6], [44, 2.1], [52, 4.8], [60, 4.7], [68, 6.9], [76, 7.8], [84, 7.0], [92, 6.9], [100, 5.0], [108, 4.0]];
const regTrim = (m: number) => { if (m <= 21) return REG_TRIM[0][1]; for (let i = 1; i < REG_TRIM.length; i++) if (m <= REG_TRIM[i][0]) return lerp(REG_TRIM[i - 1][1], REG_TRIM[i][1], (m - REG_TRIM[i - 1][0]) / (REG_TRIM[i][0] - REG_TRIM[i - 1][0])); return REG_TRIM[REG_TRIM.length - 1][1]; };

/** The soundboard: a dense modal impulse response (seeded per instrument), rung by every hammer blow. */
const boardIR = (sr: number, seed: number, soft: boolean) => {
  const r = mkRng(seed * 977 + (soft ? 5 : 3)), len = Math.round(0.35 * sr), ir = new Float64Array(len);
  const N = 420;
  for (let k = 0; k < N; k++) {
    const u = (k + r()) / N, f = 60 * Math.pow(7000 / 60, Math.pow(u, 0.8)); // denser towards the top (modal density rises with f)
    const t60 = clamp(0.35 * Math.pow(120 / f, 0.5) * (0.6 + 0.8 * r()), 0.04, 0.35), sig = 6.91 / t60;
    const a = ((r() < 0.5 ? -1 : 1) * (0.4 + r())) / Math.sqrt(1 + Math.pow(f / (soft ? 900 : 2600), 2)) / Math.pow(f / 200, 0.25);
    const w = (TAU * f) / sr, cw = Math.cos(w), sw = Math.sin(w), d = Math.exp(-sig / sr);
    let c = 0, s = a, end = Math.min(len, Math.ceil((t60 * 1.2) * sr));
    for (let i = 0; i < end; i++) { ir[i] += c; const c2 = (c * cw - s * sw) * d; s = (c * sw + s * cw) * d; c = c2; }
  }
  let pk = 1e-9; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(ir[i]));
  for (let i = 0; i < len; i++) ir[i] /= pk;
  return ir;
};

export const renderPianoV2 = (keys: KeyPress[], pedal: PedalSpan[], sr: number, n: number, opts: Opts, seed: number) => {
  const variant = (["grand", "felt", "upright", "honky"].includes(String(opts.variant)) ? opts.variant : "grand") as PianoVariant;
  const V = VOICINGS[variant], width = typeof opts.width === "number" ? (opts.width as number) : V.width;
  const L = new Float32Array(n), R = new Float32Array(n), halo = new Float32Array(n);
  const usePedal = opts.pedal !== false;
  const pedalAt = (t: number) => usePedal && pedal.some(([a, b]) => t >= a && t < b);
  const pedalUpAfter = (t: number) => { for (const [a, b] of pedal) if (t >= a && t < b) return b; return t; };
  const sorted = keys.slice().sort((a, b) => a.t - b.t || a.p - b.p);
  const maxLen = Math.min(n, Math.ceil(40 * sr));
  const buf = new Float64Array(maxLen), mech = new Float64Array(Math.ceil(0.5 * sr));
  const irHard = boardIR(sr, seed, false), irSoft = boardIR(sr, seed, true);
  const nyq = Math.min(0.45 * sr, 16000), strike = strikeCounter();

  sorted.forEach((k, idx) => {
    const m = k.p, v = clamp(k.v, 0.02, 1), i0 = Math.round(k.t * sr); if (i0 >= n) return;
    const keyR = mkRng(m * 7919 + seed * 13 + 1); // per-KEY constants (tuning, strike point): the same key keeps its strings
    const nr = mkRng((seed * 104729 + idx * 7919 + m * 31 + Math.round(k.t * 1e3)) >>> 0); // per-NOTE variation
    const g = () => clamp(gauss(nr), -2.5, 2.5), sk = strike(m), seq = 2 * ((((m * 0.1234 + seed * 0.577) % 1) + (sk + 1) * 0.6180339887) % 1) - 1;
    const f0 = 440 * Math.pow(2, (m - 69) / 12 + stretchCents(m) / 1200);
    const B = measuredB(m) * V.bMul, S = nStrings(m);
    const [d0, d1] = V.detuneC, spread = d0 + (d1 - d0) * keyR();
    const detune = Array.from({ length: S }, (_, s) => (S === 1 ? 0 : ((s - (S - 1) / 2) / ((S - 1) / 2)) * spread * 0.5 + (seq * 0.25 + g() * 0.05) * (s - (S - 1) / 2)) / 1200 * Math.LN2);
    const beta = 1 / (8.2 + 1.2 * keyR()) + (m > 80 ? -0.015 * (m - 80) / 28 : 0);
    const brightV = clamp(v * (1 + g() * 0.05), 0.02, 1);
    const bands = envBands(m, brightV);
    const decVar = 1 + g() * 0.06, gainVar = dbA(g() * 0.6);
    const t60p = tableAt(m, 1, GRAND_DECAY) * V.promptMul * decVar, t60a = tableAt(m, 2, GRAND_DECAY) * V.afterMul * decVar, a0 = tableAt(m, 3, GRAND_DECAY);
    const sigP0 = 6.91 / t60p, sigA0 = 6.91 / t60a, wa = dbA(a0);
    // when does the felt land?
    let damp = pedalAt(k.off) ? pedalUpAfter(k.off) : k.off;
    if (m >= 89 && variant !== "upright" && variant !== "honky") damp = Infinity; // no dampers on the top keys of a grand
    for (let j = idx + 1; j < sorted.length; j++) if (sorted[j].p === m && sorted[j].t > k.t) { damp = Math.min(damp, sorted[j].t + 0.004); break; }
    const tDamp = (variant === "upright" || variant === "honky" ? 0.12 : 0.08) + 0.45 * clamp((60 - m) / 36, 0, 1), sigD = 6.91 / tDamp;
    const dampI = damp === Infinity ? Infinity : Math.round((damp - k.t) * sr);
    const natural = Math.round(Math.min(t60a * 1.1, 40) * sr);
    const len = Math.min(maxLen, n - i0, dampI === Infinity ? natural : Math.min(natural, dampI + Math.round(tDamp * 1.6 * sr) + 1));
    if (len <= 0) return;
    buf.fill(0, 0, len);
    const nb = buf.subarray(0, len);
    // loudness law (felt hardening above mf: a faster hammer buys brightness more than level)
    const loud = pianoVelocity(v);
    // tension modulation: a big swing stretches the string, so the loud prompt sound sits a hair sharp (strike to strike it differs)
    const tension = Math.pow(2, ((0.5 + 0.35 * seq) * v * v * 1.4 * clamp(Math.pow(262 / f0, 0.3), 0.6, 1.6)) / 1200);
    const amps: number[] = [], freqs: number[] = [];
    let aMax = 1e-9;
    for (let p = 1; p <= 80; p++) {
      const fn = p * f0 * Math.sqrt(1 + B * p * p); if (fn > nyq) break;
      const comb = 0.3 + 0.7 * Math.abs(Math.sin(Math.PI * p * beta)); // the table is the upper envelope (notches smoothed out), so the strike comb only carves partway
      const db = interpBands(bands, fn) + V.tilt(fn, v);
      const A = dbA(db) * (p > 4 ? comb : 0.5 + 0.5 * comb);
      amps.push(A); freqs.push(fn); if (A > aMax) aMax = A;
    }
    for (let q = 0; q < amps.length; q++) {
      const A = amps[q] / aMax, fn = freqs[q]; if (A < 3e-5) continue;
      const floorRel = clamp(3e-5 / A, 1e-4, 0.3);
      const sp = sigP0 * (1 + fn / 1500), sa = sigA0 * (1 + fn / 4000); // fitted: the prompt sound's loss climbs ~1x per 1.5 kHz, the aftersound's barely
      const ph = g() * 0.2 + seq * 0.3; // sine start: the string is at rest when the hammer lands; jitter = no two strikes alike
      const waP = clamp(wa * dbA(-4 * Math.max(0, Math.log2(fn / 2000))) * (1 + 0.3 * g()), 0.003, 0.5); // fitted: upper partials keep a -25..-33 dB aftersound
      partial(nb, 0, fn * tension, A * (1 - waP), sp, ph, sr, dampI, sigD, floorRel);
      if (S > 1 && q < 16) for (let s = 0; s < S; s++) partial(nb, 0, fn * Math.exp(detune[s]), (A * waP) / S, sa * (1 + 0.04 * s), ph + 0.9 * g(), sr, dampI, sigD, floorRel); // the aftersound grows out of phase (and a restrike lands on moving strings)
      else if (S > 1) { partial(nb, 0, fn * Math.exp(detune[0]), (A * waP) / 2, sa, ph, sr, dampI, sigD, floorRel); partial(nb, 0, fn * Math.exp(detune[S - 1]), (A * waP) / 2, sa * 1.05, ph, sr, dampI, sigD, floorRel); }
      else { partial(nb, 0, fn, (A * waP) * 0.6, sa, ph, sr, dampI, sigD, floorRel); partial(nb, 0, fn * Math.pow(2, 0.12 / 1200), (A * waP) * 0.4, sa * 1.1, ph, sr, dampI, sigD, floorRel); } // two polarisations
    }
    // phantom partials: longitudinal string motion, sum frequencies of low transverse pairs (bass and tenor)
    if (m < 64) for (let a = 1; a <= 5; a++) for (let b = a; b <= 6; b++) {
      if (a - 1 >= freqs.length || b - 1 >= freqs.length) continue;
      const f = freqs[a - 1] + freqs[b - 1]; if (f > nyq) continue;
      const A = Math.sqrt((amps[a - 1] / aMax) * (amps[b - 1] / aMax)) * dbA(-36 + 10 * v) * (1 - (m - 21) / 50);
      partial(nb, 0, f, A, sigP0 * (1 + f / 1500) * 1.3, g() * 0.3, sr, dampI, sigD, 1e-3);
    }
    // hammer contact: a raised-cosine ramp over the contact time (a gentle low-pass on the attack alone)
    const ramp = Math.max(2, Math.round((V.contactMs(v) * Math.pow(262 / f0, 0.15) * (1 + g() * 0.05)) / 1000 * sr));
    for (let i = 0; i < ramp && i < len; i++) buf[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / ramp);
    const norm = 0.2 * loud * gainVar * V.level * dbA(regTrim(m) - 8 * Math.max(0, 0.6 - v)); // below mf the measured (darker) spectrum alone under-drops the level: the listened legacy dynamic range
    // mechanism: keybed thump, hammer contact noise, soundboard knock (round-robin: each strike its own noise and gains)
    const ml = Math.min(mech.length, len); mech.fill(0);
    const thumpF = 70 + 40 * nr(), thumpW = (TAU * thumpF) / sr;
    for (let i = 0; i < Math.min(ml, Math.round(0.05 * sr)); i++) mech[i] += Math.sin(thumpW * i) * Math.exp(-i / (0.014 * sr)) * 0.012 * V.knock * Math.pow(v, 1.3);
    noiseBurst(mech, 0, Math.round((0.0015 + 0.0015 * (1 - v)) * sr), V.noiseHz * (1 + 0.9 * v), 0.7, 0.02 * V.noise * v * v, nr, sr);
    const bw = 0.05 * V.board * Math.pow(v, 1.2) * (0.8 + 0.4 * nr()) * (m < 48 ? 1.4 : m > 84 ? 0.7 : 1), hard = clamp(v * v, 0, 1), sh = Math.round(nr() * 40);
    for (let i = 0; i < ml && i + sh < irHard.length; i++) mech[i] += (irHard[i + sh] * hard + irSoft[i + sh] * (1 - hard)) * bw * Math.min(1, i / 24);
    for (let i = 0; i < ml; i++) buf[i] += mech[i];
    // felt landing on the strings, and the key coming back up (the tick is heard even under the pedal)
    if (dampI !== Infinity && dampI < len) {
      const sv = new SVF(sr, 420 + 200 * nr(), 0.7), dl = Math.min(len - dampI, Math.round(0.08 * sr));
      for (let i = 0; i < dl; i++) buf[dampI + i] += sv.tick(gauss(nr)) * Math.sin((Math.PI * i) / dl) * 0.004 * V.noise * v;
    }
    const upI = Math.round((k.off - k.t) * sr);
    if (upI > 0 && upI < len) noiseBurst(nb, upI, Math.round(0.012 * sr), 900 + 500 * nr(), 1.2, 0.0025 * V.noise * (0.4 + v), nr, sr);
    // stereo: bass left, treble right (the player's seat) + a sub-ms time offset by key position (spaced pair)
    const [gl, gr] = pan(clamp((m - 62) / 34, -1, 1) * width), itd = Math.round(((m - 64) / 44) * 0.00025 * sr);
    const inPedal = pedalAt(k.t) || pedalAt(k.t + 0.25);
    for (let i = 0; i < len; i++) {
      const s = buf[i] * norm, j = i0 + i;
      const jl = j + Math.max(0, itd), jr = j + Math.max(0, -itd);
      if (jl < n) L[jl] += s * gl; if (jr < n) R[jr] += s * gr;
      if (inPedal) halo[j] += s;
    }
    // sympathetic strings: open strings (pedal down) whose partials coincide with this note's ring
    if (usePedal && inPedal) {
      const up = pedalUpAfter(k.t + 0.25), endI = Math.min(n - i0, Math.round((up - k.t) * sr) + Math.round(0.3 * sr), Math.round(10 * sr));
      for (const [off, hg, hn, cpl] of [[-12, 2, 1, 0.07], [-19, 3, 1, 0.05], [-24, 4, 1, 0.035], [-28, 5, 1, 0.02], [12, 1, 2, 0.05], [19, 1, 3, 0.03], [7, 2, 3, 0.03], [24, 1, 4, 0.02]] as const) {
        const gm = m + off; if (gm < 21 || gm > 108) continue;
        const gf0 = 440 * Math.pow(2, (gm - 69) / 12 + stretchCents(gm) / 1200), gB = measuredB(gm) * V.bMul;
        const f = hg * gf0 * Math.sqrt(1 + gB * hg * hg), noteP = hn * f0 * Math.sqrt(1 + B * hn * hn);
        if (Math.abs(f - noteP) / noteP > 0.004) continue;
        const sig = (6.91 / (tableAt(gm, 2, GRAND_DECAY) * V.afterMul)) * (1 + f / 1500), dec = Math.exp(-sig / sr), decD = Math.exp(-(sig + 25) / sr);
        const [pl, pr] = pan(clamp((gm - 62) / 34, -1, 1) * width), amp = 0.2 * loud * cpl * (hn === 1 ? 1 : 0.5) * gainVar, w = (TAU * f) / sr, rise = Math.exp(-1 / (0.18 * sr));
        let e = 1, gg = 1, c = 1, sn = 0; const cw = Math.cos(w), sw = Math.sin(w), dampStart = Math.round((up - k.t) * sr);
        for (let i = 0; i < endI; i++) { const env = 1 - (e *= rise), o = sn * amp * env * gg; L[i0 + i] += o * pl; R[i0 + i] += o * pr; halo[i0 + i] += o; gg *= i < dampStart ? dec : decD; const c2 = c * cw - sn * sw; sn = c * sw + sn * cw; c = c2; }
      }
    }
  });
  // pedal mechanics: dampers lifting (a soft whoosh of freed strings) and landing (a felt thud)
  if (usePedal && sorted.length && opts.pedalNoise !== false) {
    const pr = mkRng(seed * 31 + 9), tmp = new Float64Array(Math.round(0.2 * sr));
    const lastT = sorted[sorted.length - 1].off + 4;
    for (const [a, b] of pedal) {
      if (a > lastT) continue;
      for (const [t, fc, lenS, gain] of [[a, 700, 0.16, 0.0012], [b, 260, 0.06, 0.0018]] as const) {
        const i0 = Math.round(t * sr); if (i0 >= n || i0 < 0) continue;
        tmp.fill(0); noiseBurst(tmp, 0, Math.round(lenS * sr), fc * (0.8 + 0.4 * pr()), 0.8, gain * V.noise, pr, sr);
        for (let i = 0; i < tmp.length && i0 + i < n; i++) { L[i0 + i] += tmp[i] * 0.9; R[i0 + i] += tmp[i]; }
      }
    }
  }
  return { L, R, halo };
};

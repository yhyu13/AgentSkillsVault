// ORCHESTRA AND BAND VOICES, added for breadth (orchestral, choral, suspense, rock, synthwave,
// world). Procedural approximations, deterministic, pure in (keys, sr, n, opts, rng). Acoustic
// timbres made this way are approximations: a human listens before one carries a film (spec 08
// DECISION B). Each voice states the physics it borrows.
import { type Rng, TAU, clamp, pan, SVF, blep, gauss } from "./dsp";
import type { Played } from "./perform";
import * as E from "./ensemble";
import { timpani as kitTimpani } from "./drums";

type Out = { L: Float32Array; R: Float32Array };
type Opts = Record<string, number | boolean | string>;
const num = (o: Opts, k: string, d: number) => (typeof o[k] === "number" ? (o[k] as number) : d);
const f0 = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const out0 = (n: number): Out => ({ L: new Float32Array(n), R: new Float32Array(n) });
const byPitch = (p: number, w: number) => pan(clamp((p - 60) / 30, -1, 1) * w);
/** attack / sustain / release envelope for a held key */
const asr = (t: number, dur: number, atk: number, rel: number) => (t < dur ? Math.min(1, t / atk) : Math.min(1, dur / atk) * Math.exp(-(t - dur) / (rel / 4)));

/** Pipe organ: drawbar ranks (harmonics 1 2 3 4 6 8) summed per pipe, two detuned copies (chorus), a slow tremulant. `bright` weights the upper ranks. */
export const organ = (keys: Played[], sr: number, n: number, o: Opts): Out => {
  const out = out0(n), bright = num(o, "bright", 1), trem = num(o, "trem", 5.5), ranks = [[1, 1], [2, 0.7], [3, 0.35 * bright], [4, 0.35 * bright], [6, 0.18 * bright], [8, 0.12 * bright]];
  for (const k of keys) {
    const f = f0(k.p), i0 = Math.round(k.t * sr), dur = k.off - k.t, len = Math.min(n - i0, Math.ceil((dur + 0.15) * sr)), [gl, gr] = byPitch(k.p, 0.5);
    for (let i = 0; i < len; i++) { const t = i / sr, e = asr(t, dur, 0.015, 0.08) * k.v * 0.09 * (1 + 0.06 * Math.sin(TAU * trem * t));
      let s = 0; for (const [h, a] of ranks) if (f * h < sr / 2.2) s += a * (Math.sin(TAU * f * h * t) + Math.sin(TAU * f * h * 1.0012 * t + 1.3)) * 0.5;
      out.L[i0 + i] += s * e * gl; out.R[i0 + i] += s * e * gr; }
  }
  return out;
};

/** Brass: a PolyBLEP saw whose low-pass opens with loudness (the brass "bite"), the pitch rising ~25 cents into the note, vibrato delayed. `attack`, `bright`. */
const brassLegacy = (keys: Played[], sr: number, n: number, o: Opts): Out => {
  const out = out0(n), atk = num(o, "attack", 0.06), bright = num(o, "bright", 1), w = num(o, "width", 0.5);
  for (const k of keys) {
    const f = f0(k.p), i0 = Math.round(k.t * sr), dur = k.off - k.t, len = Math.min(n - i0, Math.ceil((dur + 0.3) * sr)), lp = new SVF(sr, 800, 0.8), [gl, gr] = byPitch(k.p, w); let ph = 0;
    for (let i = 0; i < len; i++) { const t = i / sr, e = asr(t, dur, atk, 0.25), cents = -25 * Math.exp(-t / 0.05) + (t > 0.25 ? 12 * Math.sin(TAU * 5.2 * t) * Math.min(1, (t - 0.25) / 0.3) : 0), inc = (f * Math.pow(2, cents / 1200)) / sr;
      ph += inc; if (ph >= 1) ph -= 1; if ((i & 15) === 0) lp.set(clamp(f * (1.5 + 7 * e * k.v * bright), 200, 12000), 0.8);
      const y = lp.tick(2 * ph - 1 - blep(ph, inc)) * e * k.v * 0.22; out.L[i0 + i] += y * gl; out.R[i0 + i] += y * gr; }
  }
  return out;
};

/** Woodwind: flute (sine + weak 2nd/3rd + breath noise at the pitch) or `reed: true` clarinet (odd harmonics, darker). Delayed vibrato. */
const woodwindLegacy = (keys: Played[], sr: number, n: number, o: Opts, r: Rng): Out => {
  const out = out0(n), reed = o.reed === true, breath = num(o, "breath", reed ? 0.02 : 0.08), w = num(o, "width", 0.3);
  for (const k of keys) {
    const f = f0(k.p), i0 = Math.round(k.t * sr), dur = k.off - k.t, len = Math.min(n - i0, Math.ceil((dur + 0.2) * sr)), bp = new SVF(sr, f, 4), [gl, gr] = byPitch(k.p, w); let ph = 0;
    for (let i = 0; i < len; i++) { const t = i / sr, e = asr(t, dur, reed ? 0.04 : 0.07, 0.15), vib = t > 0.2 ? 1 + 0.004 * Math.sin(TAU * 5 * t) * Math.min(1, (t - 0.2) / 0.3) : 1;
      ph += (f * vib) / sr; if (ph >= 1) ph -= 1; const x = TAU * ph;
      const tone = reed ? Math.sin(x) + 0.33 * Math.sin(3 * x) + 0.18 * Math.sin(5 * x) + 0.08 * Math.sin(7 * x) : Math.sin(x) + 0.12 * Math.sin(2 * x) + 0.05 * Math.sin(3 * x);
      bp.tick(gauss(r)); const y = (tone * 0.8 + bp.bp * breath * 6) * e * k.v * 0.16; out.L[i0 + i] += y * gl; out.R[i0 + i] += y * gr; }
  }
  return out;
};

const VOWELS: Record<string, [number, number, number]> = { a: [700, 1220, 2600], o: [450, 800, 2830], u: [325, 700, 2530], e: [530, 1840, 2480], i: [300, 2200, 3000] };
/** Choir: three detuned saws per note through the formants of a vowel (`vowel`: a o u e i), slow attack. Texture and pads; never a lead. */
const choirLegacy = (keys: Played[], sr: number, n: number, o: Opts, r: Rng): Out => {
  const out = out0(n), fm = VOWELS[String(o.vowel ?? "a")] ?? VOWELS.a, atk = num(o, "attack", 0.35), w = num(o, "width", 0.8);
  for (const k of keys) {
    const f = f0(k.p), i0 = Math.round(k.t * sr), dur = k.off - k.t, len = Math.min(n - i0, Math.ceil((dur + 0.8) * sr));
    const dets = [-9, 0, 8], phs = dets.map(() => r()), vr = dets.map(() => 4.5 + r()), pans = dets.map((_, j) => pan((j - 1) * w));
    const fl = [0, 1].map(() => fm.map((q, j) => new SVF(sr, q, [9, 11, 13][j])));
    for (let i = 0; i < len; i++) { const t = i / sr, e = asr(t, dur, atk, 0.7) * k.v * 0.14; let sl = 0, sR = 0;
      for (let v = 0; v < 3; v++) { const inc = (f * Math.pow(2, (dets[v] + 10 * Math.sin(TAU * vr[v] * t)) / 1200)) / sr; let ph = phs[v] + inc; if (ph >= 1) ph -= 1; phs[v] = ph; const s = 2 * ph - 1 - blep(ph, inc); sl += s * pans[v][0]; sR += s * pans[v][1]; }
      let yl = 0, yr = 0; for (let j = 0; j < 3; j++) { fl[0][j].tick(sl); fl[1][j].tick(sR); yl += fl[0][j].bp * [1, 0.6, 0.3][j]; yr += fl[1][j].bp * [1, 0.6, 0.3][j]; }
      out.L[i0 + i] += yl * e; out.R[i0 + i] += yr * e; }
  }
  return out;
};

/** Timpani (`pitch`: a MIDI note to tune it when it plays a drum lane): a tuned membrane (modal partials 1, 1.5, 1.99, 2.44, 2.97 with their own decays), a small downward pitch settle, a felt-mallet thump. Pitched on the note. */
const timpaniLegacy = (keys: Played[], sr: number, n: number, o: Opts, r: Rng): Out => {
  const out = out0(n), dec = num(o, "decay", 1.6), P = [[1, 1, 1], [1.5, 0.5, 0.7], [1.99, 0.35, 0.5], [2.44, 0.2, 0.35], [2.97, 0.12, 0.25]];
  for (const k of keys) {
    const f = f0(typeof o.pitch === "number" ? (o.pitch as number) : k.p), i0 = Math.round(k.t * sr), len = Math.min(n - i0, Math.ceil(dec * 4 * sr)), lp = new SVF(sr, 400, 0.7);
    for (let i = 0; i < len; i++) { const t = i / sr, bend = 1 + 0.03 * Math.exp(-t / 0.08); let s = 0;
      for (const [h, a, d] of P) s += a * Math.sin(TAU * f * h * bend * t) * Math.exp(-t / (dec * d));
      lp.tick(gauss(r)); const y = (s + lp.lp * Math.exp(-t / 0.012) * 3) * k.v * 0.3; out.L[i0 + i] += y; out.R[i0 + i] += y * 0.97; }
  }
  return out;
};

/** Lead synth: monophonic saw + square, portamento `glide` s between touching notes, a filter envelope re-struck each note, vibrato blooming on long notes (spec 06 lead). */
export const leadSynth = (keys: Played[], sr: number, n: number, o: Opts): Out => {
  const out = out0(n), glide = num(o, "glide", 0.03), cut = num(o, "cut", 1700), envAmt = num(o, "env", 4500), sq = num(o, "square", 0.4), [gl, gr] = pan(num(o, "pan", 0));
  // vibrato depth (fraction of pitch), rate (Hz) and onset (s): defaults are the original voice, bit for bit; a theremin wants ~0.02 at 6 Hz from 0.08 s
  const vDepth = num(o, "vibrato", 0.006), vHz = num(o, "vibHz", 5.5), vAt = num(o, "vibAt", 0.3), vRise = num(o, "vibRise", 0.4);
  const ks = keys.slice().sort((a, b) => a.t - b.t); let prevF = 0, prevOff = -1, ph = 0, ph2 = 0; const lp = new SVF(sr, cut, 1.2);
  ks.forEach((k, idx) => {
    const f = f0(k.p), i0 = Math.round(k.t * sr), nextT = idx + 1 < ks.length ? ks[idx + 1].t : Infinity, dur = Math.min(k.off, nextT) - k.t, tail = nextT < k.off + 0.12 ? nextT - k.t : dur + 0.12;
    const len = Math.min(n - i0, Math.ceil(Math.max(0.01, tail) * sr)), from = prevF && k.t - prevOff < 0.05 ? prevF : f;
    for (let i = 0; i < len; i++) { const t = i / sr, fr = from + (f - from) * Math.min(1, t / Math.max(1e-4, glide)), vib = t > vAt ? 1 + vDepth * Math.sin(TAU * vHz * t) * Math.min(1, (t - vAt) / vRise) : 1, inc = (fr * vib) / sr;
      ph += inc; if (ph >= 1) ph -= 1; ph2 += inc; if (ph2 >= 1) ph2 -= 1;
      const e = Math.min(1, t / 0.006) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.03));
      if ((i & 15) === 0) lp.set(clamp(cut + envAmt * k.v * Math.exp(-t / 0.18), 150, 14000), 1.2);
      const y = lp.tick((2 * ph - 1 - blep(ph, inc)) + sq * (ph2 < 0.5 ? 1 : -1)) * e * k.v * 0.18; out.L[i0 + i] += y * gl; out.R[i0 + i] += y * gr; }
    prevF = f; prevOff = k.t + dur;
  });
  return out;
};

/** Bowed solo (violin / cello): one saw with delayed vibrato and bow noise through body resonances (~280, 450, 2800 Hz), a bowed attack. */
const bowedSoloLegacy = (keys: Played[], sr: number, n: number, o: Opts, r: Rng): Out => {
  const out = out0(n), atk = num(o, "attack", 0.09), vibC = num(o, "vibrato", 22), [gl, gr] = pan(num(o, "pan", -0.1));
  const body = o.cello === true ? [140, 300, 1600] : [280, 450, 2800];
  for (const k of keys) {
    const f = f0(k.p), i0 = Math.round(k.t * sr), dur = k.off - k.t, len = Math.min(n - i0, Math.ceil((dur + 0.35) * sr)), bs = body.map((q) => new SVF(sr, q, 2.2)), lp = new SVF(sr, 5000, 0.7); let ph = 0;
    for (let i = 0; i < len; i++) { const t = i / sr, e = asr(t, dur, atk, 0.3), vib = t > 0.15 ? vibC * Math.sin(TAU * 5.6 * t) * Math.min(1, (t - 0.15) / 0.35) : 0, inc = (f * Math.pow(2, vib / 1200)) / sr;
      ph += inc; if (ph >= 1) ph -= 1; const x = 2 * ph - 1 - blep(ph, inc) + gauss(r) * 0.06;
      let y = lp.tick(x) * 0.35; for (const b of bs) { b.tick(x); y += b.bp * 0.5; } y *= e * k.v * 0.16; out.L[i0 + i] += y * gl; out.R[i0 + i] += y * gr; }
  }
  return out;
};

// ---------------------------------------------------------------- v2 ensemble voices (ensemble.ts)
// `opts.legacy: true` keeps the v1 voice bit-for-bit (shipped films); everything else gets v2.
const legacy = (o: Opts) => o.legacy === true;
export const brass = (keys: Played[], sr: number, n: number, o: Opts): Out => (legacy(o) ? brassLegacy(keys, sr, n, o) : E.brass(keys, sr, n, o));
export const woodwind = (keys: Played[], sr: number, n: number, o: Opts, r: Rng): Out => (legacy(o) ? woodwindLegacy(keys, sr, n, o, r) : E.woodwind(keys, sr, n, o, r));
export const choir = (keys: Played[], sr: number, n: number, o: Opts, r: Rng): Out => (legacy(o) ? choirLegacy(keys, sr, n, o, r) : E.choir(keys, sr, n, o, r));
export const bowedSolo = (keys: Played[], sr: number, n: number, o: Opts, r: Rng): Out => (legacy(o) ? bowedSoloLegacy(keys, sr, n, o, r) : E.bowedSolo(keys, sr, n, o, r));
/** Timpani: the kit's concert timpani (drums.ts: 7 measured membrane modes, velocity pitch glide, stick click, real rolls), 3.7x faster than v1
 *  (4.5 s vs 16.9 s for a 30 s part at 48 kHz, measured at the sound-v2 merge). v1 (5 sines, recomputed with Math.sin per sample, no rolls) stays for legacy only. */
export const timpani = (keys: Played[], sr: number, n: number, o: Opts, r: Rng): Out => (legacy(o) ? timpaniLegacy(keys, sr, n, o, r) : kitTimpani(keys, sr, n, o, r));

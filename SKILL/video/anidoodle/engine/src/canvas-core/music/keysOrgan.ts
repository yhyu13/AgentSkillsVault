// Organs.
// TONEWHEEL (B3-style): 9 drawbars (16' 5 1/3' 8' 4' 2 2/3' 2' 1 3/5' 1 1/3' 1'). Each drawbar reads a
// tonewheel of the nearest EQUAL-TEMPERED note (so the "5th" and "3rd" harmonics are 2 and 14 cents off
// just, as on the real gear), with the top-octave foldback. The 91 wheels spin all the time: a wheel's
// phase is global, so two keys sharing a wheel add coherently and no two strikes start alike. Each key's
// 9 busbar contacts close a fraction of a ms apart (key click), plus optional single-trigger percussion,
// a tube preamp (2x oversampled, slightly asymmetric) and a Leslie: 800 Hz crossover, horn and drum
// rotating at their own speeds (chorale 0.83/0.7 Hz, tremolo 6.7/5.9 Hz) with Doppler (modulated delay),
// amplitude and two mics 90 degrees apart.
// PIPE (church): ranks voiced from MEASURED VCSL pipe spectra (keysTables.ts): the open principal chorus
// (plenum) or the stopped flute; every pipe has its own fixed detune (ranks beat against each other),
// speech = harmonics building up at their own rates (higher later, bigger pipes slower) + a "chiff" of
// wind noise at the upper harmonics, a steady flue breath, a small wind-sag when many pipes open.
import { TAU, clamp, pan, SVF, gauss } from "./dsp";
import { rng as mkRng } from "../core";
import type { Played } from "./perform";
import { type Out, type Opts, num, str, out0, mtof, dbA, noteVar, noiseBurst, byTime, shape2x, dcBlock } from "./keysCore";
import { PIPE_PLENUM, PIPE_FLUTE } from "./keysTables";

// ---------------------------------------------------------------- shared sine table (fast, deterministic)
const TN = 4096, SIN = new Float64Array(TN + 1); for (let i = 0; i <= TN; i++) SIN[i] = Math.sin((TAU * i) / TN);
const sinT = (ph: number) => { let x = ph - Math.floor(ph); x *= TN; const i = x | 0, f = x - i; return SIN[i] + (SIN[i + 1] - SIN[i]) * f; }; // ph in cycles

// ---------------------------------------------------------------- tonewheel
const FOOT = [-12, 7, 0, 12, 19, 24, 28, 31, 36];
/** legacy `bright` (1 = default) maps onto a registration; `drawbars` ("888000000") overrides it. */
const registration = (o: Opts) => {
  if (typeof o.drawbars === "string" && /^[0-8]{9}$/.test(o.drawbars as string)) return (o.drawbars as string).split("").map(Number);
  const b = num(o, "bright", 1);
  return b < 0.7 ? [8, 0, 8, 4, 0, 0, 0, 0, 0] : b < 1.15 ? [8, 6, 8, 5, 2, 2, 0, 0, 0] : [8, 8, 8, 6, 3, 4, 0, 2, 3];
};
export const tonewheel = (keys: Played[], sr: number, n: number, o: Opts, seed: number): Out => {
  const reg = registration(o), raw = reg.map((d) => (d === 0 ? 0 : dbA(-3 * (8 - d)))), norm = 1 / Math.sqrt(raw.reduce((a, x) => a + x * x, 0) || 1), gains = raw.map((x) => x * norm), sorted = byTime(keys); // registration changes colour, not loudness
  const wr = mkRng(seed * 17 + 1), wheelPh = Array.from({ length: 128 }, () => wr());
  const mono = new Float64Array(n), click = num(o, "click", 0.5), perc = str(o, "perc", "off");
  const heldAt = (t: number) => sorted.some((k) => k.t < t - 0.002 && k.off > t);
  sorted.forEach((k, idx) => {
    const i0 = Math.round(k.t * sr); if (i0 >= n) return;
    const nv = noteVar(seed, idx, k, { db: 0.3 }), iEnd = Math.min(n, Math.round(k.off * sr) + Math.round(0.012 * sr));
    const g = 0.068 * k.v * nv.gain; // an organ key has no velocity: the expression (swell) pedal follows the dynamics
    for (let d = 0; d < 9; d++) {
      if (!gains[d]) continue;
      let w = k.p + FOOT[d]; while (w > 108) w -= 12; while (w < 24) w += 12; // foldback into the 91 wheels
      const f = mtof(w), inc = f / sr, a = gains[d] * g, ph0 = wheelPh[w];
      const on = i0 + Math.round(nv.r() * 0.0012 * sr), off = iEnd - Math.round(nv.r() * 0.0015 * sr); // busbar contacts close/open at slightly different times
      for (let i = on; i < off; i++) { const ph = ph0 + inc * i; mono[i] += a * (sinT(ph) + 0.02 * sinT(3 * ph)); }
    }
    if (click > 0) { noiseBurst(mono, i0, Math.round(0.003 * sr), 3200, 0.7, 0.05 * click * g / 0.068, nv.r, sr, 0.0009); if (iEnd < n) noiseBurst(mono, iEnd - Math.round(0.012 * sr), Math.round(0.002 * sr), 2500, 0.7, 0.025 * click * g / 0.068, nv.r, sr, 0.0006); }
    if (perc !== "off" && !heldAt(k.t)) { // single-trigger percussion: only a detached key fires it
      const w = k.p + (perc === "3rd" ? 19 : 12), f = mtof(w), dec = Math.exp(-1 / (0.25 * sr)); let e = 0.12 * g / 0.068;
      for (let i = i0; i < iEnd; i++) { mono[i] += e * sinT(wheelPh[Math.min(127, w)] + (f / sr) * i); e *= dec; }
    }
  });
  // tube preamp
  const drive = num(o, "drive", 1.3); shape2x(mono, (x) => Math.tanh(drive * (x + 0.08 * x * x)) / drive); dcBlock(mono, sr, 10);
  const out = out0(n), speed = num(o, "trem", 1) === 0 ? "off" : str(o, "leslie", "slow");
  if (speed === "off") { const [gl, gr] = pan(num(o, "pan", 0)); for (let i = 0; i < n; i++) { out.L[i] = mono[i] * gl; out.R[i] = mono[i] * gr; } return out; }
  // Leslie: crossover, two rotors, Doppler + AM + mic pair
  const lo = new Float64Array(n), hi = new Float64Array(n), xl = new SVF(sr, 800, 0.707);
  for (let i = 0; i < n; i++) { xl.tick(mono[i]); lo[i] = xl.lp; hi[i] = mono[i] - xl.lp; }
  const [hornHz, drumHz] = speed === "fast" ? [6.7, 5.9] : [0.83, 0.7];
  const rotor = (x: Float64Array, hz: number, depthMs: number, am: number, ph0: number, g: number) => {
    const D = Math.ceil(0.004 * sr), line = new Float64Array(D * 4 + 8), mask = line.length;
    for (let i = 0; i < n; i++) {
      line[i % mask] = x[i];
      const th = (TAU * hz * i) / sr + ph0;
      for (const [ch, off] of [[0, 0], [1, Math.PI / 2]] as const) {
        const s = Math.sin(th + off), dl = (D + s * depthMs * 0.001 * sr), di = Math.floor(dl), fr = dl - di;
        const a = line[(i - di + mask * 4) % mask], b = line[(i - di - 1 + mask * 4) % mask], y = (a + (b - a) * fr) * (1 + am * s) * g;
        if (ch === 0) out.L[i] += y; else out.R[i] += y;
      }
    }
  };
  rotor(hi, hornHz, 0.35, 0.35, ((seed * 0.618) % 1) * TAU, 0.36);
  rotor(lo, drumHz, 0.12, 0.12, ((seed * 0.382) % 1) * TAU, 0.38);
  return out;
};

// ---------------------------------------------------------------- pipe organ
export const pipeOrgan = (keys: Played[], sr: number, n: number, o: Opts, seed: number): Out => {
  const stops = str(o, "stops", num(o, "bright", 1) < 0.7 ? "flute" : num(o, "bright", 1) > 1.15 ? "full" : "principal");
  const ranks: { spec: [number, number][]; oct: number; g: number }[] =
    stops === "flute" ? [{ spec: PIPE_FLUTE, oct: 0, g: 1 }] : stops === "full" ? [{ spec: PIPE_PLENUM, oct: 0, g: 1 }, { spec: PIPE_FLUTE, oct: -12, g: 0.55 }, { spec: PIPE_FLUTE, oct: 0, g: 0.4 }] : [{ spec: PIPE_PLENUM, oct: 0, g: 1 }, { spec: PIPE_FLUTE, oct: 0, g: 0.35 }];
  const out = out0(n), sorted = byTime(keys), pr = mkRng(seed * 29 + 5);
  const pipeDetune = new Map<number, number>(); const detOf = (key: number) => { if (!pipeDetune.has(key)) pipeDetune.set(key, (pr() - 0.5) * 3); return pipeDetune.get(key)!; };
  // wind load: how many pipes are speaking, smoothed (the reservoir sags a little under a big chord)
  const ctl = Math.ceil(n / 64) + 2, load = new Float64Array(ctl);
  for (const k of sorted) { const a = Math.floor((k.t * sr) / 64), b = Math.min(ctl - 1, Math.ceil((k.off * sr) / 64)); for (let j = Math.max(0, a); j < b; j++) load[j] += ranks.length; }
  { const kk = 1 - Math.exp(-64 / (0.08 * sr)); let z = 0; for (let j = 0; j < ctl; j++) { z += kk * (load[j] - z); load[j] = z; } }
  const trem = num(o, "trem", 0), tremPh = pr() * TAU;
  sorted.forEach((k, idx) => {
    const i0 = Math.round(k.t * sr); if (i0 >= n) return;
    const nv = noteVar(seed, idx, k, { db: 0.3 }), iOff = Math.round(k.off * sr), rel = 0.045, iEnd = Math.min(n, iOff + Math.round(rel * 6 * sr));
    const g = 0.074 * (0.6 + 0.4 * k.v) * nv.gain, [gl, gr] = pan((k.p % 2 ? 1 : -1) * (0.15 + 0.25 * clamp(Math.abs(k.p - 60) / 30, 0, 1))); // pipes stand on C and C# chests, bigger pipes at the ends
    for (const rk of ranks) {
      const m = k.p + rk.oct, f0 = mtof(m) * Math.pow(2, detOf(m * 8 + ranks.indexOf(rk)) / 1200), big = Math.pow(262 / f0, 0.5);
      for (const [h, db] of rk.spec) {
        const f = f0 * h; if (f > sr * 0.45) continue;
        const a = dbA(db) * rk.g * g, tau = (0.012 + 0.03 * big) * (1 + 0.15 * h), ph0 = pr();
        const riseK = Math.exp(-1 / (tau * sr)), relK = Math.exp(-1 / (rel * sr));
        let env = 0, ph = ph0;
        for (let i = i0; i < iEnd; i++) {
          env = i < iOff ? 1 - (1 - env) * riseK : env * relK;
          const sag = 1 - 0.00012 * load[(i / 64) | 0], tr = trem > 0 ? 1 + 0.004 * Math.sin((TAU * trem * i) / sr + tremPh) : 1;
          ph += (f * sag * tr) / sr;
          const y = a * env * sinT(ph); out.L[i] += y * gl; out.R[i] += y * gr;
        }
      }
      // chiff: wind noise at the upper harmonics while the pipe speaks, then the steady flue breath
      const tmp = new Float64Array(Math.min(n - i0, Math.round(0.09 * sr)));
      noiseBurst(tmp, 0, tmp.length, f0 * (3 + 2 * nv.r()), 4, 0.25 * rk.g * g, nv.r, sr, 0.018 + 0.02 * big);
      for (let i = 0; i < tmp.length; i++) { out.L[i0 + i] += tmp[i] * gl; out.R[i0 + i] += tmp[i] * gr; }
      const bp = new SVF(sr, Math.min(f0 * 2, 9000), 3), br = mkRng(seed * 7 + idx * 13 + m);
      for (let i = i0; i < Math.min(iOff, n); i++) { bp.tick(gauss(br)); const y = bp.bp * 0.012 * rk.g * g; out.L[i] += y * gl; out.R[i] += y * gr; }
    }
  });
  return out;
};

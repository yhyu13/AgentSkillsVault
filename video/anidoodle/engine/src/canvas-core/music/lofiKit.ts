// LO-FI ELECTRONIC KIT. The voices and the bus moves chill lo-fi electronic music is made of, each
// from the numbers producers publish for it (Unison "Making LoFi Beats 101", MODE Audio "5 LoFi
// essentials"): a detuned saw pad low-passed near 2 kHz with a slow attack and chorus, a soft
// pluck through a dotted-eighth ping-pong delay, a sine sub filtered near 120-150 Hz, the kick
// ducking the pad (the pump that makes it breathe), and tape: 5-10 cents of slow wow, a little
// flutter, and saturation. Pure functions of (keys, sr, n, opts, rng): deterministic like the rest.
import { type Rng, TAU, clamp, pan, SVF, blep } from "./dsp";
import type { Played } from "./perform";

type Out = { L: Float32Array; R: Float32Array };
type Opts = Record<string, number | boolean | string>;
const num = (o: Opts, k: string, d: number) => (typeof o[k] === "number" ? (o[k] as number) : d);
const f0 = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Warm pad: 7 PolyBLEP saws spread +-14 cents, each drifting on its own slow LFO (the chorus),
 *  a 12 dB low-pass that opens a little with the attack, slow attack and long release. */
export const warmPad = (keys: Played[], sr: number, n: number, o: Opts, r: Rng): Out => {
  const out = { L: new Float32Array(n), R: new Float32Array(n) }, atk = num(o, "attack", 0.9), rel = num(o, "release", 1.8), cut = num(o, "cut", 1900), w = num(o, "width", 0.85);
  for (const k of keys) {
    const f = f0(k.p), i0 = Math.round(k.t * sr), dur = k.off - k.t, len = Math.min(n - i0, Math.ceil((dur + rel * 2) * sr));
    const spread = num(o, "spread", 1), V = 7, dets = [-14, -9, -4, 0, 4.5, 9.5, 13.5].map((d) => d * spread), phs = dets.map(() => r()), pans = dets.map((_, i) => pan(((i / (V - 1)) * 2 - 1) * w));
    const lfo = dets.map(() => ({ rate: 0.25 + r() * 0.5, ph: r() * TAU })), g = Math.pow(k.v, 1.1) * 0.075, lp = [new SVF(sr, cut, 0.55), new SVF(sr, cut, 0.55)];
    for (let i = 0; i < len; i++) {
      const t = i / sr, env = t < dur ? 1 - Math.exp(-t / (atk / 3)) : (1 - Math.exp(-dur / (atk / 3))) * Math.exp(-(t - dur) / (rel / 3));
      if (env < 1e-5 && t > dur) break;
      let sl = 0, sr_ = 0;
      for (let v = 0; v < V; v++) {
        const cents = dets[v] + 3 * spread * Math.sin(TAU * lfo[v].rate * t + lfo[v].ph), inc = (f * Math.pow(2, cents / 1200)) / sr;
        let ph = phs[v] + inc; if (ph >= 1) ph -= 1; phs[v] = ph;
        const s = 2 * ph - 1 - blep(ph, inc); sl += s * pans[v][0]; sr_ += s * pans[v][1];
      }
      if ((i & 63) === 0) { const c = clamp(cut * (0.7 + 0.3 * env), 200, 8000); lp[0].set(c, 0.55); lp[1].set(c, 0.55); }
      const j = i0 + i; out.L[j] += lp[0].tick(sl) * env * g; out.R[j] += lp[1].tick(sr_) * env * g;
    }
  }
  return out;
};

/** Soft pluck: triangle plus a quiet square an octave down, through a low-pass whose cutoff snaps
 *  open and falls back (the pluck), a short amp decay, then a dotted-eighth ping-pong delay. */
export const softPluck = (keys: Played[], sr: number, n: number, o: Opts): Out => {
  const out = { L: new Float32Array(n), R: new Float32Array(n) }, dec = num(o, "decay", 0.55), bright = num(o, "bright", 3200), p = num(o, "pan", 0);
  const [gl, gr] = pan(p);
  for (const k of keys) {
    const f = f0(k.p), i0 = Math.round(k.t * sr), len = Math.min(n - i0, Math.ceil((dec * 6) * sr)), lp = new SVF(sr, bright, 0.9);
    let ph = 0, ph2 = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr; ph += f / sr; if (ph >= 1) ph -= 1; ph2 += f / 2 / sr; if (ph2 >= 1) ph2 -= 1;
      const tri = 1 - 4 * Math.abs(ph - 0.5), sq = ph2 < 0.5 ? 0.25 : -0.25;
      if ((i & 15) === 0) lp.set(clamp(500 + bright * k.v * Math.exp(-t / 0.09), 200, 9000), 0.9);
      const env = Math.min(1, t * 400) * Math.exp(-t / dec), y = lp.tick(tri + sq) * env * k.v * 0.32;
      out.L[i0 + i] += y * gl; out.R[i0 + i] += y * gr;
    }
  }
  const d = num(o, "delay", 0), fb = num(o, "feedback", 0.32), mix = num(o, "delayMix", 0.3);
  if (d > 0) { // ping-pong: left echoes into right and back, each repeat darker
    const D = Math.round(d * sr), bL = new Float32Array(n), bR = new Float32Array(n), toneL = new SVF(sr, 2600, 0.7), toneR = new SVF(sr, 2600, 0.7);
    for (let i = 0; i < n; i++) {
      const eL = i >= D ? bR[i - D] * fb + (out.L[i - D] + out.R[i - D]) * 0.5 : 0, eR = i >= D ? bL[i - D] : 0;
      bL[i] = toneL.tick(eL); bR[i] = toneR.tick(eR);
    }
    for (let i = 0; i < n; i++) { out.L[i] += bL[i] * mix; out.R[i] += bR[i] * mix; }
  }
  return out;
};

/** Sine sub: the fundamental and a whisper of the 2nd so phones still hear it, low-passed at 150 Hz. */
export const sub = (keys: Played[], sr: number, n: number, o: Opts): Out => {
  const out = { L: new Float32Array(n), R: new Float32Array(n) }, cut = num(o, "cut", 150);
  for (const k of keys) {
    const f = f0(k.p), i0 = Math.round(k.t * sr), dur = k.off - k.t, len = Math.min(n - i0, Math.ceil((dur + 0.12) * sr)), lp = new SVF(sr, cut, 0.7);
    for (let i = 0; i < len; i++) {
      const t = i / sr, env = Math.min(1, t * 120) * (t < dur ? 0.8 + 0.2 * Math.exp(-t / 0.3) : Math.exp(-(t - dur) / 0.04));
      const y = lp.tick(Math.sin(TAU * f * t) + 0.18 * Math.sin(TAU * 2 * f * t)) * env * k.v * 0.42; out.L[i0 + i] += y; out.R[i0 + i] += y;
    }
  }
  return out;
};

// ---------------------------------------------------------------- bus moves
/** The kick pump: a gain curve that dips by `depth` at every kick and recovers over `release` s. */
export const duckCurve = (kicks: number[], sr: number, n: number, depth = 0.4, release = 0.28, attack = 0.008): Float32Array => {
  const g = new Float32Array(n).fill(1);
  for (const t of kicks) {
    const i0 = Math.round(t * sr), len = Math.min(n - i0, Math.ceil(release * 5 * sr));
    for (let i = 0; i < len; i++) { const s = i / sr, a = s < attack ? s / attack : Math.exp(-(s - attack) / (release / 2.5)); const v = 1 - depth * a; if (v < g[i0 + i]) g[i0 + i] = v; }
  }
  return g;
};
/** Tape: wow (slow pitch drift) and flutter as a modulated fractional delay, then soft saturation. */
export const tape = (L: Float32Array, R: Float32Array, sr: number, o: { wowCents?: number; wowHz?: number; flutterCents?: number; flutterHz?: number; drive?: number } = {}) => {
  const n = L.length, wc = o.wowCents ?? 7, wf = o.wowHz ?? 0.45, fc = o.flutterCents ?? 1.2, ff = o.flutterHz ?? 6.2, drive = o.drive ?? 1.25;
  // a delay swinging by A seconds at f Hz shifts pitch by 2*pi*f*A: solve A from the cents wanted
  const A1 = (Math.pow(2, wc / 1200) - 1) / (TAU * wf), A2 = (Math.pow(2, fc / 1200) - 1) / (TAU * ff), base = A1 + A2 + 0.002;
  for (const c of [L, R]) {
    const src = Float32Array.from(c);
    for (let i = 0; i < n; i++) {
      const t = i / sr, d = (base + A1 * Math.sin(TAU * wf * t) + A2 * Math.sin(TAU * ff * t)) * sr, x = i - d, j = Math.floor(x), fr = x - j;
      const a = j >= 0 && j < n ? src[j] : 0, b = j + 1 >= 0 && j + 1 < n ? src[j + 1] : 0;
      c[i] = Math.tanh((a + (b - a) * fr) * drive) / drive;
    }
  }
};

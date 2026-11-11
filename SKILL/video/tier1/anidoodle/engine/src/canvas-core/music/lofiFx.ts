// LO-FI, DONE AS PRODUCTION (research doc section 4). The old "lo-fi" was a darker clean mix plus a
// pure-sine vibrato: Alex heard "bad 80s MIDI". Real lo-fi is a chain of machines, in this order:
//   instrument -> SAMPLER (SP-1200 / MPC: rate reduction with no anti-alias filter, 12-bit, the output
//   filter, a gain push, pads pitched down and choked on retrigger) -> TAPE (random band-limited wow
//   shared by both channels, flutter that differs L/R, head bump, HF loss, saturation with a
//   hysteresis loop, hiss) -> VINYL (Poisson crackle with power-law sizes, pops that ring, a scratch
//   that ticks once per turn, surface noise swelling with the rotation, rumble, the 33 1/3 wobble)
//   -> BUS (the kick pump, a low-pass tilt, a quiet room tone).
// Keys get their own warbly cassette (their own wow, a two-tap chorus, a slow stereo tremolo), drums
// a dusty bus (mono-ish like a sampled break, saturated, a short small room).
// Everything is a pure function of (audio, sr, options, seed): the same piece renders the same bytes.
// Legacy: pieces with `legacy: true` (the shipped launch films) never reach this file (render.ts).
import { TAU, Biquad, onePoleCoef, clamp, db } from "./dsp";
import { rng as mkRng } from "../core";
import type { Played } from "./perform";
import { smallRoom } from "./roomSmall";

type Buf = Float32Array;
type R = () => number;

export type TapeFx = {
  /** wow: peak pitch drift in cents (random, 0.3-1.5 Hz band); wowHz = the band's centre */ wowCents?: number; wowHz?: number;
  /** flutter: peak cents in the 6-12 Hz band (L and R differ a little) */ flutterCents?: number; flutterHz?: number;
  /** saturation drive (1 = clean) */ drive?: number;
  /** head bump: dB at bumpHz (60-90 Hz) */ bumpDb?: number; bumpHz?: number;
  /** HF loss: the tape's 1-pole corner (Hz) plus a -2 dB shelf at 6 kHz; omit for no loss */ hfHz?: number;
  /** hiss level in dB under the program (e.g. -44) */ hissDb?: number;
  /** hysteresis width 0..1 (the magnetic loop: memory in the saturation) */ hyst?: number;
  /** a loop's length in s: every modulation completes whole cycles in it (renderLoop sets it) */ period?: number;
};
export type VinylFx = {
  /** crackle clicks per second (5-40) */ crackle?: number; /** pops per second (0.2-1) */ pops?: number;
  /** surface noise and rumble, dB under the program */ surfaceDb?: number; rumbleDb?: number;
  /** scratches: clicks that repeat once per turn */ scratches?: number; /** 33 1/3 rpm wobble, cents */ wobbleCents?: number;
  /** overall crackle level, dB under the program's peak */ crackleDb?: number;
};
export type SamplerFx = {
  /** the sampler's rate in Hz (SP-1200 26040, MPC60 40000) with NO anti-alias filter */ rate?: number;
  bits?: number; /** output filter corner (SSM2044-ish 4-pole) */ lp?: number;
  /** the gain push into the converter's soft clip (1 = none) */ drive?: number;
  /** pads sampled fast and played back pitched down, in semitones (e.g. -2); each retrigger chokes the last */ pitch?: number;
  /** how far under full scale the sample was recorded (a quiet sample is grittier), dB */ headroomDb?: number;
};
export type LofiFx = {
  drums?: { parts: string[]; sampler?: SamplerFx; /** stereo width 0 (mono break) .. 1 */ width?: number; sat?: number; room?: number };
  keys?: { parts: string[]; warbleCents?: number; chorus?: number; tremolo?: number; lp?: number; sampler?: SamplerFx };
  tape?: TapeFx; vinyl?: VinylFx;
  /** master low-pass (Hz, 12 dB/oct) and the tilt (dB of high-shelf cut) */ tilt?: { lp?: number; tiltDb?: number };
  /** room tone (the air of the room the record plays in), dB under the program */ roomToneDb?: number;
};

// ------------------------------------------------------------------------------------ helpers
const clone = (x: Buf) => Float32Array.from(x);
const rms = (L: Buf, R: Buf) => { let s = 0, c = 0; for (let i = 0; i < L.length; i++) { const e = L[i] * L[i] + R[i] * R[i]; if (e > 1e-10) { s += e; c++; } } return Math.sqrt(s / Math.max(1, c * 2)); };
const peak = (...cs: Buf[]) => { let p = 0; for (const c of cs) for (let i = 0; i < c.length; i++) { const a = Math.abs(c[i]); if (a > p) p = a; } return p; };
const run = (c: Buf, ...fs: Biquad[]) => { for (let i = 0; i < c.length; i++) { let v = c[i]; for (const f of fs) v = f.tick(v); c[i] = v; } };
/** Pink noise (Paul Kellet), roughly unit RMS. */
const pinkInto = (o: Float32Array, r: R, g: number) => {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < o.length; i++) {
    const w = r() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    o[i] += (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11 * g * 2.6; b6 = w * 0.115926;
  }
  return o;
};

/**
 * A random, band-limited control signal (unit RMS): many sinusoids at random frequencies inside
 * [lo, hi] Hz, 1/sqrt(f) weights, Rayleigh amplitudes, random phases. That is filtered noise by
 * spectral synthesis: it never repeats like an LFO, and with `period` every component snaps to a
 * whole number of cycles, so a loop's modulation meets itself at the seam. Sampled every 32 samples.
 */
export const wander = (n: number, sr: number, lo: number, hi: number, r: R, comps = 14, period?: number) => {
  const step = 32, m = Math.ceil(n / step) + 2, out = new Float32Array(m);
  const f: number[] = [], a: number[] = [], ph: number[] = [];
  for (let k = 0; k < comps; k++) {
    let fk = lo * Math.pow(hi / lo, (k + r()) / comps);
    if (period) fk = Math.max(1, Math.round(fk * period)) / period;
    f.push(fk); a.push(Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) / Math.sqrt(fk)); ph.push(r() * TAU);
  }
  const norm = Math.sqrt(a.reduce((s, x) => s + x * x, 0) / 2);
  for (let j = 0; j < m; j++) { const t = (j * step) / sr; let s = 0; for (let k = 0; k < comps; k++) s += a[k] * Math.sin(TAU * f[k] * t + ph[k]); out[j] = s / norm; }
  return (i: number) => { const x = i / step, j = Math.floor(x), fr = x - j; return out[j] + (out[j + 1] - out[j]) * fr; };
};

/** Read `src` at fractional positions: 4-point cubic Hermite (no zipper, little HF loss). */
const hermite = (src: Buf, x: number) => {
  const j = Math.floor(x), f = x - j, n = src.length, g = (k: number) => (k >= 0 && k < n ? src[k] : 0);
  const y0 = g(j - 1), y1 = g(j), y2 = g(j + 1), y3 = g(j + 2), c1 = 0.5 * (y2 - y0), c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3, c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2);
  return ((c3 * f + c2) * f + c1) * f + y1;
};

/** Pitch-modulate a stereo pair by a cents trajectory per channel: the read head's delay is the integral
 *  of (1 - ratio). ONE constant offset for both channels (every read >= 3 samples behind the write), so
 *  the channels never slip apart by a fixed delay (that would comb the highs when summed to mono). */
const pitchMod2 = (L: Buf, R: Buf, cL: (i: number) => number, cR: (i: number) => number) => {
  const n = L.length, dL = new Float64Array(n), dR = new Float64Array(n); let aL = 0, aR = 0, mn = 0;
  for (let i = 0; i < n; i++) { aL += 1 - Math.pow(2, cL(i) / 1200); aR += 1 - Math.pow(2, cR(i) / 1200); dL[i] = aL; dR[i] = aR; mn = Math.min(mn, aL, aR); }
  const off = 3 - mn;
  for (const [c, d] of [[L, dL], [R, dR]] as const) { const src = clone(c); for (let i = 0; i < n; i++) c[i] = hermite(src, i - (d[i] + off)); }
};

// ------------------------------------------------------------------------------------ tape
/**
 * The magnetic stage at 2x oversampling. A play operator (the classic building block of a
 * Preisach hysteresis model: the state follows the input only once it moves more than `w` away)
 * gives the loop its memory, a small bias makes the curve asymmetric (even harmonics), tanh the
 * saturation. The signal is normalised to a reference peak first so `drive` means the same at any
 * level, then put back; a 10 Hz DC blocker removes what the bias leaves.
 */
const magnetic = (c: Buf, sr: number, drive: number, hyst: number) => {
  if (drive <= 1.0001 && hyst <= 0) return;
  const pk = peak(c); if (pk < 1e-9) return;
  const ref = 0.5 / pk, n = c.length, w = 0.04 * hyst, bias = 0.06 * (drive - 1 + hyst * 0.5), m = 0.35 * Math.min(1, hyst * 2), off = Math.tanh(drive * bias);
  const up1 = Biquad.make(sr * 2, "lp", sr * 0.45, 0.5412), up2 = Biquad.make(sr * 2, "lp", sr * 0.45, 1.3066), dn1 = Biquad.make(sr * 2, "lp", sr * 0.45, 0.5412), dn2 = Biquad.make(sr * 2, "lp", sr * 0.45, 1.3066);
  let p = 0; const dc = onePoleCoef(sr, 10); let z = 0;
  const sat = (x: number) => { p = clamp(p, x - w, x + w); const u = (1 - m) * x + m * p; return (Math.tanh(drive * (u + bias)) - off) / drive; };
  for (let i = 0; i < n; i++) {
    const x = c[i] * ref, a = up2.tick(up1.tick(x * 2)), b = up2.tick(up1.tick(0)); // zero-stuff, image filter (gain 2 restores level)
    dn2.tick(dn1.tick(sat(a))); const y = dn2.tick(dn1.tick(sat(b)));
    z += dc * (y - z); c[i] = (y - z) / ref;
  }
};

/** Tape: wow + flutter (modulated read), head bump, HF loss, magnetic saturation, hiss. In place. */
export const tape2 = (L: Buf, R: Buf, sr: number, o: TapeFx & { wobble?: { cents: number; hz: number } }, seed: number) => {
  const n = L.length, r = mkRng((seed ^ 0x7a9e) >>> 0);
  const wc = o.wowCents ?? 5, wf = o.wowHz ?? 0.7, fc = o.flutterCents ?? 1, ff = o.flutterHz ?? 8;
  // wow: one transport, both channels (0.43x..2.1x the centre: ~0.3-1.5 Hz at 0.7); flutter: 70 % shared, 30 % per channel
  const wow = wander(n, sr, wf * 0.43, wf * 2.1, r, 14, o.period), fl = wander(n, sr, ff * 0.75, ff * 1.5, r, 10, o.period);
  const flL = wander(n, sr, ff * 0.75, ff * 1.5, r, 6, o.period), flR = wander(n, sr, ff * 0.75, ff * 1.5, r, 6, o.period), skew = wander(n, sr, 0.1, 0.5, r, 6, o.period);
  const wb = o.wobble, wbPh = r() * TAU, wbHz = wb ? (o.period ? Math.max(1, Math.round(wb.hz * o.period)) / o.period : wb.hz) : 0;
  const cents = (side: number) => (i: number) => {
    const t = i / sr;
    return (wc / 2.8) * (wow(i) + 0.012 * skew(i) * side) + (fc / 2.2) * (0.84 * fl(i) + 0.55 * (side > 0 ? flR(i) : flL(i))) + (wb ? wb.cents * Math.sin(TAU * wbHz * t + wbPh) : 0);
  };
  if (wc > 0 || fc > 0 || wb) pitchMod2(L, R, cents(-1), cents(1));
  for (const c of [L, R]) {
    const fs: Biquad[] = [];
    if (o.bumpDb) fs.push(Biquad.make(sr, "peak", o.bumpHz ?? 75, 0.9, o.bumpDb), Biquad.make(sr, "peak", (o.bumpHz ?? 75) * 2.3, 1.2, -o.bumpDb * 0.35));
    if (o.hfHz) fs.push(Biquad.make(sr, "highshelf", 6000, 0.7, -2));
    if (fs.length) run(c, ...fs);
    if (o.hfHz) { const k = onePoleCoef(sr, o.hfHz); let z = 0; for (let i = 0; i < n; i++) { z += k * (c[i] - z); c[i] = z; } }
    magnetic(c, sr, o.drive ?? 1.2, o.hyst ?? 0);
  }
  if (o.hissDb !== undefined) {
    const g = rms(L, R) * db(o.hissDb), common = pinkInto(new Float32Array(n), r, 1), hL = pinkInto(new Float32Array(n), r, 1), hR = pinkInto(new Float32Array(n), r, 1);
    for (const [h, c] of [[hL, L], [hR, R]] as const) {
      for (let i = 0; i < n; i++) h[i] = 0.35 * common[i] + 0.94 * h[i];
      run(h, Biquad.make(sr, "hp", 1000, 0.6), Biquad.make(sr, "lp", 12000, 0.6));
      for (let i = 0; i < n; i++) c[i] += h[i] * g;
    }
  }
};

// ------------------------------------------------------------------------------------ vinyl
/**
 * The record: crackle (Poisson arrivals, Pareto sizes: a few loud ticks over many faint ones, each a
 * 0.1-1 ms burst high-passed at 1 kHz, mostly in one groove wall so L and R differ), pops (rarer,
 * bigger, ringing through a resonant low-pass), scratches (one tick per turn at a fixed angle, for a
 * stretch of turns), surface noise swelling with the rotation, and rumble (below 40 Hz, mostly
 * vertical = anti-phase). Adds into L, R.
 */
export const vinyl2 = (L: Buf, R: Buf, sr: number, o: VinylFx, seed: number) => {
  const n = L.length, r = mkRng((seed ^ 0x51f3) >>> 0), turn = 60 / (100 / 3), prog = rms(L, R), pk = Math.max(peak(L, R), 1e-6);
  const cL = new Float32Array(n), cR = new Float32Array(n);
  const click = (at: number, amp: number, lenS: number, side: number) => {
    const len = Math.max(2, Math.round(lenS * sr)), sgn = r() < 0.5 ? -1 : 1, gL = side < 0 ? 1 : 0.25 + 0.5 * r(), gR = side > 0 ? 1 : 0.25 + 0.5 * r();
    for (let k = 0; k < len && at + k < n; k++) { const v = sgn * amp * Math.exp(-k / (len / 3)) * (k === 0 ? 1 : (r() * 2 - 1)); cL[at + k] += v * gL; cR[at + k] += v * gR; }
  };
  const a0 = pk * db(o.crackleDb ?? -34);
  // crackle
  for (let t = 0, rate = o.crackle ?? 14; rate > 0;) { t += -Math.log(Math.max(1e-9, r())) / rate; if (t >= n / sr) break; click(Math.round(t * sr), Math.min(a0 * Math.pow(Math.max(1e-3, r()), -1 / 2.3), a0 * 25) * 0.4, 0.0001 + 0.0009 * r() * r(), r() < 0.5 ? -1 : 1); }
  run(cL, Biquad.make(sr, "hp", 1000, 0.7)); run(cR, Biquad.make(sr, "hp", 1000, 0.7));
  // scratches: a tick at the same angle every turn, for a stretch of the record
  for (let s = 0; s < (o.scratches ?? 1); s++) {
    const ph = r() * turn, amp = a0 * (1.5 + 2 * r()), from = r() * 0.5, span = 0.3 + 0.5 * r(), side = r() < 0.5 ? -1 : 1;
    for (let t = ph; t < n / sr; t += turn) { const u = t / (n / sr); if (u >= from && u <= from + span && r() < 0.85) click(Math.round(t * sr), amp * (0.6 + 0.4 * r()), 0.0004, side); }
  }
  // pops: bigger, with a ringing low-passed body
  const popL = new Float32Array(n), popR = new Float32Array(n);
  for (let t = 0, rate = o.pops ?? 0.4; rate > 0;) {
    t += -Math.log(Math.max(1e-9, r())) / rate; if (t >= n / sr) break;
    const at = Math.round(t * sr), f = 500 + 1400 * r(), tau = 0.0015 + 0.003 * r(), amp = a0 * (2 + 4 * r()), sgn = r() < 0.5 ? -1 : 1, bal = r() * 0.6 - 0.3;
    for (let k = 0; k < tau * 6 * sr && at + k < n; k++) { const v = sgn * amp * Math.exp(-k / (tau * sr)) * Math.cos((TAU * f * k) / sr); popL[at + k] += v * (1 - bal); popR[at + k] += v * (1 + bal); }
  }
  run(popL, Biquad.make(sr, "lp", 3500, 1.4), Biquad.make(sr, "hp", 120, 0.7)); run(popR, Biquad.make(sr, "lp", 3500, 1.4), Biquad.make(sr, "hp", 120, 0.7));
  // surface: band-passed pink noise that swells with the rotation (the groove wall is not uniform)
  const sfL = pinkInto(new Float32Array(n), r, 1), sfR = pinkInto(new Float32Array(n), r, 1), sp = r() * TAU, sg = prog * db(o.surfaceDb ?? -46);
  run(sfL, Biquad.make(sr, "hp", 400, 0.6), Biquad.make(sr, "lp", 5500, 0.6)); run(sfR, Biquad.make(sr, "hp", 400, 0.6), Biquad.make(sr, "lp", 5500, 0.6));
  // rumble: < 40 Hz, mostly vertical groove motion = anti-phase
  const ru = new Float32Array(n), rg = prog * db(o.rumbleDb ?? -44); { let z1 = 0, z2 = 0; const k = onePoleCoef(sr, 28); for (let i = 0; i < n; i++) { z1 += k * ((r() * 2 - 1) - z1); z2 += k * (z1 - z2); ru[i] = z2 * 9; } }
  run(ru, Biquad.make(sr, "hp", 12, 0.7));
  for (let i = 0; i < n; i++) {
    const rot = 1 + 0.35 * Math.sin((TAU * i) / (turn * sr) + sp) + 0.15 * Math.sin((2 * TAU * i) / (turn * sr) + sp * 1.7);
    L[i] += cL[i] + popL[i] + sfL[i] * sg * rot + ru[i] * rg; R[i] += cR[i] + popR[i] + sfR[i] * sg * rot - ru[i] * rg * 0.7;
  }
};

// ------------------------------------------------------------------------------------ sampler
/**
 * SP-1200 / MPC emulation on one stem, in place. Optional chops: every onset retriggers the pad
 * pitched down (read slower), choking the previous one after a 1.5 ms crossfade. Then the
 * converter: sample-and-hold at `rate` with no anti-alias filter (highs fold back: the grit), a
 * 12-bit quantiser with plain rounding against the stem's own peak (recorded `headroomDb` under
 * full scale), the output filter (two 2-pole sections), and the gain push into a soft clip.
 */
export const sampler = (c: Buf, sr: number, o: SamplerFx, onsets: number[] = []) => {
  const n = c.length, pk = peak(c); if (pk < 1e-9) return;
  if (o.pitch && onsets.length) {
    const ratio = Math.pow(2, o.pitch / 12), src = clone(c), xf = Math.max(1, Math.round(0.0015 * sr)), on = [...new Set(onsets.map((t) => Math.round(t * sr)))].filter((i) => i >= 0 && i < n).sort((a, b) => a - b);
    for (let k = 0; k < on.length; k++) {
      const a = on[k], b = k + 1 < on.length ? on[k + 1] : n, pa = k > 0 ? on[k - 1] : -1;
      const at = (st: number, i: number) => { const x = st + (i - st) * ratio, j = Math.floor(x), f = x - j, y0 = j < n ? src[j] : 0, y1 = j + 1 < n ? src[j + 1] : 0; return y0 + (y1 - y0) * f; }; // linear: the MPC's interpolation
      for (let i = a; i < b; i++) { const v = at(a, i); c[i] = pa >= 0 && i - a < xf ? v * ((i - a) / xf) + at(pa, i) * (1 - (i - a) / xf) : v; }
    }
  }
  const rate = o.rate ?? 26040, q = Math.pow(2, (o.bits ?? 12) - 1), full = pk * db(o.headroomDb ?? 6), drive = o.drive ?? 1.6;
  let ph = 1, hold = 0;
  for (let i = 0; i < n; i++) {
    ph += rate / sr; if (ph >= 1) { ph -= 1; hold = Math.round((c[i] / full) * q) / q; }
    c[i] = hold;
  }
  run(c, Biquad.make(sr, "lp", o.lp ?? 12000, 0.5412), Biquad.make(sr, "lp", o.lp ?? 12000, 1.3066));
  const k = Math.tanh(drive * 0.7);
  for (let i = 0; i < n; i++) c[i] = (Math.tanh(drive * c[i] * 0.7) / k) * full * 0.7;
};

// ------------------------------------------------------------------------------------ pump
/**
 * The kick pump as a sidechain compressor would draw it: per kick, gain falls by `depth` (scaled by
 * the kick's velocity) over a 5 ms raised-cosine attack, holds 15 ms, and breathes back over
 * `release` (default 60 % of a beat, synced to the tempo) along a squared curve; overlapping kicks
 * take the deeper dip, and a 3 ms smoother rounds the corners.
 */
export const pumpCurve = (kicks: Played[], tempo: number, sr: number, n: number, depth = 0.4, release?: number): Float32Array => {
  const g = new Float32Array(n).fill(1), rel = Math.max(release ?? 0, 0.6 * (60 / tempo)), att = 0.005, hold = 0.015;
  for (const k of kicks) {
    const i0 = Math.round(k.t * sr), dd = depth * Math.pow(clamp(k.v / 0.85, 0.3, 1.2), 0.7), len = Math.min(n - i0, Math.ceil((att + hold + rel) * sr));
    for (let i = Math.max(0, -i0); i < len; i++) {
      const s = i / sr, a = s < att ? 0.5 - 0.5 * Math.cos((Math.PI * s) / att) : s < att + hold ? 1 : Math.pow(1 - (s - att - hold) / rel, 2);
      const v = 1 - clamp(dd, 0, 0.95) * a; if (v < g[i0 + i]) g[i0 + i] = v;
    }
  }
  const k = onePoleCoef(sr, 1 / (TAU * 0.003)); let z = 1; for (let i = 0; i < n; i++) { z += k * (g[i] - z); g[i] = z; }
  return g;
};

// ------------------------------------------------------------------------------------ buses
/** Dusty drums, one lane at a time (like pads on a sampler): chops + converter, bus saturation, a
 *  low-mid box, the break's narrow stereo, and a short small room. In place. */
export const dustyDrums = (L: Buf, R: Buf, sr: number, o: NonNullable<LofiFx["drums"]>, onsets: number[], seed: number) => {
  const n = L.length, w = o.width ?? 0.35;
  for (let i = 0; i < n; i++) { const m = (L[i] + R[i]) * 0.5, s = (L[i] - R[i]) * 0.5 * w; L[i] = m + s; R[i] = m - s; }
  if (o.sampler) { sampler(L, sr, o.sampler, onsets); sampler(R, sr, o.sampler, onsets); }
  for (const c of [L, R]) run(c, Biquad.make(sr, "hp", 38, 0.7), Biquad.make(sr, "peak", 190, 0.8, 1.5), Biquad.make(sr, "peak", 3200, 0.9, -1.5), Biquad.make(sr, "lp", 11000, 0.6));
  const sat = o.sat ?? 1.4, pk = peak(L, R);
  if (sat > 1 && pk > 1e-9) { const ref = 0.6 / pk, k = Math.tanh(sat * 0.6); for (const c of [L, R]) for (let i = 0; i < n; i++) c[i] = ((Math.tanh(sat * c[i] * ref) / k) * 0.6) / ref; }
  if (o.room) { const [wL, wR] = smallRoom(L, R, sr, { rt60: 0.35, size: 0.55, er: 0.9, late: 0.35, hp: 180, lp: 6500, predelay: 0.003, damp: 4200, seed }); for (let i = 0; i < n; i++) { L[i] += wL[i] * o.room; R[i] += wR[i] * o.room; } }
};

/** The keys' own cassette: a slow random warble (its own wow), a two-tap chorus with random drift
 *  (L and R taps differ), a slow stereo tremolo, a darker top, and optionally the sampler. The
 *  warble is seeded by the piece, so every keys part shares one "tape": per part == on the bus. */
export const warblyKeys = (L: Buf, R: Buf, sr: number, o: NonNullable<LofiFx["keys"]>, seed: number, period?: number) => {
  const n = L.length, r = mkRng((seed ^ 0x3c6e) >>> 0), wc = o.warbleCents ?? 7;
  const wow = wander(n, sr, 0.18, 1.1, r, 12, period), cents = (i: number) => (wc / 2.2) * wow(i);
  pitchMod2(L, R, cents, cents);
  const ch = o.chorus ?? 0.3;
  if (ch > 0) {
    const mL = wander(n, sr, 0.25, 0.9, r, 6, period), mR = wander(n, sr, 0.25, 0.9, r, 6, period), sL = clone(L), sR = clone(R), mono = new Float32Array(n);
    for (let i = 0; i < n; i++) mono[i] = (sL[i] + sR[i]) * 0.5;
    for (let i = 0; i < n; i++) {
      const dL = (0.0085 + 0.0016 * mL(i)) * sr, dR = (0.0115 + 0.0016 * mR(i)) * sr;
      L[i] = sL[i] * (1 - ch * 0.4) + hermite(mono, i - dL) * ch; R[i] = sR[i] * (1 - ch * 0.4) + hermite(mono, i - dR) * ch;
    }
  }
  const tr = o.tremolo ?? 0.1, th = period ? Math.max(1, Math.round(3.6 * period)) / period : 3.6, tp = r() * TAU;
  if (tr > 0) for (let i = 0; i < n; i++) { const t = (TAU * th * i) / sr + tp; L[i] *= 1 - tr * (0.5 + 0.5 * Math.sin(t)); R[i] *= 1 - tr * (0.5 + 0.5 * Math.sin(t + Math.PI / 2)); }
  for (const c of [L, R]) run(c, Biquad.make(sr, "lp", o.lp ?? 7000, 0.6));
  if (o.sampler) { sampler(L, sr, o.sampler); sampler(R, sr, o.sampler); }
};

// ------------------------------------------------------------------------------------ entry points (render.ts)
/** The dusty profile the lo-fi vocabulary uses (and any lofi-style piece without its own). */
export const LOFI_DUSTY: LofiFx = {
  drums: { parts: ["kick", "snare", "ghost", "hat", "perc"], sampler: { rate: 26040, bits: 12, lp: 11000, drive: 1.7, pitch: -2, headroomDb: 9 }, width: 0.3, sat: 1.5, room: 0.28 },
  keys: { parts: ["chords", "lead", "counter", "arp"], warbleCents: 8, chorus: 0.32, tremolo: 0.1, lp: 8000 },
  tape: { bumpDb: 2, bumpHz: 72, hfHz: 12000, hissDb: -42, hyst: 0.5 },
  vinyl: { crackle: 16, pops: 0.35, surfaceDb: -44, rumbleDb: -46, scratches: 1, wobbleCents: 2, crackleDb: -30 },
  tilt: { lp: 11500, tiltDb: -1.5 },
  roomToneDb: -50,
};

/** Per stem, before the pump and the mix: the part's bus treatment, if the profile names it. */
export const lofiStem = (fx: LofiFx, partId: string, L: Buf, R: Buf, sr: number, onsets: number[], seed: number, period?: number) => {
  if (fx.drums?.parts.includes(partId)) dustyDrums(L, R, sr, fx.drums, onsets, seed + partId.length);
  else if (fx.keys?.parts.includes(partId)) warblyKeys(L, R, sr, fx.keys, seed, period);
};

/** The master side, in place, after the room: tape (with the record's wobble riding the same
 *  transport), vinyl, room tone, then the low-pass tilt. `dusty` = the lo-fi colour is on. */
export const lofiMaster = (L: Buf, R: Buf, sr: number, tapeFx: TapeFx | undefined, fx: LofiFx | undefined, seed: number) => {
  const vy = fx?.vinyl, tp = { ...(fx?.tape ?? {}), ...(tapeFx ?? {}) };
  if (tapeFx || fx) tape2(L, R, sr, { ...tp, wobble: vy?.wobbleCents ? { cents: vy.wobbleCents, hz: 100 / 3 / 60 } : undefined }, seed);
  if (vy) vinyl2(L, R, sr, vy, seed);
  if (fx?.roomToneDb !== undefined) {
    const n = L.length, r = mkRng((seed ^ 0x2b1d) >>> 0), g = rms(L, R) * db(fx.roomToneDb), a = pinkInto(new Float32Array(n), r, 1), b = pinkInto(new Float32Array(n), r, 1);
    for (const h of [a, b]) run(h, Biquad.make(sr, "hp", 70, 0.6), Biquad.make(sr, "lp", 2400, 0.5), Biquad.make(sr, "peak", 180, 1.2, 4));
    const fade = Math.min(n, Math.round(0.5 * sr)); for (let i = 0; i < n; i++) { const e = Math.min(1, i / fade); L[i] += a[i] * g * e; R[i] += (0.6 * b[i] + 0.4 * a[i]) * g * e; }
  }
  if (fx?.tilt) for (const c of [L, R]) {
    const fs = [Biquad.make(sr, "highshelf", 2200, 0.6, fx.tilt.tiltDb ?? -2), Biquad.make(sr, "lowshelf", 250, 0.7, 1)];
    if (fx.tilt.lp) fs.push(Biquad.make(sr, "lp", fx.tilt.lp, 0.6));
    run(c, ...fs);
  }
};

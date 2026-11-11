// A SMALL ROOM that does not ring. The old room (dsp.room) is 8 short static delay lines with 7
// hard early taps: its tail has a comb "tinniness" (research doc section 1.6). This one is the
// structure from Geraint Luff's "Let's Write a Reverb" (Signalsmith Audio, described there, written
// here from the description): a 4-step multichannel DIFFUSER (8 channels, each step = random delays
// inside a doubling window, random polarity, a Hadamard mix) builds dense early reflections, then an
// 8-channel FEEDBACK network (Householder mix, per-line damping, slowly modulated delay reads so no
// mode stays still) builds the tail. The two outputs take different channel sums, so L and R
// decorrelate like two ears. Pure in (input, sr, opts, seed).
import { Biquad, onePoleCoef, TAU } from "./dsp";
import { rng as mkRng } from "../core";

export type SmallRoomOpts = {
  /** decay time of the tail in seconds */ rt60: number;
  /** room size: the diffusion window and the feedback delays scale with it (1 = a ~4 x 5 m room) */ size?: number;
  /** early (diffused reflections) and late (tail) gains */ er?: number; late?: number;
  predelay?: number; hp?: number; lp?: number;
  /** high-frequency damping inside the tail, Hz (walls absorb highs first) */ damp?: number;
  seed?: number;
};

const hadamard8 = (x: Float64Array) => {
  for (let s = 1; s < 8; s <<= 1) for (let j = 0; j < 8; j += s << 1) for (let q = j; q < j + s; q++) { const a = x[q], b = x[q + s]; x[q] = a + b; x[q + s] = a - b; }
  for (let j = 0; j < 8; j++) x[j] *= 0.35355339059327373; // 1/sqrt(8): energy preserving
};

/** Returns the WET signal only: [L, R, lateL, lateR] (the late tail alone, for measurements). */
export const smallRoom = (L: ArrayLike<number>, R: ArrayLike<number>, sr: number, o: SmallRoomOpts) => {
  const n = L.length, r = mkRng((o.seed ?? 1) * 2654435761 >>> 0), size = o.size ?? 1;
  const inL = Float64Array.from(L), inR = Float64Array.from(R);
  for (const c of [inL, inR]) { const h = Biquad.make(sr, "hp", o.hp ?? 200, 0.7), l = Biquad.make(sr, "lp", o.lp ?? 8000, 0.7); for (let i = 0; i < n; i++) c[i] = l.tick(h.tick(c[i])); }
  const pd = Math.round((o.predelay ?? 0.006) * sr);
  // ---- diffuser: 4 steps, windows 3, 6, 12, 24 ms x size
  const steps = [0.003, 0.006, 0.012, 0.024].map((w) => {
    const lens = Array.from({ length: 8 }, (_, c) => Math.max(1, Math.round(((w * size * (c + r())) / 8) * sr)));
    return { lens, bufs: lens.map((l) => new Float64Array(l + 1)), idx: new Array(8).fill(0), flip: Array.from({ length: 8 }, () => (r() < 0.5 ? -1 : 1)), perm: shuffle(r) };
  });
  // ---- feedback network: 8 lines between 18 and 55 ms x size, exponentially spread, modulated
  const N = 8, base = Array.from({ length: N }, (_, c) => 0.018 * size * Math.pow(55 / 18, (c + 0.5 * r()) / N));
  const maxMod = 0.0006 * sr, lens = base.map((s) => Math.round(s * sr)), fb = lens.map((l) => new Float64Array(l + Math.ceil(maxMod) + 4)), w = new Array(N).fill(0);
  const gain = base.map((s) => Math.pow(10, (-3 * s) / Math.max(0.05, o.rt60))), dk = onePoleCoef(sr, o.damp ?? 5200), lp = new Float64Array(N);
  const modHz = Array.from({ length: N }, () => 0.35 + 0.9 * r()), modPh = Array.from({ length: N }, () => r() * TAU), modAmt = Array.from({ length: N }, () => maxMod * (0.4 + 0.6 * r()));
  const outL = new Float32Array(n), outR = new Float32Array(n), tL = new Float32Array(n), tR = new Float32Array(n);
  const x = new Float64Array(N), y = new Float64Array(N), er = o.er ?? 0.5, late = o.late ?? 0.6;
  for (let i = 0; i < n; i++) {
    const a = i >= pd ? inL[i - pd] : 0, b = i >= pd ? inR[i - pd] : 0;
    for (let c = 0; c < N; c++) x[c] = c & 1 ? b : a;
    // diffuse
    for (let k = 0; k < 4; k++) {
      const st = steps[k], bufs = st.bufs, idx = st.idx, flip = st.flip, perm = st.perm;
      for (let c = 0; c < N; c++) { const buf = bufs[c], L0 = buf.length, wi = idx[c], nx = wi + 1 === L0 ? 0 : wi + 1; buf[wi] = x[c]; y[c] = buf[nx] * flip[c]; idx[c] = nx; }
      for (let c = 0; c < N; c++) x[c] = y[perm[c]];
      hadamard8(x);
    }
    let eL = 0, eR = 0; for (let c = 0; c < N; c++) { if (c & 1) eR += x[c] * (c & 2 ? -1 : 1); else eL += x[c] * (c & 2 ? -1 : 1); }
    // feedback: read (modulated, linear interp), Householder mix, damp, write input + feedback
    let sum = 0;
    for (let c = 0; c < N; c++) {
      const buf = fb[c], L0 = buf.length, d = lens[c] + modAmt[c] * Math.sin(modPh[c] + (TAU * modHz[c] * i) / sr), rp = w[c] - d, j = Math.floor(rp), f = rp - j;
      const i0 = ((j % L0) + L0) % L0, i1 = (i0 + 1) % L0; y[c] = buf[i0] + (buf[i1] - buf[i0]) * f; sum += y[c];
    }
    const h = (2 / N) * sum;
    let lL = 0, lR = 0;
    for (let c = 0; c < N; c++) {
      const v = (y[c] - h) * gain[c]; lp[c] += dk * (v - lp[c]);
      const buf = fb[c]; buf[w[c]] = lp[c] + x[c] * 0.5; w[c] = (w[c] + 1) % buf.length;
      if (c & 1) lR += y[c] * (c & 2 ? -1 : 1); else lL += y[c] * (c & 2 ? -1 : 1);
    }
    tL[i] = lL * late * 0.5; tR[i] = lR * late * 0.5;
    outL[i] = eL * er * 0.5 + tL[i]; outR[i] = eR * er * 0.5 + tR[i];
  }
  return [outL, outR, tL, tR] as const;
};

function shuffle(r: () => number) { const p = [0, 1, 2, 3, 4, 5, 6, 7]; for (let i = 7; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } return p; }

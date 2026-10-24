// Electric pianos, modelled from the mechanism, not from a 2-op FM preset.
//
// RHODES (Fender Rhodes Mk I style). A neoprene hammer strikes a tine (a stiff rod) bolted to a tone bar;
// the tine swings in front of a magnetic pickup. (a) Tine = modal sum: the fundamental (T60 ~6 s at C3,
// ~1.5 s at C6) plus the tine's first inharmonic mode at ~7.1-7.3 f0 that dies in 50-150 ms (the "ping").
// (b) Hammer: a raised-cosine contact of 1-3 ms (shorter when harder); velocity sets the displacement.
// (c) Pickup: the field of a pole piece seen by a tine that sits OFF-centre (voicing offset d):
// y = (x+d)/sqrt((x+d)^2+h^2) - d/sqrt(d^2+h^2). Asymmetric, so even harmonics appear, and the
// nonlinearity only bites at large swings: bell-clean at pp, the growling "bark" at ff (DAFx-17 Rhodes /
// Wurlitzer model; ISMA 2014). (d) One stereo tremolo LFO for the instrument, L/R 180 degrees apart.
// (e) A small amp: 2x oversampled soft clip, +2 dB at 250 Hz, low-pass ~6.5 kHz.
// WURLITZER (200A style). A steel reed, plucked by a felt hammer, over an electrostatic pickup: reed modes
// 1 and 6.27 (cantilever), the pickup is a capacitor, y = x/(1-kx): strongly asymmetric, reedy and
// nasal, growling hard at ff; shorter sustain; mono amplitude tremolo.
// DX (the '83 digital EP, re-implemented from the published algorithm-5 idea, no ROM data, no code copied):
// three 2-operator stacks: 1:1 body, 1:14 tine "bark" with a 20-60 ms index, 1:1 detuned warmth; each
// modulator's index decays faster than its carrier, all scaled by velocity.
// Anti-clone: per note +-3 c (opts.detune widens it), free tine phase, +-15 % ping, +-0.6 dB; slow
// instrument-wide pitch drift for Rhodes/Wurli (the mechanical instrument is never perfectly in tune).
import { TAU, clamp, pan, Biquad, gauss } from "./dsp";
import type { Played } from "./perform";
import { type Out, type Opts, num, str, out0, mtof, noteVar, strikeCounter, drift, dcBlock, shape2x, noiseBurst, byTime, nextSameKey } from "./keysCore";

type Model = "rhodes" | "wurli" | "dx";
const LEVEL: Record<Model, number> = { rhodes: 0.29, wurli: 0.24, dx: 0.16 }; // matched to the legacy ePiano stem RMS (tools/keys-demo.mjs calibrate)

export const electricPiano = (keys: Played[], sr: number, n: number, o: Opts, seed: number, model: Model = str(o, "model", "rhodes") as Model): Out => {
  const out = out0(n), sorted = byTime(keys), width = num(o, "width", 0.35), detSd = num(o, "detune", 4) * 0.5;
  const dr = model === "dx" ? null : drift(seed, n, sr, 2.5);
  const note = new Float64Array(Math.ceil(12 * sr)), strike = strikeCounter();
  sorted.forEach((k, idx) => {
    const i0 = Math.round(k.t * sr); if (i0 >= n) return;
    const nv = noteVar(seed, idx, k, { cents: Math.max(1, detSd), db: 0.6, bright: 0.12, decay: 0.08 }, strike(k.p));
    const v = clamp(k.v * nv.bright, 0.02, 1), m = k.p;
    const f = mtof(m) * Math.pow(2, (nv.cents + (dr ? dr[i0] : 0)) / 1200);
    const dur = Math.max(0.01, Math.min(k.off, nextSameKey(sorted, idx)) - k.t);
    const relTau = model === "wurli" ? 0.05 : model === "dx" ? 0.12 : 0.075;
    const t60 = (model === "wurli" ? clamp(3.2 * Math.pow(2, -(m - 48) / 16), 0.5, 6) : clamp(6 * Math.pow(2, -(m - 48) / 18), 0.8, 9)) * nv.decay;
    const len = Math.min(note.length, n - i0, Math.ceil((dur + relTau * 7) * sr), Math.ceil(t60 * 1.3 * sr));
    if (len <= 0) return;
    const relI = Math.round(dur * sr), sig = 6.91 / t60, decR = Math.exp(-1 / (relTau * sr));
    const buf = note.subarray(0, len); buf.fill(0);
    const contact = Math.max(2, Math.round(((model === "wurli" ? 2.4 : 3) - 1.8 * v) / 1000 * sr));
    if (model === "dx") {
      // three stacks, phase modulation; the carriers start at zero phase, the modulators free
      const I1 = 1.1 + 2.3 * v * v, I3 = 0.5 + 0.7 * v, I2 = Math.min(0.2 + 3.2 * Math.pow(v, 1.6), Math.max(0, (0.42 * sr / f - 1) / 14 - 1)); // the 14:1 bark's sidebands stay under Nyquist (no aliasing up high)
      const tb = 0.02 + 0.04 * (1 - v), w = TAU * f / sr, d2 = Math.pow(2, 2 / 1200), d3 = Math.pow(2, -3 / 1200);
      let pm2 = nv.phase(), pm3 = nv.phase(), fb = 0;
      const e1 = Math.exp(-sig / sr), e1i = Math.exp(-1 / (0.55 * sr)), e2 = Math.exp(-1 / (0.28 * sr)), e2i = Math.exp(-1 / (tb * sr)), e3 = Math.exp(-(sig * 0.7) / sr), e3i = Math.exp(-1 / (1.5 * sr));
      let a1 = 1, i1 = I1, a2 = 0.55 * v, i2 = I2, a3 = 0.35, i3 = I3, rel = 1;
      for (let i = 0; i < len; i++) {
        const t = i * w;
        const m1 = Math.sin(t + 0.5 * fb); fb = m1; // op feedback on the body modulator
        const y = a1 * Math.sin(t + i1 * m1) + a2 * Math.sin(t * d2 + i2 * Math.sin(14 * t + pm2)) + a3 * Math.sin(t * d3 + i3 * Math.sin(t * d3 + pm3));
        buf[i] = y * rel * Math.min(1, i / contact);
        a1 *= e1; i1 *= e1i; a2 *= e2; i2 *= e2i; a3 *= e3; i3 *= e3i; if (i >= relI) rel *= decR;
      }
      void pm3;
    } else {
      // tine / reed displacement: fundamental + the first inharmonic mode
      const pr = model === "wurli" ? 6.27 : 7.1 + 0.25 * ((m * 0.618) % 1); // per-key tine geometry
      const pingA = (model === "wurli" ? 0.18 : 0.28) * Math.pow(v, 1.4) * (1 + 0.15 * clamp(gauss(nv.r), -2, 2));
      const pingT = (model === "wurli" ? 0.035 : 0.05 + 0.1 * (1 - v)) * Math.pow(262 / f, 0.3);
      const X = Math.pow(v, 0.85) * (model === "wurli" ? 0.9 : 1.15) * clamp(Math.pow(262 / f, 0.25), 0.6, 1.4); // bigger swings low on the keyboard
      const w1 = TAU * f / sr, w2 = TAU * f * pr / sr, e1 = Math.exp(-sig / sr), e2 = Math.exp(-1 / (pingT * sr));
      let c1 = 0, s1 = 0, c2 = 0, s2 = 0; { const p2 = nv.phase(); c1 = 1; s1 = 0; c2 = Math.cos(p2); s2 = Math.sin(p2); }
      const cw1 = Math.cos(w1), sw1 = Math.sin(w1), cw2 = Math.cos(w2), sw2 = Math.sin(w2);
      const d = model === "wurli" ? 0 : 0.22 + 0.08 * ((m * 0.37) % 1), h = 0.72, base = d / Math.sqrt(d * d + h * h);
      const kC = 0.3 + 0.45 * v; // Wurli pickup: the reed closes on the plate
      let rel = 1;
      for (let i = 0; i < len; i++) {
        const x = X * (s1 + pingA * s2) * Math.min(1, i / contact);
        let y: number;
        if (model === "wurli") { const xx = clamp(x, -0.95 / kC, 0.95 / kC) * kC; y = xx / (1 - xx) / Math.max(kC, 1e-3); }
        else y = (x + d) / Math.sqrt((x + d) * (x + d) + h * h) - base;
        buf[i] = y * rel;
        let t2 = (c1 * cw1 - s1 * sw1) * e1; s1 = (c1 * sw1 + s1 * cw1) * e1; c1 = t2;
        t2 = (c2 * cw2 - s2 * sw2) * e2; s2 = (c2 * sw2 + s2 * cw2) * e2; c2 = t2;
        if (i >= relI) rel *= decR;
      }
      dcBlock(buf, sr, 15);
      // damper felt on key-up
      if (relI < len) noiseBurst(buf, relI, Math.round(0.03 * sr), 600, 0.8, 0.004 * v, nv.r, sr);
    }
    const g = Math.pow(k.v, 1.1) * LEVEL[model] * nv.gain, [gl, gr] = pan(clamp((m - 64) / 30, -1, 1) * width);
    for (let i = 0; i < len; i++) { const y = buf[i] * g; out.L[i0 + i] += y * gl; out.R[i0 + i] += y * gr; }
  });
  // the amp: 2x oversampled soft clip, a low-mid bump, the speaker roll-off
  const drive = num(o, "drive", model === "wurli" ? 1.6 : 1.25);
  for (const c of [out.L, out.R]) {
    shape2x(c, (x) => Math.tanh(drive * x + 0.05 * drive * x * x) / drive);
    Biquad.make(sr, "peak", model === "wurli" ? 900 : 250, 0.8, model === "wurli" ? 2.5 : 2).run(c);
    Biquad.make(sr, "lp", model === "wurli" ? 5200 : model === "dx" ? 9000 : 6500, 0.6).run(c);
    dcBlock(c, sr, 10);
  }
  // tremolo: one LFO for the whole instrument; stereo auto-pan (Rhodes Suitcase) or mono (Wurli)
  const rate = num(o, "trem", 4.6), depth = num(o, "tremDepth", model === "wurli" ? 0.18 : 0.3);
  if (rate > 0 && depth > 0) {
    const ph = ((seed * 0.6180339) % 1) * TAU;
    for (let i = 0; i < n; i++) { const s = Math.sin((TAU * rate * i) / sr + ph) * depth; if (model === "wurli") { const a = 1 - depth * (0.5 + 0.5 * s / depth); out.L[i] *= a; out.R[i] *= a; } else { out.L[i] *= 1 - s; out.R[i] *= 1 + s; } }
  }
  return out;
};

// ENSEMBLE VOICES, v2 (2026-09-28 sound rebuild, track S4): string sections as independent
// players, pizzicato, a bowed-waveguide solo, section brass, flute and clarinet, a glottal-source
// choir, plucked guitars (nylon, steel, clean electric) and harp, and four basses. Every note varies
// (seeded per note), nothing restarts at phase zero, and players drift like players.
// These are CINEMATIC, STYLIZED models: honest physics where we can reach it (plucks, bows, the
// voice source and its formants), careful spectral models where we can't (brass, winds). A human
// listens before any acoustic timbre carries a film (spec 08 DECISION B).
// The old voices stay in instruments.ts / orchestra.ts behind `opts.legacy` (shipped films).
import { type Rng, TAU, clamp, pan, SVF, Biquad, blep } from "./dsp";
import type { Played } from "./perform";
import {
  type Out, type Opts, num, f0, out0, wn, gn, subRng, keysRng, concurrency, Drift, Reson, runBody, VIOLIN_BODY, CELLO_BODY,
  type IRSpec, monoLows, IR_NYLON, IR_STEEL, IR_HARP, IR_UPRIGHT, bodyIR, convolve, pluckExc, ksRender, headRms, FORMANTS, FORMANT_BW, BRASS_FORMANT, bumpDb,
} from "./ensembleCore";

// Output levels, matched to the legacy voices' stem RMS on the same material (tools/ensemble-check.mjs
// calibrate), so the style vocabularies' calibrated gains and stem targets still hold.
const LEVEL = { strings: 0.125, pizz: 0.16, solo: 0.146, cello: 1.13, brass: 0.059, horn: 1.4, flute: 0.119, clarinet: 0.118, choir: 3.07, guitar: 0.066, harp: 0.0757, bass: 0.3, synthBass: 0.3 };

const addStereo = (o: Out, i0: number, y: Float64Array | Float32Array, gl: number, gr: number) => { const m = Math.min(y.length, o.L.length - i0); for (let i = Math.max(0, -i0); i < m; i++) { o.L[i0 + i] += y[i] * gl; o.R[i0 + i] += y[i] * gr; } };
const onsetI = (t: number, sr: number) => Math.max(0, Math.round(t * sr));

// ------------------------------------------------------------------ strings: the section
// Seating (audience view): violins left, violas centre-right, cellos and basses right.
const SEAT = [0.3, 0.12, -0.3];
const BUS_BODY: [typeof VIOLIN_BODY, number][] = [[CELLO_BODY, 1], [VIOLIN_BODY, 0.82], [VIOLIN_BODY, 1]];
const regOf = (p: number, bassRole: boolean) => (bassRole || p < 55 ? 0 : p < 63 ? 1 : 2);

/**
 * String section: each note is played by `players` (default 10, divided across a chord) independent
 * players. Each has its own onset (+-12 ms), tuning (+-6 c), 1/f drift, vibrato (5-6.5 Hz, 10-25 c,
 * delayed 150-400 ms, its rate wandering), bow attack and release, a band-limited sawtooth (the
 * Helmholtz motion) with pulse-synchronous bow noise and a scratch at the attack, and a low-pass that
 * opens with loudness (cutoff ~ amp^0.7). Players sum into register buses (cellos, violas, violins),
 * each through its measured body resonances (ensembleCore). `pizz: true` plucks instead.
 * Options kept from v1: attack, release, width, bright, bass; new: players, vibrato, noise, pizz.
 */
export const strings = (keys: Played[], sr: number, n: number, o: Opts, r0: Rng): Out => {
  if (o.pizz === true) return pizzicato(keys, sr, n, o, r0);
  const atk = num(o, "attack", 0.45), rel = num(o, "release", 0.9), w = num(o, "width", 0.8), bright = num(o, "bright", 1), S = Math.round(num(o, "players", 10)), vibAmt = num(o, "vibrato", 1), noiseAmt = num(o, "noise", 1), bassRole = o.bass === true;
  const buses = [out0(n), out0(n), out0(n)], used = [false, false, false], conc = concurrency(keys), short = atk < 0.06;
  keys.forEach((k, ki) => {
    const r = subRng(r0), f = f0(k.p), reg = regOf(k.p, bassRole), P = clamp(Math.round(S / conc[ki]) + 1, 3, S), dur = Math.max(0.03, k.off - k.t), bus = buses[reg]; used[reg] = true;
    const g = (LEVEL.strings * (bassRole ? 1.6 : 1) * Math.min(1, Math.pow(1047 / f, 0.8)) /* above C6 the section thins */ * Math.pow(k.v, 1.2)) / Math.sqrt(P), sig = (short ? 2.5 : 3 + 4 * clamp(atk / 0.4, 0, 1)) / 1000;
    for (let p = 0; p < P; p++) {
      const i0 = onsetI(k.t + clamp(gn(r) * sig, -0.015, 0.015), sr), a = Math.max(0.007, atk * (0.75 + 0.5 * r())), rl = rel * (0.85 + 0.3 * r()), vel = k.v * (0.88 + 0.24 * r());
      const cents0 = clamp(gn(r) * 3, -7, 7), vr = 5 + 1.5 * r(), vd = (10 + 15 * r()) * vibAmt, vDel = 0.15 + 0.25 * r(), dr = new Drift(r, 0.35, sr), vw = new Drift(r, 0.5, sr, 256), ad = new Drift(r, 0.3, sr, 256);
      const [gl, gr] = pan(clamp((bassRole ? 0.12 : SEAT[reg]) * w + (r() - 0.5) * w, -1, 1)), lp = new SVF(sr, 2000, 0.6), cutK = reg === 0 ? 0.7 : 1;
      const len = Math.min(n - i0, Math.ceil((dur + rl * 1.6) * sr)), riseEnd = 1 - Math.exp(-dur / (a / 3)), scratch = (short ? 0.5 : 0.18) * noiseAmt, bowN = (0.05 + 0.07 * (1 - k.v)) * noiseAmt;
      let ph = r(), vph = r() * TAU, nz = 0, env = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        env = t < dur ? 1 - Math.exp(-t / (a / 3)) : riseEnd * Math.exp(-(t - dur) / (rl / 3));
        const vibR = clamp((t - vDel) / 0.35, 0, 1);
        vph += (TAU * vr * (1 + 0.1 * vw.tick())) / sr;
        const cents = cents0 + 3 * dr.tick() + (vibR > 0 ? vd * vibR * Math.sin(vph) : 0), inc = (f * Math.pow(2, cents / 1200)) / sr;
        ph += inc; if (ph >= 1) ph -= 1;
        const x0 = wn(r); nz += 0.25 * (x0 - nz); // one-pole low-pass of the noise; x0 - nz is its high-passed residue
        const bn = (x0 - nz) * (ph < 0.12 ? 1 : 0.3) * (bowN + scratch * Math.exp(-t / 0.035));
        if ((i & 15) === 0) lp.set(clamp((650 + 7500 * Math.pow(env * vel, 0.7)) * bright * cutK, f * 1.5, sr * 0.45), 0.65);
        const y = lp.tick(2 * ph - 1 - blep(ph, inc) + bn) * env * g * (1 + 0.06 * ad.tick()), j = i0 + i;
        bus.L[j] += y * gl; bus.R[j] += y * gr;
      }
    }
  });
  return mixBuses(buses, used, sr, n, bassRole);
};
const mixBuses = (buses: Out[], used: boolean[], sr: number, n: number, bassRole: boolean): Out => {
  const out = out0(n);
  buses.forEach((b, i) => { if (!used[i]) return; const [body, sc] = BUS_BODY[i]; runBody(b.L, sr, body, sc * 0.97); runBody(b.R, sr, body, sc * 1.03); for (let j = 0; j < n; j++) { out.L[j] += b.L[j]; out.R[j] += b.R[j]; } });
  if (!bassRole) { Biquad.make(sr, "hp", 90, 0.7).run(out.L); Biquad.make(sr, "hp", 90, 0.7).run(out.R); }
  return monoLows(out, sr);
};

/** Pizzicato section: 2-5 players per note, each a finger-plucked string (extended KS) through the same register bodies. */
const pizzicato = (keys: Played[], sr: number, n: number, o: Opts, r0: Rng): Out => {
  const w = num(o, "width", 0.8), S = Math.round(num(o, "players", 10)), bassRole = o.bass === true, conc = concurrency(keys);
  const buses = [out0(n), out0(n), out0(n)], used = [false, false, false];
  keys.forEach((k, ki) => {
    const reg = regOf(k.p, bassRole), P = clamp(Math.round(S / conc[ki] / 2) + 1, 2, 5); used[reg] = true;
    for (let p = 0; p < P; p++) {
      const r = subRng(r0), f = f0(k.p) * Math.pow(2, clamp(gn(r) * 3, -6, 6) / 1200), i0 = onsetI(k.t + clamp(gn(r) * 0.007, -0.015, 0.015), sr), v = k.v * (0.85 + 0.3 * r());
      const exc = pluckExc(sr, f, { width: 0.0025 * (1.25 - 0.45 * v), beta: 0.2 + 0.12 * r(), noise: 0.3, lp: f * 2.5 * (0.6 + 0.8 * v) }, r);
      const T60 = clamp(1.1 * Math.pow(262 / f, 0.7), 0.25, 2.6) * (0.9 + 0.2 * r()), len = Math.min(n - i0, Math.ceil(T60 * 1.2 * sr));
      if (len <= 0) continue;
      const y = ksRender(sr, { f, T60, loss: 0.4, exc, len, relI: len, relT60: 1, pol2: { cents: 0.4 + 0.6 * r(), mix: 0.6, t60: 0.5, share: r() } });
      const g = (LEVEL.pizz * Math.pow(v, 1.3)) / headRms(y, sr) / Math.sqrt(P), [gl, gr] = pan(clamp(SEAT[reg] * w + (r() - 0.5) * 0.6 * w, -1, 1));
      addStereo(buses[reg], i0, y, gl * g, gr * g);
    }
  });
  return mixBuses(buses, used, sr, n, bassRole);
};

// ------------------------------------------------------------------ bowed solo: a waveguide string
/**
 * Solo violin / cello: a bowed digital waveguide after STK's Bowed (Cook & Scavone, STK licence,
 * MIT-style; re-implemented, not copied): neck and bridge delay lines around a bow junction whose
 * friction table is (|slope (dv + 0.001)| + 0.75)^-4, a one-pole string loss at the bridge, vibrato
 * as a delay-length change. Touching notes are one bow stroke with a finger slide (legato), so a line
 * sings instead of re-attacking. The bridge signal goes through the measured body (ensembleCore).
 * The loop is tuned exactly: the loss filter's phase delay is taken out of the delay lengths.
 * Options: attack, vibrato (cents), pan, cello; new: pressure (0..1), position (0..1).
 */
export const bowedSolo = (keys: Played[], sr: number, n: number, o: Opts, r0: Rng): Out => {
  const out = out0(n), cello = o.cello === true, atk = num(o, "attack", 0.09), vibC = num(o, "vibrato", cello ? 12 : 22), [gl, gr] = pan(num(o, "pan", -0.1));
  const press = num(o, "pressure", 0.5), posn = num(o, "position", 0.5), mono = new Float32Array(n);
  const ks = keys.slice().sort((a, b) => a.t - b.t || a.p - b.p), lines: Played[][] = [];
  for (const k of ks) { const ln = lines.find((l) => { const e = l[l.length - 1]; return e.t < k.t - 0.02 && Math.abs(e.off - k.t) < 0.06; }); if (ln) ln.push(k); else lines.push([k]); }
  const pole = 0.75 - (0.2 * 22050) / sr, sg = 0.95;
  for (const ln of lines) {
    const r = subRng(r0), start = ln[0].t, end = ln[ln.length - 1].off, i0 = onsetI(start, sr), fLo = f0(Math.min(...ln.map((k) => k.p))) * 0.97;
    const M = Math.ceil(sr / fLo) + 8, neck = new Float64Array(M), brid = new Float64Array(M); let wi = 0, sl = 0;
    const tail = cello ? 1.2 : 0.7, len = Math.min(n - i0, Math.ceil((end - start + tail) * sr)); if (len <= 0) continue;
    const beta = 0.027236 + 0.2 * posn * (0.85 + 0.3 * r()), slope0 = 5 - 4 * (0.88 + 0.12 * clamp(press, 0, 1)) /* below ~0.9 the string slips into its octave on high legato notes (tools/ensemble-check.mjs track) */, dr = new Drift(r, 0.3, sr), vw = new Drift(r, 0.6, sr, 256);
    let seg = 0, fCur = f0(ln[0].p), vph = r() * TAU, env = 0, segT = 0, vel = ln[0].v, slope = slope0 * (0.9 + 0.2 * r());
    const vr = 5.3 + 0.7 * r(), tune = ln.map(() => clamp(gn(r) * 2.5, -5, 5)), kEnv = Math.exp(-1 / (Math.max(0.01, atk / 3) * sr)), kRel = Math.exp(-1 / (0.03 * sr)), kGl = Math.exp(-1 / (0.02 * sr)), kVel = Math.exp(-1 / (0.06 * sr));
    const y = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      const t = start + i / sr;
      while (seg + 1 < ln.length && t >= ln[seg + 1].t) { seg++; segT = 0; }
      const k = ln[seg], fT = f0(k.p) * Math.pow(2, tune[seg] / 1200); fCur = fT + (fCur - fT) * kGl; vel = k.v + (vel - k.v) * kVel;
      const on = t < end; env = on ? 1 + (env - 1) * kEnv : env * kRel;
      const vib = vibC * clamp((segT - 0.18) / 0.35, 0, 1), vibc = vib > 0 ? vib * Math.sin(vph) : 0; vph += (TAU * vr * (1 + 0.08 * vw.tick())) / sr; segT += 1 / sr;
      const fr = fCur * Math.pow(2, (vibc + 2 * dr.tick()) / 1200), w = (TAU * fr) / sr, pd = Math.atan2(pole * Math.sin(w), 1 - pole * Math.cos(w)) / w;
      const P0 = sr / fr, base = clamp(P0 - pd + 0.3 + 0.00045 * P0, 4, M - 4) /* measured junction offset, tools/ensemble-check.mjs check */, Dn = base * (1 - beta), Db = base * beta;
      const rn = wi - Dn, rb = wi - Db, rn0 = Math.floor(rn), rb0 = Math.floor(rb), fn = rn - rn0, fb = rb - rb0;
      const nOut = neck[(rn0 + M) % M] * (1 - fn) + neck[(rn0 + 1 + M) % M] * fn, bOut = brid[(rb0 + M) % M] * (1 - fb) + brid[(rb0 + 1 + M) % M] * fb;
      sl = sg * (1 - pole) * bOut + pole * sl;
      const bridgeRefl = -sl, nutRefl = -nOut, strVel = bridgeRefl + nutRefl;
      const bowVel = (0.03 + 0.2 * (0.3 + 0.7 * vel)) * env * (1 + 0.012 * wn(r)), dv = bowVel - strVel;
      const tbl = Math.min(1, Math.pow(Math.abs(slope * (dv + 0.001)) + 0.75, -4)), nv = dv * tbl;
      neck[wi] = bridgeRefl + nv; brid[wi] = nutRefl + nv; wi = wi + 1 === M ? 0 : wi + 1;
      y[i] = bOut;
    }
    const g = LEVEL.solo * (cello ? LEVEL.cello : 1); for (let i = 0; i < len; i++) mono[i0 + i] += y[i] * g;
  }
  const L = Float32Array.from(mono), R = Float32Array.from(mono), body = cello ? CELLO_BODY : VIOLIN_BODY;
  runBody(L, sr, body, 0.99); runBody(R, sr, body, 1.01);
  Biquad.make(sr, "lp", Math.min(9000, sr * 0.45), 0.7).run(L); Biquad.make(sr, "lp", Math.min(9000, sr * 0.45), 0.7).run(R);
  for (let i = 0; i < n; i++) { out.L[i] = L[i] * gl; out.R[i] = R[i] * gr; }
  return out;
};

// ------------------------------------------------------------------ additive core (brass, winds)
/** sum_n w[n] sin(n th) by the Chebyshev recurrence: one sin + one cos per sample, band-limited by construction. */
const harmonics = (th: number, w: Float64Array, N: number) => { const s1 = Math.sin(th), c2 = 2 * Math.cos(th); let sp = 0, sc = s1, acc = w[0] * s1; for (let h = 1; h < N; h++) { const sn = c2 * sc - sp; acc += w[h] * sn; sp = sc; sc = sn; } return acc; };
const BLK = 32;

// ------------------------------------------------------------------ brass
/**
 * Cinematic brass: a spectral model of a lip-reed instrument. Harmonic n's amplitude follows the
 * loudness L as L^(1 + gamma (n-1)) (Risset / Beauchamp: brass brightens with loudness, and the upper
 * harmonics build after the fundamental, the "blat"), times a bell-radiation formant (trumpet,
 * trombone or horn, ensembleCore). A lip scoop of -30..-50 c into each note, breath and a tongued
 * puff, growl at ff, 3 players per section by default with their own timing, tuning and drift.
 * Options: attack, bright, width; new: players, release, vibrato (cents), type (trumpet|trombone|horn).
 */
export const brass = (keys: Played[], sr: number, n: number, o: Opts): Out => {
  const out = out0(n), r0 = keysRng(keys, 0xb7a55), atk = num(o, "attack", 0.06), bright = num(o, "bright", 1), w = num(o, "width", 0.5), rel = num(o, "release", 0.14), vibC = num(o, "vibrato", 8);
  const players = Math.round(num(o, "players", 3)), conc = concurrency(keys), gamma = 0.55 / Math.max(0.3, bright);
  const fixed = typeof o.type === "string" ? String(o.type) : bright < 0.75 ? "horn" : null;
  keys.forEach((k, ki) => {
    const P = clamp(Math.round(players / conc[ki]), 1, players), type = BRASS_FORMANT[fixed ?? (k.p >= 58 ? "trumpet" : "trombone")] ?? BRASS_FORMANT.trumpet, dur = Math.max(0.03, k.off - k.t);
    for (let p = 0; p < P; p++) {
      const r = subRng(r0), i0 = onsetI(k.t + clamp(gn(r) * 0.006, -0.012, 0.012), sr), f = f0(k.p) * Math.pow(2, clamp(gn(r) * 2.5, -5, 5) / 1200), v = clamp(k.v * (0.92 + 0.16 * r()), 0, 1);
      const N = Math.max(1, Math.min(40, Math.floor((0.45 * sr) / (f * 1.04)))), gdb = new Float64Array(N), wA = new Float64Array(N), wB = new Float64Array(N), wC = new Float64Array(N);
      for (let h = 0; h < N; h++) gdb[h] = Math.pow(10, bumpDb((h + 1) * f, type) / 20) * Math.pow(h + 1, -0.35);
      const a = atk * (0.8 + 0.4 * r()), rl = rel * (0.85 + 0.3 * r()), scoop = -(30 + 20 * r()), sT = (0.04 + 0.04 * r()) / 3, dyn = 0.22 + 0.78 * v, dr = new Drift(r, 0.3, sr);
      const itd = Math.round(Math.abs(((k.p - 60) / 30) * w) * 0.0005 * sr + r() * 0.0002 * sr), vr = 5 + r(), vph0 = r() * TAU, growl = Math.max(0, v - 0.75) * 0.6, gph = r() * TAU, bp = new SVF(sr, clamp(f * 3, 700, 3000), 0.8), [gl, gr] = pan(clamp(((k.p - 60) / 30) * w + (r() - 0.5) * 0.9 * w, -1, 1));
      const len = Math.min(n - i0, Math.ceil((dur + rl * 1.5) * sr)), riseEnd = 1 - Math.exp(-dur / (a / 3)), g = (LEVEL.brass * (type === BRASS_FORMANT.horn ? LEVEL.horn : 1) * Math.sqrt(v)) / Math.sqrt(P);
      let th = r() * TAU;
      const weights = (t: number, dst: Float64Array) => { const e = t < dur ? 1 - Math.exp(-t / (a / 3)) : riseEnd * Math.exp(-(t - dur) / (rl / 4)), L = Math.max(1e-4, e * dyn);
        for (let h = 0; h < N; h++) dst[h] = gdb[h] * Math.pow(L, 1 + gamma * h); return e; };
      let e0 = weights(0, wA), e1 = e0;
      for (let i = 0; i < len; i++) {
        const bi = i % BLK; if (bi === 0) { e0 = weights(i / sr, wA); e1 = weights((i + BLK) / sr, wB); }
        const x = bi / BLK; for (let h = 0; h < N; h++) wC[h] = wA[h] + (wB[h] - wA[h]) * x;
        const t = i / sr, e = e0 + (e1 - e0) * x, vibR = dur > 0.5 ? clamp((t - 0.3) / 0.4, 0, 1) : 0;
        const cents = scoop * Math.exp(-t / sT) + 3 * dr.tick() + (vibR > 0 ? vibC * vibR * Math.sin(TAU * vr * t + vph0) : 0);
        th += (TAU * f * Math.pow(2, cents / 1200)) / sr; if (th > TAU) th -= TAU;
        bp.tick(wn(r)); const breath = bp.bp * (0.02 * e * dyn + 0.12 * v * Math.exp(-t / 0.02));
        const am = growl > 0 ? 1 + growl * Math.sin(TAU * 31 * t + gph) : 1, y = (harmonics(th, wC, N) * am + breath) * g, j = i0 + i;
        // a spaced microphone pair: the far channel hears each player a fraction of a millisecond later
        if (gl >= gr) { out.L[j] += y * gl; if (j + itd < n) out.R[j + itd] += y * gr; } else { if (j + itd < n) out.L[j + itd] += y * gl; out.R[j] += y * gr; }
      }
    }
  });
  return monoLows(out, sr);
};

// ------------------------------------------------------------------ woodwinds
// Flute: nearly a sine when soft, the 2nd harmonic strong in the low register, richer when loud
// (Fletcher & Rossing 1998, ch. 16). Clarinet: odd harmonics under the bore cut-off (~1.6 kHz), both
// parities above it (Benade). Shapes voiced by hand.
const FLUTE = [1, 0.45, 0.2, 0.1, 0.05, 0.03, 0.02, 0.012, 0.008, 0.005];
/**
 * Woodwind: flute (jet: a chiff and an overblown octave flicker at the attack, breath noise both
 * broadband and pitched at the jet, amplitude-led vibrato) or `reed: true` clarinet (odd harmonics,
 * reed noise, no vibrato). Slurred notes (touching) glide without re-tonguing. Seeded per note.
 * Options: reed, breath, width; new: vibrato (cents).
 */
export const woodwind = (keys: Played[], sr: number, n: number, o: Opts, r0: Rng): Out => {
  const out = out0(n), reed = o.reed === true, breath = num(o, "breath", reed ? 0.02 : 0.08) / (reed ? 0.02 : 0.08), w = num(o, "width", 0.3), vibC = num(o, "vibrato", reed ? 0 : 7);
  const ks = keys.slice().sort((a, b) => a.t - b.t);
  ks.forEach((k, ki) => {
    const r = subRng(r0), prev = ki > 0 ? ks[ki - 1] : null, next = ki + 1 < ks.length ? ks[ki + 1] : null;
    const legato = !!prev && prev.t < k.t - 0.02 && Math.abs(prev.off - k.t) < 0.03, slurOut = !!next && next.t > k.t + 0.02 && Math.abs(k.off - next.t) < 0.03;
    const f = f0(k.p) * Math.pow(2, clamp(gn(r) * 2, -4, 4) / 1200), i0 = onsetI(k.t + (legato ? 0 : clamp(gn(r) * 0.003, -0.006, 0.006)), sr), v = clamp(k.v * (0.93 + 0.14 * r()), 0, 1), dur = Math.max(0.03, k.off - k.t);
    const a = legato ? 0.018 : (reed ? 0.03 : 0.05) * (0.8 + 0.4 * r()), rl = slurOut ? 0.03 : 0.09 * (0.8 + 0.4 * r()), dyn = 0.3 + 0.7 * v, riseEnd = 1 - Math.exp(-dur / (a / 3));
    const N = Math.max(1, Math.min(reed ? 24 : 10, Math.floor((0.45 * sr) / (f * 1.02)))), base = new Float64Array(N), wA = new Float64Array(N), wB = new Float64Array(N), wC = new Float64Array(N);
    for (let h = 0; h < N; h++) { const m = h + 1, fr = m * f;
      base[h] = reed ? (fr < 1600 ? (m % 2 ? 1 : 0.035) * Math.pow(m, -0.75) : Math.pow(m, -0.75) * Math.pow(1600 / fr, 1.2)) : FLUTE[h] * (m === 2 && f < 400 ? 1.5 : 1) * (f > 1000 ? Math.pow(m, -0.5) : 1); }
    const gam = reed ? 1.1 : 0.9, chiff = !legato && !reed, vr = 4.9 + 0.7 * r(), vph = r() * TAU, dr = new Drift(r, 0.3, sr), [gl, gr] = pan(clamp(((k.p - 64) / 30) * w, -1, 1));
    const bpJet = new SVF(sr, Math.min(f, sr * 0.4), 5), bpC = new SVF(sr, Math.min(reed ? 2000 : 2600, sr * 0.4), reed ? 0.7 : 1.2), len = Math.min(n - i0, Math.ceil((dur + rl * 1.6) * sr)), g = LEVEL[reed ? "clarinet" : "flute"];
    let th = r() * TAU, hp = 0;
    const weights = (t: number, dst: Float64Array) => { const e = t < dur ? 1 - Math.exp(-t / (a / 3)) : riseEnd * Math.exp(-(t - dur) / (rl / 4)), L = Math.max(1e-4, e * dyn), ch = chiff ? 1 + 2 * Math.exp(-t / 0.03) : 1;
      for (let h = 0; h < N; h++) dst[h] = base[h] * Math.pow(L, 1 + gam * h) * (h === 1 ? ch : 1); return e; };
    let e0 = weights(0, wA), e1 = e0;
    for (let i = 0; i < len; i++) {
      const bi = i % BLK; if (bi === 0) { e0 = weights(i / sr, wA); e1 = weights((i + BLK) / sr, wB); }
      const x = bi / BLK; for (let h = 0; h < N; h++) wC[h] = wA[h] + (wB[h] - wA[h]) * x;
      const t = i / sr, e = e0 + (e1 - e0) * x, vibR = dur > 0.35 ? clamp((t - 0.22) / 0.3, 0, 1) : 0, vs = vibR > 0 ? Math.sin(TAU * vr * t + vph) : 0;
      const cents = (chiff ? -12 * Math.exp(-t / 0.03) : 0) + 2 * dr.tick() + vibC * vibR * vs;
      th += (TAU * f * Math.pow(2, cents / 1200)) / sr; if (th > TAU) th -= TAU;
      const nz = wn(r); hp += 0.2 * (nz - hp); bpJet.tick(nz); bpC.tick(nz);
      const air = reed ? bpC.bp * (0.012 * breath * e * dyn + 0.05 * v * Math.exp(-t / 0.012)) : (nz - hp) * 0.03 * breath * (0.3 + e * dyn) * e + bpJet.bp * 0.2 * breath * e * dyn + (chiff ? bpC.bp * 0.2 * v * Math.exp(-t / 0.025) : 0);
      const y = (harmonics(th, wC, N) * (reed ? 1 : 1 + 0.07 * vibR * vs) + air) * g, j = i0 + i;
      out.L[j] += y * gl; out.R[j] += y * gr;
    }
  });
  return out;
};

// ------------------------------------------------------------------ choir
/**
 * Choir: singers with a glottal source (Rosenberg pulse, the flow derivative with its closure step
 * band-limited by PolyBLEP; open quotient ~0.62, smaller when loud = brighter), per-period jitter
 * (~0.4 %) and shimmer (~0.4 dB), aspiration during the open phase and a soft "h" on entries, their
 * own vibrato, tuning and drift. Singers sum into bass / tenor / alto / soprano buses, each through a
 * cascade of five formant resonators for the vowel (Peterson & Barney), with F1 raised to follow a
 * high soprano pitch (formant tuning) and L/R vocal tracts 3 % apart. `vowel`: one of a e i o u, or a
 * sequence ("ao", "uoa") that morphs across each note. Options: vowel, attack, width; new: singers,
 * vibrato, breath, release.
 */
export const choir = (keys: Played[], sr: number, n: number, o: Opts, r0: Rng): Out => {
  const seq = String(o.vowel ?? "a").split("").filter((c) => FORMANTS[c]), vowels = seq.length ? seq : ["a"];
  const atk = num(o, "attack", 0.35), rel = num(o, "release", 0.7), w = num(o, "width", 0.8), S = Math.round(num(o, "singers", 8)), vibAmt = num(o, "vibrato", 1), breath = num(o, "breath", 1), conc = concurrency(keys);
  const secOf = (p: number) => (p < 52 ? 0 : p < 60 ? 1 : p < 67 ? 2 : 3), SEC_SCALE = [0.97, 1.04, 0.97, 1.04], SEC_PAN = [0.3, 0.1, -0.1, -0.3];
  const buses = [0, 1, 2, 3].map(() => out0(n)), secKeys: Played[][] = [[], [], [], []];
  keys.forEach((k, ki) => {
    const sec = secOf(k.p), P = clamp(Math.round(S / conc[ki]) + 1, 3, S), dur = Math.max(0.05, k.off - k.t), bus = buses[sec]; secKeys[sec].push(k);
    for (let p = 0; p < P; p++) {
      const r = subRng(r0), i0 = onsetI(k.t + clamp(gn(r) * (0.008 + 0.02 * clamp(atk, 0, 1)), -0.03, 0.03), sr), v = clamp(k.v * (0.88 + 0.24 * r()), 0, 1), f = f0(k.p), tune = clamp(gn(r) * 4, -9, 9);
      const a = Math.max(0.02, atk * (0.75 + 0.5 * r())), rl = rel * (0.8 + 0.4 * r()), vr = 4.6 + 1.2 * r(), vd = (18 + 20 * r()) * vibAmt, vDel = 0.25 + 0.25 * r(), vph0 = r() * TAU, dr = new Drift(r, 0.3, sr);
      const oq = clamp(0.64 - 0.12 * v + 0.04 * gn(r), 0.45, 0.78), sq = 2.4 + 0.8 * r(), tp = (oq * sq) / (1 + sq), tn = oq / (1 + sq), kO = Math.PI / (2 * tp), kC = Math.PI / (2 * tn);
      const [gl, gr] = pan(clamp(SEC_PAN[sec] * w + (r() - 0.5) * 0.9 * w, -1, 1)), len = Math.min(n - i0, Math.ceil((dur + rl * 1.6) * sr)), riseEnd = 1 - Math.exp(-dur / (a / 3));
      const g = (LEVEL.choir * Math.pow(v, 0.8)) / Math.sqrt(P), asp = 0.035 * breath, hBurst = 0.25 * breath;
      let ph = r(), jit = 1, shim = 1;
      for (let i = 0; i < len; i++) {
        const t = i / sr, env = t < dur ? 1 - Math.exp(-t / (a / 3)) : riseEnd * Math.exp(-(t - dur) / (rl / 3)), vibR = clamp((t - vDel) / 0.5, 0, 1);
        const cents = tune + 4 * dr.tick() + (vibR > 0 ? vd * vibR * Math.sin(TAU * vr * t + vph0) : 0), inc = (f * jit * Math.pow(2, cents / 1200)) / sr;
        ph += inc; if (ph >= 1) { ph -= 1; jit = 1 + 0.004 * gn(r); shim = 1 + 0.05 * gn(r); }
        let gs = ph < tp ? (kO / kC) * Math.sin(Math.PI * (ph / tp)) : ph < oq ? -Math.sin(Math.PI * ((ph - tp) / (2 * tn))) : 0;
        let tc = ph - oq; if (tc < 0) tc += 1; gs += 0.5 * blep(tc, inc); // the closure step (+1), band-limited
        const y = (gs * shim + wn(r) * (asp * (ph < oq ? 1 : 0.35) + hBurst * Math.exp(-t / 0.05) * (1 - env))) * env * g, j = i0 + i;
        bus.L[j] += y * gl; bus.R[j] += y * gr;
      }
    }
  });
  const out = out0(n), B = 64;
  buses.forEach((bus, sec) => {
    const sk = secKeys[sec].slice().sort((a, b) => a.t - b.t); if (!sk.length) return;
    const tab = sec < 2 ? "m" : "w", bw = FORMANT_BW[tab], rs = [0, 1].map(() => [0, 1, 2, 3, 4].map(() => new Reson()));
    let kIdx = 0, gPrev = -1;
    for (let b0 = 0; b0 < n; b0 += B) {
      const t = b0 / sr; while (kIdx + 1 < sk.length && sk[kIdx + 1].t <= t) kIdx++;
      const k = sk[kIdx], pos = vowels.length > 1 ? clamp((t - k.t) / Math.max(0.2, k.off - k.t), 0, 1) * (vowels.length - 1) : 0, vi = Math.min(vowels.length - 2, Math.floor(pos)), fr = vowels.length > 1 ? pos - Math.max(0, vi) : 0;
      const A = FORMANTS[vowels[Math.max(0, vi)]][tab], Z = FORMANTS[vowels[Math.min(vowels.length - 1, Math.max(0, vi) + 1)]][tab];
      let fmax = 0; for (let q = kIdx; q >= 0 && q > kIdx - 12; q--) if (sk[q].t <= t && sk[q].off + 0.3 > t) fmax = Math.max(fmax, f0(sk[q].p));
      let gg = 0;
      for (let s = 0; s < 2; s++) { const sc = SEC_SCALE[sec] * (s ? 1.015 : 0.985);
        for (let fi = 0; fi < 5; fi++) { let F = (A[fi] + (Z[fi] - A[fi]) * fr) * sc; if (fi === 0) F = Math.max(F, fmax * 1.12); if (fi === 1) F = Math.max(F, (A[0] + (Z[0] - A[0]) * fr) * sc + 250); rs[s][fi].set(sr, F, bw[fi]); }
        if (s === 0) { const F1 = rs[0][0]; let m = 1; const fq = Math.max(fmax * 1.12, (A[0] + (Z[0] - A[0]) * fr) * sc); for (const q of rs[0]) m *= q.mag(sr, fq); gg = 1 / Math.max(1e-6, m); void F1; } }
      if (gPrev < 0) gPrev = gg;
      const end = Math.min(n, b0 + B);
      for (let i = b0; i < end; i++) { const gi = gPrev + ((gg - gPrev) * (i - b0)) / B; let l = bus.L[i], rr = bus.R[i]; for (let fi = 0; fi < 5; fi++) { l = rs[0][fi].tick(l); rr = rs[1][fi].tick(rr); } out.L[i] += l * gi; out.R[i] += rr * gi; }
      gPrev = gg;
    }
  });
  Biquad.make(sr, "hp", 70, 0.7).run(out.L); Biquad.make(sr, "hp", 70, 0.7).run(out.R);
  return monoLows(out, sr, 220);
};

// ------------------------------------------------------------------ plucked strings
type PluckSpec = { width: number; beta: number; noise: number; lpMul: number; /** absolute excitation low-pass (Hz) instead of lpMul x f */ lpAbs?: number; /** contact width grows as (f / 131 Hz)^widthExp (thicker treble strings, softer finger) */ widthExp?: number; loss: number; t60: (f: number) => number; relT60: number; ring: boolean; pol2: number; ir?: IRSpec; pick: number; level: number };
const PLUCK: Record<string, PluckSpec> = {
  nylon: { width: 0.0022, beta: 0.2, noise: 0.25, lpMul: 3.5, loss: 0.3, t60: (f) => clamp(3.4 * Math.pow(196 / f, 0.55), 0.7, 7), relT60: 0.18, ring: false, pol2: 0.6, ir: IR_NYLON, pick: 0, level: LEVEL.guitar },
  steel: { width: 0.0009, beta: 0.13, noise: 0.4, lpMul: 8, loss: 0.16, t60: (f) => clamp(4.5 * Math.pow(196 / f, 0.5), 1, 9), relT60: 0.15, ring: false, pol2: 0.7, ir: IR_STEEL, pick: 0.03, level: LEVEL.guitar },
  electric: { width: 0.0008, beta: 0.12, noise: 0.35, lpMul: 7, loss: 0.14, t60: (f) => clamp(6 * Math.pow(196 / f, 0.45), 1.5, 12), relT60: 0.12, ring: false, pol2: 0.4, pick: 0.035, level: LEVEL.guitar },
  // harp: brightness, pluck point and ring fitted by ear-free A/B to VCSL Concert Harp C3/C5 (CC0; tools/ensemble-check.mjs ref)
  harp: { width: 0.0018, widthExp: 0.35, beta: 0.1, noise: 0.2, lpMul: 3, lpAbs: 900, loss: 0.14, t60: (f) => clamp(9.5 * Math.pow(262 / f, 0.45), 1.5, 16), relT60: 1, ring: true, pol2: 0.5, ir: IR_HARP, pick: 0, level: LEVEL.harp },
};
/** One plucked note (mono): excitation, commuted body, extended KS, optional pickup comb and pick scrape; RMS-normalised then scaled by velocity. */
const pluckNote = (sr: number, n: number, k: Played, s: PluckSpec, r: Rng, extra: { pickup?: number; glide?: { cents: number; tau: number }; thump?: number } = {}) => {
  const f = f0(k.p) * Math.pow(2, clamp(gn(r) * 1.5, -4, 4) / 1200), v = clamp(k.v * (0.9 + 0.2 * r()), 0.02, 1), T60 = s.t60(f) * (0.92 + 0.16 * r());
  let exc = pluckExc(sr, f, { width: s.width * Math.pow(f / 131, s.widthExp ?? 0) * (1.3 - 0.6 * v) * (0.9 + 0.2 * r()), beta: s.beta * (0.88 + 0.24 * r()), noise: s.noise, lp: (s.lpAbs ? Math.max(f * 1.2, s.lpAbs) : f * s.lpMul) * (0.6 + 0.8 * v) }, r);
  if (s.ir) exc = convolve(exc, bodyIR(sr, s.ir));
  const dur = Math.max(0.02, k.off - k.t), relI = s.ring ? Infinity : Math.round(dur * sr), len = Math.max(1, Math.min(n, Math.ceil((s.ring ? T60 * 1.1 : Math.min(T60 * 1.1, dur + s.relT60 * 1.5)) * sr)));
  const y = ksRender(sr, { f, T60, loss: s.loss * (0.92 + 0.16 * r()), exc, len, relI: relI === Infinity ? len : relI, relT60: s.relT60, pol2: { cents: 0.3 + 0.7 * r(), mix: s.pol2, t60: 0.45, share: r() }, glide: extra.glide });
  if (extra.pickup) { const D = extra.pickup * (sr / f), Di = Math.floor(D), Df = D - Di; for (let i = len - 1; i >= 0; i--) { const a = i - Di >= 0 ? y[i - Di] : 0, b = i - Di - 1 >= 0 ? y[i - Di - 1] : 0; y[i] -= 0.9 * (a * (1 - Df) + b * Df); } }
  const g = (Math.pow(v, 1.3) * (s.ring ? clamp(Math.pow(523 / f, 0.15), 0.3, 0.9) : clamp(Math.pow(523 / f, 0.5), 0.3, 1.2))) / headRms(y, sr); // high notes of real plucked strings are quieter
  for (let i = 0; i < len; i++) y[i] *= g;
  if (s.pick > 0 || extra.thump) { let lp = 0; const m = Math.min(len, Math.round(0.02 * sr)), kLp = extra.thump ? 0.03 : 0.5;
    for (let i = 0; i < m; i++) { const nz = wn(r); lp += kLp * (nz - lp); const e = Math.exp(-i / (0.003 * sr)); y[i] += (extra.thump ? lp * extra.thump * 4 : (nz - lp) * s.pick * 3) * e * v; } }
  return y;
};

/**
 * Guitar and harp: extended Karplus-Strong (ensembleCore.ksRender) with a pick/finger excitation,
 * pick-position comb, two polarisations and a commuted body IR (nylon or steel dreadnought, harp
 * soundboard). `kind`: nylon (default) | steel | electric. Electric = no body, a pickup-position comb
 * (`pickup`: neck | bridge), the pickup's resonant low-pass, then a small clean amp (asymmetric tanh
 * `drive`, a mid scoop, a 1x12 cab). Harp notes ring past their release, as harpists let them.
 */
export const pluck = (keys: Played[], sr: number, n: number, o: Opts, r0: Rng, inst: "harp" | "guitar"): Out => {
  const out = out0(n), w = num(o, "width", 0.6), kind = inst === "harp" ? "harp" : String(o.kind ?? "nylon"), s = PLUCK[kind] ?? PLUCK.nylon, elec = kind === "electric";
  const pickup = o.pickup === "bridge" ? 0.08 : 0.25;
  for (const k of keys) {
    const r = subRng(r0), i0 = onsetI(k.t + clamp(gn(r) * 0.002, -0.004, 0.004), sr), y = pluckNote(sr, n - i0, k, s, r, elec ? { pickup } : {});
    const [gl, gr] = pan(clamp(clamp((k.p - 64) / 30, -1, 1) * w + (r() - 0.5) * 0.1, -1, 1)); addStereo(out, i0, y, gl * s.level, gr * s.level);
  }
  if (elec) { const drive = num(o, "drive", 1.6);
    for (const ch of [out.L, out.R]) {
      Biquad.make(sr, "lp", Math.min(o.pickup === "bridge" ? 4300 : 3300, sr * 0.45), o.pickup === "bridge" ? 2 : 1.6).run(ch);
      const tb = Math.tanh(0.15), td = Math.tanh(drive); for (let i = 0; i < n; i++) ch[i] = ((Math.tanh(drive * ch[i] * 2 + 0.15) - tb) / td) * 0.5;
      Biquad.make(sr, "hp", 80, 0.7).run(ch); Biquad.make(sr, "lowshelf", 150, 0.7, 2).run(ch); Biquad.make(sr, "peak", 600, 0.8, -3).run(ch); Biquad.make(sr, "peak", 120, 1, 2).run(ch); Biquad.make(sr, "lp", Math.min(5200, sr * 0.45), 0.9).run(ch);
    } }
  return out;
};

// ------------------------------------------------------------------ bass
const BASS: Record<string, PluckSpec & { pickup?: number; lp: [number, number]; amp: boolean }> = {
  finger: { width: 0.003, beta: 0.2, noise: 0.2, lpMul: 2.5, loss: 0.4, t60: (f) => clamp(3.5 * Math.pow(41 / f, 0.3), 1.2, 4), relT60: 0.08, ring: false, pol2: 0.3, pick: 0, level: LEVEL.bass, pickup: 0.14, lp: [2600, 1.1], amp: true },
  pick: { width: 0.0006, beta: 0.12, noise: 0.4, lpMul: 7, loss: 0.25, t60: (f) => clamp(3.2 * Math.pow(41 / f, 0.3), 1.1, 3.6), relT60: 0.07, ring: false, pol2: 0.3, pick: 0.05, level: LEVEL.bass * 0.85, pickup: 0.1, lp: [4200, 1.3], amp: true },
  upright: { width: 0.004, beta: 0.27, noise: 0.25, lpMul: 2, loss: 0.5, t60: (f) => clamp(1.5 * Math.pow(41 / f, 0.25), 0.6, 2), relT60: 0.12, ring: false, pol2: 0.4, ir: IR_UPRIGHT, pick: 0, level: LEVEL.bass * 1.27, lp: [5000, 0.7], amp: false },
};
/**
 * Bass. `kind`: finger (default: electric, fingered, DI + amp) | pick | upright (commuted body, a
 * tension-modulation pitch settle of +12 c, the finger's thump) | synth (saw + sub square into a
 * 24 dB low-pass with a velocity-keyed envelope, glide on touching notes). Mono, centred.
 * Options: drive (amp saturation, as v1); new: kind.
 */
export const bass = (keys: Played[], sr: number, n: number, o: Opts): Out => {
  const kind = String(o.kind ?? "finger"), r0 = keysRng(keys, 0xba55);
  if (kind === "synth") return synthBass(keys, sr, n, o, r0);
  const s = BASS[kind] ?? BASS.finger, mono = new Float32Array(n);
  for (const k of keys) { const r = subRng(r0), i0 = onsetI(k.t + clamp(gn(r) * 0.002, -0.004, 0.004), sr);
    const y = pluckNote(sr, n - i0, k, s, r, { pickup: s.pickup, glide: kind === "upright" ? { cents: 10 + 6 * k.v, tau: 0.045 } : undefined, thump: kind === "upright" ? 0.12 : undefined });
    const m = Math.min(y.length, n - i0); for (let i = 0; i < m; i++) mono[i0 + i] += y[i] * s.level; }
  if (s.amp) { const drive = num(o, "drive", 1.3), td = Math.tanh(drive); for (let i = 0; i < n; i++) mono[i] = Math.tanh(drive * mono[i]) / td; }
  Biquad.make(sr, "hp", 32, 0.7).run(mono); Biquad.make(sr, "lp", Math.min(s.lp[0], sr * 0.45), s.lp[1]).run(mono);
  return { L: mono, R: Float32Array.from(mono) };
};
const synthBass = (keys: Played[], sr: number, n: number, o: Opts, r0: Rng): Out => {
  const mono = new Float32Array(n), ks = keys.slice().sort((a, b) => a.t - b.t), drive = num(o, "drive", 1.5), td = Math.tanh(drive), cut0 = num(o, "cut", 1.4), envAmt = num(o, "env", 1);
  ks.forEach((k, ki) => {
    const r = subRng(r0), prev = ki > 0 ? ks[ki - 1] : null, glideFrom = prev && prev.off > k.t - 0.01 && prev.t < k.t - 0.02 ? f0(prev.p) : 0, f = f0(k.p), i0 = onsetI(k.t, sr), dur = Math.max(0.02, k.off - k.t);
    const next = ki + 1 < ks.length ? ks[ki + 1] : null, cutEnd = next && next.t < k.off + 0.005 ? next.t - k.t : dur + 0.03;
    const len = Math.min(n - i0, Math.ceil(cutEnd * sr) + 1), la = new SVF(sr, 400, 0.8), lb = new SVF(sr, 400, 0.8), dec = 0.15 * (0.9 + 0.2 * r()), cj = 0.94 + 0.12 * r(), dr = new Drift(r, 0.4, sr);
    let ph = r(), ph2 = r();
    for (let i = 0; i < len; i++) {
      const t = i / sr, fr = (glideFrom ? f + (glideFrom - f) * Math.exp(-t / 0.012) : f) * Math.pow(2, (2.5 * dr.tick()) / 1200), inc = fr / sr, inc2 = inc / 2;
      ph += inc; if (ph >= 1) ph -= 1; ph2 += inc2; if (ph2 >= 1) ph2 -= 1;
      let sq = ph2 < 0.5 ? 1 : -1; sq += blep(ph2, inc2); let q = ph2 - 0.5; if (q < 0) q += 1; sq -= blep(q, inc2);
      const x = 2 * ph - 1 - blep(ph, inc) + 0.45 * sq;
      if ((i & 15) === 0) { const c = clamp((fr * 2.2 * cut0 + 1600 * envAmt * k.v * Math.exp(-t / dec)) * cj, 60, sr * 0.4); la.set(c, 0.75); lb.set(c, 0.9); }
      const e = Math.min(1, t / 0.003) * (0.8 + 0.2 * Math.exp(-t / 0.2)) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.03)) * (t > cutEnd - 0.004 && next && next.t < k.off + 0.005 ? Math.max(0, (cutEnd - t) / 0.004) : 1);
      mono[i0 + i] += (Math.tanh(drive * lb.tick(la.tick(x)) * 0.7) / td) * e * Math.pow(k.v, 1.1) * LEVEL.synthBass;
    }
  });
  Biquad.make(sr, "hp", 30, 0.7).run(mono);
  return { L: mono, R: Float32Array.from(mono) };
};

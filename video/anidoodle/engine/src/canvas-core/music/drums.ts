// DRUM KITS, in code. One voice renders any piece of a kit: the lane gives the default piece, a
// note's `kind` or its General-MIDI pitch picks another (C4 = the lane's own piece). Six kit
// characters: acoustic (studio kit), 808, 909, dusty (a sampled break: 26 kHz / 12-bit), brush
// (jazz), orch (concert bass drum, concert snare, clash cymbals; timpani below).
// Every hit is new: seeded round-robin (tune, decay, level, noise, strike spectrum), free-running
// oscillator phases, velocity changes the timbre (pitch sweep, click, wire share, brightness), and
// each piece sits at its own place on the stereo stage (audience view: hats right, ride and floor
// tom left). Choke: a closed or pedal hat anywhere in the piece stops a ringing open hat.
// Physics used: circular-membrane mode ratios 1, 1.59, 2.14, 2.30, 2.65, 2.92 (Rossing, Science of
// Percussion Instruments); TR-808 metal bank 205.3/304.4/369.6/522.7/540/800 Hz squares (Roland
// service notes, as in Tone.js MetalSynth, MIT); PhISEM stochastic shakers (Cook 1997, STK, MIT-style);
// timpani (1,1)..(6,1) ratios 1, 1.50, 1.98, 2.44, 2.90, 3.37 (Rossing/Fletcher). All reimplemented.
import { type Rng, TAU, clamp, pan, SVF, blep, db, gauss } from "./dsp";
import type { Played } from "./perform";
import { rng as mkRng } from "../core";

type Out = { L: Float32Array; R: Float32Array };
type Opts = Record<string, number | boolean | string>;
type Buf = Float64Array;

export type KitId = "acoustic" | "808" | "909" | "dusty" | "brush" | "orch";
export const KITS: KitId[] = ["acoustic", "808", "909", "dusty", "brush", "orch"];
/** The kit a style plays when its palette names none (opts.kit overrides). */
export const STYLE_KIT: Record<string, KitId> = {
  lofiElectronic: "808", drive: "909", cinematic: "orch", ambient: "808", folk: "brush", playful: "acoustic", minimalist: "acoustic", jazz: "brush",
  lofi: "dusty", orchestral: "orch", suspense: "orch", rock: "acoustic", hipHop: "808", house: "909", synthwave: "909", world: "acoustic", choral: "orch",
};
export type DrumPiece = "kick" | "snare" | "rimshot" | "ghost" | "cross" | "clap" | "hat" | "open" | "pedal" | "ride" | "bell" | "crash" | "tomHi" | "tomMid" | "tomLo"
  | "shaker" | "tamb" | "brush" | "sweep" | "dum" | "tek" | "ka" | "cowbell";
const PIECES = new Set<string>(["kick", "snare", "rimshot", "ghost", "cross", "clap", "hat", "open", "pedal", "ride", "bell", "crash", "tomHi", "tomMid", "tomLo", "shaker", "tamb", "brush", "sweep", "dum", "tek", "ka", "cowbell"]);
/** note kinds: lane names, the old one-letter kinds, and piece names */
const ALIAS: Record<string, DrumPiece> = { k: "kick", s: "snare", h: "hat", o: "open", p: "pedal", perc: "shaker", ghost: "ghost", kick: "kick", snare: "snare", hat: "hat" };
/** General MIDI percussion (35-81) -> piece. C4 (60) is never here: it is the lane's own piece. */
export const GM_DRUMS: Record<number, DrumPiece> = {
  35: "kick", 36: "kick", 37: "cross", 38: "snare", 39: "clap", 40: "rimshot", 41: "tomLo", 42: "hat", 43: "tomLo", 44: "pedal", 45: "tomMid", 46: "open", 47: "tomMid",
  48: "tomHi", 49: "crash", 50: "tomHi", 51: "ride", 52: "crash", 53: "bell", 54: "tamb", 55: "crash", 56: "cowbell", 57: "crash", 59: "ride", 61: "tek", 62: "ka", 63: "tek", 64: "dum", 69: "shaker", 70: "shaker",
};
export const pieceOf = (k: { p: number; kind?: string }, inst: string, o: Opts): DrumPiece => {
  if (k.p !== 60 && GM_DRUMS[k.p]) return GM_DRUMS[k.p];
  if (typeof o.piece === "string" && PIECES.has(o.piece)) return o.piece as DrumPiece;
  const kd = k.kind ? (PIECES.has(k.kind) ? (k.kind as DrumPiece) : ALIAS[k.kind]) : undefined;
  if (kd) return kd === "ghost" && o.rim === true ? "cross" : kd;
  return inst === "kick" ? "kick" : inst === "snare" ? (o.rim === true ? "cross" : "snare") : "hat";
};
export const kitOf = (o: Opts, style?: string): KitId => (typeof o.kit === "string" && (KITS as string[]).includes(o.kit) ? (o.kit as KitId) : STYLE_KIT[style ?? ""] ?? "acoustic");

// ---------------------------------------------------------------- stage and feel
/** Audience-view placement, -1 left .. 1 right. */
const PAN: Record<DrumPiece, number> = { kick: 0, snare: 0.06, rimshot: 0.06, ghost: 0.06, cross: 0.08, clap: 0, hat: 0.34, open: 0.34, pedal: 0.3, ride: -0.38, bell: -0.38, crash: 0.42,
  tomHi: 0.2, tomMid: -0.05, tomLo: -0.32, shaker: -0.45, tamb: 0.5, brush: 0.06, sweep: 0.06, dum: -0.1, tek: 0.15, ka: 0.3, cowbell: -0.2 };
// Microtiming is NOT here: perform.ts owns the feel (mixProfiles FEELS, keyed by the style: lane offsets, humanize,
// jitter, hat drift) and hands the kit keys that are already placed. A kit adding its own offsets doubled them (the
// dusty snare landed 35 ms late instead of 18; measured at the sound-v2 merge).

// ---------------------------------------------------------------- building blocks
type Var = { g: number; tune: number; dec: number; bright: number; ph: number; wire: number };
/** Snare-on-snare variance (the research numbers): +-0.7 dB, +-1.5 % tune, +-10 % decay, +-6 % brightness. */
const vary = (r: Rng): Var => ({ g: db(clamp(gauss(r), -2, 2) * 0.7), tune: 1 + (r() - 0.5) * 0.03, dec: 1 + (r() - 0.5) * 0.2, bright: 1 + (r() - 0.5) * 0.12, ph: r(), wire: 1 + (r() - 0.5) * 0.2 });
const nz = (r: Rng) => r() * 2 - 1;
const lenOf = (sr: number, s: number) => Math.max(1, Math.ceil(s * sr));
/** Membrane: modes (ratio, amp, tau) sharing one pitch glide (tension modulation), higher modes cut by a soft strike. */
const membrane = (sr: number, f: number, modes: readonly (readonly [number, number, number])[], o: { v: number; glide: number; glideTau: number; hard: number; rise?: number; ph?: number; len: number }): Buf => {
  const N = lenOf(sr, o.len), y = new Float64Array(N), rise = Math.max(1, (o.rise ?? 0.0004) * sr);
  for (let m = 0; m < modes.length; m++) {
    const [ratio, a0, tau] = modes[m], fm = f * ratio; if (fm > sr * 0.45) continue;
    const a = a0 * Math.pow(o.hard, ratio - 1), dk = Math.exp(-1 / (tau * sr)), gk = Math.exp(-1 / (o.glideTau * sr)), M = Math.min(N, Math.ceil(tau * 9 * sr));
    let ph = ((o.ph ?? 0) + m * 0.137) % 1, env = a, gl = o.glide;
    for (let i = 0; i < M; i++) { ph += (fm * (1 + gl)) / sr; gl *= gk; env *= dk; y[i] += Math.sin(TAU * ph) * env * Math.min(1, i / rise); }
  }
  return y;
};
/** Short band-limited noise burst: a click (stick, beater, tip). */
const click = (sr: number, r: Rng, f: number, q: number, tau: number, amp: number, len = tau * 8): Buf => {
  const N = lenOf(sr, len), y = new Float64Array(N), bp = new SVF(sr, f, q), k = Math.exp(-1 / (tau * sr)); let e = amp;
  for (let i = 0; i < N; i++) { bp.tick(nz(r)); y[i] = bp.bp * e; e *= k; }
  return y;
};
const add = (a: Buf, b: Buf, g = 1, at = 0) => { const n = Math.min(b.length, a.length - at); for (let i = 0; i < n; i++) a[at + i] += b[i] * g; return a; };
const sat = (y: Buf, drive: number) => { if (drive <= 1) return y; const k = Math.tanh(drive); for (let i = 0; i < y.length; i++) y[i] = Math.tanh(y[i] * drive) / k; return y; };

// ---------------------------------------------------------------- kick
type KickP = { f: number; sweep: number; tauP: number; dec: number; modes: [number, number, number][]; click: number; clickF: number; drive: number; rise: number; shell?: number };
const KICK: Record<KitId, KickP> = {
  acoustic: { f: 57, sweep: 1.5, tauP: 0.03, dec: 0.19, modes: [[1, 1, 1], [1.59, 0.3, 0.35], [2.14, 0.16, 0.25]], click: 0.55, clickF: 2800, drive: 1.3, rise: 0.0006, shell: 0.12 },
  "808": { f: 49, sweep: 2.1, tauP: 0.045, dec: 0.42, modes: [[1, 1, 1]], click: 0.18, clickF: 3000, drive: 1.5, rise: 0.0003 },
  "909": { f: 52, sweep: 4.4, tauP: 0.022, dec: 0.26, modes: [[1, 1, 1]], click: 0.75, clickF: 4500, drive: 2.4, rise: 0.0002 },
  dusty: { f: 54, sweep: 2.0, tauP: 0.035, dec: 0.24, modes: [[1, 1, 1], [1.59, 0.22, 0.3]], click: 0.4, clickF: 2200, drive: 1.9, rise: 0.0006, shell: 0.08 },
  brush: { f: 66, sweep: 1.25, tauP: 0.04, dec: 0.32, modes: [[1, 1, 1], [1.59, 0.35, 0.45], [2.14, 0.2, 0.3], [2.3, 0.12, 0.25]], click: 0.2, clickF: 1500, drive: 1.1, rise: 0.0012, shell: 0.06 },
  orch: { f: 43, sweep: 1.06, tauP: 0.08, dec: 1.35, modes: [[1, 1, 1], [1.59, 0.5, 0.6], [2.14, 0.4, 0.45], [2.3, 0.3, 0.4], [2.65, 0.22, 0.35], [2.92, 0.16, 0.3], [3.16, 0.1, 0.25]], click: 0.06, clickF: 700, drive: 1, rise: 0.004 },
};
const kickSyn = (sr: number, r: Rng, v: number, x: Var, P: KickP): Buf => {
  // beater and head vary more than a snare: +-2.5 % pitch, +-15 % sweep, the strike point moves the overtone mix
  const f = P.f * (1 + (x.tune - 1) * 1.7), dec = P.dec * x.dec, sweep = 1 + (P.sweep - 1) * (0.45 + 0.55 * v) * (0.85 + 0.3 * r()), mix = P.modes.map(([ratio], m) => (m ? (0.7 + 0.6 * r()) * Math.pow(0.35 + 0.65 * v, (ratio - 1) * 2) : 1)), N = lenOf(sr, Math.min(3, dec * 7)), y = new Float64Array(N), rise = P.rise * sr;
  const phs = P.modes.map((_, m) => (x.ph * 0.08 + m * 0.21) % 1), kp = Math.exp(-1 / (P.tauP * (0.85 + 0.3 * r()) * sr));
  let sw = sweep - 1;
  for (let i = 0; i < N; i++) {
    const t = i / sr, fq = f * (1 + sw); sw *= kp; let s = 0;
    for (let m = 0; m < P.modes.length; m++) { const [ratio, a, d] = P.modes[m]; phs[m] += (fq * ratio) / sr; s += Math.sin(TAU * phs[m]) * a * mix[m] * Math.exp(-t / (dec * d)); }
    y[i] = s * Math.min(1, i / rise);
  }
  sat(y, P.drive * (0.8 + 0.4 * v));
  add(y, click(sr, r, P.clickF * (0.6 + 0.7 * v) * x.bright, 0.8, 0.0015, P.click * Math.pow(v, 1.5)));
  if (P.shell) add(y, membrane(sr, 172 * x.tune, [[1, 1, 0.05], [1.6, 0.5, 0.03]], { v, glide: 0, glideTau: 1, hard: 0.6, len: 0.3 }), P.shell * v);
  if (P.f < 45) add(y, click(sr, r, 180, 0.6, 0.02, 0.25 * v)); // felt beater thump into a big head
  return y;
};

// ---------------------------------------------------------------- snare, clap, rim
type SnareP = { f: number; modes: [number, number, number][]; glide: number; wire: number; wireDec: number; hp: number; lp: number; buzz: number; stick: number; drive: number; tone: number };
const MEM6 = (d: number): [number, number, number][] => [[1, 1, d], [1.59, 0.62, d * 0.62], [2.14, 0.48, d * 0.5], [2.3, 0.34, d * 0.44], [2.65, 0.26, d * 0.38], [2.92, 0.2, d * 0.33]];
const SNARE: Record<KitId, SnareP> = {
  acoustic: { f: 192, modes: MEM6(0.085), glide: 0.045, wire: 0.95, wireDec: 0.075, hp: 1900, lp: 9500, buzz: 0.6, stick: 0.5, drive: 1.2, tone: 0.75 },
  "808": { f: 238, modes: [[1, 1, 0.075], [2, 0.55, 0.045]], glide: 0, wire: 0.8, wireDec: 0.05, hp: 1800, lp: 13000, buzz: 0, stick: 0.12, drive: 1.1, tone: 0.8 },
  "909": { f: 186, modes: [[1, 1, 0.07], [1.79, 0.62, 0.045]], glide: 0.16, wire: 1.05, wireDec: 0.065, hp: 1300, lp: 10000, buzz: 0, stick: 0.3, drive: 1.8, tone: 0.72 },
  dusty: { f: 176, modes: MEM6(0.12), glide: 0.04, wire: 1.0, wireDec: 0.09, hp: 1500, lp: 7200, buzz: 0.55, stick: 0.35, drive: 1.6, tone: 0.8 },
  brush: { f: 200, modes: MEM6(0.09), glide: 0.03, wire: 0.8, wireDec: 0.08, hp: 1700, lp: 8500, buzz: 0.6, stick: 0.3, drive: 1, tone: 0.65 },
  orch: { f: 228, modes: MEM6(0.07), glide: 0.035, wire: 1.2, wireDec: 0.055, hp: 2400, lp: 11500, buzz: 0.5, stick: 0.45, drive: 1, tone: 0.55 },
};
const snareSyn = (sr: number, r: Rng, v: number, x: Var, P: SnareP, kind: "snare" | "rimshot" | "ghost"): Buf => {
  const rim = kind === "rimshot", hard = clamp(0.35 + 0.65 * v, 0, 1) * x.bright, len = Math.min(1.2, Math.max(P.wireDec * 10, P.modes[0][2] * 7));
  const mem = membrane(sr, P.f * x.tune, P.modes, { v, glide: P.glide * v, glideTau: 0.02, hard, ph: x.ph, len });
  let peak = 1e-9; for (let i = 0; i < mem.length; i++) peak = Math.max(peak, Math.abs(mem[i]));
  const N = mem.length, y = new Float64Array(N), hp1 = new SVF(sr, P.hp, 0.7), hp2 = new SVF(sr, P.hp, 0.7), lp = new SVF(sr, P.lp * (0.75 + 0.35 * v) * x.bright, 0.7), lp2 = new SVF(sr, P.lp * 1.3, 0.6);
  // wires: rattling against the bottom head, so the noise is amplitude-modulated by the membrane (the buzz); longer and a bigger share at ff
  const wAmt = P.wire * (kind === "ghost" ? 0.75 : 0.55 + 0.6 * v) * x.wire, wTau = P.wireDec * (0.7 + 0.5 * v) * x.dec, kw = Math.exp(-1 / (wTau * sr)), on = Math.exp(-1 / (0.0012 * sr));
  let e = 1, o = 1;
  for (let i = 0; i < N; i++) {
    hp1.tick(nz(r)); hp2.tick(hp1.hp); lp.tick(hp2.hp); lp2.tick(lp.lp);
    const buzz = 1 - P.buzz + P.buzz * Math.min(1.6, (Math.abs(mem[i]) / peak) * 2.2);
    y[i] = mem[i] * P.tone * (rim ? 0.8 : 1) + lp2.lp * e * (1 - o) * wAmt * buzz * 2.2; e *= kw; o *= on;
  }
  add(y, click(sr, r, 3500 * x.bright, 0.7, 0.0007, P.stick * v * v * 1.4));
  if (rim) { add(y, membrane(sr, 880 * x.tune, [[1, 1, 0.05], [1.93, 0.6, 0.03], [3.1, 0.4, 0.015]], { v, glide: 0, glideTau: 1, hard: 1, len: 0.4 }), 0.45); add(y, click(sr, r, 5000, 0.5, 0.001, 1.2 * v)); }
  return sat(y, P.drive);
};
const clapSyn = (sr: number, r: Rng, v: number, x: Var, kit: KitId): Buf => {
  const machine = kit === "808" || kit === "909", tail = (kit === "808" ? 0.14 : kit === "909" ? 0.1 : 0.085) * x.dec, bursts = machine ? 4 : 3 + Math.floor(r() * 3);
  const N = lenOf(sr, 0.06 + tail * 7), y = new Float64Array(N);
  let t0 = 0;
  for (let b = 0; b < bursts; b++) {
    const last = b === bursts - 1, fc = (machine ? (kit === "808" ? 1050 : 1250) : 1300 + r() * 900) * x.bright, bp = new SVF(sr, fc, machine ? 1.3 : 1.1), hp = new SVF(sr, 650, 0.7);
    const i0 = Math.round(t0 * sr), tau = last ? tail : 0.0024, k = Math.exp(-1 / (tau * sr)), M = Math.min(N - i0, Math.ceil(tau * 8 * sr)); let e = last ? 1 : 0.85 + 0.3 * r();
    for (let i = 0; i < M; i++) { bp.tick(nz(r)); hp.tick(bp.bp); y[i0 + i] += hp.hp * e * Math.min(1, i / (0.0003 * sr)); e *= k; }
    t0 += (machine ? 0.0095 : 0.006 + r() * 0.01) * (0.8 + 0.4 * r());
  }
  for (let i = 0; i < N; i++) y[i] *= 2.6 * (0.5 + 0.5 * v);
  return y;
};
const crossSyn = (sr: number, r: Rng, v: number, x: Var, kit: KitId): Buf => {
  const machine = kit === "808" || kit === "909"; // the 808 rim shot: two bridged-T rings at 455 and 1667 Hz
  const modes: [number, number, number][] = machine ? [[1, 1, 0.011], [3.664, 0.8, 0.008]] : [[1, 1, 0.03], [2.3, 0.6, 0.018], [3.66, 0.42, 0.011], [5.9, 0.25, 0.007]];
  const y = membrane(sr, (machine ? 455 : 470) * x.tune, modes, { v, glide: 0, glideTau: 1, hard: 0.6 + 0.4 * v, ph: x.ph, len: 0.15 });
  return add(y, click(sr, r, machine ? 6000 : 2400, 0.7, 0.0006, machine ? 0.3 : 0.9));
};

// ---------------------------------------------------------------- hats, cymbals
const METAL = [205.3, 304.4, 369.6, 522.7, 540, 800];
type HatP = { scale: number[]; noise: number; bp: number; q: number; hp: number; closed: number; open: number; pedal: number; lp: number };
const HAT: Record<KitId, HatP> = {
  acoustic: { scale: [1.47, 1.73], noise: 0.45, bp: 8200, q: 0.8, hp: 5800, closed: 0.042, open: 0.46, pedal: 0.03, lp: 15000 },
  "808": { scale: [1], noise: 0.04, bp: 9500, q: 1.1, hp: 7000, closed: 0.032, open: 0.34, pedal: 0.026, lp: 18000 },
  "909": { scale: [1.21], noise: 0.35, bp: 10500, q: 0.9, hp: 7500, closed: 0.026, open: 0.3, pedal: 0.024, lp: 17000 },
  dusty: { scale: [1.41, 1.66], noise: 0.5, bp: 7200, q: 0.8, hp: 5200, closed: 0.045, open: 0.42, pedal: 0.03, lp: 9500 },
  brush: { scale: [1.43, 1.69], noise: 0.4, bp: 7600, q: 0.8, hp: 5000, closed: 0.05, open: 0.5, pedal: 0.035, lp: 13000 },
  orch: { scale: [1.39, 1.61], noise: 0.45, bp: 7400, q: 0.8, hp: 5200, closed: 0.045, open: 0.5, pedal: 0.03, lp: 12000 },
};
/** Square bank through band-pass and a 4-pole high-pass; open hats shimmer (the two cymbals rattle) and are choked. */
const hatSyn = (sr: number, r: Rng, v: number, x: Var, P: HatP, piece: "hat" | "open" | "pedal", chokeIn: number): Buf => {
  const dec = (piece === "pedal" ? P.pedal : piece === "open" ? P.open * (0.75 + 0.45 * v) : P.closed * (0.8 + 0.45 * v)) * x.dec;
  const N = Math.min(lenOf(sr, dec * 7), chokeIn + Math.round(0.04 * sr)), y = new Float64Array(N);
  const osc = P.scale.flatMap((s, b) => METAL.map((f) => ({ inc: (f * s * (1 + (r() - 0.5) * 0.004)) / sr, ph: r(), g: b ? 0.8 : 1 })));
  const bp = new SVF(sr, P.bp * (0.7 + 0.45 * v) * x.bright, P.q), h1 = new SVF(sr, P.hp, 0.7), h2 = new SVF(sr, P.hp, 0.7), lp = new SVF(sr, P.lp * (0.55 + 0.45 * v), 0.7), am = new SVF(sr, 38, 0.7);
  const k = Math.exp(-1 / (dec * sr)), kc = Math.exp(-1 / (0.005 * sr)), atk = Math.max(1, 0.00025 * sr); let e = 1, s0 = 0;
  const mix = 1 / osc.length;
  for (let i = 0; i < N; i++) {
    let m = 0; for (const o of osc) { let s = o.ph < 0.5 ? 1 : -1; s += blep(o.ph, o.inc); let q = o.ph + 0.5; if (q >= 1) q -= 1; s -= blep(q, o.inc); m += s * o.g; o.ph += o.inc; if (o.ph >= 1) o.ph -= 1; }
    const src = m * mix * 2.2 * (1 - P.noise) + nz(r) * P.noise;
    bp.tick(src); h1.tick(bp.bp); h2.tick(h1.hp); lp.tick(h2.hp);
    const shim = piece === "open" ? 1 + 0.9 * am.tick(nz(r)) : 1;
    if (i >= chokeIn) e *= kc;
    y[i] = lp.lp * e * shim * Math.min(1, i / atk); e *= k; s0 = y[i];
  }
  void s0;
  if (piece === "pedal" || (piece === "hat" && v > 0.72)) add(y, click(sr, r, piece === "pedal" ? 2100 : 3600, 1.2, piece === "pedal" ? 0.01 : 0.006, (piece === "pedal" ? 0.5 : 0.25) * v));
  return y;
};
type CymPartial = { f: number; a: number; tau: number; rise: number; p: number };
type CymP = { n: number; lo: number; hi: number; fc: number; oct: number; T: number; rise: number; wash: number; stick: number; maxS: number; bell?: boolean; seed: number };
const CYM: Record<string, CymP> = {
  ride: { n: 90, lo: 330, hi: 13000, fc: 4200, oct: 1.2, T: 2.2, rise: 0.004, wash: 0.25, stick: 0.8, maxS: 3.2, seed: 11 },
  bell: { n: 26, lo: 480, hi: 9000, fc: 1500, oct: 1.0, T: 1.9, rise: 0.001, wash: 0.1, stick: 0.5, maxS: 3, bell: true, seed: 13 },
  crash: { n: 130, lo: 300, hi: 15000, fc: 5600, oct: 1.4, T: 1.5, rise: 0.03, wash: 0.7, stick: 0.6, maxS: 4, seed: 17 },
  cymbal: { n: 150, lo: 220, hi: 13000, fc: 3800, oct: 1.4, T: 2.6, rise: 0.05, wash: 0.8, stick: 0.3, maxS: 6, seed: 19 },
  ride808: { n: 18, lo: 400, hi: 11000, fc: 5500, oct: 1.0, T: 1.0, rise: 0.003, wash: 0.4, stick: 0.3, maxS: 2.2, seed: 23 },
};
const cymTables = new Map<string, CymPartial[]>();
/** One cymbal's partials, fixed per cymbal (the same cymbal every hit; the strike changes the mix). */
const cymTable = (id: string, P: CymP): CymPartial[] => {
  let t = cymTables.get(id); if (t) return t;
  const r = mkRng(P.seed * 7919 + 3); t = [];
  for (let i = 0; i < P.n; i++) {
    const u = (i + 0.2 + 0.6 * r()) / P.n, f = P.lo * Math.pow(P.hi / P.lo, u), oc = Math.log2(f / P.fc);
    let a = Math.exp(-0.5 * (oc / P.oct) ** 2) * (0.6 + 0.4 * r());
    if (P.bell) a = Math.pow(0.82, i) * (0.7 + 0.3 * r()); else a *= Math.sqrt(40 / P.n); // denser = each mode smaller, same loudness
    t.push({ f, a, tau: clamp(P.T * Math.pow(1500 / f, 0.45) * (0.7 + 0.6 * r()), 0.08, P.T * 2.2), rise: P.rise * Math.pow(f / 2000, 1.2) * (0.5 + r()), p: (r() - 0.5) * 1.1 });
  }
  cymTables.set(id, t); return t;
};
const cymSyn = (sr: number, r: Rng, v: number, x: Var, id: string, soft = false): [Buf, Buf] => {
  const P = CYM[id], tab = cymTable(id, P), N = lenOf(sr, P.maxS * (0.7 + 0.4 * v)), L = new Float64Array(N), R = new Float64Array(N), tilt = 0.7 * (v - 0.7) + (x.bright - 1) * 2;
  for (const q of tab) {
    const f = q.f * (1 + (x.tune - 1) * 0.15); if (f > sr * 0.45) continue;
    const a = q.a * Math.pow(f / 2000, tilt) * (0.75 + 0.5 * r()), tau = q.tau * x.dec, M = Math.min(N, Math.ceil(tau * Math.log(Math.max(2, a * 3e4)) * sr)); if (M <= 0) continue;
    const w = (TAU * f) / sr, cw = Math.cos(w), sw = Math.sin(w), d = Math.exp(-1 / (tau * sr)), ph = TAU * r(), riseS = (soft ? q.rise * 3 + 0.012 : q.rise / (0.5 + v)) * sr, kr = riseS > 1 ? Math.exp(-1 / riseS) : 0;
    const [gl, gr] = pan(q.p); let c = Math.cos(ph) * a, s = Math.sin(ph) * a, re = 1;
    for (let i = 0; i < M; i++) { const y = s * (1 - re); L[i] += y * gl; R[i] += y * gr; const c2 = (c * cw - s * sw) * d; s = (c * sw + s * cw) * d; c = c2; re *= kr; }
  }
  // wash: the dense top the partial list cannot hold, decorrelated per side
  if (P.wash) { const hl = new SVF(sr, 4500, 0.7), hr = new SVF(sr, 4500, 0.7), k = Math.exp(-1 / (P.T * 0.45 * x.dec * sr)), M = Math.min(N, Math.ceil(P.T * 3 * sr)); let e = P.wash * 0.35 * (0.5 + 0.5 * v);
    const rs = Math.max(1, (soft ? 0.03 : P.rise) * sr); for (let i = 0; i < M; i++) { hl.tick(nz(r)); hr.tick(nz(r)); const g = e * (1 - Math.exp(-i / rs)); L[i] += hl.hp * g; R[i] += hr.hp * g; e *= k; } }
  if (!soft) { const c = click(sr, r, 6500, 0.6, 0.0012, P.stick * v); add(L, c, 0.9); add(R, c, 0.9); }
  return [L, R];
};

// ---------------------------------------------------------------- toms, hand drums, cowbell
const TOM: Record<"tomHi" | "tomMid" | "tomLo", [number, number]> = { tomHi: [196, 0.34], tomMid: [147, 0.42], tomLo: [98, 0.55] };
const tomSyn = (sr: number, r: Rng, v: number, x: Var, piece: "tomHi" | "tomMid" | "tomLo", kit: KitId): Buf => {
  const [f, d] = TOM[piece], machine = kit === "808" || kit === "909", tune = kit === "808" ? 0.82 : kit === "909" ? 0.95 : 1;
  const modes: [number, number, number][] = machine ? [[1, 1, d * 0.9]] : [[1, 1, d], [1.59, 0.5, d * 0.5], [2.14, 0.35, d * 0.35], [2.3, 0.25, d * 0.3], [2.65, 0.18, d * 0.25], [2.92, 0.12, d * 0.2]];
  const y = membrane(sr, f * tune * x.tune, modes, { v, glide: (machine ? 0.35 : 0.07) * (0.5 + 0.5 * v), glideTau: machine ? 0.05 : 0.04, hard: (0.4 + 0.6 * v) * x.bright, ph: x.ph, len: d * x.dec * 7 });
  sat(y, machine ? 1.4 : 1.1);
  return add(y, click(sr, r, kit === "brush" ? 1800 : 3200, 0.8, 0.001, (machine ? 0.15 : 0.5) * v));
};
const handSyn = (sr: number, r: Rng, v: number, x: Var, piece: "dum" | "tek" | "ka"): Buf => {
  if (piece === "dum") { const y = membrane(sr, 88 * x.tune, [[1, 1, 0.3], [1.59, 0.45, 0.15], [2.14, 0.3, 0.1], [2.3, 0.2, 0.08]], { v, glide: 0.06 * v, glideTau: 0.05, hard: 0.5 + 0.3 * v, rise: 0.002, ph: x.ph, len: 1.6 }); return add(y, click(sr, r, 500, 0.7, 0.004, 0.4 * v)); }
  const f = piece === "tek" ? 660 : 510, y = membrane(sr, f * x.tune, [[1, 1, piece === "tek" ? 0.06 : 0.035], [1.59, 0.7, 0.035], [2.14, 0.55, 0.025], [2.65, 0.35, 0.015]], { v, glide: 0.02, glideTau: 0.02, hard: 0.7 + 0.3 * v, ph: x.ph, len: 0.4 });
  return add(y, click(sr, r, piece === "tek" ? 3200 : 2400, 0.8, 0.0012, 1.1 * v));
};
const cowbellSyn = (sr: number, v: number, x: Var): Buf => { // the 808 cowbell: 540 + 800 Hz squares, band-passed, a fast then slow decay
  const N = lenOf(sr, 0.5), y = new Float64Array(N), bp = new SVF(sr, 2640, 1.4), f1 = (540 * x.tune) / sr, f2 = (800 * x.tune) / sr; let p1 = x.ph, p2 = (x.ph + 0.3) % 1;
  for (let i = 0; i < N; i++) { const t = i / sr; let s1 = p1 < 0.5 ? 1 : -1, s2 = p2 < 0.5 ? 1 : -1; s1 += blep(p1, f1) - blep((p1 + 0.5) % 1, f1); s2 += blep(p2, f2) - blep((p2 + 0.5) % 1, f2); p1 = (p1 + f1) % 1; p2 = (p2 + f2) % 1;
    bp.tick(s1 + s2); y[i] = (bp.bp + 0.3 * (s1 + s2) * 0.2) * (0.6 * Math.exp(-t / 0.012) + 0.4 * Math.exp(-t / 0.09)) * v; }
  return y;
};

// ---------------------------------------------------------------- shakers, tambourine, brushes (PhISEM: Cook 1997)
const phisem = (sr: number, r: Rng, v: number, x: Var, dur: number, P: { beads: number; stroke: number; grain: number; res: [number, number, number][]; body?: number }): Buf => {
  const strokeS = Math.min(Math.max(0.05, dur * 0.6), P.stroke) * x.dec, N = lenOf(sr, strokeS + 0.25), y = new Float64Array(N), filt = P.res.map(([f, q]) => new SVF(sr, f * x.bright, q));
  const kE = Math.exp(-1 / (strokeS * 0.35 * sr)), kS = Math.exp(-1 / (P.grain * sr)), rate = (P.beads * 60) / sr; let E = 0, S = 0;
  for (let i = 0; i < N; i++) {
    if (i < strokeS * sr * 0.3) E += (1 - E) * 0.004; // the shake gathers energy, then the beads settle
    E *= kE; if (r() < rate * E) S += (0.3 + 0.7 * r()) * E; S *= kS;
    const s = nz(r) * S; let o = 0; for (let j = 0; j < filt.length; j++) { filt[j].tick(s); o += filt[j].bp * P.res[j][2]; } y[i] = o * (0.4 + 0.6 * v);
  }
  if (P.body) add(y, membrane(sr, 190 * x.tune, [[1, 1, 0.03], [1.59, 0.5, 0.02]], { v, glide: 0, glideTau: 1, hard: 0.5, len: 0.2 }), P.body * v);
  return y;
};
const SHAKER = { beads: 90, stroke: 0.09, grain: 0.0012, res: [[5200, 1.3, 1], [8400, 1.8, 0.6], [2900, 1.2, 0.25]] as [number, number, number][] };
const TAMB = { beads: 40, stroke: 0.1, grain: 0.0045, res: [[5600, 9, 1], [8100, 11, 0.8], [2300, 5, 0.4]] as [number, number, number][], body: 0.35 };
const brushSyn = (sr: number, r: Rng, v: number, x: Var, dur: number, sweep: boolean): Buf => {
  if (sweep) { // a circle on the head: a swell of band-passed noise whose centre travels with the brush
    const D = clamp(dur, 0.12, 2) * x.dec, N = lenOf(sr, D + 0.08), y = new Float64Array(N), bp = new SVF(sr, 3000, 0.8), lp = new SVF(sr, 7000, 0.7), ph = x.ph * TAU;
    for (let i = 0; i < N; i++) { const t = i / sr, u = clamp(t / D, 0, 1), e = Math.sin(Math.PI * u) ** 1.5 * (t < D ? 1 : Math.exp(-(t - D) / 0.02)); if ((i & 15) === 0) bp.set(2600 + 1600 * Math.sin(TAU * u + ph), 0.8); bp.tick(nz(r)); lp.tick(bp.bp); y[i] = lp.lp * e * 0.9 * (0.4 + 0.6 * v); }
    return y;
  }
  // a tap: wire-heavy, soft rise (bristles arrive over ~3 ms), a little membrane
  const N = lenOf(sr, 0.5), y = new Float64Array(N), hp = new SVF(sr, 500, 0.7), lp = new SVF(sr, 5200 + 2500 * v, 0.7), rise = 0.003 * sr, k = Math.exp(-1 / (0.075 * (0.8 + 0.5 * v) * x.dec * sr)); let e = 1;
  for (let i = 0; i < N; i++) { hp.tick(nz(r)); lp.tick(hp.hp); y[i] = lp.lp * e * Math.min(1, i / rise) * 1.2; e *= k; }
  return add(y, membrane(sr, 200 * x.tune, MEM6(0.07), { v, glide: 0, glideTau: 1, hard: 0.35, len: 0.4 }), 0.18 * v);
};

// ---------------------------------------------------------------- rolls
/** Single strokes at `rate`/s across a held note, a swell from `from` to 1 of the velocity (orch snare buzz roll, bass drum, cymbal rolls). */
const roll = (dur: number, v: number, rate: number, r: Rng, from = 0.55) => { const out: [number, number][] = []; const n = Math.max(2, Math.floor(dur * rate)); for (let j = 0; j < n; j++) out.push([(j / rate) + (r() - 0.5) * 0.004, v * (from + (1 - from) * (j / (n - 1))) * (j % 2 ? 0.9 : 1)]); return out; };

// ---------------------------------------------------------------- the voice
/** Level trims per piece, set by measuring each against the legacy voice it replaces (stem RMS on the test signals). */
const TRIM: Partial<Record<DrumPiece, number>> = { kick: 1.05, snare: 0.62, rimshot: 0.62, ghost: 0.62, cross: 0.55, clap: 0.55, hat: 0.34, open: 0.24, pedal: 0.34, ride: 0.2, bell: 0.2, crash: 0.13, tomHi: 0.5, tomMid: 0.5, tomLo: 0.55, shaker: 0.9, tamb: 0.45, brush: 0.7, sweep: 0.6, dum: 0.6, tek: 0.45, ka: 0.45, cowbell: 0.35 };
/** dB per kit and piece on top of TRIM: measured (stem meter, every style's test signal) so each lane plays where the calibrated palettes expect it. */
const LEVEL: Record<KitId, Partial<Record<DrumPiece | "timpani", number>>> = {
  acoustic: { kick: -0.8, snare: -7.8, rimshot: -7.8, ghost: -7.8, cross: -2.5, clap: -2.5, hat: 4.9, open: 4.9, pedal: 4.9, ride: -33.9, bell: -33.9, crash: -8.5, tomHi: -7.8, tomMid: -7.8, tomLo: -7.8, shaker: -24.7, tamb: -18, dum: -1.5, tek: -1.5, ka: -1.5, cowbell: 0 },
  "808": { kick: -2, snare: -8.3, rimshot: -8.3, ghost: -8.3, cross: -1.7, clap: -2, hat: 12.7, open: 11.9, pedal: 12.7, ride: -30, bell: -30, crash: -9.5, tomHi: -9.3, tomMid: -9.3, tomLo: -9.3, shaker: -22.5, tamb: -18, dum: -1.5, tek: -1.5, ka: -1.5, cowbell: 0 },
  "909": { kick: -7, snare: -9, rimshot: -9, ghost: -9, cross: -1.7, clap: -2.6, hat: 10, open: 10, pedal: 10, ride: -30, bell: -30, crash: -9.5, tomHi: -9, tomMid: -9, tomLo: -9, shaker: -22.5, tamb: -18, dum: -1.5, tek: -1.5, ka: -1.5, cowbell: 0 },
  dusty: { kick: -1.6, snare: -7.3, rimshot: -7.3, ghost: -7.3, cross: -2.8, clap: -2.5, hat: 6.6, open: 6.5, pedal: 6.6, ride: -34, bell: -34, crash: -9.5, tomHi: -7.3, tomMid: -7.3, tomLo: -7.3, shaker: -24, tamb: -18, dum: -1.5, tek: -1.5, ka: -1.5, cowbell: 0 },
  brush: { kick: -1.6, brush: 2, sweep: -6.4, cross: -2.5, clap: -2.5, hat: 5, open: 5, pedal: 8.7, ride: -33.9, bell: -33.9, crash: -9.5, tomHi: -7.8, tomMid: -7.8, tomLo: -7.8, shaker: -24, tamb: -18, dum: -1.5, tek: -1.5, ka: -1.5, cowbell: 0 },
  orch: { kick: -6.1, snare: -8.9, rimshot: -8.9, ghost: -8.9, cross: -2.5, clap: -2.5, hat: 5, open: 5, pedal: 5, ride: -34, bell: -34, crash: -12, tomHi: -9, tomMid: -9, tomLo: -9, shaker: -24, tamb: -18, dum: -1.5, tek: -1.5, ka: -1.5, cowbell: 0, timpani: 3.5 },
};
const lvl = (kit: KitId, pc: DrumPiece) => db(LEVEL[kit][pc] ?? 0);
/** legacy = the piece is frozen on the old kit (Piece.legacy); style picks the default kit; choke = closed/pedal hat onsets across the piece. */
export type KitCtx = { legacy?: boolean; style?: string; choke?: number[] };

/** Every closed / pedal hat onset in a piece's drum parts (for choking open hats across lanes). */
export const chokeTimes = (parts: { inst: string; opts?: Opts; keys: Played[] }[]): number[] => {
  const t: number[] = [];
  for (const pt of parts) if (["kick", "snare", "hat"].includes(pt.inst) && pt.opts?.legacy !== true) for (const k of pt.keys) { const pc = pieceOf(k, pt.inst, pt.opts ?? {}); if (pc === "hat" || pc === "pedal") t.push(k.t); }
  return t.sort((a, b) => a - b);
};

/** A kit voice: kick / snare / hat lanes (the inst gives the lane's default piece). */
export const kitVoice = (inst: string, keys: Played[], sr: number, n: number, o: Opts, r: Rng, ctx: KitCtx = {}): Out => {
  const kit = kitOf(o, ctx.style), L = new Float32Array(n), R = new Float32Array(n), choke = ctx.choke ?? [];
  const width = typeof o.width === "number" ? (o.width as number) : 1;
  const put = (y: Buf | [Buf, Buf], t: number, p: number, g: number) => {
    const i0 = Math.round(t * sr); if (i0 >= n) return;
    const [gl, gr] = pan(p * width);
    if (y instanceof Float64Array) { const m = Math.min(y.length, n - i0); for (let i = 0; i < m; i++) { L[i0 + i] += y[i] * g * gl; R[i0 + i] += y[i] * g * gr; } }
    else { const m = Math.min(y[0].length, n - i0), cl = gl * Math.SQRT2 * g, cr = gr * Math.SQRT2 * g; for (let i = 0; i < m; i++) { L[i0 + i] += y[0][i] * cl; R[i0 + i] += y[1][i] * cr; } }
  };
  for (const k of keys) {
    let pc = pieceOf(k, inst, o);
    if (kit === "brush" && (pc === "snare" || pc === "ghost" || pc === "cross" || pc === "rimshot")) pc = "brush";
    if (kit !== "brush" && pc === "sweep") pc = "shaker";
    if (kit !== "brush" && pc === "brush") pc = "ghost";
    const t = k.t;
    const x = vary(r), v = clamp(k.v, 0.02, 1), dur = Math.max(0.02, k.off - k.t), rolled = o.roll === true || k.kind === "roll", g = x.g * (TRIM[pc] ?? 0.5) * lvl(kit, pc), p = PAN[pc] + (r() - 0.5) * 0.04;
    switch (pc) {
      case "kick":
        if (kit === "orch" && rolled) { for (const [dt, vv] of roll(dur, v, 11, r, 0.35)) put(kickSyn(sr, r, vv * 0.6, vary(r), KICK.orch), t + dt, p, g); break; }
        put(kickSyn(sr, r, v, x, KICK[kit]), t, p, g * v); break;
      case "snare": case "rimshot": case "ghost": {
        const kind = pc === "ghost" ? "ghost" : pc === "rimshot" || (kit === "acoustic" && v > 0.93) ? "rimshot" : "snare", vv = pc === "ghost" ? v * 0.55 : v;
        if (rolled) { for (const [dt, rv] of roll(dur, vv, 26, r)) put(snareSyn(sr, r, rv * 0.7, vary(r), SNARE.orch, "snare"), t + dt, p, g * 0.55); break; }
        put(snareSyn(sr, r, vv, x, SNARE[kit], kind), t, p, g * vv); break;
      }
      case "clap": put(clapSyn(sr, r, v, x, kit), t, p, g * v); break;
      case "cross": put(crossSyn(sr, r, v, x, kit), t, p, g * v); break;
      case "hat": case "open": case "pedal": {
        let ci = Infinity; if (pc === "open") { const c = choke.find((c) => c > t + 0.01); if (c !== undefined) ci = Math.round((c - t) * sr); }
        put(hatSyn(sr, r, v, x, HAT[kit], pc, ci), t, p, g * v); break;
      }
      case "ride": case "bell": put(cymSyn(sr, r, v, x, kit === "808" || kit === "909" ? "ride808" : pc), t, p, g * v); break;
      case "crash": {
        const id = kit === "orch" ? "cymbal" : "crash";
        if (rolled) { for (const [dt, rv] of roll(dur, v, 12, r, 0.1)) put(cymSyn(sr, r, rv * 0.5, vary(r), id, true), t + dt, p, g * 0.35); break; } // a mallet roll on the suspended cymbal
        put(cymSyn(sr, r, v, x, id), t, p, g * v); break;
      }
      case "tomHi": case "tomMid": case "tomLo": put(tomSyn(sr, r, v, x, pc, kit), t, p, g * v); break;
      case "shaker": put(phisem(sr, r, v, x, dur, SHAKER), t, p, g * v); break;
      case "tamb": put(phisem(sr, r, v, x, dur, TAMB), t, p, g * v); break;
      case "brush": case "sweep": put(brushSyn(sr, r, v, x, dur, pc === "sweep"), t, p, g * v); break;
      case "dum": case "tek": case "ka": put(handSyn(sr, r, v, x, pc), t, p, g * v); break;
      case "cowbell": put(cowbellSyn(sr, v, x), t, p, g); break;
    }
  }
  if (kit === "acoustic" || kit === "brush" || kit === "orch" || kit === "dusty") ambience(L, R, sr, kit === "orch" ? 0.55 : kit === "dusty" ? 0.3 : 0.4);
  if (kit === "dusty" && ctx.style !== "lofi") sampler(L, R, sr); // in the lofi style the lo-fi chain (lofiFx) crunches the drum bus; never twice
  return { L, R };
};

/** Overheads and room mics: a few decorrelated early reflections off the kit (3-19 ms), high-passed so the lows stay mono. */
const ambience = (L: Float32Array, R: Float32Array, sr: number, amt: number) => {
  const n = L.length, tl = [3.1, 7.3, 11.9, 17.3].map((ms) => Math.round((ms / 1000) * sr)), tr = [4.3, 8.9, 13.7, 19.1].map((ms) => Math.round((ms / 1000) * sr)), gs = [0.3, 0.22, 0.15, 0.1].map((g) => g * amt);
  const m = new Float32Array(n), hpC = Math.exp((-TAU * 250) / sr), lpC = 1 - Math.exp((-TAU * 6500) / sr); let hz = 0, lz = 0, prev = 0;
  for (let i = 0; i < n; i++) { const x = (L[i] + R[i]) * 0.5; hz = hpC * (hz + x - prev); prev = x; lz += lpC * (hz - lz); m[i] = lz; }
  for (let i = n - 1; i >= 0; i--) { let a = 0, b = 0; for (let j = 0; j < 4; j++) { if (i >= tl[j]) a += m[i - tl[j]] * gs[j] * (j % 2 ? -1 : 1); if (i >= tr[j]) b += m[i - tr[j]] * gs[j] * (j % 2 ? 1 : -1); } L[i] += a; R[i] += b; }
};
/** The sampled break: SP-1200 style zero-order hold at 26.04 kHz (no anti-alias filter, so it aliases), 12-bit, a 4-pole 11 kHz output filter, a push into soft clip. */
const sampler = (L: Float32Array, R: Float32Array, sr: number) => {
  for (const c of [L, R]) {
    const step = sr / 26040, a = new SVF(sr, 11000, 0.54), b = new SVF(sr, 11000, 1.3); let acc = 0, hold = 0;
    for (let i = 0; i < c.length; i++) { acc += 1; if (acc >= step) { acc -= step; hold = Math.round(c[i] * 1.6 * 2048) / 2048; } a.tick(hold); b.tick(a.lp); c[i] = Math.tanh(b.lp * 1.3) / (1.3 * 1.6); }
  }
};

// ---------------------------------------------------------------- timpani
/** Kettle drum: the air-loaded (1,1)..(6,1) modes (near-harmonic, so it has a pitch), a fast-dying (0,1) thud, a felt mallet whose contact time sets the brightness, a tension glide on hard strokes, rolls on held notes. `pitch` pins the drum's note (compose tunes it to the key); `decay` = the fundamental's time constant. */
export const timpani = (keys: Played[], sr: number, n: number, o: Opts, r: Rng): Out => {
  const L = new Float32Array(n), R = new Float32Array(n), dec = typeof o.decay === "number" ? (o.decay as number) : 1.6, lv = db(LEVEL.orch.timpani ?? 0);
  const strike = (t: number, midi: number, v: number, g: number) => {
    const x = vary(r), f = 440 * Math.pow(2, (midi - 69) / 12) * x.tune, hard = 0.35 + 0.55 * v, d = dec * x.dec;
    const y = membrane(sr, f, [[1, 1, d], [1.504, 0.62, d * 0.72], [1.742, 0.14, d * 0.2], [1.98, 0.42, d * 0.55], [2.44, 0.24, d * 0.4], [2.9, 0.13, d * 0.3], [3.37, 0.07, d * 0.22]], { v, glide: 0.018 * v * v, glideTau: 0.15, hard, rise: 0.0025 - 0.0015 * v, ph: x.ph, len: Math.min(8, d * 6) });
    add(y, membrane(sr, f * 0.62, [[1, 1, 0.07]], { v, glide: 0, glideTau: 1, hard: 1, rise: 0.002, len: 0.5 }), 0.5 * v);
    add(y, click(sr, r, 450 + 900 * v, 0.6, 0.006, 0.6 * v));
    const i0 = Math.round(t * sr), [gl, gr] = pan(clamp((midi - 45) / 18, -1, 1) * -0.25 + (r() - 0.5) * 0.03), m = Math.min(y.length, n - i0);
    for (let i = 0; i < m; i++) { L[i0 + i] += y[i] * g * gl; R[i0 + i] += y[i] * g * gr; }
  };
  for (const k of keys) {
    const midi = typeof o.pitch === "number" ? (o.pitch as number) : k.p, dur = k.off - k.t, v = clamp(k.v, 0.02, 1);
    if (o.roll === true || k.kind === "roll") for (const [dt, vv] of roll(dur, v, 15, r, 0.4)) strike(k.t + dt, midi, vv * 0.75, 0.26 * lv);
    else strike(k.t, midi, v, 0.34 * v * lv);
  }
  ambience(L, R, sr, 0.6);
  return { L, R };
};

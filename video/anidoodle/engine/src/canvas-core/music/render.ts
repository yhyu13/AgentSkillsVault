// Piece -> performance -> one stem per part -> room -> master. Pure in (piece, sampleRate, opts).
// Gentle styles: one static gain to -16 LUFS, true peak <= -1 dBTP, never a compressor (if the
// ceiling can't be met by gain alone the loudness goes down, spec 08 section 9). Dense styles:
// -14 LUFS through a look-ahead true-peak limiter.
import { type Piece, type Part, resequence, beatsPerBar } from "./plan";
import { perform, type Performance, type Played } from "./perform";
import { renderPiano, PIANO_REAL, type PianoOpts } from "./piano";
import { keysVoice, renderPianoV2 } from "./keys";
import { bankFor, measuredTone, pinnedPitch, samplerVoice, sampleZones, registerBank, type SampleBank, type SampleTrim } from "./sampler";
import * as I from "./instruments";
import * as O from "./orchestra";
import { chokeTimes, type KitCtx } from "./drums";
import { room, Biquad, db } from "./dsp";
import { warmPad, softPluck, sub, duckCurve, tape } from "./lofiKit";
import { pumpCurve, lofiStem, lofiMaster, LOFI_DUSTY, type LofiFx } from "./lofiFx";
import { loudness, truePeak, stemBalance } from "./meter";
import { STYLES } from "./tables";
import { rng as mkRng } from "../core";
import { eqChain, runEq, stereoPan, compress, saturate, bandWidth, smoothLimiter, ampSim, transientGain } from "./mixDsp";
import { reverb, roomFor, effectiveSpace, type Space } from "./mixReverb";
import { mixProfile, partEq, recordedEq, ROLE_SEND, isStruck, TRANSIENT_DEFAULT, type MixProfile } from "./mixProfiles";

export type RenderOpts = { /** sound v2, gentle styles only: a <= 1 dB 2:1 glue on the mix bus (spec 08 forbids a compressor on gentle masters; Alex decides) */ gentleGlue?: boolean; expressive?: boolean; piano?: PianoOpts; flatVelocity?: number; seconds?: number; tempo?: number; master?: "auto" | "gentle" | "dense" | "none"; stems?: boolean; only?: (p: Part) => boolean;
  /** play this performance instead of performing the piece (the guards render one role of the SAME performance the mix plays) */ perf?: Performance;
  /** Complete part strikes keep recorded EQ fixed when a guard isolates one note role. */ mixKeys?: Played[][];
  /** reuse synthesized voices by their exact inputs (tools/music.mjs check: each part is synthesized once for the mix, the guards and the stems); output is bit-identical */ cache?: VoiceCache };

/**
 * Voice synthesis as data: one part's voice, its exact inputs. `runVoiceJob` is the only place a
 * voice is synthesized, so a cache hit (or a worker that ran the same job) is bit-identical to a
 * fresh synthesis. Keyed by the whole job, so a different key, option, length or seed never hits.
 */
export type VoiceOut = { L: Float32Array; R: Float32Array; halo?: Float32Array; /** the transient gain's reduction (dB), when the job ran it */ transientGr?: number };
/** Per-stem processing that depends on nothing but the stem (sound v2): the lo-fi stem colour, the amp, the gentle master's transient gain. */
type StemPost = { lofi?: LofiFx; id: string; seed: number; period?: number; amp?: number; transient?: { maxDb: number; thrDb: number; ratio: number } };
export type VoiceJob = (
  | { kind: "sampled"; bank: string; bankHash: string; inst: Part["inst"]; opts?: Part["opts"]; keys: Played[]; pedal: Performance["pedal"]; sr: number; n: number; seed: number; post?: StemPost }
  | { kind: "voice"; inst: Part["inst"]; opts?: Part["opts"]; keys: Played[]; sr: number; n: number; seed: number; ctx: KitCtx; post?: StemPost }
  | { kind: "piano"; keys: Played[]; pedal: Performance["pedal"]; sr: number; n: number; seed: number; opts?: Part["opts"]; v1?: PianoOpts; post?: StemPost }) & { roomHashes?: [string, string, number, number][] };
export type VoiceCache = Map<string, VoiceOut>;
export const runVoiceJob = (j: VoiceJob): VoiceOut => {
  for (const [id, sha, rt60, directFrames] of j.roomHashes ?? []) { const r = roomFor(id); if (!r || r.sha256 !== sha || r.rt60 !== rt60 || (r.directFrames ?? 0) !== directFrames) throw new Error(`recorded room missing or changed: ${id} (${sha})`); }
  let out: VoiceOut;
  if (j.kind === "sampled") {
    const b = bankFor(j.inst, typeof j.opts?.variant === "string" ? j.opts.variant : undefined);
    if (!b || b.id !== j.bank || b.hash !== j.bankHash) throw new Error(`sample bank missing or changed: ${j.bank} (${j.bankHash})`);
    out = samplerVoice(b, j.keys, j.pedal, j.sr, j.n, j.opts ?? {}, j.seed);
  }
  else if (j.kind === "piano") { const r = j.v1 ? renderPiano(j.keys, j.pedal, j.sr, j.n, j.v1, j.seed) : renderPianoV2(j.keys, j.pedal, j.sr, j.n, j.opts ?? {}, j.seed); out = { L: r.L, R: r.R, halo: r.halo }; }
  else out = voice({ id: "", role: "accomp", notes: [], inst: j.inst, ...(j.opts ? { opts: j.opts } : {}) }, j.keys, j.sr, j.n, j.seed, j.ctx);
  const q = j.post; if (!q) return out;
  if (q.lofi) lofiStem(q.lofi, q.id, out.L, out.R, j.sr, j.keys.map((k) => k.t), q.seed, q.period);
  if (q.amp !== undefined) ampSim(out.L, out.R, j.sr, q.amp); // a guitar (or any DI) through the amp + cab
  if (q.transient) out.transientGr = transientGain(out.L, out.R, j.sr, q.transient);
  return out;
};
export const voiceJobKey = (j: VoiceJob) => JSON.stringify(j);
const copyOut = (v: VoiceOut): VoiceOut => ({ ...v, L: Float32Array.from(v.L), R: Float32Array.from(v.R), ...(v.halo ? { halo: Float32Array.from(v.halo) } : {}) });
/** A sound-v2 part's job: its voice, then the stem processing (renderV2 and voiceJobs both build jobs here, so their keys agree). */
const v2Job = (piece: Piece, pt: Part, pi: number, keys: Played[], perf: Performance, sr: number, n: number, o: RenderOpts, ctx: KitCtx): VoiceJob => {
  const style = STYLES[piece.plan.style], prof = mixProfile(style.id, piece.mix), tempo = o.tempo ?? piece.plan.tempo;
  const lofi = piece.fx?.lofi ?? (style.id === "lofi" && !piece.fx?.clean ? LOFI_DUSTY : undefined), period = piece.plan.loop ? (piece.plan.sections.reduce((a, s) => a + s.bars * beatsPerBar(piece.plan.meter), 0) * 60) / tempo : undefined;
  // gentle masters are one static gain: a pick or hammer spike would hold the whole mix under the ceiling, so struck stems lose their crest, not their level
  const tg = prof.transient === undefined ? TRANSIENT_DEFAULT : prof.transient, amp = typeof pt.opts?.amp === "number" ? (pt.opts.amp as number) : undefined;
  const transient = style.master === "gentle" && tg && isStruck(pt.inst, pt.opts) ? tg : undefined;
  const post: StemPost | undefined = lofi || amp !== undefined || transient ? { id: pt.id, seed: piece.seed, ...(lofi ? { lofi, period } : {}), ...(amp !== undefined ? { amp } : {}), ...(transient ? { transient } : {}) } : undefined;
  const bank = pt.opts?.sampled === false ? undefined : bankFor(pt.inst, typeof pt.opts?.variant === "string" ? pt.opts.variant : undefined);
  // a recorded timpani pinned to a note plays it, as the modelled one does: a drum lane's written pitch is a placeholder
  const pin = bank && pt.inst === "timpani" && typeof pt.opts?.pitch === "number" ? pinnedPitch(pt.opts.pitch as number, bank.entry.range) : undefined, played = pin === undefined ? keys : keys.map((k) => ({ ...k, p: pin }));
  const base = bank ? { kind: "sampled" as const, bank: bank.id, bankHash: bank.hash, inst: pt.inst, keys: played, pedal: perf.pedal, sr, n, seed: pt.inst === "piano" ? piece.seed + pi : piece.seed * 101 + pi, opts: pt.opts }
    : pt.inst === "piano" ? (o.piano ? { kind: "piano" as const, keys, pedal: perf.pedal, sr, n, seed: piece.seed + pi, v1: o.piano } : { kind: "piano" as const, keys, pedal: perf.pedal, sr, n, seed: piece.seed + pi, opts: pt.opts ?? {} })
    : { kind: "voice" as const, inst: pt.inst, opts: pt.opts, keys, sr, n, seed: piece.seed * 101 + pi, ctx };
  const roomHashes: [string, string, number, number][] = [effectiveSpace(piece.plan.space)?.room ?? prof.space?.room, prof.drumRoom?.room].flatMap((id) => { const r = roomFor(id); return r && id ? [[id, r.sha256, r.rt60, r.directFrames ?? 0] as [string, string, number, number]] : []; });
  const job = post ? { ...base, post } : base;
  return roomHashes.length ? { ...job, roomHashes } : job;
};
/** Synthesize (or reuse) one voice. The caller owns the returned arrays (it mutates them in place). */
const synth = (j: VoiceJob, cache?: VoiceCache): VoiceOut => {
  if (!cache) return runVoiceJob(j);
  const k = voiceJobKey(j); let v = cache.get(k); if (!v) { v = runVoiceJob(j); cache.set(k, v); }
  return copyOut(v);
};
/** The voice jobs a render will run (for a pool that synthesizes them in parallel into a cache first). Mirrors renderLegacy / renderV2 exactly. */
export const voiceJobs = (piece: Piece, sr: number, o: RenderOpts = {}): VoiceJob[] => {
  const expressive = o.expressive ?? true, tempo = o.tempo ?? piece.plan.tempo;
  const perf = o.perf ?? perform(piece, tempo, { expressive, flatVelocity: o.flatVelocity });
  const n = o.seconds ? Math.round(o.seconds * sr) : Math.ceil((perf.lastOnset + piece.tail) * sr), jobs: VoiceJob[] = [];
  const kitCtx: KitCtx = piece.legacy ? { legacy: true } : { legacy: false, style: piece.plan.style, choke: chokeTimes(piece.parts.map((pt, pi) => ({ inst: pt.inst, opts: pt.opts, keys: perf.parts[pi].keys }))) };
  piece.parts.forEach((pt, pi) => {
    if (o.only && !o.only(pt)) return;
    const keys = perf.parts[pi].keys; if (!keys.length) return;
    if (!piece.legacy) jobs.push(v2Job(piece, pt, pi, keys, perf, sr, n, o, kitCtx));
    else if (pt.inst === "piano") jobs.push({ kind: "piano", keys, pedal: perf.pedal, sr, n, seed: piece.seed + pi, v1: o.piano ?? PIANO_REAL });
    else jobs.push({ kind: "voice", inst: pt.inst, opts: pt.opts, keys, sr, n, seed: piece.seed * 101 + pi, ctx: kitCtx });
  });
  return jobs;
};
/** dry = the pre-room mix; wet = the room's late tail (for music-box: its single reflection). Kept so the guards can measure reverb-to-dry per bar. */
export type Rendered = { L: Float32Array; R: Float32Array; perf: Performance; tempo: number; gainDb: number; masterMode: string; stems: Record<string, [Float32Array, Float32Array]>; piece: Piece; dry: [Float32Array, Float32Array]; wet: [Float32Array, Float32Array];
  /** sound v2: what the chain did (gain reduction in dB) */ mixReport?: { drumBusGr?: number; glueGr?: number; limiterGr?: number; transientGr?: number; space?: string } };

const voice = (pt: Part, keys: Played[], sr: number, n: number, seed: number, ctx: KitCtx = {}) => {
  // Piece.legacy is the one freeze flag: legacy pieces hand every voice `legacy: true` so a rebuilt voice keeps its old path for them
  const o = ctx.legacy ? { ...(pt.opts ?? {}), legacy: true } : pt.opts ?? {}, r = mkRng(seed);
  if (!ctx.legacy) { const kv = keysVoice(pt.inst, keys, sr, n, o, seed); if (kv) return kv; } // keys rebuild (keys.ts)
  switch (pt.inst) {
    case "musicBox": return I.musicBox(keys, sr, n, o);
    case "bell": return I.bell(keys, sr, n, o);
    case "celesta": return I.celesta(keys, sr, n, o);
    case "marimba": return I.mallets(keys, sr, n, o);
    case "vibes": return I.mallets(keys, sr, n, o, true);
    case "harp": return I.pluck(keys, sr, n, o, r, "harp");
    case "guitar": return I.pluck(keys, sr, n, o, r, "guitar");
    case "strings": return I.strings(keys, sr, n, o, r);
    case "fmBell": return I.fmBell(keys, sr, n, o);
    case "ePiano": return I.ePiano(keys, sr, n, o);
    case "pulse": return I.pulse(keys, sr, n, o);
    case "triangle": return I.triangle(keys, sr, n);
    case "noiseDrum": return I.noiseDrum(keys, sr, n);
    case "kick": case "snare": case "hat": return I.drumVoice(pt.inst, keys, sr, n, o, r, ctx);
    case "bass": return I.bass(keys, sr, n, o);
    case "vinyl": return I.vinyl(keys, sr, n, o, r);
    case "glockenspiel": return I.celesta(keys, sr, n, o); // new instruments have no legacy voice: the nearest old one
    case "wurlitzer": return I.ePiano(keys, sr, n, o);
    case "pipeOrgan": return O.organ(keys, sr, n, o);
    case "warmPad": return warmPad(keys, sr, n, o, r);
    case "softPluck": return softPluck(keys, sr, n, o);
    case "sub": return sub(keys, sr, n, o);
    case "organ": return O.organ(keys, sr, n, o);
    case "brass": return O.brass(keys, sr, n, o);
    case "woodwind": return O.woodwind(keys, sr, n, o, r);
    case "choir": return O.choir(keys, sr, n, o, r);
    case "timpani": return O.timpani(keys, sr, n, o, r); // v2: the kit timpani (drums.ts); legacy opts: v1
    case "leadSynth": return O.leadSynth(keys, sr, n, o);
    case "bowedSolo": return O.bowedSolo(keys, sr, n, o, r);
    default: throw new Error(`no instrument ${pt.inst}`);
  }
};

/** Fixed single-note energy references at each zone's pitch and layer centre.
 * Keep the instrument median trim; cap zone deviation so a near-silent recording never gets a huge lift. */
export const calibrateBank = (id: string) => {
  const [inst, ...variant] = id.split("."), bank = bankFor(inst, variant.join(".") || undefined); if (!bank) throw new Error(`sample bank missing: ${id}`);
  const sr = 24000, n = sr * 12, opts = { ...(variant.length ? { variant: variant.join(".") } : {}), pedal: false }, bare: SampleBank = { entry: bank.entry, zones: bank.zones };
  // Gated RMS would match the average tail instead of energy per strike, changing a fast
  // arpeggio's balance when recorded and modeled decays differ. Use one fixed 12 s window.
  const level = (r: VoiceOut) => { const mid = Float32Array.from(r.L, (x, i) => (x + r.R[i]) * 0.5); Biquad.make(sr, "hp", 30, 0.7071).run(mid); let energy = 0; for (const x of mid) energy += x * x; return 10 * Math.log10(energy / n); };
  const bandFraction = (r: VoiceOut) => {
    const mid = Float32Array.from(r.L, (x, i) => (x + r.R[i]) * 0.5);
    Biquad.make(sr, "hp", 40, Math.SQRT1_2).run(mid);
    let total = 0; for (const x of mid) total += x * x;
    Biquad.make(sr, "hp", 500, Math.SQRT1_2).run(mid); Biquad.make(sr, "lp", 4000, Math.SQRT1_2).run(mid);
    let band = 0; for (const x of mid) band += x * x;
    return 10 * Math.log10(Math.max(1e-15, band) / Math.max(1e-15, total));
  };
  const references = new Map<string, { level: number; band: number }>();
  const trim: SampleTrim[] = bank.zones.filter(({ zone }) => zone.art !== "rel").map((z) => {
    const p = z.zone.midi, v = bank.entry.layerVelocity?.[z.zone.layer - 1] ?? (z.zone.layer - 0.5) / bank.entry.layers;
    const keys: Played[] = [{ p, v, tone: v, t: 0, off: 1, role: "melody", w: v }], one: SampleBank = { entry: { ...bare.entry, zones: [{ ...z.zone, art: undefined }] }, zones: [{ ...z, zone: { ...z.zone, art: undefined } }] }, recorded = samplerVoice(one, keys, [], sr, n, opts, 1);
    const ref = `${p}:${v}`; let modeled = references.get(ref);
    if (modeled === undefined) { const r = inst === "piano" ? renderPianoV2(keys, [], sr, n, opts, 1) : voice({ id: "ref", inst: inst as Part["inst"], role: "melody", notes: [], opts }, keys, sr, n, 1); modeled = { level: level(r), band: bandFraction(r) }; references.set(ref, modeled); }
    const modeledDb = modeled.level;
    const measuredDb = level(recorded);
    const correctionDb = modeledDb - measuredDb;
    if (!Number.isFinite(correctionDb)) throw new Error(`${id}: silent calibration at MIDI ${p}`);
    const bandFractionDb = bandFraction(recorded);
    return { file: z.zone.file, midi: p, layer: z.zone.layer, measuredDb, modeledDb, correctionDb, bandFractionDb, bandExcessDb: bandFractionDb - modeled.band };
  });
  const sorted = trim.map((t) => t.correctionDb).sort((a, b) => a - b), middle = Math.floor(sorted.length / 2), medianDb = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return registerBank(id, { ...bare, trim: trim.map((t) => ({ ...t, requestedDb: t.correctionDb, medianDb, correctionDb: medianDb + Math.max(-9, Math.min(9, t.correctionDb - medianDb)), boostLimited: t.correctionDb > medianDb + 9 })) });
};

export const renderPiece = (piece: Piece, sr: number, o: RenderOpts = {}): Rendered => (piece.legacy ? renderLegacy(piece, sr, o) : renderV2(piece, sr, o));

/** The pre-v2 render, frozen: the shipped launch score renders through this bit for bit. */
const renderLegacy = (piece: Piece, sr: number, o: RenderOpts = {}): Rendered => {
  const expressive = o.expressive ?? true, tempo = o.tempo ?? piece.plan.tempo, style = STYLES[piece.plan.style];
  const perf = o.perf ?? perform(piece, tempo, { expressive, flatVelocity: o.flatVelocity });
  const n = o.seconds ? Math.round(o.seconds * sr) : Math.ceil((perf.lastOnset + piece.tail) * sr);
  const L = new Float32Array(n), R = new Float32Array(n), haloL = new Float32Array(n), stems: Record<string, [Float32Array, Float32Array]> = {};
  const sends: [Float32Array, Float32Array, number][] = [];
  // the pump: one gain curve from the ducking part's onsets, applied to every ducked part before the mix
  const dk = piece.fx?.duck, byIdx = dk ? piece.parts.findIndex((p) => p.id === dk.by) : -1;
  const pump = dk && byIdx >= 0 ? duckCurve(perf.parts[byIdx].keys.map((k) => k.t), sr, n, dk.depth ?? 0.4, dk.release ?? 0.28) : null;
  piece.parts.forEach((pt, pi) => {
    if (o.only && !o.only(pt)) return;
    const keys = perf.parts[pi].keys; if (!keys.length) return;
    let sL: Float32Array, sR: Float32Array;
    if (pt.inst === "piano") { const r = synth({ kind: "piano", keys, pedal: perf.pedal, sr, n, seed: piece.seed + pi, v1: o.piano ?? PIANO_REAL }, o.cache); sL = r.L; sR = r.R; if ((o.piano ?? PIANO_REAL).pedal) for (let i = 0; i < n; i++) haloL[i] += r.halo![i] * db(pt.gainDb ?? 0); }
    else { const r = synth({ kind: "voice", inst: pt.inst, opts: pt.opts, keys, sr, n, seed: piece.seed * 101 + pi, ctx: { legacy: true } }, o.cache); sL = r.L; sR = r.R; }
    if (pump && dk!.parts.includes(pt.id)) for (let i = 0; i < n; i++) { sL[i] *= pump[i]; sR[i] *= pump[i]; }
    const g = db(pt.gainDb ?? 0);
    if (pt.pan) { const a = Math.max(0, pt.pan), b = Math.max(0, -pt.pan); for (let i = 0; i < n; i++) { sL[i] *= 1 - a * 0.6; sR[i] *= 1 - b * 0.6; } }
    for (let i = 0; i < n; i++) { sL[i] *= g; sR[i] *= g; L[i] += sL[i]; R[i] += sR[i]; }
    if (o.stems) stems[pt.id] = [sL, sR];
    sends.push([sL, sR, pt.send ?? 1]);
  });
  // ---- space
  const rng = mkRng(piece.seed * 7 + 5), dry: [Float32Array, Float32Array] = [Float32Array.from(L), Float32Array.from(R)];
  let wet: [Float32Array, Float32Array] = [new Float32Array(n), new Float32Array(n)];
  const sp = effectiveSpace(piece.plan.space);
  if (style.id === "musicBox" && !sp) { // the recipe: ONE early reflection, 30 ms late, 14 dB down, no tail
    const d = Math.round(0.03 * sr), g = db(-14); for (let i = d; i < n; i++) { wet[0][i] = dry[0][i - d] * g; wet[1][i] = dry[1][i - d] * g * 0.9; L[i] += wet[0][i]; R[i] += wet[1][i]; }
  } else if (style.reverb !== "none" || sp) {
    const sL = new Float32Array(n), sR = new Float32Array(n);
    for (const [a, b, s] of sends) for (let i = 0; i < n; i++) { sL[i] += a[i] * s; sR[i] += b[i] * s; }
    const hall = style.reverb === "hall";
    for (let i = 0; i < n; i++) { sL[i] += haloL[i] * 0.35; sR[i] += haloL[i] * 0.35; } // pedal halo: undamped strings ring into the room
    const [wL, wR, tL, tR] = room(sL, sR, sr, { er: sp?.er ?? (hall ? 0.35 : 0.45), late: sp?.late ?? (hall ? 0.3 : 0.2), rt60: sp?.rt60 ?? (hall ? 2.3 : 1.5), predelay: hall ? 0.035 : 0.022, hp: sp?.hp ?? 300, lp: hall ? 7000 : 6000, seed: piece.seed, rng });
    for (let i = 0; i < n; i++) { L[i] += wL[i]; R[i] += wR[i]; }
    wet = [tL, tR]; // the guards measure the late tail: early reflections (< 40 ms) fuse with the direct sound (precedence effect)
  }
  // ---- master: DC/rumble high-pass (4th-order Butterworth at 30 Hz), lo-fi tone, end fade
  for (const q of [0.5412, 1.3066]) { Biquad.make(sr, "hp", 30, q).run(L); Biquad.make(sr, "hp", 30, q).run(R); }
  if (style.id === "lofi" && !piece.fx?.clean) { for (const c of [L, R]) { Biquad.make(sr, "lp", 8500, 0.6).run(c); Biquad.make(sr, "highshelf", 5000, 0.7, -3).run(c); for (let i = 0; i < n; i++) c[i] = Math.tanh(c[i] * 1.2) / 1.2; } }
  if (piece.fx?.tape) tape(L, R, sr, piece.fx.tape);
  const fade = Math.min(n, Math.round(0.25 * sr)); for (let i = 0; i < fade; i++) { const g = 0.5 - 0.5 * Math.cos((Math.PI * i) / fade); L[n - 1 - i] *= g; R[n - 1 - i] *= g; }
  let masterMode = o.master ?? "auto";
  if (masterMode === "auto") masterMode = style.master;
  const gainDb = masterMode === "none" ? 0 : master(L, R, sr, masterMode as "gentle" | "dense");
  return { L, R, perf, tempo, gainDb, masterMode, stems, piece, dry, wet };
};

/**
 * Sound v2 (mixProfiles.ts per style): voice -> pump -> corrective EQ per stem (level-matched, so
 * the calibrated balance holds) -> fader -> true stereo pan -> drum bus (comp + 2x oversampled
 * saturation) / music bus -> sends per part to the style's space (and a short kit room) -> mix bus:
 * tilt, glue (dense; gentle only with `gentleGlue`), light saturation (dense), per-band width with
 * mono lows -> master (gentle: static gain; dense: the smooth true-peak limiter).
 */
const energy = (L: Float32Array, R: Float32Array) => { let e = 0; for (let i = 0; i < L.length; i++) e += L[i] * L[i] + R[i] * R[i]; return e; };
/** Audible energy: above 40 Hz, so a voice's DC or subsonic drift never counts as level (the EQ's high-pass removes it, and the makeup must not replace it with audible gain). */
const audible = (L: Float32Array, R: Float32Array, sr: number) => energy(Biquad.make(sr, "hp", 40, 0.7071).run(Float32Array.from(L)), Biquad.make(sr, "hp", 40, 0.7071).run(Float32Array.from(R)));
const renderV2 = (piece: Piece, sr: number, o: RenderOpts = {}): Rendered => {
  const expressive = o.expressive ?? true, tempo = o.tempo ?? piece.plan.tempo, style = STYLES[piece.plan.style], prof: MixProfile = mixProfile(style.id, piece.mix);
  const perf = o.perf ?? perform(piece, tempo, { expressive, flatVelocity: o.flatVelocity });
  const n = o.seconds ? Math.round(o.seconds * sr) : Math.ceil((perf.lastOnset + piece.tail) * sr);
  const L = new Float32Array(n), R = new Float32Array(n), haloL = new Float32Array(n), stems: Record<string, [Float32Array, Float32Array]> = {};
  const dL = new Float32Array(n), dR = new Float32Array(n); // drum bus
  const mS = [new Float32Array(n), new Float32Array(n)], rS = [new Float32Array(n), new Float32Array(n)]; // main space send, kit room send
  let anyDrum = false, anyRoom = false;
  const dk = piece.fx?.duck, byIdx = dk ? piece.parts.findIndex((p) => p.id === dk.by) : -1;
  const pump = dk && byIdx >= 0 ? pumpCurve(perf.parts[byIdx].keys, tempo, sr, n, dk.depth ?? 0.4, dk.release) : null;
  // lo-fi production (lofiFx.ts): a lofi-style piece without its own profile gets the dusty one; a loop's modulations close on its length
  const lofi = piece.fx?.lofi ?? (style.id === "lofi" && !piece.fx?.clean ? LOFI_DUSTY : undefined), period = piece.plan.loop ? (piece.plan.sections.reduce((a, s) => a + s.bars * beatsPerBar(piece.plan.meter), 0) * 60) / tempo : undefined;
  const report: NonNullable<Rendered["mixReport"]> = {};
  const kitCtx: KitCtx = { legacy: false, style: piece.plan.style, choke: chokeTimes(piece.parts.map((pt, pi) => ({ inst: pt.inst, opts: pt.opts, keys: perf.parts[pi].keys }))) };
  piece.parts.forEach((pt, pi) => {
    if (o.only && !o.only(pt)) return;
    const keys = perf.parts[pi].keys; if (!keys.length) return;
    let sL: Float32Array, sR: Float32Array;
    // piano v2 (keysPiano.ts) unless the caller asks for the v1 model by passing RenderOpts.piano
    // the voice, then its stem processing (lo-fi colour, amp, transient gain): one job (v2Job), cached as a whole
    const job = v2Job(piece, pt, pi, keys, perf, sr, n, o, kitCtx), r = synth(job, o.cache); sL = r.L; sR = r.R;
    if (r.halo && (job.kind === "sampled" || (pt.inst === "piano" && (o.piano ? o.piano.pedal : pt.opts?.pedal !== false)))) for (let i = 0; i < n; i++) haloL[i] += r.halo[i] * db(pt.gainDb ?? 0);
    if (r.transientGr !== undefined) report.transientGr = Math.max(report.transientGr ?? 0, r.transientGr);
    if (pump && dk!.parts.includes(pt.id)) for (let i = 0; i < n; i++) { sL[i] *= pump[i]; sR[i] *= pump[i]; }
    // corrective EQ, then match the stem's RMS back (+-3 dB cap): EQ shapes the tone, the fader keeps the calibrated balance
    // the stem meter reads the part as the fader set it (pre-EQ, after its pan): the EQ is energy-neutral in the audible band
    const pre = o.stems ? [Float32Array.from(sL), Float32Array.from(sR)] as [Float32Array, Float32Array] : null;
    const before = audible(sL, sR, sr);
    let e = partEq(prof, pt.inst, pt.role);
    if (job.kind === "sampled" && (pt.role === "bass" || pt.role === "accomp")) {
      const bank = bankFor(pt.inst, typeof pt.opts?.variant === "string" ? pt.opts.variant : undefined)!;
      const selected = sampleZones(bank, (o.mixKeys?.[pi] ?? keys).slice().sort((a, b) => a.t - b.t || a.p - b.p), job.seed, pt.opts?.pedal === false ? [] : perf.pedal, undefined, measuredTone(bank, pt.opts ?? {}));
      const spectra = selected.map(z => bank.trim?.find(t => t.file === z.zone.file));
      const median = (xs: number[], fallback: number) => xs.length ? xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)] : fallback;
      e = recordedEq(e, pt.role, median(spectra.map(t => t?.bandExcessDb ?? 0), 0), median(spectra.map(t => t?.bandFractionDb ?? -Infinity), -Infinity));
    }
    runEq(sL, eqChain(sr, e)); runEq(sR, eqChain(sr, e));
    const after = audible(sL, sR, sr), mk = after > 0 && before > 0 ? Math.min(db(3), Math.max(db(-3), Math.sqrt(before / after))) : 1;
    const g = db(pt.gainDb ?? 0) * mk;
    for (let i = 0; i < n; i++) { sL[i] *= g; sR[i] *= g; }
    stereoPan(sL, sR, pt.pan ?? 0);
    if (pre) { const k = db(pt.gainDb ?? 0); for (let i = 0; i < n; i++) { pre[0][i] *= k; pre[1][i] *= k; } stereoPan(pre[0], pre[1], pt.pan ?? 0); stems[pt.id] = pre; }
    const isDrum = pt.role === "drum";
    for (let i = 0; i < n; i++) { if (isDrum) { dL[i] += sL[i]; dR[i] += sR[i]; } else { L[i] += sL[i]; R[i] += sR[i]; } }
    if (isDrum) anyDrum = true;
    const send = pt.send ?? prof.sends?.[pt.role] ?? ROLE_SEND[pt.role], toRoom = isDrum && prof.drumRoom !== null, dst = toRoom ? rS : mS;
    if (toRoom) anyRoom = true;
    if (send > 0) for (let i = 0; i < n; i++) { dst[0][i] += sL[i] * send; dst[1][i] += sR[i] * send; }
  });
  // ---- drum bus: glue the kit (4:1-ish, 3-4 dB on the hits), then oversampled saturation in parallel
  if (anyDrum && prof.drumBus) {
    const b = prof.drumBus; report.drumBusGr = compress(dL, dR, sr, { ratio: b.ratio, attackMs: b.attackMs, releaseMs: b.releaseMs, targetGrDb: b.targetGrDb }).p90GrDb;
    if (b.drive > 1) { const before = energy(dL, dR); saturate(dL, sr, b.drive, 0.08, b.satMix); saturate(dR, sr, b.drive, 0.08, b.satMix); const after = energy(dL, dR); if (after > 0) { const k = Math.sqrt(before / after); for (let i = 0; i < n; i++) { dL[i] *= k; dR[i] *= k; } } }
  }
  for (let i = 0; i < n; i++) { L[i] += dL[i]; R[i] += dR[i]; }
  // ---- space
  const rng = mkRng(piece.seed * 7 + 5), dry: [Float32Array, Float32Array] = [Float32Array.from(L), Float32Array.from(R)];
  let wet: [Float32Array, Float32Array] = [new Float32Array(n), new Float32Array(n)];
  const sp = effectiveSpace(piece.plan.space);
  if (style.id === "musicBox" && !sp && !piece.mix?.space) { // the recipe: ONE early reflection, 30 ms late, 14 dB down, no tail
    const d = Math.round(0.03 * sr), g = db(-14); for (let i = d; i < n; i++) { wet[0][i] = dry[0][i - d] * g; wet[1][i] = dry[1][i - d] * g * 0.9; L[i] += wet[0][i]; R[i] += wet[1][i]; }
  } else {
    const main: Space | null = prof.space || sp ? { ...(prof.space ?? { kind: "fdn", rt60: 1.5, predelayMs: 20, hp: 300, lp: 7000, er: 0.4, late: 0.25 }), ...(sp ?? {}) } : null;
    if (main) {
      for (let i = 0; i < n; i++) { mS[0][i] += haloL[i] * 0.35; mS[1][i] += haloL[i] * 0.35; } // pedal halo: undamped strings ring into the room
      if (!prof.drumRoom) for (let i = 0; i < n; i++) { mS[0][i] += rS[0][i]; mS[1][i] += rS[1][i]; }
      const [wL, wR, tL, tR] = reverb(mS[0], mS[1], sr, main, rng);
      for (let i = 0; i < n; i++) { L[i] += wL[i]; R[i] += wR[i]; }
      const recorded = roomFor(main.room);
      wet = [tL, tR]; report.space = recorded ? `${main.room} ${recorded.rt60}s (${recorded.sha256})` : `${main.kind} ${main.rt60}s`;
    }
    if (prof.drumRoom && anyRoom) {
      const [wL, wR, tL, tR] = reverb(rS[0], rS[1], sr, prof.drumRoom, mkRng(piece.seed * 11 + 3));
      for (let i = 0; i < n; i++) { L[i] += wL[i]; R[i] += wR[i]; wet[0][i] += tL[i]; wet[1][i] += tR[i]; }
      report.space = `${report.space ?? "no main space"} + kit room ${prof.drumRoom.rt60}s`;
    }
  }
  // ---- mix bus
  if (prof.tilt) for (const c of [L, R]) { Biquad.make(sr, "lowshelf", 1000, 0.5, -prof.tilt / 2).run(c); Biquad.make(sr, "highshelf", 1000, 0.5, prof.tilt / 2).run(c); }
  const glue = style.master === "dense" ? prof.glue : o.gentleGlue ? { ratio: 2, targetGrDb: 0.8, attackMs: 30, releaseMs: 250 } : null;
  if (glue) report.glueGr = compress(L, R, sr, { ...glue, kneeDb: 8, maxGrDb: 4 }).p90GrDb;
  if (style.master === "dense" && prof.busDrive > 1) { saturate(L, sr, prof.busDrive, 0.03); saturate(R, sr, prof.busDrive, 0.03); }
  bandWidth(L, R, sr, prof.width);
  // ---- master: DC/rumble high-pass (4th-order Butterworth at 30 Hz), the lo-fi machines (lofiFx: tape, vinyl, room tone, tilt), end fade
  for (const q of [0.5412, 1.3066]) { Biquad.make(sr, "hp", 30, q).run(L); Biquad.make(sr, "hp", 30, q).run(R); }
  if (lofi || piece.fx?.tape) lofiMaster(L, R, sr, piece.fx?.tape && { ...piece.fx.tape, period }, lofi, piece.seed);
  const fade = Math.min(n, Math.round(0.25 * sr)); for (let i = 0; i < fade; i++) { const g = 0.5 - 0.5 * Math.cos((Math.PI * i) / fade); L[n - 1 - i] *= g; R[n - 1 - i] *= g; }
  let masterMode = o.master ?? "auto";
  if (masterMode === "auto") masterMode = style.master;
  const gainDb = masterMode === "none" ? 0 : master(L, R, sr, masterMode as "gentle" | "dense", true);
  return { L, R, perf, tempo, gainDb, masterMode, stems, piece, dry, wet, mixReport: report };
};

/** The master stage, in place. Gentle: one static gain to -16 LUFS, pulled down if the true peak passes -1 dBTP. Dense: -14 LUFS through the look-ahead limiter. Returns the gain in dB. */
export const master = (L: Float32Array, R: Float32Array, sr: number, masterMode: "gentle" | "dense", v2 = false): number => {
  const n = L.length, target = masterMode === "dense" ? -14 : -16;
  let gainDb = target - loudness([L, R], sr).integrated;
  for (let i = 0; i < n; i++) { L[i] *= db(gainDb); R[i] *= db(gainDb); }
  const tp = truePeak([L, R]).dbtp;
  if (tp > -1) {
    if (masterMode === "gentle") { const cut = tp + 1.05; gainDb -= cut; for (let i = 0; i < n; i++) { L[i] *= db(-cut); R[i] *= db(-cut); } }
    else {
      const lim = v2 ? (a: Float32Array, b: Float32Array) => smoothLimiter(a, b, sr, db(-1.15)) : (a: Float32Array, b: Float32Array) => limiter(a, b, sr, db(-1.3));
      lim(L, R); const again = target - loudness([L, R], sr).integrated; if (again > 0) { const g = db(Math.min(again, 1)); for (let i = 0; i < n; i++) { L[i] *= g; R[i] *= g; } lim(L, R); }
      const tp2 = truePeak([L, R]).dbtp; // harsh waveforms (pulses) can still overshoot between samples: a last static trim
      if (tp2 > -1) { const cut = tp2 + 1.05; gainDb -= cut; for (let i = 0; i < n; i++) { L[i] *= db(-cut); R[i] *= db(-cut); } }
    }
  }
  return gainDb;
};

/**
 * A seamless loop of a `plan.loop` piece: rendered unmastered with its tail, the tail (reverb, delay
 * repeats, pad release) folded back onto the start, then mastered once. Tape wow and flutter are
 * snapped to a whole number of cycles per loop so the pitch drift meets itself at the seam.
 */
/** What renderLoop renders before it folds the tail: the loop's piece (no ritard, tape cycles snapped) and its length. */
export const loopSource = (piece: Piece) => {
  const beats = piece.plan.sections.reduce((a, s) => a + s.bars * beatsPerBar(piece.plan.meter), 0), loopS = (beats * 60) / piece.plan.tempo;
  const snap = (hz: number) => Math.max(1, Math.round(hz * loopS)) / loopS, tp = piece.fx?.tape;
  const p: Piece = { ...piece, plan: { ...piece.plan, loop: true, ritard: 1 }, fx: piece.fx && { ...piece.fx, tape: tp && { ...tp, wowHz: snap(tp.wowHz ?? 0.45), flutterHz: snap(tp.flutterHz ?? 6.2) } } };
  return { p, loopS, opts: { seconds: loopS + piece.tail, master: "none" as const } };
};
export const renderLoop = (piece: Piece, sr: number, o: { cache?: VoiceCache; stems?: boolean } = {}): Rendered & { loopS: number } => {
  const { p, loopS, opts } = loopSource(piece);
  const r = renderPiece(p, sr, { ...opts, cache: o.cache, stems: o.stems }), n = Math.round(loopS * sr), L = r.L.slice(0, n), R = r.R.slice(0, n);
  for (let i = n; i < r.L.length; i++) { L[i - n] += r.L[i]; R[i - n] += r.R[i]; }
  const mode = STYLES[piece.plan.style].master, gainDb = master(L, R, sr, mode, !piece.legacy);
  return { ...r, L, R, gainDb, masterMode: mode, loopS };
};

/**
 * Does the piece as written already fit `seconds`? Its last onset plus its tail lands within
 * max(0.5 s, one beat) of the length, and the tail keeps at least half its ring. Then a fit keeps
 * the written tempo and form, and the tail takes up the difference: music composed to picture must
 * not drift off its hits because the final ritard made the last bar a little longer.
 */
export const fitsAsWritten = (piece: Piece, seconds: number) => {
  const slack = seconds - (perform(piece, piece.plan.tempo, { expressive: true }).lastOnset + piece.tail);
  return Math.abs(slack) <= Math.max(0.5, 60 / piece.plan.tempo) && piece.tail + slack >= 0.5 * piece.tail;
};
/** The score for a film `seconds` long: as written when it already fits (fitsAsWritten), else the piece's own `refit` first (so it still ends on a phrase), then fitToDuration for the tempo. */
export const fitScore = (piece: Piece, seconds: number) => fitToDuration(!fitsAsWritten(piece, seconds) && piece.refit ? piece.refit(seconds) : piece, seconds);

/** Each part's stem level against the piece's targets (unmastered, pre-room: the mix as the parts were set). */
export const measureStems = (piece: Piece, sr: number, o: RenderOpts = {}, tolDb = 3) => {
  const r = renderPiece(piece, sr, { ...o, stems: true, master: "none" });
  return stemBalance(r.stems, piece.stemTargets ?? {}, tolDb, undefined, sr);
};

/** Look-ahead peak limiter (1.5 ms look-ahead, 120 ms release), used by dense styles only; `ceil` is linear. */
export const limiter = (L: Float32Array, R: Float32Array, sr: number, ceil: number) => {
  const n = L.length, la = Math.round(0.0015 * sr), rel = Math.exp(-1 / (0.12 * sr)), need = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = Math.max(Math.abs(L[i]), Math.abs(R[i])) * 1.12; need[i] = a > ceil ? ceil / a : 1; } // 1.12: inter-sample margin
  const g = new Float32Array(n); let cur = 1;
  for (let i = n - 1; i >= 0; i--) { let m = 1; for (let j = i; j < Math.min(n, i + la); j++) m = Math.min(m, need[j]); g[i] = m; }
  for (let i = 0; i < n; i++) { cur = g[i] < cur ? g[i] : 1 - (1 - cur) * rel; if (cur > g[i]) cur = g[i]; L[i] *= cur; R[i] *= cur; }
};

/**
 * Fit a piece to ANY duration. Candidate forms = every subset of `optional` sections dropped x the
 * `repeatable` group (contiguous repeatable sections, with their variations) repeated 0..n times.
 * For each, the tempo that lands the last onset at (seconds - tail) is solved; the form whose tempo
 * sits inside the style's range and closest to the written tempo wins. If no full form fits and the
 * piece has a `shortForm`, that is fitted instead. The tail absorbs the rest. Nothing in a piece
 * hard-codes the film's length.
 */
export const fitToDuration = (piece: Piece, seconds: number): { piece: Piece; tempo: number; order: number[]; form: string } => {
  const st = STYLES[piece.plan.style], T0 = piece.plan.tempo, lo = Math.max(st.tempo[0] * 0.9, T0 * 0.82), hi = Math.min(st.tempo[1] * 1.1, T0 * 1.18);
  const secs = piece.plan.sections, want = seconds - piece.tail;
  if (fitsAsWritten(piece, seconds)) return { piece, tempo: T0, order: secs.map((_, i) => i), form: "full" };
  const solve = (p: Piece) => { let tempo = T0; for (let k = 0; k < 5; k++) tempo *= perform(p, tempo, { expressive: true }).lastOnset / want; return tempo; };
  const opt = secs.map((s, i) => (s.optional ? i : -1)).filter((i) => i >= 0);
  const grp = secs.map((s, i) => (s.repeatable ? i : -1)).filter((i) => i >= 0);
  let best: { p: Piece; tempo: number; order: number[]; cost: number } | null = null, anyTooShort = false;
  for (let mask = 0; mask < 1 << opt.length; mask++) {
    const dropped = opt.filter((_, j) => mask & (1 << j));
    // ra = extra statements of the first repeatable section in place (A A B), rg = repeats of the whole group (A B A B)
    for (let ra = 0; ra <= (grp.length > 1 ? 2 : 0); ra++) for (let rg = 0; rg <= (grp.length ? 64 : 0); rg++) {
      let order = secs.map((_, i) => i);
      for (let k = 0; k < rg; k++) { const at = order.lastIndexOf(grp[grp.length - 1]); order = [...order.slice(0, at + 1), ...grp, ...order.slice(at + 1)]; }
      for (let k = 0; k < ra; k++) { const at = order.indexOf(grp[0]); order = [...order.slice(0, at + 1), grp[0], ...order.slice(at + 1)]; }
      order = order.filter((i) => !dropped.includes(i));
      if (!order.length) break;
      const p = mask === 0 && ra === 0 && rg === 0 ? piece : resequence(piece, order), tempo = solve(p);
      if (tempo > hi) break; // more repeats only make it longer
      if (tempo < lo) { anyTooShort = true; continue; }
      // dropping music costs more than a tempo nudge; back-to-back restatements cost a little
      const cost = Math.abs(Math.log(tempo / T0)) + 0.06 * dropped.length + 0.01 * rg + 0.025 * ra;
      if (!best || cost < best.cost) best = { p, tempo, order, cost };
    }
  }
  if (best) return { piece: { ...best.p, plan: { ...best.p.plan, tempo: best.tempo } }, tempo: best.tempo, order: best.order, form: "full" };
  if (!anyTooShort && piece.shortForm) { const f = fitToDuration(piece.shortForm(), seconds); return { ...f, form: `short form (${f.form})` }; }
  const tempo = anyTooShort ? lo : hi;
  return { piece: { ...piece, plan: { ...piece.plan, tempo } }, tempo, order: secs.map((_, i) => i), form: anyTooShort ? "full, tail extended" : "full, tail cut" };
};

/** What a Film's `audio(sampleRate)` returns: [L, R] at exactly the film's length. */
export const filmAudio = (piece: Piece, seconds: number) => Object.assign((sr: number): [Float32Array, Float32Array] => {
  const fit = fitScore(piece, seconds), r = renderPiece(fit.piece, sr, { seconds, tempo: fit.tempo });
  return [r.L, r.R];
}, { scores: [fitScore(piece, seconds).piece] });

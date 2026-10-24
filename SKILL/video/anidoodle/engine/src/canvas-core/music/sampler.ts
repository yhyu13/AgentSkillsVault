// Recorded voices. Decoding belongs to the host; a bank is only the manifest entry and 48 kHz PCM.
import type { Played } from "./perform";
import type { PedalSpan } from "./piano";
import type { Opts } from "./keysCore";
import { clamp, db, Biquad } from "./dsp";
import { nameOf, hz } from "./theory";
import { rng } from "../core";
import { pianoVelocity } from "./keysPiano";
import { bandWidth } from "./mixDsp";
import { bandEnvelope, mono } from "./pianoRuler";
import { PIANO_BANDS } from "./keysTables";

// Recordings made with spaced microphones can disagree between the sides in the body of the sound
// (150 Hz to 2 kHz), and a phone or any mono fold then cancels part of it. Each stereo recording is
// fixed once, when its bank is registered: a side whose body is clearly inverted is flipped back,
// then the body is narrowed (mono under 150 Hz, the side at half up to 2 kHz) while the air above
// 2 kHz keeps its full width. Pack banks are always 48 kHz (tools/sounds.mjs refuses anything else).
export const RECORDING_WIDTH = Object.freeze({ monoHz: 150, splitHz: 2000, mid: 0.5, high: 1, flipBelow: -0.3 });
const narrowed = new WeakSet<Float32Array>();
const bodyCorr = (L: Float32Array, R: Float32Array) => {
  const f = () => [Biquad.make(48000, "hp", 150, 0.707), Biquad.make(48000, "lp", 2000, 0.707)], a = f(), b = f(); let c = 0, x = 0, y = 0;
  for (let i = 0; i < L.length; i++) { const l = a[1].tick(a[0].tick(L[i])), r = b[1].tick(b[0].tick(R[i])); c += l * r; x += l * l; y += r * r; }
  return x * y > 0 ? c / Math.sqrt(x * y) : 1;
};
const narrow = (ch: Float32Array[]): Float32Array[] => {
  if (ch.length !== 2 || narrowed.has(ch[0])) return ch;
  const L = ch[0].slice(), R = ch[1].slice();
  if (bodyCorr(L, R) < RECORDING_WIDTH.flipBelow) for (let i = 0; i < R.length; i++) R[i] = -R[i];
  bandWidth(L, R, 48000, RECORDING_WIDTH); narrowed.add(L); narrowed.add(R); return [L, R];
};

export type SampleZone = { file: string; midi: number; layer: number; rr: number; frames: number; channels: number; peakDb: number; rmsDb: number; sha256: string; art?: "sus" | "rel"; unpitched?: boolean; measuredHz?: number; loop?: [number, number] };
export type SampleEntry = { title: string; source: string; license: string; kind: "struck" | "sustained"; range: [number, number]; layers: number; layerVelocity?: number[]; sparse?: boolean; maxShift?: number; damped: boolean; normalized?: boolean; zones: SampleZone[] };
export type SampleTrim = { file: string; midi: number; layer: number; measuredDb: number; modeledDb: number; correctionDb: number; requestedDb?: number; medianDb?: number; boostLimited?: boolean;
  /** 500 Hz-4 kHz energy as a fraction of audible energy, and its excess over the modeled reference. */
  bandFractionDb?: number; bandExcessDb?: number };
export type SampleBank = { entry: SampleEntry; zones: { zone: SampleZone; channels: Float32Array[] }[]; /** fixed modeled references at each recording's pitch and layer centre */ trim?: SampleTrim[] };
export type RegisteredBank = SampleBank & { id: string; hash: string };
const banks = new Map<string, RegisteredBank>();
export const bankId = (inst: string, variant?: string) => variant ? `${inst}.${variant}` : inst;
export const bankFor = (inst: string, variant?: string) => banks.get(bankId(inst, variant));
export const clearBanks = () => banks.clear();

/** Synchronous SHA-256 of ASCII identity data, also available in the browser without a decoder. */
const hash = (s: string) => {
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19], b = new Uint8Array(Math.ceil((s.length + 9) / 64) * 64), w = new Int32Array(64), rot = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  b[s.length] = 128; const view = new DataView(b.buffer); view.setUint32(b.length - 4, s.length * 8);
  for (let off = 0; off < b.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getInt32(off + i * 4);
    for (let i = 16; i < 64; i++) { const a = w[i - 15], c = w[i - 2]; w[i] = w[i - 16] + (rot(a, 7) ^ rot(a, 18) ^ (a >>> 3)) + w[i - 7] + (rot(c, 17) ^ rot(c, 19) ^ (c >>> 10)); }
    let [a,c,d,e,f,g,j,k] = h;
    for (let i = 0; i < 64; i++) { const t = (k + (rot(f, 6) ^ rot(f, 11) ^ rot(f, 25)) + ((f & g) ^ (~f & j)) + K[i] + w[i]) | 0, u = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & c) ^ (a & d) ^ (c & d))) | 0; k = j; j = g; g = f; f = (e + t) | 0; e = d; d = c; c = a; a = (t + u) | 0; }
    [a,c,d,e,f,g,j,k].forEach((v, i) => h[i] = (h[i] + v) | 0);
  }
  return h.map((v) => (v >>> 0).toString(16).padStart(8, "0")).join("");
};
/** Hashes pin the recordings; the playable metadata also belongs in the identity (a changed range or mapping is a new voice). */
export const bankIdentity = (entry: SampleEntry) => hash(JSON.stringify([entry.kind, entry.range, entry.layers, entry.layerVelocity ?? null, entry.damped, entry.normalized === true, entry.zones.map((z) => [z.sha256.toLowerCase(), z.midi, z.layer, z.rr, z.frames, z.channels, z.unpitched === true, z.loop ?? null, ...(z.art ? [z.art] : [])])]));
export const registerBank = (id: string, bank: SampleBank): RegisteredBank => {
  const e = bank.entry;
  if (!Array.isArray(e.range) || e.range.length !== 2 || !e.range.every((p) => Number.isInteger(p) && p >= 0 && p <= 127) || e.range[0] > e.range[1] || !Number.isInteger(e.layers) || e.layers < 1 || typeof e.damped !== "boolean") throw new Error(`${id}: invalid sample range, layers or damping`);
  if (e.layerVelocity !== undefined && (!Array.isArray(e.layerVelocity) || e.layerVelocity.length !== e.layers || e.layerVelocity.some((v, i) => !Number.isFinite(v) || v < 0 || v > 1 || (i > 0 && v <= e.layerVelocity![i - 1])))) throw new Error(`${id}: layerVelocity needs one increasing centre in 0..1 per layer`);
  if (!Array.isArray(e.zones)) throw new Error(`${id}: invalid sample zones`);
  if (e.kind === "sustained") { if (e.zones.some((z) => !z.loop)) throw new Error(`${id}: sustained zone without a loop`); throw new Error(`${id}: sustained banks are not supported in pack version 1`); }
  if (e.kind !== "struck" || !e.zones.length || bank.zones.length !== e.zones.length) throw new Error(`${id}: invalid or empty sample bank`);
  bank.zones.forEach(({ zone: z, channels }, i) => {
    if (z.art !== undefined && z.art !== "sus" && z.art !== "rel") throw new Error(`${id}: invalid articulation ${z.file}`);
    if (JSON.stringify(z) !== JSON.stringify(e.zones[i]) || !Number.isInteger(z.midi) || z.midi < e.range[0] || z.midi > e.range[1] || !Number.isInteger(z.layer) || z.layer < 1 || z.layer > e.layers || !Number.isInteger(z.rr) || z.rr < 1 || !Number.isInteger(z.frames) || z.frames < 1 || ![1, 2].includes(z.channels) || !/^[a-f0-9]{64}$/i.test(z.sha256) || channels.length !== z.channels || channels.some((c) => !(c instanceof Float32Array) || c.length !== z.frames)) throw new Error(`${id}: invalid zone or PCM ${z.file}`);
  });
  if (!e.zones.some((z) => !z.art)) throw new Error(`${id}: no ordinary sample zones`);
  if (bank.trim && (new Set(bank.trim.map((t) => t.file)).size !== bank.trim.length || bank.trim.some((t) => !e.zones.some((z) => z.file === t.file && z.midi === t.midi && z.layer === t.layer) || ![t.measuredDb, t.modeledDb, t.correctionDb, t.requestedDb ?? 0, t.medianDb ?? 0, t.bandFractionDb ?? 0, t.bandExcessDb ?? 0].every(Number.isFinite) || (t.medianDb !== undefined && Math.abs(t.correctionDb - t.medianDb) > 9.000001) || (t.boostLimited !== undefined && typeof t.boostLimited !== "boolean")))) throw new Error(`${id}: invalid sampled calibration`);
  const identity = bankIdentity(e), b = { ...bank, zones: bank.zones.map((z) => ({ ...z, channels: narrow(z.channels) })), id, hash: bank.trim ? hash(JSON.stringify([identity, bank.trim])) : identity }; banks.set(id, b); return b;
};

const layerV = (e: SampleEntry, layer: number) => e.layerVelocity?.[layer - 1] ?? (layer - 0.5) / e.layers;
/** Relative filtering is the default; the alternatives support a controlled audition. */
export const sampleCutoff = (e: SampleEntry, z: SampleZone, k: Played, sr: number, mode?: string) => {
  const tone = clamp(k.tone ?? k.v, 0, 1), centre = layerV(e, z.layer);
  if (mode === "off" || (mode !== "asis" && tone >= centre)) return Infinity;
  const t = mode !== "asis" ? 1 - Math.max(0, centre - tone) : tone;
  return Math.min(sr * 0.45, 350 + 17650 * t * t);
};
// Tone colour. A key played between two recorded loudness layers should take on the tone of a blow at
// that strength, not only its level: a harder hammer brings the upper partials up much faster than the
// fundamental. A louder take is picked and softened toward the blow: the measurements showed that
// darkening a loud take lands far closer to the real softer take than brightening a soft one. A take
// moved to a neighbouring key also drags its body resonances along with the pitch, so the colour is
// read between the real takes on either side of the key instead. Each take's tone at the strike (first
// 150 ms, half-octave bands, level removed) is measured once; the difference between the colour asked
// for and the colour the moved take brings becomes a gentle octave-band EQ that leaves the overall level
// to the velocity law. Cuts go deeper than boosts because a boost also lifts the take's noise. `shift`
// is how much of the resampling's move of the colour is taken out: the full move fitted the held-out
// keys best but darkened notes halfway between recordings inside fast runs, so half is the default
// (`opts.toneShift` auditions others).
export const TONE_COLOUR = Object.freeze({ attack: 0.15, cutDb: -18, boostDb: 6, minDb: 0.25, q: 1.41, shift: 0.5 });
type Zone = SampleBank["zones"][number];
const colours = new WeakMap<Float32Array, number[]>();
const colourOf = (ch: Float32Array[]) => {
  let c = colours.get(ch[0]); if (c) return c;
  const env = bandEnvelope(mono(ch), 48000, 0, TONE_COLOUR.attack), total = 10 * Math.log10(env.reduce((s, x) => s + Math.pow(10, x / 10), 0));
  c = env.map((x) => x - total); colours.set(ch[0], c); return c;
};
// Treble level across the keyboard. Single takes can come out duller or brighter than the keys around
// them (a different strike, a mic nudge), and a run crossing from one take to the next then jumps in
// brightness. Each take's treble against its body is compared with what the takes on either side
// predict for it (same layer, same articulation); a take that stands out past the usual spread gets a
// fixed, gentle shelf toward the line. A dull take is lifted at most `liftDb` (a lift also raises its noise) and the
// brighter neighbours come down by `share` of what is left, so the step is split instead of boosted.
export const TREBLE_LEVEL = Object.freeze({ cutDb: -9, liftDb: 4, share: 0.5, reach: 2, spreadDb: 3, stepDb: 6 });
const power = (c: number[], js: number[]) => 10 * Math.log10(js.reduce((s, j) => s + Math.pow(10, c[j] / 10), 0));
const regions = (f0: number) => {
  const body = PIANO_BANDS.flatMap((f, j) => (f >= 0.7 * f0 && f <= 2.8 * f0 ? [j] : [])), treble = PIANO_BANDS.flatMap((f, j) => (f >= Math.max(1500, 3 * f0) && f <= 12000 ? [j] : []));
  return { body, treble };
};
const tiltOf = (c: number[], f0: number) => { const { body, treble } = regions(f0); return body.length && treble.length ? power(c, treble) - power(c, body) : NaN; };
const shelf = (f0: number, db: number) => { const { body, treble } = regions(f0), top = Math.max(...body, -1); return PIANO_BANDS.map((_, j) => (treble.includes(j) ? db : j > top && j < Math.min(...treble) ? db / 2 : j > Math.max(...treble) ? db : 0)); };
const fixes = new WeakMap<object, Map<Zone, number[]>>();
/** The fixed shelf (dB per band) each take gets toward the treble level of its neighbours. */
export const trebleFix = (bank: SampleBank) => {
  let out = fixes.get(bank.zones); if (out) return out;
  out = new Map(); const T = TREBLE_LEVEL, groups = new Map<string, Zone[]>();
  if (("id" in bank ? String((bank as RegisteredBank).id) : "") !== "piano") { fixes.set(bank.zones, out); return out; } // measured on the grand only (it made the upright's held-out keys worse)
  for (const o of bank.zones) if (o.zone.art !== "rel" && !o.zone.unpitched) { const k = `${o.zone.art ?? ""}|${o.zone.layer}|${o.zone.rr}`; groups.set(k, [...(groups.get(k) ?? []), o]); }
  for (const g of groups.values()) {
    g.sort((a, b) => a.zone.midi - b.zone.midi);
    const t = g.map((o) => tiltOf(colourOf(o.channels), hz(o.zone.midi)));
    const want = g.map((o, i) => {
      // a straight line through the takes on either side (the take itself left out) follows the
      // register's own slope; only what stands out past the usual take-to-take spread is corrected
      const xs: number[] = [], ys: number[] = [];
      for (let k = Math.max(0, i - T.reach); k <= Math.min(g.length - 1, i + T.reach); k++) if (k !== i && Number.isFinite(t[k])) { xs.push(g[k].zone.midi); ys.push(t[k]); }
      if (xs.length < 2 || !Number.isFinite(t[i]) || !xs.some((x) => x < o.zone.midi) || !xs.some((x) => x > o.zone.midi)) return 0;
      const mx = xs.reduce((p, q) => p + q, 0) / xs.length, my = ys.reduce((p, q) => p + q, 0) / ys.length; let num = 0, den = 0;
      xs.forEach((x, k) => { num += (x - mx) * (ys[k] - my); den += (x - mx) * (x - mx); });
      const r = my + (den ? num / den : 0) * (o.zone.midi - mx) - t[i];
      return Math.sign(r) * Math.max(0, Math.abs(r) - T.spreadDb);
    });
    const corr = want.map((w) => clamp(w, T.cutDb, T.liftDb));
    want.forEach((w, i) => { const left = w - corr[i]; if (left > 0) for (const j of [i - 1, i + 1]) if (j >= 0 && j < g.length) corr[j] = clamp(corr[j] - T.share * left, T.cutDb, T.liftDb); });
    // a register can also turn a corner between two neighbouring takes with neither one odd on its own;
    // a run across that corner then jumps. Steps wider than `stepDb` are split: the duller take is lifted
    // (inside the cap) and the brighter one comes down by the rest.
    for (let pass = 0; pass < 3; pass++) for (let i = 0; i + 1 < g.length; i++) {
      if (!Number.isFinite(t[i]) || !Number.isFinite(t[i + 1])) continue;
      const a = t[i] + corr[i], b = t[i + 1] + corr[i + 1], excess = Math.abs(a - b) - T.stepDb; if (excess <= 0) continue;
      const [dull, bright] = a < b ? [i, i + 1] : [i + 1, i], lift = Math.min(excess / 2, T.liftDb - corr[dull]);
      corr[dull] += Math.max(0, lift); corr[bright] = clamp(corr[bright] - (excess - Math.max(0, lift)), T.cutDb, T.liftDb);
    }
    g.forEach((o, i) => { if (Math.abs(corr[i]) >= TONE_COLOUR.minDb) out!.set(o, shelf(hz(o.zone.midi), corr[i])); });
  }
  fixes.set(bank.zones, out); return out;
};
const levelled = (bank: SampleBank, o: Zone) => { const c = colourOf(o.channels), f = trebleFix(bank).get(o); return f ? c.map((y, j) => y + f[j]) : c; };
/** The colour of key `midi` at velocity `v`, read between its layers (one layer step past the end ones at most). */
const colourAt = (bank: SampleBank, midi: number, art: SampleZone["art"], v: number) => {
  const byLayer = new Map<number, Zone>();
  for (const o of bank.zones) if (o.zone.midi === midi && o.zone.art === art && (!byLayer.has(o.zone.layer) || o.zone.rr < byLayer.get(o.zone.layer)!.zone.rr)) byLayer.set(o.zone.layer, o);
  const pts = [...byLayer.values()].sort((a, b) => a.zone.layer - b.zone.layer).map((o) => ({ c: layerV(bank.entry, o.zone.layer), env: levelled(bank, o) }));
  if (pts.length < 2) return pts[0]?.env ?? null;
  const lo = pts[0].c - (pts[1].c - pts[0].c), hi = pts[pts.length - 1].c + (pts[pts.length - 1].c - pts[pts.length - 2].c), x = clamp(v, lo, hi);
  let i = 0; while (i < pts.length - 2 && x > pts[i + 1].c) i++;
  const a = pts[i], b = pts[i + 1], t = (x - a.c) / (b.c - a.c);
  return a.env.map((y, j) => y + (b.env[j] - y) * t);
};
/** A colour moved up by `semis` (half-octave bands: six semitones per band), as resampling moves it. */
const shiftBands = (c: number[], semis: number) => c.map((_, j) => { const x = clamp(j - semis / 6, 0, c.length - 1), i = Math.min(c.length - 2, Math.floor(x)), t = x - i; return c[i] + (c[i + 1] - c[i]) * t; });
/** The per-band change (dB, one per PIANO_BANDS entry) that gives zone `z`, played at key `p` and velocity `v`, the colour of the real
 * takes around it; null when there is nothing to correct. A velocity at or above the take's own layer is never brightened. */
export const toneColour = (bank: SampleBank, z: Zone, p: number, v: number, follow: number = TONE_COLOUR.shift, align = 0): number[] | null => {
  const art = z.zone.art, ownV = layerV(bank.entry, z.zone.layer), vv = Math.min(v, ownV), d = z.zone.unpitched ? 0 : p - z.zone.midi;
  const keys = [...new Set(bank.zones.filter((o) => o.zone.art === art).map((o) => o.zone.midi))], lo = Math.max(...keys.filter((m) => m <= p)), hi = Math.min(...keys.filter((m) => m >= p));
  const between = d !== 0 && Number.isFinite(lo) && Number.isFinite(hi) && lo !== hi;
  let target: number[] | null;
  if (between) { const a = colourAt(bank, lo, art, vv), b = colourAt(bank, hi, art, vv), t = (p - lo) / (hi - lo); const sa = a && shiftBands(a, (p - lo) * align), sb = b && shiftBands(b, (p - hi) * align); target = sa && sb ? sa.map((y, j) => y + (sb[j] - y) * t) : null; }
  else target = colourAt(bank, z.zone.midi, art, vv);
  if (!target) return null;
  const own = between ? shiftBands(colourOf(z.channels), d * follow) : colourOf(z.channels), raw = target.map((y, j) => y - own[j]);
  const capped = raw.map((_, j) => clamp((raw[Math.max(0, j - 1)] + 2 * raw[j] + raw[Math.min(raw.length - 1, j + 1)]) / 4, TONE_COLOUR.cutDb, TONE_COLOUR.boostDb));
  // keep the overall level where the velocity law puts it
  const before = own.reduce((s, y) => s + Math.pow(10, y / 10), 0), after = own.reduce((s, y, j) => s + Math.pow(10, (y + capped[j]) / 10), 0), shift = 10 * Math.log10(before / after);
  const delta = capped.map((x) => x + shift);
  return delta.some((x) => Math.abs(x) >= TONE_COLOUR.minDb) ? delta : null;
};
const peakDb = (f: number, fc: number, g: number, q: number, sr: number) => {
  const bq = Biquad.make(sr, "peak", fc, q, g), w = (2 * Math.PI * f) / sr, c1 = Math.cos(w), s1 = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
  const nr = bq.b0 + bq.b1 * c1 + bq.b2 * c2, ni = -bq.b1 * s1 - bq.b2 * s2, dr = 1 + bq.a1 * c1 + bq.a2 * c2, di = -bq.a1 * s1 - bq.a2 * s2;
  return 10 * Math.log10((nr * nr + ni * ni) / (dr * dr + di * di));
};
/** Octave peaking filters whose combined response lands on the colour at each octave centre (a few rounds of correction, because neighbours overlap). */
export const colourFilters = (delta: number[], sr: number) => {
  const centres = PIANO_BANDS.filter((_, j) => j % 2 === 0), want = delta.filter((_, j) => j % 2 === 0).map((d, k) => (centres[k] < 0.45 * sr ? d : 0)), g = want.slice();
  for (let round = 0; round < 6; round++) {
    const got = centres.map((f) => centres.reduce((s, fc, k) => s + (centres[k] < 0.45 * sr ? peakDb(f, fc, g[k], TONE_COLOUR.q, sr) : 0), 0));
    for (let k = 0; k < g.length; k++) g[k] = clamp(g[k] + 0.8 * (want[k] - got[k]), TONE_COLOUR.cutDb - 6, TONE_COLOUR.boostDb + 6);
  }
  return centres.flatMap((fc, k) => (fc < 0.45 * sr && Math.abs(g[k]) >= TONE_COLOUR.minDb ? [Biquad.make(sr, "peak", fc, TONE_COLOUR.q, g[k])] : []));
};
const pianoFamily = (bank: SampleBank) => ("id" in bank ? String((bank as RegisteredBank).id) : "").split(".")[0] === "piano";
/** Tone colour is on for the piano banks unless a voice asks for the older lowpass (or a sampleFilter audition). */
export const measuredTone = (bank: SampleBank, opts: Opts) => (opts.velocityTone ?? (pianoFamily(bank) ? "measured" : "lowpass")) === "measured" && opts.sampleFilter === undefined;
export const sampleGain = (e: SampleEntry, z: SampleZone, v: number) => e.normalized ? pianoVelocity(v) * db(-8 * Math.max(0, 0.6 - v)) : v <= 0 ? 0 : db(clamp(16 * (v - layerV(e, z.layer)), -6, 6));
/** A drum tuned to one note (a timpani in a drum lane) plays that note whatever the lane wrote, moved by octaves into what was recorded. */
export const pinnedPitch = (pitch: number, range: readonly [number, number] | readonly number[]) => { if (!Number.isFinite(pitch)) throw new Error(`a pinned pitch must be a note number, got ${pitch}`); let p = Math.round(pitch); while (p < range[0]) p += 12; while (p > range[1]) p -= 12; return p < range[0] ? range[0] : p; };
/** Nearest pitch, then nearest layer, then this note's seeded recording. State stays local to a render. */
export const sampleZones = (bank: SampleBank, keys: Played[], seed: number, pedal: PedalSpan[] = [], art?: "rel", louder = false) => {
  const previous = new Map<string, SampleBank["zones"][number]>(), e = bank.entry, pool = bank.zones.filter(({ zone }) => zone.art === art);
  return keys.map((k, i) => {
    if (k.p < e.range[0] || k.p > e.range[1]) throw new Error(`${e.title}: note ${nameOf(k.p)} (${k.p}) outside range ${nameOf(e.range[0])}-${nameOf(e.range[1])} (${e.range.join("-")})`);
    let pitch = Infinity, distance = Infinity;
    for (const { zone: z } of pool) { const d = Math.abs(z.midi - k.p); if (d < distance || (d === distance && z.midi < pitch)) { pitch = z.midi; distance = d; } }
    const atPitch = pool.filter(({ zone }) => zone.midi === pitch), v = clamp(k.v, 0, 1);
    let layer = 0, delta = Infinity;
    for (const { zone: z } of atPitch) { const d = Math.abs(layerV(e, z.layer) - v); if (d < delta || (Math.abs(d - delta) < 1e-12 && z.layer > layer)) { layer = z.layer; delta = d; } }
    // with tone colour on, the take at or just above the blow is softened instead (a soft take cannot grow the partials it never had)
    if (louder) { const up = atPitch.map(({ zone }) => zone.layer).filter((l) => layerV(e, l) >= v - 1e-9); if (up.length) layer = Math.min(...up); }
    const down = !art && pedal.some(([a, b]) => k.t >= a && k.t < b), r = rng(k.vary?.seed ?? ((seed * 7919 + i * 104729 + k.p * 31) >>> 0));
    const pick = (layer: number) => {
      const sus = down ? bank.zones.filter(({ zone }) => zone.art === "sus" && zone.midi === pitch && zone.layer === layer) : [];
      const choices = (sus.length ? sus : atPitch.filter(({ zone }) => zone.layer === layer)).sort((a, b) => a.zone.rr - b.zone.rr);
      if (!choices.length) throw new Error(`${e.title}: no recording for ${nameOf(k.p)}`);
      const last = previous.get(`${k.p}:${choices[0].zone.art ?? "ordinary"}`), available = choices.length > 1 ? choices.filter((z) => z !== last) : choices;
      return available[Math.floor(r() * available.length)];
    };
    let z = pick(layer);
    // A near-silent recording must not lift its noise to the reference. Try a louder layer at this pitch.
    while (!art && bank.trim?.find((t) => t.file === z.zone.file)?.boostLimited) {
      const next = Math.min(...atPitch.filter(({ zone }) => zone.layer > z.zone.layer).map(({ zone }) => zone.layer));
      if (!Number.isFinite(next)) break; z = pick(next);
    }
    previous.set(`${k.p}:${z.zone.art ?? "ordinary"}`, z); return z;
  });
};

/** Blackman-windowed sinc, narrowed before any downsampling (pitch up OR a 24 kHz stem). */
const sincTable = (rate: number) => {
  const taps = 48, phases = 256, cut = 0.94 / Math.max(1, rate), table = new Float64Array(taps * (phases + 1));
  for (let p = 0; p <= phases; p++) {
    let sum = 0; for (let t = 0; t < taps; t++) { const d = t - taps / 2 + 1 - p / phases, x = Math.PI * d * cut, win = 0.42 + 0.5 * Math.cos(Math.PI * d / (taps / 2)) + 0.08 * Math.cos(2 * Math.PI * d / (taps / 2)), v = Math.abs(d) >= taps / 2 ? 0 : (Math.abs(x) < 1e-12 ? cut : cut * Math.sin(x) / x) * win; table[p * taps + t] = v; sum += v; }
    for (let t = 0; t < taps; t++) table[p * taps + t] /= sum;
  }
  return table;
};
const sincRead = (a: Float32Array, x: number, table: Float64Array) => {
  const i = Math.floor(x), ph = (x - i) * 256, p = Math.floor(ph), f = ph - p; let y = 0;
  for (let t = 0; t < 48; t++) { const j = i - 23 + t; if (j >= 0 && j < a.length) { const k = p * 48 + t; y += a[j] * (table[k] + f * (table[k + 48] - table[k])); } }
  return y;
};

// Key-up on a damped string. The felt kills everything above the split in tDamp; below it a bass string
// rings on for longer (by the recorded release takes: the 30-250 Hz band of the lowest keys falls at
// roughly a third of the rate of the band above it). `lowMul` is the bass end's stretch, fading to none
// by middle C, where the fundamental sits above the split anyway. On by default for the grand only: its
// release takes are what the numbers were checked against (the upright's release takes are key noise).
export const RELEASE_SPLIT = Object.freeze({ crossHz: 250, lowMul: 3 });
export const releaseLow = (p: number, tDamp: number, lowMul: number = RELEASE_SPLIT.lowMul) => tDamp * (1 + (lowMul - 1) * clamp((60 - p) / 36, 0, 1));
export const samplerVoice = (bank: SampleBank, keys: Played[], pedal: PedalSpan[], sr: number, n: number, opts: Opts, seed: number) => {
  if (!Number.isFinite(sr) || sr <= 0 || !Number.isInteger(n) || n < 0) throw new Error("sampler: invalid sample rate or length");
  if (bank.entry.kind !== "struck") throw new Error(`${bank.entry.title}: ${bank.entry.zones.some((z) => !z.loop) ? "sustained zone without a loop" : "sustained banks are not supported in pack version 1"}`);
  const L = new Float32Array(n), R = new Float32Array(n), halo = new Float32Array(n), e = bank.entry;
  const measured = measuredTone(bank, opts);
  const sorted = keys.slice().sort((a, b) => a.t - b.t || a.p - b.p), usePedal = opts.pedal !== false, zones = sampleZones(bank, sorted, seed, usePedal ? pedal : [], undefined, measured);
  const releases = e.damped && bank.zones.some(({ zone }) => zone.art === "rel") ? sampleZones(bank, sorted, seed + 401, [], "rel") : null;
  const id = "id" in bank ? String(bank.id) : "", grand = id.split(".")[0] === "piano" && !["upright", "honky"].includes(id.split(".")[1] ?? String(opts.variant));
  const pedalAt = (t: number) => usePedal && pedal.some(([a, b]) => t >= a && t < b);
  const pedalUpAfter = (t: number) => { for (const [a, b] of pedal) if (t >= a && t < b) return b; return t; };
  sorted.forEach((k, idx) => {
    const { zone: z, channels } = zones[idx], i0 = Math.round(k.t * sr); if (i0 >= n) return;
    const rate = (48000 / sr) * (z.unpitched ? 1 : Math.pow(2, (k.p - z.midi) / 12 + (k.vary?.cents ?? 0) / 1200));
    const table = rate !== 1 ? sincTable(rate) : null, v = clamp(k.v, 0, 1);
    // Keep the source's layer levels intact. A normalized source gets all its dynamics from this law.
    const gain = sampleGain(e, z, v) * db((k.vary?.db ?? 0) + (bank.trim?.find((t) => t.file === z.file)?.correctionDb ?? 0));
    const tone = clamp(k.tone ?? k.v, 0, 1), colour = measured ? toneColour(bank, zones[idx], k.p, tone, typeof opts.toneShift === "number" ? opts.toneShift : undefined, typeof opts.toneAlign === "number" ? opts.toneAlign : undefined) : null;
    const eqL = colour ? colourFilters(colour, sr) : [], eqR = colour ? colourFilters(colour, sr) : [];
    const fc = colour ? Infinity : sampleCutoff(e, z, k, sr, typeof opts.sampleFilter === "string" ? opts.sampleFilter : undefined), alpha = 1 - Math.exp(-2 * Math.PI * fc / sr);
    let damp = e.damped ? (pedalAt(k.off) ? pedalUpAfter(k.off) : k.off) : Infinity;
    if (grand && k.p >= 89) damp = Infinity; // the top grand keys have no dampers; vibes and uprights still stop
    const releaseAt = damp;
    if (e.damped) for (let j = idx + 1; j < sorted.length; j++) if (sorted[j].p === k.p && sorted[j].t > k.t) { damp = Math.min(damp, sorted[j].t + 0.004); break; }
    const tDamp = 0.08 + 0.45 * clamp((60 - k.p) / 36, 0, 1), dampI = Math.round((damp - k.t) * sr), dec = Math.exp(-6.91 / (tDamp * sr));
    // felt stops the upper partials at once while a long bass string keeps humming under it
    const split = e.damped && (opts.release ?? (id === "piano" ? "two-band" : "flat")) === "two-band", tLow = split ? releaseLow(k.p, tDamp, typeof opts.releaseLowMul === "number" ? opts.releaseLowMul : undefined) : tDamp, decLow = Math.exp(-6.91 / (tLow * sr)), lowBqL = split ? Biquad.make(sr, "lp", RELEASE_SPLIT.crossHz, 0.707) : null, lowBqR = split ? Biquad.make(sr, "lp", RELEASE_SPLIT.crossHz, 0.707) : null;
    const len = Math.min(n - i0, Math.ceil(z.frames / rate), damp === Infinity ? Infinity : dampI + Math.round(Math.max(tDamp, tLow) * 1.6 * sr) + 1), inPedal = e.damped && (pedalAt(k.t) || pedalAt(k.t + 0.25));
    const read = (a: Float32Array, i: number) => table ? sincRead(a, i * rate, table) : a[i];
    const rel = releases?.[idx], window = Math.max(1, Math.round(0.02 * sr)); let remaining = 0, count = 0;
    let l = 0, r = 0, env = 1, envLow = 1, lowL = 0, lowR = 0;
    for (let i = 0; i < len; i++) {
      if (i >= dampI) { env *= dec; envLow *= decLow; }
      let x = read(channels[0], i), y = channels.length === 1 ? x : read(channels[1], i);
      for (const f of eqL) x = f.tick(x);
      for (const f of eqR) y = f.tick(y);
      l = fc === Infinity ? x : l + alpha * (x - l); r = channels.length === 1 && !eqR.length ? l : fc === Infinity ? y : r + alpha * (y - r);
      const j = i0 + i;
      let a: number, b: number;
      if (split) { lowL = lowBqL!.tick(l); lowR = lowBqR!.tick(r); a = (lowL * envLow + (l - lowL) * env) * gain; b = (lowR * envLow + (r - lowR) * env) * gain; }
      else { a = l * gain * env; b = r * gain * env; }
      if (j < 0) continue;
      L[j] += a; R[j] += b;
      if (rel && i >= Math.max(0, dampI - window) && i < dampI) { remaining += (a * a + b * b) * 0.5; count++; }
      if (inPedal) halo[j] += 0.5 * (a + b);
    }
    // Match the release noise to the string's last 20 ms, 15 dB below it. Never extend a dead string.
    const allowance = k.p === e.range[0] || k.p === e.range[1] ? 3 : 2;
    if (rel && Number.isFinite(releaseAt) && dampI > 0 && (releaseAt - k.t) * sr < z.frames / rate && count && (rel.zone.unpitched || Math.abs(k.p - rel.zone.midi + (k.vary?.cents ?? 0) / 100) <= allowance)) {
      const rz = rel.zone, rr = 48000 / sr * (rz.unpitched ? 1 : Math.pow(2, (k.p - rz.midi) / 12 + (k.vary?.cents ?? 0) / 1200)), rt = rr !== 1 ? sincTable(rr) : null;
      const readRel = (a: Float32Array, i: number) => rt ? sincRead(a, i * rr, rt) : a[i];
      const size = Math.ceil(rz.frames / rr), ref = Math.min(size, Math.round(0.5 * sr)); let power = 0;
      for (let i = 0; i < ref; i++) { const a = readRel(rel.channels[0], i), b = readRel(rel.channels[rz.channels - 1], i); power += (a * a + b * b) * 0.5; }
      const g = power > 0 ? Math.sqrt(remaining / count / (power / ref)) * db(-15) * Math.pow(dec, Math.round((releaseAt - damp) * sr)) : 0, start = Math.round(releaseAt * sr);
      for (let i = 0; i < size && start + i < n; i++) if (start + i >= 0) { L[start + i] += readRel(rel.channels[0], i) * g; R[start + i] += readRel(rel.channels[rz.channels - 1], i) * g; }
    }
  });
  return { L, R, halo };
};

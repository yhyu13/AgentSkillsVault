// NOVELTY: does a new score sound like one we already shipped? Alex heard "Daylight" as "almost the
// same as our launch track" although its key, chords and pitches were new: every layer kept the
// launch's RHYTHMS, the same contour, the same chord colours and the same form. So the fingerprint
// is mostly rhythm and shape, not pitch:
//   melody rhythm (onset positions per bar, inter-onset n-grams), melody contour (up/down n-grams),
//   melody intervals (transposition-free n-grams), other lines' rhythm (counter, bass), drum bars,
//   chord function (root vs key + quality) n-grams, chord-quality n-grams, section-kind sequence.
// Each feature is a bag of n-grams; similarity is the cosine of the bags; the score is a weighted
// mean. Two stricter gates fail outright: any 6-note melody fragment (intervals + durations) taken
// from a shipped piece, transposed or not; and any distinctive 8-note melody shape (intervals only),
// so a quote re-barred into another meter, stretched or re-rhythmed is caught too.
import type { Piece, Note } from "./plan";
import { beatsPerBar } from "./plan";
import { pcOf } from "./theory";

type Bag = Map<string, number>;
export type Fingerprint = Record<Feature, Bag>;
export type Feature = "melodyRhythm" | "melodyContour" | "melodyIntervals" | "lineRhythm" | "drums" | "chords" | "qualities" | "form";
export const NOVELTY_WEIGHTS: Record<Feature, number> = { melodyRhythm: 0.2, melodyContour: 0.15, melodyIntervals: 0.1, lineRhythm: 0.15, drums: 0.15, chords: 0.1, qualities: 0.07, form: 0.08 };
/** Above this a piece is too close to a shipped one. Calibrated: the copy fixture scores far above it, unrelated demos far below (tools/music-unit.mjs). */
export const NOVELTY_THRESHOLD = 0.5;

const add = (b: Bag, k: string, w = 1) => b.set(k, (b.get(k) ?? 0) + w);
const q = (x: number) => Math.round(x * 12); // 1/12 beat: 16ths and triplets both land
const grams = <T>(xs: T[], n: number, f: (g: T[]) => string, b: Bag, prefix = "") => { for (let i = 0; i + n <= xs.length; i++) add(b, prefix + f(xs.slice(i, i + n))); };
/** One voice per role: the top note of each onset (bass: the bottom). */
const voice = (notes: Note[], low = false) => { const by = new Map<number, Note>(); for (const n of notes) { const k = Math.round(n.t * 96), o = by.get(k); if (!o || (low ? n.p < o.p : n.p > o.p)) by.set(k, n); } return [...by.values()].sort((a, b) => a.t - b.t); };
const quality = (name: string) => { const s = name.replace(/^[A-G][#b]?/, "").split("/")[0]; return /^(maj|M|Δ)/.test(s) ? "maj7" : /^(m|min|-)(?!aj)/.test(s) ? (/b5|ø/.test(s) ? "hdim" : "min") : /dim|°/.test(s) ? "dim" : /aug|\+/.test(s) ? "aug" : /sus/.test(s) ? "sus" : /\d/.test(s) ? "dom" : "maj"; };

export const fingerprint = (p: Piece): Fingerprint => {
  const bpb = beatsPerBar(p.plan.meter), F = Object.fromEntries(Object.keys(NOVELTY_WEIGHTS).map((k) => [k, new Map()])) as Fingerprint;
  const role = (r: string) => p.parts.flatMap((pt) => pt.notes.filter((n) => n.role === r));
  const rhythm = (ns: Note[], b: Bag, pre: string) => {
    const bars = new Map<number, number[]>(); for (const n of ns) { const bar = Math.floor(n.t / bpb + 1e-9); (bars.get(bar) ?? bars.set(bar, []).get(bar)!).push(q(n.t - bar * bpb)); }
    for (const pos of bars.values()) add(b, `${pre}bar:${pos.join(",")}`);
    const ioi = ns.slice(1).map((n, i) => q(n.t - ns[i].t)); grams(ioi, 3, (g) => g.join(","), b, `${pre}ioi:`);
  };
  const mel = voice(role("melody"));
  rhythm(mel, F.melodyRhythm, "");
  const iv = mel.slice(1).map((n, i) => n.p - mel[i].p);
  grams(iv.map((x) => (x > 0 ? "u" : x < 0 ? "d" : "s")), 4, (g) => g.join(""), F.melodyContour);
  grams(iv, 3, (g) => g.join(","), F.melodyIntervals);
  rhythm(voice(role("color")), F.lineRhythm, "color:"); rhythm(voice(role("bass"), true), F.lineRhythm, "bass:");
  for (const pt of p.parts) if (pt.role === "drum") { const bars = new Map<number, number[]>(); for (const n of pt.notes) { const bar = Math.floor(n.t / bpb + 1e-9); (bars.get(bar) ?? bars.set(bar, []).get(bar)!).push(q(n.t - bar * bpb)); } for (const pos of bars.values()) add(F.drums, `${pt.inst}${pt.opts?.rim ? "rim" : ""}:${[...new Set(pos)].sort((a, b) => a - b).join(",")}`); }
  const tonic = pcOf(p.plan.sections[0].key.replace(/m$/, "")), seq: string[] = [], qs: string[] = [];
  for (const c of p.harmony.slice().sort((a, b) => a.t - b.t)) { const m = /^([A-G][#b]?)/.exec(c.name); if (!m) continue; const f = `${(pcOf(m[1]) - tonic + 12) % 12}${quality(c.name)}`; if (seq[seq.length - 1] !== f) { seq.push(f); qs.push(quality(c.name)); } }
  grams(seq, 3, (g) => g.join(" "), F.chords); grams(qs, 3, (g) => g.join(" "), F.qualities);
  const kinds = (p.arrangement ?? []).map((a) => a.kind); grams(kinds, 2, (g) => g.join(">"), F.form);
  return F;
};

const cosine = (a: Bag, b: Bag) => { let d = 0, na = 0, nb = 0; for (const [k, v] of a) { na += v * v; const w = b.get(k); if (w) d += v * w; } for (const v of b.values()) nb += v * v; return na && nb ? d / Math.sqrt(na * nb) : 0; };
/** 0 = nothing in common, 1 = the same music. Features empty in both pieces are left out of the mean. */
export const similarity = (a: Fingerprint, b: Fingerprint) => {
  let s = 0, w = 0; const by: Partial<Record<Feature, number>> = {};
  for (const f of Object.keys(NOVELTY_WEIGHTS) as Feature[]) { if (!a[f].size && !b[f].size) continue; const c = cosine(a[f], b[f]); by[f] = +c.toFixed(3); s += c * NOVELTY_WEIGHTS[f]; w += NOVELTY_WEIGHTS[f]; }
  return { score: w ? s / w : 0, by };
};

const tune = (p: Piece) => voice(p.parts.flatMap((pt) => pt.notes.filter((n) => n.role === "melody" || n.role === "color")));
/** Every melody 6-note fragment as (interval, duration) pairs: transposition-free. */
const fragments = (p: Piece) => { const mel = tune(p), out = new Set<string>(); for (let i = 0; i + 6 <= mel.length; i++) { const g = mel.slice(i, i + 6); out.add(g.slice(1).map((n, j) => `${n.p - g[j].p}/${q(n.t - g[j].t)}`).join(" ")); } return out; };
/** A quoted tune survives a new key, a new meter and a new rhythm: its intervals do not. The pitch-only fragment gate compares this many notes. */
export const QUOTE_NOTES = 8;
/**
 * Every QUOTE_NOTES-note melody fragment as its interval sequence alone (no rhythm, no key, no meter):
 * the same tune re-barred into 5/4, stretched or transposed has the same intervals. Only distinctive
 * shapes count (3+ different intervals, a leap of 3+ semitones, at most 3 repeated notes), so a scale
 * run or a repeated-note figure, which every tune shares, never fails a piece.
 */
export const melodyShapes = (p: Piece) => { const mel = tune(p), out = new Set<string>();
  for (let i = 0; i + QUOTE_NOTES <= mel.length; i++) { const iv = mel.slice(i + 1, i + QUOTE_NOTES).map((n, j) => n.p - mel[i + j].p);
    if (new Set(iv).size >= 3 && iv.some((x) => Math.abs(x) >= 3) && iv.filter((x) => x === 0).length <= 3) out.add(iv.join(",")); }
  return out; };

/** Score a piece against a corpus. `family` names the pieces that ARE this piece (its own cuts) and are skipped. */
export const novelty = (p: Piece, corpus: Record<string, () => Piece>, skip: string[] = [], threshold = NOVELTY_THRESHOLD) => {
  const fp = fingerprint(p), mine = fragments(p), shapes = melodyShapes(p);
  const rows = Object.entries(corpus).filter(([name]) => !skip.includes(name)).map(([name, mk]) => {
    const other = mk(), sim = similarity(fp, fingerprint(other)), theirs = fragments(other), theirShapes = melodyShapes(other);
    let reused = 0, quoted = 0; for (const f of mine) if (theirs.has(f)) reused++; for (const f of shapes) if (theirShapes.has(f)) quoted++;
    return { name, score: +sim.score.toFixed(3), by: sim.by, reusedFragments: reused, quotedShapes: quoted };
  }).sort((a, b) => b.score - a.score);
  const worst = rows[0];
  return { rows, threshold, pass: rows.every((r) => r.score <= threshold && r.reusedFragments === 0 && r.quotedShapes === 0), worst };
};

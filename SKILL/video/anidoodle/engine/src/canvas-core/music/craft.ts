// CRAFT: measures how a composed piece is WRITTEN (not how it sounds): melody, harmony, rhythm,
// tension and mood fit, straight from the notes, in milliseconds, no render. Advisory by design:
// every finding names what it saw, where, and a fix; thresholds are genre-aware (craftTables.ts).
// Only real errors (a note an acoustic instrument cannot play) are level "error". The composer
// revises with it (references/music/compose.md, step 8); the theory is references/music/theory/.
import { beatsPerBar, isCompound, sectionSpans, type Piece, type Note, type Role } from "./plan";
import { MODES, pcOf, nameOf, type ModeId } from "./theory";
import { MOODS, type MoodId } from "./tables";
import { LOW_INTERVAL_LIMIT, INST_RANGE, IC_DISSONANCE, ROOT_TENSION, CRAFT_PROFILE, type CraftProfile } from "./craftTables";

export type Finding = { level: "error" | "warn" | "info"; area: "melody" | "harmony" | "rhythm" | "tension" | "mood" | "range"; msg: string; fix?: string };
const E = 1e-6;
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pct = (x: number) => `${Math.round(x * 100)} %`;
const mod12 = (x: number) => ((x % 12) + 12) % 12;

/** The low-interval chart is loose by about 2 semitones (instrument-dependent), so craft flags a close interval 3+ semitones under its limit. */
export const MUD_SLACK = 2;
// ------------------------------------------------------------------ piece context
type Span = { id: string; kind: string; a: number; b: number };
type Ctx = { p: Piece; bpb: number; compound: boolean; spans: Span[]; notes: Note[]; mel: Note[]; profile: CraftProfile; keyAt: (t: number) => { tonic: number; mode: ModeId }; end: number };
/** One voice: the top note of each onset (bass: the bottom). */
export const topVoice = (ns: Note[], low = false) => { const by = new Map<number, Note>(); for (const n of ns) { const k = Math.round(n.t * 96), o = by.get(k); if (!o || (low ? n.p < o.p : n.p > o.p)) by.set(k, n); } return [...by.values()].sort((a, b) => a.t - b.t); };

const context = (p: Piece): Ctx => {
  const bpb = beatsPerBar(p.plan.meter), plan = sectionSpans(p.plan);
  const spans: Span[] = p.arrangement?.length ? p.arrangement.map((x) => ({ id: x.id, kind: x.kind, a: x.from * bpb, b: (x.from + x.bars) * bpb })) : plan.map((x) => ({ id: x.s.id, kind: x.s.id, a: x.a, b: x.b }));
  const notes = p.parts.flatMap((pt) => pt.notes.map((n) => ({ ...n, inst: pt.inst, part: pt.id }))) as (Note & { inst: string; part: string })[];
  const keyAt = (t: number) => { const s = plan.find((x) => t >= x.a - E && t < x.b - E) ?? plan[plan.length - 1]; return { tonic: pcOf(s.s.key.replace(/m$/, "")), mode: s.s.mode }; };
  const end = Math.max(spans[spans.length - 1]?.b ?? 0, ...notes.map((n) => n.t + n.d));
  return { p, bpb, compound: isCompound(p.plan.meter), spans, notes, mel: topVoice(notes.filter((n) => n.role === "melody")), profile: CRAFT_PROFILE[p.plan.style] ?? CRAFT_PROFILE.folk, keyAt, end };
};
const where = (c: Ctx, t: number) => { const bar = Math.floor(t / c.bpb + E); return `bar ${bar + 1} beat ${+((t - bar * c.bpb) + 1).toFixed(2)}`; };
const sectionOf = (c: Ctx, t: number) => c.spans.find((s) => t >= s.a - E && t < s.b - E);

/** Metric weight of a position (GTTM-style hierarchy, Lerdahl & Jackendoff 1983): downbeat 4, mid-bar 3 (4/4, 12/8), beat 2, eighth 1, sixteenth 0, finer -1. */
export const metricWeight = (t: number, bpb: number, compound: boolean) => {
  const pos = (((t % bpb) + bpb) % bpb), on = (step: number) => Math.abs(pos / step - Math.round(pos / step)) < 1e-4;
  if (on(bpb) || Math.abs(pos - bpb) < 1e-4) return 4;
  if ((bpb === 4) && on(2)) return 3;
  if (on(1)) return 2;
  if (compound ? on(1 / 3) : on(0.5)) return 1;
  if (compound ? on(1 / 6) : on(0.25)) return 0;
  return -1;
};

/** Longuet-Higgins & Lee (1984) style syncopation: an onset on a weak position followed by silence (a rest or its own tie) over a stronger one. Returns mean syncopation per onset and the syncopated share. */
export const syncopation = (onsets: number[], bpb: number, compound: boolean) => {
  const ts = [...new Set(onsets.map((t) => Math.round(t * 96) / 96))].sort((a, b) => a - b), g = compound ? 1 / 6 : 0.25;
  let sum = 0, n = 0;
  for (let i = 0; i < ts.length - 1; i++) {
    const t = ts[i], nx = ts[i + 1], w = metricWeight(t, bpb, compound); let mx = -2;
    for (let k = Math.floor(t / g + E) + 1; k * g < nx - E && k * g < t + bpb; k++) mx = Math.max(mx, metricWeight(k * g, bpb, compound));
    if (mx > w) { sum += mx - w; n++; }
  }
  return { index: ts.length > 1 ? sum / (ts.length - 1) : 0, share: ts.length > 1 ? n / (ts.length - 1) : 0 };
};

// ------------------------------------------------------------------ harmony helpers
const sounding = (c: Ctx, t: number, roles: Role[]) => c.notes.filter((n) => roles.includes(n.role) && n.t <= t + E && n.t + n.d > t + E);
/** The harmony's pitch classes at t: every accompaniment and bass note of the current harmony span (so broken chords and arpeggios count whole), else what sounds. */
const chordPcs = (c: Ctx, t: number) => {
  const hs = c.p.harmony, i = hs.reduce((k, h, j) => (h.t <= t + E ? j : k), -1);
  if (i < 0) return new Set(sounding(c, t, ["accomp", "inner", "bass"]).map((n) => mod12(n.p)));
  const a = hs[i].t, b = hs.slice(i + 1).find((h) => h.t > a + E)?.t ?? Infinity;
  return new Set(c.notes.filter((n) => (n.role === "accomp" || n.role === "inner" || n.role === "bass") && ((n.t >= a - E && n.t < b - E) || (n.t < a && n.t + n.d > a + E))).map((n) => mod12(n.p)));
};
/** The root of the harmony at t: the lowest bass note sounding (or starting within the first beat), else the lowest chord note. */
const rootAt = (c: Ctx, t: number) => {
  const b = sounding(c, t + 0.01, ["bass"]); const bs = b.length ? b : c.notes.filter((n) => n.role === "bass" && n.t >= t - E && n.t < t + 1);
  const pool = bs.length ? bs : sounding(c, t + 0.01, ["accomp", "inner"]);
  return pool.length ? mod12(Math.min(...pool.map((n) => n.p))) : -1;
};
const changes = (c: Ctx) => { const hs = c.p.harmony.slice().sort((a, b) => a.t - b.t), out: { t: number; name: string }[] = []; for (const h of hs) if (!out.length || out[out.length - 1].name !== h.name) out.push(h); return out; };
const DEG = ["1", "b2", "2", "b3", "3", "4", "#4", "5", "b6", "6", "b7", "7"];

export const classifyCadence = (prev: number, last: number): string => {
  if (last === 0) return prev === 7 || prev === 11 ? "authentic" : prev === 5 ? "plagal" : prev === 10 || prev === 8 || prev === 1 || prev === 2 ? "modal" : prev === 0 ? "held" : "arrival";
  if (last === 7) return "half"; if (prev === 7 && (last === 9 || last === 8)) return "deceptive"; return "open";
};

// ------------------------------------------------------------------ melody
const phrasesOf = (c: Ctx) => {
  const out: Note[][] = []; let cur: Note[] = [];
  c.mel.forEach((n, i) => { const nx = c.mel[i + 1]; cur.push(n);
    const gap = nx ? nx.t - (n.t + n.d) : Infinity, cross = nx && sectionOf(c, nx.t) !== sectionOf(c, n.t);
    if (!nx || gap >= 0.75 - E || cross || (n.d >= 2 && nx)) { if (cur.length >= 2) out.push(cur); cur = []; } });
  return out;
};
/** Huron (1996) contour class: first, mean of the middle, last. */
export const contourClass = (ph: Note[]) => {
  const f = ph[0].p, l = ph[ph.length - 1].p, mid = ph.length > 2 ? mean(ph.slice(1, -1).map((n) => n.p)) : (f + l) / 2, s = (x: number) => (x > 1 ? 1 : x < -1 ? -1 : 0);
  const a = s(mid - f), b = s(l - mid);
  return a > 0 && b < 0 ? "arch" : a < 0 && b > 0 ? "bowl" : a >= 0 && b >= 0 && (a || b) ? "ascending" : a <= 0 && b <= 0 && (a || b) ? "descending" : "level";
};
export type Development = "exact" | "sequence" | "varied" | "new";
/** How a phrase relates to the phrases before it (Schoenberg, Fundamentals of Musical Composition, 1967: repetition, sequence, variation): its opening rhythm and intervals compared to each earlier phrase's. */
export const development = (ph: Note[], earlier: Note[][]): Development => {
  const ioi = (x: Note[]) => x.slice(1).map((n, i) => Math.round((n.t - x[i].t) * 12)), iv = (x: Note[]) => x.slice(1).map((n, i) => n.p - x[i].p);
  const rank: Record<Development, number> = { exact: 3, sequence: 2, varied: 1, new: 0 }; let best: Development = "new";
  for (const q of earlier) { const L = Math.min(ph.length, q.length) - 1; if (L < 2) continue; // a two-note fragment matches anything: compare cells of 3+ notes
    const r1 = ioi(ph), r2 = ioi(q), i1 = iv(ph), i2 = iv(q); let rs = 0, is = 0, cs = 0;
    for (let k = 0; k < L; k++) { if (r1[k] === r2[k]) rs++; if (i1[k] === i2[k]) is++; if (Math.sign(i1[k]) === Math.sign(i2[k])) cs++; }
    rs /= L; is /= L; cs /= L; const same = ph.length === q.length;
    const d: Development = rs === 1 && is === 1 && same ? (ph[0].p === q[0].p ? "exact" : "sequence") : rs >= 0.6 || is >= 0.6 || (cs >= 0.75 && rs >= 0.4) ? "varied" : "new";
    if (rank[d] > rank[best]) best = d; }
  return best;
};
/** Motif repetition: the share of phrases that bring back an earlier one (exact, as a sequence, or varied), and the share of bars that are exact copies of an earlier bar. */
export const repetition = (mel: Note[], bpb: number, phrases: Note[][] = [mel]) => {
  // two segmentations: phrases (split at rests) and bar-length cells (a motif often lives in a bar inside a long phrase); the one that hears more returns wins
  const profile = (segs: Note[][]) => { const dev: Record<Development, number> = { exact: 0, sequence: 0, varied: 0, new: 0 }; segs.forEach((x, i) => { if (i) dev[development(x, segs.slice(0, i))]++; }); const k = Math.max(1, segs.length - 1); return { dev, k, index: segs.length > 1 ? (dev.exact + dev.sequence + dev.varied) / k : 0 }; };
  const byBar = new Map<number, Note[]>(); for (const x of mel) { const b = Math.floor(x.t / bpb + E); (byBar.get(b) ?? byBar.set(b, []).get(b)!).push(x); }
  const A = profile(phrases), B = profile([...byBar].sort((a, b) => a[0] - b[0]).map(([, v]) => v).filter((v) => v.length >= 3)), win = B.index > A.index ? B : A, dev = win.dev, n = win.k;
  const bars = new Map<number, string>(); for (const n of mel) { const b = Math.floor(n.t / bpb + E); bars.set(b, `${bars.get(b) ?? ""}${Math.round((n.t - b * bpb) * 12)}:${n.p}:${Math.round(n.d * 12)} `); }
  const seen = new Set<string>(); let copies = 0; for (const [, s] of [...bars].sort((a, b) => a[0] - b[0])) { if (seen.has(s)) copies++; seen.add(s); }
  return { index: win.index, exact: dev.exact / n, dev, exactBarCopies: bars.size ? copies / bars.size : 0 };
};

type NCT = "passing" | "neighbour" | "appoggiatura" | "suspension" | "escape" | "other";
/** Non-chord tones by approach and departure (Aldwell & Schachter, Harmony and Voice Leading, ch. 9-10 terms). */
const classifyNct = (prev: Note | undefined, n: Note, next: Note | undefined): NCT => {
  const a = prev ? n.p - prev.p : NaN, b = next ? next.p - n.p : NaN, step = (x: number) => Math.abs(x) >= 1 && Math.abs(x) <= 2;
  if (prev && prev.p === n.p && step(b) && b < 0) return "suspension";
  if (step(a) && step(b)) return Math.sign(a) === Math.sign(b) ? "passing" : "neighbour";
  if (Math.abs(a) > 2 && step(b) && Math.sign(a) !== Math.sign(b)) return "appoggiatura";
  if (step(a) && Math.abs(b) > 2) return "escape";
  return "other";
};

// ------------------------------------------------------------------ tension
type TensionBar = { harm: number; loud: number; dens: number; reg: number };
/**
 * Weights of the per-bar tension blend. Intensity leads (loudness 0.35, onset density 0.25, the top
 * voice's register 0.15), harmonic lean follows (0.25: the chord root's function 0.15, the
 * sonority's dissonance 0.10). Calibrated on the craft tests' good and bad fixtures (a home-chord
 * tutti climax and an EDM drop must read as the peak; a dominant that leans quietly must not).
 */
export const TENSION_WEIGHTS = { loudness: 0.35, density: 0.25, register: 0.15, root: 0.15, dissonance: 0.1 };
/** Loudness range (dB under the piece's loudest bar) that the loudness term spans 1 -> 0. */
export const TENSION_LOUD_RANGE_DB = 12;
const tensionBars = (c: Ctx, ch: { t: number; name: string }[]) => {
  const { bpb, mel } = c, nBars = Math.max(1, Math.ceil(c.end / bpb - E)), targets = c.p.stemTargets ?? {};
  const top = topVoice(c.notes.filter((n) => n.role !== "drum" && n.role !== "bass")), topR = top.length ? [Math.min(...top.map((n) => n.p)), Math.max(...top.map((n) => n.p))] : [60, 72];
  const melR = mel.length ? [Math.min(...mel.map((n) => n.p)), Math.max(...mel.map((n) => n.p))] : topR;
  const raw = Array.from({ length: nBars }, (_, b) => { const a = b * bpb, z = a + bpb, ns = c.notes.filter((n) => n.t >= a - E && n.t < z - E);
    const h = ch.filter((x) => x.t <= a + E).pop(), k = c.keyAt(a), r = rootAt(c, h ? Math.max(h.t, a) : a), fn = r < 0 ? 0 : ROOT_TENSION[mod12(r - k.tonic)];
    const pcs = [...new Set(sounding(c, a + 0.01, ["accomp", "inner", "bass", "melody", "color"]).map((n) => mod12(n.p)))]; let ds = 0, pr = 0; for (let i = 0; i < pcs.length; i++) for (let j = i + 1; j < pcs.length; j++) { const ic = Math.min(mod12(pcs[j] - pcs[i]), 12 - mod12(pcs[j] - pcs[i])); ds += IC_DISSONANCE[ic]; pr++; }
    // loudness: every part sounding in the bar adds power, v^2 x its share of the bar (a hit counts a quarter beat), weighted by the part's stem target when the piece has them
    const pow = new Map<string, number>();
    for (const n of c.notes) { const on = Math.min(z, n.t + (n.role === "drum" ? 0.25 : n.d)) - Math.max(a, n.t); if (on <= E) continue; const part = (n as { part?: string }).part ?? "";
      pow.set(part, Math.max(pow.get(part) ?? 0, n.v * n.v * Math.min(1, on / Math.min(bpb, n.role === "drum" ? 0.25 : bpb)))); }
    let power = 0; for (const [part, x] of pow) power += x * (targets[part] !== undefined ? 10 ** (targets[part] / 10) : 1e-2);
    // register: the melody's mean pitch over its range; a bar without melody reads the top voice over its range
    const mb = mel.filter((n) => n.t >= a - E && n.t < z - E), tb = top.filter((n) => n.t >= a - E && n.t < z - E);
    const reg = mb.length ? (mean(mb.map((n) => n.p)) - melR[0]) / Math.max(1, melR[1] - melR[0]) : tb.length ? (mean(tb.map((n) => n.p)) - topR[0]) / Math.max(1, topR[1] - topR[0]) : 0;
    return { fn, diss: pr ? ds / pr : 0, onsets: new Set(ns.map((n) => Math.round(n.t * 48))).size / bpb, power, reg }; });
  const loudDb = raw.map((x) => (x.power > 0 ? 10 * Math.log10(x.power) : -Infinity)), maxDb = Math.max(...loudDb), md = Math.max(E, ...raw.map((x) => x.onsets)), W = TENSION_WEIGHTS;
  const out: TensionBar[] = raw.map((x, i) => ({ harm: (W.root * x.fn + W.dissonance * x.diss) / (W.root + W.dissonance), loud: Number.isFinite(loudDb[i]) ? Math.max(0, 1 - (maxDb - loudDb[i]) / TENSION_LOUD_RANGE_DB) : 0, dens: x.onsets / md, reg: x.reg }));
  return { raw: out, bars: out.map((x) => +((W.root + W.dissonance) * x.harm + W.loudness * x.loud + W.density * x.dens + W.register * x.reg).toFixed(3)) };
};

// ------------------------------------------------------------------ the report
export type CraftReport = {
  melody: { phrases: number; contours: Record<string, number>; leaps: number; leapsRecovered: number; stepShare: number; range: [string, string] | null; repetition: number; development: Record<Development, number>; exactBarCopies: number; stableEnds: number; lastNote: string | null; climax: { note: string; at: number; times: number } | null; strongBeatChordTones: number; ncts: Record<NCT, number> };
  harmony: { cadences: { id: string; type: string; motion: string }[]; parallels: number; octaveDoublings: number; innerJumps: number; meanMotion: number; leadUnderChords: number; mud: { at: string; notes: string }[] };
  rhythm: { syncopation: { melody: number; bass: number; drums: number }; density: { id: string; perBeat: number; layers: number }[]; grooveConsistency: number | null; chordChangesOnBeats: number; repeatedSections: string[] };
  tension: { sections: { id: string; value: number; harmonic: number; loudness: number; density: number; register: number }[]; peakAt: number; bars: number[] };
  mood: { mood: MoodId; checks: { what: string; value: string; want: string; ok: boolean }[] };
  scores: { melody: number; harmony: number; rhythm: number; tension: number; mood: number };
  findings: Finding[];
};

export const craftReport = (p: Piece, o: { centroidHz?: number } = {}): CraftReport => {
  const c = context(p), F: Finding[] = [], add = (f: Finding) => F.push(f), { bpb, compound, mel, profile } = c;
  const loop = Boolean(p.plan.loop), moodId = (Array.isArray(p.plan.sections[0].mood) ? p.plan.sections[0].mood[0] : p.plan.sections[0].mood) as MoodId;
  const openOk = profile.openEnding || ["tension", "dread", "eerie", "curious"].includes(moodId);

  // ---------------- melody
  const phrases = phrasesOf(c), contours: Record<string, number> = {};
  for (const ph of phrases) { const k = contourClass(ph); contours[k] = (contours[k] ?? 0) + 1; }
  let leaps = 0, rec = 0, steps = 0, moves = 0; const unrecovered: number[] = [];
  for (const ph of phrases) for (let i = 1; i < ph.length; i++) {
    const iv = ph[i].p - ph[i - 1].p; if (iv) { moves++; if (Math.abs(iv) <= 2) steps++; }
    if (Math.abs(iv) >= 5) { leaps++; const nx = ph[i + 1], pcs = chordPcs(c, ph[i].t);
      // turned back, or arpeggiating the harmony (the next leap outlines the same chord: a consonant skip, e.g. a fanfare)
      const arp = nx && Math.abs(nx.p - ph[i].p) >= 3 && Math.sign(nx.p - ph[i].p) === Math.sign(iv) && [ph[i - 1], ph[i], nx].every((n) => pcs.has(mod12(n.p)));
      if (!nx || Math.sign(nx.p - ph[i].p) === -Math.sign(iv) || nx.p === ph[i].p || arp) rec++; else unrecovered.push(ph[i].t); }
  }
  const stepShare = moves ? steps / moves : 1, recShare = leaps ? rec / leaps : 1;
  if (leaps >= 3 && recShare < 0.6) add({ level: profile.arpeggioMelody ? "info" : "warn", area: "melody", msg: `${leaps - rec} of ${leaps} leaps (a 4th or more) keep going the same way (first at ${where(c, unrecovered[0])})`, fix: "after a leap, turn back by step: the ear expects the gap filled (von Hippel & Huron 2000). Arpeggio idioms are exempt" });
  if (moves >= 8 && stepShare < 0.35 && !profile.arpeggioMelody) add({ level: "warn", area: "melody", msg: `only ${pct(stepShare)} of melodic moves are steps`, fix: "a singable line is mostly steps (60-80 % in folk and song corpora) with a few leaps for shape; fill leaps in with steps" });
  if (phrases.length >= 3) { const top = Object.entries(contours).sort((a, b) => b[1] - a[1])[0]; if (top[0] === "level" && top[1] / phrases.length > 0.5) add({ level: "warn", area: "melody", msg: `${top[1]} of ${phrases.length} phrases are level (no rise and fall)`, fix: "give phrases a shape: an arch (rise to a high point, fall home) is the commonest and most satisfying (Huron 1996)" }); }
  const rep = repetition(mel, bpb, phrases);
  if (phrases.length >= 4 && rep.index < 0.25) add({ level: "warn", area: "melody", msg: `only ${pct(rep.index)} of phrases (or bars) bring back an earlier one (exact ${rep.dev.exact}, sequence ${rep.dev.sequence}, varied ${rep.dev.varied}, new ${rep.dev.new})`, fix: "state a 2-5 note motif, then bring it back developed (same rhythm new pitches, a sequence a step up, inverted, fragmented): a tune the ear can hold returns to its idea" });
  // loop idioms (lo-fi, hip-hop, house) repeat on purpose: repetition is the groove's pleasure there, so only near-total copying is flagged
  if (phrases.length >= 4 && rep.exact > (profile.groove ? 0.85 : 0.6)) add({ level: "warn", area: "melody", msg: `${pct(rep.exact)} of phrases (or bars) are exact copies of an earlier one`, fix: "repeat the motif, but vary it: change the last interval, displace it by an eighth, sequence it a step up, answer it in another register" });
  // phrase ends and strong beats vs the harmony
  /** a chord tone; outside common-practice idioms the added 6th and 9th count too (Levine, The Jazz Theory Book, 1995: 6 and 9 are colour tones, not dissonances to resolve) */
  const isCt = (n: Note) => { const pcs = chordPcs(c, n.t), pc = mod12(n.p); if (pcs.has(pc)) return true; if (profile.parallels === "forbid") return false; const r = rootAt(c, n.t); return r >= 0 && [2, 9].includes(mod12(pc - r)); };
  let stable = 0; for (const ph of phrases) { const n = ph[ph.length - 1]; if (isCt(n)) stable++; }
  if (phrases.length >= 3 && stable / phrases.length < 0.6) add({ level: "warn", area: "melody", msg: `only ${stable} of ${phrases.length} phrases end on a chord tone`, fix: "end phrases on chord tones (answers on 1, 3 or 5 of the key); save the unresolved end for a question phrase" });
  const last = mel[mel.length - 1]; let lastNote: string | null = null;
  if (last) { const k = c.keyAt(last.t), deg = mod12(last.p - k.tonic), iv = MODES[k.mode].intervals, triad = [0, iv[2], iv[4]].filter((x) => x !== undefined);
    lastNote = `${nameOf(last.p)} (${DEG[deg]})`;
    if (!loop && !triad.includes(deg)) add({ level: openOk ? "info" : "warn", area: "melody", msg: `the melody's last note is ${lastNote}, off the home triad`, fix: openOk ? "an open ending suits this mood; keep it if you meant it" : "end on 1 (or 3/5) of the key, or make the unresolved ending a choice the picture asks for" }); }
  let strong = 0, strongCt = 0; const ncts: Record<NCT, number> = { passing: 0, neighbour: 0, appoggiatura: 0, suspension: 0, escape: 0, other: 0 };
  mel.forEach((n, i) => { const pcs = chordPcs(c, n.t); if (!pcs.size) return; const ct = isCt(n);
    if (metricWeight(n.t, bpb, compound) >= 2) { strong++; if (ct) strongCt++; }
    if (!ct && n.d >= (compound ? 1 / 3 : 0.25) - E) ncts[classifyNct(mel[i - 1], n, mel[i + 1])]++; });
  const sbct = strong ? strongCt / strong : 1;
  if (strong >= 8 && sbct < 0.5) add({ level: "warn", area: "melody", msg: `only ${pct(sbct)} of the melody's strong-beat notes are chord tones`, fix: "put chord tones on the beats; keep dissonance for passing and neighbour tones, or as an appoggiatura/suspension that resolves down by step" });
  if (ncts.other >= 4 && ncts.other > (ncts.passing + ncts.neighbour + ncts.appoggiatura + ncts.suspension)) add({ level: "info", area: "melody", msg: `${ncts.other} non-chord tones are neither approached nor left by step`, fix: "a dissonance reads as intended when a step leads into or out of it" });
  // range and climax
  let climax: CraftReport["melody"]["climax"] = null;
  if (mel.length) { const hi = Math.max(...mel.map((n) => n.p)), first = mel.find((n) => n.p === hi)!, times = mel.filter((n) => n.p === hi).length, at = (first.t - (c.spans[0]?.a ?? 0)) / Math.max(1, c.end - (c.spans[0]?.a ?? 0));
    climax = { note: nameOf(hi), at, times };
    if (mel.length >= 16 && !loop && at < 0.3) add({ level: "warn", area: "melody", msg: `the melody peaks (${nameOf(hi)}) at ${pct(at)} of the piece`, fix: "save the highest note for the second half (often around two thirds in): the climax is where the piece arrives" });
    if (mel.length >= 16 && times > Math.max(3, mel.length / 12)) add({ level: "info", area: "melody", msg: `the top note ${nameOf(hi)} is heard ${times} times`, fix: "one high point per phrase group: a climax heard often stops being one" }); }

  // ---------------- range per part
  for (const pt of p.parts) { const r = INST_RANGE[pt.inst]; const ns = pt.notes.filter((n) => n.role !== "drum"); if (!r || !ns.length || pt.role === "drum") continue;
    const lo = Math.min(...ns.map((n) => n.p)), hi = Math.max(...ns.map((n) => n.p));
    const sweet: [number, number] = pt.role === "bass" && r.play ? [r.play[0], r.sweet[1]] : r.sweet, over = r.play ? Math.max(r.play[0] - lo, hi - r.play[1]) : 0;
    if (r.play && over > 0) add({ level: over >= 3 ? "error" : "warn", area: "range", msg: `${pt.id} (${pt.inst}) plays ${nameOf(lo)}-${nameOf(hi)}, outside what a ${pt.inst} can play (${nameOf(r.play[0])}-${nameOf(r.play[1])})`, fix: over >= 3 ? "move the part by an octave or give it to an instrument that owns that register" : "a semitone or two past the standard range: extended-range models exist, but moving those notes an octave is safer" });
    else { const out = ns.filter((n) => n.p < sweet[0] || n.p > sweet[1]).length / ns.length; if (out > 0.25) add({ level: "warn", area: "range", msg: `${pct(out)} of ${pt.id} (${pt.inst}) sits outside its sweet range ${nameOf(sweet[0])}-${nameOf(sweet[1])}`, fix: "move it toward the sweet range (an octave), or pick a voice that lives there" }); } }

  // ---------------- harmony: cadences
  const ch = changes(c), cadences: CraftReport["harmony"]["cadences"] = [];
  for (const s of c.spans) { const inS = ch.filter((h) => h.t < s.b - E), lastH = inS[inS.length - 1]; if (!lastH) continue;
    const k = c.keyAt(s.b - 0.01), lr = rootAt(c, Math.max(lastH.t, s.a)); let pr = -1;
    for (let i = inS.length - 2; i >= 0; i--) { const r = rootAt(c, inS[i].t); if (r !== lr) { pr = r; break; } }
    if (lr < 0) continue; const l = mod12(lr - k.tonic), pv = pr < 0 ? l : mod12(pr - k.tonic);
    cadences.push({ id: s.id, type: classifyCadence(pv, l), motion: `${DEG[pv]}-${DEG[l]}` }); }
  const lastCad = cadences[cadences.length - 1];
  if (!loop && lastCad && !["authentic", "plagal", "modal", "held", "arrival"].includes(lastCad.type)) add({ level: openOk ? "info" : "warn", area: "harmony", msg: `the piece ends ${lastCad.type} (${lastCad.motion}), away from home`, fix: openOk ? "an open ending suits this idiom; keep it if you meant it" : "land the last section on the tonic (V-I, IV-I, bVII-I), or the ending sounds cut off" });
  if (loop && lastCad && ["authentic", "plagal"].includes(lastCad.type)) add({ level: "info", area: "harmony", msg: `the loop's last section cadences home (${lastCad.motion})`, fix: "a loop should lean back into bar 1 (end on V, IV or a turnaround), not close" });
  if (cadences.length >= 4 && !cadences.slice(0, -1).some((x) => x.type !== "open" && x.type !== "held")) add({ level: "warn", area: "harmony", msg: "no section before the last ends on a cadence (half, authentic, plagal, deceptive)", fix: "let phrases breathe: end the first sections on V (a question) or a deceptive vi, keep the full close for the end" });

  // ---------------- harmony: voice leading of the chord part (+ the bass and the melody as outer voices)
  // the chord part: the accompaniment part with the most block chords (3+ notes on one onset; arpeggios and single lines are not voicings)
  const groups = (pt: (typeof p.parts)[number]) => { const by = new Map<number, number[]>(); for (const n of pt.notes) { const k = Math.round(n.t * 96); by.set(k, [...(by.get(k) ?? []), n.p]); } return [...by].filter(([, ps]) => ps.length >= 2).sort((a, b) => a[0] - b[0]).map(([k, ps]) => ({ t: k / 96, ps: [...new Set(ps)].sort((a, b) => a - b) })); };
  const cands = p.parts.filter((pt) => pt.role === "accomp" || pt.role === "inner").map((pt) => ({ pt, ev: groups(pt) })), big = (x: (typeof cands)[number]) => x.ev.filter((e) => e.ps.length >= 3).length;
  const main = cands.sort((a, b) => big(b) - big(a) || b.ev.length - a.ev.length)[0], events = main?.ev ?? [];
  const blockTop = (t: number) => { let top = -1; for (const x of cands) for (const n of x.pt.notes) if (n.t <= t + E && n.t + n.d > t + E && x.ev.some((e) => Math.abs(e.t - n.t) < 1e-3)) top = Math.max(top, n.p); return top; };
  // parallel 5ths between any two voices, and parallel octaves between the OUTER voices (bass and melody); octaves inside one
  // chord part are doubling, which orchestration uses on purpose (Adler 2016), except in a choir, whose voices are independent
  let parallels = 0, inner = 0, doublings = 0, motions: number[] = []; const parEx: string[] = [], choir = main?.pt.inst === "choir";
  const par = (a1: number, b1: number, a2: number, b2: number, octaves = true) => { const i1 = mod12(b1 - a1), i2 = mod12(b2 - a2); return (i1 === 7 || (octaves && i1 === 0)) && i1 === i2 && a1 !== a2 && Math.sign(a2 - a1) === Math.sign(b2 - b1); };
  for (let i = 1; i < events.length; i++) { const A = events[i - 1].ps, B = events[i].ps; if (A.join() === B.join()) continue;
    if (A.length !== B.length) for (const b of B) motions.push(Math.min(...A.map((a) => Math.abs(b - a))));
    if (A.length === B.length) { for (let v = 0; v < A.length; v++) { const mv = Math.abs(B[v] - A[v]); motions.push(mv); if (v > 0 && v < A.length - 1 && mv > 7) inner++; }
      for (let x = 0; x < A.length; x++) for (let y = x + 1; y < A.length; y++) { if (par(A[x], A[y], B[x], B[y], choir)) { parallels++; if (parEx.length < 2) parEx.push(where(c, events[i].t)); } else if (par(A[x], A[y], B[x], B[y])) doublings++; } }
    const bA = sounding(c, events[i - 1].t + 0.01, ["bass"]), bB = sounding(c, events[i].t + 0.01, ["bass"]), mA = sounding(c, events[i - 1].t + 0.01, ["melody"]), mB = sounding(c, events[i].t + 0.01, ["melody"]);
    if (bA.length && bB.length && mA.length && mB.length) { const lo1 = Math.min(...bA.map((n) => n.p)), lo2 = Math.min(...bB.map((n) => n.p)), hi1 = Math.max(...mA.map((n) => n.p)), hi2 = Math.max(...mB.map((n) => n.p)); if (par(lo1, hi1, lo2, hi2)) { parallels++; if (parEx.length < 2) parEx.push(`${where(c, events[i].t)} (bass-melody)`); } } }
  const meanMotion = mean(motions);
  if (parallels) add({ level: profile.parallels === "forbid" ? "warn" : "info", area: "harmony", msg: `${parallels} parallel 5th/octave move(s) (${parEx.join(", ")})`, fix: profile.parallels === "forbid" ? "in this idiom move the voices in contrary or oblique motion, or hold a common tone" : "fine in this idiom (planing, power chords); keep it if it is the sound you want" });
  if (inner >= 2) add({ level: profile.parallels === "forbid" ? "warn" : "info", area: "harmony", msg: `${inner} inner-voice jump(s) larger than a 5th between chords`, fix: "revoice: keep common tones, move each inner voice to the nearest chord tone" });
  if (motions.length >= 8 && meanMotion > 4) add({ level: "info", area: "harmony", msg: `the chord voices move ${meanMotion.toFixed(1)} semitones each on average per change`, fix: "smooth voice leading averages 1-3: invert chords so voices move by step" });
  // lead under the chords
  let under = 0; for (const n of mel) { const top = blockTop(n.t + 0.01); if (top >= 0 && n.p < top) under++; }
  const leadUnder = mel.length ? under / mel.length : 0;
  if (mel.length >= 8 && leadUnder > 0.3) add({ level: "warn", area: "harmony", msg: `the melody sits under the chord voicing's top note ${pct(leadUnder)} of the time`, fix: "crossed voices mask the tune: voice the chords lower or move the melody up (a tenor-register theme works only in a distinct, louder timbre: see the masking guard)" });
  // mud: low close intervals (low interval limits)
  const mud = new Map<string, number>(); const pitched = c.notes.filter((n) => n.role !== "drum");
  for (const t of [...new Set(pitched.map((n) => Math.round(n.t * 96) / 96))]) { const ps = [...new Set(pitched.filter((n) => n.t <= t + E && n.t + n.d > t + E).map((n) => n.p))].sort((a, b) => a - b);
    for (let i = 1; i < ps.length; i++) { const lim = LOW_INTERVAL_LIMIT[ps[i] - ps[i - 1]]; if (lim !== undefined && ps[i - 1] < lim - MUD_SLACK) { const k = `${nameOf(ps[i - 1])}+${nameOf(ps[i])}`; if (!mud.has(k)) mud.set(k, t); } } }
  const mudList = [...mud].map(([notes, t]) => ({ at: where(c, t), notes }));
  if (mudList.length) add({ level: "warn", area: "harmony", msg: `${mudList.length} close interval(s) below their low limit: ${mudList.slice(0, 3).map((m) => `${m.notes} at ${m.at}`).join("; ")}`, fix: "low down keep only octaves and 5ths (thirds from about C3 up, seconds from about E3 up): spread the voicing or lift the upper note an octave" });

  // ---------------- rhythm
  const onsetsOf = (f: (n: Note & { inst?: string }) => boolean) => c.notes.filter(f).map((n) => n.t);
  const syn = { melody: syncopation(mel.map((n) => n.t), bpb, compound).index, bass: syncopation(onsetsOf((n) => n.role === "bass"), bpb, compound).index, drums: syncopation(onsetsOf((n) => n.role === "drum" && /kick|snare/.test((n as { inst?: string }).inst ?? "")), bpb, compound).index };
  const hasDrums = c.notes.some((n) => n.role === "drum");
  if (profile.groove && hasDrums && syn.bass + syn.drums < 0.02 && syn.melody < 0.05) add({ level: "warn", area: "rhythm", msg: "no syncopation in the melody, bass or kick/snare", fix: "a groove idiom wants some: push a bass note or a melody note an eighth early (an anticipation) or tie it over the beat; medium syncopation grooves most (Witek et al. 2014)" });
  if (syn.melody > 1.2) add({ level: "info", area: "rhythm", msg: `the melody is heavily syncopated (${syn.melody.toFixed(2)})`, fix: "if the tune stops sounding anchored, land the motif's first or last note on a beat" });
  const density = c.spans.map((s) => { const ns = c.notes.filter((n) => n.t >= s.a - E && n.t < s.b - E), ts = new Set(ns.map((n) => Math.round(n.t * 48))); return { id: s.id, perBeat: ts.size / Math.max(E, s.b - s.a), layers: new Set(ns.map((n) => (n as { part?: string }).part)).size }; });
  if (density.length >= 3) { const d = density.map((x) => x.perBeat), m = mean(d); if (d.every((x) => Math.abs(x - m) <= 0.15 * m) && new Set(density.map((x) => x.layers)).size === 1) add({ level: "warn", area: "rhythm", msg: "every section has the same density and the same layers", fix: "contrast sections: thin one (drums out, one line), build another (more onsets, a new layer); a section that only repeats is dead air" }); }
  // groove consistency: kick+snare pattern per bar vs the section's commonest bar
  const gc: number[] = [];
  for (const s of c.spans) { const bars = new Map<number, Set<number>>();
    for (const n of c.notes) if (n.role === "drum" && /kick|snare/.test((n as { inst?: string }).inst ?? "") && n.t >= s.a - E && n.t < s.b - E) { const b = Math.floor(n.t / bpb + E); (bars.get(b) ?? bars.set(b, new Set()).get(b)!).add(Math.round((n.t - b * bpb) * 12)); }
    if (bars.size < 2) continue; const keys = [...bars.values()].map((x) => [...x].sort((a, b) => a - b).join()), cnt = new Map<string, number>(); for (const k of keys) cnt.set(k, (cnt.get(k) ?? 0) + 1);
    const modeK = [...cnt].sort((a, b) => b[1] - a[1])[0][0], ref = new Set(modeK.split(",").filter(Boolean).map(Number));
    for (const x of bars.values()) { const inter = [...x].filter((v) => ref.has(v)).length; gc.push(inter / (x.size + ref.size - inter || 1)); } }
  const grooveConsistency = gc.length ? mean(gc) : null;
  if (grooveConsistency !== null && grooveConsistency < 0.45) add({ level: "warn", area: "rhythm", msg: `the kick/snare pattern changes almost every bar (consistency ${grooveConsistency.toFixed(2)})`, fix: "a groove is a repeated pattern with small variations: keep the kick and backbeat stable, vary the hats and the fill bar" });
  const chg = ch.filter((h) => h.t > E), onBeat = chg.filter((h) => metricWeight(h.t, bpb, compound) >= 2).length, cob = chg.length ? onBeat / chg.length : 1;
  if (chg.length >= 4 && cob < 0.75) add({ level: "warn", area: "rhythm", msg: `${pct(1 - cob)} of chord changes fall between beats`, fix: "change chords on strong beats (an eighth-note anticipation is fine); off-beat changes blur the metre" });
  // dead air: a section that repeats the previous one note for note in every pitched part
  const repeated: string[] = [], sig = (s: Span) => c.notes.filter((n) => n.role !== "drum" && n.t >= s.a - E && n.t < s.b - E).map((n) => `${(n as { part?: string }).part}:${Math.round((n.t - s.a) * 48)}:${n.p}:${Math.round(n.d * 48)}`).sort().join("|");
  for (let i = 1; i < c.spans.length; i++) { const A = c.spans[i - 1], B = c.spans[i]; if (B.b - B.a >= 4 * bpb - E && Math.abs((A.b - A.a) - (B.b - B.a)) < E && sig(A) && sig(A) === sig(B)) repeated.push(B.id); }
  if (repeated.length) add({ level: "warn", area: "rhythm", msg: `section(s) ${repeated.join(", ")} repeat the previous section note for note`, fix: "vary the repeat: the motif an octave up, a counter line, thinner or fuller layers, a new last bar" });

  // ---------------- tension curve (per bar): harmonic lean AND intensity (loudness, density, register)
  // Felt tension follows loudness and onset density most, then pitch height, then harmony (Farbood 2012, "A
  // parametric, temporal model of musical tension", Music Perception 29; Lerdahl & Krumhansl 2007): a home-chord
  // tutti climax or an EDM drop is the peak even though its chord is at rest, so intensity carries most weight.
  const tb = tensionBars(c, ch), bars = tb.bars;
  const tsec = c.spans.map((s) => { const a = Math.max(0, Math.floor(s.a / bpb + E)), z = Math.ceil(s.b / bpb - E), avg = (f: (x: TensionBar) => number) => +mean(tb.raw.slice(a, z).map(f)).toFixed(2);
    return { id: s.id, value: +mean(bars.slice(a, z)).toFixed(2), harmonic: avg((x) => x.harm), loudness: avg((x) => x.loud), density: avg((x) => x.dens), register: avg((x) => x.reg) }; });
  const nBars = bars.length, peakBar = bars.indexOf(Math.max(...bars)), peakAt = (peakBar + 0.5) / nBars;
  // loops and low-arousal pieces stay level on purpose (theory/mood.md: a site loop is low arousal, no sharp accents; ambient and calm pieces
  // hold one state): a flat curve there is the brief, not a fault, so it is a note
  const levelOk = loop || p.plan.style === "ambient" || ["calm"].includes(moodId);
  if (tsec.length >= 3) { const vs = tsec.map((x) => x.value), rng = Math.max(...vs) - Math.min(...vs);
    if (rng < 0.1) add({ level: levelOk ? "info" : "warn", area: "tension", msg: `the tension curve is flat (sections span ${rng.toFixed(2)})`, fix: levelOk ? `${loop ? "a loop" : "a calm or ambient piece"} stays level on purpose; keep it if that is the brief (a slow change of colour or register still helps it breathe)` : "plan the arc before the notes: rise (louder, denser, higher, leaning chords), a dip before the peak, then release" });
    const peakS = vs.indexOf(Math.max(...vs));
    if (!loop && peakS === 0) add({ level: "warn", area: "tension", msg: `the first section (${tsec[0].id}) is the most intense`, fix: "start below the peak so the piece has somewhere to go" });
    if (!loop && !openOk && vs[vs.length - 1] >= Math.max(...vs) - 1e-9) add({ level: "warn", area: "tension", msg: `the last section (${tsec[tsec.length - 1].id}) is the most intense: no release`, fix: "after the peak, release: fewer layers, home chord, the motif's last word" }); }

  // ---------------- mood fit (MOODS: tables.ts, grounded in Gabrielsson & Lindström 2010)
  const M = MOODS[moodId], checks: CraftReport["mood"]["checks"] = [];
  if (M) { const tempo = p.plan.tempo, inR = (x: number, r: [number, number], slack = 0) => x >= r[0] * (1 - slack) && x <= r[1] * (1 + slack);
    checks.push({ what: "tempo", value: `${tempo}`, want: `${M.tempo[0]}-${M.tempo[1]}`, ok: inR(tempo, M.tempo, 0.1) });
    const modes = [...new Set(p.plan.sections.map((s) => s.mode))], fam = (m: ModeId) => (MODES[m].intervals.includes(4) ? "major" : MODES[m].intervals.includes(3) ? "minor" : "other");
    // the major/minor family is the emotion cue (Hevner 1935; Gabrielsson & Lindström 2010); the exact mode is colour, so a mode of the right family passes
    checks.push({ what: "mode", value: modes.join("/"), want: M.modes.join("/"), ok: modes.some((m) => M.modes.includes(m) || M.modes.some((w) => fam(w) === fam(m) && fam(m) !== "other")) });
    if (mel.length) { const med = mel.map((n) => n.p).sort((a, b) => a - b)[Math.floor(mel.length / 2)]; checks.push({ what: "melody register", value: nameOf(med), want: `${nameOf(M.register[0])}-${nameOf(M.register[1])}`, ok: med >= M.register[0] - 3 && med <= M.register[1] + 3 }); }
    // pitched onsets: a hat's 16ths are groove, not the mood's pace of events
    const allOn = new Set(c.notes.filter((n) => n.role !== "drum").map((n) => Math.round(n.t * 48))).size / Math.max(E, c.end); checks.push({ what: "note onsets/beat", value: allOn.toFixed(2), want: `${M.onsetsPerBeat[0]}-${M.onsetsPerBeat[1]}`, ok: inR(allOn, M.onsetsPerBeat, 0.25) });
    if (chg.length >= 2) { const hr = (c.end / bpb) / (chg.length + 1); checks.push({ what: "bars per chord", value: hr.toFixed(2), want: `${M.harmonicRhythmBars[0]}-${M.harmonicRhythmBars[1]}`, ok: hr >= M.harmonicRhythmBars[0] / 2 && hr <= M.harmonicRhythmBars[1] * 2 }); }
    if (o.centroidHz !== undefined && M.centroidHz) checks.push({ what: "brightness (centroid Hz)", value: `${Math.round(o.centroidHz)}`, want: `${M.centroidHz[0]}-${M.centroidHz[1]}`, ok: inR(o.centroidHz, M.centroidHz, 0.2) });
    const bad = checks.filter((x) => !x.ok);
    if (bad.length) add({ level: "warn", area: "mood", msg: `for "${moodId}": ${bad.map((x) => `${x.what} ${x.value} (typical ${x.want})`).join(", ")}`, fix: "either change these toward the mood (tempo, mode, register, density are the strongest emotion cues: Gabrielsson & Lindström 2010), or declare the mood you are actually writing" }); }

  const s01 = (xs: number[]) => +Math.max(0, Math.min(1, mean(xs))).toFixed(2);
  const scores = {
    melody: s01([recShare, Math.min(1, stepShare / 0.6), Math.min(1, rep.index / 0.5), 1 - Math.max(0, rep.exact - 0.4), phrases.length ? stable / phrases.length : 1, sbct]),
    harmony: s01([mudList.length ? Math.max(0, 1 - mudList.length / 6) : 1, profile.parallels === "forbid" ? Math.max(0, 1 - parallels / 4) : 1, 1 - leadUnder, meanMotion ? Math.min(1, 3 / meanMotion) : 1]),
    rhythm: s01([cob, grooveConsistency ?? 1, repeated.length ? 0.5 : 1, profile.groove && hasDrums ? Math.min(1, (syn.bass + syn.drums + syn.melody) / 0.15) : 1]),
    tension: s01([tsec.length >= 3 && !levelOk ? Math.min(1, (Math.max(...tsec.map((x) => x.value)) - Math.min(...tsec.map((x) => x.value))) / 0.2) : 1, loop || peakAt >= 0.3 ? 1 : 0.5]),
    mood: checks.length ? +(checks.filter((x) => x.ok).length / checks.length).toFixed(2) : 1,
  };
  return {
    melody: { phrases: phrases.length, contours, leaps, leapsRecovered: rec, stepShare, range: mel.length ? [nameOf(Math.min(...mel.map((n) => n.p))), nameOf(Math.max(...mel.map((n) => n.p)))] : null, repetition: rep.index, development: rep.dev, exactBarCopies: rep.exactBarCopies, stableEnds: phrases.length ? stable / phrases.length : 1, lastNote, climax, strongBeatChordTones: sbct, ncts },
    harmony: { cadences, parallels, octaveDoublings: doublings, innerJumps: inner, meanMotion, leadUnderChords: leadUnder, mud: mudList },
    rhythm: { syncopation: syn, density, grooveConsistency, chordChangesOnBeats: cob, repeatedSections: repeated },
    tension: { sections: tsec, peakAt, bars }, mood: { mood: moodId, checks }, scores, findings: F,
  };
};

/** The report as text for tools/music.mjs (check and craft). */
export const craftText = (r: CraftReport) => {
  const f2 = (x: number) => x.toFixed(2), spark = "▁▂▃▄▅▆▇█", m = r.melody, h = r.harmony, y = r.rhythm;
  const o = [`craft    melody ${f2(r.scores.melody)} | harmony ${f2(r.scores.harmony)} | rhythm ${f2(r.scores.rhythm)} | tension ${f2(r.scores.tension)} | mood ${f2(r.scores.mood)}   (advisory: scores guide revision; only errors fail)`,
    `  melody   ${m.phrases} phrases (${Object.entries(m.contours).map(([k, v]) => `${k} ${v}`).join(", ") || "-"}) | steps ${pct(m.stepShare)} | leaps ${m.leaps}, turned back ${m.leapsRecovered} | range ${m.range ? m.range.join("-") : "-"} | motif returns ${pct(m.repetition)} (exact ${m.development.exact}, sequence ${m.development.sequence}, varied ${m.development.varied}, new ${m.development.new}) | phrase ends on chord tones ${pct(m.stableEnds)} | strong beats on chord tones ${pct(m.strongBeatChordTones)}`,
    `           climax ${m.climax ? `${m.climax.note} at ${pct(m.climax.at)} (x${m.climax.times})` : "-"} | last note ${m.lastNote ?? "-"} | non-chord tones: ${Object.entries(m.ncts).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}`,
    `  harmony  cadences ${h.cadences.map((x) => `${x.id} ${x.type} (${x.motion})`).join(", ") || "-"}`,
    `           voice motion ${h.meanMotion.toFixed(1)} st/voice | parallel 5ths/8ves ${h.parallels} (octave doublings ${h.octaveDoublings}) | inner jumps ${h.innerJumps} | melody under chords ${pct(h.leadUnderChords)} | mud ${h.mud.length}`,
    `  rhythm   syncopation melody ${f2(y.syncopation.melody)} bass ${f2(y.syncopation.bass)} kick/snare ${f2(y.syncopation.drums)} | groove consistency ${y.grooveConsistency === null ? "-" : f2(y.grooveConsistency)} | chord changes on beats ${pct(y.chordChangesOnBeats)}`,
    `           density (onsets/beat, layers) ${y.density.map((d) => `${d.id} ${d.perBeat.toFixed(1)}/${d.layers}`).join("  ")}`,
    `  tension  ${r.tension.sections.map((s) => `${s.id} ${spark[Math.min(7, Math.floor(s.value * 8))]}${f2(s.value)}`).join("  ")} | bars ${r.tension.bars.map((v) => spark[Math.min(7, Math.floor(v * 8))]).join("")} | peak at ${pct(r.tension.peakAt)}`,
    `           what drives it (loudness/density/register/harmony, 0..1) ${r.tension.sections.map((s) => `${s.id} ${f2(s.loudness)}/${f2(s.density)}/${f2(s.register)}/${f2(s.harmonic)}`).join("  ")}`,
    `  mood     ${r.mood.mood}: ${r.mood.checks.map((c) => `${c.what} ${c.value} ${c.ok ? "ok" : `(typical ${c.want})`}`).join(" | ")}`];
  for (const f of r.findings) o.push(`${f.level === "error" ? "ERROR  " : f.level === "warn" ? "CRAFT  " : "note   "} ${f.area}: ${f.msg}${f.fix ? `\n           fix: ${f.fix}` : ""}`);
  return o.join("\n");
};

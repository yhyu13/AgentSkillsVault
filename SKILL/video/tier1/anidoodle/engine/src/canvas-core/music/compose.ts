// COMPOSE: the composer's material + a style vocabulary -> a Piece. The composer (the model) writes
// every note: the chord voicings and bass lines, the motifs and lines, the form. The style supplies
// only sound (voices, levels, fx), groove grammars, and the arrangement grammar (which layers a
// section kind lets sound). Nothing is filled in: missing material is an error that says what to
// compose. Workflow and craft: references/music/compose.md. Vocabularies: vocab.ts.
import { line, beatsPerBar, type Note, type Piece, type Part, type Role, type Meter } from "./plan";
import type { ModeId } from "./theory";
import type { MoodId, StyleId, MelodyType } from "./tables";
import { pcOf } from "./theory";
import { perform } from "./perform";
import { drumBar, laneKind, type Groove, type Lane } from "./grooves";
import { VOCAB_TRIM, VOCAB_TARGET_FIX } from "./vocabTrim";
import { VOCAB_ALT_TRIM, VOCAB_ALT_TARGET_FIX, INST_LEVEL, INST_REGISTER, SLOT_REF_PITCH } from "./vocabVoices";
import { VOCAB, KINDS, BASE_SLOTS, resolveVoice, moodVoice, moodFx, fullMood, type Slot, type Voice, type SectionKind, type MoodControls } from "./vocab";
import type { MixProfile } from "./mixProfiles";

/**
 * One chord of YOUR harmony: its voicing and a one-bar bass line you wrote for it. The voicing is a
 * notation chord ("[C3 G3 E4]"), one note ("E4"), or "r": the chord part rests while the chord is
 * still the harmony (named for the key check, craft, novelty and the bass), for a bar the bass or an
 * arp states alone.
 */
export type ComposedChord = { voicing: string; bass?: string };
/** A line = notation bars, or names of your motifs, joined in order from the section's first bar. */
export type LineSpec = string | string[];
export type ComposedSection = {
  id?: string; kind: SectionKind; bars: number;
  /**
   * chord names per bar (keys of `chords`), cycled to fill the section. A bar may hold several: "Dm9 G13"
   * splits it where the meter splits (splitBar: 4/4 2+2, 3/4 2+1, 5/4 3+2, 6/8 3+3 eighths, 7/8 4+3
   * eighths, or your `grouping`), or give each chord its beats: "Dm9:1 G13:2". "~" holds the chord before
   * it: tied over the bar line, no restrike ("Cmaj9", "~" = one chord for two bars; "~ G13" holds into
   * the bar, then changes).
   */
  harmony: string[];
  /**
   * the chord part's rhythm, one bar per item (or bars joined with "|"), cycled over the section:
   * "x:DUR[@VEL]" strikes the chord sounding at that point, "r:DUR" rests, "~:DUR" (a bar's first token)
   * holds the last strike over the bar line. Without it, each chord is held for its whole span.
   */
  comp?: string | string[];
  /** lines play ONCE from the section's first bar (harmony cycles, lines do not); a shorter line leaves rests, unless `loopLines` */
  lead?: LineSpec; counter?: LineSpec; arp?: LineSpec;
  /** repeat each line to fill the section (a 2-bar motif in an 8-bar section plays 4 times) */ loopLines?: boolean;
  /** modulate: this section's key and mode (default the piece's); the key check reads each key region separately */ key?: string; mode?: ModeId;
  /** override the chords' bass lines for this section (one bar of notation, or one per bar; "~" ties the bass over that bar line) */ bass?: string | string[];
  /** a key of `grooves`, or null for no drums; default by kind (main / half / build / none) */ groove?: string | null;
  /** chord velocity scale (0..1.2), e.g. 0.8 for a softer intro */ chordVel?: number;
  /** 0..1 (0.5 = as written): the section's dynamics for EVERY part (velocity x 0.55..1.45, about -5..+3 dB) and the density of generated grooves */ energy?: number;
  /** play the section this many times (refit changes it for the stretch section) */ repeat?: number; stretch?: boolean;
};
export type Material = {
  style: StyleId; title: string; seed: number; mood: MoodId; bpm: number; key: string; mode: ModeId; meter?: Meter;
  chords: Record<string, ComposedChord>; motifs?: Record<string, string>; grooves?: Record<string, Groove>;
  sections: ComposedSection[];
  /**
   * swap a slot's voice for one of the style's alternates by name, or give your own voice. Both are
   * calibrated to the slot's stem target: an alternate by its measured trim, your own voice from its
   * instrument's measured level. Your voice's `gainDb` is a dB OFFSET from there (0 or left out = at the
   * target), the same scale as `levels`.
   */
  voices?: Partial<Record<Slot, string | CustomVoice>>;
  /** dB OFFSET per slot, added to the voice's calibrated gain (after trims and mood): +2 = two dB louder. Set from the stem meter. */ levels?: Partial<Record<Slot, number>>;
  moodControls?: MoodControls;
  /** 0.5 straight .. 0.67 hard swing (default the style's lower bound) */ swing?: number;
  /** the piece's dynamic level [start, end] 0..1, ramped over the whole piece (default [0.62, 0.66]); section `energy` shapes it locally */ dyn?: [number, number];
  /** seconds of ring-out after the last onset (default 3.2) */ tail?: number; loop?: boolean;
  /** how a bar divides into beat groups (in beats, summing to the bar), e.g. [2, 3] for a 5/4 felt 2+3 or [1.5, 1, 1] for a 7/8 felt 3+2+2: where a split bar ("A B", "A B C") changes chord (default: splitBar's table) */ grouping?: number[];
  /** a shipped score frozen on the old sound (the launch film): never set this for a new piece */ legacy?: boolean;
  /** override the style's mix/space/feel profile (mixProfiles.ts), e.g. { space: {...}, feel: "tight" } */ mix?: Partial<MixProfile>;
};

/** Your own voice for a slot: an instrument, its role, options, send and pan. `gainDb` is a dB offset from the calibrated level (0 = at the slot's stem target). */
export type CustomVoice = Omit<Voice, "gainDb"> & { gainDb?: number };
/** An instrument's level against its register (INST_REGISTER, dB, linear between the measured octaves, held past the ends). */
const regAt = (inst: string, p: number) => { const c = INST_REGISTER[inst]; if (!c?.length) return 0; if (p <= c[0][0]) return c[0][1]; for (let i = 1; i < c.length; i++) if (p <= c[i][0]) return c[i - 1][1] + ((c[i][1] - c[i - 1][1]) * (p - c[i - 1][0])) / (c[i][0] - c[i - 1][0]); return c[c.length - 1][1]; };
/** Where your own voice sits at gainDb 0: its instrument's measured level on the slot's test line (a drum lane without its own reads its neighbour's), moved to the register your notes play in. */
const instLevel = (inst: string, slot: Slot, ns: Note[] = []) => {
  const lv = INST_LEVEL[inst]?.[slot] ?? INST_LEVEL[inst]?.[({ ghost: "snare", perc: "hat", snare: "ghost", hat: "perc" } as Partial<Record<Slot, Slot>>)[slot] ?? slot], ref = SLOT_REF_PITCH[slot];
  if (lv === undefined || ref === undefined || !ns.length) return lv;
  const ps = ns.map((n) => n.p).sort((a, b) => a - b); return lv + regAt(inst, ps[Math.floor(ps.length / 2)]) - regAt(inst, ref);
};

/** line() with the composer's context on its error: which section, slot or chord wrote the bad bar. */
const lineIn = (where: string, ...a: Parameters<typeof line>) => { try { return line(...a); } catch (e) { throw new Error(`compose: ${where}: ${(e as Error).message}`); } };
const need = (ok: unknown, msg: string) => { if (!ok) throw new Error(`compose: ${msg} The style supplies sound, never notes: compose it yourself (references/music/compose.md).`); };
const fmt = (x: number) => String(+x.toFixed(4));
const lanes: Lane[] = ["kick", "snare", "ghost", "hat", "perc"];

/**
 * Where a bar of `k` chords changes, in beats per chord. Two chords split on the meter's strong
 * division, not the arithmetic middle: 2/4 1+1, 3/4 2+1 (a waltz changes on beat 3, never on 2.5),
 * 4/4 2+2, 5/4 3+2, 6/8 1+1 (3+3 eighths), 7/8 2+1.5 (4+3 eighths), 9/8 2+1, 12/8 2+2. Three chords:
 * 3/4 1+1+1, 4/4 2+1+1, 5/4 2+1+2... see the table. A `grouping` with k groups wins; otherwise a
 * count the table does not name divides the bar evenly. Explicit beats ("A:1 B:2") override all of it.
 */
const SPLITS: Partial<Record<Meter, Record<number, number[]>>> = {
  "2/4": { 2: [1, 1] }, "3/4": { 2: [2, 1], 3: [1, 1, 1] }, "4/4": { 2: [2, 2], 3: [2, 1, 1], 4: [1, 1, 1, 1] },
  "5/4": { 2: [3, 2], 3: [2, 1, 2], 5: [1, 1, 1, 1, 1] }, "6/8": { 2: [1, 1] }, "7/8": { 2: [2, 1.5], 3: [1, 1, 1.5] },
  "9/8": { 2: [2, 1], 3: [1, 1, 1] }, "12/8": { 2: [2, 2], 3: [2, 1, 1], 4: [1, 1, 1, 1] },
};
export const splitBar = (meter: Meter, k: number, grouping?: number[]): number[] => {
  const bpb = beatsPerBar(meter);
  if (k <= 1) return [bpb];
  if (grouping && grouping.length === k) return grouping;
  return SPLITS[meter]?.[k] ?? Array.from({ length: k }, () => bpb / k);
};

/** Expand repeats: the sections as played, with their first bar. */
export const layout = (sections: ComposedSection[]) => {
  const out: { s: ComposedSection; id: string; from: number; to: number; pass: number }[] = []; let b = 0;
  sections.forEach((s, i) => { for (let k = 0; k < (s.repeat ?? 1); k++) { out.push({ s, id: s.id ?? `${s.kind}${i}`, from: b, to: b + s.bars, pass: k }); b += s.bars; } });
  return out;
};

export const composePiece = (m: Material): Piece => {
  const V = VOCAB[m.style]; need(V, `no vocabulary for style "${m.style}" (have: ${Object.keys(VOCAB).join(", ")}).`);
  const vocab = V!, meter = m.meter ?? vocab.meters[0], bpb = beatsPerBar(meter);
  need(m.title && Number.isFinite(m.seed) && m.mood, "a piece needs its own title, seed and mood.");
  need(Number.isFinite(m.bpm) && m.bpm > 0, `no tempo: set bpm (this style plays ${vocab.tempo[0]}-${vocab.tempo[1]} bpm).`);
  need(m.sections?.length, "no form: write the sections (kind, bars, harmony, lines).");
  need(m.chords && Object.keys(m.chords).length, "no harmony: write your chords (voicing + bass line per chord).");
  const lay = layout(m.sections), B = lay[lay.length - 1].to;
  need(m.sections.some((s) => s.lead), "no melody: at least one section needs a lead line (your own motif).");
  const motif = (x: string) => { const v = m.motifs?.[x]; if (v !== undefined) return v; need(/[:|]/.test(x), `no motif named "${x}": add motifs["${x}"] = "<bars of notation>", or write the notes inline (NOTE:DUR ...).`); return x; };
  const lineOf = (spec: LineSpec) => (Array.isArray(spec) ? spec : [spec]).map(motif).join(" | ");

  // ---- harmony per bar: chords with their beats; "~" holds the chord before it (tied, no restrike)
  need(!m.grouping || Math.abs(m.grouping.reduce((a, x) => a + x, 0) - bpb) < 1e-6, `grouping [${m.grouping?.join(", ")}] must add up to the bar (${bpb} beats in ${meter}).`);
  type Seg = { name: string; at: number; d: number; tie: boolean };
  const bars: Seg[][] = []; let prev: string | undefined;
  for (const x of lay) {
    need(x.s.harmony?.length, `section "${x.id}" has no harmony: write the chord names for its bars.`);
    for (let i = 0; i < x.s.bars; i++) {
      const src = x.s.harmony[i % x.s.harmony.length].trim(), toks = src.split(/\s+/).map((t) => { const [name, beats] = t.split(":"); return { name, beats: beats === undefined ? undefined : Number(beats) }; });
      const given = toks.filter((t) => t.beats !== undefined).length;
      need(given === 0 || given === toks.length, `harmony bar "${src}" (section "${x.id}"): give every chord its beats ("A:2 B:1") or none ("A B" splits where the meter does).`);
      const ds = given ? toks.map((t) => t.beats!) : splitBar(meter, toks.length, m.grouping);
      need(ds.every((d) => Number.isFinite(d) && d > 0) && Math.abs(ds.reduce((a, d) => a + d, 0) - bpb) < 1e-6, `harmony bar "${src}" (section "${x.id}") adds up to ${+ds.reduce((a, d) => a + d, 0).toFixed(4)} beats; a ${meter} bar is ${bpb}.`);
      let at = 0; const segs: Seg[] = [];
      toks.forEach((t, j) => { const tie = t.name === "~"; need(!tie || prev, `section "${x.id}": "~" holds the chord before it, but nothing comes before it.`);
        const name = tie ? prev! : t.name; need(m.chords[name], `chord "${name}" (section "${x.id}") has no voicing: add chords["${name}"] = { voicing: "[...]", bass: "..." }.`);
        segs.push({ name, at, d: ds[j], tie }); at += ds[j]; prev = name; });
      bars.push(segs);
    }
  }
  const chordAt = bars.map((segs) => [...new Set(segs.map((g) => g.name))]);
  const harmony = bars.flatMap((segs, b) => segs.filter((g) => !g.tie).map((g) => ({ t: b * bpb + g.at, name: g.name })));
  const at = (b: number) => lay.find((x) => b >= x.from && b < x.to)!;

  // ---- notes
  const notes: Partial<Record<Slot, Note[]>> = {};
  const push = (slot: Slot, ns: Note[]) => { (notes[slot] ??= []).push(...ns); };
  const vel: Record<Slot, number> = { chords: 0.62, lead: 0.72, counter: 0.5, bass: 0.85, arp: 0.55, kick: 0.85, snare: 0.7, ghost: 0.5, hat: 0.5, perc: 0.45 };
  const role = (slot: Slot): Role => (slot === "chords" || slot === "arp" ? "accomp" : slot === "lead" ? "melody" : slot === "counter" ? "color" : slot === "bass" ? "bass" : "drum");
  /** extend the chord-part notes that end exactly at beat t by d beats: a tie, no restrike */
  const holdIn = (slot: Slot) => (t: number, d: number) => { for (const n of notes[slot] ?? []) if (Math.abs(n.t + n.d - t) < 1e-9) n.d += d; };
  /** a tie: the chord part's (hold) or the bass's (hold2) notes that end exactly at beat t sound d beats longer, no restrike */
  const hold = holdIn("chords"), hold2 = holdIn("bass");
  const comps = new Map<ComposedSection, string[]>();
  for (const x of lay) if (x.s.comp !== undefined) comps.set(x.s, (Array.isArray(x.s.comp) ? x.s.comp : [x.s.comp]).join(" | ").split("|").map((z) => z.trim()).filter(Boolean));
  for (let b = 0; b < B; b++) {
    const x = at(b), cv = x.s.chordVel, names = chordAt[b], segs = bars[b], vtok = (name: string, d: number, v?: number) => { const k = v === undefined ? cv : (cv ?? 1) * v; return `${m.chords[name].voicing}:${fmt(d)}${k !== undefined ? `@${fmt(k)}` : ""}`; };
    const comp = comps.get(x.s);
    if (comp) { // the chord part's rhythm: x strikes the chord sounding at that point, r rests, ~ holds the last strike over the bar line
      const cb = comp[(b - x.from) % comp.length], toks: string[] = []; let o = 0;
      cb.split(/\s+/).forEach((tk, i) => { const q = /^(x|r|~):([0-9./]+)(?:@([0-9.]+))?$/.exec(tk); need(q, `section "${x.id}" comp bar "${cb}": "${tk}" is not x:DUR[@VEL], r:DUR or ~:DUR.`);
        const d = q![2].includes("/") ? Number(q![2].split("/")[0]) / Number(q![2].split("/")[1]) : Number(q![2]);
        if (q![1] === "~") { need(i === 0, `section "${x.id}" comp bar "${cb}": "~" holds the last strike over the bar line, so it comes first.`); hold(b * bpb, d); toks.push(`r:${fmt(d)}`); }
        else if (q![1] === "r") toks.push(`r:${fmt(d)}`);
        else toks.push(vtok(segs.filter((g) => g.at <= o + 1e-9).pop()!.name, d, q![3] ? Number(q![3]) : undefined));
        o += d; });
      need(Math.abs(o - bpb) < 1e-6, `section "${x.id}" comp bar "${cb}" sums to ${+o.toFixed(4)} beats; a ${meter} bar is ${bpb}${o < bpb ? ` (end it with its rest: "${cb} r:${+(bpb - o).toFixed(4)}")` : ""}.`);
      push("chords", lineIn(`section "${x.id}" comp (bar ${b})`, b * bpb, toks.join(" "), { role: "accomp", v: vel.chords, bpb, roll: 0.03 }));
    } else {
      segs.forEach((g) => { if (g.tie) hold(b * bpb + g.at, g.d); });
      const src = segs.map((g) => (g.tie ? `r:${fmt(g.d)}` : vtok(g.name, g.d))).join(" ");
      if (segs.some((g) => !g.tie)) push("chords", lineIn(`section "${x.id}" chords (bar ${b})`, b * bpb, src, { role: "accomp", v: vel.chords, bpb, roll: 0.03 }));
    }
    if (KINDS[x.s.kind].bass) {
      // the bass keeps its own rhythm under a held chord (the chord's bass line plays again); a bass bar "~" ties the bass over the bar line instead
      const ov = x.s.bass, bl = ov !== undefined ? (Array.isArray(ov) ? ov[(b - x.from) % ov.length] : ov) : names.length === 1 ? m.chords[names[0]].bass : undefined;
      need(bl !== undefined, names.length > 1 ? `bar ${b} splits into ${names.join(" + ")}: give section "${x.id}" a bass override for it.` : `chord "${names[0]}" (section "${x.id}") has no bass line: add chords["${names[0]}"].bass (one bar), or a section bass override.`);
      if (bl?.trim() === "~") hold2(b * bpb, bpb);
      else if (bl) push("bass", lineIn(`section "${x.id}" bass (bar ${b}${names.length === 1 && ov === undefined ? `, chords["${names[0]}"].bass` : ""})`, b * bpb, bl, { role: "bass", v: vel.bass, bpb }));
    }
    // drums
    const def = KINDS[x.s.kind].drums, gname = x.s.groove === undefined ? def : x.s.groove;
    if (gname) {
      const g = m.grooves?.[gname];
      need(g, `section "${x.id}" (${x.s.kind}) needs a groove "${gname}": add grooves["${gname}"] = { family: one of ${vocab.grooves.join(", ")}, density, variation } or write it (kick/snare/ghost/hat bars), or set groove: null.`);
      const bar = drumBar(g!, meter, m.seed, b, b - x.from, x.s.bars, x.s.energy ?? 0.5);
      for (const ln of lanes) if (bar[ln]) push(ln, lineIn(`section "${x.id}" ${ln} (bar ${b})`, b * bpb, bar[ln]!, { role: "drum", v: vel[ln], bpb, kind: laneKind(g!, ln) }));
    }
  }
  const warnings: string[] = [];
  for (const x of lay) for (const slot of ["lead", "counter", "arp"] as Slot[]) {
    const spec = x.s[slot as "lead" | "counter" | "arp"]; if (!spec) continue;
    let src = lineOf(spec); const barsOf = (t: string) => t.split("|").filter((z) => z.trim()).length, lb = barsOf(src);
    if (lb < x.s.bars) {
      if (x.s.loopLines) { const reps = Math.ceil(x.s.bars / lb), all = Array.from({ length: reps }, () => src).join(" | ").split("|").map((z) => z.trim()).filter(Boolean); src = all.slice(0, x.s.bars).join(" | "); }
      else if (x.pass === 0) warnings.push(`section "${x.id}": the ${slot} is ${lb} bar(s) in a ${x.s.bars}-bar section; it plays once, then rests (set loopLines: true to repeat it)`);
    }
    const ns = lineIn(`section "${x.id}" ${slot}`, x.from * bpb, src, { role: role(slot), v: vel[slot], bpb });
    need(ns.every((n) => n.t < x.to * bpb - 1e-9), `the ${slot} line of section "${x.id}" is longer than its ${x.s.bars} bars.`);
    push(slot, ns);
  }

  // ---- section energy: dynamics for every part (0.5 = as written, exactly)
  for (const x of lay) { const en = x.s.energy; if (en === undefined || en === 0.5) continue; const f = 0.55 + 0.9 * en, a = x.from * bpb, z = x.to * bpb;
    for (const ns of Object.values(notes)) for (const n of ns!) if (n.t >= a - 1e-9 && n.t < z - 1e-9) n.v *= f; }
  // ---- parts from the palette (+ alternates, levels, mood)
  const mood = m.moodControls ? fullMood(m.moodControls) : null, targets: Record<string, number> = {};
  const slots = [...BASE_SLOTS, ...(["arp", "perc"] as Slot[]).filter((s) => notes[s]?.length)];
  const parts: Part[] = [];
  for (const slot of slots) {
    const pick = m.voices?.[slot];
    const FALLBACK: Partial<Record<Slot, Slot>> = { perc: "hat", ghost: "snare", snare: "ghost", hat: "perc" }; // a drum lane without its own voice borrows its neighbour's
    let v = typeof pick === "object" ? { ...pick, gainDb: pick.gainDb ?? 0 } : typeof pick === "string" ? vocab.alternates[slot]?.[pick] : vocab.palette[slot] ?? (notes[slot]?.length && FALLBACK[slot] ? vocab.palette[FALLBACK[slot]!] : undefined);
    need(typeof pick !== "string" || v, `style ${vocab.id} has no "${pick}" voice for ${slot} (have: ${Object.keys(vocab.alternates[slot] ?? {}).join(", ") || "none"}).`);
    if (!v) { if (slot === "chords") continue; /* a style without a chord voice (chiptune): the harmony still labels bars and feeds the bass */ need(!notes[slot]?.length, `style ${vocab.id} has no ${slot} voice, but your ${slot} has notes: pick a groove family or slot this style has.`); continue; }
    v = resolveVoice(v, m.bpm);
    let dGain = 0; if (mood) { const r = moodVoice(slot, v, mood); v = r.voice; dGain = r.dGain; }
    const lv = m.levels?.[slot], fix = VOCAB_TARGET_FIX[vocab.id]?.[slot] ?? 0, st = vocab.stemTargets[slot];
    // every voice in a slot is calibrated to the slot's target (the style's number plus its fix): the palette's voice by VOCAB_TRIM, an
    // alternate by VOCAB_ALT_TRIM, your own voice from its instrument's measured level (INST_LEVEL), its gainDb an offset from there.
    // A legacy (shipped) score keeps the gains it was listened at: no trim.
    const lvl = typeof pick === "object" ? instLevel(v.inst, slot, notes[slot]) : undefined, altFix = typeof pick === "string" && !m.legacy ? VOCAB_ALT_TARGET_FIX[vocab.id]?.[slot]?.[pick] ?? 0 : 0;
    const trim = m.legacy ? 0 : pick === undefined ? VOCAB_TRIM[vocab.id]?.[slot] ?? 0 : typeof pick === "string" ? VOCAB_ALT_TRIM[vocab.id]?.[slot]?.[pick] ?? 0 : lvl !== undefined ? (st !== undefined ? st + fix : -20) - lvl : 0;
    let gainDb = trim ? v.gainDb + trim : v.gainDb; if (lv) gainDb += lv;
    // a timpani (or any pitched drum voice) playing a drum lane is tuned to the key: the tonic in its low register
    if (v.inst === "timpani" && role(slot) === "drum" && typeof pick !== "object") { const tp = pcOf(m.key.replace(/m$/, "")), lo = typeof v.opts?.pitch === "number" ? (v.opts.pitch as number) - 5 : slot === "kick" ? 31 : 38; /* the tonic nearest the voice's own register */ v = { ...v, opts: { ...(v.opts ?? {}), pitch: lo + ((tp - (lo % 12) + 12) % 12) } }; }
    if (st !== undefined) targets[slot] = st + dGain + (pick === undefined || !m.legacy ? fix : 0) + altFix; // a mood that lifts the hats lifts their target too; the slot's target is every voice's (the fix included)
    const p: Part = { id: slot, inst: v.inst, role: v.role, notes: notes[slot] ?? [], gainDb };
    if (v.opts) p.opts = v.opts; if (v.send !== undefined) p.send = v.send; if (v.pan !== undefined) p.pan = v.pan;
    parts.push(p);
  }
  const e = mood ? mood.energy - 0.5 : 0, dyn0 = m.dyn ?? [0.62, 0.66], dyn: [number, number] = mood ? [dyn0[0] + e * 0.2, dyn0[1] + e * 0.2] : dyn0;
  // key regions: one plan section per run of sections in the same key and mode (a single one when the piece never modulates)
  const keyOf = (x: (typeof lay)[number]) => `${x.s.key ?? m.key}|${x.s.mode ?? m.mode}`, regions: { from: number; to: number; key: string; mode: ModeId }[] = [];
  for (const x of lay) { const r = regions[regions.length - 1]; if (r && `${r.key}|${r.mode}` === keyOf(x)) r.to = x.to; else regions.push({ from: x.from, to: x.to, key: x.s.key ?? m.key, mode: x.s.mode ?? m.mode }); }
  const lvl = (b: number) => dyn[0] + ((dyn[1] - dyn[0]) * b) / B;
  const planSections = regions.length === 1 ? [{ id: "a", bars: B, mood: m.mood, key: m.key, mode: m.mode, melody: ["stepwise", "hook"] as MelodyType[], dyn, ending: "tail" as const, repeatable: false }]
    : regions.map((r, i) => ({ id: `key${i}`, bars: r.to - r.from, mood: m.mood, key: r.key, mode: r.mode, melody: ["stepwise", "hook"] as MelodyType[], dyn: [lvl(r.from), lvl(r.to)] as [number, number], ending: "tail" as const, repeatable: false }));
  const piece: Piece = {
    title: m.title, seed: m.seed, tail: m.tail ?? 3.2, harmony, parts, ...(m.legacy ? { legacy: true } : {}),
    plan: { style: m.style, tempo: m.bpm, meter, swing: m.swing ?? vocab.swing[0], ritard: m.loop ? 1 : 0.92, loop: m.loop,
      sections: planSections },
    fx: mood ? moodFx(vocab.fx, mood) : vocab.fx, stemTargets: targets,
    ...(m.mix ? { mix: m.mix } : {}),
    arrangement: lay.map((x) => ({ id: x.id, kind: x.s.kind, from: x.from, bars: x.s.bars })),
    warnings, refit: m.loop ? undefined : (seconds: number) => composePiece(refitMaterial(m, seconds)),
  };
  return piece;
};

/** lofiElectronic(material): composePiece in the lo-fi electronic vocabulary. */
export const lofiElectronic = (m: Omit<Material, "style">): Piece => composePiece({ ...m, style: "lofiElectronic" } as Material);

/**
 * The same composition for a film `seconds` long: the `stretch` section (default the longest
 * groove/hook/verse/drop) is played more or fewer times (0 = dropped), whichever puts the last
 * onset nearest `seconds - tail` at the written tempo. fitToDuration then trims the tempo.
 */
/** The section a film fit repeats or drops: the one marked `stretch`, else the longest groove/hook/verse/drop; -1 when none. */
export const stretchIndex = (m: Material) => {
  const secs = m.sections; let si = secs.findIndex((s) => s.stretch);
  if (si < 0) secs.forEach((s, i) => { if (["groove", "hook", "verse", "drop"].includes(s.kind) && (si < 0 || s.bars * (s.repeat ?? 1) > secs[si].bars * (secs[si].repeat ?? 1))) si = i; });
  return si;
};
/** The same material with its stretch section played `r` times (0 = dropped). */
export const withStretch = (m: Material, r: number): Material => { const si = stretchIndex(m); return si < 0 ? m : { ...m, sections: m.sections.map((s, i) => (i === si ? { ...s, repeat: r } : s)).filter((s) => (s.repeat ?? 1) > 0) }; };
export const refitMaterial = (m: Material, seconds: number): Material => {
  const want = seconds - (m.tail ?? 3.2), si = stretchIndex(m);
  if (si < 0 || want <= 0) return m;
  let best: { m: Material; cost: number } | null = null;
  for (let r = 0; r <= 64; r++) {
    const m2 = withStretch(m, r);
    if (!m2.sections.some((s) => s.lead)) continue;
    const t = perform(composePiece(m2), m.bpm, { expressive: true }).lastOnset, tempo = m.bpm * (t / want), cost = Math.abs(Math.log(tempo / m.bpm));
    if (!best || cost < best.cost) best = { m: m2, cost };
    if (tempo > m.bpm * 1.3) break;
  }
  return best ? best.m : m;
};

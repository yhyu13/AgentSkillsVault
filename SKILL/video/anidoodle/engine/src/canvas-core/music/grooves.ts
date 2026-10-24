// GROOVE FAMILIES: drum grammars, not drum patterns. A family says where the weight of a bar
// goes (kick anchors, backbeat, ghost slots, hat feel); `density`, `variation`, `fill` and the
// piece's seed decide the actual hits, bar by bar, so two pieces on the same family never share
// one loop. Pure: the same (family, params, seed, bar) always gives the same bar.
//
// Lanes: kick, snare, ghost (rim/soft snare), hat (closed), perc (open hat, shaker: the style's
// perc voice). Output is line() notation for one bar per lane (null = the lane rests).
import { rng as mkRng } from "../core";
import type { Meter } from "./plan";
import { beatsPerBar, isCompound } from "./plan";

export type GrooveFamily = "bounce" | "fourFloor" | "halfTime" | "broken" | "shuffle" | "pulse" | "brushes" | "build" | "tension" | "skip" | "trap" | "epic" | "hand" | "rock" | "swing";
/** A generated groove: the composer picks the family and its knobs. */
export type GrooveChoice = { family: GrooveFamily; density?: number; variation?: number; fill?: boolean; accent?: number };
/** A written groove: one or more bars of notation per lane, cycled by the absolute bar number. */
/** A written groove: one or more bars of notation per lane. Bars cycle from each section's first bar (`cycle: "piece"` cycles on the piece's bar count instead).
 *  The written pitch is ignored by unpitched drums (kick, snare, hat, noise): write C4. A pitched voice in a drum lane (timpani) is tuned to the key. */
export type LiteralGroove = { kick?: string[]; snare?: string[]; ghost?: string[]; hat?: string[]; perc?: string[]; cycle?: "section" | "piece" };
export type Groove = GrooveChoice | LiteralGroove;
export type Lane = "kick" | "snare" | "ghost" | "hat" | "perc";
export type DrumBar = Partial<Record<Lane, string | null>>;

export const GROOVE_FAMILIES: Record<GrooveFamily, string> = {
  bounce: "lo-fi / hip-hop bounce: kick on 1 plus syncopated pickups, backbeat on 2 and 4, ghost notes, 8th or 16th hats with accents",
  fourFloor: "house / drive: kick on every beat, clap on 2 and 4, off-beat open hats, 16ths when dense",
  halfTime: "half-time: kick on 1 (and a pickup), snare on 3; the same tempo feels twice as slow (a breath, a scene change)",
  broken: "broken beat / garage: kicks displaced off the grid, backbeat kept, ghosted 16ths; restless, modern",
  shuffle: "shuffle: triplet grid, swung hats, kick on 1 and 3 with a skip; playful, bouncy",
  pulse: "pulse: a soft heartbeat kick, no backbeat, sparse shaker; ambient and cinematic under-scoring",
  brushes: "brushes: soft rim on 2 and 4, shaker swishes, a gentle kick; tender, acoustic",
  build: "build: snare 8ths then 16ths rising in velocity across the section, kick on quarters; ends on the next downbeat",
  tension: "tension: 3-3-2 kick ostinato, accent on 4, quiet 16th hats; cinematic urgency, chases",
  skip: "skip: kick on 1 and the and-of-2, clap on 2 and 4, a skipping 16th perc; playful, light",
  trap: "trap: sparse syncopated kicks (the 808 bass follows them), clap on 3, 16th hats with velocity ramps and bursts, an open hat now and then",
  epic: "epic: big low hits (kick / timpani in perc) in a 3-3-2 or 1-and-3 figure, a snare accent on 4; orchestral and trailer weight",
  hand: "hand percussion: dum (low) on each group start, tek (rim) inside, ka (perc) fills; groups follow the meter (7/8 = 2+2+3, 9/8 = 2+2+2+3, 5/4 = 3+2)",
  rock: "rock: kick on 1 and 3 with an 8th pickup, snare backbeat, 8th hats, a crash (perc) on section starts",
  swing: "jazz swing: ride on the beats and the swung skip of 2 and 4, foot hi-hat (perc) on 2 and 4, feathered kick, snare comping ghosts",
};

/** Step grid for a meter: 16ths in simple meters, triplet 8ths in compound ones. */
const grid = (meter: Meter, triplet: boolean) => {
  const bpb = beatsPerBar(meter), compound = isCompound(meter) || (triplet && Number.isInteger(bpb)), per = compound ? 3 : 4;
  return { steps: Math.round(bpb * per), stepBeats: 1 / per, per, bpb: Math.ceil(bpb) };
};
const round = (x: number) => +x.toFixed(3);
/** Hits (step -> velocity multiplier) to one bar of notation. */
export const stepsToLine = (hits: Map<number, number>, steps: number, per: number, pitch?: Map<number, string>): string | null => {
  const at = [...hits.keys()].filter((s) => s >= 0 && s < steps).sort((a, b) => a - b); if (!at.length) return null;
  const d = (n: number) => (per === 3 ? `${n}/3` : String(n / per)); // exact: fractions for triplets, decimals for 16ths
  const toks: string[] = []; if (at[0] > 0) toks.push(`r:${d(at[0])}`);
  at.forEach((s, i) => { const nx = i + 1 < at.length ? at[i + 1] : steps; toks.push(`${pitch?.get(s) ?? "C4"}:${d(nx - s)}@${round(Math.min(1, Math.max(0.05, hits.get(s)!)))}`); });
  return toks.join(" ");
};

/**
 * One bar of a generated groove. `pos` = bar index inside its section, `len` = section bars,
 * `abs` = absolute bar (the seed's per-bar variation), `energy` 0..1 scales density.
 */
export const grooveBar = (g: GrooveChoice, meter: Meter, seed: number, abs: number, pos: number, len: number, energy = 0.5): DrumBar => {
  const trip = g.family === "shuffle" || g.family === "swing", G = grid(meter, trip), { steps, per, bpb } = G;
  const d = Math.min(1, Math.max(0, (g.density ?? 0.5) + (energy - 0.5) * 0.6)), v = g.variation ?? 0.35, acc = g.accent ?? 1;
  const r = mkRng(seed * 7919 + abs * 131 + 17), maybe = (p: number) => r() < p;
  const K = new Map<number, number>(), S = new Map<number, number>(), Gh = new Map<number, number>(), H = new Map<number, number>(), P = new Map<number, number>();
  const beat = (b: number, sub = 0) => b * per + sub; // step of beat b (0-based) plus a subdivision
  const back = bpb >= 4 ? [beat(1), beat(3)] : bpb === 3 ? [beat(1), beat(2)] : [beat(1)];
  const hats = (every: number, lo: number, hi: number, jitter = 0.08) => { for (let s = 0; s < steps; s += every) H.set(s, (s % per === 0 ? hi : lo) * (1 + (r() - 0.5) * jitter * 2)); };
  switch (g.family) {
    case "bounce": {
      K.set(0, 1); K.set(beat(2, 2), 0.9 * acc);
      for (const s of [beat(1, 3), beat(2), beat(2, 3), beat(3, 2)]) if (s < steps && maybe(0.15 + 0.35 * d * v)) K.set(s, 0.6 + 0.2 * r());
      for (const s of back) S.set(s, 1);
      if (d > 0.35) { const slots = [beat(1, 3), beat(3, 3), beat(0, 3), beat(2, 1)].filter((s) => s < steps); Gh.set(slots[Math.floor(r() * slots.length)], 0.45 + 0.1 * r()); }
      if (d > 0.55) { const pat = [0.85, 0.35, 0.6, 0.4]; for (let s = 0; s < steps; s++) H.set(s, pat[s % 4] * (1 + (r() - 0.5) * 0.12)); } else hats(2, 0.45, 0.8);
      break;
    }
    case "fourFloor": {
      for (let b = 0; b < bpb; b++) K.set(beat(b), b === 0 ? 1 : 0.92);
      for (const s of back) S.set(s, 0.95);
      for (let b = 0; b < bpb; b++) P.set(beat(b, 2), 0.7);
      if (d > 0.6) for (let s = 0; s < steps; s++) if (s % 2 === 1) H.set(s, 0.35 + 0.15 * r());
      if (v > 0.5 && maybe(0.3)) K.set(beat(bpb - 1, 3), 0.55);
      break;
    }
    case "halfTime": {
      K.set(0, 1); if (d > 0.4) K.set(beat(Math.min(2, bpb - 1) - 1, 2) + (maybe(v) ? 1 : 0), 0.7);
      S.set(beat(Math.floor(bpb / 2)), 1);
      hats(d > 0.6 ? 2 : per, 0.35, 0.6);
      break;
    }
    case "broken": {
      K.set(0, 1); for (const s of [beat(1, 2), beat(2, 1), beat(2, 3), beat(3, 1)]) if (s < steps && maybe(0.25 + 0.45 * v)) K.set(s, 0.75 + 0.15 * r());
      for (const s of back) S.set(s, 1);
      for (let s = 0; s < steps; s++) if (s % 2 === 1 && maybe(0.2 + 0.3 * d) && !K.has(s)) Gh.set(s, 0.35 + 0.15 * r());
      for (let s = 0; s < steps; s++) if (maybe(0.45 + 0.4 * d)) H.set(s, s % 2 ? 0.35 : 0.7);
      break;
    }
    case "shuffle": {
      K.set(0, 1); if (bpb >= 3) K.set(beat(2), 0.85); if (maybe(0.4 + 0.4 * v)) K.set(beat(1, 2), 0.6);
      for (const s of back) S.set(s, 0.95);
      for (let b = 0; b < bpb; b++) { H.set(beat(b), 0.75); if (d > 0.3) H.set(beat(b, 2), 0.45 + 0.1 * r()); }
      if (d > 0.6) Gh.set(beat(bpb - 1, 2), 0.4);
      break;
    }
    case "pulse": {
      K.set(0, 0.9); if (d > 0.5 && bpb >= 3) K.set(beat(Math.floor(bpb / 2)), 0.7); if (d > 0.75) K.set(beat(Math.floor(bpb / 2) - 1, 2), 0.5);
      if (d > 0.3) for (let b = 0; b < bpb; b++) P.set(beat(b, per / 2 >= 1 ? Math.floor(per / 2) : 0), 0.35 + 0.1 * r());
      if (v > 0.5 && maybe(0.4)) Gh.set(beat(bpb - 1), 0.35);
      break;
    }
    case "brushes": {
      K.set(0, 0.7); if (d > 0.5 && bpb >= 3) K.set(beat(bpb >= 4 ? 2 : 1), 0.55);
      for (const s of back) Gh.set(s, 0.6);
      for (let s = 0; s < steps; s += per === 3 ? 1 : 2) P.set(s, (s % per === 0 ? 0.55 : 0.3) * (1 + (r() - 0.5) * 0.3));
      break;
    }
    case "build": {
      const x = len > 1 ? pos / (len - 1) : 1, every = x < 0.5 ? 2 : 1;
      for (let b = 0; b < bpb; b++) K.set(beat(b), 0.9);
      for (let s = 0; s < steps; s += every) S.set(s, 0.35 + 0.6 * ((pos + s / steps) / len));
      hats(2, 0.4, 0.6);
      break;
    }
    case "tension": {
      for (const s of [0, 3, 6, 8, 11, 14].map((q) => Math.round((q / 16) * steps))) K.set(s, s === 0 ? 1 : 0.75);
      S.set(beat(bpb - 1), 0.9 * acc);
      for (let s = 0; s < steps; s++) H.set(s, (s % per === 0 ? 0.4 : 0.22) * (0.6 + 0.8 * d));
      if (v > 0.4 && maybe(0.5)) Gh.set(beat(bpb - 1, per - 1), 0.5);
      break;
    }
    case "skip": {
      K.set(0, 1); K.set(beat(1, 2), 0.8); if (maybe(0.3 + 0.4 * v)) K.set(beat(3, 1) < steps ? beat(3, 1) : beat(bpb - 1), 0.6);
      for (const s of back) S.set(s, 0.9);
      for (let s = 0; s < steps; s++) if (s % 4 === 1 || s % 4 === 3 || maybe(0.3 * d)) P.set(s, 0.3 + 0.25 * r());
      hats(2, 0.4, 0.65);
      break;
    }
    case "trap": {
      K.set(0, 1); for (const s of [beat(0, 3), beat(1, 2), beat(2, 3), beat(3, 1), beat(3, 2)]) if (s < steps && maybe(0.2 + 0.4 * v)) K.set(s, 0.8 + 0.15 * r());
      S.set(beat(Math.min(2, bpb - 1)), 1);
      for (let s = 0; s < steps; s++) H.set(s, (s % 2 ? 0.35 : 0.6) * (1 + (r() - 0.5) * 0.2));
      if (d > 0.5) { const b0 = Math.floor(r() * bpb); for (let j = 0; j < per; j++) H.set(beat(b0, j), 0.3 + (0.5 * j) / per); }
      if (maybe(0.25 * d)) P.set(beat(bpb - 1, 2), 0.5);
      break;
    }
    case "epic": {
      const fig = v > 0.5 ? [0, 3, 6, 8, 11, 14] : [0, 8, 10];
      for (const q of fig) { const s = Math.round((q / 16) * steps); K.set(s, q === 0 ? 1 : 0.8); if (d > 0.4) P.set(s, 0.7); }
      S.set(beat(bpb - 1), 0.9);
      if (d > 0.6) for (let s = 0; s < steps; s += 2) H.set(s, 0.3);
      break;
    }
    case "hand": {
      const eighths = Math.round(steps / (per === 3 ? 1 : 2)), unit = per === 3 ? 1 : 2;
      const groups = meter === "7/8" ? [2, 2, 3] : meter === "9/8" ? [2, 2, 2, 3] : meter === "5/4" ? [3, 3, 2, 2] : Array.from({ length: Math.max(1, Math.round(eighths / 2)) }, () => 2);
      let e8 = 0; groups.forEach((gsz, gi) => { const s0 = e8 * unit; K.set(s0, gi === 0 ? 1 : 0.8); for (let j = 1; j < gsz; j++) Gh.set((e8 + j) * unit, 0.5 + 0.2 * r()); if (d > 0.5 && maybe(0.5)) P.set((e8 + gsz) * unit - 1, 0.4); e8 += gsz; });
      if (per === 3 && meter !== "9/8") { /* compound: groups of 3 eighths */ K.clear(); Gh.clear(); for (let b = 0; b < bpb; b++) { K.set(beat(b), b === 0 ? 1 : 0.75); Gh.set(beat(b, 1), 0.45); Gh.set(beat(b, 2), 0.55); } }
      break;
    }
    case "rock": {
      K.set(0, 1); if (bpb >= 3) K.set(beat(2), 0.9); if (maybe(0.3 + 0.5 * v)) K.set(beat(Math.min(2, bpb - 1), 2), 0.75);
      for (const s of back) S.set(s, 1);
      hats(2, 0.55, 0.8);
      if (pos === 0) P.set(0, 0.9);
      break;
    }
    case "swing": {
      for (let b = 0; b < bpb; b++) { H.set(beat(b), 0.7); K.set(beat(b), 0.25); }
      for (const s of back) { H.set(s + 2, 0.5); P.set(s, 0.5); }
      for (let b = 0; b < bpb; b++) if (maybe(0.2 + 0.35 * d)) Gh.set(beat(b, 2), 0.3 + 0.2 * r());
      break;
    }
  }
  // the fill: kit families roll down the toms (GM notes: high tom D3, mid B2 / A2, floor G2 / F2); machine and orchestral ones stay on the snare
  const toms = new Map<number, string>();
  if (g.fill && pos === len - 1) { const f0 = steps - per, TOMS = per === 3 ? ["D3", "A2", "F2"] : ["D3", "B2", "A2", "G2"], onToms = TOM_FILL.has(g.family);
    for (let s = f0; s < steps; s++) { S.set(s, 0.45 + 0.5 * ((s - f0) / per)); if (onToms) toms.set(s, TOMS[s - f0]); } }
  const out: DrumBar = {};
  for (const [lane, m] of [["kick", K], ["snare", S], ["ghost", Gh], ["hat", H], ["perc", P]] as [Lane, Map<number, number>][]) out[lane] = stepsToLine(m, steps, per, lane === "snare" ? toms : undefined);
  return out;
};

export const isLiteral = (g: Groove): g is LiteralGroove => !("family" in g);
const TOM_FILL = new Set<GrooveFamily>(["rock", "bounce", "halfTime", "broken", "shuffle", "swing", "epic", "tension"]);
/** What each lane of a family IS, as a note kind for the kit voice (drums.ts): a fourFloor snare lane is a clap, a swing hat lane a ride. */
const LANE_KIND: Partial<Record<GrooveFamily, Partial<Record<Lane, string>>>> = {
  fourFloor: { snare: "clap", perc: "open" }, skip: { snare: "clap", perc: "shaker" }, trap: { snare: "clap", perc: "open" }, halfTime: { perc: "open" }, shuffle: { perc: "open" },
  swing: { hat: "ride", perc: "pedal" }, brushes: { ghost: "cross", perc: "sweep" }, pulse: { perc: "shaker" }, rock: { perc: "crash" }, epic: { perc: "crash" }, build: { perc: "crash" },
  hand: { kick: "dum", ghost: "tek", perc: "ka" }, tension: { perc: "ride" },
};
export const laneKind = (g: Groove, lane: Lane): string => (isLiteral(g) ? undefined : LANE_KIND[g.family]?.[lane]) ?? (lane === "perc" ? "perc" : lane);
/** One bar of any groove (literal lanes cycle on the absolute bar). */
export const drumBar = (g: Groove, meter: Meter, seed: number, abs: number, pos: number, len: number, energy?: number): DrumBar => {
  if (!isLiteral(g)) return grooveBar(g, meter, seed, abs, pos, len, energy);
  const k = g.cycle === "piece" ? abs : pos, pick = (xs?: string[]) => (xs && xs.length ? xs[k % xs.length] || null : null);
  return { kick: pick(g.kick), snare: pick(g.snare), ghost: pick(g.ghost), hat: pick(g.hat), perc: pick(g.perc) };
};

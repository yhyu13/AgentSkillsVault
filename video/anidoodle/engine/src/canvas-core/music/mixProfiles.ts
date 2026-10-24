// Each style's MIX and SPACE profile and its FEEL (sound v2). Data, like tables.ts: a style names a
// profile, a piece may override any field (Material.mix / Piece.mix). The engine reads these in
// render.ts (EQ per stem, drum bus, glue, width, space, limiter) and perform.ts (feel).
// Numbers come from the research doc (anidoodle-research/launch-film/research/music-synthesis-research.md
// sections 3-5) and common mixing practice; every profile is `unconfirmed` until a human listen.
import type { InstId, Role } from "./plan";
import type { StyleId } from "./tables";
import type { StemEq } from "./mixDsp";
import type { Space } from "./mixReverb";

/** What an instrument IS for the mixer. */
export type EqClass = "kick" | "snare" | "hat" | "chipDrum" | "boom" | "bass" | "chip" | "piano" | "keys" | "pad" | "lead" | "pluck" | "bell" | "fx";
export const EQ_CLASS: Record<InstId, EqClass> = {
  kick: "kick", snare: "snare", hat: "hat", noiseDrum: "chipDrum", timpani: "boom", bass: "bass", sub: "bass", triangle: "chip", pulse: "chip",
  piano: "piano", ePiano: "keys", organ: "keys", warmPad: "pad", strings: "pad", choir: "pad", brass: "lead", woodwind: "lead", leadSynth: "lead", bowedSolo: "lead",
  guitar: "pluck", harp: "pluck", softPluck: "pluck", musicBox: "bell", bell: "bell", celesta: "bell", marimba: "bell", vibes: "bell", fmBell: "bell", glockenspiel: "bell", wurlitzer: "keys", pipeOrgan: "keys", vinyl: "fx",
};
/** Corrective EQ per class: clear the mud (200-500 Hz), give each thing its own band, roll off what it doesn't use. */
export const CLASS_EQ: Record<EqClass, StemEq> = {
  kick: { hp: 28, bells: [[62, 1.1, 1.5], [330, 1.3, -3], [3800, 1.2, 1.5]] },
  snare: { hp: 90, bells: [[210, 1.2, 1], [850, 1.4, -1.5], [5500, 0.8, 1.5]] },
  hat: { hp: 320, bells: [[9000, 0.9, 1]], lp: 17500 },
  chipDrum: { hp: 60 },
  boom: { hp: 26, bells: [[300, 1.2, -2]] },
  bass: { hp: 30, bells: [[240, 1.1, -1.5], [900, 1.2, 1]], lp: 9000 },
  chip: { hp: 40 },
  piano: { hp: 30, bells: [[320, 1.0, -1], [3200, 0.9, 0.8]], air: 0.8 },
  keys: { hp: 70, bells: [[330, 1.1, -1.5], [2400, 1, 0.8]], lp: 14000 },
  pad: { hp: 110, bells: [[380, 1.0, -2], [3000, 0.8, 0.5]], lp: 13000 },
  lead: { hp: 110, bells: [[300, 1.2, -1], [2600, 1.0, 1.2]] },
  pluck: { hp: 85, bells: [[260, 1.2, -1.5], [4500, 0.8, 1.2]] },
  bell: { hp: 170, bells: [[600, 1.0, -0.8]], lp: 15000 },
  fx: { hp: 200 },
};
/** Default reverb send when a part names none (the legacy default was 1 for everything, bass included). */
export const ROLE_SEND: Record<Role, number> = { melody: 0.5, inner: 0.5, accomp: 0.6, color: 0.7, bass: 0.1, drum: 0.25 };

export type Lane = "kick" | "snare" | "ghost" | "hat" | "perc" | "bass" | "chords" | "lead" | "counter" | "arp";
/**
 * FEEL. `lanes`: a systematic offset per lane in ms (+ = late): the groove's shape, the same every
 * bar. `humanize`: a phrase-correlated drift (AR(1), sigma ms, correlation per onset): the player
 * leaning ahead or behind over a phrase. `jitter`: small uncorrelated error per note (sigma ms): the
 * hand. Drums and pitched parts get their own. `hatDriftMs`: 1/f-ish wander of the hats (lo-fi).
 * `velHumanize`/`velJitter`: the same split for velocity, relative (0.06 = +-6 %, about +-0.5 dB). `toneGamma`: Played.tone = v^gamma, the
 * timbre hook every voice may read (brightness, attack, partial mix follow velocity).
 */
export type Feel = {
  lanes: Partial<Record<Lane, number>>;
  drum: { humanizeMs: number; corr: number; jitterMs: number }; pitched: { humanizeMs: number; corr: number; jitterMs: number };
  hatDriftMs?: number; velHumanize: number; velJitter: number; toneGamma: number;
};
const F = (lanes: Feel["lanes"], drum: [number, number, number], pitched: [number, number, number], x: Partial<Feel> = {}): Feel => ({ lanes, drum: { humanizeMs: drum[0], corr: drum[1], jitterMs: drum[2] }, pitched: { humanizeMs: pitched[0], corr: pitched[1], jitterMs: pitched[2] }, velHumanize: 0.06, velJitter: 0.04, toneGamma: 0.8, ...x });
export const FEELS = {
  /** acoustic, rubato-led music: the performance rules carry it, a light human drift on top */
  natural: F({}, [3, 0.8, 1.5], [6, 0.85, 1.2]),
  /** a band that locks: snare a hair late, hats a hair early */
  tight: F({ kick: 0, snare: 4, ghost: 3, hat: -3, perc: -2, bass: 2 }, [2.2, 0.8, 1.2], [3.5, 0.85, 1]),
  /** electronic drive: hats pushed ahead, everything else on the grid */
  pushed: F({ kick: 0, snare: 2, ghost: 2, hat: -6, perc: -4, bass: 1, arp: -1 }, [1.2, 0.7, 0.6], [2, 0.8, 0.6], { velJitter: 0.03 }),
  /** lo-fi / hip-hop: snare late, ghosts late, hats early and wandering, bass behind the kick, keys lazy */
  laidBack: F({ kick: 0, snare: 18, ghost: 12, hat: -5, perc: 6, bass: 9, chords: 12, lead: 7, counter: 9 }, [3.5, 0.9, 1.8], [5, 0.9, 1.5], { hatDriftMs: 4, velHumanize: 0.08 }),
  /** swing: ride pushed, backbeat late, walking bass on top of the beat, comping behind */
  swing: F({ kick: 0, snare: 10, ghost: 8, hat: -8, perc: -4, bass: -3, chords: 12, lead: 4 }, [3.5, 0.85, 2], [5, 0.85, 1.5], { velHumanize: 0.08 }),
  /** orchestras speak late in the low and slow sections; players drift together */
  orchestral: F({ bass: 8, chords: 10, counter: 6, perc: 0, kick: 0 }, [4, 0.9, 2.5], [8, 0.9, 2.5]),
  /** machines: nothing moves (chiptune, grid parts) */
  grid: F({}, [0, 0, 0], [0, 0, 0], { velHumanize: 0, velJitter: 0 }),
} satisfies Record<string, Feel>;
export type FeelId = keyof typeof FEELS;

/** The whole mix profile of a style. */
export type MixProfile = {
  /** scales every class-EQ gain (0 = flat, 1 = as tabled) */ eq: number;
  /** extra EQ per class for this style (merged over CLASS_EQ) */ classEq?: Partial<Record<EqClass, StemEq>>;
  drumBus: { ratio: number; targetGrDb: number; attackMs: number; releaseMs: number; drive: number; satMix: number } | null;
  /** mix-bus glue: 2:1, slow attack, auto release-ish; `targetGrDb` 1-2 dB for dense. Gentle styles: only with RenderOpts.gentleGlue (<= 1 dB), a decision for Alex. */
  glue: { ratio: number; targetGrDb: number; attackMs: number; releaseMs: number } | null;
  /** mix-bus tilt (dB low end to high end) and light saturation (dense styles) */ tilt: number; busDrive: number;
  width: { monoHz: number; splitHz: number; mid: number; high: number };
  space: Space | null; /** a short room for the drums (sends of role "drum"); null = drums share the main space */ drumRoom: Space | null;
  feel: FeelId;
  /** default sends per role for parts that name none (over ROLE_SEND) */ sends?: Partial<Record<Role, number>>;
  /** gentle masters only: the transient-aware gain on plucked stems (mixDsp.transientGain; null = off) */ transient?: { maxDb: number; thrDb: number; ratio: number } | null;
};
/** The struck stems whose attacks pin a static gentle master at the true-peak ceiling: plucks, plucked basses, piano, mallets and bells, timpani. */
export const isStruck = (inst: InstId, opts?: Record<string, number | boolean | string>) => ["pluck", "piano", "bell", "boom"].includes(EQ_CLASS[inst]) || (inst === "bass" && opts?.kind !== "synth");
export const TRANSIENT_DEFAULT = { maxDb: 6, thrDb: 4, ratio: 3 };
const conv = (rt60: number, predelayMs: number, o: Partial<Space> = {}): Space => ({ kind: "conv", rt60, predelayMs, hp: 220, lp: 8000, er: 0.45, late: 0.32, size: 0.55, highMult: 0.5, lowMult: 1.1, ...o });
const fdn = (rt60: number, predelayMs: number, o: Partial<Space> = {}): Space => ({ kind: "fdn", rt60, predelayMs, hp: 250, lp: 7500, er: 0.4, late: 0.3, size: 0.5, highMult: 0.45, lowMult: 1.1, mod: 1, ...o });
const plate = (rt60: number, predelayMs: number, o: Partial<Space> = {}): Space => ({ kind: "plate", rt60, predelayMs, hp: 300, lp: 9000, er: 0, late: 0.3, size: 0.5, highMult: 0.6, mod: 1, ...o });
const kitRoom = (rt60 = 0.7): Space => fdn(rt60, 6, { size: 0.2, er: 0.55, late: 0.22, hp: 180, lp: 9000, highMult: 0.5 });

const W = (mid: number, high: number, monoHz = 120) => ({ monoHz, splitHz: 2000, mid, high });
const intimate: MixProfile = { eq: 0.8, drumBus: { ratio: 3, targetGrDb: 2, attackMs: 15, releaseMs: 120, drive: 1.2, satMix: 0.5 }, glue: null, tilt: 0, busDrive: 0, width: W(1.0, 1.08), space: conv(1.5, 18), drumRoom: null, feel: "natural" };
const band: MixProfile = { eq: 1, drumBus: { ratio: 4, targetGrDb: 3.5, attackMs: 10, releaseMs: 100, drive: 1.6, satMix: 0.6 }, glue: { ratio: 2, targetGrDb: 1.5, attackMs: 20, releaseMs: 200 }, tilt: 0, busDrive: 1.1, width: W(1.05, 1.15), space: conv(1.3, 15, { size: 0.45 }), drumRoom: kitRoom(0.7), feel: "tight" };
const electronic: MixProfile = { eq: 1, drumBus: { ratio: 4, targetGrDb: 4, attackMs: 10, releaseMs: 90, drive: 2, satMix: 0.7 }, glue: { ratio: 2, targetGrDb: 1.8, attackMs: 15, releaseMs: 180 }, tilt: 0, busDrive: 1.2, width: W(1.1, 1.25), space: plate(1.6, 22), drumRoom: kitRoom(0.6), feel: "pushed" };
const cinematicP: MixProfile = { eq: 0.9, drumBus: { ratio: 3, targetGrDb: 2.5, attackMs: 20, releaseMs: 150, drive: 1.3, satMix: 0.4 }, glue: null, tilt: 0, busDrive: 0, width: W(1.1, 1.2), space: conv(2.4, 30, { size: 0.9, late: 0.34, er: 0.35, hp: 200, lp: 7500 }), drumRoom: null, feel: "orchestral" };
const P = (base: MixProfile, o: Partial<MixProfile>): MixProfile => ({ ...base, ...o });

export const MIX_PROFILES: Record<StyleId, MixProfile> = {
  nocturne: P(intimate, { sends: { melody: 0.5, accomp: 0.35, inner: 0.35, bass: 0.3, color: 0.5 }, space: conv(1.7, 24, { room: "small-room", size: 0.6, late: 0.17, er: 0.4, hp: 300, lp: 6500 }), /* optional treated-room recording; hp 300 keeps the left hand's low-mids out of the send */ width: W(1.0, 1.1, 150), classEq: { piano: { hp: 28 } } }),
  lullaby: P(intimate, { space: conv(1.5, 18, { size: 0.5 }), tilt: -0.8 }),
  musicBox: P(intimate, { space: null /* the recipe: one reflection, handled in render */, width: W(1.0, 1.05) }),
  folk: P(intimate, { space: conv(1.2, 12, { size: 0.4, late: 0.28 }), width: W(1.05, 1.15), feel: "natural" }),
  minimalist: P(intimate, { space: conv(1.3, 14, { size: 0.5 }), feel: "tight" }),
  jazz: P(intimate, { space: conv(1.2, 12, { size: 0.45 }), drumRoom: kitRoom(0.8), feel: "swing" }),
  world: P(band, { space: conv(1.4, 16), glue: null, busDrive: 0, feel: "natural" }),
  playful: P(band, { space: fdn(1.0, 12, { size: 0.35 }), glue: null, busDrive: 0 }),
  rock: P(band, { space: plate(1.4, 20) }),
  cinematic: cinematicP,
  orchestral: P(cinematicP, { space: conv(2.6, 32, { size: 1, late: 0.34, er: 0.35, hp: 200, lp: 7000 }) }),
  choral: P(cinematicP, { space: conv(3.0, 35, { size: 1, late: 0.36, er: 0.3, hp: 180, lp: 7000 }), feel: "natural" }),
  suspense: P(cinematicP, { space: fdn(2.8, 25, { size: 0.9, late: 0.34, mod: 1.5 }) }),
  ambient: P(cinematicP, { space: fdn(4.0, 40, { size: 1, late: 0.36, er: 0.25, mod: 2, highMult: 0.55 }), width: W(1.15, 1.3), feel: "natural" }),
  drive: P(electronic, { space: plate(1.8, 25, { size: 0.7 }) }),
  house: P(electronic, { space: plate(1.3, 18) }),
  synthwave: P(electronic, { space: plate(2.2, 28, { size: 0.8, late: 0.34 }), feel: "tight" }),
  hipHop: P(electronic, { space: fdn(1.1, 14, { size: 0.35 }), feel: "laidBack", width: W(1.0, 1.15) }),
  lofiElectronic: P(electronic, { space: fdn(1.4, 20, { size: 0.45 }), drumBus: { ratio: 3, targetGrDb: 3, attackMs: 12, releaseMs: 110, drive: 1.5, satMix: 0.5 }, feel: "laidBack", width: W(1.05, 1.15) }),
  // lofi: the sampler crunch, the drums' small room and the tape/vinyl tilt are lofiFx's (LOFI_DUSTY), so the mix adds none of them twice: bus comp only, no bus drive, no mix tilt, no kit room
  lofi: P(electronic, { space: fdn(1.2, 16, { size: 0.35, lp: 6000, highMult: 0.35 }), drumBus: { ratio: 4, targetGrDb: 4, attackMs: 8, releaseMs: 100, drive: 1, satMix: 0 }, tilt: 0, drumRoom: null, width: W(0.9, 0.95, 150), feel: "laidBack" }),
  chiptune: { eq: 0.3, drumBus: null, glue: { ratio: 2, targetGrDb: 1, attackMs: 20, releaseMs: 150 }, tilt: 0, busDrive: 0, width: W(1.0, 1.0), space: null, drumRoom: null, feel: "grid" },
};

/** The profile a piece plays with: its style's, with the piece's own overrides. */
export const mixProfile = (style: StyleId, over?: Partial<MixProfile>): MixProfile => ({ ...MIX_PROFILES[style], ...(over ?? {}) });
/** The EQ a part gets: class EQ (+ style extra), scaled by the profile's `eq`, with role rules (a bass-role part keeps its lows). */
export const partEq = (prof: MixProfile, inst: InstId, role: Role): StemEq => {
  const c = EQ_CLASS[inst], base = { ...CLASS_EQ[c], ...(prof.classEq?.[c] ?? {}) }, k = prof.eq;
  const e: StemEq = { ...base, bells: (base.bells ?? []).map(([f, q, g]) => [f, q, g * k] as [number, number, number]), air: (base.air ?? 0) * k, tilt: (base.tilt ?? 0) * k };
  if (role === "bass" && c !== "kick" && c !== "boom") e.hp = Math.min(e.hp ?? 30, 32);
  if (role === "accomp" && e.hp && c !== "bass" && c !== "piano") e.hp *= 1.15;
  if (role === "melody" && c !== "bass") e.bells = [...(e.bells ?? []), [2800, 1.1, 0.8 * k]];
  return e;
};
/** Leave the lead band open on recorded support parts, without changing faders or the voice. */
export const recordedEq = (e: StemEq, role: Role, excessDb: number, fractionDb: number): StemEq => {
  if (role !== "bass" && role !== "accomp") return e;
  // A reference can itself be bright. Also limit absolute band occupancy toward 6% (-12 dB).
  // One broad bell spans the guard's 500 Hz-4 kHz band; the existing makeup stage holds level.
  const depth = Math.min(role === "bass" ? 12 : 9, Math.max(0, excessDb, fractionDb + 12) * (role === "bass" ? 0.8 : 1.4));
  return depth > 0 ? { ...e, bells: [...(e.bells ?? []), [1400, 0.45, -depth]] } : e;
};
/** A one-line summary for tools/music.mjs vocab. */
export const describeMix = (style: StyleId) => {
  const p = MIX_PROFILES[style], s = p.space;
  return `space ${s ? `${s.kind} ${s.rt60}s, predelay ${s.predelayMs} ms` : style === "musicBox" ? "one early reflection" : "none"}${p.drumRoom ? `, kit room ${p.drumRoom.rt60}s` : ""}; drum bus ${p.drumBus ? `${p.drumBus.ratio}:1 ~${p.drumBus.targetGrDb} dB + sat x${p.drumBus.drive}` : "none"}; glue ${p.glue ? `${p.glue.ratio}:1 ~${p.glue.targetGrDb} dB` : "none (gentle)"}; width mid x${p.width.mid} high x${p.width.high}, mono < ${p.width.monoHz} Hz; feel ${p.feel}`;
};

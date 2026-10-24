// CRAFT TABLES: the data behind craft.ts, with where each number comes from. Guides, not laws:
// every threshold is a starting point that craft.ts turns into an advisory, never a silent rewrite.
// Theory pages: references/music/theory/*.md.
import type { InstId } from "./plan";
import type { StyleId } from "./tables";

/**
 * Low interval limits: the lowest BOTTOM note (MIDI, C4 = 60) at which an interval of n semitones
 * still sounds clear rather than muddy. The chart circulated in Berklee arranging teaching (e.g.
 * Pease & Pullig, Modern Jazz Voicings, 2001); the physics is Plomp & Levelt (1965): two partials
 * inside one critical band (about 100 Hz wide below 500 Hz) roughen, so close intervals low down beat.
 * Unisons and octaves have no limit. Loose by +-2 semitones: a concert grand gets away with more.
 */
export const LOW_INTERVAL_LIMIT: Record<number, number> = {
  1: 52 /* m2 E3 */, 2: 51 /* M2 Eb3 */, 3: 48 /* m3 C3 */, 4: 46 /* M3 Bb2 */, 5: 46 /* P4 Bb2 */, 6: 47 /* tritone B2 */,
  7: 34 /* P5 Bb1 */, 8: 41 /* m6 F2 */, 9: 41 /* M6 F2 */, 10: 41 /* m7 F2 */, 11: 41 /* M7 F2 */, 13: 40 /* m9 E2 */, 14: 39 /* M9 Eb2 */,
};

/**
 * Instrument ranges (MIDI, sounding pitch). `play`: what the instrument can physically play (a note
 * outside is a real error for an acoustic instrument); `sweet`: where it sounds its best (outside is
 * a warning). Sources: Adler, The Study of Orchestration (4th ed., 2016); Rimsky-Korsakov, Principles
 * of Orchestration (1913); maker specs for Rhodes/Wurlitzer/marimba. Synth voices have no physical
 * limit (`play` null): only the sweet spot is advised.
 */
export const INST_RANGE: Partial<Record<InstId, { play: [number, number] | null; sweet: [number, number] }>> = {
  piano: { play: [21, 108], sweet: [36, 96] },
  musicBox: { play: null /* combs vary from 18 to 144 teeth */, sweet: [60, 96] },
  bell: { play: [48, 108], sweet: [60, 98] },
  celesta: { play: [60, 108], sweet: [72, 103] },
  marimba: { play: [36, 96], sweet: [45, 88] },
  vibes: { play: [53, 89], sweet: [53, 86] },
  glockenspiel: { play: [79, 108], sweet: [79, 103] },
  harp: { play: [23, 104], sweet: [36, 91] },
  guitar: { play: [38, 88], sweet: [40, 81] },
  strings: { play: [28, 103], sweet: [36, 93] },
  bowedSolo: { play: [36, 103], sweet: [43, 91] },
  brass: { play: [28, 86], sweet: [40, 79] },
  woodwind: { play: [50, 98], sweet: [55, 91] },
  choir: { play: [36, 86], sweet: [43, 79] },
  organ: { play: [24, 108], sweet: [36, 96] },
  pipeOrgan: { play: [12, 108], sweet: [24, 96] },
  timpani: { play: [36, 60], sweet: [38, 57] },
  bass: { play: [23, 72], sweet: [28, 55] },
  ePiano: { play: [28, 100], sweet: [40, 91] },
  wurlitzer: { play: [33, 96], sweet: [40, 88] },
  sub: { play: null, sweet: [24, 52] },
  warmPad: { play: null, sweet: [43, 91] },
  softPluck: { play: null, sweet: [48, 96] },
  leadSynth: { play: null, sweet: [52, 96] },
  pulse: { play: null, sweet: [48, 96] },
  triangle: { play: null, sweet: [28, 76] },
  fmBell: { play: null, sweet: [55, 103] },
};

/**
 * Interval-class dissonance 0..1 from Huron (1994), "Interval-class content of equally tempered
 * pitch-class sets", Music Perception 11(3): consonance ratings ic1 -1.428, ic2 -0.582, ic3 0.594,
 * ic4 0.386, ic5 1.240, ic6 -0.453, rescaled so ic5 (fourth/fifth) = 0 and ic1 (semitone) = 1.
 */
export const IC_DISSONANCE = [0, 1, 0.683, 0.242, 0.32, 0, 0.635];

/** Harmonic-function tension of a chord root, by semitones above the key's tonic (Lerdahl, Tonal Pitch Space, 2001, simplified: home 0, dominant high, borrowed and chromatic roots in between). */
export const ROOT_TENSION = [0, 0.7, 0.55, 0.45, 0.35, 0.5, 0.8, 0.8, 0.45, 0.3, 0.5, 0.85];

/** What a style allows. Genre-aware so the checks advise, never impose one idiom on another. */
export type CraftProfile = {
  /** parallel 5ths/8ves between voices: "forbid" in common-practice idioms (warn), "allow" where planing and power chords are the idiom (info) */
  parallels: "forbid" | "allow";
  /** melodies built from arpeggios and ostinatos: unrecovered leaps are the idiom, not a fault */
  arpeggioMelody: boolean;
  /** a groove idiom: expects some syncopation in the bass and drums (Witek et al. 2014: medium syncopation grooves most) */
  groove: boolean;
  /** an ending away from home is idiomatic (drones, suspense, ambient washes) */
  openEnding: boolean;
};
const P = (parallels: "forbid" | "allow", arpeggioMelody = false, groove = false, openEnding = false): CraftProfile => ({ parallels, arpeggioMelody, groove, openEnding });
export const CRAFT_PROFILE: Record<StyleId, CraftProfile> = {
  musicBox: P("forbid", true), nocturne: P("forbid"), lullaby: P("forbid"), choral: P("forbid"), orchestral: P("forbid"), cinematic: P("forbid"),
  folk: P("allow"), minimalist: P("allow", true, false, true), ambient: P("allow", false, false, true), suspense: P("allow", false, false, true),
  jazz: P("allow", false, true), lofi: P("allow", false, true), lofiElectronic: P("allow", false, true), hipHop: P("allow", false, true),
  house: P("allow", true, true), drive: P("allow", true, true), synthwave: P("allow", true, true), rock: P("allow", false, true),
  playful: P("allow", false, true), world: P("allow", false, true), chiptune: P("allow", true, true),
};

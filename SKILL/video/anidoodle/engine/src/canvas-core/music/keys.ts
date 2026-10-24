// Keys family (track S3, 2026-09-28): piano v2, electric pianos, mallets and bells, organs.
// New sound by default. Piece.legacy (the one freeze flag, shared with the other tracks) keeps the pre-rebuild voices
// bit-for-bit: render.ts skips keysVoice and runs its old switch. The shipped launch films set it.
import type { Played } from "./perform";
import type { Out, Opts } from "./keysCore";
import { electricPiano } from "./keysEP";
import { bars, musicBoxV2, fmBellV2 } from "./keysMallets";
import { tonewheel, pipeOrgan } from "./keysOrgan";
export { renderPianoV2, measuredB, type PianoVariant } from "./keysPiano";

/** Instruments this family renders (piano goes through render.ts's pedal-aware path). */
export const KEYS_INSTS = ["musicBox", "bell", "celesta", "marimba", "vibes", "glockenspiel", "fmBell", "ePiano", "wurlitzer", "organ", "pipeOrgan"] as const;
/**
 * The new keys voices. Returns null for instruments outside the family. Options (all optional):
 *   ePiano     model "rhodes" | "wurli" | "dx", detune (c, per-note spread), trem (Hz), tremDepth, drive, width
 *   organ      kind "tonewheel" | "pipe", drawbars "888000000", bright (legacy registration), leslie "slow" | "fast" | "off" (trem: 0 = off), perc "2nd" | "3rd", click, drive
 *   pipeOrgan  stops "principal" | "flute" | "full", trem (Hz tremulant, default off)
 *   vibes      trem (motor Hz, 0 = off), tremDepth
 */
export const keysVoice = (inst: string, keys: Played[], sr: number, n: number, o: Opts, seed: number): Out | null => {
  switch (inst) {
    case "musicBox": return musicBoxV2(keys, sr, n, o, seed);
    case "bell": return bars(keys, sr, n, o, seed, "bell");
    case "celesta": return bars(keys, sr, n, o, seed, "celesta");
    case "marimba": return bars(keys, sr, n, o, seed, "marimba");
    case "vibes": return bars(keys, sr, n, o, seed, "vibes");
    case "glockenspiel": return bars(keys, sr, n, o, seed, "glockenspiel");
    case "fmBell": return fmBellV2(keys, sr, n, o, seed);
    case "ePiano": return electricPiano(keys, sr, n, o, seed);
    case "wurlitzer": return electricPiano(keys, sr, n, o, seed, "wurli");
    case "organ": return o.kind === "pipe" ? pipeOrgan(keys, sr, n, o, seed) : tonewheel(keys, sr, n, o, seed);
    case "pipeOrgan": return pipeOrgan(keys, sr, n, o, seed);
    default: return null;
  }
};

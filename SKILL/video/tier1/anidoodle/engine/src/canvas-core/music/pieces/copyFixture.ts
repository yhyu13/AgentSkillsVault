// COPY FIXTURE (a test fixture, never a score). "Daylight" was offered as a lo-fi electronic example
// and Alex heard it at once: "almost the same as our launch track". It changed the key (D), the
// chords (I-vi-IV-V) and the pitches, but kept the launch's rhythms in every layer (hook cell per
// chord, sparkle answer, sub root + walk, the same drum bars) and its arrangement. The novelty gate
// (novelty.ts) must score it as a copy of launchLofi3: that is the proof the gate hears what she heard.
import type { Piece } from "../plan";
import { composePiece, type Material } from "../compose";

const HATS = Array.from({ length: 16 }, (_, i) => `C4:.25@${[0.85, 0.35, 0.6, 0.4][i % 4]}`).join(" ");
export const daylightCopyMaterial = (): Material => ({
  style: "lofiElectronic", title: "Daylight (copy fixture)", seed: 96, mood: "joy", bpm: 96, key: "D", mode: "major", swing: 0.54,
  chords: {
    Dmaj9: { voicing: "[F#3 A3 C#4 E4]", bass: "D2:3 r:.5 A1:.5" }, Bm9: { voicing: "[F#3 A3 C#4 D4]", bass: "B1:3 r:.5 F#1:.5" },
    Gmaj9: { voicing: "[F#3 A3 B3 D4]", bass: "G1:3 r:.5 D2:.5" }, A13: { voicing: "[G3 B3 C#4 F#4]", bass: "A1:3 r:.5 E2:.5" },
  },
  motifs: {
    h0: "r:.5 F#4:.5 A4:.5 D5:1 C#5:.5 A4:1", h1: "r:.5 F#4:.5 B4:.5 C#5:.5 D5:1 B4:1", h2: "r:.5 D5:.5 E5:.5 F#5:1 E5:.5 D5:1", h3: "C#5:1.5 B4:.5 A4:1 r:1",
    s0: "r:1 A5:.5 C#6:.5 E6:2", s1: "r:1 F#5:.5 A5:.5 C#6:2", s2: "r:1 F#6:.5 D6:.5 B5:2", s3: "C#6:1 B5:1 A5:2",
  },
  grooves: {
    main: { kick: ["C4:1.5 C4:1@.75 C4:1.5@.9", "C4:1.5 C4:.5@.6 C4:.5@.7 C4:1.25@.9 C4:.25@.5"], snare: ["r:1 C4:2 C4:1"], ghost: ["r:3.75 C4:.25@.5", "r:1.75 C4:.25@.45 r:2"], hat: [HATS], cycle: "piece" },
    half: { kick: ["C4:2 r:2"], snare: ["r:2 C4:2"], hat: ["C4:1@.6 C4:1@.35 C4:1@.6 C4:1@.35"], cycle: "piece" },
  },
  sections: [
    { kind: "intro", bars: 2, harmony: ["Gmaj9", "A13"], chordVel: 0.8 },
    { kind: "hook", bars: 4, harmony: ["Dmaj9", "Bm9", "Gmaj9", "A13"], lead: ["h0", "h1", "h2", "h3"] },
    { kind: "hook", bars: 4, harmony: ["Dmaj9", "Bm9", "Gmaj9", "A13"], lead: ["h0", "h1", "h2", "h3"], counter: ["s0", "s1", "s2", "s3"] },
    { kind: "half", bars: 2, harmony: ["Dmaj9", "Bm9"], counter: ["s0", "s1"] },
    { kind: "breakdown", bars: 2, harmony: ["Gmaj9", "A13"] },
    { kind: "drop", bars: 1, harmony: ["Dmaj9"], lead: ["h0"] },
    { kind: "outro", bars: 2, harmony: ["Dmaj9"], chordVel: 0.75, bass: "D2:4", lead: ["r:4", "D5:4"] },
  ],
});
export const daylightCopy = (): Piece => composePiece(daylightCopyMaterial());

// CHEETAH, DUSK: the score. Four bars at 80 bpm, exactly the film's 12 s, written to loop.
// Chill lo-fi electronic in D major, a drifting IV-iii-vi-V: Gmaj9, F#m7, Bm9, A11.
// BARS [film]: 1 pad and a first phrase, no drums [night, the sun comes up] · 2 the groove enters,
// the phrase answers itself [the face makes itself] · 3 the phrase climbs, a high counter-line
// joins [alive] · 4 half-time, the line falls back home [into the eye], and round again.
import { type Piece } from "../plan";
import { composePiece, type Material } from "../compose";

export const cheetahDuskMaterial = (): Material => ({
  style: "lofiElectronic", title: "Cheetah, dusk", seed: 4107, mood: "calm", bpm: 80, key: "D", mode: "major", swing: 0.55, loop: true, tail: 1.2, levels: { lead: 2.8, counter: -5, chords: -2, snare: -1.5 },
  chords: {
    Gmaj9: { voicing: "[B3 D4 F#4 A4]", bass: "G1:2.5 r:.5 G1:1" },
    "F#m7": { voicing: "[A3 C#4 E4 F#4]", bass: "F#1:2.5 r:.5 C#2:1" },
    Bm9: { voicing: "[A3 C#4 D4 F#4]", bass: "B1:2.5 r:.5 F#1:1" },
    A11: { voicing: "[G3 B3 D4 E4]", bass: "A1:2.5 r:.5 E2:1" },
  },
  motifs: {
    rise: "r:1 F#5:.5 A5:.5 B5:1.5 A5:.5",
    answer: "r:.5 E5:.5 F#5:.5 A5:1 F#5:.5 E5:1",
    climb: "r:1 D5:.5 F#5:.5 A5:1 B5:.5 D6:.5",
    home: "C#6:1.5 B5:.5 A5:1 r:1",
    rest: "r:4",
    glint: "r:2 F#6:.5 E6:.5 D6:1",
    settle: "r:1 E6:.5 C#6:.5 A5:2",
  },
  grooves: {
    main: { kick: ["C4:1 r:.5 C4:.5@.7 r:.5 C4:1.5@.85"], snare: ["r:1 C4:1 r:1 C4:1"], ghost: ["r:3.5 C4:.5@.45"], hat: ["C4:.5@.7 C4:.5@.35 C4:.5@.6 C4:.5@.35 C4:.5@.7 C4:.5@.35 C4:.5@.6 C4:.5@.4"], cycle: "piece" },
    half: { kick: ["C4:2.5 C4:1.5@.7"], snare: ["r:2 C4:2"], hat: ["C4:1@.6 C4:1@.35 C4:1@.6 C4:1@.35"], cycle: "piece" },
  },
  sections: [
    { kind: "intro", bars: 1, harmony: ["Gmaj9"], lead: ["rise"], chordVel: 0.8 },
    { kind: "hook", bars: 2, harmony: ["F#m7", "Bm9"], lead: ["answer", "climb"], counter: ["rest", "glint"] },
    { kind: "half", bars: 1, harmony: ["A11"], lead: ["home"], counter: ["settle"] },
  ],
});
export const cheetahDuskScore = (): Piece => composePiece(cheetahDuskMaterial());

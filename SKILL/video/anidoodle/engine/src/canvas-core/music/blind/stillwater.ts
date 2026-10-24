// STILLWATER: a 45 s intro for a sleep and meditation app. ambient vocabulary, calm mood,
// Db lydian, 3/4 at 52 bpm (a bar = 3.46 s, 12 bars + a long tail). No drums. A bell figure
// that falls and then lifts by a step (a breath out, a small breath in), echoed by a pluck an
// octave up; a slow celesta ripple keeps the water moving. It ends on the II chord over the
// tonic pedal with the melody hanging on the 9th: floating, unresolved.
import type { Material } from "../compose";

export const stillwater = (): Material => ({
  style: "ambient", title: "Stillwater", seed: 9013, mood: "calm",
  bpm: 52, key: "Db", mode: "lydian", meter: "3/4", tail: 4.9,
  levels: { lead: 10, arp: 5.9, chords: 0.4, counter: 1.3, bass: 0.3 } /* sound v2: re-balanced so every stem sits where the composer put it against its target (the notes are untouched); written for v1 as lead: 10.5, arp: 5, chords: 2, counter: 9 */,
  moodControls: { energy: 0.15, warmth: 0.6, brightness: 0.4, tension: 0.1, space: 0.5 },
  chords: {
    I: { voicing: "[Ab3 C4 Eb4 F4]", bass: "Db2:3" },
    iii: { voicing: "[Ab3 C4 Eb4 G4]", bass: "Db2:3" },
    vi: { voicing: "[Ab3 Db4 F4 C5]", bass: "Bb1:3" },
    Vadd9: { voicing: "[Bb3 C4 Eb4 G4]", bass: "Ab1:3" },
    ivo: { voicing: "[Ab3 Bb3 Db4 F4]", bass: "G1:3" },
    II: { voicing: "[G3 Bb3 Eb4 F4]", bass: "Db2:3" },
  },
  motifs: {
    // the exhale: a long falling 4th, a step, then the small lift (the high point is the last note)
    ex: "F5:1.5 C5:.5 Db5:1",
    exR: "r:3",
    // varied: the lift reaches the lydian G (the colour note, early)
    exG: "F5:1.5 C5:.5 G5:1",
    ex2: "Ab5:1.5 Eb5:.5 F5:1",
    ex3: "G5:1.5 Db5:.5 Eb5:1",
    // the last word: the exhale starts but stops on the 9th and hangs
    last: "F5:1.5 C5:.5 Eb5:1",
    // pluck echoes an octave up, late in the bar
    e1: "r:2 F6:.5 Eb6:.5", e2: "r:2 G6:.5 Ab6:.5", e3: "r:2.5 Eb6:.5",
    // celesta ripples: one onset a beat, never on the same pattern twice in a row
    w1: "Db5:1 Ab5:1 C6:.5 Eb6:.5", w2: "Eb5:1 G5:.5 C6:.5 Ab5:1", w3: "Db5:1 F5:1 Db6:.5 C6:.5", w4: "G5:1 C6:.5 Eb6:.5 G5:1",
    w5: "Bb4:1 Db5:.5 F5:.5 C6:1", w6: "Bb4:1 Eb5:1 G5:.5 F5:.5",
  },
  grooves: {},
  sections: [
    { kind: "intro", bars: 2, harmony: ["I"], chordVel: 0.6, arp: ["w1", "w2"] },
    { kind: "verse", groove: null, bars: 4, harmony: ["I", "iii", "vi", "vi"], chordVel: 0.75,
      lead: ["ex", "exR", "exG", "exR"], counter: ["r:3", "e1", "r:3", "e2"], arp: ["w3", "w4", "w5", "w3"] },
    { kind: "bridge", groove: null, bars: 4, harmony: ["Vadd9", "ivo", "iii", "vi"], chordVel: 0.7,
      lead: ["ex2", "exR", "ex3", "r:3"], counter: ["r:3", "e3", "r:3", "e1"], arp: ["w6", "w5", "w2", "w3"] },
    { kind: "outro", bars: 2, harmony: ["II"], chordVel: 0.6, lead: ["last", "r:3"], arp: ["w6", "Eb5:1 G5:.5 Bb5:.5 F5:1"] },
  ],
});

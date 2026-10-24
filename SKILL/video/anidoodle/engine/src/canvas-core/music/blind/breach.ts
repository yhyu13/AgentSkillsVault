// BREACH: 30 s cybersecurity reveal teaser. drive vocabulary, tension mood, C# aeolian, 4/4, 130 bpm.
// Picture beats (bar = 1.846 s): 0 s pulse starts, 3.7 s scan motif, 11.1 s pressure rises,
// 18.5 s build, 22.2 s one bar of held breath, 24.0 s HARD REVEAL (bar 14), 27.7 s tag button.
import type { Material } from "../compose";

const P = "C#2:.5 C#2:.5 C#2:.5 C#3:.5 C#2:.5 C#2:.5 C#2:.25 C#2:.25 G#1:.5"; // the pedal pulse
export const breach = (): Material => ({
  style: "drive", title: "Breach", seed: 4471, mood: "tension",
  bpm: 130, key: "C#", mode: "aeolian", meter: "4/4",
  tail: 2.4, levels: { bass: 0.2, hat: 6.5, arp: -5.8, lead: 1.6, kick: 0.6, snare: -2.9, perc: -6 } /* sound v2: re-balanced so every stem sits where the composer put it against its target (the notes are untouched); written for v1 as bass: -3.5, hat: 25, arp: -1, lead: 7.9 */,
  moodControls: { energy: 0.7, warmth: 0.3, brightness: 0.35, tension: 0.85, space: 0.35 },
  chords: {
    i: { voicing: "[G#3 C#4 D#4 E4]", bass: P },
    iv_i: { voicing: "[A3 C#4 F#4]", bass: P },
    VI_i: { voicing: "[G#3 A3 C#4 E4]", bass: P },
    III: { voicing: "[G#3 B3 E4]", bass: "E2:.75 E2:.25 r:.5 E2:.5 E3:.25 E2:.75 B1:.5 D#2:.5" },
    v: { voicing: "[F#3 B3 D#4]", bass: "G#1:.75 G#1:.25 r:.5 G#1:.5 G#2:.25 G#1:.75 G#1:.5 F#1:.5" },
    VI: { voicing: "[G#3 C#4 E4]", bass: "A1:.75 A1:.25 r:.5 A1:.5 A2:.25 A1:.75 A1:.5 B1:.5" },
    // build: a G# pedal under climbing shapes
    ivG: { voicing: "[A3 C#4 F#4]", bass: "G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25" },
    VIG: { voicing: "[A3 C#4 E4 B4]", bass: "G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25 G#1:.25" },
    Vsus: { voicing: "[G#3 C#4 D#4]", bass: "r:4" },
    // the reveal and the tag
    I5: { voicing: "[C#3 G#3 C#4 E4 G#4]", bass: "C#2:1.5 C#2:.5 r:.5 C#3:.5 C#2:.5 C#2:.5" },
    bIII: { voicing: "[B3 E4 G#4]" }, IV: { voicing: "[C#4 F#4 A#4]" },
    home: { voicing: "[C#3 G#3 C#4 G#4]", bass: "C#2:1 r:3" },
  },
  motifs: {
    // the scan: an upbeat start, a semitone twitch, then a leap to a long high note
    scan: "r:.5 G#4:.5 A4:.25 G#4:.75 r:.5 E5:1.5",
    scanQ: "r:.5 G#4:.5 A4:.25 G#4:.75 r:.5 F#5:.5 E5:1",
    scanA: "r:.5 E4:.5 F#4:.25 E4:.75 r:.5 C#5:1.5",
    scanUp: "r:.5 B4:.5 C#5:.25 B4:.75 r:.5 G#5:1.5",
    scanUp2: "r:.5 C#5:.5 D#5:.25 C#5:.75 r:.5 A5:.5 G#5:1",
    frag1: "G#4:.5 A4:.25 G#4:.25 B4:.5 C#5:.25 B4:.25 C#5:.5 D#5:.25 C#5:.25 E5:.5 F#5:.25 E5:.25",
    frag2: "G#5:.25 A5:.25 G#5:.25 A5:.25 B5:.25 A5:.25 B5:.25 C#6:.25 D#6:1 r:1",
    whisper: "r:2.5 D#5:.5 G#5:1",
    // the reveal: the scan augmented an octave up, then the tag's answer
    big: "G#5:1 A5:.5 G#5:1.5 E6:1",
    bigA: "C#6:1.5 B5:.5 A#5:1 G#5:1",
    button: "[C#5 G#5]:.75 r:3.25",
    // the pulse: a 3-note cell across 16ths (it realigns every 3 bars)
    pulse16: "C#5:.25 G#4:.25 D#5:.25 C#5:.25 G#4:.25 D#5:.25 C#5:.25 G#4:.25 D#5:.25 C#5:.25 G#4:.25 D#5:.25 C#5:.25 G#4:.25 D#5:.25 C#5:.25",
  },
  grooves: {
    main: { family: "tension", density: 0.55, variation: 0.35 },
    build: { family: "build", density: 0.8 },
    drop: { family: "fourFloor", density: 0.85, variation: 0.3, fill: true },
  },
  sections: [
    { kind: "intro", bars: 2, harmony: ["i"], chordVel: 0.55, arp: ["pulse16", "pulse16"] },
    { kind: "verse", bars: 4, harmony: ["i", "i", "VI_i", "iv_i"], lead: ["scan", "scanQ", "scanA", "r:4"], arp: Array(4).fill("pulse16"), energy: 0.25, chordVel: 0.7 },
    { kind: "hook", bars: 4, harmony: ["i", "III", "v", "VI"], lead: ["scanUp", "scanUp2", "scan", "scanQ"], arp: Array(4).fill("pulse16"), energy: 0.7 },
    { kind: "build", bars: 2, harmony: ["ivG", "VIG"], lead: ["frag1", "frag2"], arp: ["pulse16", "pulse16"], energy: 0.9 },
    { kind: "breath", bars: 1, harmony: ["Vsus"], chordVel: 0.15, lead: ["whisper"] },
    { kind: "drop", bars: 2, groove: "drop", harmony: ["I5", "bIII IV"], bass: [P.replace(/C#2:\.5 C#2:\.5 C#2:\.5/, "C#2:1 C#2:.5"), "E2:.5 E2:.5 E2:.5 E3:.5 F#2:.5 F#2:.5 F#3:.5 F#2:.5"], lead: ["big", "bigA"], arp: ["pulse16", "r:2 C#5:.25 G#4:.25 D#5:.25 C#5:.25 G#4:.25 D#5:.25 E5:.25 F#5:.25"], energy: 1 },
    { kind: "outro", bars: 1, harmony: ["home"], chordVel: 0.6, lead: ["button"] },
  ],
});

// SKYWARD KIDS: a 30 s trailer for a children's adventure game. orchestral vocabulary, heroic
// mood, C major, a chromatic-mediant (E major) turn in the finish, 6/8 gallop at 88 bpm (a bar = 1.36 s, 20 bars).
// The fanfare: two pickup eighths, a rising 4th then a 5th, a step down, then a climb to a long
// note ("sky-ward, HO!"). Question lands on the 6th/5th, answer on the tonic; fragmented in the
// bridge between brass and flute, climbed in the build, augmented at the finish.
// Picture beats: 0 s ostinato, 2.7 s fanfare, 8.2 s full theme, 13.6 s the journey (bridge),
// 19.1 s climb, 21.8 s the big finish, 25.9 s final chord + timpani.
import type { Material } from "../compose";

const T = (n: number) => `${n}/3`;
// the string ostinato: a galloping 8th figure through the chord (low-high-mid, twice per bar)
const ost = (a: string, b: string, c: string) => `${a}:${T(1)} ${c}:${T(1)} ${b}:${T(1)} ${a}:${T(1)} ${c}:${T(1)}@0.8 ${b}:${T(1)}@0.7`;
const gallop = (r: string, f: string) => `${r}:${T(2)} ${r}:${T(1)} ${f}:${T(2)} ${r}:${T(1)}`;

// timpani / drums written per ABSOLUTE bar (literal grooves cycle on the absolute bar number)
const roots = ["C2", "C2", "C2", "C2", "A1", "G1", "C2", "D2", "F1", "C2", "A1", "F1", "D2", "A1", "G1", "G1", "C2", "E2", "F1", "C2"];
const fifth: Record<string, string> = { C2: "G1", A1: "E2", G1: "D2", D2: "A1", F1: "C2", E2: "B1" };
const timp = roots.map((r) => `${r}:${T(2)} r:${T(1)} ${fifth[r]}:${T(2)} ${fifth[r]}:${T(1)}@0.7`);
const H = `C4:${T(1)}@0.5 C4:${T(1)}@0.3 C4:${T(1)}@0.35 C4:${T(1)}@0.5 C4:${T(1)}@0.3 C4:${T(1)}@0.35`;

export const skywardKids = (): Material => ({
  style: "orchestral", title: "Skyward Kids", seed: 6128, mood: "heroic",
  bpm: 88, key: "C", mode: "major", meter: "6/8", tail: 2.8,
  moodControls: { energy: 0.7, warmth: 0.5, brightness: 0.65, tension: 0.3, space: 0.55 },
  voices: { counter: "flute" },
  levels: { hat: 9.2, perc: -8.2, counter: -0.3, chords: -1.2, arp: -1.6, bass: 1.3, kick: 1, snare: -1.4 } /* sound v2: re-balanced so every stem sits where the composer put it against its target (the notes are untouched); written for v1 as hat: 19, perc: -2.3, counter: 8, chords: -2, arp: 2.5, lead: 10. The flute alternate is calibrated to the counter target since 0.6 (it was 6.7 dB under): counter 6.4 -> -0.3 keeps it where it was */,
  chords: {
    C: { voicing: "[E3 G3 C4 E4]", bass: gallop("C2", "G2") },
    F_C: { voicing: "[F3 A3 C4 F4]", bass: gallop("C2", "C3") },
    Am: { voicing: "[E3 A3 C4 E4]", bass: gallop("A1", "E2") },
    G: { voicing: "[D3 G3 B3 D4]", bass: gallop("G1", "D2") },
    D: { voicing: "[F#3 A3 D4]", bass: gallop("D2", "A2") },
    F: { voicing: "[F3 A3 C4]", bass: gallop("F1", "C2") },
    Dm7: { voicing: "[F3 A3 C4 D4]", bass: gallop("D2", "A1") },
    Bb: { voicing: "[F3 Bb3 D4]", bass: gallop("Bb1", "F2") },
    G7sus: { voicing: "[F3 G3 C4 D4]" }, G7: { voicing: "[F3 B3 D4 G4]" },
    // the finish
    CC: { voicing: "[E3 G3 C4 E4 G4]", bass: `C2:${T(4)} C2:${T(1)} G1:${T(1)}` },
    E: { voicing: "[E3 G#3 B3 E4]" }, Am2: { voicing: "[E3 A3 C4 E4]" },
    FF: { voicing: "[F3 A3 C4 F4]" }, GG: { voicing: "[G3 B3 D4 G4]" },
    Cend: { voicing: "[C3 G3 C4 E4 G4 C5]", bass: "C2:2" },
  },
  motifs: {
    fanA: `r:${T(1)} G3:${T(1)} C4:${T(1)} G4:${T(2)} F4:${T(1)}`,
    fanB: `E4:${T(1)} F4:${T(1)} G4:${T(1)} A4:1`,
    fanA2: `r:${T(1)} G3:${T(1)} C4:${T(1)} G4:${T(2)} A4:${T(1)}`,
    fanQ: `B4:${T(1)} A4:${T(1)} B4:${T(1)} D5:1`,
    // hook: the answer, landing home
    hk2: `F#4:${T(1)} G4:${T(1)} A4:${T(1)} D5:1`,
    hk3: `C5:${T(2)} A4:${T(1)} B4:${T(2)} G4:${T(1)}`,
    home: `C5:${T(5)} r:${T(1)}`,
    // bridge: the rising cell tossed between brass and flute
    brA: `r:${T(1)} E3:${T(1)} A3:${T(1)} E4:1`,
    brC: `r:${T(1)} F3:${T(1)} A3:${T(1)} D4:${T(2)} C4:${T(1)}`,
    flB: `r:${T(1)} C5:${T(1)} F5:${T(1)} C6:1`,
    flD: `r:${T(1)} D5:${T(1)} F5:${T(1)} Bb5:1`,
    // climb
    cl1: `G3:${T(1)} C4:${T(1)} D4:${T(1)} G3:${T(1)} C4:${T(1)} D4:${T(1)}`,
    cl2: `B3:${T(1)} D4:${T(1)} F4:${T(1)} G4:1`,
    // the finish in D: the fanfare augmented
    fin1: `G3:${T(2)} C4:${T(2)} G4:${T(2)}`,
    fin2: `G#4:${T(2)} B4:${T(1)} C5:1`,
    fin3: `A4:${T(2)} C5:${T(1)} B4:${T(2)} D5:${T(1)}`,
    fin4: `C5:${T(5)} r:${T(1)}`,
    // flute counter: bright running 8ths answering the brass long notes
    fl1: `r:1 E5:${T(1)} D5:${T(1)} C5:${T(1)}`, fl2: `r:1 A5:${T(1)} G5:${T(1)} E5:${T(1)}`,
    fl3: `r:1 D6:${T(1)} C#6:${T(1)} A5:${T(1)}`, fl4: `r:1 A5:${T(1)} G#5:${T(1)} E5:${T(1)}`
    , fl5: `r:1 C6:${T(1)} B5:${T(1)} G5:${T(1)}`,
  },
  grooves: {
    main: { kick: [`C4:${T(2)} r:${T(4)}`], snare: [`r:${T(5)} C4:${T(1)}@0.6`], hat: [H], perc: timp },
    build: { family: "build", density: 0.7 },
    lift: { kick: [`C4:1 C4:1`], snare: [`r:1 C4:${T(2)} C4:${T(1)}@0.6`], hat: [H], perc: timp },
    roll: { kick: [`C4:2`], perc: [Array.from({ length: 12 }, (_, i) => `C2:${T(0.5)}@${(0.35 + i * 0.05).toFixed(2)}`).join(" ")] },
  },
  sections: [
    { kind: "intro", bars: 2, harmony: ["C", "F_C"], chordVel: 0.7, arp: [ost("C4", "E4", "G4"), ost("C4", "F4", "A4")] },
    { kind: "verse", bars: 4, harmony: ["C", "F_C", "Am", "G"], lead: ["fanA", "fanB", "fanA2", "fanQ"],
      arp: [ost("C4", "E4", "G4"), ost("C4", "F4", "A4"), ost("A3", "C4", "E4"), ost("G3", "B3", "D4")], energy: 0.5 },
    { kind: "hook", bars: 4, harmony: ["C", "D", "F G", "C"], bass: [gallop("C2", "G2"), gallop("D2", "A2"), `F1:1 G1:1`, gallop("C2", "G2")],
      lead: ["fanA", "hk2", "hk3", "home"], counter: ["fl1", "fl3", "r:2", "fl2"],
      arp: [ost("C4", "E4", "G4"), ost("D4", "F#4", "A4"), `F4:${T(1)} A4:${T(1)} C5:${T(1)} G4:${T(1)} B4:${T(1)} D5:${T(1)}`, ost("C4", "E4", "G4")], energy: 0.7 },
    { kind: "bridge", bars: 4, harmony: ["Am", "F", "Dm7", "Bb"], lead: ["brA", "r:2", "brC", "r:2"], counter: ["r:2", "flB", "r:2", "flD"],
      arp: [ost("A3", "C4", "E4"), ost("F3", "A3", "C4"), ost("D4", "F4", "A4"), ost("D4", "F4", "Bb4")], energy: 0.5, chordVel: 0.85 },
    { kind: "build", bars: 2, harmony: ["G7sus", "G7"], bass: [`G1:${T(1)} G1:${T(1)} G1:${T(1)} G1:${T(1)} G1:${T(1)} G1:${T(1)}`, `G1:${T(1)} G1:${T(1)} G1:${T(1)} G1:${T(1)} B1:${T(1)} D2:${T(1)}`],
      lead: ["cl1", "cl2"], arp: [ost("C4", "D4", "G4"), ost("B3", "D4", "F4")], energy: 0.9 },
    { kind: "drop", bars: 3, groove: "lift", harmony: ["CC", "E Am2", "FF GG"], bass: [`C2:${T(4)} C2:${T(1)} G1:${T(1)}`, `E1:1 A1:1`, `F1:1 G1:1`],
      lead: ["fin1", "fin2", "fin3"], counter: ["fl5", "fl4", "r:2"],
      arp: [ost("C4", "E4", "G4"), `E4:${T(1)} G#4:${T(1)} B4:${T(1)} E4:${T(1)} A4:${T(1)} C5:${T(1)}`, `F4:${T(1)} A4:${T(1)} C5:${T(1)} G4:${T(1)} B4:${T(1)} D5:${T(1)}`], energy: 1 },
    { kind: "outro", bars: 1, groove: "roll", harmony: ["Cend"], lead: ["fin4"] },
  ],
});

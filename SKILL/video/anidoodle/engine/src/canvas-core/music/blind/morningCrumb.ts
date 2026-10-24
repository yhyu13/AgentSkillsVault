// MORNING CRUMB: a 40 s seamless loop for a small bakery. playful vocabulary, playful mood,
// F major, 4/4 shuffle at 120 bpm: 20 bars x 2 s = exactly 40 s. Marimba hook, fingerpicked
// guitar, tuba oom-pah, celesta crumbs answering. A bVI surprise in the bridge, then a
// turnaround whose C7 falls back into bar 1.
import type { Material } from "../compose";

// Chord tones (low to high) for the guitar picking, per chord name.
const T: Record<string, string[]> = {
  F6: ["F3", "C4", "A3", "D4"], Am7: ["A3", "E4", "C4", "G4"], D7: ["D3", "C4", "F#3", "A3"],
  Gm7: ["G3", "D4", "Bb3", "F4"], Bb6: ["Bb2", "F3", "D4", "G3"], C7: ["C3", "G3", "E4", "Bb3"],
  Db: ["Db3", "Ab3", "F4", "C4"], Bdim: ["B2", "F3", "D4", "Ab3"], Dm7: ["D3", "A3", "F4", "C4"],
};
// a bar of picking: bass-note on the beat, a two-note pinch on the swung upbeat; halves for split bars
const half = (c: string) => { const t = T[c]; return `${t[0]}:.5 [${t[2]} ${t[3]}]:.5@0.8 ${t[1]}:.5 [${t[2]} ${t[3]}]:.5@0.7`; };
const pick = (bar: string) => { const cs = bar.split(" "); return cs.length === 1 ? `${half(cs[0])} ${half(cs[0])}` : `${half(cs[0])} ${half(cs[1])}`; };
const picks = (bars: string[]) => bars.map(pick);
// tuba: oom-pah, root and fifth, a walk-up pickup where the next chord moves
const R: Record<string, [string, string]> = {
  F6: ["F2", "C2"], Am7: ["A1", "E2"], D7: ["D2", "A1"], Gm7: ["G1", "D2"], Bb6: ["Bb1", "F2"],
  C7: ["C2", "G1"], Db: ["Db2", "Ab1"], Bdim: ["B1", "F2"], Dm7: ["D2", "A1"],
};
const tuba = (bar: string) => { const cs = bar.split(" "); if (cs.length === 2) return `${R[cs[0]][0]}:1 ${R[cs[0]][1]}:1 ${R[cs[1]][0]}:1 ${R[cs[1]][1]}:1`; const [r, f] = R[cs[0]]; return `${r}:1 ${f}:1 ${r}:1 ${f}:.5 ${f}:.5@0.6`; };
const tubas = (bars: string[]) => bars.map(tuba);

const A = ["F6", "Am7 D7", "Gm7", "Bb6 C7"];
const A2 = ["F6", "Am7 D7", "Gm7 C7", "F6"];
const BR = ["Db", "C7", "Bb6", "Bdim"];
const TA = ["F6", "Dm7", "Gm7 C7", "Gm7 C7"];

export const morningCrumb = (): Material => ({
  style: "playful", title: "Morning Crumb", seed: 2207, mood: "playful",
  bpm: 120, key: "F", mode: "major", meter: "4/4", swing: 0.58, loop: true,
  levels: { counter: -6.3, chords: -2, lead: -0.5, bass: 2.1, kick: 0.4, snare: 0.5, arp: -0.6 } /* sound v2: re-balanced so every stem sits where the composer put it against its target (the notes are untouched); written for v1 as counter: 7, chords: -6. Since 0.6 the guitar arp and the tuba are calibrated to their targets (own voice: gainDb is an offset; alternate: trimmed): arp 8 + 4.6 -> -0.6, bass 0.4 -> 2.1 keep both where they were */,
  moodControls: { energy: 0.45, warmth: 0.75, brightness: 0.45, tension: 0.2, space: 0.35 },
  voices: { arp: { inst: "guitar", role: "accomp" }, bass: "tuba" },
  chords: {
    F6: { voicing: "[A3 C4 D4 F4]" }, Am7: { voicing: "[G3 C4 E4]" }, D7: { voicing: "[F#3 C4 D4]" },
    Gm7: { voicing: "[F3 Bb3 D4]" }, Bb6: { voicing: "[F3 G3 Bb3 D4]" }, C7: { voicing: "[E3 G3 Bb3]" },
    Db: { voicing: "[F3 Ab3 C4]" }, Bdim: { voicing: "[F3 Ab3 D4]" }, Dm7: { voicing: "[F3 A3 C4]" },
  },
  motifs: {
    // the crumb: an upbeat pickup, a hop up a 4th, a staccato repeat, a zig-zag, then a gap
    crumb: "r:.5 C5:.5 F5:.5 F5:.25 r:.25 E5:.5 G5:.5 r:1",
    crumbUp: "r:.5 D5:.5 G5:.5 G5:.25 r:.25 F5:.5 A5:.5 r:1",
    tumble: "A5:.5 G5:.5 E5:1 F#5:.5 A5:.5 r:1",
    askEnd: "Bb5:.5 A5:.5 G5:1 E5:.5 G5:.5 C6:.5 r:.5",
    tumble2: "A5:.5 C6:.5 B5:.5 A5:.5 F#5:1 r:1",
    walkDown: "r:.5 Bb5:.5 A5:.5 G5:.5 E5:.5 C5:.5 D5:.5 E5:.5",
    homeHop: "F5:1.5 r:.5 C5:.25 r:.25 F4:.5 r:1",
    // bridge: the crumb on the bVI, then a comic stop
    crumbDb: "r:.5 Ab4:.5 Db5:.5 Db5:.25 r:.25 C5:.5 Eb5:.5 r:1",
    stop: "E5:.5 G5:.5 Bb5:1 r:2",
    crumbBb: "r:.5 F5:.5 Bb5:.5 Bb5:.25 r:.25 A5:.5 C6:.5 r:1",
    slide: "D6:.5 B5:.5 Ab5:.5 F5:.5 D5:.5 r:1.5",
    // turnaround
    bite: "A5:.5 F5:.5 D5:1 r:2",
    climb: "r:.5 Bb4:.5 D5:.5 F5:.5 E5:.5 G5:.5 Bb5:.5 r:.5",
    shrug: "A5:.25 Bb5:.25 A5:.5 G5:.5 E5:.5 r:2",
    // celesta crumbs answering in the gaps
    c1: "r:3 G6:.25 F6:.25 C6:.5", c2: "r:3 A6:.25 G6:.25 D6:.5", c3: "r:3.5 C7:.25 A6:.25",
  },
  grooves: { main: { family: "shuffle", density: 0.45, variation: 0.35, fill: true } },
  sections: [
    { kind: "verse", bars: 4, harmony: A, bass: tubas(A), arp: picks(A), energy: 0.35,
      lead: ["crumb", "r:4", "crumbUp", "r:4"], counter: ["r:4", "c1", "r:4", "c2"] },
    { kind: "hook", bars: 4, harmony: A, bass: tubas(A), arp: picks(A), energy: 0.55,
      lead: ["crumb", "tumble", "crumbUp", "askEnd"] },
    { kind: "hook", bars: 4, harmony: A2, bass: tubas(A2), arp: picks(A2), energy: 0.6,
      lead: ["crumb", "tumble2", "walkDown", "homeHop"], counter: ["c1", "r:4", "c3", "r:4"] },
    { kind: "bridge", bars: 4, harmony: BR, bass: tubas(BR), arp: picks(BR), energy: 0.4, chordVel: 0.9,
      lead: ["crumbDb", "stop", "crumbBb", "slide"] },
    { kind: "groove", bars: 4, harmony: TA, bass: tubas(TA), arp: picks(TA), energy: 0.5,
      lead: ["crumb", "bite", "climb", "shrug"], counter: ["r:4", "c2", "r:4", "c3"] },
  ],
});

// CHEETAH, RUN: the score. Nine bars of 12/8 at 80 bpm, exactly the film's 27 s, written to loop.
// One idea held all the way through: a G drone, the G major pentatonic, one marimba cell that grows,
// and a hand-percussion cycle that comes in under it, fills for the run and thins away again. It
// draws on East African mallet and lyre music for its shape (a drone, a cycling pattern, a melody
// that returns to the drone note); every note here is written for this film.
// The cell: up from the fifth through the sixth to the tonic, D E G. The 12/8 lilt never changes, so
// the run is the same music at full strength, not a different piece: her stride is 15 frames, a
// quarter note here, six to the bar across the bar's four beats.
// BARS [film]: 1 the drone and the cell, alone [night, the sun] · 2-3 the cell answers itself, the
// drums begin [the face makes itself, alive] · 4 one long note over a harp sweep [the turn, the bow] ·
// 5 the drone steps to E, two beats held, then a run of eighths up [she gathers; she goes at 405] ·
// 6 the cell in her stride, the highest note, full drums [at speed] · 7 three strides and everything
// stops [forefeet braced at 575] · 8-9 the cell comes home, the drone turns back [she stands, the
// turn back, into the eye], and round again.
import { type Piece } from "../plan";
import { composePiece, type Material } from "../compose";

const SHAKE = "C4:1/3@.8 C4:1/3@.3 C4:1/3@.5 C4:1/3@.65 C4:1/3@.3 C4:1/3@.5 C4:1/3@.8 C4:1/3@.3 C4:1/3@.5 C4:1/3@.65 C4:1/3@.3 C4:1/3@.5";
export const cheetahRunMaterial = (): Material => ({
  style: "world", title: "Cheetah, run", seed: 5521, mood: "joy", bpm: 80, key: "G", mode: "majorPentatonic", meter: "12/8", loop: true, tail: 1.2,
  voices: { lead: "marimba" }, levels: { lead: 4, counter: -5, kick: -4.5, ghost: -6, perc: 8, chords: -3 }, moodControls: { energy: 0.5, warmth: 0.5, brightness: 0.68, tension: 0.4, space: 0.5 },
  chords: {
    G: { voicing: "[G2 D3 G3]", bass: "G1:4" },
    E: { voicing: "[E2 B2 E3]", bass: "E1:4" },
    D: { voicing: "[D3 A3 D4]", bass: "D2:4" },
  },
  motifs: {
    call: "r:2 D5:1/3 E5:1/3 G5:4/3",
    answer: "E5:1/3 D5:1/3 B4:1/3 D5:1 r:1 D5:1/3 E5:1/3 G5:1/3",
    alive: "A5:2/3 G5:1/3 E5:1 D5:1/3 E5:1/3 G5:1/3 D5:1",
    stretch: "E5:1/3 G5:1/3 A5:7/3 G5:1",
    gather: "r:2 B4:1/3 D5:1/3 E5:1/3 G5:1/3 A5:1/3 B5:1/3",
    stride: "D6:2/3@.82 B5:2/3 A5:2/3 G5:2/3 A5:2/3 B5:2/3",
    brace: "D6:2/3@.82 B5:2/3 G5:2/3 r:2",
    stand: "r:1 D5:1/3 E5:1/3 G5:1/3 E5:1 D5:1",
    home: "r:1 B4:1/3 D5:1/3 E5:1/3 D5:2",
    rest: "r:4",
    echo: "r:3 G4:1/3 D5:1/3 G5:1/3",
    sweep: "G3:1/3 D4:1/3 G4:1/3 B4:1/3 D5:1/3 G5:1/3 r:2",
    roll: "G4:1/3 D5:1/3 G5:1/3 D5:1/3 B4:1/3 D5:1/3 G4:1/3 D5:1/3 G5:1/3 D5:1/3 B4:1/3 D5:1/3",
    rollStop: "G4:1/3 D5:1/3 G5:1/3 D5:1/3 r:8/3",
    settle: "r:2 [G4 D5]:2",
  },
  grooves: {
    // the cycle: a low stroke on one and a lighter one on three, a rim answer, a shaker on the lilt
    cycle: { kick: ["G2:2 G2:1@.6 r:1"], ghost: ["r:1 C4:1/3@.5 r:2/3 r:1 C4:1/3@.5 r:2/3"], perc: ["C4:1/3@.6 r:1/3 C4:1/3@.35 C4:1/3@.5 r:1/3 C4:1/3@.35 C4:1/3@.6 r:1/3 C4:1/3@.35 C4:1/3@.5 r:1/3 C4:1/3@.35"] },
    thin: { kick: ["G2:2 r:2"], perc: ["C4:1/3@.5 r:2/3 r:1 C4:1/3@.4 r:2/3 r:1"] },
    launch: { kick: ["r:2 G2:1 G2:1@.75"], ghost: ["r:2 C4:2/3 C4:2/3@.7 C4:2/3"], perc: ["r:2 C4:1/3@.8 C4:1/3@.3 C4:1/3@.5 C4:1/3@.65 C4:1/3@.3 C4:1/3@.5"] },
    gallop: { kick: ["G2:1 G2:1@.75 G2:1 G2:1@.75", "G2:1 G2:1/3@.75 r:8/3"], ghost: ["C4:2/3 C4:2/3@.7 C4:2/3 C4:2/3@.7 C4:2/3 C4:2/3@.7", "C4:2/3 C4:2/3@.7 r:8/3"], perc: [SHAKE, "C4:1/3@.8 C4:1/3@.3 C4:1/3@.5 C4:1/3@.65 r:8/3"] },
  },
  sections: [
    { kind: "intro", bars: 1, harmony: ["G"], lead: ["call"], energy: 0.35 },
    { kind: "verse", bars: 3, harmony: ["G", "~", "~"], lead: ["answer", "alive", "stretch"], counter: ["rest", "echo", "sweep"], groove: "cycle", energy: 0.45 },
    { kind: "build", bars: 1, harmony: ["E"], lead: ["gather"], groove: "launch", energy: 0.6 },
    { kind: "drop", bars: 2, harmony: ["G", "~"], lead: ["stride", "brace"], counter: ["roll", "rollStop"], groove: "gallop", energy: 0.9 },
    { kind: "breath", bars: 2, harmony: ["G", "D"], lead: ["stand", "home"], counter: ["settle", "rest"], groove: "thin", energy: 0.35 },
  ],
});
export const cheetahRunScore = (): Piece => composePiece(cheetahRunMaterial());
// The signed cut: the same nine bars played once, then a tenth that closes them. The cell one last
// time, landing on the tonic and held, over a rolled harp chord and one soft low stroke; no cycle.
// The ending takes away: it is the quietest bar of the piece, and it is left to ring.
export const cheetahRunSignedMaterial = (): Material => {
  const m = cheetahRunMaterial();
  return { ...m, title: "Cheetah, run (signed)", loop: false, tail: 2.2,
    motifs: { ...m.motifs, sign: "r:1 D5:1/3@.6 E5:1/3@.65 G5:7/3@.7", signHarp: "G3:1/3@.5 D4:1/3@.5 G4:1/3@.55 r:1 [G4 D5]:2@.5" },
    grooves: { ...m.grooves, last: { kick: ["G2:4@.5"] } },
    sections: [...m.sections, { kind: "outro", bars: 1, harmony: ["G"], lead: ["sign"], counter: ["signHarp"], groove: "last", energy: 0.25 }] };
};
export const cheetahRunSignedScore = (): Piece => composePiece(cheetahRunSignedMaterial());

// CRAFT TESTS (music/craft.ts): every metric on a small good example and a small bad one, so a
// threshold that drifts or a metric that stops seeing is caught with no render and no human.
import { craftReport, contourClass, classifyCadence, syncopation, metricWeight, development, type Finding } from "../src/canvas-core/music/craft";
import { line, type Piece, type Part, type Role, type InstId, type Meter, type Note } from "../src/canvas-core/music/plan";
import type { StyleId, MoodId } from "../src/canvas-core/music/tables";
import type { ModeId } from "../src/canvas-core/music/theory";
import { DEMOS, FIXTURES, composePiece, type Material } from "../src/canvas-core/music/index";
import { breach } from "../src/canvas-core/music/blind/breach";
import { stillwater } from "../src/canvas-core/music/blind/stillwater";
import { morningCrumb } from "../src/canvas-core/music/blind/morningCrumb";
import { skywardKids } from "../src/canvas-core/music/blind/skywardKids";

type P = { id: string; inst: InstId; role: Role; src: string };
const piece = (o: { style?: StyleId; mood?: MoodId; key?: string; mode?: ModeId; meter?: Meter; tempo?: number; bars: number; parts: P[]; harmony?: [number, string][]; sections?: [string, number][]; loop?: boolean }): Piece => {
  const meter = o.meter ?? "4/4", bpb = meter === "3/4" ? 3 : meter === "6/8" ? 2 : 4;
  const parts: Part[] = o.parts.map((x) => ({ id: x.id, inst: x.inst, role: x.role, notes: line(0, x.src, { role: x.role, bpb }) }));
  let from = 0; const arrangement = (o.sections ?? [["a", o.bars]]).map(([id, bars]) => { const a = { id, kind: id, from, bars }; from += bars; return a; });
  return { title: "t", seed: 1, tail: 1, parts, harmony: (o.harmony ?? [[0, "I"]]).map(([t, name]) => ({ t, name })), arrangement,
    plan: { style: o.style ?? "folk", tempo: o.tempo ?? 90, meter, loop: o.loop, sections: [{ id: "a", bars: o.bars, mood: o.mood ?? "calm", key: o.key ?? "C", mode: o.mode ?? "major", melody: ["stepwise"], dyn: [0.6, 0.6] }] } };
};
const has = (fs: Finding[], area: string, re: RegExp, level?: Finding["level"]) => fs.some((f) => f.area === area && re.test(f.msg) && (!level || f.level === level));
const n = (p: number, t: number): Note => ({ p, t, d: 1, v: 0.7, role: "melody" });

export const name = "craft (melody, harmony, rhythm, tension, mood metrics)";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const C = "[C3 E3 G3]:4", G = "[B2 D3 G3]:4", F = "[A2 C3 F3]:4";
  const bassC = "C2:4", bassG = "G1:4", bassF = "F1:4";

  // ---------------- melody: contour classes (Huron 1996)
  ok(contourClass([n(60, 0), n(64, 1), n(67, 2), n(64, 3), n(60, 4)]) === "arch", "contour: C E G E C is an arch");
  ok(contourClass([n(67, 0), n(65, 1), n(64, 2), n(62, 3), n(60, 4)]) === "descending", "contour: G F E D C descends");
  ok(contourClass([n(60, 0), n(60, 1), n(61, 2), n(60, 3)]) === "level", "contour: a line within a semitone is level");

  // ---------------- melody: leap recovery
  const leapy = piece({ bars: 4, harmony: [[0, "C"], [4, "G"], [8, "C"], [12, "G"]], parts: [
    { id: "lead", inst: "piano", role: "melody", src: "C4:1 A4:1 D5:1 G5:1 | C4:1 A4:1 D5:1 G5:1 | C4:1 A4:1 D5:1 G5:1 | C4:1 A4:1 D5:1 G5:1" },
    { id: "chords", inst: "piano", role: "accomp", src: [C, G, C, G].join(" | ") }, { id: "bass", inst: "bass", role: "bass", src: [bassC, bassG, bassC, bassG].join(" | ") }] });
  const recovered = piece({ bars: 4, harmony: [[0, "C"], [4, "G"], [8, "C"], [12, "G"]], parts: [
    { id: "lead", inst: "piano", role: "melody", src: "C4:1 A4:1 G4:1 F4:1 | E4:1 C5:1 B4:1 A4:1 | G4:1 E5:1 D5:1 C5:1 | B4:2 G4:2" },
    { id: "chords", inst: "piano", role: "accomp", src: [C, G, C, G].join(" | ") }, { id: "bass", inst: "bass", role: "bass", src: [bassC, bassG, bassC, bassG].join(" | ") }] });
  const rl = craftReport(leapy), rr = craftReport(recovered);
  ok(has(rl.findings, "melody", /leaps/, "warn"), `leaps that keep climbing warn (${rl.melody.leaps} leaps, ${rl.melody.leapsRecovered} turned back)`);
  ok(!has(rr.findings, "melody", /leaps/) && rr.melody.leapsRecovered === rr.melody.leaps, "leaps filled in by step pass");
  ok(rr.melody.stepShare > rl.melody.stepShare, `step share: stepwise line ${rr.melody.stepShare.toFixed(2)} > leapy line ${rl.melody.stepShare.toFixed(2)}`);
  // arpeggio idiom exemption: the same climb is a note, not a warning, in chiptune
  ok(has(craftReport({ ...leapy, plan: { ...leapy.plan, style: "chiptune" } }).findings, "melody", /leaps/, "info"), "arpeggio idioms (chiptune) get a note, not a warning");

  // ---------------- melody: motif development (Schoenberg: repetition, sequence, variation)
  ok(development([n(60, 0), n(62, 1), n(64, 2)], [[n(60, 0), n(62, 1), n(64, 2)]]) === "exact", "development: the same cell is exact");
  ok(development([n(62, 0), n(64, 1), n(66, 2)], [[n(60, 0), n(62, 1), n(64, 2)]]) === "sequence", "development: the cell a step up is a sequence");
  ok(development([n(62, 0), n(59, 1), n(64, 2)], [[n(60, 0), n(62, 1), n(64, 2)]]) === "varied", "development: same rhythm, new intervals is varied");
  ok(development([n(62, 0), n(59, 0.5), n(71, 2.5)], [[n(60, 0), n(62, 1), n(64, 2)]]) === "new", "development: new rhythm and intervals is new");
  const motif = "E4:.5 G4:.5 A4:1 r:2", seqd = piece({ bars: 4, parts: [{ id: "lead", inst: "piano", role: "melody", src: [motif, "F4:.5 A4:.5 B4:1 r:2", "G4:.5 B4:.5 C5:1 r:2", "E4:.5 G4:.5 C5:1 r:2"].join(" | ") }] });
  const random = piece({ bars: 4, parts: [{ id: "lead", inst: "piano", role: "melody", src: ["E4:1.5 D5:.5 r:2", "B3:.25 G4:.25 F4:2.5 r:1", "C5:1 A3:1 r:2", "F4:.75 E5:.25 G5:.5 r:2.5"].join(" | ") }] });
  const same = piece({ bars: 5, parts: [{ id: "lead", inst: "piano", role: "melody", src: Array(5).fill(motif).join(" | ") }] });
  ok(craftReport(seqd).melody.repetition >= 0.66 && !has(craftReport(seqd).findings, "melody", /bring back|exact copies/), `a developed motif returns (${craftReport(seqd).melody.repetition.toFixed(2)}) without a warning`);
  ok(has(craftReport(random).findings, "melody", /bring back/), "a line where nothing returns warns");
  ok(has(craftReport(same).findings, "melody", /exact copies/), "a photocopied motif warns");

  // ---------------- melody: phrase endings, strong beats, climax
  const ends = (last: string) => piece({ bars: 4, harmony: [[0, "C"], [4, "G"], [8, "F"], [12, "C"]], parts: [
    { id: "lead", inst: "piano", role: "melody", src: `E4:1 F4:1 G4:1 r:1 | D4:1 C4:1 B3:1 r:1 | C4:1 A3:1 ${last}:1 r:1 | ${last}:1 D4:1 ${last}:1 r:1` },
    { id: "chords", inst: "piano", role: "accomp", src: [C, G, F, C].join(" | ") }, { id: "bass", inst: "bass", role: "bass", src: [bassC, bassG, bassF, bassC].join(" | ") }] });
  ok(craftReport(ends("C4")).melody.stableEnds === 1, "phrases ending on chord tones: 100 %");
  ok(craftReport(ends("B3")).melody.stableEnds < 0.6 && has(craftReport(ends("B3")).findings, "melody", /end on a chord tone/), "phrases ending off the chord warn");
  ok(has(craftReport(ends("B3")).findings, "melody", /last note/), "a last note off the home triad is named");
  const peak = (early: boolean) => piece({ bars: 8, parts: [{ id: "lead", inst: "piano", role: "melody", src: Array.from({ length: 8 }, (_, i) => (i === (early ? 0 : 5) ? "C4:.5 D4:.5 E4:.5 A5:.5 G4:1 F4:1" : "C4:.5 D4:.5 E4:.5 F4:.5 E4:1 D4:1")).join(" | ") }] });
  ok(has(craftReport(peak(true)).findings, "melody", /peaks/), "the climax in the first bar warns");
  ok(!has(craftReport(peak(false)).findings, "melody", /peaks/) && Math.abs(craftReport(peak(false)).melody.climax!.at - 0.72) < 0.1, `the climax at ${Math.round(craftReport(peak(false)).melody.climax!.at * 100)} % passes`);

  // ---------------- range per instrument
  const vib = (src: string) => craftReport(piece({ bars: 1, parts: [{ id: "chords", inst: "vibes", role: "accomp", src }] })).findings;
  ok(has(vib("[C3 E3 G3]:4"), "range", /outside what/, "error"), "vibes at C3 (5 st below F3) is an error");
  ok(has(vib("[E3 A3 C4]:4"), "range", /outside what/, "warn"), "vibes at E3 (1 st below) is a warning: extended models exist");
  ok(!vib("[A3 C4 E4]:4").some((f) => f.area === "range"), "vibes in range: no range finding");
  ok(!craftReport(piece({ bars: 1, parts: [{ id: "bass", inst: "bass", role: "bass", src: "E1:4" }] })).findings.some((f) => f.area === "range"), "a bass on E1 is its home, not out of range");

  // ---------------- harmony: cadences
  ok(classifyCadence(7, 0) === "authentic" && classifyCadence(5, 0) === "plagal" && classifyCadence(10, 0) === "modal", "cadences: V-I authentic, IV-I plagal, bVII-I modal");
  ok(classifyCadence(0, 7) === "half" && classifyCadence(7, 9) === "deceptive", "cadences: ending on V is half, V-vi deceptive");
  const endOn = (fin: [string, string]) => piece({ bars: 4, sections: [["a", 2], ["b", 2]], harmony: [[0, "C"], [4, "F"], [8, "G"], [12, fin[0]]], parts: [
    { id: "chords", inst: "piano", role: "accomp", src: [C, F, G, fin[1]].join(" | ") }, { id: "bass", inst: "bass", role: "bass", src: [bassC, bassF, bassG, fin[0] === "C" ? bassC : bassG].join(" | ") },
    { id: "lead", inst: "piano", role: "melody", src: "E4:4 | F4:4 | D4:4 | C4:4" }] });
  const home = craftReport(endOn(["C", C])), away = craftReport(endOn(["G", G]));
  ok(home.harmony.cadences.at(-1)!.type === "authentic" && !has(home.findings, "harmony", /ends/), "a piece ending V-I is home");
  ok(has(away.findings, "harmony", /ends half/, "warn"), "a piece ending on V warns (away from home)");
  ok(has(craftReport({ ...endOn(["G", G]), plan: { ...endOn(["G", G]).plan, style: "suspense" } }).findings, "harmony", /ends/, "info"), "suspense may end open (a note, not a warning)");

  // ---------------- harmony: voice leading (parallels, doublings, style-aware)
  const pv = (style: StyleId, b: string) => craftReport(piece({ style, bars: 2, harmony: [[0, "C"], [4, "D"]], parts: [{ id: "chords", inst: "choir", role: "accomp", src: `[C4 G4 E5]:4 | ${b}:4` }] })).findings;
  ok(has(pv("choral", "[D4 A4 F5]"), "harmony", /parallel/, "warn"), "choral: parallel 5ths C-G to D-A warn");
  ok(!has(pv("choral", "[B3 G4 D5]"), "harmony", /parallel/), "choral: contrary/oblique motion passes");
  ok(has(pv("rock", "[D4 A4 F5]"), "harmony", /parallel/, "info"), "rock: the same fifths are the idiom (a note)");
  const dbl = craftReport(piece({ style: "orchestral", bars: 2, parts: [{ id: "chords", inst: "strings", role: "accomp", src: "[E3 G3 C4 E4]:4 | [F3 A3 C4 F4]:4" }] }));
  ok(dbl.harmony.parallels === 0 && dbl.harmony.octaveDoublings === 1, "orchestral: an octave-doubled voice moving is doubling, not a parallel");
  ok(craftReport(piece({ bars: 2, parts: [{ id: "chords", inst: "piano", role: "accomp", src: "[C4 E4 G4]:4 | [C5 E5 G5]:4" }] })).harmony.meanMotion > craftReport(piece({ bars: 2, parts: [{ id: "chords", inst: "piano", role: "accomp", src: "[C4 E4 G4]:4 | [C4 F4 A4]:4" }] })).harmony.meanMotion, "voice motion: a leap of the whole chord moves more than an inversion");

  // ---------------- harmony: mud (low interval limits)
  const mud = (src: string) => craftReport(piece({ bars: 1, parts: [{ id: "chords", inst: "piano", role: "accomp", src }] })).harmony.mud.length;
  ok(mud("[C2 E2 G2]:4") > 0, "a close C2-E2 third is mud");
  ok(mud("[C2 G2 E3]:4") === 0, "the same chord spread (C2 G2 E3) is clear");
  ok(mud("[C2 C3]:4") === 0, "octaves are never mud");

  // ---------------- harmony: the melody under the chords
  ok(has(craftReport(piece({ bars: 2, parts: [{ id: "chords", inst: "piano", role: "accomp", src: "[C4 E4 G4 C5]:4 | [C4 E4 G4 C5]:4" }, { id: "lead", inst: "piano", role: "melody", src: "E4:1 F4:1 G4:1 A4:1 | G4:1 F4:1 E4:1 D4:1" }] })).findings, "harmony", /under/), "a melody buried under the chord voicing warns");

  // ---------------- rhythm: metric weights, syncopation
  ok(metricWeight(0, 4, false) === 4 && metricWeight(2, 4, false) === 3 && metricWeight(1, 4, false) === 2 && metricWeight(0.5, 4, false) === 1 && metricWeight(0.25, 4, false) === 0, "metric weights 4/4: downbeat 4, mid-bar 3, beat 2, 8th 1, 16th 0");
  ok(metricWeight(1 / 3, 2, true) === 1 && metricWeight(1, 2, true) === 2, "metric weights 6/8: dotted-quarter beats 2, eighths 1");
  ok(syncopation([0, 1, 2, 3, 4], 4, false).index === 0, "syncopation: quarter notes on the beat = 0");
  ok(syncopation([0, 1.5, 3, 4], 4, false).index > 0 && syncopation([0, 1.5, 3, 4], 4, false).share > 0.3, "syncopation: an 'and of 2' held over beat 3 counts");
  const groove = (kick: string) => craftReport(piece({ style: "hipHop", bars: 4, parts: [{ id: "kick", inst: "kick", role: "drum", src: kick }, { id: "bass", inst: "bass", role: "bass", src: "C2:4 | C2:4 | C2:4 | C2:4" }, { id: "lead", inst: "piano", role: "melody", src: "C4:4 | D4:4 | E4:4 | C4:4" }] }));
  ok(has(groove("C4:1 C4:1 C4:1 C4:1 | C4:1 C4:1 C4:1 C4:1 | C4:1 C4:1 C4:1 C4:1 | C4:1 C4:1 C4:1 C4:1").findings, "rhythm", /no syncopation/), "hip-hop with every hit on the beat: no syncopation warns");
  ok(!has(groove("C4:1.5 C4:.5 r:2 | C4:1.5 C4:1 C4:1.5 | C4:1.5 C4:.5 r:2 | C4:1.5 C4:1 C4:1.5").findings, "rhythm", /no syncopation/), "an anticipated kick grooves");
  ok(has(groove("C4:4 | r:.75 C4:.25 C4:3 | C4:.5 C4:.5 C4:.5 C4:2.5 | r:3.5 C4:.5").findings, "rhythm", /changes almost every bar/), "a kick pattern that never repeats warns (groove consistency)");
  ok(has(craftReport(piece({ bars: 2, harmony: [[0.5, "C"], [2.5, "F"], [4.5, "G"], [6.5, "C"]], parts: [{ id: "chords", inst: "piano", role: "accomp", src: "r:.5 [C3 E3 G3]:2 [A2 C3 F3]:1.5 | r:.5 [B2 D3 G3]:2 [C3 E3 G3]:1.5" }] })).findings, "rhythm", /between beats/), "chord changes on off-beats warn");
  const rep = craftReport(piece({ bars: 8, sections: [["a", 4], ["b", 4]], parts: [{ id: "lead", inst: "piano", role: "melody", src: Array(8).fill("C4:1 E4:1 G4:1 E4:1").join(" | ") }] }));
  ok(rep.rhythm.repeatedSections.includes("b") && has(rep.findings, "rhythm", /note for note/), "a section repeating the previous note for note is dead air");

  // ---------------- tension: flat vs shaped
  const sec = (x: string) => Array(2).fill(x).join(" | ");
  const flat = craftReport(piece({ bars: 6, sections: [["a", 2], ["b", 2], ["c", 2]], parts: [{ id: "lead", inst: "piano", role: "melody", src: [sec("C4:1 D4:1 E4:1 D4:1"), sec("C4:1 E4:1 D4:1 E4:1"), sec("D4:1 C4:1 E4:1 C4:1")].join(" | ") }, { id: "chords", inst: "piano", role: "accomp", src: Array(6).fill(C).join(" | ") }] }));
  ok(has(flat.findings, "tension", /flat/), `a piece with no arc warns (sections ${flat.tension.sections.map((s) => s.value).join(", ")})`);
  const arc = craftReport(piece({ bars: 6, sections: [["a", 2], ["b", 2], ["c", 2]], harmony: [[0, "C"], [8, "G"], [16, "C"]], parts: [
    { id: "lead", inst: "piano", role: "melody", src: [sec("C4:2 D4:2"), sec("G4:.5 A4:.5 B4:.5 C5:.5 D5:.5 E5:.5 F5:.5 G5:.5"), sec("E4:4")].join(" | ") },
    { id: "chords", inst: "piano", role: "accomp", src: [C, C, "[B2 D3 F3 G3]:4", "[B2 D3 F3 G3]:4", C, C].join(" | ") }, { id: "bass", inst: "bass", role: "bass", src: [bassC, bassC, "G1:.5 G1:.5 G1:.5 G1:.5 G1:.5 G1:.5 G1:.5 G1:.5", "G1:.5 G1:.5 G1:.5 G1:.5 G1:.5 G1:.5 G1:.5 G1:.5", bassC, bassC].join(" | ") }] }));
  ok(!arc.findings.some((f) => f.area === "tension") && arc.tension.sections[1].value > arc.tension.sections[0].value && arc.tension.sections[1].value > arc.tension.sections[2].value, `rise, peak, release (${arc.tension.sections.map((s) => s.value).join(" < > ")}) passes`);

  // intensity, not only harmony (Farbood 2012): a home-chord tutti climax and an EDM drop are the peak; the same sections thin and quiet are not
  const mat = (style: StyleId, mood: MoodId, secs: Material["sections"], extra: Partial<Material> = {}): Material => ({ style, title: "t", seed: 2, mood, bpm: style === "house" ? 124 : 76, key: "C", mode: "major", ...extra,
    chords: { I: { voicing: "[E3 G3 C4]", bass: "C2:4" }, vi: { voicing: "[E3 A3 C4]", bass: "A1:4" }, IV: { voicing: "[F3 A3 C4]", bass: "F1:4" }, V: { voicing: "[D3 G3 B3 F4]", bass: "G1:2 G1:2" }, Vb9: { voicing: "[D3 G3 B3 F4 Ab4]", bass: "G1:2 G1:2" }, Vsus: { voicing: "[D3 G3 C4 F4]", bass: "G1:.5 G1:.5 G1:.5 G1:.5 G1:.5 G1:.5 G1:.5 G1:.5" } },
    grooves: { main: { family: style === "house" ? "fourFloor" : "pulse", density: 0.5, variation: 0.3 }, build: { family: "build", density: 0.8, variation: 0.2 }, drop: { family: style === "house" ? "fourFloor" : "pulse", density: 0.95, variation: 0.3, fill: true } }, sections: secs });
  const climax = (tutti: boolean) => mat("cinematic", "hopeful", [
    { id: "intro", kind: "intro", bars: 2, harmony: ["I", "vi"], lead: "E4:4 | C4:4", chordVel: 0.6, energy: 0.3 },
    { id: "verse", kind: "verse", bars: 2, harmony: ["IV", "vi"], lead: "F4:2 A4:2 | G4:2 E4:2", groove: null, energy: 0.45 },
    { id: "lean", kind: "verse", bars: 2, harmony: ["Vb9", "Vb9"], lead: "G4:.5 A4:.5 B4:.5 D5:.5 F5:.5 D5:.5 B4:.5 D5:.5 | F5:.5 Ab5:.5 F5:.5 D5:.5 B4:.5 D5:.5 F5:1", bass: "G1:.5 G1:.5 G1:.5 G1:.5 G1:.5 G1:.5 G1:.5 G1:.5", groove: null, energy: 0.6 },
    tutti ? { id: "climax", kind: "swell", bars: 2, harmony: ["I", "I"], lead: "C6:1 B5:.5 G5:.5 E5:1 G5:1 | C6:2 G5:2", counter: "E5:2 G5:2 | E5:4", arp: "C4:.5 E4:.5 G4:.5 C5:.5 E5:.5 G5:.5 C6:.5 G5:.5 | C4:.5 E4:.5 G4:.5 C5:.5 E5:.5 G5:.5 C6:.5 G5:.5", chordVel: 1.1, energy: 0.95 }
      : { id: "climax", kind: "breath", bars: 2, harmony: ["I", "I"], lead: "C4:4 | r:4", chordVel: 0.4, energy: 0.2 },
    { id: "outro", kind: "outro", bars: 2, harmony: ["IV", "I"], lead: "A4:2 G4:2 | E4:4", chordVel: 0.6, energy: 0.3 }]);
  const drop = (full: boolean) => mat("house", "drive", [
    { id: "groove", kind: "groove", bars: 2, harmony: ["vi", "IV"], lead: "r:4 | r:4", energy: 0.5 },
    { id: "build", kind: "build", bars: 2, harmony: ["Vsus", "V"], lead: "G4:.5 G4:.5 A4:.5 A4:.5 B4:.5 B4:.5 C5:.5 D5:.5 | D5:.25 D5:.25 D5:.25 D5:.25 E5:.25 E5:.25 F5:.25 F5:.25 G5:1 r:1", groove: "build", energy: 0.65 },
    full ? { id: "drop", kind: "drop", bars: 4, harmony: ["I", "vi", "IV", "I"], lead: "C6:.75 G5:.75 E5:.5 G5:1 C6:1 | A5:.75 E5:.75 C5:.5 E5:1 A5:1 | F5:.75 C6:.75 A5:.5 F5:1 A5:1 | G5:.75 E5:.75 C5:.5 C6:2", arp: Array(4).fill("C5:.25 E5:.25 G5:.25 C6:.25 ".repeat(4).trim()), groove: "drop", energy: 0.95 }
      : { id: "drop", kind: "breakdown", bars: 4, harmony: ["I", "vi", "IV", "I"], lead: "C5:4 | r:4 | r:4 | r:4", groove: null, chordVel: 0.5, energy: 0.3 },
    { id: "button", kind: "outro", bars: 1, harmony: ["I"], lead: "C5:1 r:3", energy: 0.4 }], { meter: "4/4" });
  const peakOf = (m: Material) => { const t = craftReport(composePiece(m)).tension.sections; return t.reduce((a, x) => (x.value > a.value ? x : a)); };
  const cg = peakOf(climax(true)), cb = peakOf(climax(false)), dg = peakOf(drop(true)), dbad = peakOf(drop(false));
  ok(cg.id === "climax", `a home-chord tutti climax reads as the peak (${craftReport(composePiece(climax(true))).tension.sections.map((x) => `${x.id} ${x.value}`).join(", ")})`);
  ok(cb.id !== "climax", `the same home chord thin and quiet is not the peak (peak: ${cb.id})`);
  ok(dg.id === "drop", `an EDM drop reads as the peak over its build (${craftReport(composePiece(drop(true))).tension.sections.map((x) => `${x.id} ${x.value}`).join(", ")})`);
  ok(dbad.id !== "drop", `a "drop" that thins out is not the peak (peak: ${dbad.id})`);
  const lvl = (o: { loop?: boolean; mood?: MoodId }) => craftReport(piece({ bars: 6, mood: o.mood ?? "joy", loop: o.loop, sections: [["a", 2], ["b", 2], ["c", 2]], parts: [{ id: "lead", inst: "piano", role: "melody", src: [sec("C4:1 D4:1 E4:1 D4:1"), sec("C4:1 E4:1 D4:1 E4:1"), sec("D4:1 C4:1 E4:1 C4:1")].join(" | ") }, { id: "chords", inst: "piano", role: "accomp", src: Array(6).fill(C).join(" | ") }] })).findings;
  ok(has(lvl({}), "tension", /flat/, "warn") && has(lvl({ loop: true }), "tension", /flat/, "info") && has(lvl({ mood: "calm" }), "tension", /flat/, "info"), "a flat curve warns, but a loop or a calm piece stays level on purpose (a note, not a warning)");

  // ---------------- mood fit
  const moody = (tempo: number, mode: ModeId) => craftReport(piece({ mood: "calm", tempo, mode, bars: 2, parts: [{ id: "lead", inst: "piano", role: "melody", src: "E5:1 D5:.5 C5:.5 D5:1 E5:1 | D5:1 C5:.5 D5:.5 E5:1 C5:1" }, { id: "chords", inst: "piano", role: "accomp", src: `${C} | ${C}` }, { id: "bass", inst: "bass", role: "bass", src: "C2:4 | C2:4" }] }));
  ok(!has(moody(72, "major").findings, "mood", /./), "calm at 72 bpm in major fits");
  ok(has(moody(150, "major").findings, "mood", /tempo 150/), "calm at 150 bpm warns on tempo");
  ok(has(moody(72, "phrygian").findings, "mood", /mode phrygian/), "calm in phrygian (minor family) warns on mode");
  ok(!has(moody(72, "lydian").findings, "mood", /mode/), "calm in lydian (major family) passes: the family is the cue");

  // ---------------- only real errors are errors
  ok(craftReport(leapy).findings.every((f) => f.level !== "error"), "craft never errors on taste: only impossible ranges are errors");

  // ---------------- shipped music never carries an unplayable note (a craft ERROR). The fixtures are deliberately bad
  // for other guards (ghost, novelty), not for range, so they are held to this too; add a name here only for a fixture
  // written to fail the range check.
  const RANGE_FIXTURES: string[] = [];
  const shipped: [string, () => Piece][] = [...Object.entries(DEMOS), ...Object.entries(FIXTURES).filter(([k]) => !RANGE_FIXTURES.includes(k)),
    ...([["breach", breach], ["stillwater", stillwater], ["morningCrumb", morningCrumb], ["skywardKids", skywardKids]] as const).map(([k, m]) => [`blind/${k}`, () => composePiece(m())] as [string, () => Piece])] as [string, () => Piece][];
  for (const [k, make] of shipped) { const errs = craftReport(make()).findings.filter((f) => f.level === "error"); ok(!errs.length, `${k}: no unplayable notes${errs.length ? ` (${errs.map((f) => f.msg).join("; ")})` : ""}`); }
};

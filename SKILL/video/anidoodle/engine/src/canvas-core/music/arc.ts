// THE SHAPE OF A SCORE. craft.ts reads how a piece is WRITTEN; this reads how the finished sound
// MOVES over its length: where it is quiet, where it is loudest, and how it ends. A score can pass
// every other check and still feel like it wanders, because nothing in it is the high point and
// nothing in it is the rest. The shape that reads as one piece: a soft way in, a body, one clear
// loudest moment on the picture's payoff, and an ending that takes things away.
// Advisory, like craft: these are findings to answer, never a gate. A lullaby is flat on purpose.
//   const a = arcReport([L, R], 48000, { loop: false, payoffS: 13.5 }); console.log(arcText(a));
import { loudness } from "./meter";

export type ArcFinding = { level: "warn" | "info"; msg: string; fix: string };
export type ArcReport = {
  durationS: number; loop: boolean;
  medianLu: number;        // the piece's usual level: the median momentary loudness of everything above silence
  peakLu: number; peakS: number; peakAt: number;   // the loudest moment, when, and how far through (0..1)
  peakOverMedian: number;
  introUnderBody: number;  // how far the first 2.5 s sit under the median (positive = quieter)
  endUnderPeak: number;    // how far the last second sits under the loudest moment
  seamJump: number;        // loops: the level step from the last second to the first
  insideJump: number;      // loops: the largest step between two neighbouring seconds anywhere else in the piece
  lra: number;
  findings: ArcFinding[];
};
const mean = (a: number[]) => { const p = a.map((l) => Math.pow(10, l / 10)); return 10 * Math.log10(p.reduce((x, y) => x + y, 0) / Math.max(1, p.length)); };
const SILENT = -70;

/** How the sound moves over the piece. `payoffS` is the second the picture pays off, when the film has one. */
export const arcReport = (chans: Float32Array[], sr: number, o: { loop?: boolean; payoffS?: number } = {}): ArcReport => {
  if (!chans.length || !chans[0]) throw new Error("arcReport needs at least one channel of sound");
  const l = loudness(chans, sr), m = l.momentary, hop = l.hopS, dur = chans[0].length / sr, loop = !!o.loop, at = (i: number) => i * hop + 0.2;
  const live = m.filter((x) => x > SILENT).sort((a, b) => a - b), medianLu = live.length ? live[Math.floor(live.length / 2)] : SILENT;
  let pi = 0; m.forEach((x, i) => { if (x > m[pi]) pi = i; });
  const peakLu = m.length ? m[pi] : SILENT, peakS = at(pi), peakAt = dur > 0 ? peakS / dur : 0, win = (a: number, b: number) => { const w = m.filter((_, i) => at(i) >= a && at(i) <= b); return w.length ? mean(w) : SILENT; };
  const introUnderBody = medianLu - win(0, 2.5), endUnderPeak = peakLu - win(dur - 1, dur), seamJump = m.length ? Math.abs(win(dur - 1, dur) - win(0, 1)) : 0;
  // a loop's join is heard when it is a bigger step than the piece makes anywhere else: a phrase ending into a quiet bar is the music, not a seam
  let insideJump = 0; for (let t = 0; t + 2 <= dur; t++) insideJump = Math.max(insideJump, Math.abs(win(t + 1, t + 2) - win(t, t + 1)));
  const lra = Number.isFinite(l.lra) ? l.lra : 0, silent = peakLu <= SILENT;
  const f: ArcFinding[] = [], r1 = (x: number) => x.toFixed(1), pc = (x: number) => `${Math.round(x * 100)}%`;
  if (silent) return { durationS: dur, loop, medianLu, peakLu, peakS, peakAt, peakOverMedian: 0, introUnderBody: 0, endUnderPeak: 0, seamJump: 0, insideJump: 0, lra, findings: f }; // nothing sounds: nothing to shape
  if (dur >= 8 && peakLu - medianLu < 2) f.push({ level: "warn", msg: `nothing is the high point: the loudest moment is only ${r1(peakLu - medianLu)} LU over the usual level`, fix: "hold something back (the low drum, the top octave, a doubling) until the payoff, and thin the bars before it" });
  if (dur >= 20 && lra < 5) f.push({ level: "warn", msg: `little contrast: the loudness range is ${r1(lra)} LU over ${r1(dur)} s`, fix: "a piece this long wants 5 to 8: give one section fewer parts, or a bar of near silence before the high point" });
  if (o.payoffS !== undefined && Math.abs(peakS - o.payoffS) > 1.5) f.push({ level: "warn", msg: `the loudest moment is at ${r1(peakS)} s, the picture pays off at ${r1(o.payoffS)} s`, fix: "move the fullest bar onto the payoff, or thin whatever is out-shouting it" });
  if (loop) { if (seamJump > 3 && seamJump > insideJump) f.push({ level: "warn", msg: `the level steps ${r1(seamJump)} LU where the loop comes round, more than anywhere inside it (${r1(insideJump)} LU)`, fix: "end as thin as it begins, or begin as full as it ends" }); }
  else {
    if (dur >= 8 && introUnderBody < 0) f.push({ level: "info", msg: `it opens ${r1(-introUnderBody)} LU over its usual level: there is nothing left to build to`, fix: "open with fewer parts and no low drum, 5 to 12 LU under the body, for the first two or three seconds" });
    if (dur >= 8 && introUnderBody > 12) f.push({ level: "info", msg: `the first 2.5 s sit ${r1(introUnderBody)} LU under the rest: it reads as nothing happening yet`, fix: "frame 0 wants one sound with a reason (a drone, the first chord), even a soft one" });
    if (dur >= 8 && peakAt > 0.8) f.push({ level: "warn", msg: `the loudest moment is ${pc(peakAt)} of the way through: the ending out-shouts the film`, fix: "an ending resolves, it does not climb: stop on a bar line, leave a breath, then one soft element" });
    else if (dur >= 8 && endUnderPeak < 8) f.push({ level: "info", msg: `the last second is only ${r1(endUnderPeak)} LU under the loudest moment`, fix: "let the ending take parts away: the close sits 8 to 20 dB under the peak" });
  }
  return { durationS: dur, loop, medianLu, peakLu, peakS, peakAt, peakOverMedian: peakLu - medianLu, introUnderBody, endUnderPeak, seamJump, insideJump, lra, findings: f };
};

export const arcText = (a: ArcReport) => {
  const r1 = (x: number) => x.toFixed(1), head = `ARC  usual ${r1(a.medianLu)} LUFS · loudest ${r1(a.peakLu)} at ${r1(a.peakS)} s (${Math.round(a.peakAt * 100)}% through, ${r1(a.peakOverMedian)} LU over) · range ${r1(a.lra)} LU · ${a.loop ? `loop seam step ${r1(a.seamJump)} LU (largest inside ${r1(a.insideJump)})` : `opens ${r1(a.introUnderBody)} LU under, ends ${r1(a.endUnderPeak)} LU under the peak`}`;
  return [head, ...(a.findings.length ? a.findings.map((f) => `  ${f.level.toUpperCase().padEnd(4)} ${f.msg}\n       -> ${f.fix}`) : ["  the shape holds: nothing to answer"])].join("\n");
};

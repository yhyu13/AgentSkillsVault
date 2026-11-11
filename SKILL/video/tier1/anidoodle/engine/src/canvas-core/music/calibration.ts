// A neutral TEST SIGNAL per style: scale-degree triads, a stepwise line, arpeggios. It is not music
// and never a score: `tools/music.mjs calibrate` uses it to set palette levels against stem targets,
// and the unit test uses it to prove every vocabulary composes, renders and meters.
import { beatsPerBar, isCompound } from "./plan";
import { MODES, nameOf, type ModeId } from "./theory";
import type { Material } from "./compose";
import type { StyleVocab } from "./vocab";

export const testMaterial = (v: StyleVocab, o: { loop?: boolean; bars?: number; key?: string; tonic?: number; mode?: ModeId; /** write the counter / arp line even when the palette has no voice there (to measure an alternate or your own voice) */ lines?: ("counter" | "arp")[] } = {}): Material => {
  const mode = o.mode ?? v.harmony.modes.find((x) => MODES[x].intervals.length === 7) ?? "major", iv = MODES[mode].intervals, meter = v.meters[0], bpb = beatsPerBar(meter), comp = isCompound(meter), bars = o.bars ?? 8;
  const deg = (d: number, oct: number) => 12 * (oct + 1) + (o.tonic ?? 0) + iv[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7), unit = comp ? "1/3" : ".5", count = Math.round(bpb * (comp ? 3 : 2));
  const degs = [0, 3, 4, 5], chords: Material["chords"] = {};
  degs.forEach((d, i) => { chords[`c${i}`] = { voicing: `[${[0, 2, 4].map((k) => nameOf(deg(d + k, 4))).join(" ")}]`, bass: `${nameOf(deg(d, 2))}:${bpb}` }; });
  const bar = (fn: (d: number, j: number) => number) => Array.from({ length: bars }, (_, b) => Array.from({ length: count }, (_, j) => `${nameOf(fn(degs[b % 4], j))}:${unit}`).join(" "));
  const half = bpb / 2;
  return { style: v.id, title: `test signal: ${v.id}`, seed: 1, mood: v.moods[0], bpm: Math.round((v.tempo[0] + v.tempo[1]) / 2), key: o.key ?? "C", mode, meter, chords, loop: o.loop,
    grooves: v.grooves.length ? { main: { family: v.grooves[0], density: 0.5, variation: 0.35 } } : {},
    sections: [{ kind: "hook", bars, harmony: ["c0", "c1", "c2", "c3"], groove: v.grooves.length ? "main" : null,
      lead: bar((d, j) => deg(d + (j % 5), 5)), ...(v.palette.arp || o.lines?.includes("arp") ? { arp: bar((d, j) => deg(d + [0, 2, 4, 2][j % 4], 4)) } : {}),
      ...(v.palette.counter || o.lines?.includes("counter") ? { counter: Array.from({ length: bars }, (_, b) => `${nameOf(deg(degs[b % 4] + 4, 6))}:${half} ${nameOf(deg(degs[b % 4] + 2, 6))}:${half}`) } : {}) }] };
};

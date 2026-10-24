#!/usr/bin/env node
// Keys rebuild (S3): listening phrases, level calibration and anti-MIDI checks, old (legacy) vs new.
//   node tools/keys-demo.mjs phrases <outDir>   # before-<name>.mp3 / after-<name>.mp3 (+ .wav for the metrics) per instrument
//   node tools/keys-demo.mjs calibrate          # every style's test signal: keys stem RMS new vs legacy (dB)
//   node tools/keys-demo.mjs clones             # 8 strikes of one key: max correlation between strikes (1.0 = a clone)
//   node tools/keys-demo.mjs notes <outDir>     # single piano notes (old-/v2-<note>_vl<k>.wav) for tools/keys-compare.py
// Every render is deterministic (same seed, same bytes). The human listen is the final gate.
import { build } from "esbuild";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const js = (await build({ entryPoints: [join(import.meta.dirname, "../src/canvas-core/music/index.ts")], bundle: true, write: false, platform: "neutral", format: "esm", logLevel: "error" })).outputFiles[0].text;
const M = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
const [, , mode = "phrases", outDir = "."] = process.argv;
const SR = 48000;

const wav = (path, L, R, sr = SR) => {
  const n = L.length, b = Buffer.alloc(44 + n * 4);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 4, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4); b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), 46 + i * 4); }
  writeFileSync(path, b);
};
const mp3 = (w, out) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", w, "-codec:a", "libmp3lame", "-b:a", "192k", out]);

// ---------------------------------------------------------------- phrases (composed for the listen, not templates)
const piece = (title, style, tempo, meter, bpb, parts, harmony, o = {}) => ({
  title, seed: o.seed ?? 11, tail: o.tail ?? 2.5, harmony: harmony.map(([t, name]) => ({ t, name })),
  plan: { style, tempo, meter, swing: o.swing, sections: [{ id: "a", bars: o.bars ?? 5, mood: o.mood ?? "tender", key: o.key ?? "C", mode: "major", melody: ["stepwise"], dyn: o.dyn ?? [0.55, 0.75] }] },
  parts: parts.map(([id, inst, role, src, opts, gainDb]) => ({ id, inst, role, notes: M.line(0, src, { role, bpb, roll: role === "accomp" ? 0.02 : undefined }), opts, gainDb })),
});
const perBar = (bars, b = 4) => bars.map((_, i) => [i * b, bars[i]]);
const BALLAD_H = perBar(["Fmaj7", "Dm7", "Bbmaj7", "C7", "Fmaj7"]);
const ballad = (inst, opts) => piece("ballad", "nocturne", 64, "4/4", 4, [
  ["rh", inst, "melody", "A4:1.5 G4:.5 A4:1 C5:1 | D5:2 C5:1 A4:1 | Bb4:1.5 A4:.5 G4:1 F4:1 | G4:2 E4:1 G4:1 | [A4 F4]:4", opts],
  ["lh", inst, "accomp", "F2:.5 C3:.5 A3:.5 C4:.5 E4:.5 C4:.5 A3:.5 C3:.5 | D2:.5 A2:.5 F3:.5 A3:.5 C4:.5 A3:.5 F3:.5 A2:.5 | Bb1:.5 F2:.5 D3:.5 F3:.5 A3:.5 F3:.5 D3:.5 F2:.5 | C2:.5 G2:.5 E3:.5 G3:.5 Bb3:.5 G3:.5 E3:.5 G2:.5 | [F1 F2]:1 [C3 F3 A3 C4]:3", opts],
], BALLAD_H, { key: "F", dyn: [0.45, 0.7], tail: 4 });
const LIVELY_H = perBar(["C", "Am", "F", "G7", "C"]);
const lively = (inst, opts) => piece("lively", "jazz", 132, "4/4", 4, [
  ["rh", inst, "melody", "E5:.5 G5:.5 C6:.5 G5:.5 E5:.5 D5:.5 C5:.5 D5:.5 | E5:.5 A5:.5 C6:.5 A5:.5 E5:.5 C5:.5 A4:.5 C5:.5 | F5:.25 E5:.25 D5:.25 C5:.25 A4:.5 C5:.5 F5:1 A5:1 | G5:.5 F5:.5 D5:.5 B4:.5 G4:.5 B4:.5 D5:.5 F5:.5 | [C5 E5 G5 C6]:1 r:.5 [C5 E5 G5 C6]:.5 [C5 E5 G5 C6]:2", opts],
  ["lh", inst, "accomp", "C2:1 [E3 G3 C4]:1 G1:1 [E3 G3 C4]:1 | A1:1 [E3 A3 C4]:1 E2:1 [E3 A3 C4]:1 | F1:1 [F3 A3 C4]:1 C2:1 [F3 A3 C4]:1 | G1:1 [F3 G3 B3]:1 D2:1 [F3 G3 B3]:1 | [C2 C3]:1 r:.5 [C2 C3]:.5 [C2 G2 C3]:2", opts],
], LIVELY_H, { dyn: [0.7, 0.85], mood: "playful", tail: 3 });
const EP_H = perBar(["Dm9", "G13", "Cmaj9", "A7"]);
const epPhrase = (inst, opts) => piece("ep", "lofi", 82, "4/4", 4, [
  ["chords", inst, "accomp", "[D3 F3 A3 C4 E4]:1.5 [D3 F3 A3 C4 E4]:.5 r:2 | [F3 A3 B3 E4]:1.5 [F3 A3 B3 E4]:.5 r:2 | [E3 G3 B3 D4]:2 [E3 G3 B3 D4]:1 r:1 | [G3 C#4 E4 A4]:1.5 [G3 Bb3 C#4 F4]:2.5", { ...opts }],
  ["lead", inst, "melody", "r:2 A4:.5 C5:.5 D5:1 | F5:1 E5:.5 D5:.5 B4:2 | r:1 G4:.5 B4:.5 E5:1.5 D5:.5 | C#5:1 E5:1 A5:2", { ...opts, width: 0.2 }, 3],
  ["bass", "bass", "bass", "D2:2 r:1 A1:1 | G1:2 r:1 D2:1 | C2:2 r:1 G1:1 | A1:2 r:1 E2:1", {}, -4],
], EP_H, { bars: 4, swing: 0.56, mood: "nostalgic", dyn: [0.6, 0.7] });
const MAL_H = perBar(["C", "F", "G", "C"]);
const malletPhrase = (inst, style, tempo, opts) => piece("mallets", style, tempo, "4/4", 4, [
  ["lead", inst, "melody", "C5:.5 E5:.5 G5:.5 E5:.5 D5:.5 F5:.5 A5:.5 F5:.5 | C5:.5 F5:.5 A5:.5 C6:.5 A5:.5 F5:.5 C5:.5 A4:.5 | B4:.5 D5:.5 G5:.5 B5:.5 A5:.5 G5:.5 F5:.5 D5:.5 | [C5 E5]:1 G5:.5 E5:.5 C5:2", opts],
  ["low", inst, "bass", "C3:1 G3:1 C3:1 G3:1 | F3:1 C4:1 F3:1 C4:1 | G3:1 D4:1 G3:1 B3:1 | C3:2 [C3 G3]:2", opts, -4],
], MAL_H, { bars: 4, mood: "playful", dyn: [0.65, 0.8] });
const slowPhrase = (inst, style, opts, gain = 0) => piece("slow", style, 72, "3/4", 3, [
  ["lead", inst, "melody", "E5:1 G5:1 C6:1 | B5:2 G5:1 | A5:1.5 G5:.5 E5:1 | D5:3 | C5:1 E5:1 G5:1 | C6:3", opts, gain],
], perBar(["C", "G", "Am", "G", "C", "C"], 3), { bars: 6, key: "C", mood: "tender", dyn: [0.5, 0.7], tail: 4 });
const ORG_H = perBar(["C", "Am", "F", "G", "C"]);
const organRock = (opts) => piece("organ", "rock", 104, "4/4", 4, [
  ["chords", "organ", "accomp", "[C4 E4 G4]:1.5 [C4 E4 G4]:.5 r:1 [C4 E4 G4]:1 | [C4 E4 A4]:1.5 [C4 E4 A4]:.5 r:1 [C4 E4 A4]:1 | [C4 F4 A4]:1.5 [C4 F4 A4]:.5 r:1 [C4 F4 A4]:1 | [D4 G4 B4]:2 [D4 F4 B4]:2 | [C4 E4 G4 C5]:4", opts],
  ["bass", "organ", "bass", "C2:2 G2:2 | A1:2 E2:2 | F1:2 C2:2 | G1:2 G2:2 | C2:4", { ...opts, drawbars: "808000000" }, -3],
], ORG_H, { mood: "joy", dyn: [0.7, 0.8] });
const HYMN_H = perBar(["C", "F", "G", "Am", "F", "G", "C"], 4);
const hymn = (inst, opts) => piece("hymn", "choral", 66, "4/4", 4, [
  ["s", inst, "melody", "E4:2 F4:2 | A4:2 G4:2 | G4:2 E4:2 | E4:4 | F4:2 A4:2 | G4:2 F4:2 | E4:4", opts],
  ["a", inst, "inner", "C4:2 C4:2 | C4:2 B3:2 | C4:2 C4:2 | C4:4 | C4:2 C4:2 | D4:2 B3:2 | C4:4", opts],
  ["b", inst, "bass", "C3:2 A2:2 | F2:2 G2:2 | C3:2 A2:2 | A2:4 | F2:2 F2:2 | G2:2 G2:2 | C2:4", opts],
], HYMN_H, { bars: 7, mood: "awe", dyn: [0.6, 0.75], tail: 4 });

const PHRASES = [
  ["piano-ballad", () => ballad("piano", {}), "grand, slow ballad, pedal"],
  ["piano-lively", () => lively("piano", {}), "grand, lively stride passage, pedal"],
  ["piano-felt-ballad", () => ballad("piano", { variant: "felt" }), "felt piano (before = the old piano)"],
  ["piano-upright-lively", () => lively("piano", { variant: "upright" }), "upright (before = the old piano)"],
  ["piano-honky-lively", () => lively("piano", { variant: "honky" }), "honky-tonk upright (before = the old piano)"],
  ["rhodes", () => epPhrase("ePiano", { detune: 5 }), "Rhodes (tine + asymmetric pickup)"],
  ["wurlitzer", () => epPhrase("wurlitzer", {}), "Wurlitzer (before = the old ePiano)"],
  ["dx-epiano", () => epPhrase("ePiano", { model: "dx" }), "DX-style FM EP (before = the old ePiano)"],
  ["marimba", () => malletPhrase("marimba", "playful", 126, {}), "marimba"],
  ["vibes", () => malletPhrase("vibes", "jazz", 100, { trem: 4.5 }), "vibraphone, motor on"],
  ["glockenspiel", () => malletPhrase("glockenspiel", "playful", 112, {}), "glockenspiel (before = the old celesta)"],
  ["celesta", () => slowPhrase("celesta", "lullaby", {}), "celesta"],
  ["music-box", () => slowPhrase("musicBox", "lullaby", {}), "music box"],
  ["bell", () => slowPhrase("bell", "ambient", {}, -2), "tubular bells"],
  ["fm-bell", () => slowPhrase("fmBell", "ambient", {}), "FM bell"],
  ["organ-tonewheel", () => organRock({ bright: 1.2 }), "tonewheel + Leslie (slow)"],
  ["organ-tonewheel-fast", () => organRock({ bright: 1.2, leslie: "fast", perc: "3rd" }), "tonewheel + Leslie fast + percussion"],
  ["pipe-organ", () => hymn("organ", { kind: "pipe" }), "church organ, principal chorus (before = the old organ)"],
  ["pipe-organ-flute", () => hymn("organ", { kind: "pipe", stops: "flute" }), "church organ, stopped flute"],
];

if (mode === "phrases") {
  mkdirSync(outDir, { recursive: true });
  const only = process.argv[4] ? new RegExp(process.argv[4]) : null, lines = [];
  for (const [name, mk, what] of PHRASES) {
    if (only && !only.test(name)) continue;
    for (const [tag, legacy] of [["before", true], ["after", false]]) {
      const t0 = Date.now(), p = mk(), r = M.renderPiece({ ...p, legacy }, SR), w = join(outDir, `${tag}-${name}.wav`);
      wav(w, r.L, r.R); mp3(w, join(outDir, `${tag}-${name}.mp3`));
      lines.push(`${tag}-${name}.mp3  ${what}  (${(r.L.length / SR).toFixed(1)} s, ${M.loudness([r.L, r.R], SR).integrated.toFixed(1)} LUFS, rendered in ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
      console.log(lines[lines.length - 1]);
    }
  }
  writeFileSync(join(outDir, "PHRASES.txt"), lines.join("\n") + "\n");
}

if (mode === "calibrate") {
  const KEYS = new Set(["piano", ...M.KEYS_INSTS]), rows = [];
  for (const v of Object.values(M.VOCAB)) {
    const p = M.composePiece(M.testMaterial(v, { bars: 4 }));
    if (!p.parts.some((x) => KEYS.has(x.inst))) continue;
    const a = M.renderPiece({ ...p, legacy: true }, 24000, { stems: true, master: "none" }), b = M.renderPiece({ ...p, legacy: false }, 24000, { stems: true, master: "none" });
    for (const pt of p.parts) if (KEYS.has(pt.inst)) { const d = M.stemRms(...b.stems[pt.id], 24000) - M.stemRms(...a.stems[pt.id], 24000); rows.push([v.id, pt.id, pt.inst, JSON.stringify(pt.opts ?? {}), d]); }
  }
  for (const r of rows) console.log(`${r[0].padEnd(15)} ${r[1].padEnd(8)} ${r[2].padEnd(12)} new-old ${r[4] >= 0 ? "+" : ""}${r[4].toFixed(1)} dB  ${r[3]}`);
  const by = {}; for (const r of rows) (by[r[2]] ??= []).push(r[4]);
  console.log("mean by instrument:", Object.entries(by).map(([k, v]) => `${k} ${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)}`).join(", "));
}

if (mode === "clones") {
  // the same key 8 times, 1 s apart, same velocity: how alike are the strikes? (research sec. 9.2: < 0.98)
  const insts = ["piano", "ePiano", "wurlitzer", "marimba", "vibes", "glockenspiel", "celesta", "musicBox", "bell", "fmBell", "organ"];
  for (const inst of insts) {
    const res = [];
    for (const legacy of [true, false]) {
      const p = { title: "clone", seed: 5, tail: 1, harmony: [], plan: { style: "nocturne", tempo: 60, meter: "4/4", sections: [{ id: "a", bars: 2, mood: "tender", key: "C", mode: "major", melody: ["stepwise"], dyn: [0.6, 0.6] }] }, parts: [{ id: "x", inst, role: "melody", notes: M.line(0, "C5:.5 r:.5 C5:.5 r:.5 C5:.5 r:.5 C5:.5 r:.5 | C5:.5 r:.5 C5:.5 r:.5 C5:.5 r:.5 C5:.5 r:.5", { role: "melody", bpb: 4 }) }] };
      const r = M.renderPiece({ ...p, legacy }, SR, { expressive: false, flatVelocity: 0.6, master: "none" }), ons = r.perf.parts[0].keys.map((k) => Math.round(k.t * SR)), W = Math.round(0.4 * SR);
      let worst = 0;
      for (let a = 0; a + 1 < ons.length; a++) { const A = r.dry[0].subarray(ons[a], ons[a] + W), B = r.dry[0].subarray(ons[a + 1], ons[a + 1] + W); let ab = 0, aa = 0, bb = 0; for (let i = 0; i < W; i++) { ab += A[i] * B[i]; aa += A[i] * A[i]; bb += B[i] * B[i]; } worst = Math.max(worst, Math.abs(ab) / Math.sqrt(aa * bb + 1e-20)); }
      res.push(worst);
    }
    console.log(`${inst.padEnd(13)} max strike-to-strike correlation: legacy ${res[0].toFixed(4)}  new ${res[1].toFixed(4)}  ${res[1] < 0.98 ? "ok" : "CLONE"}`);
  }
}

if (mode === "notes") {
  mkdirSync(outDir, { recursive: true });
  for (const [m, v, tag] of [[36, 0.35, "C2_vl2"], [36, 0.92, "C2_vl4"], [48, 0.62, "C3_vl3"], [60, 0.35, "C4_vl2"], [60, 0.62, "C4_vl3"], [60, 0.92, "C4_vl4"], [72, 0.62, "C5_vl3"], [84, 0.92, "C6_vl4"]]) {
    const keys = [{ t: 0.05, off: 16, p: m, v }], n = Math.round(17 * 44100);
    const a = M.renderPiano(keys, [], 44100, n, M.PIANO_REAL, 1), b = M.renderPianoV2(keys, [], 44100, n, {}, 1);
    const norm = (r) => { let pk = 1e-9; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(r.L[i]), Math.abs(r.R[i])); const g = 0.5 / pk; return [r.L.map((x) => x * g), r.R.map((x) => x * g)]; };
    wav(join(outDir, `old-${tag}.wav`), ...norm(a), 44100); wav(join(outDir, `v2-${tag}.wav`), ...norm(b), 44100);
  }
  console.log("notes written to", outDir);
}

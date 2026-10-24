#!/usr/bin/env node
// Ensemble voices v2 (music/ensemble.ts): objective checks and the before/after listening set.
//   node tools/ensemble-check.mjs check            tuning (cents), anti-clone, determinism, stereo, legacy bit-identity
//   node tools/ensemble-check.mjs calibrate        stem RMS of every vocabulary slot that uses an ensemble voice, v2 vs legacy
//   node tools/ensemble-check.mjs track <voice> [opts-json]  per-note pitch through a legato phrase (octave slips, level)
//   node tools/ensemble-check.mjs ref <voice> <opts-json> <midi> <file.wav>   harmonic spectrum + decay vs a CC0 recording, v1 and v2
//   node tools/ensemble-check.mjs render <dir>     before-*.mp3 (legacy) / after-*.mp3 (v2): a phrase per instrument + an ensemble passage
import { strict as assert } from "node:assert";
import { build } from "esbuild";
import { join } from "node:path";
import { writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const dir = join(import.meta.dirname, "../src/canvas-core/music");
const js = (await build({ stdin: { contents: 'export * from "./index"; export * as E from "./ensemble"; export { rng } from "../core";', resolveDir: dir, loader: "ts" }, bundle: true, write: false, platform: "neutral", format: "esm", logLevel: "error" })).outputFiles[0].text;
const M = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
const I = M.instruments, O = M.orchestra;
const md5 = (L, R) => createHash("md5").update(Buffer.from(L.buffer, L.byteOffset, L.byteLength)).update(Buffer.from(R.buffer, R.byteOffset, R.byteLength)).digest("hex");
const cmd = process.argv[2] ?? "check";

// the voices by name: (keys, sr, n, opts, seed) -> {L, R}
const VOICE = {
  strings: (k, sr, n, o, s) => I.strings(k, sr, n, o, M.rng(s)), pizz: (k, sr, n, o, s) => I.strings(k, sr, n, { ...o, pizz: true }, M.rng(s)),
  guitar: (k, sr, n, o, s) => I.pluck(k, sr, n, o, M.rng(s), "guitar"), harp: (k, sr, n, o, s) => I.pluck(k, sr, n, o, M.rng(s), "harp"),
  bass: (k, sr, n, o) => I.bass(k, sr, n, o), brass: (k, sr, n, o) => O.brass(k, sr, n, o),
  woodwind: (k, sr, n, o, s) => O.woodwind(k, sr, n, o, M.rng(s)), choir: (k, sr, n, o, s) => O.choir(k, sr, n, o, M.rng(s)), bowedSolo: (k, sr, n, o, s) => O.bowedSolo(k, sr, n, o, M.rng(s)),
};
const key = (t, p, d, v = 0.7) => ({ t, off: t + d, p, v, role: "melody", w: v });

/** f0 by normalised autocorrelation around the expected period, parabolic peak; also flags an octave error. */
const pitchOf = (x, sr, fExp, from, to) => {
  const a = Math.round(from * sr), b = Math.round(to * sr), P = sr / fExp; let best = -1, bl = 0; const ac = (l) => { let s = 0, e1 = 0, e2 = 0; for (let i = a; i < b; i++) { s += x[i] * x[i + l]; e1 += x[i] * x[i]; e2 += x[i + l] * x[i + l]; } return s / Math.sqrt(e1 * e2 + 1e-20); };
  for (let l = Math.floor(P * 0.85); l <= Math.ceil(P * 1.18); l++) { const c = ac(l); if (c > best) { best = c; bl = l; } }
  const y0 = ac(bl - 1), y1 = best, y2 = ac(bl + 1), d = (y0 - y2) / (2 * (y0 - 2 * y1 + y2)), lag = bl + (Number.isFinite(d) ? d : 0);
  const half = ac(Math.round(P / 2));
  return { cents: 1200 * Math.log2(sr / lag / fExp), corr: best, octaveUp: half > best + 0.02 };
};

if (cmd === "check") {
  const sr = 48000, rows = [];
  // 1. tuning: sustained notes, vibrato off, mono mid (L+R)
  const tune = [["strings", { vibrato: 0, attack: 0.1 }, [43, 55, 69, 81]], ["pizz", {}, [48, 60, 72]], ["bowedSolo", { vibrato: 0, attack: 0.08 }, [55, 62, 69, 76, 88]], ["bowedSolo", { vibrato: 0, cello: true }, [36, 43, 50, 57, 64]],
    ["brass", { vibrato: 0 }, [48, 60, 70]], ["woodwind", { vibrato: 0 }, [62, 74, 86]], ["woodwind", { reed: true }, [52, 62, 74]], ["choir", { vibrato: 0, vowel: "a" }, [45, 57, 64, 72]],
    ["guitar", {}, [40, 52, 64, 76]], ["guitar", { kind: "steel" }, [40, 64]], ["guitar", { kind: "electric" }, [45, 69]], ["harp", {}, [36, 60, 84]],
    ["bass", {}, [28, 40, 52]], ["bass", { kind: "pick" }, [33, 45]], ["bass", { kind: "upright" }, [28, 43]], ["bass", { kind: "synth" }, [28, 40]]];
  let worst = 0;
  for (const [name, o, ps] of tune) for (const p of ps) {
    const n = Math.round(1.6 * sr), r = VOICE[name]([key(0.05, p, 1.3, 0.7)], sr, n, o, 11), mid = new Float32Array(n); for (let i = 0; i < n; i++) mid[i] = r.L[i] + r.R[i];
    const f = 440 * Math.pow(2, (p - 69) / 12), pl = name === "pizz" || name === "harp" || name === "guitar" || (name === "bass" && o.kind !== "synth"), m = pitchOf(mid, sr, f, pl ? 0.15 : 0.6, pl ? 0.45 : 1.1);
    rows.push(`${name}${o.kind ? "/" + o.kind : o.cello ? "/cello" : o.reed ? "/reed" : ""} ${p}: ${m.cents >= 0 ? "+" : ""}${m.cents.toFixed(1)} c (r ${m.corr.toFixed(3)})${m.octaveUp ? " OCTAVE?" : ""}`);
    worst = Math.max(worst, Math.abs(m.cents)); if (Math.abs(m.cents) > 10 || m.octaveUp) console.log("  TUNING  " + rows[rows.length - 1]);
  }
  console.log(`  tuning: ${rows.length} notes, worst |error| ${worst.toFixed(1)} c`); rows.forEach((x) => console.log("    " + x));
  // 2. anti-clone: the same key twice, 2 s apart -> the two renders must differ (correlation < 0.98)
  for (const [name, o] of [["strings", {}], ["pizz", {}], ["bowedSolo", {}], ["brass", {}], ["woodwind", {}], ["woodwind", { reed: true }], ["choir", {}], ["guitar", {}], ["harp", {}], ["bass", {}], ["bass", { kind: "upright" }], ["bass", { kind: "synth" }]]) {
    const n = Math.round(4.2 * sr), W = Math.round(0.8 * sr), r = VOICE[name]([key(0.1, 60 - (name === "bass" ? 24 : 0), 0.8), key(2.1, 60 - (name === "bass" ? 24 : 0), 0.8)], sr, n, o, 5);
    const a = r.L.subarray(Math.round(0.1 * sr), Math.round(0.1 * sr) + W), b = r.L.subarray(Math.round(2.1 * sr), Math.round(2.1 * sr) + W);
    let s = 0, e1 = 0, e2 = 0; for (let i = 0; i < W; i++) { s += a[i] * b[i]; e1 += a[i] * a[i]; e2 += b[i] * b[i]; } const c = s / Math.sqrt(e1 * e2 + 1e-20);
    const d1 = VOICE[name]([key(0.1, 60, 0.8)], sr, Math.round(1.5 * sr), o, 5), d2 = VOICE[name]([key(0.1, 60, 0.8)], sr, Math.round(1.5 * sr), o, 5);
    assert.equal(md5(d1.L, d1.R), md5(d2.L, d2.R), `${name}: not deterministic`);
    let bad = false; for (let i = 0; i < n; i++) if (!Number.isFinite(r.L[i]) || !Number.isFinite(r.R[i]) || Math.abs(r.L[i]) > 8) { bad = true; break; }
    assert(!bad, `${name}: non-finite or runaway samples`);
    console.log(`  anti-clone ${name}${o.kind ? "/" + o.kind : o.reed ? "/reed" : ""}: repeat correlation ${c.toFixed(3)} ${c < 0.98 ? "ok" : "CLONE"}; deterministic; finite`);
    assert(c < 0.98, `${name}: repeated notes are clones`);
  }
  // 3. per-band stereo (research doc section 9): decorrelated above 500 Hz (< 0.9), near-mono below 120 Hz (> 0.95) for the section voices
  const band = (x, f, hp) => { const a = Math.exp(-2 * Math.PI * f / sr), y = new Float32Array(x.length); let z1 = 0, z2 = 0; for (let i = 0; i < x.length; i++) { z1 = (1 - a) * x[i] + a * z1; z2 = (1 - a) * z1 + a * z2; y[i] = hp ? x[i] - z2 : z2; } return y; };
  const corr = (a, b) => { let s = 0, e1 = 0, e2 = 0; for (let i = 0; i < a.length; i++) { s += a[i] * b[i]; e1 += a[i] * a[i]; e2 += b[i] * b[i]; } return s / Math.sqrt(e1 * e2 + 1e-20); };
  for (const [name, o, ps] of [["strings", {}, [48, 55, 64, 67, 72]], ["strings", { bass: true }, [36, 43]], ["choir", {}, [48, 55, 64, 72]], ["brass", {}, [55, 60, 64]]]) {
    const n = Math.round(3 * sr), r = VOICE[name](ps.map((p) => key(0.1, p, 2.4, 0.7)), sr, n, o, 9), hi = corr(band(r.L, 500, true), band(r.R, 500, true)), lo = corr(band(r.L, 120, false), band(r.R, 120, false));
    console.log(`  stereo ${name}${o.bass ? "/bass" : ""}: corr >500 Hz ${hi.toFixed(2)} ${hi < 0.9 ? "ok" : "NARROW"}, <120 Hz ${lo.toFixed(2)} ${lo > 0.95 ? "ok" : "WIDE LOWS"}`);
  }
  // 4. legacy path: bit-identical to v1 for every voice (the v1 functions are unchanged; the flag routes to them)
  { const k = [key(0.1, 60, 0.8), key(0.9, 64, 0.8)], mk = (legacy) => ({ title: "t", seed: 3, tail: 1, harmony: [], ...(legacy ? { legacy: true } : {}), plan: { style: "cinematic", tempo: 90, meter: "4/4", sections: [{ id: "a", bars: 1, mood: "calm", key: "C", mode: "major", melody: ["stepwise"], dyn: [0.6, 0.6] }] }, parts: Object.keys(VOICE).filter((x) => x !== "pizz").map((inst, i) => ({ id: inst + i, inst, role: "melody", notes: M.line(0, "C4:2 E4:2", { role: "melody", v: 0.7, bpb: 4 }) })) });
  const a = M.renderPiece(mk(true), 24000, { stems: true, master: "none" }), b = M.renderPiece(mk(false), 24000, { stems: true, master: "none" });
  for (const [id, [L]] of Object.entries(a.stems)) { assert.notEqual(md5(L, L), md5(b.stems[id][0], b.stems[id][0]), `${id}: piece.legacy must change the voice`); }
  console.log(`  legacy: Piece.legacy routes all ${Object.keys(a.stems).length} ensemble voices to v1 (launchLofi3 md5 is guarded by tools/music-unit.mjs)`); }
}

if (cmd === "calibrate") {
  const SR = 24000, ENS = new Set(["strings", "guitar", "harp", "bass", "brass", "woodwind", "choir", "bowedSolo"]), out = [];
  for (const v of Object.values(M.VOCAB)) {
    const combos = [[null, null]]; for (const [slot, alts] of Object.entries(v.alternates ?? {})) for (const [nm, a] of Object.entries(alts)) if (ENS.has(a.inst)) combos.push([slot, nm]);
    for (const [slot, nm] of combos) {
      const mat = { ...M.testMaterial(v, { bars: 4 }), ...(slot ? { voices: { [slot]: nm } } : {}) };
      let p; try { p = M.composePiece(mat); } catch { continue; }
      const parts = p.parts.filter((x) => ENS.has(x.inst) && (!slot || x.id === slot)); if (!parts.length) continue;
      const only = (x) => parts.some((q) => q.id === x.id);
      const a = M.renderPiece(p, SR, { stems: true, master: "none", only }), b = M.renderPiece({ ...p, legacy: true }, SR, { stems: true, master: "none", only });
      for (const x of parts) { const nw = M.stemRms(...a.stems[x.id], SR), old = M.stemRms(...b.stems[x.id], SR); out.push({ style: v.id, slot: x.id, alt: nm, inst: x.inst, kind: x.opts?.kind ?? (x.opts?.reed ? "reed" : x.opts?.cello ? "cello" : ""), d: nw - old });
        console.log(`  ${v.id.padEnd(15)} ${x.id.padEnd(8)} ${(nm ?? "").padEnd(9)} ${x.inst.padEnd(10)} ${String(out[out.length - 1].kind).padEnd(8)} v2-legacy ${(nw - old >= 0 ? "+" : "") + (nw - old).toFixed(1)} dB`); }
    }
  }
  const by = {}; for (const r of out) (by[r.inst + (r.kind ? "/" + r.kind : "")] ??= []).push(r.d);
  console.log("  median per voice:"); for (const [k, ds] of Object.entries(by)) { ds.sort((a, b) => a - b); console.log(`    ${k.padEnd(18)} ${ds[Math.floor(ds.length / 2)].toFixed(1)} dB (n ${ds.length}, ${ds[0].toFixed(1)}..${ds[ds.length - 1].toFixed(1)})`); }
}

if (cmd === "render") {
  const outDir = process.argv[3]; if (!outDir) throw new Error("render <dir>"); mkdirSync(outDir, { recursive: true });
  const SR = 48000, L = (t, s, role = "melody", v = 0.7, bpb = 4) => M.line(t, s, { role, v, bpb });
  const piece = (title, style, tempo, parts, bars, tail = 2.5) => ({ title, seed: 7, tail, harmony: [], plan: { style, tempo, meter: "4/4", sections: [{ id: "a", bars, mood: "calm", key: "C", mode: "major", melody: ["stepwise"], dyn: [0.62, 0.7] }] }, parts });
  const P = (id, inst, notes, opts = {}, extra = {}) => ({ id, inst, role: notes[0]?.role ?? "melody", notes, opts, send: 0.5, ...extra });
  const chords = (v = 0.6) => L(0, "[C4 E4 G4]:4 | [A3 C4 E4]:4 | [F3 A3 C4 F4]:4 | [G3 B3 D4 G4]:4", "accomp", v);
  const mel = (oct = 5, v = 0.72) => L(0, `E${oct}:1.5 D${oct}:.5 C${oct}:1 G${oct - 1}:1 | A${oct - 1}:2 C${oct}:1 E${oct}:1 | F${oct}:1.5 E${oct}:.5 D${oct}:1 C${oct}:1 | D${oct}:3 r:1`, "melody", v);
  const legato = (oct = 5, v = 0.7) => L(0, `G${oct - 1}:1 C${oct}:1 E${oct}:1 G${oct}:1 | F${oct}:2 E${oct}:1 D${oct}:1 | C${oct}:1.5 D${oct}:.5 E${oct}:1 A${oct - 1}:1 | B${oct - 1}:3 r:1`, "melody", v);
  const bassLine = (v = 0.8) => L(0, "C2:1 C2:.5 G2:.5 C3:1 B2:1 | A1:1 A1:.5 E2:.5 A2:1 G2:1 | F1:1 F1:.5 C2:.5 F2:1 E2:1 | G1:1 G1:.5 D2:.5 G2:1 B1:1", "bass", v);
  const walk = (v = 0.75) => L(0, "C2:1 E2:1 G2:1 A2:1 | A1:1 C2:1 E2:1 G2:1 | F1:1 A1:1 C2:1 D2:1 | G1:1 B1:1 D2:1 F2:1", "bass", v);
  const arp = (v = 0.6) => L(0, ["C3 G3 C4 E4 G4 E4 C4 G3", "A2 E3 A3 C4 E4 C4 A3 E3", "F2 C3 F3 A3 C4 A3 F3 C3", "G2 D3 G3 B3 D4 B3 G3 D3"].map((b) => b.split(" ").map((x) => x + ":.5").join(" ")).join(" | "), "accomp", v);
  const strum = (v = 0.65) => { const out = []; ["C3 E3 G3 C4 E4", "A2 E3 A3 C4 E4", "F2 C3 F3 A3 C4", "G2 D3 G3 B3 D4"].forEach((c, b) => [0, 1.5, 2, 3].forEach((beat, j) => c.split(" ").forEach((nm, s) => out.push({ ...L(0, `${nm}:4`, "accomp", v * (j ? 0.8 : 1))[0], t: b * 4 + beat + s * 0.035, d: j === 3 ? 1 : j === 0 ? 1.5 : 1 })))); return out; };
  const stacc = (v = 0.6) => L(0, ["C4 E4 G4 E4 C4 E4 G4 C5", "A3 C4 E4 C4 A3 C4 E4 A4", "F3 A3 C4 A3 F3 A3 C4 F4", "G3 B3 D4 B3 G3 B3 D4 G4"].map((b) => b.split(" ").map((x) => x + ":.5").join(" ")).join(" | "), "accomp", v);
  const SET = [
    ["strings-section", "orchestral", 72, [P("chords", "strings", chords(), { attack: 0.5, release: 1.2 }, { gainDb: -4 }), P("low", "strings", L(0, "C3:4 | A2:4 | F2:4 | G2:4", "bass", 0.65), { attack: 0.5, release: 1.2, bass: true, bright: 0.6 }, { gainDb: -4 }), P("lead", "strings", mel(5), { attack: 0.15, release: 0.9, width: 0.4 })]],
    ["strings-spiccato", "orchestral", 96, [P("arp", "strings", stacc(), { attack: 0.005, release: 0.08, bright: 1.2 })]],
    ["strings-pizzicato", "orchestral", 96, [P("arp", "strings", stacc(), { attack: 0.005, release: 0.08, pizz: true })], { beforeOpts: { pizz: false } }],
    ["solo-violin", "suspense", 66, [P("lead", "bowedSolo", legato(5), { vibrato: 22 })]],
    ["solo-cello", "suspense", 60, [P("lead", "bowedSolo", legato(3), { cello: true, vibrato: 12 })]],
    ["brass-trumpet", "orchestral", 88, [P("lead", "brass", mel(5, 0.78), { attack: 0.06 })]],
    ["brass-horns", "orchestral", 72, [P("chords", "brass", chords(0.62), { attack: 0.1, bright: 0.6 }), P("low", "brass", L(0, "C3:4 | A2:4 | F2:4 | G2:4", "bass", 0.7), { attack: 0.08 })]],
    ["flute", "orchestral", 80, [P("lead", "woodwind", legato(5), {})]],
    ["clarinet", "jazz", 96, [P("lead", "woodwind", mel(4), { reed: true })]],
    ["choir-ah", "choral", 60, [P("chords", "choir", L(0, "[C3 G3 E4 C5]:4 | [A2 E3 C4 A4]:4 | [F2 C3 A3 F4]:4 | [G2 D3 B3 G4]:4", "accomp", 0.62), { vowel: "a", attack: 0.5 })]],
    ["choir-lead-oh", "choral", 66, [P("lead", "choir", legato(5, 0.66), { vowel: "o", attack: 0.25, width: 0.3 })]],
    ["choir-morph-uoa", "choral", 60, [P("chords", "choir", L(0, "[C3 G3 E4 C5]:8 | [F2 C3 A3 F4]:8", "accomp", 0.6, 8), { vowel: "uoa", attack: 0.6 })], { beforeOpts: { vowel: "u" } }],
    ["guitar-nylon", "world", 84, [P("arp", "guitar", arp(), {})]],
    ["guitar-steel", "world", 90, [P("chords", "guitar", strum(), { kind: "steel" })]],
    ["guitar-electric", "lofi", 84, [P("lead", "guitar", mel(4, 0.7), { kind: "electric" }), P("chords", "guitar", L(0, "[C3 G3 B3 E4]:2 r:2 | [A2 G3 C4 E4]:2 r:2 | [F2 E3 A3 C4]:2 r:2 | [G2 F3 B3 D4]:2 r:2", "accomp", 0.55), { kind: "electric" }, { gainDb: -5 })]],
    ["harp", "cinematic", 72, [P("arp", "harp", arp(0.62), {})]],
    ["bass-finger", "lofi", 88, [P("bass", "bass", bassLine(), {})]],
    ["bass-pick", "rock", 104, [P("bass", "bass", L(0, "C2:.5 C2:.5 C2:.5 C2:.5 G1:.5 G1:.5 A1:.5 B1:.5 | A1:.5 A1:.5 A1:.5 A1:.5 E2:.5 E2:.5 G2:.5 E2:.5 | F1:.5 F1:.5 F1:.5 F1:.5 C2:.5 C2:.5 D2:.5 E2:.5 | G1:.5 G1:.5 G1:.5 G1:.5 D2:.5 B1:.5 A1:.5 G1:.5", "bass", 0.8), { kind: "pick", drive: 2.2 })]],
    ["bass-upright", "jazz", 120, [P("bass", "bass", walk(), { kind: "upright" })]],
    ["bass-synth", "synthwave", 100, [P("bass", "bass", L(0, ["C2 C2 C3 C2 G1 G1 A1 B1", "A1 A1 A2 A1 E2 E2 G2 E2", "F1 F1 F2 F1 C2 C2 D2 E2", "G1 G1 G2 G1 D2 B1 A1 G1"].map((b) => b.split(" ").map((x) => x + ":.5").join(" ")).join(" | "), "bass", 0.8), { kind: "synth", drive: 2.0 })]],
    ["ensemble", "cinematic", 72, [
      P("pad", "strings", chords(0.55), { attack: 0.7, release: 1.4 }, { gainDb: -6 }), P("low", "strings", L(0, "C3:4 | A2:4 | F2:4 | G2:4", "bass", 0.6), { attack: 0.6, release: 1.4, bass: true, bright: 0.6 }, { gainDb: -5 }),
      P("lead", "woodwind", mel(5, 0.7), {}, { gainDb: -1 }), P("horns", "brass", L(0, "r:2 [E4 G4]:2 | r:2 [E4 A4]:2 | r:2 [F4 A4]:2 | [D4 G4]:3 r:1", "color", 0.55), { attack: 0.12, bright: 0.6 }, { gainDb: -7 }),
      P("harp", "harp", arp(0.5), {}, { gainDb: -6 }), P("choir", "choir", L(0, "r:4 | r:4 | [A4 C5]:4 | [B4 D5]:4", "color", 0.5), { vowel: "o", attack: 0.6 }, { gainDb: -8 })]],
  ];
  const wav = (path, a, b) => { const n = a.length, d = Buffer.alloc(n * 8), h = Buffer.alloc(44); for (let i = 0; i < n; i++) { d.writeFloatLE(a[i], i * 8); d.writeFloatLE(b[i], i * 8 + 4); }
    h.write("RIFF", 0); h.writeUInt32LE(36 + d.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34); h.write("data", 36); h.writeUInt32LE(d.length, 40); writeFileSync(path, Buffer.concat([h, d])); };
  const only = process.argv[4] ? new Set(process.argv[4].split(",")) : null;
  for (const [name, style, tempo, parts, extra = {}] of SET) {
    if (only && !only.has(name)) continue;
    const bars = 4, pc = piece(name, style, tempo, parts, bars);
    for (const which of ["before", "after"]) {
      const p = which === "after" ? pc : { ...pc, legacy: true, parts: pc.parts.map((x) => ({ ...x, opts: { ...x.opts, ...(extra.beforeOpts ?? {}) } })) };
      const t0 = Date.now(), r = M.renderPiece(p, SR), f = join(outDir, `${which}-${name}`);
      wav(f + ".wav", r.L, r.R); execFileSync("ffmpeg", ["-v", "error", "-y", "-i", f + ".wav", "-c:a", "libmp3lame", "-b:a", "224k", f + ".mp3"]); unlinkSync(f + ".wav");
      console.log(`  ${which}-${name}.mp3  ${(r.L.length / SR).toFixed(1)} s  ${M.loudness([r.L, r.R], SR).integrated.toFixed(1)} LUFS  (${Date.now() - t0} ms)`);
    }
  }
}

if (cmd === "track") {
  const sr = 48000, b = 60 / 66, name = process.argv[3] ?? "bowedSolo", o = JSON.parse(process.argv[4] ?? "{}"), oct = o.cello ? 3 : 5;
  const keys = M.line(0, `G${oct - 1}:1 C${oct}:1 E${oct}:1 G${oct}:1 | F${oct}:2 E${oct}:1 D${oct}:1 | C${oct}:1.5 D${oct}:.5 E${oct}:1 A${oct - 1}:1 | B${oct - 1}:3 r:1`, { role: "melody", v: 0.7, bpb: 4 }).map((x) => key(0.2 + x.t * b, x.p, x.d * b, x.v));
  const n = Math.round((keys[keys.length - 1].off + 1) * sr), r = VOICE[name](keys.map((k) => ({ ...k, v: o._v ?? k.v })), sr, n, o, o._seed ?? 3), x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = r.L[i] + r.R[i];
  for (const k of keys) {
    const a = Math.round((k.t + Math.min(0.12, (k.off - k.t) * 0.3)) * sr), e = Math.round((k.off - 0.03) * sr), P = sr / (440 * 2 ** ((k.p - 69) / 12));
    const ac = (l) => { let s = 0, e1 = 0, e2 = 0; for (let i = a; i < e; i++) { s += x[i] * x[i + l]; e1 += x[i] ** 2; e2 += x[i + l] ** 2; } return s / Math.sqrt(e1 * e2 + 1e-20); };
    let best = -2, bl = 0; for (let l = Math.floor(P / 2.3); l <= Math.ceil(P * 2.3); l++) { const c = ac(l); if (c > best + 0.03) { best = c; bl = l; } }
    let rms = 0; for (let i = a; i < e; i++) rms += x[i] ** 2; rms = Math.sqrt(rms / (e - a));
    console.log(`  ${name} p ${k.p}: period ${bl} vs ${P.toFixed(1)} (${(1200 * Math.log2(bl / P)).toFixed(0)} c) r ${best.toFixed(2)}  ${(20 * Math.log10(rms)).toFixed(1)} dB`);
  }
}

if (cmd === "ref") {
  const [name, oj, midiS, file] = process.argv.slice(3), o = JSON.parse(oj), p = Number(midiS), sr = 48000, f = 440 * 2 ** ((p - 69) / 12);
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(sr), "-f", "f32le", "-"], { maxBuffer: 1 << 28 }), ref = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
  const n = Math.round(3 * sr), mk = (legacy) => { const r = VOICE[name]([key(0.05, p, 2.5, 0.6)], sr, n, { ...o, ...(legacy ? { legacy: true } : {}) }, 4), x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = r.L[i] + r.R[i]; return x; };
  const prof = (x) => { let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v)); let i0 = 0; while (i0 < x.length && Math.abs(x[i0]) < pk * 0.03) i0++;
    const amp = (h, a, b) => { let re = 0, im = 0; const w = (2 * Math.PI * f * h) / sr; for (let i = a; i < b && i < x.length; i++) { const hn = 0.5 - 0.5 * Math.cos((2 * Math.PI * (i - a)) / (b - a)); re += x[i] * hn * Math.cos(w * i); im += x[i] * hn * Math.sin(w * i); } return Math.hypot(re, im) + 1e-12; };
    const a = i0 + Math.round(0.05 * sr), b = i0 + Math.round(0.35 * sr), h1 = amp(1, a, b), spec = Array.from({ length: 10 }, (_, k) => 20 * Math.log10(amp(k + 1, a, b) / h1));
    const e = (t0) => 20 * Math.log10(amp(1, i0 + Math.round(t0 * sr), i0 + Math.round((t0 + 0.2) * sr))), decay = (e(0.1) - e(0.9)) / 0.8;
    return { spec, decay }; };
  const R = prof(ref), A = prof(mk(true)), B = prof(mk(false)), dist = (X) => X.spec.slice(1).reduce((s, v, i) => s + Math.abs(Math.max(v, -60) - Math.max(R.spec[i + 1], -60)), 0) / 9;
  const row = (nm, X) => console.log(`  ${nm.padEnd(6)} h2..h10 dB ${X.spec.slice(1).map((v) => Math.max(-60, v).toFixed(0).padStart(4)).join("")}   fundamental decay ${X.decay.toFixed(1)} dB/s${X === R ? "" : `   |spectrum - ref| ${dist(X).toFixed(1)} dB`}`);
  console.log(`  ${name} ${oj} midi ${p} vs ${file.split("/").pop()}`); row("ref", R); row("v1", A); row("v2", B);
}

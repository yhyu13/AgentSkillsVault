#!/usr/bin/env node
// Offline music renderer + meter. Renders a named piece to a 48 kHz 32-bit FLOAT WAV (no PCM16
// clipping on the way) and meters the DECODED file: integrated LUFS (BS.1770-4), LRA (EBU 3342),
// true peak (4x), onsets/s (spectral flux), spectral centroid; plus note-data numbers.
//
// <piece> is YOUR score, a module: path/to/score.ts#exportName (a Material, a Piece, or a function
// returning either); or the name of a shipped demo (listening references, never a film's score).
//
//   node tools/music.mjs vocab [style]              # the style vocabularies: palette, grooves, harmony, melody, arrangement
//   node tools/music.mjs check <piece> [--fit --seconds N] [--payoff S]  # everything: key/mode, warnings, master, ghost/reverb/masking guards, stems, craft, arc (the shape; S = the second the picture pays off), novelty
//   node tools/music.mjs craft <piece> [more ...] [--json]  # how it is WRITTEN: melody, harmony, rhythm, tension, mood fit (no render, advisory; errors fail)
//   node tools/music.mjs novelty <piece> [more ...]  # vs every shipped piece (and pairwise when several); FAILS above the threshold or on a reused fragment
//   node tools/music.mjs list                       # shipped demos and fixtures
//   node tools/music.mjs render <piece> <out.wav|out.mp3> [--seconds 45] [--flat] [--tempo 66] [--fit] [--loop] [--stems] [--verify]
//     (--verify renders a second time, serially and without the voice cache, and reports whether it is bit-identical)
//   node tools/music.mjs stems <piece> [--seconds 45] [--fit]   # each part's stem RMS vs its target, flags > 3 dB off
//     (--fit uses fitScore: the piece's refit, e.g. a composed score repeats its stretch section so it still ends on its outro;
//      --loop renders a seamless loop, automatic for a plan.loop piece. LUFS alone once hid a sub 7-10 dB too hot:
//      balance a mix by its stems, then master.)
//   node tools/music.mjs meter <file.wav|file.mp4> [more files]
//   node tools/music.mjs samples <outdir>          # the whole deliverable set + meters.json + .m4a
//   node tools/music.mjs score <piece>                # the text score, bar by bar
//   node tools/music.mjs probe                      # piano realism probes
//   node tools/music.mjs calibrate [--voices]       # palette trims (vocabTrim.ts); --voices: alternates' trims and your own voices' levels (vocabVoices.ts)
//   (check/render run voices on all but one core; ANIDOODLE_THREADS=1 renders serially, ANIDOODLE_TIMING=1 prints check's stage times)
//   ANIDOODLE_SOUNDS=<pack-dir> or --sounds <pack-dir> plays optional, hash-verified FLAC banks.
//   --room <id> selects a recorded room; an unregistered id keeps the synthesized space.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";
import { availableParallelism } from "node:os";
import { loadBanks, soundIds, printSounds, soundsNotice } from "./sounds.mjs";
import { soundsDir } from './soundfetch.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SR = 48000;
let ENGINE_URL = "";
let SOUNDS_DIR;
let ROOM_ID;
const SOUNDS_URL = new URL("./sounds.mjs", import.meta.url).href;
let noticed = false;
const loadSounds = (M, piece) => { loadBanks(M, SOUNDS_DIR, soundIds(piece)); if (!noticed) noticed = soundsNotice(M, [piece]); };
const load = async () => {
  const r = await build({ entryPoints: [join(here, "../src/canvas-core/music/index.ts")], bundle: true, write: false, format: "esm", platform: "neutral", target: "es2022", logLevel: "error" });
  ENGINE_URL = "data:text/javascript;base64," + Buffer.from(r.outputFiles[0].text).toString("base64");
  return import(ENGINE_URL);
};

// ---------------------------------------------------------------- voices in parallel
// Synthesis is most of a render, and each part's voice is a pure function of its inputs (render.ts
// VoiceJob). check/render/stems list every voice job they will need (the mix at 48 kHz, each guard
// role, the stems at 24 kHz), run the distinct ones on a worker pool, and render from that cache:
// the same code on the same inputs, so the audio is bit-identical to a serial render
// (tools/music-unit.mjs checks it). ANIDOODLE_THREADS=1 renders serially.
const WORKER = `const { parentPort, workerData } = require("node:worker_threads");
Promise.all([import(workerData.engine), import(workerData.loader)]).then(([M, S]) => {
  S.loadBanks(M, workerData.sounds, workerData.ids);
  parentPort.on("message", ({ id, job, task }) => {
    if (job) { const o = M.runVoiceJob(job); parentPort.postMessage({ id, o }, [...new Set([o.L.buffer, o.R.buffer, o.halo && o.halo.buffer].filter(Boolean))]); return; }
    const opts = { ...task.opts, cache: new Map(task.voices) };
    parentPort.postMessage({ id, out: task.kind === "band" ? M.roleBandDb(task.piece, task.sr, opts, task.spans) : M.measureStems(task.piece, task.sr, opts) });
  });
  parentPort.postMessage({ ready: true });
});`;
const THREADS = () => Number(process.env.ANIDOODLE_THREADS) || Math.max(1, availableParallelism() - 1);
/** Run messages on a pool of `threads` workers; resolves to their replies by id, in the order given. */
const pool = (msgs, threads) => { const queue = msgs.slice(), out = new Map(), ids = [...new Set(msgs.flatMap((m) => m.job ? (m.job.kind === "sampled" ? [m.job.bank] : []) : soundIds(m.task.piece)))]; return Promise.all(Array.from({ length: Math.min(threads, msgs.length) }, () => new Promise((ok, fail) => {
  const w = new Worker(WORKER, { eval: true, workerData: { engine: ENGINE_URL, loader: SOUNDS_URL, sounds: SOUNDS_DIR, ids } });
  const next = () => { const x = queue.shift(); if (!x) { w.terminate(); ok(); return; } w.postMessage(x); };
  w.on("message", (m) => { if (!m.ready) out.set(m.id, m); next(); }); w.on("error", (e) => { queue.length = 0; w.terminate(); fail(e); });
}))).then(() => out); };
export const prewarm = async (M, cache, jobs) => {
  const todo = new Map(); for (const j of jobs) { const k = M.voiceJobKey(j); if (!cache.has(k) && !todo.has(k)) todo.set(k, j); }
  if (Math.min(todo.size, THREADS()) < 2) return; // the render synthesizes on demand
  const queue = [...todo].sort((a, b) => b[1].n * b[1].keys.length - a[1].n * a[1].keys.length); // biggest first: the slowest voice starts at once
  for (const [id, m] of await pool(queue.map(([id, job]) => ({ id, job })), THREADS())) cache.set(id, m.o);
};
/** What `check` renders besides the mix: the piece the mix plays (a loop's source), its performance, the mix's length, and the masking plan. */
const checkPlan = (M, piece, tempo, seconds, loop = piece.plan.loop) => {
  const src = loop ? M.loopSource(piece) : null, p = src ? src.p : piece, o = src ? src.opts : { seconds, tempo };
  const perf = M.perform(p, o.tempo ?? p.plan.tempo, { expressive: true }), n = src ? Math.round(src.loopS * SR) : o.seconds ? Math.round(o.seconds * SR) : Math.ceil((perf.lastOnset + p.tail) * SR);
  return { p, o, mask: M.maskingPlan(p, { seconds: n / SR, tempo: o.tempo, perf }) };
};
/** Every voice job `check` runs: the mix, each role the masking guard renders from the mix's performance, and the 24 kHz stems. */
const checkJobs = (M, piece, tempo, seconds, { loop = piece.plan.loop, stems = true } = {}) => {
  const { p, o, mask } = checkPlan(M, piece, tempo, seconds, loop);
  return [...M.voiceJobs(p, SR, o), ...(mask ? mask.roles.flatMap((r) => M.voiceJobs(p, SR, mask.opts(r))) : []), ...(stems ? M.voiceJobs(piece, STEM_SR, { tempo, seconds }) : [])];
};
/** A piece or a performance as plain data for a worker (its functions stay behind: a refit, the tempo map). */
const plain = (p) => { const { refit, shortForm, sec, ...rest } = p; void refit; void shortForm; void sec; return rest; };
/**
 * The guards' role renders and the stems, started on workers while the caller renders the mix: each
 * gets the voices it needs from the cache (so nothing is synthesized twice) and returns numbers only.
 * Resolves to { bands, stems } (either may be undefined: no melody, or stems not asked for).
 */
const startGuards = (M, cache, piece, tempo, seconds, { loop = piece.plan.loop, stems = true } = {}) => {
  if (THREADS() < 2) return Promise.resolve({});
  const { p, mask } = checkPlan(M, piece, tempo, seconds, loop), voices = (jobs) => jobs.map((j) => { const k = M.voiceJobKey(j); return [k, cache.get(k)]; }).filter(([, v]) => v);
  const msgs = [];
  if (mask) for (const r of mask.roles) { const { cache: _c, perf, ...opts } = mask.opts(r); msgs.push({ id: `band:${r}`, task: { kind: "band", piece: plain(p), sr: SR, spans: mask.spans, opts: { ...opts, perf: plain(perf) }, voices: voices(M.voiceJobs(p, SR, mask.opts(r))) } }); }
  if (stems) msgs.push({ id: "stems", task: { kind: "stems", piece: plain(piece), sr: STEM_SR, opts: { tempo, seconds }, voices: voices(M.voiceJobs(piece, STEM_SR, { tempo, seconds })) } });
  return pool(msgs, THREADS()).then((out) => ({ bands: mask ? Object.fromEntries(mask.roles.map((r) => [r, out.get(`band:${r}`).out])) : undefined, stems: out.get("stems")?.out }));
};

/** A piece by demo name, or from a module: "path.ts#export" (default export if no #). Material is composed. */
const getPiece = async (M, ref) => {
  if (!ref) throw new Error("name a piece: path/to/score.ts#export, or a demo (node tools/music.mjs list)");
  const fromDemo = M.DEMOS[ref] ?? M.FIXTURES[ref];
  let v;
  if (fromDemo) v = fromDemo;
  else {
    const [file, exp = "default"] = ref.split("#");
    if (!existsSync(resolve(file))) throw new Error(`no demo or module "${ref}" (demos: node tools/music.mjs list)`);
    const r = await build({ entryPoints: [resolve(file)], bundle: true, write: false, format: "esm", platform: "neutral", target: "es2022", logLevel: "error" });
    const mod = await import("data:text/javascript;base64," + Buffer.from(r.outputFiles[0].text).toString("base64"));
    v = mod[exp]; if (v === undefined) throw new Error(`${file} has no export "${exp}" (exports: ${Object.keys(mod).join(", ")})`);
  }
  const make = () => { const x = typeof v === "function" ? v() : v, p = x && x.sections && x.chords ? M.composePiece(x) : x; return ROOM_ID ? { ...p, plan: { ...p.plan, space: { ...p.plan.space, room: ROOM_ID } } } : p; };
  return { make, name: ref, demo: Boolean(fromDemo) };
};

export const writeWavFloat = (path, L, R, sr = SR) => {
  const n = L.length, data = Buffer.alloc(n * 8), h = Buffer.alloc(58);
  for (let i = 0; i < n; i++) { data.writeFloatLE(L[i], i * 8); data.writeFloatLE(R[i], i * 8 + 4); }
  h.write("RIFF", 0); h.writeUInt32LE(50 + data.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(18, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34); h.writeUInt16LE(0, 36);
  h.write("fact", 38); h.writeUInt32LE(4, 42); h.writeUInt32LE(n, 46); h.write("data", 50); h.writeUInt32LE(data.length, 54);
  writeFileSync(path, Buffer.concat([h, data]));
};
/** Decode ANY file through ffmpeg to float stereo 48 kHz: we meter what a player would decode. */
export const decode = (path) => {
  const buf = execFileSync("ffmpeg", ["-v", "error", "-i", path, "-vn", "-f", "f32le", "-acodec", "pcm_f32le", "-ac", "2", "-ar", String(SR), "pipe:1"], { maxBuffer: 1 << 30 });
  const f = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4), n = f.length / 2, L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = f[2 * i]; R[i] = f[2 * i + 1]; }
  return [L, R];
};

/** Independent cross-check: ffmpeg's own ebur128 summary (integrated, LRA, true peak). */
const ffmpegEbu = (path) => {
  const out = execFileSync("sh", ["-c", 'ffmpeg -hide_banner -nostats -i "$1" -vn -af ebur128=peak=true -f null - 2>&1', "sh", path], { encoding: "utf8", maxBuffer: 1 << 28 });
  const sum = out.slice(out.lastIndexOf("Summary:"));
  const g = (re) => { const m = re.exec(sum); return m ? Number(m[1]) : NaN; };
  return { I: g(/I:\s+(-?[\d.]+) LUFS/), LRA: g(/LRA:\s+(-?[\d.]+) LU/), TP: g(/Peak:\s+(-?[\d.]+) dBFS/) };
};
const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : "n/a");
const noteStats = (M, piece) => {
  const all = piece.parts.flatMap((p) => p.notes.filter((n) => n.role !== "drum"));
  const ps = all.map((n) => n.p), lo = Math.min(...ps), hi = Math.max(...ps);
  return { range: `${M.nameOf(lo)}-${M.nameOf(hi)}`, notes: all.length };
};
const onsetsFromData = (rendered) => {
  const ts = rendered.perf.parts.flatMap((p) => p.keys.map((k) => k.t)).sort((a, b) => a - b); let c = 0, last = -1;
  for (const t of ts) if (t - last > 0.03) { c++; last = t; } return c;
};

const renderOne = async (M, spec) => {
  let piece = spec.make ? spec.make() : (M.DEMOS[spec.piece] ?? M.FIXTURES[spec.piece])();
  let tempo = spec.tempo ?? piece.plan.tempo;
  let form;
  if (spec.fit) { const f = M.fitScore(piece, spec.seconds); piece = f.piece; tempo = f.tempo; form = `${f.form}: ${f.piece.plan.sections.map((x) => x.id).join(", ")}`; }
  loadSounds(M, piece);
  const opts = { seconds: spec.seconds, tempo };
  if (spec.flat) Object.assign(opts, { expressive: false, piano: M.PIANO_FLAT, flatVelocity: 0.6 });
  const loop = spec.loop || piece.plan.loop, go = (cache) => (loop ? M.renderLoop(piece, SR, { cache, stems: true }) : M.renderPiece(piece, SR, { ...opts, cache, stems: true }));
  const t0 = Date.now(), par = spec.cache && !spec.flat; if (par) await prewarm(M, spec.cache, checkJobs(M, piece, tempo, spec.seconds, { loop, stems: spec.stems }));
  const guards = par ? startGuards(M, spec.cache, piece, tempo, spec.seconds, { loop, stems: spec.stems }) : Promise.resolve({}); // on workers while the mix renders here
  const r = go(spec.cache), ms = Date.now() - t0;
  // determinism (--verify): a second, fully serial render without any cache must be bit-identical
  let same = null; if (spec.verify) { const r2 = go(undefined); same = r.L.length === r2.L.length && r.L.every((x, i) => x === r2.L[i]) && r.R.every((x, i) => x === r2.R[i]); }
  return { r, piece, tempo, ms, deterministic: same, form, guards: await guards };
};

const voicing = (M, piece, tempo, seconds, flat) => {
  // melody vs everything else, rendered separately, loudness difference in LU (both unmastered)
  const only = (roles) => ({ ...piece, parts: piece.parts.map((p) => ({ ...p, notes: p.notes.filter((n) => roles.includes(n.role)) })) });
  const base = { seconds, tempo, master: "none", ...(flat ? { expressive: false, piano: M.PIANO_FLAT, flatVelocity: 0.6 } : {}) };
  const a = M.renderPiece(only(["melody"]), SR, base), b = M.renderPiece(only(["accomp", "bass", "inner"]), SR, base);
  return M.loudness([a.L, a.R], SR).integrated - M.loudness([b.L, b.R], SR).integrated;
};

/** Per-note voicing: mean level (dB, from the piano's velocity->level law) of melody keys minus accompaniment keys. */
const noteVoicing = (r, piece) => {
  const lv = (v) => 20 * Math.log10(v < 0.6 ? Math.pow(v, 1.55) : Math.pow(0.6, 1.55) * Math.pow(v / 0.6, 0.9));
  const mel = [], acc = []; r.perf.parts.forEach((p, i) => { if (piece.parts[i].inst !== "piano") return; for (const k of p.keys) (k.role === "melody" ? mel : acc).push(lv(k.v)); });
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length; return mel.length && acc.length ? mean(mel) - mean(acc) : null;
};
const main = async () => {
  const [cmd, ...args] = process.argv.slice(2);
  const soundsAt = args.indexOf("--sounds");
  if (soundsAt >= 0 && (!args[soundsAt + 1] || args[soundsAt + 1].startsWith("--"))) throw new Error("--sounds needs a pack directory");
  SOUNDS_DIR = soundsAt >= 0 ? args.splice(soundsAt, 2)[1] : process.env.ANIDOODLE_SOUNDS || soundsDir();
  if (SOUNDS_DIR) SOUNDS_DIR = resolve(SOUNDS_DIR);
  const roomAt = args.indexOf("--room");
  if (roomAt >= 0 && (!args[roomAt + 1] || args[roomAt + 1].startsWith("--"))) throw new Error("--room needs a room id");
  ROOM_ID = roomAt >= 0 ? args.splice(roomAt, 2)[1] : undefined;
  const M = await load();
  const flag = (k) => args.includes(k), val = (k, d) => { const i = args.indexOf(k); return i >= 0 ? Number(args[i + 1]) : d; };
  if (cmd === "list") { console.log("demos (listening references and the novelty corpus, never a film's score):\n  " + Object.keys(M.DEMOS).join("\n  ") + "\nfixtures (tests):\n  " + Object.keys(M.FIXTURES).join("\n  ")); return; }
  if (cmd === "vocab") { if (args[0] === "--md") vocabMarkdown(M); else printVocab(M, args[0]); return; }
  if (cmd === "calibrate") {
    if (SOUNDS_DIR) { const manifest = JSON.parse(readFileSync(join(SOUNDS_DIR, "manifest.json"), "utf8")); loadBanks(M, SOUNDS_DIR, Object.keys(manifest.instruments)); console.log(JSON.stringify(Object.fromEntries(Object.keys(manifest.instruments).map((id) => [id, { hash: M.bankFor(id).hash, trim: M.bankFor(id).trim }])), null, 1)); }
    else if (flag("--voices")) calibrateVoices(M); else calibrate(M); return;
  }
  if (cmd === "novelty") {
    const refs = args.filter((a) => !a.startsWith("--") && !/^[\d.]+$/.test(a)), pcs = [];
    for (const ref of refs) pcs.push(await getPiece(M, ref));
    let fail = false;
    for (const pc of pcs) { const fam = Object.values(M.DEMO_FAMILIES).find((f) => f.includes(pc.name)) ?? [pc.name]; fail = !printNovelty(M, pc.name, M.novelty(pc.make(), M.DEMOS, fam, val("--threshold", undefined)), "shipped pieces") || fail; }
    if (pcs.length > 1) { // pairwise: scores meant for different products must not be siblings either
      const corpus = Object.fromEntries(pcs.map((p) => [p.name, p.make]));
      for (const pc of pcs) fail = !printNovelty(M, pc.name, M.novelty(pc.make(), corpus, [pc.name], val("--threshold", undefined)), "each other") || fail;
    }
    if (fail) process.exitCode = 1; return;
  }
  if (cmd === "craft") {
    let fail = false;
    for (const ref of args.filter((a) => !a.startsWith("--"))) { const piece = (await getPiece(M, ref)).make(), r = M.craftReport(piece);
      if (flag("--json")) console.log(JSON.stringify({ piece: ref, ...r }, null, 1)); else console.log(`${ref}\n${M.craftText(r)}`);
      fail = fail || r.findings.some((f) => f.level === "error"); }
    if (fail) process.exitCode = 1; return;
  }
  if (cmd === "check") {
    const pc = await getPiece(M, args[0]); let piece = pc.make(), tempo = piece.plan.tempo, seconds = val("--seconds", undefined);
    if (flag("--fit")) { const f = M.fitScore(piece, seconds); piece = f.piece; tempo = f.tempo; }
    loadSounds(M, piece); printSounds(M, piece);
    const T = process.env.ANIDOODLE_TIMING ? (l) => console.error(`[timing] ${l} ${((Date.now() - T0) / 1000).toFixed(1)} s`) : () => {}, T0 = Date.now();
    const cache = new Map(); await prewarm(M, cache, checkJobs(M, piece, tempo, seconds)); T("voices"); // every voice once, in parallel
    const pending = startGuards(M, cache, piece, tempo, seconds).then((x) => { T("guard renders + stems"); return x; }); // the guards' role renders and the stems, on workers meanwhile
    const r = piece.plan.loop ? M.renderLoop(piece, SR, { cache, stems: true }) : M.renderPiece(piece, SR, { seconds, tempo, cache, stems: true }); T("mix"); const g = await pending; // stems: the peak note names the parts that pile up
    const ok = [report(M, r, piece, cache, g.bands), printStems(M, piece, tempo, seconds, cache, g.stems)?.ok !== false];
    T("report + stems"); { const cr = M.craftReport(piece, { centroidHz: M.centroid([r.L, r.R], SR).mean }); console.log(M.craftText(cr)); ok.push(!cr.findings.some((f) => f.level === "error")); } T("craft");
    { const pay = val("--payoff", undefined); if (flag("--payoff") && !(pay >= 0)) { console.error("music: --payoff takes the second the picture pays off, e.g. --payoff 13.5"); process.exit(2); } console.log(M.arcText(M.arcReport([r.L, r.R], SR, { loop: !!piece.plan.loop, payoffS: pay }))); } // the shape of the finished sound: advisory, never fails the check
    if (!pc.demo) { const fam = [args[0]]; ok.push(printNovelty(M, args[0], M.novelty(piece, M.DEMOS, fam), "shipped pieces")); }
    console.log(ok.every(Boolean) ? "CHECK PASS: now a human listens (an mp3 or wav on a page)" : "CHECK FAIL: fix the items above, then run check again");
    if (!ok.every(Boolean)) process.exitCode = 1; return;
  }
  if (cmd === "render") {
    const [name, out] = args, pc = await getPiece(M, name), cache = new Map();
    const { r, tempo, ms, deterministic, piece, guards } = await renderOne(M, { make: pc.make, seconds: val("--seconds", undefined), tempo: val("--tempo", undefined), flat: flag("--flat"), fit: flag("--fit"), loop: flag("--loop"), cache, verify: flag("--verify"), stems: flag("--stems") });
    printSounds(M, piece);
    // an mp3 is encoded from a private intermediate next to it (never x.wav: rendering x.mp3 must not touch an x.wav you already have)
    const mp3 = out.endsWith(".mp3"), wav = mp3 ? join(dirname(resolve(out)), `.${basename(out)}.${process.pid}.tmp.wav`) : out;
    if (mp3 && (piece.plan.loop || flag("--loop"))) console.log("NOTE: mp3 is not gapless (encoder padding clicks at the loop point). Ship loops as .wav (or ogg/m4a with gapless metadata).");
    writeWavFloat(wav, r.L, r.R);
    if (mp3) { try { execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "wav", "-i", wav, "-c:a", "libmp3lame", "-b:a", "256k", out]); } finally { if (existsSync(wav)) unlinkSync(wav); } }
    const m = M.measure(decode(out), SR);
    console.log(JSON.stringify({ file: out, tempo, renderMs: ms, deterministic, gainDb: r.gainDb, loopS: r.loopS, ...m, shortTerm: undefined }, null, 1));
    let good = report(M, r, piece, cache, guards.bands);
    if (flag("--stems")) good = printStems(M, piece, tempo, val("--seconds", undefined), cache, guards.stems).ok && good;
    if (!good) process.exitCode = 1;
    return;
  }
  if (cmd === "stems") {
    const [name] = args; let piece = (await getPiece(M, name)).make(), tempo = piece.plan.tempo, seconds = val("--seconds", undefined);
    if (flag("--fit")) { const f = M.fitScore(piece, seconds); piece = f.piece; tempo = f.tempo; }
    loadSounds(M, piece);
    const cache = new Map(); await prewarm(M, cache, M.voiceJobs(piece, STEM_SR, { tempo, seconds }));
    printStems(M, piece, tempo, seconds, cache); return;
  }
  if (cmd === "meter") { for (const f of args) { const m = M.measure(decode(f), SR), ff = ffmpegEbu(f); console.log(basename(f), `LUFS ${fmt(m.lufs)} (ffmpeg ${fmt(ff.I)}) LRA ${fmt(m.lra)} (ffmpeg ${fmt(ff.LRA)}) TP ${fmt(m.dbtp)} dBTP (ffmpeg ${fmt(ff.TP)}) onsets/s ${fmt(m.onsetsPerS, 2)} centroid ${fmt(m.centroidHz, 0)} Hz (energy-wtd ${fmt(m.centroidEnergyHz, 0)}) dur ${fmt(m.durationS, 2)} lastOnset ${fmt(m.lastOnsetS, 2)}`); } return; }
  if (cmd === "score") { console.log(M.scoreText((await getPiece(M, args[0])).make())); return; }
  if (cmd === "probe") { console.log(JSON.stringify(probe(M), null, 1)); return; }
  if (cmd === "samples") {
    const dir = resolve(args[0]);
    const set = [
      { file: "piano-8s", piece: "pianoPhrase8", seconds: 8, tempo: 66, emotion: "tender" },
      { file: "piano-flat-baseline-8s", piece: "pianoPhrase8", seconds: 8, tempo: 66, flat: true, emotion: "(contrast: MIDI-flat)" },
      { file: "nocturne-45s", piece: "nocturne", seconds: 45, fit: true, emotion: "tender -> swelling -> hush" },
      { file: "sampler-musicbox-joy-8s", piece: "musicBoxJoy", seconds: 8, emotion: "joy" },
      { file: "sampler-minor-piano-melancholy-8s", piece: "minorPianoMelancholy", seconds: 8, emotion: "melancholy" },
      { file: "sampler-cinematic-awe-8s", piece: "cinematicAwe", seconds: 8, emotion: "awe" },
      { file: "sampler-chiptune-playful-8s", piece: "chiptunePlayful", seconds: 8, emotion: "playful" },
      { file: "sampler-lofi-nostalgic-8s", piece: "lofiNostalgic", seconds: 8, emotion: "nostalgic" },
      { file: "sampler-marimba-curious-8s", piece: "marimbaCurious", seconds: 8, emotion: "curious" },
      { file: "sampler-harp-tender-8s", piece: "harpTender", seconds: 8, emotion: "tender (lullaby)" },
      { file: "sampler-guitar-wistful-8s", piece: "guitarWistful", seconds: 8, emotion: "wistful" },
      { file: "sampler-celesta-wonder-8s", piece: "celestaWonder", seconds: 8, emotion: "wonder" },
      { file: "sampler-bells-epiano-hopeful-8s", piece: "bellsHopeful", seconds: 8, emotion: "hopeful" },
      { file: "sampler-drive-electronic-8s", piece: "driveElectronic", seconds: 8, emotion: "drive / energy" },
      { file: "sampler-folk-calm-8s", piece: "folkCalm", seconds: 8, emotion: "calm (pastoral)" },
      { file: "fit-theme-15s", piece: "nocturne", seconds: 15, fit: true, emotion: "tender (auto short form)" },
      { file: "fit-theme-60s", piece: "nocturne", seconds: 60, fit: true, emotion: "tender -> swelling -> hush" },
      { file: "fit-theme-180s", piece: "nocturne", seconds: 180, fit: true, emotion: "tender -> swelling -> hush", m4aOnly: true, noMasking: true },
      { file: "fixtures/ghost-fixture-HATED", piece: "ghostFixture", seconds: 35, emotion: "(hated fixture: must FAIL the ghost guard)" },
    ].filter((s) => !args[1] || s.file.includes(args[1]));
    mkdirSync(join(dir, "fixtures"), { recursive: true });
    const results = [];
    for (const s of set) {
      const cache = new Map(), { r, piece, tempo, ms, deterministic, form } = await renderOne(M, { ...s, verify: true, cache, stems: false });
      const g = M.guardReport(r, SR, s.seconds, { masking: !s.noMasking, cache });
      const wav = join(dir, s.file + ".wav"); writeWavFloat(wav, r.L, r.R);
      execFileSync("ffmpeg", ["-v", "error", "-y", "-i", wav, "-c:a", "aac", "-b:a", "192k", join(dir, s.file + ".m4a")]);
      const m = M.measure(decode(wav), SR), ff = ffmpegEbu(wav), mm = M.measure(decode(join(dir, s.file + ".m4a")), SR);
      if (s.m4aOnly) unlinkSync(wav);
      const hasPiano = piece.parts.some((p) => p.inst === "piano" && p.notes.some((n) => n.role === "melody"));
      const res = { file: s.file, emotion: s.emotion, form: form ?? "as written", sections: piece.plan.sections.map((x) => x.id).join(","), guards: g, piece: piece.title, style: piece.plan.style, key: piece.plan.sections.map((x) => `${x.key} ${x.mode} (${Array.isArray(x.mood) ? x.mood.slice(0, 2).join("+") : x.mood})`).join(" / "), meter: piece.plan.meter, tempo: +tempo.toFixed(2), renderMs: ms, deterministic,
        gainDb: +r.gainDb.toFixed(2), master: r.masterMode, lufs: m.lufs, ffmpegLufs: ff.I, lra: m.lra, ffmpegLra: ff.LRA, dbtp: m.dbtp, ffmpegTp: ff.TP, samplePeakDb: m.samplePeakDb, onsetsPerS: m.onsetsPerS, dataOnsetsPerS: onsetsFromData(r) / m.durationS,
        centroidHz: m.centroidHz, centroidEnergyHz: m.centroidEnergyHz, durationS: m.durationS, lastOnsetDetectedS: m.lastOnsetS, lastOnsetDataS: r.perf.lastOnset, ...noteStats(M, piece),
        meanMelodyLeadMs: r.perf.meanLeadMs, voicingNoteDb: hasPiano ? noteVoicing(r, piece) : null, pedalChanges: piece.parts.some((p) => p.inst === "piano") && !s.flat ? r.perf.pedal.length : 0, voicingLU: hasPiano ? voicing(M, piece, tempo, s.seconds, s.flat) : null, m4a: { lufs: mm.lufs, dbtp: mm.dbtp }, problems: M.planProblems(piece),
        shortTerm: m.shortTerm.filter((_, i) => i % 10 === 0).map((x) => +x.toFixed(1)) };
      results.push(res);
      console.log(`${s.file}: LUFS ${fmt(m.lufs)} (ff ${fmt(ff.I)}) LRA ${fmt(m.lra)} (ff ${fmt(ff.LRA)}) TP ${fmt(m.dbtp)} (ff ${fmt(ff.TP)}) onsets/s ${fmt(m.onsetsPerS, 2)} [data ${fmt(res.dataOnsetsPerS, 2)}] centroid ${fmt(m.centroidHz, 0)} Hz range ${res.range} tempo ${fmt(tempo, 1)} voicing ${fmt(res.voicingLU)} LU / per-note ${fmt(res.voicingNoteDb)} dB lead ${fmt(res.meanMelodyLeadMs)} ms render ${ms} ms det ${deterministic} problems ${res.problems.length} | ghost ${g.ghost.pass ? "PASS" : "FAIL"} (${g.ghost.failures}/${g.ghost.windows}) reverb ${g.reverb.pass ? "PASS" : "FAIL"} ${fmt(g.reverb.worstDb)} dB masking ${g.masking ? `${g.masking.pass ? "PASS" : "FAIL"} ${Math.round(g.masking.shareOfBarsClear * 100)}%` : "n/a"} | form ${form ?? "-"}`);
    }
    // Optional measurement-only reference film, never shipped: point ANIDOODLE_MUSIC_REF at a local file.
    const refPath = process.env.ANIDOODLE_MUSIC_REF && existsSync(process.env.ANIDOODLE_MUSIC_REF) ? process.env.ANIDOODLE_MUSIC_REF : null;
    let reference = null;
    if (refPath) { const dec = decode(refPath), m = M.measure(dec, SR), ff = ffmpegEbu(refPath), gh = M.ghostCheck(dec, SR); reference = { ghost: { pass: gh.pass, failures: gh.failures, windows: gh.windows.map((w) => ({ from: w.from, onsetsPerBeat: +w.onsetsPerBeat.toFixed(2), sustainedShare: +w.sustainedShare.toFixed(2) })) }, file: "ANIDOODLE_MUSIC_REF (reference, measurement only)", lufs: m.lufs, ffmpegLufs: ff.I, lra: m.lra, ffmpegLra: ff.LRA, dbtp: m.dbtp, onsetsPerS: m.onsetsPerS, centroidHz: m.centroidHz, centroidEnergyHz: m.centroidEnergyHz, durationS: m.durationS, lastOnsetDetectedS: m.lastOnsetS, shortTerm: m.shortTerm.filter((_, i) => i % 10 === 0).map((x) => +x.toFixed(1)) };
      console.log(`REFERENCE ghost ${gh.pass ? "PASS" : "FAIL"}: LUFS ${fmt(m.lufs)} (ff ${fmt(ff.I)}) LRA ${fmt(m.lra)} (ff ${fmt(ff.LRA)}) onsets/s ${fmt(m.onsetsPerS, 2)} centroid ${fmt(m.centroidHz, 0)} (energy ${fmt(m.centroidEnergyHz, 0)})`); }
    const prev = existsSync(join(dir, "meters.json")) && args[1] ? JSON.parse(readFileSync(join(dir, "meters.json"), "utf8")) : null;
    const merged = prev ? { ...prev, results: [...prev.results.filter((x) => !results.some((y) => y.file === x.file)), ...results], reference: reference ?? prev.reference } : { generated: "tools/music.mjs samples", sampleRate: SR, results, reference, probe: probe(M) };
    writeFileSync(join(dir, "meters.json"), JSON.stringify(merged, null, 1));
  }
};

const calibrate = (M) => {
  const trim = {}, fix = {};
  for (const v of Object.values(M.VOCAB)) {
    // calibrated (listened) styles: the targets never move, the voices are trimmed to them (sound v2 changed their levels); no target fix
    trim[v.id] = {}; fix[v.id] = {}; M.VOCAB_TARGET_FIX[v.id] = {};
    for (let pass = 0; pass < 3; pass++) {
      M.VOCAB_TRIM[v.id] = trim[v.id];
      const b = M.measureStems(M.composePiece(M.testMaterial(v)), STEM_SR);
      for (const r of b.rows) if (r.offDb !== null && Number.isFinite(r.offDb)) trim[v.id][r.id] = +Math.max(-18, Math.min(18, (trim[v.id][r.id] ?? 0) - r.offDb)).toFixed(1); // capped: past 18 dB the gain is not the problem (12 under the v1 meter, whose tails read sparse parts low)
      if (pass === 2) { if (!v.calibrated) for (const r of b.rows) if (r.offDb !== null && Math.abs(r.offDb) > 1) fix[v.id][r.id] = +r.offDb.toFixed(1);
        console.log(v.id.padEnd(14), b.rows.filter((r) => r.offDb !== null).map((r) => `${r.id} ${r.offDb >= 0 ? "+" : ""}${r.offDb.toFixed(1)}`).join("  ")); }
    }
  }
  const file = join(here, "../src/canvas-core/music/vocabTrim.ts"), head = readFileSync(file, "utf8").split("export const VOCAB_TRIM")[0], j = (x) => JSON.stringify(x, null, 1).replace(/"(\w+)":/g, "$1:");
  writeFileSync(file, `${head}export const VOCAB_TRIM: Record<string, Partial<Record<Slot, number>>> = ${j(trim)};\n/** Where an 18 dB trim could not reach the target (long-decaying plucks read low as active RMS), the target moves to where the voice sits. */\nexport const VOCAB_TARGET_FIX: Record<string, Partial<Record<Slot, number>>> = ${j(fix)};\n`);
  console.log(`wrote ${file}`);
};

/**
 * Alternates and your own voices, on the same scale as the palette (src/canvas-core/music/vocabVoices.ts):
 * each alternate's trim to its slot's stem target (the style's number plus its fix) on the style's
 * test signal, two passes (drive and amps are not linear), capped at +-30 dB; and each instrument's
 * stem level at gainDb 0 on each slot's test line (cinematic test signal with the counter line an octave down;
 * drums on the lo-fi electronic kit; default options), from which
 * compose places a composer's own voice at the slot's target.
 */
const calibrateVoices = (M) => {
  const stem = (p, slot) => { const r = M.renderPiece(p, STEM_SR, { stems: true, master: "none", only: (pt) => pt.id === slot }), x = r.stems[slot]; return x ? M.stemRms(x[0], x[1], STEM_SR) : -Infinity; };
  const alt = {}, altFix = {}; for (const T of [M.VOCAB_ALT_TRIM, M.VOCAB_ALT_TARGET_FIX, M.INST_LEVEL, M.INST_REGISTER, M.SLOT_REF_PITCH]) for (const k of Object.keys(T)) delete T[k];
  for (const v of Object.values(M.VOCAB)) { alt[v.id] = {};
    for (const [slot, alts] of Object.entries(v.alternates)) for (const name of Object.keys(alts)) {
      let trim = 0; (M.VOCAB_ALT_TRIM[v.id] ??= {})[slot] ??= {};
      for (let pass = 0; pass < 2; pass++) {
        M.VOCAB_ALT_TRIM[v.id][slot][name] = trim;
        const p = M.composePiece({ ...M.testMaterial(v, { bars: 4, lines: slot === "counter" || slot === "arp" ? [slot] : [] }), voices: { [slot]: name } }), t = p.stemTargets[slot], rms = stem(p, slot);
        if (t === undefined || !Number.isFinite(rms)) break;
        trim = +Math.max(-30, Math.min(30, trim + t - rms)).toFixed(1);
      }
      (alt[v.id][slot] ??= {})[name] = trim;
      // where a 30 dB trim cannot reach the target (a piano's top octave on a counter target set for a harp), the target moves to where the voice sits, as for the palette
      const p = M.composePiece({ ...M.testMaterial(v, { bars: 4, lines: slot === "counter" || slot === "arp" ? [slot] : [] }), voices: { [slot]: name } }), off = p.stemTargets[slot] === undefined ? 0 : stem(p, slot) - p.stemTargets[slot];
      if (Math.abs(off) > 1) ((altFix[v.id] ??= {})[slot] ??= {})[name] = +off.toFixed(1);
      console.log(`${v.id.padEnd(14)} ${slot.padEnd(8)} ${name.padEnd(10)} ${trim >= 0 ? "+" : ""}${trim}${Math.abs(off) > 1 ? `  (target moved ${off.toFixed(1)})` : ""}`);
    } }
  const inst = {}, reg = {}, refPitch = {};
  const DRUM = ["kick", "snare", "hat", "noiseDrum", "timpani"], ALL = ["piano", "musicBox", "bell", "celesta", "marimba", "vibes", "harp", "guitar", "strings", "fmBell", "ePiano", "pulse", "triangle", "noiseDrum", "kick", "snare", "hat", "bass", "warmPad", "softPluck", "sub", "organ", "brass", "woodwind", "choir", "timpani", "leadSynth", "bowedSolo", "glockenspiel", "wurlitzer", "pipeOrgan"];
  const role = { chords: "accomp", arp: "accomp", lead: "melody", counter: "color", bass: "bass", kick: "drum", snare: "drum", hat: "drum" };
  // pitched voices on the cinematic test signal, the counter line an octave lower than the palette's (octaves 5-6: where a composer's
  // own counter line usually sits; the register moves some instruments' level by 8 dB); drums on the lo-fi electronic kit's groove
  const ref = M.testMaterial(M.VOCAB.cinematic, { bars: 4, lines: ["counter", "arp"] }), kit = M.testMaterial(M.VOCAB.lofiElectronic, { bars: 4 });
  const lower = { ...ref, sections: ref.sections.map((x) => ({ ...x, counter: x.counter.map((b) => b.replace(/([A-G][#b]?)(\d)/g, (_, n, o) => `${n}${+o - 1}`)) })) };
  const median = (ns) => { const ps = ns.map((n) => n.p).sort((a, b) => a - b); return ps[Math.floor(ps.length / 2)]; };
  for (const slot of ["chords", "lead", "counter", "bass", "arp"]) refPitch[slot] = median(M.composePiece(lower).parts.find((x) => x.id === slot).notes);
  // the register curve: the lead line moved by whole octaves (level at each median pitch), so your own voice is placed for the register it plays in
  const moved = (k) => ({ ...lower, sections: lower.sections.map((x) => ({ ...x, lead: x.lead.map((b) => b.replace(/([A-G][#b]?)(\d)/g, (_, n, o) => `${n}${+o + k}`)) })) });
  for (const i of ALL) { inst[i] = {};
    for (const slot of DRUM.includes(i) ? ["kick", "snare", "hat"] : ["chords", "lead", "counter", "bass", "arp"]) {
      const p = M.composePiece({ ...(DRUM.includes(i) ? kit : lower), voices: { [slot]: { inst: i, role: role[slot], gainDb: 0 } } }), rms = stem(p, slot);
      if (Number.isFinite(rms)) inst[i][slot] = +rms.toFixed(1);
    }
    if (!DRUM.includes(i)) { reg[i] = []; for (const k of [-3, -2, -1, 0, 1, 2]) { const p = M.composePiece({ ...moved(k), voices: { lead: { inst: i, role: "melody", gainDb: 0 } } }), rms = stem(p, "lead");
      if (Number.isFinite(rms)) reg[i].push([refPitch.lead + 12 * k, +(rms - inst[i].lead).toFixed(1)]); } }
    console.log(`${i.padEnd(13)} ${Object.entries(inst[i]).map(([k, x]) => `${k} ${x}`).join("  ")}${reg[i] ? `  | register ${reg[i].map(([p, d]) => `${M.nameOf(p)} ${d >= 0 ? "+" : ""}${d}`).join(" ")}` : ""}`); }
  const file = join(here, "../src/canvas-core/music/vocabVoices.ts"), head = readFileSync(file, "utf8").split("export const VOCAB_ALT_TRIM")[0], j = (x) => JSON.stringify(x, null, 1).replace(/"(\w+)":/g, "$1:");
  writeFileSync(file, `${head}export const VOCAB_ALT_TRIM: Record<string, Partial<Record<Slot, Record<string, number>>>> = ${j(alt)};\nexport const VOCAB_ALT_TARGET_FIX: Record<string, Partial<Record<Slot, Record<string, number>>>> = ${j(altFix)};\nexport const INST_LEVEL: Record<string, Partial<Record<Slot, number>>> = ${j(inst)};\nexport const INST_REGISTER: Record<string, [number, number][]> = ${JSON.stringify(reg)};\nexport const SLOT_REF_PITCH: Partial<Record<Slot, number>> = ${j(refPitch)};\n`);
  console.log(`wrote ${file}`);
};

const printVocab = (M, id) => {
  if (!id) { for (const v of Object.values(M.VOCAB)) console.log(`${v.id.padEnd(15)} ${v.name}: ${v.atmosphere}\n${"".padEnd(16)}grooves: ${v.grooves.join(", ") || "none (no drums)"} | moods: ${v.moods.join(", ")} | ${v.tempo.join("-")} bpm ${v.meters.join(" ")}`);
    console.log("\ngroove families:"); for (const [k, d] of Object.entries(M.GROOVE_FAMILIES)) console.log(`  ${k.padEnd(10)} ${d}`);
    console.log("\nsection kinds:"); for (const [k, d] of Object.entries(M.KINDS)) console.log(`  ${k.padEnd(10)} ${d.what}`); return; }
  const v = M.VOCAB[id]; if (!v) throw new Error(`no style "${id}" (have: ${Object.keys(M.VOCAB).join(", ")})`);
  console.log(`${v.name} (${v.id}): ${v.atmosphere}\ntempo ${v.tempo.join("-")} bpm, meters ${v.meters.join(" ")}, swing ${v.swing.join("-")}, moods ${v.moods.join(", ")}`);
  const tgt = (slot) => (v.stemTargets[slot] === undefined ? "-" : +(v.stemTargets[slot] + (M.VOCAB_TARGET_FIX[v.id]?.[slot] ?? 0)).toFixed(1));
  console.log("palette (slot: instrument, stem target dB). Every voice, alternate or your own, is calibrated to its slot's target:\n  levels.<slot> and your own voice's gainDb are dB offsets from there (0 = at the target)");
  for (const [slot, x] of Object.entries(v.palette)) console.log(`  ${slot.padEnd(8)} ${x.inst.padEnd(10)} ${String(tgt(slot)).padStart(6)} dB${Object.keys(v.alternates[slot] ?? {}).length ? `   alternates: ${Object.entries(v.alternates[slot]).map(([n, a]) => `${n} (${a.inst})`).join(", ")}` : ""}`);
  for (const [slot, alts] of Object.entries(v.alternates)) if (!v.palette[slot]) console.log(`  ${slot.padEnd(8)} (no default) alternates: ${Object.entries(alts).map(([n, a]) => `${n} (${a.inst})`).join(", ")}`);
  console.log(`stem targets ${v.calibrated ? "calibrated on a listened score" : "are starting numbers (uncalibrated: flags are advisory until a human listens)"}`);
  console.log(`grooves: ${v.grooves.map((g) => `${g} (${M.GROOVE_FAMILIES[g]})`).join("\n         ") || "none"}`);
  for (const [k, x] of Object.entries(v.harmony)) console.log(`harmony.${k}: ${Array.isArray(x) ? x.join(", ") : x}`);
  for (const [k, x] of Object.entries(v.melody)) console.log(`melody.${k}: ${x}`);
  for (const [k, x] of Object.entries(v.arrangement)) console.log(`arrangement.${k}: ${x}`);
  console.log(`mix: ${M.describeMix(v.id)}`);
  console.log(`avoid: ${v.avoid}`);
};

/** references/music/styles/vocabularies.md, generated from the data so the page never drifts from the code. */
const vocabMarkdown = (M) => {
  const o = ["# Style vocabularies", "", "> GENERATED by `node tools/music.mjs vocab --md` from `engine/src/canvas-core/music/vocab.ts` and `vocabMore.ts`. Do not edit by hand.", "> A style is a vocabulary: sound, grooves, harmony language, melody rules, arrangement grammar. It never", "> contains notes. You compose the notes ([../compose.md](../compose.md)).", "",
    "**Levels are one scale.** Every voice in a slot, the palette's, an alternate or your own, is calibrated to the slot's stem target (the \"Stem target dB\" column: the level the stem meter reads when the part plays). Everything you set is a dB offset from there: `levels: { lead: 2 }` is two dB over the target, and your own voice's `gainDb` works the same way (`voices: { counter: { inst: \"strings\", role: \"color\" } }` sits at the counter target; `gainDb: -3` sits 3 dB under it). Engine gains (`Voice.gainDb` inside vocab.ts) are internal and never on this scale.", "",
    "| Style | Atmosphere | Tempo, meters | Moods | Grooves |", "|---|---|---|---|---|"];
  for (const v of Object.values(M.VOCAB)) o.push(`| \`${v.id}\` | ${v.atmosphere} | ${v.tempo.join("-")} bpm; ${v.meters.join(", ")} | ${v.moods.join(", ")} | ${v.grooves.join(", ") || "none (no drums)"} |`);
  o.push("", "## Groove families", "", "Pick a family and its knobs (`density`, `variation`, `fill`, `accent`); the seed varies every bar. Or write the drum bars yourself.", "");
  for (const [k, d] of Object.entries(M.GROOVE_FAMILIES)) o.push(`- \`${k}\`: ${d}`);
  o.push("", "## Section kinds (the arrangement grammar)", "", "A kind decides which layers may sound; your lines sound only where you write them.", "");
  for (const [k, d] of Object.entries(M.KINDS)) o.push(`- \`${k}\` (drums: ${d.drums ?? "none"}, bass: ${d.bass ? "yes" : "no"}): ${d.what}`);
  for (const v of Object.values(M.VOCAB)) {
    o.push("", `## \`${v.id}\`: ${v.name}`, "", `${v.atmosphere}. Tempo ${v.tempo.join("-")} bpm, meters ${v.meters.join(", ")}, swing ${v.swing.join("-")}.`, "", "| Slot | Voice | Stem target dB | Alternates (name, voice) |", "|---|---|---|---|");
    const alts = (slot) => Object.entries(v.alternates[slot] ?? {}).map(([n, a]) => `${n} (\`${a.inst}\`)`).join(", ") || "-", tg = (slot) => (v.stemTargets[slot] === undefined ? "-" : +(v.stemTargets[slot] + (M.VOCAB_TARGET_FIX[v.id]?.[slot] ?? 0)).toFixed(1));
    for (const [slot, x] of Object.entries(v.palette)) o.push(`| ${slot} | \`${x.inst}\` | ${tg(slot)} | ${alts(slot)} |`);
    for (const slot of Object.keys(v.alternates)) if (!v.palette[slot]) o.push(`| ${slot} | (none) | ${tg(slot)} | ${alts(slot)} |`);
    o.push("", `Stem targets: ${v.calibrated ? "calibrated on a listened score." : "starting numbers from a neutral test signal (advisory until a human listens)."}`, "");
    o.push(`- **Harmony language.** Modes: ${v.harmony.modes.join(", ")}. Qualities: ${v.harmony.qualities}. Tendencies: ${v.harmony.tendencies}. Harmonic rhythm: ${v.harmony.rhythm}. Voicing: ${v.harmony.voicing}. Tension and release: ${v.harmony.tension}.`);
    o.push(`- **Melody.** Range ${v.melody.range}. Contour: ${v.melody.contour}. Density: ${v.melody.density}. Motif: ${v.melody.motif}.`);
    o.push(`- **Arrangement.** ${v.arrangement.shape}. Transitions: ${v.arrangement.transitions}. Endings: ${v.arrangement.endings}.`);
    o.push(`- **Grooves:** ${v.grooves.join(", ") || "none"}. **Avoid:** ${v.avoid}.`);
  }
  console.log(o.join("\n"));
};

/** Key/mode problems, composer warnings, the master (did the peak cap stop it short?), and the guards. Returns pass. */
const report = (M, r, piece, cache, bands) => {
  if (ROOM_ID || (SOUNDS_DIR && r.mixReport?.space)) console.log(`space    ${r.mixReport?.space ?? "legacy space"}`);
  let ok = true; const probs = M.planProblems(piece), warn = piece.warnings ?? [];
  for (const p of probs) console.log(`PROBLEM  ${p}`); ok = ok && !probs.length;
  for (const w of warn) console.log(`WARNING  ${w}`);
  const lu = M.loudness([r.L, r.R], SR).integrated, tp = M.truePeak([r.L, r.R]).dbtp, target = r.masterMode === "dense" ? -14 : r.masterMode === "gentle" ? -16 : NaN;
  console.log(`master   ${r.masterMode}: ${fmt(lu)} LUFS (target ${fmt(target)}), true peak ${fmt(tp, 2)} dBTP`);
  if (lu < target - 0.5) { const pk = M.peakReport(r, SR), who = pk.parts.map((x, i) => `${x.id}${x.notes.length ? ` ${x.notes.join(" ")}` : ""} (${i ? `${fmt(x.db - pk.parts[0].db)} dB` : "loudest"})`).join(", ");
    console.log(`NOTE     the master stopped ${fmt(target - lu)} dB short of its target: the true-peak ceiling (-1 dBTP) capped the gain. The peak is at bar ${pk.bar} beat ${pk.beat} (${fmt(pk.sec, 2)} s)${who ? `, where ${who} pile up` : ""}. Peaks are a composing problem: stagger the bass under that downbeat, roll the big chord, don't double the climax note, soften the one loudest hit.`); }
  const g = M.guardReport(r, SR, r.L.length / SR, { cache, bands });
  console.log(`guards   ghost ${g.ghost.pass ? "PASS" : "FAIL"} (${g.ghost.failures}/${g.ghost.windows} windows formless) | reverb ${g.reverb.pass ? "PASS" : "FAIL"} (worst tail ${fmt(g.reverb.worstDb)} dB vs dry) | masking ${g.masking ? `${g.masking.pass ? "PASS" : "FAIL"} (melody clear in ${Math.round(g.masking.shareOfBarsClear * 100)} % of bars, worst ${fmt(g.masking.worstMarginDb)} dB)` : "n/a (no melody)"}`);
  if (g.masking && !g.masking.pass) console.log(`FIX      masking: the melody must beat every other part in 500 Hz-4 kHz by 3 dB in 80 % of its bars. Guards win over stem targets: raise the lead (levels.lead, up to +${M.LEAD_HEADROOM_DB} dB over its target is allowed), thin or lower what sits in its register, or move it.`);
  if (!g.ghost.pass) console.log("FIX      ghost: sustained sound with too few onsets and no cadence. Add a rhythmic layer or motif, shorten tails, cadence.");
  if (!g.reverb.pass) console.log("FIX      reverb: the late tail sits too close to the dry sound. Lower sends (voices' send) or the space mood control.");
  return ok && g.ghost.pass && g.reverb.pass && (!g.masking || g.masking.pass);
};
const printNovelty = (M, name, v, what) => {
  console.log(`novelty: ${name} vs ${v.rows.length} ${what} (fail above ${v.threshold}, on any reused 6-note melody fragment, or on an 8-note melody shape quoted in any key, meter or rhythm)`);
  const shown = [...v.rows.slice(0, 5), ...v.rows.slice(5).filter((r) => r.reusedFragments || r.quotedShapes)];
  for (const r of shown) console.log(`  ${r.name.padEnd(22)} ${r.score.toFixed(3)}  ${r.reusedFragments ? `REUSED ${r.reusedFragments} fragment(s)  ` : ""}${r.quotedShapes ? `QUOTED ${r.quotedShapes} melody shape(s)  ` : ""}${Object.entries(r.by).map(([k, x]) => `${k} ${x}`).join(" ")}`);
  const q = v.rows.find((r) => r.quotedShapes || r.reusedFragments);
  console.log(v.pass ? "novelty PASS" : q && q.score <= v.threshold ? `novelty FAIL: the melody quotes ${q.name} (the same intervals in a row, whatever the key, meter or rhythm). Write your own line.` : `novelty FAIL: too close to ${v.worst.name}. Change what the numbers point at (the lead's rhythm, the contour, the groove, the chord colours, the form), not just the key.`);
  console.log("  (idioms are fine: a ii-V-I, a plagal cadence, a two-chord vamp are vocabulary. What fails is the same music: a multi-bar progression WITH its rhythm, groove, contour and form, or a quoted melody.)");
  return v.pass;
};

/** Stem balance: each part's unmastered stem level (mid, gated 20 ms blocks: meter.stemRms) vs piece.stemTargets. Measured at 24 kHz, as the targets were. */
const STEM_SR = 24000;
const printStems = (M, piece, tempo, seconds, cache, measured) => {
  const b = measured ?? M.measureStems(piece, STEM_SR, { tempo, seconds, cache });
  console.log(`stem balance: ${piece.title} (unmastered stem RMS of the mid over the blocks where it plays, vs target, +-${b.tolDb} dB; the lead may sit up to +${b.headroom.lead ?? 0} dB more for the masking guard; targets already include your mood controls' shifts)`);
  for (const r of b.rows) console.log(`  ${r.id.padEnd(9)} ${fmt(r.rmsDb).padStart(6)} dB  ${r.targetDb === null ? "(no target)" : `target ${fmt(r.targetDb).padStart(6)}  off ${(r.offDb >= 0 ? "+" : "") + fmt(r.offDb)}  ${r.ok ? "ok" : `FLAG: ${r.offDb > 0 ? "too hot" : "too quiet"}`}`}`);
  if (!Object.keys(piece.stemTargets ?? {}).length) console.log("  (this piece declares no stemTargets)");
  const cal = M.VOCAB[piece.plan.style]?.calibrated !== false;
  console.log(b.pass ? "stems PASS" : `stems ${cal ? "FAIL" : "OFF TARGET (advisory: this style's targets are uncalibrated starting numbers)"}: fix the part gains (Material.levels), then master. LUFS alone once hid a sub 7-10 dB too hot.`);
  if (!b.pass && cal) process.exitCode = 1;
  return { ...b, ok: b.pass || !cal };
};

/** Piano realism probes (ADVISORY 4.1): single notes, matched loudness where it matters. */
const probe = (M) => {
  const note = (p, v, opts, dur = 3) => { const keys = [{ t: 0.05, off: dur, p, v }]; const { L, R } = M.renderPiano(keys, [], SR, Math.round((dur + 0.5) * SR), opts, 1); return [L, R]; };
  const cents = (arr) => arr;
  const vels = [0.15, 0.3, 0.5, 0.7, 0.9];
  const out = {};
  for (const [label, opts] of [["real", M.PIANO_REAL], ["flat", M.PIANO_FLAT]]) {
    const cs = vels.map((v) => M.centroid(note(60, v, opts, 1.5), SR).energyWeighted);
    const ls = vels.map((v) => M.loudness(note(60, v, opts, 1.5), SR).integrated);
    // decay: RMS in 50 ms windows of a held C4 (mf); slope early (0.1-0.6 s) vs late (2-4 s)
    const [L] = note(60, 0.6, opts, 6), w = Math.round(0.05 * SR), env = [];
    for (let a = 0; a + w < L.length; a += w) { let e = 0; for (let i = a; i < a + w; i++) e += L[i] * L[i]; env.push(10 * Math.log10(e / w + 1e-20)); }
    const slope = (t0, t1) => (env[Math.round(t1 / 0.05)] - env[Math.round(t0 / 0.05)]) / (t1 - t0);
    // beating: std-dev of the late envelope after removing the linear trend (dB)
    const late = env.slice(Math.round(2 / 0.05), Math.round(5 / 0.05)), k = late.length, mx = (k - 1) / 2, my = late.reduce((a, b) => a + b, 0) / k;
    let sxy = 0, sxx = 0; late.forEach((y, i) => { sxy += (i - mx) * (y - my); sxx += (i - mx) ** 2; }); const b1 = sxy / sxx;
    const resid = Math.sqrt(late.reduce((a, y, i) => a + (y - (my + b1 * (i - mx))) ** 2, 0) / k);
    const rank = (a) => a.map((x) => a.filter((y) => y < x).length);
    const rc = rank(cs), rv = rank(vels), n = vels.length, d2 = rc.reduce((a, r, i) => a + (r - rv[i]) ** 2, 0), rho = 1 - (6 * d2) / (n * (n * n - 1));
    out[label] = { centroidByVelocityHz: cs.map((x) => Math.round(x)), loudnessByVelocityLUFS: ls.map((x) => +x.toFixed(1)), spearmanCentroidVsVelocity: new Set(cs.map((x) => Math.round(x))).size === 1 ? "n/a (spectrum does not change with velocity)" : +rho.toFixed(2), decayEarlyDbPerS: +slope(0.1, 0.6).toFixed(1), decayLateDbPerS: +slope(2, 4).toFixed(1), lateEnvelopeWobbleDb: +resid.toFixed(2) };
  }
  out.inharmonicityB = Object.fromEntries([28, 40, 48, 60, 72, 84, 96].map((m) => [M.nameOf(m), +M.inharmonicityB(m).toExponential(2)]));
  void cents;
  return out;
};

main().catch((e) => { console.error(e); process.exit(1); });

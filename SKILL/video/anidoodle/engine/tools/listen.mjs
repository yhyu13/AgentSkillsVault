#!/usr/bin/env node
// LISTENING PAGE BUILDER. Two takes of the same piece, loudness-matched and side by side on one
// web page, because every sound change is judged by ear in a browser, never from files in a
// terminal. Each take is a `node tools/music.mjs render` child process, so the two sides can be two
// different engine directories (two branches) or the same engine under different environment
// variables (a sound pack switched on through ANIDOODLE_SOUNDS).
//
//   node tools/listen.mjs <outdir> --a "<label A>" --b "<label B>" --pieces nocturne,marimbaCurious
//        [--a-env KEY=VALUE ...] [--b-env KEY=VALUE ...]
//        [--a-engine <engine dir>] [--b-engine <engine dir>]
//        [--title "..."] [--intro "..."] [--blind] [--seed N]
//
// Loudness matching: both wavs are metered with ffmpeg's ebur128 (integrated LUFS, the loudness
// the owner actually hears), and only the LOUDER one is turned down to the quieter one, never up. A
// gain that only lowers a signal cannot clip. Then both to mp3 256k. When the two takes render the
// same audio they measure the same LUFS, and the tool says the takes are identical.
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const HERE_ENGINE = resolve(here, ".."); // the engine this tool lives in: both takes by default
const WAVE = ".render"; // intermediate wavs, beside the mp3s, deleted at the end

// ---------------------------------------------------------------- arguments
const USAGE = `usage: node tools/listen.mjs <outdir> --a "<label A>" --b "<label B>" --pieces a,b,c
  [--a-env KEY=VALUE ...] [--b-env KEY=VALUE ...] [--a-engine <dir>] [--b-engine <dir>]
  [--title "..."] [--intro "..."] [--blind] [--seed N]`;
const opts = { a: null, b: null, pieces: [], aEnv: {}, bEnv: {}, aEngine: HERE_ENGINE, bEngine: HERE_ENGINE, title: null, intro: null, blind: false, seed: 1, outdir: null };
try {
  const argv = process.argv.slice(2);
  /** KEY=VALUE for a child's environment; the value may hold more '=' (a path, a query string). */
  const envPair = (s, where) => {
    const i = s.indexOf("=");
    if (i < 1 || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(s.slice(0, i))) throw new Error(`--${where} wants KEY=VALUE, got "${s}"`);
    return [s.slice(0, i), s.slice(i + 1)];
  };
  for (let i = 0; i < argv.length; i++) {
    const f = argv[i], next = () => { if (i + 1 >= argv.length) throw new Error(`${f} needs a value`); return argv[++i]; };
    if (f === "--a") opts.a = next();
    else if (f === "--b") opts.b = next();
    else if (f === "--pieces") opts.pieces = next().split(",").map((s) => s.trim()).filter(Boolean);
    else if (f === "--a-env") { const [k, v] = envPair(next(), "a-env"); opts.aEnv[k] = v; }
    else if (f === "--b-env") { const [k, v] = envPair(next(), "b-env"); opts.bEnv[k] = v; }
    else if (f === "--a-engine") opts.aEngine = resolve(next());
    else if (f === "--b-engine") opts.bEngine = resolve(next());
    else if (f === "--title") opts.title = next();
    else if (f === "--intro") opts.intro = next();
    else if (f === "--blind") opts.blind = true;
    else if (f === "--seed") opts.seed = Number(next());
    else if (f.startsWith("--")) throw new Error(`no flag "${f}"`);
    else if (opts.outdir === null) opts.outdir = f;
    else throw new Error(`extra argument "${f}" (the outdir comes first)`);
  }
  if (!opts.outdir) throw new Error(`name an outdir\n${USAGE}`);
  if (!opts.a || !opts.b) throw new Error(`--a and --b label the two takes\n${USAGE}`);
  if (!opts.pieces.length) throw new Error(`--pieces names at least one piece\n${USAGE}`);
  if (!Number.isFinite(opts.seed)) throw new Error(`--seed wants a number`);
  for (const [tag, dir] of [["a", opts.aEngine], ["b", opts.bEngine]]) if (!existsSync(join(dir, "tools/music.mjs"))) throw new Error(`--${tag}-engine ${dir} has no tools/music.mjs`);
} catch (e) {
  console.error(`listen: ${e.message}`); process.exit(2);
}

// ---------------------------------------------------------------- audio
/** ffmpeg's own ebur128 summary: integrated loudness, range and true peak. */
const ebu = (file) => {
  const r = spawnSync("sh", ["-c", 'ffmpeg -hide_banner -nostats -i "$1" -vn -af ebur128=peak=true -f null - 2>&1', "sh", file], { encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`ffmpeg could not meter ${file}: ${(r.stderr || r.stdout || "").trim().split("\n").pop()}`);
  const sum = r.stdout.slice(r.stdout.lastIndexOf("Summary:")), g = (re) => { const m = re.exec(sum); return m ? Number(m[1]) : NaN; };
  return { I: g(/I:\s+(-?[\d.]+) LUFS/), LRA: g(/LRA:\s+(-?[\d.]+) LU/), TP: g(/Peak:\s+(-?[\d.]+) dBFS/) };
};
const seconds = (file) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }).trim());
const db = (x) => (Number.isFinite(x) ? `${x.toFixed(1)} LUFS` : "no reading");

/** One take: the engine's own render, as a child process, with this side's environment. */
const take = (piece, wav, engine, env) => {
  rmSync(wav, { force: true }); // a wav left by an earlier run must not pass for this one's
  const r = spawnSync(process.execPath, [join(engine, "tools/music.mjs"), "render", piece, wav], { env: { ...process.env, ...env }, encoding: "utf8", maxBuffer: 1 << 26 });
  // `render` exits 1 when a guard fails (a masking FAIL on the nocturne is the common one) and
  // still writes the wav: a guard is the engine's opinion about the mix, not about whether it rendered.
  if (!existsSync(wav)) throw new Error(`${piece}: ${engine}/tools/music.mjs render wrote no wav (exit ${r.status})\n${(r.stderr || r.stdout || "").trim()}`);
  return r.status === 0 ? null : `render exited ${r.status} (a guard, not the render; the wav is there)`;
};
/** The wav turned DOWN by `att` dB, as float wav. `att` is never negative: nothing is ever raised. */
const quieter = (from, to, att) => execFileSync("ffmpeg", ["-v", "error", "-y", "-i", from, "-af", `volume=-${att.toFixed(2)}dB`, "-c:a", "pcm_f32le", to]);

// ---------------------------------------------------------------- the page
const DARK = `--bg: #101814; --fg: #eef3ef; --panel: #18231e; --line: #33443b; --accent: #6fd3b1; --accent-fg: #0b1511; color-scheme: dark`;
// A fragment: no doctype/html/head/body (the wrapper that publishes it adds the document). Fonts
// from Google Fonts and nothing else off-box; every colour a variable, dark repeated both ways.
const STYLE = `  :root {
    --bg: #f3f5f1; --fg: #14201b; --panel: #ffffff; --line: #c9d3cc; --accent: #0f6b52; --accent-fg: #ffffff;
    --display: "Poppins", system-ui, sans-serif; --body: "Poppins", system-ui, sans-serif;
  }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${DARK} } }
  :root[data-theme="dark"] { ${DARK} }
  * { box-sizing: border-box; }
  body { background: var(--bg); color: var(--fg); font-family: var(--body); font-size: 17px; line-height: 1.5; padding-inline: 20px; padding-block: 40px; }
  main { max-width: 34rem; margin-inline: auto; display: flex; flex-direction: column; gap: 28px; }
  h1 { font-family: var(--display); font-size: 2rem; line-height: 1.15; margin: 0; text-wrap: balance; }
  p { margin: 0; }
  .piece { display: flex; flex-direction: column; gap: 12px; }
  .piece h2 { font-family: var(--display); font-size: 1.5rem; line-height: 1.2; margin: 0; }
  .take { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  .take h3 { font-family: var(--display); font-size: 1.35rem; line-height: 1.25; margin: 0; display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; overflow-wrap: break-word; }
  .letter { background: var(--accent); color: var(--accent-fg); border-radius: 8px; padding: 0 12px; font-family: var(--body); font-weight: 600; flex: none; }
  audio { width: 100%; min-width: 0; }
  button { align-self: start; background: var(--panel); color: var(--fg); border: 1px solid var(--line); border-radius: 10px; padding: 10px 18px; font-family: var(--body); font-size: 1rem; cursor: pointer; }
  button:hover { border-color: var(--accent); }
  audio:focus-visible, button:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
  @media (max-width: 430px) { body { padding-inline: 14px; padding-block: 28px; } .take { padding: 14px; } }`;
// Play one at a time, and carry the position across so the same bar can be compared: starting a
// player pauses every other one, and a partner from the same piece starts where it was.
const PLAY_ONE = `  const players = [...document.querySelectorAll("audio[data-piece]")];
  for (const on of players) on.addEventListener("play", () => {
    for (const off of players) {
      if (off === on || off.paused) continue;
      if (off.dataset.piece === on.dataset.piece) on.currentTime = off.currentTime;
      off.pause();
    }
  });`;
const REVEAL = `  const reveal = document.getElementById("reveal");
  reveal.addEventListener("click", () => {
    for (const h of document.querySelectorAll("[data-label]")) {
      h.querySelector(".letter").textContent = h.dataset.label;
      h.querySelector(".name").textContent = h.dataset.text;
    }
    reveal.remove();
  });`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const labelOf = (takeLabel) => opts[takeLabel.toLowerCase()];
/** A demo name for a heading: marimbaCurious -> Marimba curious, pianoPhrase8 -> Piano phrase 8. */
const heading = (name) => name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/(\D)(\d)/g, "$1 $2").trim()
  .split(/\s+/).map((w, i) => (i ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
const takeCard = (t) => `    <div class="take">
      <h3${opts.blind ? ` data-label="${esc(t.label)}" data-text="${esc(labelOf(t.label))}"` : ""}><span class="letter">${esc(t.slot)}</span> <span class="name">${esc(opts.blind ? `Take ${t.slot}` : labelOf(t.label))}</span></h3>
      <audio data-piece="${esc(t.piece)}" controls preload="auto" src="${esc(t.file)}"></audio>
    </div>`;
const page = (title, intro, pieces) => `<title>${esc(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap">
<style>
${STYLE}
</style>
<main>
  <h1>${esc(title)}</h1>
${intro ? `  <p>${esc(intro)}</p>\n` : ""}${pieces.map((p) => `  <section class="piece">
    <h2>${esc(heading(p.piece))}</h2>
    <p>${p.seconds.toFixed(1)} seconds each.</p>
${p.takes.map(takeCard).join("\n")}
  </section>`).join("\n")}
  <p>Starting one pauses the other, so you can jump between them at the same spot.</p>
${opts.blind ? `  <button id="reveal" type="button">Show which is which</button>\n` : ""}</main>
<script>
${PLAY_ONE}${opts.blind ? `\n${REVEAL}` : ""}
</script>
`;

// ---------------------------------------------------------------- run
/** A shuffle by the seed: the same --seed always puts 1 and 2 the same way round. */
const shuffler = (seed) => { let s = (seed >>> 0) || 1; return () => (s = (s + 0x6d2b79f5) >>> 0, (() => { let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; })()); };

try {
  const out = resolve(opts.outdir), work = join(out, WAVE);
  mkdirSync(work, { recursive: true });
  const rng = shuffler(opts.seed), rows = [], notes = [];
  for (const piece of opts.pieces) {
    const raw = { A: join(work, `${piece}-A.wav`), B: join(work, `${piece}-B.wav`) };
    for (const side of ["A", "B"]) { const note = take(piece, raw[side], side === "A" ? opts.aEngine : opts.bEngine, side === "A" ? opts.aEnv : opts.bEnv); if (note) notes.push(`${piece} ${side}: ${note}`); }
    const before = { A: ebu(raw.A), B: ebu(raw.B) };
    const same = readFileSync(raw.A).equals(readFileSync(raw.B));
    // only ever down: the quieter of the pair is the reference, and `att` is how far the other one
    // has to come down to meet it (never negative, so nothing is ever turned up)
    const quiet = Math.min(before.A.I, before.B.I), att = { A: before.A.I - quiet, B: before.B.I - quiet };
    const matched = {};
    for (const side of ["A", "B"]) {
      matched[side] = join(work, `${piece}-${side}-match.wav`);
      if (att[side] > 0.05) quieter(raw[side], matched[side], att[side]); else copyFileSync(raw[side], matched[side]);
    }
    const after = { A: ebu(matched.A), B: ebu(matched.B) };
    const mp3 = {}, dur = [];
    for (const side of ["A", "B"]) {
      mp3[side] = `${piece}-${side}.mp3`;
      execFileSync("ffmpeg", ["-v", "error", "-y", "-i", matched[side], "-c:a", "libmp3lame", "-b:a", "256k", join(out, mp3[side])]);
      dur.push(seconds(join(out, mp3[side])));
    }
    const order = opts.blind && rng() < 0.5 ? ["B", "A"] : ["A", "B"];
    rows.push({ piece, seconds: Math.max(...dur), takes: order.map((label, i) => ({ label, slot: opts.blind ? String(i + 1) : label, file: mp3[label], piece })), before, after, att: att, same });
    console.log(`\n${heading(piece)}  (${piece}, ${dur[0].toFixed(1)} s)`);
    for (const side of ["A", "B"]) console.log(`  ${side}  ${labelOf(side)}  ${db(before[side].I)} -> ${db(after[side].I)}${att[side] > 0.05 ? `  (${att[side].toFixed(1)} dB down to the quieter take)` : "  (no change)"}`);
    console.log(`  ${same ? "the two takes are identical: the same audio, not just the same loudness" : `the two takes differ, A reads ${(before.A.I - before.B.I).toFixed(1)} LU against B`}  ->  ${mp3.A}, ${mp3.B}`);
  }
  if (notes.length) console.log(`\n${notes.map((n) => `NOTE: ${n}`).join("\n")}`);

  // The answer key, blind or not: which labelled take sits in which slot on the page.
  const key = {
    seed: opts.seed, blind: opts.blind, labels: { A: opts.a, B: opts.b },
    pieces: Object.fromEntries(rows.map((r) => [r.piece, Object.fromEntries(r.takes.map((t) => [t.slot, { label: t.label, text: labelOf(t.label), file: t.file }]))])),
    loudness: Object.fromEntries(rows.map((r) => [r.piece, { identical: r.same, A: { before: r.before.A.I, after: r.after.A.I, attenuationDb: +r.att.A.toFixed(2) }, B: { before: r.before.B.I, after: r.after.B.I, attenuationDb: +r.att.B.toFixed(2) } }])),
  };
  writeFileSync(join(out, "key.json"), JSON.stringify(key, null, 1) + "\n");
  const title = opts.title ?? (opts.blind ? `${rows.length} pieces, two takes each` : `${opts.a} vs ${opts.b}`);
  const intro = opts.intro ?? `${rows.map((r) => heading(r.piece)).join(", ")}. Two takes each, matched to the same loudness.`;
  writeFileSync(join(out, "index.html"), page(title, intro, rows));
  for (const f of readdirSync(work)) rmSync(join(work, f)); // the wavs are intermediate: the mp3s beside them are the deliverable
  rmSync(work, { recursive: true, force: true });
  console.log(`\nwrote ${join(out, "index.html")}, ${rows.length * 2} mp3s, key.json${opts.blind ? ` (blind, seed ${opts.seed})` : ""}`);
} catch (e) {
  console.error(`listen: ${e.message}`); process.exit(1);
}
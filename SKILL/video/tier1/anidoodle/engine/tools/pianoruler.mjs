// PIANO RULER. Holds each recording of the grand out in turn, plays that note from what is left, and
// scores the result against the real take it replaced. The unit is the real piano's own soft-to-loud
// change at that key (1.0 = a whole dynamic step off), so "sounds wrong" becomes a number.
//   node tools/pianoruler.mjs [--sounds <pack>] [--bank piano] [--json out.json] [--set key=value ...]
// Three probes: velocity (a layer held out, played from its neighbour), pitch (a whole key held out,
// played from the recording four keys away) and release (key-up decay per band against the recorded
// release takes). `--set velocityTone=lowpass` or `--set release=flat` replays the older behaviour, so
// one change at a time can be judged by whether it moves the number. The release probe needs release
// takes that hold the string's own dying ring (the grand's do; the upright's are key noise, so its
// release row is not a real measure).
import { build } from "esbuild";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadBanks } from "./sounds.mjs";
import { soundsDir } from "./soundfetch.mjs";

const here = dirname(fileURLToPath(import.meta.url)), SR = 48000;
const args = process.argv.slice(2), val = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const sets = args.flatMap((a, i) => (a === "--set" ? [args[i + 1]] : [])).map((s) => s.split("="));
const opts = Object.fromEntries(sets.map(([k, v]) => [k, v === "true" ? true : v === "false" ? false : Number.isFinite(Number(v)) ? Number(v) : v]));
const bankId = val("--bank", "piano"), dir = val("--sounds", process.env.ANIDOODLE_SOUNDS || soundsDir());

const r = await build({ stdin: { contents: `export * from "./index"; export * as Ruler from "./pianoRuler";`, resolveDir: join(here, "../src/canvas-core/music"), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "neutral", target: "es2022", logLevel: "error" });
const M = await import("data:text/javascript;base64," + Buffer.from(r.outputFiles[0].text).toString("base64"));
const U = M.Ruler, log = console.log; console.log = () => {}; loadBanks(M, dir, [bankId]); console.log = log;
const [inst, ...variant] = bankId.split("."), bank = M.bankFor(inst, variant.join(".") || undefined);
if (!bank) { console.error(`pianoruler: no bank ${bankId} in ${dir}`); process.exit(2); }

const e = bank.entry, ord = bank.zones.filter((z) => !z.zone.art), pitches = [...new Set(ord.map((z) => z.zone.midi))].sort((a, b) => a - b);
const layerV = (l) => e.layerVelocity?.[l - 1] ?? (l - 0.5) / e.layers;
const take = (p, l, art) => bank.zones.find((z) => z.zone.midi === p && z.zone.layer === l && z.zone.art === art);
const play = (zones, p, v, off, secs) => { const n = Math.round(secs * SR), out = M.samplerVoice({ ...bank, zones }, [{ p, v, tone: v, t: 0.05, off, role: "melody", w: v }], [], SR, n, opts, 7); return U.mono([out.L, out.R]); };
const W = U.RULER_WINDOWS, env = (x, w) => U.bandEnvelope(x, SR, w[0], w[1]), cents = (a, b) => 1200 * Math.log2(a / b);
const mean = (xs) => { const f = xs.filter(Number.isFinite); return f.length ? f.reduce((s, x) => s + x, 0) / f.length : NaN; };
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : "  - ");

// the ruler at each key: real soft take vs real loud take, attack and body windows
const ruler = new Map(pitches.map((p) => { const s = U.mono(take(p, 1).channels), l = U.mono(take(p, e.layers).channels); return [p, { s, l, attack: [env(s, W.attack), env(l, W.attack)], body: [env(s, W.body), env(l, W.body)] }]; }));
const score = (x, truth, p) => { const R = ruler.get(p); return { attack: U.ruled(env(x, W.attack), env(truth, W.attack), ...R.attack), body: U.ruled(env(x, W.body), env(truth, W.body), ...R.body), cents: cents(U.centroidHz(x, SR, ...W.centroid), U.centroidHz(truth, SR, ...W.centroid)) }; };

const velocity = [], pitch = [], release = [];
for (const p of pitches) {
  for (let h = 1; h <= e.layers; h++) {
    const truth = take(p, h); if (!truth) continue;
    const x = play(bank.zones.filter((z) => z !== truth), p, layerV(h), 3.2, 3.5);
    velocity.push({ p, layer: h, ...score(x, U.mono(truth.channels), p) });
  }
  const mid = take(p, Math.ceil(e.layers / 2));
  if (mid && pitches.some((q) => Math.abs(q - p) === 4)) pitch.push({ p, ...score(play(bank.zones.filter((z) => z.zone.midi !== p), p, layerV(mid.zone.layer), 3.2, 3.5), U.mono(mid.channels), p) });
  const rel = take(p, Math.ceil(e.layers / 2), "rel");
  if (mid && rel) {
    const bands = [[30, 250], [250, 1000], [1000, 4000]], keyUp = 1.05;
    const truthR = U.bandDecay(U.mono(rel.channels), SR, U.onsetOf(U.mono(rel.channels)) / SR, 0.02, 0.2, bands, -40);
    const held = play(bank.zones, p, layerV(mid.zone.layer), keyUp, 1.6), ring = play(bank.zones, p, layerV(mid.zone.layer), 3.2, 1.6);
    const played = U.bandDecay(held, SR, keyUp, 0.02, 0.2, bands, -40), natural = U.bandDecay(ring, SR, keyUp, 0.02, 0.2, bands, -40);
    // 1.0 = as far from the real release as not damping at all
    const off = bands.map((_, j) => Math.abs(played[j] - truthR[j]) / Math.max(20, Math.abs(truthR[j] - natural[j])));
    release.push({ p, truth: truthR, played, natural, ruled: mean(off) });
  }
}

const summary = { bank: bankId, opts, velocity: { attack: mean(velocity.map((r) => r.attack)), body: mean(velocity.map((r) => r.body)), absCents: mean(velocity.map((r) => Math.abs(r.cents))) }, pitch: { attack: mean(pitch.map((r) => r.attack)), body: mean(pitch.map((r) => r.body)), absCents: mean(pitch.map((r) => Math.abs(r.cents))) }, release: { ruled: mean(release.map((r) => r.ruled)) } };
log(`piano ruler: ${bankId}${sets.length ? `  (${sets.map((s) => s.join("=")).join(", ")})` : ""}   1.00 = one whole soft-to-loud step off`);
log("\nvelocity  key  layer  attack  body   centroid cents");
for (const v of velocity) log(`          ${String(v.p).padStart(3)}  ${v.layer}      ${f2(v.attack)}    ${f2(v.body)}   ${v.cents.toFixed(0)}`);
log("\npitch     key  attack  body   centroid cents   (played from four keys away)");
for (const v of pitch) log(`          ${String(v.p).padStart(3)}  ${f2(v.attack)}    ${f2(v.body)}   ${v.cents.toFixed(0)}`);
log("\nrelease   key  dB/s low/mid/high: real | played | undamped   ruled");
for (const v of release) log(`          ${String(v.p).padStart(3)}  ${v.truth.map((x) => f2(x).padStart(6)).join("")} | ${v.played.map((x) => f2(x).padStart(6)).join("")} | ${v.natural.map((x) => f2(x).padStart(6)).join("")}   ${f2(v.ruled)}`);
log(`\nMEAN  velocity attack ${f2(summary.velocity.attack)} body ${f2(summary.velocity.body)} |centroid| ${summary.velocity.absCents.toFixed(0)} c   pitch attack ${f2(summary.pitch.attack)} body ${f2(summary.pitch.body)} |centroid| ${summary.pitch.absCents.toFixed(0)} c   release ${f2(summary.release.ruled)}`);
const out = val("--json"); if (out) writeFileSync(out, JSON.stringify({ summary, velocity, pitch, release }, null, 1));

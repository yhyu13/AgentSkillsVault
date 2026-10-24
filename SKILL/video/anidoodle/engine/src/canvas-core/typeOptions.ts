// TYPE FRAME OPTIONS, for Alex to choose from before cut 3 renders: four ways a word gets its own
// frame between two scenes (A paper sweep, B ink bloom, C card flip, D push), each 2 s, and the same
// word in every lettering medium (typeStyles, one still per style).
import type { Ctx, Env, P } from "./core";
import type { Film } from "./film";
import { C, blot, expo, inOut, pathOf, ramp, selfLayer } from "./launchKit";
import { content2 } from "./launch2";
import { logoBug, measure, writeOn, type KStyle } from "./kinetic";

const W = 1920, H = 1080, LEN = 60, IN = 10, OUT = 10;
const BEFORE = 520, AFTER = 1600; // the swim going out, the website coming in
const WORD = "ANIMATIONS";

const sheet = (env: Env, local: number, style: KStyle, color: string, word = WORD) => {
  const L = selfLayer(env, "sheet", Math.round(W * env.scale), Math.round(H * env.scale)), c = L.ctx;
  c.setTransform(env.scale, 0, 0, env.scale, 0, 0); c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
  const size = Math.min(200, (1560 / measure(word, 100)) * 100);
  writeOn(c, env, word, W / 2, H / 2 + size * 0.5, size, ramp(local, IN - 2, IN + 18), style, { color, align: "center" });
  logoBug(c, env, 200, 1700, 1040, 0.9, { t0: -100 });
  return L.canvas;
};
const pic = (ctx: Ctx, env: Env, local: number) => content2(ctx, env, local < LEN / 2 ? BEFORE : AFTER);
type Tr = (ctx: Ctx, env: Env, local: number) => void;
const S = (env: Env) => env.scale;

// A: a sheet of paper sweeps in from the right, sweeps off to the left
const sweep: Tr = (ctx, env, l) => {
  pic(ctx, env, l); const u = expo(ramp(l, 0, IN)), v = expo(ramp(l, LEN - OUT, LEN)), x = v > 0 ? -W * v : W * (1 - u);
  const Lc = sheet(env, l, "crayon", "#d8452f"); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const edge = (v > 0 ? x + W : x) * S(env), g = ctx.createLinearGradient(edge, 0, edge + (v > 0 ? 40 : -40) * S(env), 0); g.addColorStop(0, "rgba(40,25,10,0.22)"); g.addColorStop(1, "rgba(40,25,10,0)");
  ctx.fillStyle = g; ctx.fillRect(v > 0 ? edge : edge - 40 * S(env), 0, 40 * S(env), H * S(env)); ctx.drawImage(Lc, x * S(env), 0);
};
// B: an ink blot blooms from the centre (the Generate drop's own ink), the page inside it
const bloom: Tr = (ctx, env, l) => {
  pic(ctx, env, l); const u = expo(ramp(l, 0, IN + 2)), v = expo(ramp(l, LEN - OUT, LEN)), R = 1250 * (v > 0 ? 1 - v : u), c: P = [W / 2, H / 2];
  if (R < 2) return;
  const Lc = sheet(env, l, "ink", C.ink);
  ctx.setTransform(S(env), 0, 0, S(env), 0, 0); ctx.save(); pathOf(ctx, blot(c, R + 26, 88)); ctx.fillStyle = C.ink; ctx.fill(); pathOf(ctx, blot(c, Math.max(0, R - 4), 88)); ctx.clip();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(Lc, 0, 0); ctx.restore();
};
// C: the picture flips over like a card; the word is on its back; it flips again to the next scene
const flip: Tr = (ctx, env, l) => {
  ctx.setTransform(S(env), 0, 0, S(env), 0, 0); ctx.fillStyle = "#1b1916"; ctx.fillRect(0, 0, W, H);
  const a = l < LEN / 2 ? Math.PI * inOut(ramp(l, 0, IN + 4)) : Math.PI + Math.PI * inOut(ramp(l, LEN - OUT - 4, LEN)), k = Math.cos(a), face = Math.abs(k) < 1e-3 ? 1e-3 : Math.abs(k), back = Math.cos(a) < 0;
  const tmp = selfLayer(env, "flipface", Math.round(W * S(env)), Math.round(H * S(env)));
  if (back) tmp.ctx.drawImage(sheet(env, l, "thread", "#2e7d6e"), 0, 0); else pic(tmp.ctx, env, l);
  const sc = 1 - 0.12 * Math.sin(Math.min(Math.PI, Math.abs(a % Math.PI) * 1.0 + (a > Math.PI ? 0 : 0)));
  ctx.setTransform(S(env) * face * sc, 0, 0, S(env) * sc, (W / 2) * S(env) * (1 - face * sc), (H / 2) * S(env) * (1 - sc));
  ctx.drawImage(tmp.canvas, 0, 0, W, H);
  ctx.setTransform(S(env), 0, 0, S(env), 0, 0); ctx.fillStyle = `rgba(0,0,0,${0.35 * (1 - face)})`; ctx.fillRect(W / 2 - (W / 2) * face * sc, H / 2 - (H / 2) * sc, W * face * sc, H * sc);
};
// D: a paper panel pushes the picture up out of frame, then pushes on to reveal the next
const push: Tr = (ctx, env, l) => {
  const u = expo(ramp(l, 0, IN)), v = expo(ramp(l, LEN - OUT, LEN)), Lc = sheet(env, l, "marker", "#2f6fd6");
  const tmp = selfLayer(env, "pushpic", Math.round(W * S(env)), Math.round(H * S(env))); pic(tmp.ctx, env, l);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W * S(env), H * S(env));
  if (v === 0) { ctx.drawImage(tmp.canvas, 0, -H * u * S(env)); ctx.drawImage(Lc, 0, H * (1 - u) * S(env)); }
  else { ctx.drawImage(Lc, 0, -H * v * S(env)); ctx.drawImage(tmp.canvas, 0, H * (1 - v) * S(env)); }
};

const TR: [string, Tr][] = [["sweep", sweep], ["bloom", bloom], ["flip", flip], ["push", push]];
export const typeOptions: Film = {
  meta: { title: "type frame options", W, H, fps: 30, bpm: 90, durationFrames: LEN * TR.length, raster: "cpu" },
  assets: { images: { almond: "assets/refs/vangogh-almond-blossom.jpg" } }, // public domain; provenance in engine/assets/refs/PROVENANCE.json
  shots: TR.map(([id, fn], i) => ({ id, start: i * LEN, end: (i + 1) * LEN, draw: (ctx: Ctx, l: number, env: Env) => fn(ctx, env, l) })),
};

// the same word, finished, in every medium: one shot per style (20 frames each, stills are taken from them)
const STYLES: [KStyle, string][] = [["ink", C.ink], ["crayon", "#d8452f"], ["thread", "#2e7d6e"], ["marker", "#2f6fd6"], ["brick", ""], ["chalk", "#f4f1e6"]];
export const typeStyles: Film = {
  meta: { title: "type styles", W, H, fps: 30, bpm: 90, durationFrames: 20 * STYLES.length },
  assets: { images: {} },
  shots: STYLES.map(([st, col], i) => ({ id: st, start: i * 20, end: (i + 1) * 20, draw: (ctx: Ctx, _l: number, env: Env) => {
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = st === "chalk" ? "#2d3a33" : C.bg; ctx.fillRect(0, 0, W, H);
    const size = Math.min(200, (1560 / measure(WORD, 100)) * 100);
    writeOn(ctx, env, WORD, W / 2, H / 2 + size * 0.5, size, 1, st, { color: col || undefined, align: "center" });
  } })),
};

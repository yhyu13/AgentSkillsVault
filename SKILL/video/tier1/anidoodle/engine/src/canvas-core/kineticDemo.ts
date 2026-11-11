// KINETIC DEMO. Every treatment in kinetic.ts, on the launch film's grid (90 bpm: a beat is 20 frames).
//   0-60     the wordmark written large by the dip pen, then the corner mark writes itself in
//   60-160   six words, six media: ink, crayon, thread, chalk (on a board), toy bricks, marker; a callout with an arrow
//   160-280  the finale: one medium per word, then "All in pure code." with its swash
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { caption, logoBug, logoCentred, measure, sentence, writeOn, type KStyle } from "./kinetic";

const W = 1920, H = 1080, PAPER = "#f4efe6";
const ground = (ctx: Ctx, env: Env) => { ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H); };
const ease = (t: number) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c); };
const bug = (ctx: Ctx, env: Env, f: number) => logoBug(ctx, env, f, 1640, 1030, 1, { t0: 40 });

const opening = (ctx: Ctx, f: number, env: Env) => {
  ground(ctx, env);
  logoCentred(ctx, env, W / 2, H / 2, 150, ease(f / 44));
  bug(ctx, env, f);
};
// two rows of three, each row laid out by measured width and centred
const SZ = 100, ROWS: [string, KStyle][][] = [[["INK", "ink"], ["CRAYON", "crayon"], ["THREAD", "thread"]], [["CHALK", "chalk"], ["BRICKS", "brick"], ["MARKER", "marker"]]];
const WORDS: [string, KStyle, number, number][] = ROWS.flatMap((row, r) => { const gap = 90, tot = row.reduce((a, [t]) => a + measure(t, SZ), 0) + gap * (row.length - 1); let x = W / 2 - tot / 2; return row.map(([t, st]) => { const o: [string, KStyle, number, number] = [t, st, x, r ? 700 : 360]; x += measure(t, SZ, st === "brick" ? { track: 2.6, slant: 0 } : {}) + gap; return o; }); });
const styles = (ctx: Ctx, f: number, env: Env) => {
  ground(ctx, env);
  const [, , cx, cy] = WORDS[3], cw = measure("CHALK", SZ); // the chalkboard behind the chalk word
  ctx.fillStyle = "#2c3a33"; ctx.fillRect(cx - 50, cy - SZ - 55, cw + 100, SZ + 110); ctx.strokeStyle = "#6b4a2b"; ctx.lineWidth = 14; ctx.strokeRect(cx - 50, cy - SZ - 55, cw + 100, SZ + 110);
  WORDS.forEach(([t, st, x, y], i) => writeOn(ctx, env, t, x, y, SZ, ease((f - i * 10) / 38), st, { seed: 3 + i }));
  caption(ctx, env, "drawn live, no fonts", W / 2 + 180, 960, 40, ease((f - 60) / 30), "arrow", { to: [WORDS[5][2] + 60, 790] });
  bug(ctx, env, f + 60);
};
const finale = (ctx: Ctx, f: number, env: Env) => {
  ground(ctx, env);
  sentence(ctx, env, ["Images", "Illustrations", "Loops", "Animations", "Films"], f, 0, { beat: 14 });
  bug(ctx, env, f + 160);
};

export const kineticDemo: Film = {
  meta: { title: "kinetic lettering · demo", W, H, fps: 30, bpm: 90, durationFrames: 280, raster: "cpu" },
  assets: { images: {} },
  shots: [
    { id: "logo", start: 0, end: 60, draw: opening },
    { id: "styles", start: 60, end: 160, draw: styles },
    { id: "finale", start: 160, end: 280, draw: finale },
  ],
};

// MORPH DEMO. One ink shape, three states, never cut (120 bpm: a beat is 15 frames).
//   0-45     "ONE SHAPE" is written; its full stop lands as a drop of ink
//   48-84    the full stop drops, swings in under the words, and lands as a card (the first handoff)
//   88-138   "CARRIED" is written on the card in the paper's colour, then taken back
//   140-172  the card opens into the whole page (the second handoff)
//   174-240  "ACROSS THE CUT" is written on the page
import type { Ctx, Env, P } from "./core";
import type { Film } from "./film";
import { out3, ramp } from "./launchKit";
import { measure, writeOn } from "./kinetic";
import { checkShapes, circleShape, coverShape, fillShape, handoff, rectShape } from "./morph";

const W = 1080, H = 1080, N = 240, PAPER = "#ece6da", INK = "#1d1a16", SIZE = 104, BASE = 330;
const STOP: P = [W / 2 + measure("ONE SHAPE", SIZE) / 2 + 40, BASE - 15], R = 17;
const CARD = rectShape(210, 500, 660, 400, 34), PAGE = coverShape(rectShape(210, 500, 660, 400, 34), W, H);
const h1 = handoff({ from: circleShape(STOP, R), to: CARD, t0: 48, t1: 84, arc: -70 });
const h2 = handoff({ from: CARD, to: PAGE, t0: 140, t1: 172, stretch: 0, turn: [0, 1] });
checkShapes(h1.at(84), CARD, "the full stop into the card");
checkShapes(h2.at(172), PAGE, "the card into the page");

const draw = (ctx: Ctx, f: number, env: Env) => {
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  writeOn(ctx, env, "ONE SHAPE", W / 2, BASE, SIZE, ramp(f, 4, 32), "ink", { color: INK, align: "center", seed: 5 });
  if (f >= 32) {
    const pop = ramp(f, 32, 42), r = R * (out3(pop) + 0.35 * Math.sin(Math.PI * pop) * (1 - pop)); // the drop lands with a small overshoot
    fillShape(ctx, env, f < 48 ? circleShape(STOP, r) : f < 140 ? h1.at(f) : h2.at(f), INK);
  }
  if (f >= 88 && f < 140) writeOn(ctx, env, "CARRIED", W / 2, 738, 88, ramp(f, 88, 112) * (1 - ramp(f, 126, 138)), "ink", { color: PAPER, align: "center", seed: 9 });
  if (f >= 174) writeOn(ctx, env, "ACROSS THE CUT", W / 2, 580, 84, ramp(f, 174, 206), "ink", { color: PAPER, align: "center", seed: 11 });
};

export const morphDemo: Film = {
  meta: { title: "morph · one shape carried across the seam", W, H, fps: 30, bpm: 120, durationFrames: N, raster: "cpu", holds: [[206, N, "the last line, read"]] },
  assets: { images: {} },
  shots: [{ id: "morph", start: 0, end: N, draw }],
};

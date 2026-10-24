// TRANSITIONS DEMO. The three seams of transitions.ts, each once, between four finished plates
// (120 bpm: a beat is 15 frames). Every plate creeps in a little while it is held, so nothing sits still.
//   0-30     the lighthouse
//   26-56    BRUSH WIPE, a loaded ink brush pulled across and slightly down, onto the fox
//   100-126  IRIS, an ink blot opening from the fox's eye onto the koi
//   170-194  IRIS closing to a clean round point on the koi's eye; the balloon is behind it
//   240      FLASH on the cut back to the lighthouse; frame 299 hands over to frame 0
import type { Ctx, Env, P } from "./core";
import type { Film } from "./film";
import { plateLayer } from "./launchKit";
import { brushWipe, checkFlashes, flashCut, iris, seam, type Scene } from "./transitions";
import { lighthouse } from "./lighthouse";
import { fox } from "./fox";
import { koi } from "./koi";
import { balloon } from "./balloon";

const W = 1080, H = 1080, N = 300, INK = "#1d1a16";
const FOX_EYE: P = [596, 466], KOI_EYE: P = [690, 420];
checkFlashes([240], 30);

// a plate, held: it fills the frame and creeps in by 4% from frame `a` to frame `b`
const plate = (env: Env, key: string, film: Film, f: number, a: number, b: number): Scene => (c: Ctx) => {
  const L = plateLayer(env, `seamdemo:${key}`, film, 0, Math.round(W * env.scale), true).canvas, z = 1 + 0.04 * Math.max(0, Math.min(1, (f - a) / (b - a))), s = W * env.scale;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.drawImage(L, (s - s * z) / 2, (s - s * z) / 2, s * z, s * z);
};

const draw = (ctx: Ctx, f: number, env: Env) => {
  const light = plate(env, "light", lighthouse, f < 150 ? f : f - 300, -60, 56), foxS = plate(env, "fox", fox, f, 30, 126), koiS = plate(env, "koi", koi, f, 100, 194), bal = plate(env, "balloon", balloon, f, 170, 240);
  if (f < 56) brushWipe(ctx, env, seam(f, 26, 30), light, foxS, { angle: 0.22, ink: INK, seed: 31 });
  else if (f < 126) iris(ctx, env, seam(f, 100, 26), foxS, koiS, { center: FOX_EYE, shape: "blot", ink: INK });
  else if (f < 194) iris(ctx, env, seam(f, 170, 24), koiS, bal, { center: KOI_EYE, close: true, rim: 10, ink: INK });
  else flashCut(ctx, env, f, 240, bal, light);
};

export const transitionsDemo: Film = {
  meta: { title: "transitions · brush wipe, iris, flash", W, H, fps: 30, bpm: 120, durationFrames: N, raster: "cpu" },
  assets: { images: {} },
  shots: [{ id: "seams", start: 0, end: N, draw }],
};

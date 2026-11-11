// SITE HERO. The music box as art for a landing page: placed right of a headline (assetKit PLACEMENTS.heroSide),
// on the page's own colour, the part to watch in the brand colour, light and dark from one source. It moves only
// as the real box would: the drum plays one full turn, the teeth lift and drop, the air brake spins to a blur.
// One drum turn is the whole loop, so it repeats without a seam. Frame 0, the resting pose, is all a
// reduced-motion visitor gets, so it is laid out to stand on its own as the finished picture.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { Cam, paintAll, setHand, setPalette, flatHand, hand, freshPen, rrect } from "./mechanismKit";
import { isometricHand } from "./mechanismHands";
import { parts, playing, homePoints, MOVE, REV } from "./mechanism";
import { PLACEMENTS, fitBox, pagePalette, type Colour } from "./assetKit";

const FPS = 30, N = Math.round(REV * FPS), P = PLACEMENTS.heroSide;
// the fan turns nine times a drum turn; a trail of about a fifth of a second of its travel reads as speed
const BLUR = ((2 * Math.PI * 9) / REV) * 0.2;

export const heroOn = (title: string, paper: string, accent: Colour, colours: Record<string, Colour> = {}): Film => {
  const CAM = Cam.fit(36, 30, homePoints, fitBox(P)), palette = pagePalette({ paper, accent, colours });
  const draw = (ctx: Ctx, f: number, env: Env) => {
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); freshPen(ctx);
    ctx.fillStyle = paper; ctx.fillRect(0, 0, P.W, P.H);
    setHand(isometricHand(paper)); setPalette(palette);
    try {
      const s = playing((2 * Math.PI * f) / N, BLUR);
      hand().shadow?.(ctx, rrect(-3, 4.5, 76, 44.5, 3).map(([x, y]) => CAM.p([x, y, -9])), 1);
      paintAll(ctx, CAM, parts(CAM, s), MOVE, s.shares);
    } finally { setPalette(null); setHand(flatHand()); freshPen(ctx); }
  };
  return {
    // calm by design: site art beside a headline must not pull the eye off it. The box works (drum, teeth,
    // key, air brake) at about 0.2% of the frame a moment, under the film floor, so it is declared, not padded
    meta: { title, W: P.W, H: P.H, fps: FPS, bpm: 100, durationFrames: N, kind: "loop", poster: 0, holds: [[1, N, "site hero: calm by design, the machine working is the only motion"]] },
    assets: { images: {} },
    shots: [{ id: "hero", start: 0, end: N, draw }],
  };
};

/** the light page: a warm off-white site, a vermilion brand */
export const siteHero = heroOn("Site hero · music box on a light page", "#faf7f2", "#e4572e");

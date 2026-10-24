// THE GALLERY WALL. All 31 anidoodle styles as cards on a tilted wall of rows that never stop
// rolling (alternate rows in opposite directions, like a marquee), each card drawn by that style's
// own plate code, once, at the size it is shown. The camera flies over the wall and punches into
// cards one after another: a fast expo zoom that tracks the card as its row keeps moving, a beat of
// hold while the style's name is on screen, and out again. The last punch doesn't come back out:
// it fills the frame and hands over to the next scene.
import type { Ctx, Env, P } from "./core";
import type { Film } from "./film";
import { C, SANS, clamp, expo, lerp, lerpP, plateLayer, ramp, rr, softShadow } from "./launchKit";
import { balloon } from "./balloon";
import { blueprint } from "./blueprint";
import { brokenColour } from "./brokenColour";
import { charcoalErasure } from "./charcoalErasure";
import { colouredPencil } from "./colouredPencil";
import { embroidery } from "./embroidery";
import { flatVector } from "./flatVector";
import { folkTale } from "./folkTale";
import { fox } from "./fox";
import { halftone } from "./halftone";
import { isometric } from "./isometric";
import { koi } from "./koi";
import { lighthouse } from "./lighthouse";
import { lowPoly } from "./lowPoly";
import { mellan } from "./mellan";
import { midCentury } from "./midCentury";
import { moonPhases } from "./moonPhases";
import { paintedOil } from "./paintedOil";
import { paperCraft } from "./paperCraft";
import { pixelArt } from "./pixelArt";
import { pocketWatch } from "./pocketWatch";
import { ranunculus } from "./ranunculus";
import { rubberHose } from "./rubberHose";
import { scrapbook } from "./scrapbook";
import { scratchboard } from "./scratchboard";
import { stipple } from "./stipple";
import { storybookDraw } from "./storybookDraw";
import { sumiE } from "./sumiE";
import { toyBrick } from "./toyBrick";
import { woodcut } from "./woodcut";
import { wren } from "./wren";

type Card = { id: string; name: string; film: Film };
// the wall's order is a hang: neighbours contrast in value and palette
export const CARDS: Card[] = [
  { id: "scratchboard", name: "Scratchboard", film: scratchboard }, { id: "balloon", name: "Crayon", film: balloon }, { id: "sumiE", name: "Sumi-e", film: sumiE },
  { id: "pixelArt", name: "Pixel art", film: pixelArt }, { id: "woodcut", name: "Ukiyo-e woodblock", film: woodcut }, { id: "stipple", name: "Stipple", film: stipple },
  { id: "halftone", name: "Newsprint halftone", film: halftone }, { id: "koi", name: "Marker comic", film: koi }, { id: "blueprint", name: "Cyanotype", film: blueprint },
  { id: "paintedOil", name: "Oil on canvas", film: paintedOil }, { id: "toyBrick", name: "Toy brick", film: toyBrick }, { id: "mellan", name: "Single-line engraving", film: mellan },
  { id: "lighthouse", name: "Risograph", film: lighthouse }, { id: "embroidery", name: "Embroidery", film: embroidery }, { id: "lowPoly", name: "Low-poly", film: lowPoly },
  { id: "rubberHose", name: "Rubber hose", film: rubberHose }, { id: "fox", name: "Cut paper", film: fox }, { id: "colouredPencil", name: "Coloured pencil", film: colouredPencil },
  { id: "moonPhases", name: "Chalkboard", film: moonPhases }, { id: "flatVector", name: "Flat vector", film: flatVector }, { id: "folkTale", name: "Folk-tale storybook", film: folkTale },
  { id: "charcoalErasure", name: "Charcoal", film: charcoalErasure }, { id: "ranunculus", name: "Pencil & watercolour", film: ranunculus }, { id: "isometric", name: "Isometric", film: isometric },
  { id: "pocketWatch", name: "Ballpoint", film: pocketWatch }, { id: "paperCraft", name: "Paper theatre", film: paperCraft }, { id: "midCentury", name: "Mid-century gouache", film: midCentury },
  { id: "brokenColour", name: "Broken colour", film: brokenColour }, { id: "wren", name: "Ink & line-wash", film: wren }, { id: "scrapbook", name: "Scrapbook", film: scrapbook },
  { id: "storybook", name: "Storybook", film: storybookDraw },
];

// ---------------------------------------------------------------- the wall
const ROWS = 4, CARD = 330, GAP = 34, PITCH = CARD + GAP, TILT = -0.12; // radians: the wall is hung at a slant, for motion
const ROW_SPEED = [52, -64, 58, -48]; // world px per second, alternate directions
const PER_ROW = Math.ceil(CARDS.length / ROWS);
const cardAt = (row: number, k: number) => CARDS[(row * PER_ROW + (((k % PER_ROW) + PER_ROW) % PER_ROW)) % CARDS.length];
// where card k of a row is at time t, in wall coordinates (wall origin = frame centre)
const slot = (row: number, k: number, t: number): P => [k * PITCH + ROW_SPEED[row] * t + (row % 2) * PITCH * 0.5, (row - (ROWS - 1) / 2) * PITCH];
const rowSpan = PER_ROW * PITCH;

// the punch-ins: which card, when. A card is found by (row, k) at the moment the punch starts.
export type Punch = { row: number; k: number; t0: number };
const final = (film: Film) => Math.max(0, film.meta.durationFrames - 1);
const thumb = (env: Env, c: Card, px: number) => plateLayer(env, `wall:${c.id}`, c.film, final(c.film), px, true); // a finished plate: persistable

// camera over the wall: centre (wall coords), zoom, and the wall's own rotation (it untilts as the camera arrives on a card)
export type WallCam = { c: P; z: number; rot: number };
const toScreen = (cam: WallCam, p: P, W: number, H: number): P => {
  const x = (p[0] - cam.c[0]) * cam.z, y = (p[1] - cam.c[1]) * cam.z, co = Math.cos(cam.rot), si = Math.sin(cam.rot);
  return [W / 2 + x * co - y * si, H / 2 + x * si + y * co];
};

// focus: the featured card, drawn last, grown by `grow` (0..1) toward `size` px on screen and
// eased toward `toward` (a screen point); the rest of the wall eases back under a soft veil
export type WallFocus = { row: number; k: number; grow: number; size: number; toward: P };
export const drawWall = (ctx: Ctx, env: Env, t: number, cam: WallCam, focus?: WallFocus) => {
  const W = env.W, H = env.H, s = env.scale;
  ctx.setTransform(s, 0, 0, s, 0, 0); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const reach = (Math.hypot(W, H) / 2 / cam.z) + PITCH * 1.5;
  const card = (row: number, k: number, q: P, scale: number, rot: number, px: number) => {
    ctx.save(); ctx.setTransform(s, 0, 0, s, 0, 0); ctx.translate(q[0], q[1]); ctx.rotate(rot); ctx.scale(scale, scale);
    softShadow(ctx, -CARD / 2, -CARD / 2, CARD, CARD, 14, 1.2 + (scale > cam.z * 1.05 ? 1.2 : 0));
    rr(ctx, -CARD / 2, -CARD / 2, CARD, CARD, 14); ctx.clip(); ctx.drawImage(thumb(env, cardAt(row, k), px).canvas, -CARD / 2, -CARD / 2, CARD, CARD);
    ctx.restore();
  };
  for (let row = 0; row < ROWS; row++) {
    const off = ROW_SPEED[row] * t + (row % 2) * PITCH * 0.5, k0 = Math.floor((cam.c[0] - reach - off) / PITCH), k1 = Math.ceil((cam.c[0] + reach - off) / PITCH);
    for (let k = k0; k <= k1; k++) {
      if (focus && focus.row === row && focus.k === k && focus.grow > 0) continue;
      const p = slot(row, k, t); if (Math.abs(p[1] - cam.c[1]) > reach) continue;
      card(row, k, toScreen(cam, p, W, H), cam.z, cam.rot, CARD * cam.z > 360 ? 540 : 360);
    }
  }
  if (focus && focus.grow > 0) {
    const g = focus.grow, q0 = toScreen(cam, slot(focus.row, focus.k, t), W, H), q: P = lerpP(q0, focus.toward, g), sc = Math.exp(lerp(Math.log(cam.z), Math.log(focus.size / CARD), g));
    ctx.setTransform(s, 0, 0, s, 0, 0); ctx.fillStyle = `rgba(236,230,218,${0.55 * g})`; ctx.fillRect(0, 0, W, H); // the wall eases back
    card(focus.row, focus.k, q, sc, lerp(cam.rot, 0, g), 1080);
  }
};
void rowSpan;

// ---------------------------------------------------------------- the choreography
// Alex: no swooshing camera. The camera rides the wall gently and never zooms; the featured card
// itself grows out of its row, holds, and settles back. The last one grows to fill the frame.
export const PUNCH_IN = 18, PUNCH_HOLD = 30, PUNCH_OUT = 16, PUNCH = PUNCH_IN + PUNCH_HOLD + PUNCH_OUT;
const soft = (u: number) => { const c = clamp(u); return c * c * (3 - 2 * c); };
export const wallCam = (t: number, punches: Punch[], fps: number, W: number, H: number, finalHold = false): { cam: WallCam; focus?: WallFocus; card?: Card } => {
  const cam: WallCam = { c: [lerp(-240, 240, clamp(t / 8)), 0], z: 0.72, rot: TILT };
  for (let i = 0; i < punches.length; i++) {
    const p = punches[i], f = t * fps - p.t0 * fps, last = i === punches.length - 1 && finalHold;
    if (f < 0 || (!last && f >= PUNCH)) continue;
    const grow = soft(f / (last ? PUNCH_IN + 12 : PUNCH_IN)) * (last ? 1 : 1 - soft((f - PUNCH_IN - PUNCH_HOLD) / PUNCH_OUT));
    return { cam, focus: { row: p.row, k: p.k, grow, size: last ? H : 620, toward: last ? [W / 2, H / 2] : [W / 2, H / 2] }, card: cardAt(p.row, p.k) };
  }
  return { cam };
};
export const cardOf = (row: number, k: number) => cardAt(row, k);

// a gallery-only test film: the wall with five punches, the last one holding
const TEST_PUNCHES: Punch[] = [{ row: 1, k: 1, t0: 1.2 }, { row: 2, k: 3, t0: 2.8 }, { row: 0, k: 2, t0: 4.4 }, { row: 3, k: 2, t0: 6.0 }, { row: 1, k: 3, t0: 7.6 }];
export const styleWall: Film = {
  meta: { title: "anidoodle · the 31-style wall", W: 1920, H: 1080, fps: 30, bpm: 90, durationFrames: 300 },
  assets: { images: {} },
  shots: [{ id: "wall", start: 0, end: 300, draw: (ctx, f, env) => {
    const t = f / 30, w = wallCam(t, TEST_PUNCHES, 30, env.W, env.H, true);
    drawWall(ctx, env, t, w.cam, w.focus);
  } }],
};
void ramp; void rr;

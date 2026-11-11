// CALLOUT DEMO. One callout pinned to a thing while the camera moves, its handoff into the next
// scene, and a second callout there that leaves the plain way (120 bpm: a beat is 15 frames).
//   0-135    the fox plate, the camera easing in toward the moon. At 20 a dot lands on the moon,
//            the line is drawn out, "THE MOON" is written in the calm of the sky; the dot follows
//            the moon as the camera moves, the label holds still.
//   105-135  THE HANDOFF: the dot and line retract, the label travels up and left and grows; an
//            iris opens the next scene from the moon underneath it.
//   135-285  the label is the page's heading, on the frame it lands. The phases rise in below it;
//            a second callout names the full moon from the calm ground under the card, then leaves.
import type { Ctx, Env, P } from "./core";
import type { Film } from "./film";
import { Camera, heroScale } from "./camera";
import { out3, plateLayer, ramp, rr } from "./launchKit";
import { calloutPose, checkHandoff, drawCallout, drawLabel, type Callout, type LabelPose } from "./callout";
import { iris, seam } from "./transitions";
import { fox } from "./fox";
import { moonPhases } from "./moonPhases";

const W = 1080, H = 1080, N = 285, AT = 135, CREAM = "#f1e7cf", GOLD = "#e9a23b", BOARD = "#1d2b28";
const MOON: P = [214, 204], HEAD: LabelPose = { p: [84, 196], size: 92 };
const cam = new Camera([W / 2, H / 2], [{ f: 0, look: [540, 540], zoom: 1 }, { f: AT, look: [452, 440], zoom: 1.28 }]);

const moon: Callout = { text: "THE MOON", anchor: (f) => cam.toScreen(MOON, f), label: { p: [470, 150], size: 46 }, t0: 20, color: CREAM, accent: GOLD, handoff: { leave: 105, at: AT, pose: HEAD, arc: 36 } };
checkHandoff(moon, HEAD);
// the phases, cropped from the chalkboard plate: source rows 170-760, set down as a card
const CARD = { x: 60, y: 300, w: 960, h: 545, sx: 20, sy: 170, sw: 1040, sh: 590 };
const full: Callout = { text: "FULL, DAY 15", anchor: () => [CARD.x + ((540 - CARD.sx) / CARD.sw) * CARD.w, CARD.y + ((372 - CARD.sy) / CARD.sh) * CARD.h], label: { p: [610, 960], size: 38 }, t0: 178, out: 250, color: CREAM, accent: GOLD };

const scene1 = (env: Env, f: number) => (c: Ctx) => {
  const L = plateLayer(env, "calloutdemo:fox", fox, 0, Math.round(W * env.scale * 1.3), true).canvas, o = cam.toScreen([0, 0], f), k = heroScale(cam.at(f));
  c.setTransform(env.scale, 0, 0, env.scale, 0, 0); c.globalAlpha = 1; c.drawImage(L, o[0], o[1], W * k, H * k);
};
const scene2 = (env: Env, f: number) => (c: Ctx) => {
  c.setTransform(env.scale, 0, 0, env.scale, 0, 0); c.globalAlpha = 1; c.fillStyle = BOARD; c.fillRect(0, 0, W, H);
  const L = plateLayer(env, "calloutdemo:moon", moonPhases, 0, Math.round(W * env.scale), true).canvas, q = L.width / W, y = CARD.y + (1 - out3(ramp(f, AT - 14, AT + 10))) * (H - CARD.y + 20);
  c.save(); rr(c, CARD.x, y, CARD.w, CARD.h, 18); c.clip(); c.drawImage(L, CARD.sx * q, CARD.sy * q, CARD.sw * q, CARD.sh * q, CARD.x, y, CARD.w, CARD.h); c.restore();
};
const draw = (ctx: Ctx, f: number, env: Env) => {
  if (f < AT) { iris(ctx, env, seam(f, 117, AT - 117), scene1(env, f), scene2(env, f), { center: cam.toScreen(MOON, f) }); drawCallout(ctx, env, moon, f); return; }
  scene2(env, f)(ctx);
  drawLabel(ctx, env, moon, calloutPose(moon, AT)!); // the heading: the same marks, where the label landed
  drawCallout(ctx, env, full, f);
};

export const calloutDemo: Film = {
  meta: { title: "callout · anchor, leader, label, handoff", W, H, fps: 30, bpm: 120, durationFrames: N, raster: "cpu" },
  assets: { images: {} },
  shots: [{ id: "callout", start: 0, end: N, draw }],
};

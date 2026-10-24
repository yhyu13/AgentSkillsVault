// MECHANISM · "Fig 1, the 18-note movement". A cylinder music box, drawn as an exploded technical figure.
//
// MEDIUM (physical): technical illustration as it was made for parts manuals and patent plates. A
// technical pen on drafting film: one even inner weight, the silhouette gone over a size heavier.
// Under the film, adhesive grey tone sheets cut with a knife to each face, four greys and a white
// for the tops, picked by which way the face looks at the lamp. One part, the one to watch, gets
// the single colour sheet. Lettering by scriber and template, upright and even.
// MARKS: the ruled line (silhouette, crease, seam), the cut tone shape, the dot (screw, pin), the
// template letter. EDGE: crisp; tone meets tone and a line sits on every outline.
// ORDER (the film): the card's rule -> the bench -> the parts in assembly order, each inked first
// (the pen runs its outlines) and then toned (the sheet laid and cut) -> the lettering -> the
// mechanism runs -> it comes apart into its assemblies and they are read out one by one -> it folds home.
// PALETTE: warm drafting-film white, four cool-to-warm greys per material, one brass sheet.
// LIGHT: one lamp, locked to the viewer, up and to the left: tops white, left faces light, right dark.
// SUBJECT + REALISM: an 18-note cylinder movement of the common Japanese pattern (reference, from
// knowledge: a die-cast zinc bedplate; a brass cylinder about 14 mm across carrying steel pins,
// turned between two bridges by a great wheel; a steel comb of 18 tuned teeth screwed to the plate
// through a heel block, the bass teeth longer and weighted with lead underneath; a spring barrel in a
// housing at one end, wound by a crank; an air-brake governor, a worm and a two-blade fan on a
// vertical arbor, that holds the tempo). The tune on the pins is our own, 32 steps per turn.
// THE POINT: the pins are the score. The drum turning is time; each tooth is a pitch; the readout
// names the pin, the tooth and the note from the same model that places the pins and bends the teeth.
// NOT ITS NEAREST NEIGHBOURS: isometric (flat three-tone planes, no line, a colour night scene) and
// blueprint (white ink on Prussian blue, dimension lines). Here every part is outlined, the tones are
// grey sheets from a camera-locked lamp, the figure sits in a card, and there are no dimensions.
import type { Ctx, Env } from "./core";
import type { Film } from "./film";
import { isometricHand } from "./mechanismHands";
import {
  Cam, V3, P2, Material, Item, prism, box, rrect, circle, turned, cyl, sphere, frameAlong, at, facingAt, screw, slab, leverRing, tubeAlong, stroke, fill,
  paintAll, sharesAt, ExplodePlan, spin, hull, disc as circleOn, card, smooth, clamp01, add, setReveal, tone, ink, inkDot, knock, Hand, setHand, flatHand, hand, freshPen,
} from "./mechanismKit";

const W = 1080, H = 1080, FPS = 30, N = 310, N_DRAW = 350;
const PAPER = "#f3f0e8", INK = "#232227", SOFT = "#6d6a70", RULE = "#9a968e";
const mat = (name: string, ramp: Material["ramp"], seam: string, pigment: string, accent = false): Material => ({ name, ramp, ink: INK, seam, pigment, accent });
const ZINC = mat("zinc", ["#a9a69f", "#bdbab3", "#cfccc4", "#dedbd3", "#f4f1ea"], "#8a877f", "#8d8b86");
const STEEL = mat("steel", ["#9aa0a6", "#b0b5ba", "#c5c9cd", "#d8dbde", "#f0f2f3"], "#80868c", "#6f86a0");
const PLINTH = mat("wood", ["#b3ada2", "#c4beb3", "#d3cec4", "#e1ddd4", "#f1eee7"], "#948e84", "#a8774c");
const LEAD = mat("lead", ["#6c6d71", "#7e7f83", "#909195", "#a3a4a7", "#c3c4c6"], "#56575b", "#55575e");
const BRASS = mat("brass", ["#a39d8e", "#b6b0a1", "#c8c2b3", "#d8d3c5", "#efebe1"], "#8a8476", "#ab9a72"); // brass, seen in grey (a quiet pigment: only the accent may shout)
const ACCENT = mat("accent", ["#a2652a", "#ba7a37", "#cd904a", "#dda863", "#f2d29c"], "#8a5420", "#d0502a", true); // the part to watch

// ---------------------------------------------------------------- the model: tune, teeth, drum, explode
const TEETH = [48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 79]; // MIDI pitch of each tooth, bass first
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteName = (m: number) => NAMES[m % 12] + (Math.floor(m / 12) - 1);
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
const STEPS = 32;
// our tune, step -> pitches (melody over a walking bass); every pitch must be a tooth
const TUNE: Record<number, number[]> = {
  0: [48, 72], 2: [76], 4: [60, 79], 6: [76], 7: [74], 8: [55, 72], 10: [74], 12: [59, 71], 14: [67],
  16: [53, 69], 18: [72], 20: [57, 76], 22: [74], 23: [72], 24: [55, 71], 26: [74], 28: [48, 64, 72], 30: [60],
};
const PINS = Object.entries(TUNE).flatMap(([s, ms]) => ms.map((m) => ({ step: +s, tooth: TEETH.indexOf(m) }))).sort((a, b) => a.step - b.step || a.tooth - b.tooth);
if (PINS.some((p) => p.tooth < 0)) throw new Error("mechanism: a pin asks for a pitch no tooth plays");
const DSTEP = (2 * Math.PI) / STEPS;
const DRUM = { o: [12.5, 17.5, 16.2] as V3, len: 34, r: 7, pin: 0.9 };
const TH_C = Math.atan2(-7.8, 1.5); // where a pin meets a tooth tip, in the drum's frame (u = +y, v = +z)
const toothX = (j: number) => 13.1 + j * 1.83;
const toothRoot = (j: number) => 29.8 - (j / 17) * 5;
const TIP = 19;

const PLAN: ExplodePlan = { order: ["governor", "crank", "housing", "screws", "comb", "bridgeL", "bridgeR", "drum"], stagger: 0.07, w: 8, z: 0.89 };
const MOVE: Record<string, V3> = { governor: [30, 0, 30], crank: [42, 0, 8], housing: [30, 0, 8], screws: [0, 13, 24], comb: [0, 13, 9], bridgeL: [-13, 0, 0], bridgeR: [10, 0, 0], drum: [0, 0, 24] };
const ABOUT: Record<string, string> = {
  governor: "AIR BRAKE · HOLDS THE TEMPO", crank: "CRANK · WINDS THE SPRING", housing: "SPRING BARREL · THE MOTOR", screws: "SCREWS · HOLD THE COMB DOWN",
  comb: "COMB · 18 TUNED TEETH", bridgeL: "BRIDGE · CARRIES THE DRUM", bridgeR: "BRIDGE · CARRIES THE DRUM", drum: "DRUM · THE PINS ARE THE SCORE",
};

// the film's timeline (frames)
// two films: the making (rule, build, words) and the run (play, apart, tour, home, play)
const T = { rule: [0, 12], build: [12, 318], text: [318, 350], play: 0, apart: 106, tour: [146, 234], home: 234, end: N } as const;
const CUES = [{ t: T.apart / FPS, apart: true }, { t: T.home / FPS, apart: false }];
const REV = 9.6; // seconds per drum turn: 0.3 s a step
/** drum angle: it turns while the movement is whole and playing */
const rotAt = (f: number) => { const run = (a: number, b: number) => Math.max(0, Math.min(f, b) - a); const fr = run(T.play, T.apart) + run(T.home + 30, N); return (fr / FPS / REV) * 2 * Math.PI; };
export type State = { rot: number; shares: Record<string, number>; lit: string; read: string; bend: number[]; fan: number; crank: number; blur?: number };
/** what the drum is doing at angle rot: how far each tooth bends, and which pin last spoke. One model for pins, teeth and words. */
export const play = (rot: number, quiet = 0) => {
  const bend = TEETH.map(() => 0), turn = rot % (2 * Math.PI); let last = -1;
  PINS.forEach((p, k) => {
    const ahead = ((p.step * DSTEP - rot) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI); // radians until it reaches the tip
    if (ahead < 0.14) bend[p.tooth] += -0.55 * (1 - ahead / 0.14) * (1 - quiet);
    const since = 2 * Math.PI - ahead; if (rot >= p.step * DSTEP && since < 1.2) { const age = (since / (2 * Math.PI)) * REV; bend[p.tooth] += 0.4 * Math.exp(-age / 0.28) * Math.sin(age * 2 * Math.PI * 6) * (1 - quiet); }
    if (turn >= p.step * DSTEP) last = k;
  });
  if (last < 0 && rot >= 2 * Math.PI) last = PINS.length - 1;
  let read = "WOUND · READY";
  if (last >= 0) { const p = PINS[last], m = TEETH[p.tooth]; read = `PIN ${last + 1} · TOOTH ${p.tooth + 1} · ${noteName(m)} ${Math.round(hz(m))} HZ`; }
  return { bend, read, fan: (turn / (2 * Math.PI)) * 2 * Math.PI * 9, crank: Math.PI * 0.3 + 0.12 * Math.sin(rot) };
};
export const stateAt = (f: number): State => {
  const t = f / FPS, rot = rotAt(f), shares = sharesAt(PLAN, CUES, t), moving = Object.values(shares).some((s) => s > 0.003 && s < 0.997);
  const apart = Object.values(shares).every((s) => s > 0.997), pl = play(rot);
  // apart, the parts float: each breathes a little along its own path of travel, out of step with the others
  const settled = clamp01((f - T.apart) / 40) * (1 - clamp01((f - T.home + 6) / 6));
  if (settled > 0) PLAN.order.forEach((id, i) => { shares[id] += 0.035 * settled * Math.sin((2 * Math.PI * t) / 2.6 + i * 0.9); });
  let lit = "drum", read = pl.read;
  if (moving) read = f < T.home ? "EXPLODING" : "REASSEMBLING";
  if (apart) {
    const k = Math.floor(clamp01((f - T.tour[0]) / (T.tour[1] - T.tour[0])) * PLAN.order.length * 0.9999);
    lit = PLAN.order[f < T.tour[0] ? PLAN.order.length - 1 : k]; read = f < T.tour[0] ? `${PLAN.order.length} ASSEMBLIES OUT` : `${PLAN.order.indexOf(lit) + 1}/${PLAN.order.length} · ${ABOUT[lit]}`;
  }
  return { rot, shares, lit, read, bend: pl.bend, fan: pl.fan, crank: pl.crank };
};

// ---------------------------------------------------------------- the parts list
const circleAt = (c: Cam, o: V3, r: number, off: P2) => circleOn(c, o, [0, 0, 1], r, 40, off);
const vane = (psi: number, side: number): P2[] => { const c = Math.cos(psi), s = Math.sin(psi), e = 0.22; const pts: [number, number][] = side > 0 ? [[0.5, -e], [4.6, -e], [4.6, e], [0.5, e]] : [[-4.6, -e], [-0.5, -e], [-0.5, e], [-4.6, e]]; return pts.map(([x, y]) => [60 + x * c - y * s, 12 + x * s + y * c] as P2); };
const bar = (ctx: Ctx, c: Cam, x0: number, x1: number, yR: number, yT: number, z0: number, z1: number, dz: number, m: Material, off: P2) => {
  const P = (x: number, y: number, z: number): P2 => { const s = c.p([x, y, z + (y < yR ? dz * ((yR - y) / (yR - yT)) ** 1.6 : 0)]); return [s[0] + off[0], s[1] + off[1]]; };
  const n = 6, ys = Array.from({ length: n + 1 }, (_, i) => yR + ((yT - yR) * i) / n);
  const side = ys.map((y) => P(x1, y, z0)).concat(ys.map((y) => P(x1, y, z1)).reverse()), top = ys.map((y) => P(x0, y, z1)).concat(ys.map((y) => P(x1, y, z1)).reverse());
  tone(ctx, side, m, 0.8); tone(ctx, top, m, 4);
  ink(ctx, top.concat(side.slice(0, n + 1).reverse()), "in", m);
  ink(ctx, [...ys.map((y) => P(x0, y, z1)), P(x0, yT, z0 + 0.0001), ...ys.slice().reverse().map((y) => P(x1, y, z0))], "in", m);
};

const parts = (c: Cam, s: State): Item[] => {
  const items: Item[] = [];
  const put = (id: string, atp: V3, draw: Item["draw"], ride?: string, bias = 0) => items.push({ id, at: atp, draw, ride, bias });
  const lit = (a: string) => s.lit === a, M = (a: string, base: Material) => (lit(a) ? ACCENT : base);
  // the bench
  put("plinth", [35, 23, -9], (ctx, o) => box(ctx, c, -3, 4.5, -9, 76, 44.5, 6, PLINTH, { r: 3, bevel: 1.2, off: o }), undefined, -100);
  put("ruler", [24, 45, -3], (ctx, o) => box(ctx, c, 1, 43.2, -3, 46, 3.6, 0.35, STEEL, { off: o, inner: (x) => {
    for (let i = 0; i <= 46; i += 1) { const major = i % 10 === 0, mid = i % 5 === 0, L = major ? 2.2 : mid ? 1.5 : 0.9; const a = c.p([1 + i, 43.2, -2.65]), b = c.p([1 + i, 43.2 + L, -2.65]); ink(x, [[a[0] + o[0], a[1] + o[1]], [b[0] + o[0], b[1] + o[1]]], major ? "in" : "hair", STEEL); }
  } }), undefined, -60);
  put("label", [61, 44, -3], (ctx, o) => box(ctx, c, 52, 41.5, -3, 18, 5, 0.4, STEEL, { off: o, inner: (x) => {
    [[0.9, 0.8], [2.2, 0.55], [3.4, 0.7]].forEach(([yy, f]) => { const a = c.p([54, 41.5 + yy, -2.6]), b = c.p([54 + 14 * f, 41.5 + yy, -2.6]); ink(x, [[a[0] + o[0], a[1] + o[1]], [b[0] + o[0], b[1] + o[1]]], "seam", STEEL); });
  } }), undefined, -60);
  ([[0, 8], [70, 8], [70, 46], [0, 46]] as P2[]).forEach(([x, y], i) => put(`pscrew${i}`, [x, y, -3], (ctx, o) => screw(ctx, c, [x, y, -3], [0, 0, 1], 1.1, STEEL, 0.4 + i, o), undefined, -50));
  ([[9, 10], [64, 10], [64, 36], [9, 36]] as P2[]).forEach(([x, y], i) => put(`post${i}`, [x, y, -1.5], (ctx, o) => turned(ctx, c, frameAlong([x, y, -3], [0, 0, 1]), cyl(0, 3, 2.2), ZINC, { off: o }), undefined, -40));
  put("bedplate", [36, 23, 0], (ctx, o) => box(ctx, c, 5, 6, 0, 63, 34, 3.5, ZINC, { r: 2.5, bevel: 0.9, off: o, inner: (q) => {
    ([[7.6, 37.4], [65.4, 37.4], [65.4, 8.6], [32, 24], [40, 24]] as P2[]).forEach(([x, y], i) => { const r = i < 3 ? 1.1 : 1.6; const h = circle(x, y, r, 24).map(([a, b]) => { const p = c.p([a, b, 3.5]); return [p[0] + o[0], p[1] + o[1]] as P2; }); tone(q, h, ZINC, 0.4); ink(q, h, "hair", ZINC, true); });
  } }), undefined, -30);
  // the comb: heel, plate, teeth, lead weights, screws
  put("heel", [29.5, 33.5, 6], (ctx, o) => box(ctx, c, 11.5, 30, 3.5, 36, 7, 5.1, M("comb", STEEL), { r: 0.8, bevel: 0.6, off: o, lit: lit("comb") }), "comb");
  put("plate", [29.5, 27.5, 8], (ctx, o) => prism(ctx, c, [[12, 29.9], [47, 24.6], [47, 30.6], [12, 30.6]], 7.6, 0.8, M("comb", STEEL), { off: o }), "comb", -0.5);
  TEETH.forEach((_, j) => {
    const x0 = toothX(j), yR = toothRoot(j);
    if (j < 5) put(`weight${j}`, [x0 + 0.7, 20.9, 7], (ctx, o) => box(ctx, c, x0 + 0.05, TIP + 0.4, 6.4 + s.bend[j] * 0.7, 1.25, 3, 1.2, LEAD, { off: o }), "comb", -0.3);
    put(`tooth${j}`, [x0 + 0.7, (yR + TIP) / 2, 8], (ctx, o) => bar(ctx, c, x0, x0 + 1.35, yR, TIP, 7.6, 8.4, s.bend[j], M("comb", STEEL), o), "comb", -0.6 + j * 0.001);
  });
  ([[17, 33.5], [42, 33.5]] as P2[]).forEach(([x, y], i) => put(`cscrew${i}`, [x, y, 8.6], (ctx, o) => screw(ctx, c, [x, y, 8.6], [0, 0, 1], 1.5, M("screws", STEEL), 0.9 + i, o), "screws", 1));
  // bridges with their feet and screws
  const bridge = (id: string, x: number, foot: number) => {
    put(`${id}foot`, [foot + 2.4, 17.5, 4.2], (ctx, o) => box(ctx, c, foot, 9.5, 3.5, 5, 16, 1.4, M(id, ZINC), { r: 0.5, off: o, lit: lit(id) }), id, -0.2);
    put(`${id}`, [x + 1.1, 17.5, 12], (ctx, o) => box(ctx, c, x, 11, 4.9, 2.2, 13, 13.4, M(id, ZINC), { r: 0.6, bevel: 0.4, off: o, lit: lit(id), inner: (q) => {
      const hole = circle(17.5, 16.2, 1.6, 20).map(([y, z]) => { const p = c.p([x + 2.2, y, z]); return [p[0] + o[0], p[1] + o[1]] as P2; }); tone(q, hole, ZINC, 1.2); ink(q, hole, "hair", ZINC, true);
    } }), id);
    [10.8, 24.2].forEach((y, i) => put(`${id}s${i}`, [foot + (id === "bridgeL" ? 1 : 3.9), y, 4.9], (ctx, o) => screw(ctx, c, [foot + (id === "bridgeL" ? 1 : 3.9), y, 4.9], [0, 0, 1], 0.9, STEEL, 0.2 + i, o), id, 0.3));
  };
  bridge("bridgeL", 9, 7.6); bridge("bridgeR", 49.6, 48.3);
  // the drum: arbor, cylinder with its pins, the great wheel
  const D = frameAlong(DRUM.o, [1, 0, 0]);
  put("arborL", [10.5, 17.5, 16.2], (ctx, o) => turned(ctx, c, frameAlong([8.4, 17.5, 16.2], [1, 0, 0]), cyl(0, 4.2, 0.85), STEEL, { off: o }), "drum", -0.5);
  put("drum", [29.5, 17.5, 16.2], (ctx, o) => {
    turned(ctx, c, D, cyl(0, DRUM.len, DRUM.r), M("drum", BRASS), { off: o, lit: lit("drum"), rims: [0.8, DRUM.len - 0.8] });
    for (const p of PINS) { // each pin: a short steel stub standing off the surface, fading as the drum turns it away
      const th = TH_C + p.step * DSTEP - s.rot, f = facingAt(c, D, th), a = smooth(0.02, 0.4, f); if (a <= 0.01) continue;
      const sx = toothX(p.tooth) + 0.67 - DRUM.o[0], A = c.p(at(D, sx, DRUM.r - 0.05, th)), B = c.p(at(D, sx, DRUM.r + DRUM.pin, th));
      ink(ctx, [[A[0] + o[0], A[1] + o[1]], [B[0] + o[0], B[1] + o[1]]], "in", STEEL, false, a);
      inkDot(ctx, [B[0] + o[0], B[1] + o[1]], 1.5, STEEL, a);
    }
  }, "drum");
  put("wheel", [48, 17.5, 16.2], (ctx, o) => {
    const G = frameAlong([47.4, 17.5, 16.2], [1, 0, 0]);
    turned(ctx, c, G, cyl(0, 1.2, 9.5), M("drum", BRASS), { off: o, lit: lit("drum") });
    for (let i = 0; i < 64; i++) { const th = (i / 64) * 2 * Math.PI - s.rot, f = facingAt(c, G, th); if (f < 0.02) continue; const A = c.p(at(G, 1.2, 8.6, th)), B = c.p(at(G, 1.2, 9.45, th)); ink(ctx, [[A[0] + o[0], A[1] + o[1]], [B[0] + o[0], B[1] + o[1]]], "seam", BRASS, false, smooth(0.02, 0.4, f)); }
    turned(ctx, c, frameAlong([48.6, 17.5, 16.2], [1, 0, 0]), cyl(0, 0.8, 2.4), M("drum", BRASS), { off: o });
  }, "drum", -3);
  put("arborR", [50.5, 17.5, 16.2], (ctx, o) => turned(ctx, c, frameAlong([49.4, 17.5, 16.2], [1, 0, 0]), cyl(0, 2.6, 0.85), STEEL, { off: o }), "drum", 1.2);
  // the motor: housing, its screws, the crank
  put("housing", [60, 22, 10.7], (ctx, o) => box(ctx, c, 54, 6, 3.5, 12, 32, 14.5, M("housing", ZINC), { r: 2.5, bevel: 0.9, seams: [5.2], off: o, lit: lit("housing") }), "housing");
  ([[56, 8.5], [64, 8.5], [64, 35.5], [56, 35.5]] as P2[]).forEach(([x, y], i) => put(`hscrew${i}`, [x, y, 18], (ctx, o) => screw(ctx, c, [x, y, 18], [0, 0, 1], 0.9, M("housing", STEEL), 1.1 + i, o), "housing", 0.5));
  put("crank", [70, 24, 10], (ctx, o) => {
    tubeAlong(ctx, c, [[66, 22, 10], [69.2, 22, 10]], 0.9, STEEL, { off: o, caps: [false, true] });
    // the lever: a flat steel plate turning in the plane x = 69.2, a boss on the shaft, a turned wooden knob at its end
    const A = frameAlong([69.2, 22, 10], [1, 0, 0]), ang = s.crank, e: V3 = [69.2, 22 + 7 * Math.cos(ang), 10 + 7 * Math.sin(ang)];
    const lv = leverRing(7, 1.6, 1.25).map(([u, v]) => { const cu = Math.cos(ang), su = Math.sin(ang); return [u * cu - v * su, u * su + v * cu] as P2; });
    slab(ctx, c, { ...A, u: [0, 1, 0], v: [0, 0, 1] }, lv, 0.9, M("crank", STEEL), { off: o, lit: lit("crank") });
    turned(ctx, c, frameAlong([70.1, 22, 10], [1, 0, 0]), cyl(0, 0.7, 1.15), M("crank", STEEL), { off: o });
    turned(ctx, c, frameAlong(add(e, [0.9, 0, 0]), [1, 0, 0]), cyl(0, 3.4, 1.35), M("crank", PLINTH), { off: o, lit: lit("crank") });
    turned(ctx, c, frameAlong(add(e, [4.3, 0, 0]), [1, 0, 0]), sphere(0, 0.9, -0.5, 1.45), M("crank", PLINTH), { off: o, caps: [false, false] });
  }, "crank");
  put("stop", [58, 42, 12], (ctx, o) => {
    tubeAlong(ctx, c, [[57.5, 38, 13], [57.5, 42.5, 13], [54.5, 45, 13.8]], 0.45, M("housing", STEEL), { off: o, caps: [false, false] });
    turned(ctx, c, frameAlong([54.5, 45, 12.6], [0, 0, 1]), sphere(0, 2.4, 1.2, 1.2), M("housing", PLINTH), { off: o, caps: [false, false] });
  }, "housing", 0.4);
  // the governor: shaft, worm, fan (two blades, sorted round the shaft), cap
  const G0: V3 = [60, 12, 18];
  put("gshaft", [60, 12, 24], (ctx, o) => {
    turned(ctx, c, frameAlong(G0, [0, 0, 1]), cyl(0, 1.1, 1.9), M("governor", ZINC), { off: o, rims: [0.5] });
    turned(ctx, c, frameAlong(add(G0, [0, 0, 1.1]), [0, 0, 1]), cyl(0, 11.3, 0.55), STEEL, { off: o });
    const F = frameAlong([60, 12, 19.4], [0, 0, 1]); turned(ctx, c, F, cyl(0, 4, 1.5), M("governor", STEEL), { off: o, lit: lit("governor") });
    const KS = Math.round(20 / (hand().coarse ?? 1)); for (let i = 0; i < 9; i++) { const z0 = 0.3 + i * 0.42; for (let k = 0; k < KS; k++) { const th0 = (k / KS) * 2 * Math.PI + s.fan * 0.15, th1 = th0 + (2 * Math.PI) / KS, f = facingAt(c, F, (th0 + th1) / 2); if (f < 0.05) continue; const A = c.p(at(F, z0 + (k / KS) * 0.42, 1.5, th0)), B = c.p(at(F, z0 + ((k + 1) / KS) * 0.42, 1.5, th1)); ink(ctx, [[A[0] + o[0], A[1] + o[1]], [B[0] + o[0], B[1] + o[1]]], "seam", STEEL, false, smooth(0.05, 0.5, f)); } }
  }, "governor");
  // the fan turns nine times a drum turn; with `blur` (radians the echoes spread over) it reads as spinning, not as a still cut-out
  const sweep = (s.blur ?? 0), sweptFan = (ctx: Ctx, o: P2) => () => tone(ctx, hull([...circleAt(c, [60, 12, 24.6], 4.6, o), ...circleAt(c, [60, 12, 28.8], 4.6, o)]), M("governor", ZINC), 4); // one shape: see-through bands would stack into stripes
  [1, -1].forEach((side) => { const ring = vane(s.fan, side), mid = ring.reduce((a, q) => [a[0] + q[0] / 4, a[1] + q[1] / 4], [0, 0]); put(`vane${side}`, [mid[0], mid[1], 26.5], (ctx, o) => spin(s.fan, sweep, (ang) => prism(ctx, c, vane(ang, side), 24.6, 4.2, M("governor", ZINC), { off: o, lit: lit("governor") }), { swept: side > 0 ? sweptFan(ctx, o) : undefined }), "governor", 0); });
  /** the music box at rest on a page, playing: every part home, the drum turning, the fan a blur */
  put("hub", [60, 12, 26.7], (ctx, o) => turned(ctx, c, frameAlong([60, 12, 24.4], [0, 0, 1]), cyl(0, 4.6, 0.95), M("governor", STEEL), { off: o }), "governor", 0.05);
  put("gcap", [60, 12, 30.6], (ctx, o) => turned(ctx, c, frameAlong([60, 12, 30.2], [0, 0, 1]), cyl(0, 0.8, 1.3), STEEL, { off: o }), "governor", 2);
  // travel lines: a chain line from where a part sits to where it went, drawn under everything that moved
  const travel = (id: string, home: V3, ride: string) => put(`path-${id}`, home, (ctx) => {
    const sh = s.shares[ride] ?? 0; if (sh < 0.05) return;
    const a = c.p(home), b = c.p(add(home, [MOVE[ride][0] * sh, MOVE[ride][1] * sh, MOVE[ride][2] * sh]));
    ink(ctx, [a, b], "chain", STEEL, false, 0.8 * smooth(0.05, 0.4, sh));
  }, undefined, -25);
  travel("cs0", [17, 33.5, 8.6], "screws"); travel("cs1", [42, 33.5, 8.6], "screws");
  travel("arbor", [29.5, 17.5, 16.2], "drum"); travel("gov", [60, 12, 18], "governor");
  travel("crank", [66, 22, 10], "crank");
  return items;
};

// ---------------------------------------------------------------- the camera, fit once to everything the film shows
const BENCH: V3[] = [[-3, 4.5, -9], [73, 4.5, -9], [73, 49, -9], [-3, 49, -9], [-3, 4.5, -3], [73, 49, -3], [-3, 49, -3], [5, 6, 3.5]];
const HOME = Cam.fit(36, 30, [...BENCH, [60, 12, 31], [74, 22, 18], [10, 11, 24]], [205, 215, 875, 865]);
const APART = Cam.fit(36, 30, [...BENCH, [90, 12, 61], [116, 22, 26], [-4, 17, 21], [30, 45, 34], [30, 17, 48]], [130, 120, 950, 930]);
export const camAt = (sh: Record<string, number>) => { const m = Object.values(sh).reduce((a, b) => a + b, 0) / PLAN.order.length, e = smooth(0, 1, m); return new Cam(36, 30, HOME.k + (APART.k - HOME.k) * e, HOME.ox + (APART.ox - HOME.ox) * e, HOME.oy + (APART.oy - HOME.oy) * e); };

// the order the pen visits the parts in the film: the bench, the plate, then each assembly as it is put together
const BUILD = ["plinth", "ruler", "label", "pscrew", "post", "bedplate", "bridgeL", "bridgeR", "arbor", "drum", "wheel", "plate", "tooth", "weight", "heel", "cscrew", "housing", "hscrew", "stop", "crank", "gshaft", "hub", "vane", "gcap"];
// time is shared by how much there is to draw: a screw takes a beat, a drum takes a breath
const SMALL = new Set(["pscrew", "post", "arbor", "weight", "cscrew", "hscrew", "stop", "hub", "gcap", "label"]);
const BW = BUILD.map((b) => (SMALL.has(b) ? 0.45 : 1.3)), BSTART = BW.map((_, i) => BW.slice(0, i).reduce((a, w) => a + w, 0)), BTOTAL = BW.reduce((a, w) => a + w, 0);
const buildRank = (id: string) => { const i = BUILD.findIndex((b) => id === b || id.startsWith(b)); return i < 0 ? BUILD.length - 1 : i; };
const buildAt = (id: string, f: number): [number, number] => {
  const [b0, b1] = T.build, unit = (b1 - b0) / (BTOTAL + 1), r = buildRank(id), st = b0 + BSTART[r] * unit, len = BW[r] * unit;
  return [clamp01((f - st) / (len * 1.15)), clamp01((f - st - len * 0.9) / (len * 1.5))];
};
// the camera's own move: while it plays, push in to where the pins meet the teeth and drift along the
// comb from bass to treble; pull back before it comes apart; at the end, settle in a little on the drum
const CLOSE = { a: 0, in: 30, out: 78, b: 104 }, FINAL = { a: 262, b: 310 };
const zoomAt = (f: number): { z: number; focus: V3; pull: number } => {
  if (f >= CLOSE.a && f < CLOSE.b) {
    const e = f < CLOSE.in ? smooth(CLOSE.a, CLOSE.in, f) : f < CLOSE.out ? 1 : 1 - smooth(CLOSE.out, CLOSE.b, f), drift = clamp01((f - CLOSE.a) / (CLOSE.b - CLOSE.a));
    return { z: 1 + 1.25 * e, focus: [16 + 26 * drift, 20, 10], pull: e };
  }
  if (f >= FINAL.a) { const e = smooth(FINAL.a, FINAL.b, f); return { z: 1 + 0.32 * e, focus: [30, 18, 13], pull: e * 0.6 }; }
  return { z: 1, focus: [30, 18, 13], pull: 0 };
};
const zoomed = (c: Cam, f: number): Cam => {
  const { z, focus, pull } = zoomAt(f); if (z <= 1.0001) return c;
  const s0 = c.p(focus), u: P2 = [(s0[0] - c.ox) / c.k, (s0[1] - c.oy) / c.k], tgt: P2 = [s0[0] + (W / 2 - s0[0]) * pull, s0[1] + (H / 2 - s0[1]) * pull], k = c.k * z;
  return new Cam(c.A, c.E, k, tgt[0] - k * u[0], tgt[1] - k * u[1]);
};

export { PLAN, MOVE, ABOUT, REV, PAPER, parts, W as FIG_W, H as FIG_H };
/** the figure on its card at a given state: the film and the interactive explorer both paint through this */
export const paintFigure = (ctx: Ctx, s: State, hint: string, o: { cam?: Cam; build?: (id: string) => [number, number]; card?: number; shadow?: number } = {}) => {
  freshPen(ctx);
  const CAM = o.cam ?? camAt(s.shares), items = parts(CAM, s), text = { fig: "FIG 1", title: "18-NOTE MOVEMENT", hint, read: s.read };
  card(ctx, W, H, text, { progress: o.card ?? 1, part: "ground" });
  ctx.save(); ctx.beginPath(); ctx.rect(35, 35, W - 70, H - 70); ctx.clip(); // the figure lives inside the card's rule
  const foot = rrect(-3, 4.5, 76, 44.5, 3).map(([x, y]) => CAM.p([x, y, -9]));
  const sh = o.shadow ?? 1; // the shadow is laid like a tone sheet, left to right, never faded in
  if (sh > 0) { const x0 = Math.min(...foot.map((q) => q[0])) - 20, x1 = Math.max(...foot.map((q) => q[0])) + 20; ctx.save(); ctx.beginPath(); ctx.rect(x0, -1e4, (x1 - x0) * sh, 2e4); ctx.clip(); hand().shadow?.(ctx, foot, 1); ctx.restore(); }
  const wrapped = o.build ? items.map((it) => ({ ...it, draw: (x: Ctx, off: P2) => { const [ink, tone] = o.build!(it.id); if (ink <= 0) return; setReveal(ink, tone, PAPER); it.draw(x, off); setReveal(1, 1); } })) : items;
  paintAll(ctx, CAM, wrapped, MOVE, s.shares);
  ctx.restore(); freshPen(ctx);
  card(ctx, W, H, text, { progress: o.card ?? 1, part: "words" });
  return CAM;
};
export const camApart = APART;
/** the box at home, playing at drum angle `rot`, the fan's trail `blur` radians long (site art and loops) */
/** the pins that have just plucked their teeth at drum angle `rot`: which tooth, where its tip is, how long ago (s) */
export const plucks = (rot: number, within = 1.2) => PINS.flatMap((p) => {
  const since = (((rot - p.step * DSTEP) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), age = (since / (2 * Math.PI)) * REV;
  return age < within ? [{ tooth: p.tooth, age, tip: [toothX(p.tooth) + 0.67, TIP, 8.4] as V3 }] : [];
});
// the key turns back once a drum turn as the spring runs down, so a loop shows the whole motor working
export const playing = (rot: number, blur = 0): State => { const pl = play(rot); return { rot, shares: Object.fromEntries(PLAN.order.map((id) => [id, 0])), lit: "drum", read: pl.read, bend: pl.bend, fan: pl.fan, crank: Math.PI * 0.3 - rot, blur }; };
/** every corner of the box at home, for fitting a camera to a region */
export const homePoints: V3[] = [...BENCH, [60, 12, 31], [74, 22, 18], [10, 11, 24]];
/** the run: it plays (the camera close on the pins), comes apart, tours its parts, folds home, plays on */
export const drawMechanism = (ctx: Ctx, f: number, env: Env) => {
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  const s = stateAt(f);
  paintFigure(ctx, s, "THE PINS ARE THE SCORE", { cam: zoomed(camAt(s.shares), f) });
};
/** the making: the card's rule, then each part inked and toned in assembly order, then the words */
export const drawMechanismMaking = (ctx: Ctx, f: number, env: Env) => {
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  const s = stateAt(0), ruleP = clamp01((f - T.rule[0]) / (T.rule[1] - T.rule[0])), textP = clamp01((f - T.text[0]) / (T.text[1] - T.text[0]));
  paintFigure(ctx, s, "THE PINS ARE THE SCORE", { card: ruleP < 1 ? ruleP * 0.5 : 0.5 + textP * 0.5, shadow: buildAt("plinth", f)[1], build: (id) => buildAt(id, f) });
};

/** the same figure, film and all, in the hand of another style */
export const mechanismIn = (handId: string, make: (ctx: Ctx, env: Env, f: number) => Hand, making = false): Film => ({
  meta: making
    ? { title: `Mechanism · the 18-note movement, drawn (${handId})`, W, H, fps: FPS, bpm: 100, durationFrames: N_DRAW, kind: "drawing", poster: N_DRAW - 1 }
    : { title: `Mechanism · the 18-note movement (${handId})`, W, H, fps: FPS, bpm: 100, durationFrames: N, kind: "explainer", poster: 140 },
  assets: { images: {} },
  shots: [{ id: "figure", start: 0, end: making ? N_DRAW : N, draw: (ctx, f, env) => { ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); setHand(make(ctx, env, f)); try { (making ? drawMechanismMaking : drawMechanism)(ctx, f, env); } finally { setHand(flatHand()); } } }],
});
/** the plain film: the movement in the house isometric hand (flat planes, three tones, no line) */
export const mechanism: Film = mechanismIn("isometric", () => isometricHand());

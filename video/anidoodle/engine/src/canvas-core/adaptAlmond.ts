import { rng, fractal, type Medium, type P } from "./core";
import type { Film } from "./film";
import { bounds, clamp, inside, mix, smooth } from "./gallery";
import { fit, runProcess, timeline, type Proc } from "./sumiEKit";
import { fill, oilStroke, weave, type OStroke } from "./paintedOilKit";
import { KOI_HI, koiBody, koiFins, padShape, tail } from "./koi";

// A KOI IN THE ALMOND-BLOSSOM HAND · adapted from a picture the user brought.
//
// REFERENCE: Vincent van Gogh, Almond Blossom (1890), public domain (Wikimedia Commons; sha256 and
// source in engine/assets/refs/PROVENANCE.json). What is borrowed is the HAND.
// The subject (a flowering branch against the sky), the composition (branches crossing the whole
// field from the lower edge) and the blossoms themselves are not taken. The subject here is the
// launch film's own koi, in its own pond, laid out as in koi.ts, so the same fish can be seen
// changing hands.
//
// MEDIUM RECIPE, written from the painting at full size and at a 3x crop:
//   MARK: opaque oil, a loaded bristle brush, short strokes about a finger long. The ground (his
//     sky, our water) is laid in small patches of strokes that share a direction, the patches
//     turning against each other, so the flat colour shimmers without ever breaking into dabs.
//     Forms are painted ALONG their length (a branch in strokes that run with it), so the form's
//     own grain reads. Lights are thick: the blossoms stand off the canvas, ridged.
//   EDGE: hard and outlined. The Japanese-print line: a dark blue-green contour laid last with a
//     small round brush, broken, heavier on the shadow side, sometimes skipping a stretch
//     entirely. Ground strokes butt up to the forms; nothing is blended across an edge.
//   ORDER: the ground first, everywhere; the forms over it in their mid tone; their lights; the
//     contour; the last thick whites.
//   PAPER: canvas, the weave showing through the thinner ground strokes.
//   PALETTE: turquoise to cerulean for the ground (value range narrow and high, L 0.68-0.84); a
//     cool sage and grey-green for the woody forms; cream and lead white warmed with a yellow-green
//     heart; a whisper of pink and rust; the contour a deep blue-green, never black.
// WHAT IT IS NOT: nearest by eye is paintedOil (the same bristle mark and impasto). It differs in
//   three things: a high-key flat decorative ground instead of a lit room, a drawn dark contour
//   (paintedOil has none: its edges are found and lost), and no modelling in depth beyond one
//   step of shadow. The analyzer's nearest (charcoalErasure, storybook) are wrong by eye.

const W = 1080, H = 1080, N = 450; // 15 s; the last 30 frames are the finished picture
const OIL: Medium = { nib: 1, taper: 1, pressure: 1, retrace: false, wobble: 0, rough: 0 };

// ---------------------------------------------------------------- colour
const WATER = ["#6aa4b2", "#79b1bb", "#88bcc1", "#97c6c6", "#a9d1cc"];
const SHADE_W = "#5a92a1";
const SAGE = ["#6f8f74", "#88a684", "#a2bb96", "#bccdaa"];
const CREAM = "#f1eedc", CREAM_S = "#c7d3c1", LEAD = "#fbf8ea";
const RED = "#dc5f30", RED_S = "#ad4429", RED_L = "#ec8a55";
const CONTOUR = "#27413c", CONTOUR_2 = "#34524a";
const pick = (stops: string[], t: number) => { const f = clamp(t) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(f)); return mix(stops[i], stops[i + 1], f - i); };

// ---------------------------------------------------------------- the forms (koi.ts's own)
const b = koiBody(), fins = koiFins(b), cau = tail(b);
const PADS: [number, number, number, number, number][] = [[905, 205, 168, 2.3, 3100], [890, 905, 120, 3.6, 3300], [120, 640, 88, 0.2, 3400]];
const padShapes = PADS.map(([x, y, r, n, s]) => padShape(x, y, r, n, s));
const patches = KOI_HI.map(([t, s, dt, ds, seed]) => { const r = rng(seed * 17), pts: P[] = []; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, kk = 0.8 + r() * 0.35; pts.push(b.at(t + Math.cos(a) * dt * kk, s + Math.sin(a) * ds * kk)); } return smooth(pts, true, 6); });

// the body's own frame, inverted by lookup: where along the fish (t) and across it (s) a point is
const TS: { p: P; t: number; s: number }[] = [];
for (let t = 0; t <= 1.0001; t += 0.01) for (let s = -1; s <= 1.0001; s += 0.1) TS.push({ p: b.at(t, s), t, s });
const frameOf = (x: number, y: number) => { let best = TS[0], d = 1e9; for (const q of TS) { const e = (q.p[0] - x) ** 2 + (q.p[1] - y) ** 2; if (e < d) { d = e; best = q; } } return best; };
const alongBody = (x: number, y: number) => { const q = frameOf(x, y), a = b.at(Math.min(1, q.t + 0.01), q.s), c = b.at(Math.max(0, q.t - 0.01), q.s); return Math.atan2(a[1] - c[1], a[0] - c[0]); };
// the fish's cast shadow on the pond floor, down and right, as in the marker plate
const castShadow = [b.outline, cau.shape].map((s) => s.map(([x, y]) => [x + 30, y + 40] as P));
const inCast = (x: number, y: number) => castShadow.some((s) => inside(s, x, y));
const onForm = (x: number, y: number) => inside(b.outline, x, y) || padShapes.some((s) => inside(s, x, y));

// ---------------------------------------------------------------- the passes
type Stage = { name: string; per: number; strokes: OStroke[]; clip?: P[][]; out?: P[][]; within?: P[] }; // out: kept clear, e.g. a fin's line where the fin runs under the body
const st = (ctrl: P[], w: number, c0: string, seed: number, c1 = c0, imp = 0.4, dry = 0.3, load = 1.05): OStroke => ({ ctrl, w, c0, c1, load, dry, impasto: imp, jit: 0.06, seed });
// a broken contour: the outline walked in short strokes of the small brush, a gap now and then,
// heavier on the side away from the light (upper left)
const contour = (path: P[], closed: boolean, w: number, seed: number, skip = 0.16): OStroke[] => {
  const r = rng(seed), pts = closed ? [...path, path[0]] : path, out: OStroke[] = [];
  let i = 0;
  while (i < pts.length - 2) {
    const n = 12 + Math.floor(r() * 16), seg = pts.slice(i, Math.min(pts.length, i + n + 2)); i += n;
    if (seg.length < 2 || r() < skip) continue;
    const m = seg[Math.floor(seg.length / 2)], prev = seg[0], next = seg[seg.length - 1], nx = -(next[1] - prev[1]), ny = next[0] - prev[0], shade = clamp(0.5 + 0.5 * ((nx * 0.62 + ny * 0.78) / (Math.hypot(nx, ny) || 1)));
    out.push(st(seg, w * (0.6 + 0.7 * shade) * (0.85 + 0.3 * r()), r() < 0.3 ? CONTOUR_2 : CONTOUR, seed * 100 + out.length, CONTOUR, 0.25, 0.35, 1.1));
    void m;
  }
  return out;
};

const stages = (): Stage[] => {
  const S: Stage[] = [];
  const FRAME: P[] = [[-30, -30], [W + 30, -30], [W + 30, H + 30], [-30, H + 30]];
  // 1. the ground: the whole pond in patches of like-directed strokes, darker in the fish's cast shadow
  const patchDir = (x: number, y: number) => (fractal(401, x, y, 0.006, 0.006, 2) - 0.5) * 5.2 + 0.25;
  S.push({ name: "water", per: 0.18, strokes: fill({
    region: FRAME, step: 19, len: 58, w: 20, dir: patchDir, seed: 410, dry: 0.2, load: 1.15, impasto: 0.42, jit: 0.08, soft: 0.2, bend: 0.5, sweep: 0.9,
    color: (x, y) => (onForm(x, y) && !inCast(x, y) ? null : inCast(x, y) ? mix(SHADE_W, pick(WATER, fractal(402, x, y, 0.01, 0.01, 2)), 0.25) : pick(WATER, fractal(402, x, y, 0.006, 0.006, 3) * 1.25 - 0.12)),
  }) });
  S.push({ name: "water lights", per: 0.3, strokes: fill({
    region: FRAME, step: 34, len: 46, w: 14, dir: patchDir, seed: 415, dry: 0.35, impasto: 0.4, jit: 0.06, soft: 0.2, bend: 0.5, sweep: 0.9,
    color: (x, y) => (onForm(x, y) || inCast(x, y) || fractal(416, x, y, 0.012, 0.012, 2) < 0.58 ? null : fractal(417, x, y, 0.02, 0.02, 1) > 0.5 ? mix(WATER[3], WATER[4], 0.5) : "#6fa7b8"),
  }) });
  // 2. the pads: sage, painted from the stalk outward like a leaf's own veins
  padShapes.forEach((pad, i) => {
    const [cx, cy, rr] = PADS[i];
    S.push({ name: `pad${i}`, per: 0.5, clip: [pad], strokes: fill({
      region: pad, step: 11, len: 30, w: 11, seed: 420 + i, dry: 0.3, impasto: 0.35, jit: 0.06, soft: 0.2,
      dir: (x, y) => Math.atan2(y - cy, x - cx),
      color: (x, y) => { const d = Math.hypot(x - cx, y - cy) / rr, lit = clamp(0.5 - 0.35 * ((x - cx) * 0.62 + (y - cy) * 0.78) / rr); return pick(SAGE, clamp(0.25 + 0.5 * lit + 0.2 * d + (fractal(430 + i, x, y, 0.03, 0.03, 2) - 0.5) * 0.3)); },
    }) });
  });
  // 3. the body in cream, strokes running nose to tail; one step of cool shadow on the far flank
  S.push({ name: "body", per: 0.6, clip: [b.outline], strokes: fill({
    region: b.outline, step: 10, len: 34, w: 12, seed: 440, dry: 0.25, impasto: 0.45, jit: 0.05, soft: 0.2, dir: alongBody,
    color: (x, y) => { const q = frameOf(x, y); return q.s > 0.45 ? mix(CREAM_S, CREAM, clamp((0.9 - q.s) * 1.5)) : CREAM; },
  }) });
  // 4. fins and tail: long strokes laid down each ray, cream going cool toward the edge, sage between
  const rayStrokes = (rays: P[][], seed: number, w: number) => rays.map((ray, k) => st(ray, w, CREAM, seed + k, CREAM_S, 0.3, 0.45, 1));
  fins.forEach((f, i) => S.push({ name: `fin${i}`, per: 1.2, clip: [f.shape], strokes: [...fill({ region: f.shape, step: 9, len: 22, w: 9, seed: 450 + i, dry: 0.4, impasto: 0.2, jit: 0.05, dir: (x, y) => Math.atan2(y - f.rays[0][0][1], x - f.rays[0][0][0]), color: () => mix(SAGE[3], CREAM_S, 0.5) }), ...rayStrokes(f.rays, 460 + i * 20, 8)] }));
  S.push({ name: "tail", per: 1, clip: [cau.shape], strokes: [...fill({ region: cau.shape, step: 10, len: 28, w: 10, seed: 470, dry: 0.4, impasto: 0.2, jit: 0.05, dir: (x, y) => Math.atan2(y - b.at(0.955, 0)[1], x - b.at(0.955, 0)[0]), color: () => mix(SAGE[3], CREAM_S, 0.5) }), ...rayStrokes(cau.rays, 480, 9)] });
  // 5. the red: vermilion laid along the body, rust on the shadow flank, a lighter pull on the back
  patches.forEach((pt, i) => S.push({ name: `red${i}`, per: 0.9, clip: [pt], within: b.outline, strokes: fill({
    region: pt, step: 8, len: 26, w: 10, seed: 500 + i, dry: 0.22, impasto: 0.5, jit: 0.05, soft: 0.15, dir: alongBody,
    color: (x, y) => { const q = frameOf(x, y); return q.s > 0.4 ? RED_S : q.s < -0.35 ? mix(RED, RED_L, 0.6) : RED; },
  }) }));
  // 6. the water lily on the big pad: thick white petals pulled from the heart outward, a yellow-green heart
  const LC: P = [880, 195], petals: OStroke[] = [];
  for (let k = 0; k < 11; k++) { const a = (k / 11) * Math.PI * 2 + 0.3, L = 46 + (k % 3) * 10; petals.push(st([[LC[0] + Math.cos(a) * 10, LC[1] + Math.sin(a) * 10], [LC[0] + Math.cos(a + 0.08) * L * 0.6, LC[1] + Math.sin(a + 0.08) * L * 0.6], [LC[0] + Math.cos(a) * L, LC[1] + Math.sin(a) * L]], 20, LEAD, 540 + k, k % 4 === 0 ? "#efc9c0" : CREAM, 0.85, 0.2, 1.3)); }
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2, L = 26; petals.push(st([[LC[0], LC[1]], [LC[0] + Math.cos(a) * L, LC[1] + Math.sin(a) * L]], 16, "#f7f2de", 560 + k, "#f3dcd0", 0.9, 0.15, 1.3)); }
  petals.push(st([[LC[0] - 6, LC[1] - 2], [LC[0] + 2, LC[1] + 3], [LC[0] + 8, LC[1] - 1]], 13, "#d8d676", 570, "#c9c85a", 0.9, 0.1, 1.4));
  S.push({ name: "lily", per: 2, strokes: petals });
  // 7. the contour: the dark blue-green line, laid last, broken
  const n = b.outline.length / 2, Lside = b.outline.slice(0, n), Rside = b.outline.slice(n).reverse(), cut = Math.round(n * 0.965);
  S.push({ name: "fin lines", per: 1.4, out: [b.outline], strokes: [...fins.flatMap((f, i) => contour(f.shape, true, 4, 610 + i, 0.08)), ...contour(cau.shape.slice(3, cau.shape.length - 3), false, 5, 620, 0.06)] });
  S.push({ name: "contour", per: 1.4, strokes: [
    ...contour([...Lside.slice(0, cut).reverse(), ...Rside.slice(0, cut)], false, 6.5, 600, 0.05),
    ...padShapes.flatMap((p, i) => contour(p, true, 5, 630 + i, 0.1)),
    ...patches.flatMap((p, i) => contour(p, true, 2.4, 640 + i, 0.55)),
  ] });
  // 8. the head: gill arcs and eyes in the contour colour, a glint of lead white
  const head: OStroke[] = [];
  [-1, 1].forEach((sd, hi) => {
    const gill: P[] = []; for (let i = 0; i <= 6; i++) gill.push(b.at(0.155 - Math.sin((i / 6) * Math.PI) * 0.03, sd * (0.98 - i * 0.1)));
    head.push(st(gill, 4, CONTOUR, 700 + hi, CONTOUR, 0.25, 0.4, 1.1));
    const e = b.at(0.085, sd * 0.8), ring = (r: number) => [0, 1, 2, 3, 4, 5, 6].map((k) => [e[0] + Math.cos(k * 1.05) * r, e[1] + Math.sin(k * 1.05) * r] as P);
    head.push(st(ring(6), 7, "#e3d48f", 710 + hi, "#e3d48f", 0.5, 0.1, 1.3), st(ring(2.5), 6, "#1e2a2a", 712 + hi, "#1e2a2a", 0.5, 0.05, 1.4), st([[e[0] - 3, e[1] - 3], [e[0] - 1, e[1] - 4]], 3, LEAD, 714 + hi, LEAD, 0.9, 0, 1.4));
  });
  S.push({ name: "head", per: 2, strokes: head });
  // 9. the last thick whites: light along the back and on the head, a few pulled ripples in the water
  const back: OStroke[] = [[0.2, 0.3, -0.6, 8], [0.335, 0.43, -0.64, 7], [0.47, 0.52, -0.66, 5.5], [0.06, 0.1, -0.4, 7]].map(([t0, t1, sv, w], k) => st([b.at(t0, sv), b.at((t0 + t1) / 2, sv - 0.03), b.at(t1, sv)], w, LEAD, 800 + k, "#f4f1df", 1, 0.2, 1.4));
  const rip: OStroke[] = [];
  [[300, 196, 34], [300, 196, 58], [300, 196, 84]].forEach(([x, y, r], k) => { const a0 = -2.4 + k * 0.2, a1 = a0 + 1.3; rip.push(st([0, 0.5, 1].map((u) => [x + Math.cos(a0 + (a1 - a0) * u) * r, y + Math.sin(a0 + (a1 - a0) * u) * r * 0.62] as P), 6, WATER[4], 820 + k, "#c3e0d8", 0.45, 0.5, 1.1)); });
  S.push({ name: "lights", per: 2, strokes: [...back, ...rip] });
  return S;
};

// ---------------------------------------------------------------- the process
const ground = (g: import("./core").Gfx) => { const c = g.cur, e = g.env; c.setTransform(e.scale, 0, 0, e.scale, 0, 0); c.fillStyle = "#e9e6d8"; c.fillRect(0, 0, e.W, e.H); weave(g, 0.5); };
const finish = (g: import("./core").Gfx) => weave(g, 0.22);
const withClip = (g: import("./core").Gfx, s: Stage, fn: () => void) => {
  if (!s.clip && !s.out) return fn();
  const c = g.cur, ring = (p: P[]) => { c.moveTo(p[0][0], p[0][1]); p.forEach(([x, y]) => c.lineTo(x, y)); c.closePath(); };
  c.save(); c.beginPath();
  if (s.clip) { s.clip.forEach(ring); c.clip("nonzero"); if (s.within) { c.beginPath(); ring(s.within); c.clip(); } } else { c.rect(-50, -50, W + 100, H + 100); s.out!.forEach(ring); c.clip("evenodd"); }
  fn(); c.restore();
};
const build = (k: number): Proc => {
  const tl = timeline(8, k, true);
  stages().forEach((s, si) => {
    const B = Math.max(1, Math.round(2 / s.per));
    for (let a = 0; a < s.strokes.length; a += B) {
      const batch = s.strokes.slice(a, a + B);
      tl.add(batch.length * s.per, (g, p) => withClip(g, s, () => { const f = p * batch.length; batch.forEach((x, i) => { if (p >= 1 || i < Math.floor(f)) oilStroke(g, x, 1); else if (i === Math.floor(f)) oilStroke(g, x, f - i); }); }));
    }
    tl.wait(si === 0 ? 10 : 4);
  });
  return { id: "adaptAlmond", medium: OIL, ground, ops: tl.ops, finish };
};
let PROC: Proc | null = null;
const proc = () => (PROC ??= fit(build, N - 31));

export const STYLE = { id: "adaptAlmond", name: "Almond-blossom hand, adapted", family: "paint", medium: "opaque oil in short patterned strokes on canvas, a broken dark blue-green contour, thick lead-white lights", nearest: "paintedOil", hero: "the launch film's koi, repainted in a hand borrowed from a public-domain painting", house: "styles/house/almond-blossom.json" };

export const adaptAlmond: Film = {
  meta: { title: "Koi · the almond-blossom hand (adapted)", W, H, fps: 30, bpm: 120, durationFrames: N, raster: "cpu" },
  assets: { images: {} },
  shots: [{ id: "paint", start: 0, end: N, draw: (ctx, f, env) => { const p = proc(); runProcess(p, ctx, Math.min(f, p.ops[p.ops.length - 1].t1), env); } }],
};

// MORPH. One silhouette carried across a seam: the ink drop becomes the card, the seal becomes the
// next page. The viewer follows a single object, so the next scene is not a new picture, it is what
// that object turned into (references/motion-grammar.md, "Persistent actor"). Until now the bloom
// and the drop were one-offs; this is the general move.
//
// A shape is a closed outline in screen px. A handoff takes a source shape, a target shape and the
// frames it leaves and lands, and gives the outline at every frame between: it travels (on an arc
// if asked), stretches a little along its own direction while it is moving, and turns into the
// target mostly in the second half of the trip, so it reads as one thing going somewhere and then
// becoming something. On the landing frame it is the target, point for point.
//
//   const h = handoff({ from: circleShape([820, 300], 16), to: rectShape(240, 420, 600, 380, 28), t0: 45, t1: 80, arc: 90 });
//   h.at(f)                       the outline at frame f (exactly the source until t0, exactly the target from t1)
//   fillShape(ctx, env, h.at(f), INK);
//   checkShapes(h.at(80), cardOutlineOfTheNextScene);    throws if the seam jumps more than 2 px
//
// Keep the object's colour and edge the same on both sides: a black drop that lands as a white card
// is two objects. Pure functions of their arguments; nothing here touches the clock or Math.random.
import type { Ctx, Env, P } from "./core";
import { blot, clamp, inOut, lerp, ramp } from "./launchKit";

export type Shape = P[];
export const circleShape = (c: P, r: number, n = 72): Shape => Array.from({ length: n }, (_, i): P => { const a = (i / n) * Math.PI * 2; return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]; });
/** An ink blot, the bloom's wobbling rim (launchKit's `blot`). */
export const blotShape = (c: P, r: number, seed = 88): Shape => blot(c, r, seed);
export const rectShape = (x: number, y: number, w: number, h: number, r = 0, perCorner = 10): Shape => {
  const q = Math.min(r, w / 2, h / 2), pts: P[] = [];
  const corner = (cx: number, cy: number, a0: number) => { if (q <= 0) { pts.push([cx, cy]); return; } for (let i = 0; i <= perCorner; i++) { const a = a0 + (i / perCorner) * (Math.PI / 2); pts.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } };
  corner(x + w - q, y + q, -Math.PI / 2); corner(x + w - q, y + h - q, 0); corner(x + q, y + h - q, Math.PI / 2); corner(x + q, y + q, Math.PI);
  return pts;
};

const inside = (p: P, s: Shape) => { let c = false; for (let i = 0, j = s.length - 1; i < s.length; j = i++) { const a = s[i], b = s[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
/** The same shape, centred on the frame and grown until the whole frame (plus `pad`) is inside it: a card opening into the page. */
export const coverShape = (s: Shape, W: number, H: number, pad = 24): Shape => {
  const c = centreOf(s), at = (k: number) => s.map(([x, y]): P => [W / 2 + (x - c[0]) * k, H / 2 + (y - c[1]) * k]), corners: P[] = [[-pad, -pad], [W + pad, -pad], [W + pad, H + pad], [-pad, H + pad]];
  let lo = 0, hi = 1; while (!corners.every((q) => inside(q, at(hi)))) { hi *= 2; if (hi > 1e4) throw new Error("morph: this shape cannot cover the frame (its centre must be inside it)"); }
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (corners.every((q) => inside(q, at(mid)))) hi = mid; else lo = mid; }
  return at(hi);
};
const area = (s: Shape) => s.reduce((a, p, i) => { const q = s[(i + 1) % s.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
/** The middle of a shape's bounding box: the point a handoff carries along its path. */
export const centreOf = (s: Shape): P => { const xs = s.map((p) => p[0]), ys = s.map((p) => p[1]); return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]; };
/** `n` points spaced evenly along the outline, clockwise on screen, so any two shapes can be paired point for point. */
export const resample = (shape: Shape, n = 120): Shape => {
  const s = area(shape) < 0 ? [...shape].reverse() : shape, m = s.length, L = s.map((p, i) => Math.hypot(s[(i + 1) % m][0] - p[0], s[(i + 1) % m][1] - p[1])), tot = L.reduce((a, b) => a + b, 0);
  if (m < 3 || tot <= 0) throw new Error("morph: a shape needs at least three points and some size");
  const out: P[] = []; let i = 0, acc = 0;
  for (let k = 0; k < n; k++) { const d = (k / n) * tot; while (i < m - 1 && acc + L[i] < d) acc += L[i++]; const u = L[i] ? (d - acc) / L[i] : 0, a = s[i], b = s[(i + 1) % m]; out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]); }
  return out;
};
// the rotation of b's point order that pairs it best with a, each taken about its own centre and at its own size
const pairUp = (a: Shape, b: Shape): Shape => {
  const n = a.length, norm = (s: Shape) => { const c = centreOf(s), k = Math.sqrt(s.reduce((t, p) => t + (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2, 0) / n) || 1; return s.map(([x, y]): P => [(x - c[0]) / k, (y - c[1]) / k]); };
  const A = norm(a), B = norm(b); let best = 0, bd = Infinity;
  for (let k = 0; k < n; k++) { let d = 0; for (let i = 0; i < n && d < bd; i++) { const q = B[(i + k) % n]; d += (A[i][0] - q[0]) ** 2 + (A[i][1] - q[1]) ** 2; } if (d < bd) { bd = d; best = k; } }
  return b.map((_, i) => b[(i + best) % n]);
};

export type HandoffSpec = {
  from: Shape; to: Shape;
  t0: number; t1: number;        // the frame it leaves, the frame it has landed
  arc?: number;                  // lifts the path between the two (px, up)
  stretch?: number;              // how much it lengthens along its travel at mid-flight (default 0.16; 0 for none)
  turn?: [number, number];       // the part of the trip in which it becomes the target (default [0.3, 1])
  ease?: (t: number) => number; points?: number;
};
/** A handoff, its shapes paired once. `at(f)` is the outline at frame f; `centre(f)` where it is. */
export const handoff = (h: HandoffSpec) => {
  if (!(h.t1 > h.t0)) throw new Error(`morph: the handoff lands at ${h.t1}, not after it leaves at ${h.t0}`);
  if (h.turn && !(h.turn[1] > h.turn[0])) throw new Error(`morph: turn [${h.turn}] must end after it starts`);
  const n = Math.max(8, Math.round(h.points ?? 160)), A = resample(h.from, n), B = pairUp(A, resample(h.to, n)), ca = centreOf(A), cb = centreOf(B), ease = h.ease ?? inOut, [m0, m1] = h.turn ?? [0.3, 1];
  const centre = (f: number): P => { const u = ramp(f, h.t0, h.t1), e = ease(u); return [lerp(ca[0], cb[0], e), lerp(ca[1], cb[1], e) - Math.sin(Math.PI * u) * (h.arc ?? 0)]; };
  const at = (f: number): Shape => {
    if (f <= h.t0) return h.from; if (f >= h.t1) return h.to; // exact at both ends: the seam is the shape itself
    const u = ramp(f, h.t0, h.t1), m = inOut(ramp(u, m0, m1)), c = centre(f), c2 = centre(f + 0.5), c1 = centre(f - 0.5), vx = c2[0] - c1[0], vy = c2[1] - c1[1], v = Math.hypot(vx, vy);
    const k = 1 + (h.stretch ?? 0.16) * Math.sin(Math.PI * u) * clamp(v / 6) * (1 - m), dx = v ? vx / v : 1, dy = v ? vy / v : 0; // longer along the travel, thinner across it, less so as it becomes the target
    return A.map((a, i): P => { const b = B[i], x = lerp(a[0] - ca[0], b[0] - cb[0], m), y = lerp(a[1] - ca[1], b[1] - cb[1], m), al = (x * dx + y * dy) * k, ac = (-x * dy + y * dx) / k; return [c[0] + al * dx - ac * dy, c[1] + al * dy + ac * dx]; });
  };
  return { at, centre, t0: h.t0, t1: h.t1 };
};
// distance from a point to a closed outline (its edges, not only its points)
const toOutline = (p: P, s: Shape) => { let d = Infinity; for (let i = 0; i < s.length; i++) { const a = s[i], b = s[(i + 1) % s.length], vx = b[0] - a[0], vy = b[1] - a[1], t = clamp(((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (vx * vx + vy * vy || 1)); d = Math.min(d, Math.hypot(p[0] - a[0] - vx * t, p[1] - a[1] - vy * t)); } return d; };
/** The largest distance between two outlines in px: every point of each (and 240 more along it) to the other's nearest edge. */
export const shapeGap = (a: Shape, b: Shape) => Math.max(...[...a, ...resample(a, 240)].map((p) => toOutline(p, b)), ...[...b, ...resample(b, 240)].map((p) => toOutline(p, a)));
/** Throws unless the two sides of a seam put the outline in the same place within `tol` px. */
export const checkShapes = (out: Shape, into: Shape, label = "handoff", tol = 2) => {
  const g = shapeGap(out, into);
  if (!(g <= tol)) throw new Error(`morph: ${label} jumps ${g.toFixed(1)} px at the seam; the shape must sit in the same place on both sides`);
  return g;
};
export const pathShape = (ctx: Ctx, s: Shape) => { ctx.beginPath(); s.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
/** The silhouette, filled, in screen px. */
export const fillShape = (ctx: Ctx, env: Env, s: Shape, color: string) => { ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = color; pathShape(ctx, s); ctx.fill(); };

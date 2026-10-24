// MECHANISM KIT. The technical illustrator's bench, in code: a free-angle axonometric camera,
// one light locked to it, solids that know their own silhouettes, turned parts shaded in exact
// bands, hardware that fades as it turns away, a depth-sorted parts list, a closed-form spring for
// exploded views, and the figure card. Every function is pure; nothing reads a clock.
//
// World: millimetres, z up. The camera looks down at elevation E from azimuth A; (cos A, sin A) is
// the floor direction toward the viewer. At A = 45, E = 30 it is the 2:1 dimetric of isometricKit.
//
// The light rides with the camera, up and to the viewer's left, so the same face family is always
// the light one. A face's tone is how many thresholds its light score passes (0, .2, .42, .62):
// five tones per material, darkest side to top. Near a threshold the tone crossfades, so a part
// that turns never flips colour in one frame.
import type { Ctx } from "./core";
import { G, width as glyphWidth } from "./drafting";

export type V3 = [number, number, number];
export type P2 = [number, number];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const unit = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const clamp01 = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t);
export const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const D2R = Math.PI / 180;

// ---------------------------------------------------------------- camera
export class Cam {
  readonly sA: number; readonly cA: number; readonly sE: number; readonly cE: number;
  readonly V: V3; readonly L: V3;
  constructor(public A: number, public E: number, public k: number, public ox: number, public oy: number) {
    this.sA = Math.sin(A * D2R); this.cA = Math.cos(A * D2R); this.sE = Math.sin(E * D2R); this.cE = Math.cos(E * D2R);
    this.V = [this.cA * this.cE, this.sA * this.cE, this.sE];
    this.L = unit([-this.sA, this.cA, 1.2]);
  }
  p(q: V3): P2 { const [x, y, z] = q; return [this.ox + this.k * (x * this.sA - y * this.cA), this.oy + this.k * ((x * this.cA + y * this.sA) * this.sE - z * this.cE)]; }
  /** larger is nearer the viewer */
  depth(q: V3) { return dot(q, this.V); }
  /** screen offset of a world translation (exact in an orthographic camera) */
  dv(v: V3): P2 { return [this.k * (v[0] * this.sA - v[1] * this.cA), this.k * ((v[0] * this.cA + v[1] * this.sA) * this.sE - v[2] * this.cE)]; }
  /** fit world points into a box: the same camera, rescaled and centred */
  static fit(A: number, E: number, pts: V3[], box: [number, number, number, number]): Cam {
    const c = new Cam(A, E, 1, 0, 0), s = pts.map((q) => c.p(q));
    const x0 = Math.min(...s.map((q) => q[0])), x1 = Math.max(...s.map((q) => q[0])), y0 = Math.min(...s.map((q) => q[1])), y1 = Math.max(...s.map((q) => q[1]));
    const k = Math.min((box[2] - box[0]) / (x1 - x0), (box[3] - box[1]) / (y1 - y0));
    return new Cam(A, E, k, (box[0] + box[2]) / 2 - k * (x0 + x1) / 2, (box[1] + box[3]) / 2 - k * (y0 + y1) / 2);
  }
}

// ---------------------------------------------------------------- tone
export const THRESH = [0, 0.2, 0.42, 0.62] as const;
/** a continuous tone level 0..4; integer away from thresholds, a 0.07-wide crossfade across each */
export const level = (score: number, soft = 0.035) => THRESH.reduce((q: number, t: number) => q + smooth(t - soft, t + soft, score), 0);
export type Material = { ramp: [string, string, string, string, string]; ink: string; seam: string; pigment?: string; accent?: boolean; name?: string };
const hexRgb = (h: string): V3 => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixMemo = new Map<string, string>();
/** the colour of level q of a material, quantised to 1/64 so the memo stays small */
export const toneColour = (m: Material, q: number): string => {
  const Q = Math.round(Math.max(0, Math.min(4, q)) * 64), key = m.ramp[0] + m.ramp[4] + Q;
  let c = mixMemo.get(key); if (c) return c;
  const i = Math.min(3, Math.floor(Q / 64)), f = (Q - i * 64) / 64, a = hexRgb(m.ramp[i]), b = hexRgb(m.ramp[i + 1]);
  c = `rgb(${[0, 1, 2].map((j) => Math.round(a[j] + (b[j] - a[j]) * f)).join(",")})`; mixMemo.set(key, c); return c;
};
export const toneOf = (c: Cam, n: V3) => level(dot(unit(n), c.L));

// ---------------------------------------------------------------- marks
export const W_OUT = 1.6, W_IN = 0.9, W_HAIR = 0.6; // silhouette, inner line, faint line (logical px)
export const path = (ctx: Ctx, pts: P2[], close = true) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (close) ctx.closePath(); };
/** a flat region; the hairline of its own colour closes the antialias seam against its neighbours */
// The making order, for films that draw themselves: a part is inked first (its lines run out to
// full length), then toned (the paper knocks out what is behind it, and the grey sheet is laid
// across it left to right). Set per part by the plate; (1, 1) is the finished drawing.
const REVEAL = { ink: 1, tone: 1, paper: "#ffffff" };
export const setReveal = (ink: number, tone: number, paper = REVEAL.paper) => { REVEAL.ink = ink; REVEAL.tone = tone; REVEAL.paper = paper; };
/** where the making order stands for the part being painted (hands that trace before they fill read it) */
export const reveal = (): { ink: number; tone: number } => ({ ink: REVEAL.ink, tone: REVEAL.tone });
export const solid = (ctx: Ctx, pts: P2[], colour: string, alpha: number) => { ctx.globalAlpha = alpha; ctx.fillStyle = colour; path(ctx, pts); ctx.fill(); ctx.strokeStyle = colour; ctx.lineWidth = 0.45; ctx.lineJoin = "round"; ctx.stroke(); ctx.globalAlpha = 1; };
export const fill = (ctx: Ctx, pts: P2[], colour: string, alpha = 1) => {
  if (pts.length < 3) return;
  if (REVEAL.tone >= 1) return solid(ctx, pts, colour, alpha);
  if (REVEAL.ink < 1) return;
  solid(ctx, pts, REVEAL.paper, alpha); if (REVEAL.tone <= 0) return;
  const x0 = Math.min(...pts.map((q) => q[0])), x1 = Math.max(...pts.map((q) => q[0]));
  ctx.save(); ctx.beginPath(); ctx.rect(x0 - 1, -1e5, (x1 - x0 + 2) * REVEAL.tone, 2e5); ctx.clip(); solid(ctx, pts, colour, alpha); ctx.restore();
};
export const stroke = (ctx: Ctx, pts: P2[], colour: string, w: number, close = false, alpha = 1) => rawStroke(ctx, pts, colour, w, close, alpha, REVEAL.ink);
/** a ruled line; progress < 1 draws its first part only (the pen still travelling) */
export const rawStroke = (ctx: Ctx, pts: P2[], colour: string, w: number, close: boolean, alpha: number, progress: number) => {
  if (pts.length < 2 || progress <= 0) return; ctx.globalAlpha = alpha; ctx.strokeStyle = colour; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.lineJoin = "round"; path(ctx, pts, close);
  if (progress < 1) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (close) L += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]); ctx.setLineDash([L * progress, L + 1]); }
  ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
};
/** a line that must stop on a bare face fades out over its last `fade` px instead of ending on a cap */
export const strokeFade = (ctx: Ctx, a: P2, b: P2, colour: string, w: number, fade: number, alpha = 1) => {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.5) return;
  const g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]), [r, gg, bb] = hexRgb(colour), f = Math.min(0.5, fade / L);
  g.addColorStop(0, `rgba(${r},${gg},${bb},${alpha})`); g.addColorStop(1 - f, `rgba(${r},${gg},${bb},${alpha})`); g.addColorStop(1, `rgba(${r},${gg},${bb},0)`);
  ctx.strokeStyle = g; ctx.lineWidth = w; ctx.lineCap = "butt"; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
};
// ---------------------------------------------------------------- the hand: who makes the marks
// The kit decides WHAT is there (a region of tone q on a material, a silhouette, a crease, a seam);
// the hand decides HOW it is marked, in its own medium. A flat hand fills tones and rules lines; a
// pencil hand hatches, a stipple hand dots, a blueprint hand rules white ink and section-lines the
// part to watch. Any style can draw any machine by bringing a hand. q is 0 (darkest side) to 4 (top).
export type Role = "out" | "lit" | "in" | "crease" | "seam" | "hair" | "light" | "chain";
export type Hand = {
  id: string;
  knock(ctx: Ctx, pts: P2[]): void;                                   // paint the ground back: a part hides what is behind it
  region(ctx: Ctx, pts: P2[], q: number, m: Material, alpha: number): void;
  line(ctx: Ctx, pts: P2[], role: Role, m: Material, close: boolean, alpha: number, progress: number): void;
  dot(ctx: Ctx, at: P2, r: number, m: Material, alpha: number): void;
  sheet(ctx: Ctx, W: number, H: number): void;                          // the ground of the whole card
  frame(ctx: Ctx, W: number, H: number, progress: number): void;        // the card's rule
  text(ctx: Ctx, s: string, x: number, y: number, o: { cap: number; align?: "left" | "right" | "center"; soft?: boolean; alpha?: number }): void;
  shadow?(ctx: Ctx, pts: P2[], strength: number): void;                 // a contact shadow, if the medium has light at all
  coarse?: number;                                                      // > 1: fewer rows on turned parts (flat media need less), for speed
  step?(q: number, m: Material): number;
  opaque?: boolean;                                                     // a full-strength region hides what is under it, so it needs no knock first                                // a medium with few tones: which one q lands on, so a band that repeats its neighbour is not painted
};
const WEIGHT: Record<Role, number> = { out: W_OUT, lit: W_OUT * 1.2, in: W_IN, crease: W_IN, seam: W_HAIR, hair: W_HAIR, light: W_IN, chain: W_HAIR };
/** the plain hand: flat tone fills and ruled lines. The kit's default and its reference. */
export const flatHand = (paper = "#f3f0e8", soft = "#6d6a70", rule = "#9a968e"): Hand => ({
  id: "flat",
  knock: (ctx, pts) => solid(ctx, pts, paper, 1),
  region: (ctx, pts, q, m, a) => solid(ctx, pts, toneColour(m, q), a),
  line: (ctx, pts, role, m, close, a, prog) => {
    const col = role === "crease" || role === "seam" ? m.seam : role === "light" ? "#ffffff" : role === "chain" ? soft : m.ink;
    if (role === "chain") { ctx.save(); ctx.setLineDash([9, 3, 1.5, 3]); rawStroke(ctx, pts, col, WEIGHT[role], close, a, prog); ctx.restore(); return; }
    rawStroke(ctx, pts, col, WEIGHT[role], close, role === "light" ? a * 0.85 : a, prog);
  },
  dot: (ctx, at, r, m, a) => { ctx.globalAlpha = a; ctx.fillStyle = m.ink; ctx.beginPath(); ctx.arc(at[0], at[1], r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; },
  sheet: (ctx, W, H) => { ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H); },
  frame: (ctx, W, H, p) => ruleFrame(ctx, W, H, rule, p),
  text: (ctx, t, x, y, o) => stencil(ctx, t, x, y, { cap: o.cap, colour: o.soft ? soft : "#232227", align: o.align, alpha: o.alpha }),
  shadow: (ctx, pts, k) => { const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length, cy = pts.reduce((a, q) => a + q[1], 0) / pts.length; for (let i = 0; i < 8; i++) { const f = 1 + i * 0.012; solid(ctx, pts.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f + 5 + i] as P2), "#5b574f", 0.022 * k); } },
});
let HAND: Hand = flatHand();
let OFFSET: P2 = [0, 0];
/** the screen offset of the part being painted: hands anchor their patterns to it, so marks travel with their part */
export const offset = (): P2 => OFFSET;
export const setHand = (h: Hand) => { HAND = h; };
// a palette moves every material before the hand sees it: the page colour, the brand, light or dark (assetKit.ts)
let PALETTE: ((m: Material) => Material) | null = null;
export const setPalette = (f: ((m: Material) => Material) | null) => { PALETTE = f; };
const pal = (m: Material) => (PALETTE ? PALETTE(m) : m);
// faint: paint a part at reduced strength where it was a moment ago, with no knock, so whatever is behind
// it stays visible through it
let FAINT = 1;
export const faint = (alpha: number, draw: () => void) => { const g = FAINT; FAINT = g * alpha; try { draw(); } finally { FAINT = g; } };
/**
 * A part turning too fast to see clearly. `draw(angle)` paints the blades at one angle. Before them come
 * `echoes` fainter copies of the blades, each a little further back along the turn, spaced over `sweep`
 * radians, and below those the caller's `swept` shape, if given, painted very faint. When `sweep` is near
 * 0 the turn is slow and only the blades are drawn.
 */
export const spin = (angle: number, sweep: number, draw: (angle: number) => void, o: { echoes?: number; swept?: () => void } = {}) => {
  const n = o.echoes ?? 4, blur = Math.min(1, Math.abs(sweep) / 1.2);
  if (blur > 0.02) { if (o.swept) faint(0.16 * blur, o.swept); for (let k = n; k >= 1; k--) faint(0.42 * blur * (1 - k / (n + 1)) ** 1.4, () => draw(angle - (sweep * k) / n)); }
  draw(angle);
};
export const hand = () => HAND;
/** a toned region in the current hand, honouring the making order (inked, then toned left to right) */
export const tone = (ctx: Ctx, pts: P2[], m: Material, q: number, alpha = 1) => {
  if (pts.length < 3) return; m = pal(m);
  if (FAINT < 1) { ctx.save(); ctx.globalAlpha = alpha * FAINT; HAND.region(ctx, pts, q, m, alpha * FAINT); ctx.restore(); return; }
  if (REVEAL.tone >= 1) { if (!(HAND.opaque && alpha >= 1)) HAND.knock(ctx, pts); HAND.region(ctx, pts, q, m, alpha); return; }
  if (REVEAL.ink < 1) return;
  HAND.knock(ctx, pts); if (REVEAL.tone <= 0) return;
  const x0 = Math.min(...pts.map((v) => v[0])), x1 = Math.max(...pts.map((v) => v[0]));
  ctx.save(); ctx.beginPath(); ctx.rect(x0 - 1, -1e5, (x1 - x0 + 2) * REVEAL.tone, 2e5); ctx.clip(); HAND.region(ctx, pts, q, m, alpha); ctx.restore();
};
/** paint the ground back over a shape without toning it (the paper inside a hull) */
export const knock = (ctx: Ctx, pts: P2[]) => { if (FAINT >= 1 && pts.length >= 3 && (REVEAL.tone >= 1 || REVEAL.ink >= 1)) HAND.knock(ctx, pts); };
export const ink = (ctx: Ctx, pts: P2[], role: Role, m: Material, close = false, alpha = 1) => { if (pts.length >= 2 && REVEAL.ink > 0) HAND.line(ctx, pts, role, pal(m), close, alpha * FAINT, REVEAL.ink); };
export const inkDot = (ctx: Ctx, at: P2, r: number, m: Material, alpha = 1) => { if (REVEAL.ink >= 1) HAND.dot(ctx, at, r, pal(m), alpha * FAINT); };
const ruleFrame = (ctx: Ctx, W: number, H: number, colour: string, p: number, pad = 34) => {
  if (p <= 0) return; ctx.strokeStyle = colour; ctx.lineWidth = 1.2; ctx.globalAlpha = 1; ctx.lineCap = "butt"; ctx.setLineDash([]);
  const L = 2 * (W + H - 4 * pad) * clamp01(p), segs: [P2, P2][] = [[[pad, pad], [W - pad, pad]], [[W - pad, pad], [W - pad, H - pad]], [[W - pad, H - pad], [pad, H - pad]], [[pad, H - pad], [pad, pad]]];
  let left = L; ctx.beginPath(); for (const [a, b] of segs) { if (left <= 0) break; const l = Math.hypot(b[0] - a[0], b[1] - a[1]), f = Math.min(1, left / l); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f); left -= l; } ctx.stroke();
};

export const hull = (pts: P2[]): P2[] => {
  const s = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (s.length < 3) return s;
  const cr = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: P2[] = [], up: P2[] = [];
  for (const p of s) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = s.length - 1; i >= 0; i--) { const p = s[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
};

// ---------------------------------------------------------------- plans (floor outlines)
export const rrect = (x: number, y: number, w: number, d: number, r: number, steps = 6): P2[] => {
  r = Math.max(0, Math.min(r, w / 2, d / 2)); if (r === 0) return [[x, y], [x + w, y], [x + w, y + d], [x, y + d]];
  const c: [number, number, number][] = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + d - r, 0], [x + r, y + d - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  return c.flatMap(([cx, cy, a0]) => Array.from({ length: steps + 1 }, (_, i) => { const a = a0 + (i / steps) * (Math.PI / 2); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as P2; }));
};
export const circle = (cx: number, cy: number, r: number, steps = 40): P2[] => Array.from({ length: steps }, (_, i) => { const a = (i / steps) * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as P2; });
const ccw = (ring: P2[]) => ring.reduce((s, a, i) => { const b = ring[(i + 1) % ring.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) > 0;

// ---------------------------------------------------------------- prisms: a convex plan extruded up
export type PrismOpts = { lit?: boolean; seams?: number[]; bevel?: number; outline?: boolean; inner?: (ctx: Ctx) => void; off?: P2 };
/** paints a convex floor plan extruded from z to z + h: paper, sides by tone, top, crease, bevel, seams, outline */
export const prism = (ctx: Ctx, c: Cam, ring: P2[], z: number, h: number, m: Material, o: PrismOpts = {}) => {
  const [dx, dy] = o.off ?? [0, 0], P = (q: V3): P2 => { const s = c.p(q); return [s[0] + dx, s[1] + dy]; };
  const R = ccw(ring) ? ring : [...ring].reverse(), n = R.length, top = R.map(([x, y]) => P([x, y, z + h])), bot = R.map(([x, y]) => P([x, y, z]));
  const out = hull(top.concat(bot)); knock(ctx, out);
  const facing: boolean[] = [];
  for (let i = 0; i < n; i++) {
    const a = R[i], b = R[(i + 1) % n], nx = b[1] - a[1], ny = -(b[0] - a[0]), l = Math.hypot(nx, ny) || 1, nn: V3 = [nx / l, ny / l, 0];
    facing[i] = nn[0] * c.cA + nn[1] * c.sA > 1e-9; if (!facing[i]) continue;
    tone(ctx, [bot[i], bot[(i + 1) % n], top[(i + 1) % n], top[i]], m, Math.min(3, toneOf(c, nn)));
  }
  tone(ctx, top, m, 4);
  const runs: P2[][] = []; // the top ring along facing edges: the crease where the top meets the sides
  for (let i = 0; i < n; i++) if (facing[i]) { const last = runs[runs.length - 1]; if (last && facing[(i - 1 + n) % n] && last[last.length - 1] === top[i]) last.push(top[(i + 1) % n]); else runs.push([top[i], top[(i + 1) % n]]); }
  for (const s of o.seams ?? []) for (let i = 0; i < n; i++) if (facing[i]) ink(ctx, [P([R[i][0], R[i][1], z + s]), P([R[(i + 1) % n][0], R[(i + 1) % n][1], z + s])], "seam", m);
  if (o.bevel) { // a bright line just inside the crease: the light catching a softened edge
    const cx = R.reduce((s, q) => s + q[0], 0) / n, cy = R.reduce((s, q) => s + q[1], 0) / n;
    const ins = R.map(([x, y]) => { const l = Math.hypot(x - cx, y - cy) || 1; return P([x - ((x - cx) / l) * o.bevel!, y - ((y - cy) / l) * o.bevel!, z + h]); });
    for (let i = 0; i < n; i++) if (facing[i]) ink(ctx, [ins[i], ins[(i + 1) % n]], "light", m);
  }
  o.inner?.(ctx);
  runs.forEach((r) => ink(ctx, r, "crease", m));
  if (o.outline !== false) ink(ctx, out, o.lit ? "lit" : "out", m, true);
  return out;
};
export const box = (ctx: Ctx, c: Cam, x: number, y: number, z: number, w: number, d: number, h: number, m: Material, o: PrismOpts & { r?: number } = {}) =>
  prism(ctx, c, rrect(x, y, w, d, o.r ?? 0), z, h, m, o);

// ---------------------------------------------------------------- frames and turned parts
export type Frame = { o: V3; a: V3; u: V3; v: V3 };
export const frameAlong = (o: V3, a: V3): Frame => { a = unit(a); const h: V3 = Math.abs(a[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1], u = unit(cross(h, a)); return { o, a, u, v: cross(a, u) }; };
export const at = (F: Frame, s: number, r: number, th: number): V3 => add(add(F.o, mul(F.a, s)), add(mul(F.u, r * Math.cos(th)), mul(F.v, r * Math.sin(th))));
export const radial = (F: Frame, th: number): V3 => add(mul(F.u, Math.cos(th)), mul(F.v, Math.sin(th)));
/** how squarely the surface of a turned part faces the viewer at (s, th), -1..1 */
export const facingAt = (c: Cam, F: Frame, th: number, slope = 0) => dot(unit(sub(radial(F, th), mul(F.a, slope))), c.V);
export type Profile = { s0: number; s1: number; r: (s: number) => number; dr: (s: number) => number };
export const cyl = (s0: number, s1: number, r: number): Profile => ({ s0, s1, r: () => r, dr: () => 0 });
export const cone = (s0: number, s1: number, r0: number, r1: number): Profile => ({ s0, s1, r: (s) => r0 + ((r1 - r0) * (s - s0)) / (s1 - s0), dr: () => (r1 - r0) / (s1 - s0) });
/** a dome or a ball segment: radius R sphere centred at sc on the axis, between s0 and s1 */
export const sphere = (s0: number, s1: number, sc: number, R: number): Profile => ({ s0, s1, r: (s) => Math.sqrt(Math.max(1e-6, R * R - (s - sc) ** 2)), dr: (s) => -(s - sc) / Math.sqrt(Math.max(1e-3, R * R - (s - sc) ** 2)) });

type Arc = [number, number] | null;
const wrap = (a: number) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
// The interval of angles (relative to the view's own angle) where cos(th - centre) >= c, cut to
// [-half, half]; the largest piece if the cut leaves two.
const band = (centre: number, c: number, half: number): Arc => {
  if (c > 1 || half <= 0) return null; const g = c < -1 ? Math.PI : Math.acos(c); if (g >= Math.PI) return [-half, half];
  let best: Arc = null;
  for (const k of [-2 * Math.PI, 0, 2 * Math.PI]) { const lo = Math.max(-half, centre - g + k), hi = Math.min(half, centre + g + k); if (hi > lo && (!best || hi - lo > best[1] - best[0])) best = [lo, hi]; }
  return best;
};

export type TurnOpts = { caps?: [boolean, boolean]; lit?: boolean; off?: P2; rows?: number; outline?: boolean; capTone?: [number?, number?]; rims?: number[] };
/** A surface of revolution about frame F, shaded in exact light bands: every band's border is solved
 *  per ring in closed form, so curved bodies never staircase, and a band that appears is born at zero width. */
export const turned = (ctx: Ctx, c: Cam, F: Frame, pr: Profile, m: Material, o: TurnOpts = {}) => {
  const [dx, dy] = o.off ?? [0, 0], P = (q: V3): P2 => { const s = c.p(q); return [s[0] + dx, s[1] + dy]; };
  const pl = (w: V3) => [dot(w, F.u), dot(w, F.v), dot(w, F.a)] as V3;
  const [vu, vv, va] = pl(c.V), [lu, lv, la] = pl(c.L), phV = Math.atan2(vv, vu), Vp = Math.hypot(vu, vv), phL = Math.atan2(lv, lu), Lp = Math.hypot(lu, lv);
  const screenLen = Math.hypot(...(c.dv(mul(F.a, pr.s1 - pr.s0)) as [number, number])) + c.k * Math.abs(pr.r(pr.s1) - pr.r(pr.s0));
  const N = o.rows ?? Math.max(8, Math.min(120, Math.ceil(screenLen / (2.5 * (HAND.coarse ?? 1)))));
  const ss = Array.from({ length: N + 1 }, (_, i) => pr.s0 + ((pr.s1 - pr.s0) * i) / N);
  const rows = ss.map((s) => {
    const r = pr.r(s), d = pr.dr(s), len = Math.hypot(1, d), nr = 1 / len, na = -d / len;
    const vis = Vp < 1e-9 ? (na * va > 0 ? Math.PI : 0) : Math.acos(Math.max(-1, Math.min(1, (-na * va) / (nr * Vp))));
    const lvl = THRESH.map((t) => (Lp < 1e-9 ? (na * la >= t ? ([-vis, vis] as Arc) : null) : band(wrap(phL - phV), (t - na * la) / (nr * Lp), vis)));
    return { s, r, vis, lvl };
  });
  const pt = (i: number, rel: number) => P(at(F, rows[i].s, rows[i].r, phV + rel));
  // the region between two angle curves over runs of rows where it exists; it closes to a point where it is born
  const region = (get: (i: number) => Arc): P2[][] => {
    const polys: P2[][] = []; let i = 0;
    while (i <= N) {
      if (!get(i)) { i++; continue; }
      const j0 = i; while (i <= N && get(i)) i++; const j1 = i - 1;
      const left: P2[] = [], right: P2[] = [];
      if (j0 > 0) { const a = get(j0)!; left.push(pt(j0 - 1, (a[0] + a[1]) / 2)); }
      for (let j = j0; j <= j1; j++) { const a = get(j)!; left.push(pt(j, a[0])); right.push(pt(j, a[1])); }
      if (j1 < N) { const a = get(j1)!; right.push(pt(j1 + 1, (a[0] + a[1]) / 2)); }
      // at an end of the solid the band is bounded by the end's circle, never by a chord across it
      const arc = (i: number, from: number, to: number) => { const n = Math.max(2, Math.min(16, Math.ceil((Math.abs(to - from) * c.k * rows[i].r) / 5))); return Array.from({ length: n - 1 }, (_, k) => pt(i, from + ((to - from) * (k + 1)) / n)); };
      const tail = j1 === N ? arc(N, get(N)![0], get(N)![1]) : [], head = j0 === 0 ? arc(0, get(0)![1], get(0)![0]) : [];
      polys.push(left.concat(tail, right.reverse(), head));
    }
    return polys;
  };
  const sideArc = (i: number): Arc => (rows[i].vis > 0.01 ? [-rows[i].vis, rows[i].vis] : null);
  const ring = (i: number, steps = 64) => Array.from({ length: steps }, (_, j) => pt(i, (j / steps) * 2 * Math.PI));
  const lit = o.lit ? 0.35 : 0;
  region(sideArc).forEach((p) => tone(ctx, p, m, 0 + lit));
  // the bands nest, so one that lands on the same tone as the band under it adds nothing
  let under = HAND.step?.(lit, m);
  for (let t = 0; t < 4; t++) { const q = Math.min(t === 3 ? 4 : 3.4, t + 1) + lit, k = HAND.step?.(q, m); if (k !== undefined && k === under) continue; under = k; region((i) => rows[i].lvl[t]).forEach((p) => tone(ctx, p, m, q)); }
  // end caps: a disc faces the viewer at one end at most
  const caps = o.caps ?? [true, true], capVis = [dot(F.a, c.V) < 0, dot(F.a, c.V) > 0];
  const capIdx = [0, N];
  [0, 1].forEach((e) => { if (!caps[e] || !capVis[e]) return; const nrm = e ? F.a : mul(F.a, -1); tone(ctx, ring(capIdx[e]), m, (o.capTone?.[e] ?? toneOf(c, nrm)) + lit); });
  for (const s of o.rims ?? []) { const i = Math.round(((s - pr.s0) / (pr.s1 - pr.s0)) * N), v = rows[i].vis; if (v > 0.05) ink(ctx, Array.from({ length: 33 }, (_, j) => pt(i, -v + (2 * v * j) / 32)), "seam", m); }
  if (o.outline === false) return;
  const w: Role = o.lit ? "lit" : "out";
  [0, 1].forEach((e) => { const i = capIdx[e]; if (caps[e] && capVis[e]) ink(ctx, ring(i), "in", m, true); });
  const L: P2[] = [], Rr: P2[] = [];
  rows.forEach((row, i) => { if (row.vis > 0.01) { L.push(pt(i, -row.vis)); Rr.push(pt(i, row.vis)); } });
  ink(ctx, L, w, m); ink(ctx, Rr, w, m);
  [0, 1].forEach((e) => { const i = capIdx[e], v = rows[i].vis; if (caps[e] && capVis[e]) ink(ctx, Array.from({ length: 33 }, (_, j) => pt(i, v + ((2 * Math.PI - 2 * v) * j) / 32)), w, m); else if (v > 0.01) ink(ctx, Array.from({ length: 33 }, (_, j) => pt(i, -v + (2 * v * j) / 32)), w, m); });
};

/** a flat disc (a washer face, a screw head, a dial) lying in the plane through `o` with normal `n` */
export const disc = (c: Cam, o: V3, n: V3, r: number, steps = 32, off: P2 = [0, 0]): P2[] => {
  const F = frameAlong(o, n); return Array.from({ length: steps }, (_, i) => { const s = c.p(at(F, 0, r, (i / steps) * 2 * Math.PI)); return [s[0] + off[0], s[1] + off[1]] as P2; });
};
/** a slotted screw head seated on a face: domed disc, rim line, slot */
export const screw = (ctx: Ctx, c: Cam, o: V3, n: V3, r: number, m: Material, slot = 0.6, off: P2 = [0, 0]) => {
  const F = frameAlong(o, n), lift = add(o, mul(F.a, r * 0.35));
  tone(ctx, disc(c, o, n, r, 24, off), m, toneOf(c, n) - 0.6); ink(ctx, disc(c, o, n, r, 24, off), "hair", m, true);
  tone(ctx, disc(c, lift, n, r * 0.72, 24, off), m, toneOf(c, n));
  const e = [at(F, r * 0.35, r * 0.7, slot), at(F, r * 0.35, r * 0.7, slot + Math.PI)].map((q) => { const s = c.p(q); return [s[0] + off[0], s[1] + off[1]] as P2; });
  ink(ctx, e, "in", m);
};

/** a flat plate of any convex outline lying in a frame's (u, v) plane, thickness t along its axis: a lever, a vane, a bracket */
export const slab = (ctx: Ctx, c: Cam, F: Frame, ring: P2[], t: number, m: Material, o: { lit?: boolean; off?: P2 } = {}) => {
  const [dx, dy] = o.off ?? [0, 0], P = (q: V3): P2 => { const s = c.p(q); return [s[0] + dx, s[1] + dy]; };
  const R = ccw(ring) ? ring : [...ring].reverse(), n = R.length, W3 = (q: P2, s: number): V3 => add(add(F.o, mul(F.a, s)), add(mul(F.u, q[0]), mul(F.v, q[1])));
  const back = R.map((q) => P(W3(q, 0))), front = R.map((q) => P(W3(q, t))), out = hull(back.concat(front)), lit = o.lit ? 0.3 : 0;
  knock(ctx, out);
  for (let i = 0; i < n; i++) {
    const a = R[i], b = R[(i + 1) % n], nn = unit(add(mul(F.u, b[1] - a[1]), mul(F.v, -(b[0] - a[0]))));
    if (dot(nn, c.V) > 1e-6) tone(ctx, [back[i], back[(i + 1) % n], front[(i + 1) % n], front[i]], m, Math.min(3, toneOf(c, nn)) + lit);
  }
  const capN = dot(F.a, c.V) > 0 ? F.a : mul(F.a, -1), cap = dot(F.a, c.V) > 0 ? front : back;
  tone(ctx, cap, m, toneOf(c, capN) + lit); ink(ctx, cap, "crease", m, true);
  ink(ctx, out, o.lit ? "lit" : "out", m, true);
};
/** a 2D outline of a bar with round ends, from (0,0) to (len,0), half-width w: a lever's plan */
export const leverRing = (len: number, w: number, w2 = w, steps = 10): P2[] => [
  ...Array.from({ length: steps + 1 }, (_, i) => { const a = Math.PI / 2 + (i / steps) * Math.PI; return [Math.cos(a) * w, Math.sin(a) * w] as P2; }),
  ...Array.from({ length: steps + 1 }, (_, i) => { const a = -Math.PI / 2 + (i / steps) * Math.PI; return [len + Math.cos(a) * w2, Math.sin(a) * w2] as P2; }),
];

// ---------------------------------------------------------------- tubes along 3D routes
/** fillet each corner of a 3D polyline with radius R (quadratic Bezier through the corner) */
export const fillet = (pts: V3[], R: number): V3[] => {
  if (pts.length < 3) return pts; const out: V3[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], d = pts[i + 1], ui = unit(sub(b, a)), uo = unit(sub(d, b)), th = Math.acos(Math.max(-1, Math.min(1, dot(ui, uo))));
    const cut = Math.min(R * Math.tan(th / 2), 0.48 * Math.hypot(...sub(b, a)), 0.48 * Math.hypot(...sub(d, b))), p0 = sub(b, mul(ui, cut)), p1 = add(b, mul(uo, cut)), n = Math.max(3, Math.ceil((10 * th) / (Math.PI / 2)));
    for (let j = 0; j <= n; j++) { const t = j / n, q = (x: V3, y: V3) => add(x, mul(sub(y, x), t)); out.push(q(q(p0, b), q(b, p1))); }
  }
  out.push(pts[pts.length - 1]); return out;
};
/** a round tube along a route: body, a shade stripe, a shine stripe, outlines and visible end caps */
export const tubeAlong = (ctx: Ctx, c: Cam, route: V3[], r: number, m: Material, o: { bend?: number; caps?: [boolean, boolean]; off?: P2; lit?: boolean } = {}) => {
  const pts = fillet(route, o.bend ?? Math.max(3, 2.6 * r)), [dx, dy] = o.off ?? [0, 0], S = pts.map((q) => { const s = c.p(q); return [s[0] + dx, s[1] + dy] as P2; }), h = r * c.k;
  const nrm = S.map((_, i) => { const a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1; return [-ty / l, tx / l] as P2; });
  const off = (f: number) => S.map((p, i) => [p[0] + nrm[i][0] * h * f, p[1] + nrm[i][1] * h * f] as P2);
  const Ls: P2 = [-0.55, -0.835], wv = nrm.map((n) => n[0] * Ls[0] + n[1] * Ls[1]);
  const strip = (centre: number, half: number) => { const L: P2[] = [], R: P2[] = []; S.forEach((p, i) => { const cc = centre * wv[i]; L.push([p[0] + nrm[i][0] * h * (cc - half), p[1] + nrm[i][1] * h * (cc - half)]); R.push([p[0] + nrm[i][0] * h * (cc + half), p[1] + nrm[i][1] * h * (cc + half)]); }); return L.concat(R.reverse()); };
  const lit = o.lit ? 0.3 : 0;
  const cap = (i: number, dir: number) => { const j = Math.min(pts.length - 1, Math.max(0, i + dir)), T = unit(sub(pts[i], pts[j])); return { pts: disc(c, pts[i], T, r, 28, [dx, dy]), facing: dot(T, c.V) > 0 }; };
  const caps = o.caps ?? [true, true], ends = [cap(0, 1), cap(pts.length - 1, -1)];
  tone(ctx, off(1).concat(off(-1).reverse()), m, 2 + lit);
  ends.forEach((e, k) => { if (caps[k]) tone(ctx, e.pts, m, 2 + lit); });
  if (h > 1.3) { tone(ctx, strip(-0.62, 0.2), m, 0.6 + lit); tone(ctx, strip(0.44, 0.24), m, 4); }
  ends.forEach((e, k) => { if (caps[k] && e.facing) { tone(ctx, e.pts, m, 3 + lit); ink(ctx, e.pts, "in", m, true); } });
  ink(ctx, off(1), o.lit ? "lit" : "out", m); ink(ctx, off(-1), o.lit ? "lit" : "out", m);
};

// ---------------------------------------------------------------- the parts list, depth-sorted
export type Item = { id: string; at: V3; bias?: number; ride?: string; draw: (ctx: Ctx, off: P2) => void };
/** paint items far to near; each rides its assembly's world offset `move[ride] * share[ride]` */
export const paintAll = (ctx: Ctx, c: Cam, items: Item[], move: Record<string, V3> = {}, share: Record<string, number> = {}) => {
  const keyed = items.map((it, i) => { const mv = it.ride && move[it.ride] ? mul(move[it.ride], share[it.ride] ?? 0) : ([0, 0, 0] as V3); return { it, i, mv, key: c.depth(add(it.at, mv)) + (it.bias ?? 0) }; });
  keyed.sort((a, b) => a.key - b.key || a.i - b.i);
  for (const k of keyed) { OFFSET = c.dv(k.mv); k.it.draw(ctx, OFFSET); }
  OFFSET = [0, 0];
};

// ---------------------------------------------------------------- springs and the exploded view
/** closed-form damped spring from (x0, v0) toward g after tau seconds: any damping ratio z */
export const springAt = (w: number, z: number, x0: number, v0: number, g: number, tau: number): { x: number; v: number } => {
  if (tau <= 0) return { x: x0, v: v0 };
  const e0 = x0 - g;
  if (z < 0.999) { const wd = w * Math.sqrt(1 - z * z), A = e0, B = (v0 + z * w * e0) / wd, ex = Math.exp(-z * w * tau), co = Math.cos(wd * tau), si = Math.sin(wd * tau); return { x: g + ex * (A * co + B * si), v: ex * ((B * wd - z * w * A) * co - (A * wd + z * w * B) * si) }; }
  if (z <= 1.001) { const B = v0 + w * e0, ex = Math.exp(-w * tau); return { x: g + ex * (e0 + B * tau), v: ex * (B - w * (e0 + B * tau)) }; }
  const s = w * Math.sqrt(z * z - 1), r1 = -z * w + s, r2 = -z * w - s, C2 = (v0 - r1 * e0) / (r2 - r1), C1 = e0 - C2; return { x: g + C1 * Math.exp(r1 * tau) + C2 * Math.exp(r2 * tau), v: C1 * r1 * Math.exp(r1 * tau) + C2 * r2 * Math.exp(r2 * tau) };
};
export type ExplodePlan = { order: string[]; stagger: number; w: number; z: number };
/** The share (0 home, 1 apart) of every assembly at time t, from a list of cues (t, apart).
 *  Opening runs in `order`, closing in reverse; a cue that lands mid-stagger cancels the moves
 *  still pending and re-staggers only the assemblies whose target actually changes. Pure. */
export const sharesAt = (plan: ExplodePlan, cues: { t: number; apart: boolean }[], t: number): Record<string, number> => {
  const n = plan.order.length, ev: { t: number; g: number }[][] = plan.order.map(() => []);
  const targetAt = (i: number, time: number) => { let g = 0; for (const e of ev[i]) if (e.t <= time) g = e.g; return g; };
  for (const cue of [...cues].sort((a, b) => a.t - b.t)) {
    if (cue.t > t) break; const g = cue.apart ? 1 : 0;
    for (let i = 0; i < n; i++) ev[i] = ev[i].filter((e) => e.t <= cue.t);
    const idx = Array.from({ length: n }, (_, i) => i).filter((i) => targetAt(i, cue.t) !== g); if (!cue.apart) idx.reverse();
    idx.forEach((i, k) => ev[i].push({ t: cue.t + k * plan.stagger, g }));
  }
  const out: Record<string, number> = {};
  plan.order.forEach((id, i) => { let x = 0, v = 0, t0 = 0, g = 0; for (const e of ev[i]) { if (e.t > t) break; const s = springAt(plan.w, plan.z, x, v, g, e.t - t0); x = s.x; v = s.v; t0 = e.t; g = e.g; } out[id] = springAt(plan.w, plan.z, x, v, g, t - t0).x; });
  return out;
};
/** a one-shot envelope by age in seconds: smoothstep attack, exponential release; 0 before and long after */
export const envelope = (age: number, rise = 0.06, fall = 0.35) => (age < 0 ? 0 : age < rise ? smooth(0, rise, age) : Math.exp(-(age - rise) / fall));

// ---------------------------------------------------------------- template lettering and the card
/** single-stroke technical lettering, as with a scriber and template: one even weight, upright, crisp */
export const stencil = (ctx: Ctx, text: string, x: number, y: number, o: { cap?: number; colour?: string; align?: "left" | "center" | "right"; w?: number; track?: number; alpha?: number } = {}) => {
  const cap = o.cap ?? 12, s = cap / 6, track = o.track ?? 2.2, col = o.colour ?? "#26252b", Wd = stencilWidth(text, cap, track);
  let cx = o.align === "center" ? x - Wd / 2 : o.align === "right" ? x - Wd : x;
  ctx.globalAlpha = o.alpha ?? 1; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = o.w ?? Math.max(0.9, cap * 0.1); ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const ch of text) {
    if (ch === "·") { ctx.beginPath(); ctx.arc(cx + 1.5 * s, y + 3 * s, ctx.lineWidth * 0.75, 0, Math.PI * 2); ctx.fill(); cx += (3 + track) * s; continue; }
    if (ch === " ") { cx += (2.6 + track) * s; continue; }
    const g = G[ch] ?? G[ch.toUpperCase()] ?? G["-"]; ctx.beginPath();
    for (const st of [...(g.l ?? []), ...(g.c ?? [])]) st.forEach(([px, py], i) => (i ? ctx.lineTo(cx + px * s, y + py * s) : ctx.moveTo(cx + px * s, y + py * s)));
    ctx.stroke(); cx += ((g.w ?? 4) + track) * s;
  }
  ctx.globalAlpha = 1;
};
export const stencilWidth = (text: string, cap = 12, track = 2.2) => { const s = cap / 6; let w = 0; for (const ch of text) w += ch === "·" ? (3 + track) * s : ch === " " ? (2.6 + track) * s : glyphWidth(ch, cap, 0) + track * s; return w - track * s; };
export type CardText = { fig: string; title: string; hint: string; read: string };
/** The figure card, in the current hand: its ground, one rule, and the four corners: figure number, title, hint, live readout. */
/** a frame must never inherit pen state from the frame drawn before it */
export const freshPen = (ctx: Ctx) => { ctx.setLineDash([]); ctx.lineDashOffset = 0; ctx.lineCap = "butt"; ctx.lineJoin = "miter"; ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; };
export const card = (ctx: Ctx, W: number, H: number, t: CardText, o: { pad?: number; cap?: number; progress?: number; part?: "all" | "ground" | "words" } = {}) => {
  const pad = o.pad ?? 34, cap = o.cap ?? 13, p = o.progress ?? 1, part = o.part ?? "all"; freshPen(ctx);
  if (part !== "words") { HAND.sheet(ctx, W, H); if (p <= 0) return; HAND.frame(ctx, W, H, clamp01(p * 1.6)); }
  if (part === "ground" || p <= 0) return;
  const ty = clamp01((p - 0.5) * 2), i = pad + 22, top = pad + 20, bot = H - pad - 20 - cap;
  if (part === "words" && ty > 0) { // over a figure that fills the card, each word sits on its own cut of ground
    const sz = (s: string) => stencilWidth(s, cap) + 14, cut = (x: number, y: number, w: number) => HAND.knock(ctx, [[x - 7, y - 7], [x + w - 7, y - 7], [x + w - 7, y + cap + 7], [x - 7, y + cap + 7]]);
    cut(i, top, sz(t.fig)); cut(W - i - sz(t.title) + 14, top, sz(t.title)); cut(i, bot, sz(t.hint)); cut(W - i - sz(t.read) + 14, bot, sz(t.read));
  }
  if (ty > 0) {
    const upTo = (w: string) => (ty >= 1 ? w : w.slice(0, Math.ceil(w.length * ty))); // lettered left to right, never faded in
    HAND.text(ctx, upTo(t.fig), i, top, { cap }); if (ty >= 1) HAND.text(ctx, t.title, W - i, top, { cap, align: "right", soft: true }); else HAND.text(ctx, upTo(t.title), W - i - stencilWidth(t.title, cap) + stencilWidth(upTo(t.title), cap), top, { cap, align: "right", soft: true });
    HAND.text(ctx, upTo(t.hint), i, bot, { cap, soft: true }); if (ty >= 1) HAND.text(ctx, t.read, W - i, bot, { cap, align: "right" }); else HAND.text(ctx, upTo(t.read), W - i - stencilWidth(t.read, cap) + stencilWidth(upTo(t.read), cap), bot, { cap, align: "right" });
  }
};

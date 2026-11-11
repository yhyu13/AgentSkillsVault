// THE COUNTRY SHE RUNS THROUGH. Speed is read from the world, so the world is in layers at their own
// distances, and each goes by at its own rate: the sun does not move at all, the far range creeps,
// the acacias drift, the scrub and rocks pass, the grass at her feet streams, and now and then
// something close to the lens whips across the whole frame. It is also a journey, not a treadmill:
// what she passes changes as the ground goes by under her.
//   the thorn savanna (acacias, termite mounds) · a kopje (boulders, dead trees; the birds go up
//   here) · a shallow pan (water, reeds, the sun laid down in it, spray off her feet) · grass again.
// Every element has a place on the ground, G, in px of ground travelled; a layer at depth factor f
// puts it on screen at 540 + (G - X) * f, where X is how far she has run. Nothing wraps, nothing repeats.
import { rng, type Ctx, type P } from "./core";
import { mix } from "./gallery";

const NIGHT = "#0d1a22", TEAL = "#2a6a70", RUST = "#b8452a", CORAL = "#f2643c", PALE = "#fff5de", DARK = "#0a1216", OCHRE = "#e3a23a";
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const leaf = (c: Ctx, x: number, y: number, a: number, len: number, w: number, col: string, alpha = 1) => {
  if (alpha <= 0.004 || len < 1) return;
  const ca = Math.cos(a), sa = Math.sin(a), tx = x + ca * len, ty = y + sa * len, mx = x + ca * len * 0.42, my = y + sa * len * 0.42;
  c.globalAlpha = alpha; c.fillStyle = col; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(mx - sa * w, my + ca * w, tx, ty); c.quadraticCurveTo(mx + sa * w, my - ca * w, x, y); c.fill(); c.globalAlpha = 1;
};
const UP = -Math.PI / 2;

// ---------------------------------------------------------------- the things that stand in it
// an umbrella thorn: a leaning trunk, a fork of boughs, and the flat crown laid in tiers
const acacia = (c: Ctx, x: number, base: number, h: number, seed: number, col: string, lit: string) => {
  const q = rng(seed), lean = (q() - 0.5) * 0.3, fx = x + lean * h * 0.4, fy = base - h * 0.5;
  leaf(c, x, base + 4, UP + lean * 0.8, h * 0.58, h * 0.055, col);
  for (const a of [-1.0, -0.45, 0.2, 0.8]) { const ang = UP + a + (q() - 0.5) * 0.2, len = h * (0.42 + q() * 0.16), tx = fx + Math.cos(ang) * len, ty = fy + Math.sin(ang) * len; leaf(c, fx, fy, ang, len, h * 0.026, col); const w = h * (0.34 + q() * 0.2); for (let k = 0; k < 3; k++) leaf(c, tx - w * (0.5 + (q() - 0.5) * 0.3), ty - k * h * 0.03 + q() * 4, 0, w * (1 - k * 0.18), h * (0.05 - k * 0.008), k === 2 ? lit : col); }
};
const deadTree = (c: Ctx, x: number, base: number, h: number, seed: number, col: string) => { const q = rng(seed), lean = (q() - 0.5) * 0.3; leaf(c, x, base + 4, UP + lean, h, h * 0.05, col); for (let k = 0; k < 5; k++) { const t = 0.35 + q() * 0.55, sd = k % 2 ? 1 : -1; leaf(c, x + Math.cos(UP + lean) * h * t, base + Math.sin(UP + lean) * h * t, UP + lean + sd * (0.5 + q() * 0.6), h * (0.2 + q() * 0.25), h * 0.016, col); } };
const mound = (c: Ctx, x: number, base: number, h: number, col: string) => { leaf(c, x, base + 6, UP, h, h * 0.42, col); leaf(c, x + h * 0.2, base + 6, UP + 0.12, h * 0.6, h * 0.3, col); };
const bush = (c: Ctx, x: number, base: number, h: number, seed: number, col: string, lit: string) => { const q = rng(seed); for (let k = 0; k < 9; k++) leaf(c, x + (q() - 0.5) * h * 0.5, base + 5, UP + (k / 8 - 0.5) * 1.9 + (q() - 0.5) * 0.2, h * (0.6 + q() * 0.4), h * 0.2, k % 4 === 0 ? lit : col); };
// boulders: each a lens lying on the one below it
const kopje = (c: Ctx, x: number, base: number, h: number, seed: number, col: string, lit: string) => { const q = rng(seed); for (let k = 0; k < 5; k++) { const w = h * (1.1 - k * 0.17) * (0.8 + q() * 0.4), ox = (q() - 0.5) * h * 0.5, y = base - k * h * 0.2 - h * 0.06; leaf(c, x + ox - w / 2, y, 0, w, h * (0.34 - k * 0.03), k === 4 ? lit : col); } };
const reeds = (c: Ctx, x: number, base: number, h: number, seed: number, col: string, F: number, lean: number) => { const q = rng(seed); for (let k = 0; k < 7; k++) { const a = UP + (q() - 0.5) * 0.4 + Math.sin(F * (Math.PI / 45) + k) * 0.05 - lean * 0.7, len = h * (0.6 + q() * 0.4), ox = (q() - 0.5) * h * 0.4; leaf(c, x + ox, base + 5, a, len, 3.2, col); if (k % 2) leaf(c, x + ox + Math.cos(a) * len * 0.82, base + 5 + Math.sin(a) * len * 0.82, a, len * 0.2, 5.5, mix(col, OCHRE, 0.35)); } };

// ---------------------------------------------------------------- where everything stands
export type Country = ReturnType<typeof country>;
/** Lay the country out along `total` px of ground. */
export const country = (total: number) => {
  const z = (g: number) => (g < total * 0.31 ? "thorn" : g < total * 0.6 ? "kopje" : g < total * 0.86 ? "pan" : "grass");
  const q = rng(911), span = (f: number) => [-760 / f, total + 760 / f] as const;
  type Item = { g: number; h: number; seed: number; kind: string };
  const scatter = (f: number, gap: (zone: string) => number, kind: (zone: string, r: number) => string, h: (kind: string, r: number) => number): Item[] => { const [a, b] = span(f), out: Item[] = []; for (let g = a; g < b; ) { const zone = z(g), k = kind(zone, q()); out.push({ g, h: h(k, q()), seed: Math.floor(q() * 1e6), kind: k }); g += gap(zone) * (0.55 + q() * 0.9); } return out; };
  const trees = scatter(0.22, (zn) => (zn === "thorn" ? 1150 : zn === "kopje" ? 1900 : zn === "pan" ? 4200 : 1500), (zn, r) => (zn === "kopje" && r < 0.55 ? "dead" : "acacia"), (k, r) => (k === "dead" ? 190 + r * 130 : 240 + r * 190));
  const mid = scatter(0.5, (zn) => (zn === "pan" ? 430 : zn === "kopje" ? 520 : 640), (zn, r) => (zn === "thorn" ? (r < 0.4 ? "mound" : "bush") : zn === "kopje" ? (r < 0.7 ? "kopje" : "bush") : zn === "pan" ? "reeds" : "bush"), (k, r) => (k === "mound" ? 95 + r * 85 : k === "kopje" ? 130 + r * 130 : k === "reeds" ? 105 + r * 75 : 62 + r * 52));
  const lens = [0.1, 0.27, 0.43, 0.57, 0.7, 0.83, 0.93].map((t, i) => ({ g: total * t + (q() - 0.5) * 300, seed: 40 + i, kind: i % 3 === 1 ? "trunk" : "grass" }));
  const flock = Array.from({ length: 18 }, () => ({ dx: (q() - 0.5) * 520, t0: q() * 9, vx: -1 + q() * 5, vy: 5 + q() * 6, size: 0.7 + q() * 0.6, ph: q() * 6.28 }));
  return { total, zone: z, trees, mid, lens, flock, flockG: total * 0.37, pan: [total * 0.6 + 260, total * 0.86 - 260] as const };
};

// ---------------------------------------------------------------- drawing it, back to front
const ridge = (c: Ctx, X: number, f: number, horizon: number, h0: number, h1: number, ph: number, col: string) => {
  c.fillStyle = col; c.beginPath(); c.moveTo(-20, horizon + 30);
  for (let x = -20; x <= 1100; x += 14) { const u = x + X * f + ph, n = 0.5 + 0.5 * (Math.sin(u / 211) * 0.5 + Math.sin(u / 97 + 1.7) * 0.3 + Math.sin(u / 43 + 0.6) * 0.2), peak = Math.pow(n, 1.6); c.lineTo(x, horizon - lerp(h0, h1, peak)); }
  c.lineTo(1100, horizon + 30); c.closePath(); c.fill();
};
/** Everything behind her: the two ranges, the trees, the scrub and rocks. `horizon` is the ground line on screen. */
export const drawFar = (c: Ctx, w: Country, X: number, F: number, horizon: number, lean: number) => {
  ridge(c, X, 0.03, horizon, 40, 170, 0, mix(CORAL, NIGHT, 0.6));
  ridge(c, X, 0.075, horizon, 16, 92, 900, mix(RUST, NIGHT, 0.8));
  const tree = mix(NIGHT, TEAL, 0.1), treeLit = mix(RUST, NIGHT, 0.55), near = mix(NIGHT, TEAL, 0.2), nearLit = mix(TEAL, NIGHT, 0.45);
  for (const t of w.trees) { const x = 540 + (t.g - X) * 0.22; if (x < -260 || x > 1340) continue; if (t.kind === "dead") deadTree(c, x, horizon, t.h, t.seed, tree); else acacia(c, x, horizon, t.h, t.seed, tree, treeLit); }
  for (const m of w.mid) { const x = 540 + (m.g - X) * 0.5; if (x < -200 || x > 1280) continue; if (m.kind === "mound") mound(c, x, horizon, m.h, mix(RUST, NIGHT, 0.72)); else if (m.kind === "kopje") kopje(c, x, horizon, m.h, m.seed, near, mix(RUST, NIGHT, 0.6)); else if (m.kind === "reeds") reeds(c, x, horizon, m.h, m.seed, nearLit, F, lean); else bush(c, x, horizon, m.h, m.seed, near, nearLit); }
};
/** The pan: shallow water lying on the ground she runs over, with the sun laid down in it. */
export const drawPan = (c: Ctx, w: Country, X: number, F: number, horizon: number, v: number) => {
  const a = 540 + (w.pan[0] - X), b = 540 + (w.pan[1] - X); if (b < -40 || a > 1120) return;
  const x0 = Math.max(-20, a), x1 = Math.min(1100, b), y0 = horizon + 8, y1 = horizon + 86;
  c.save(); c.beginPath(); c.moveTo(x0 - (a > -20 ? 60 : 0), y1); c.lineTo(x0, y0); c.lineTo(x1, y0); c.lineTo(x1 + (b < 1100 ? 60 : 0), y1); c.closePath(); c.clip();
  c.fillStyle = mix(TEAL, NIGHT, 0.52); c.fillRect(-80, y0, 1240, y1 - y0);
  const q = rng(70);
  // the sun in it, in broken bars under the sun itself; then the ripples going by
  for (let i = 0; i < 26; i++) { const yy = y0 + 4 + q() * (y1 - y0 - 8), half = 70 + q() * 230 * (1 - (yy - y0) / (y1 - y0) * 0.5), dx = (q() - 0.5) * 60 + Math.sin(F * 0.21 + i) * 9; leaf(c, 540 + dx - half, yy, 0, half * 2, 2.2 + q() * 2.6, i % 3 ? CORAL : "#ff8a4a", 0.5 + q() * 0.35); }
  for (let i = 0; i < 30; i++) { const gx = q() * 2400, yy = y0 + 3 + q() * (y1 - y0 - 6), len = 60 + q() * 200; leaf(c, ((((gx - X) % 2400) + 2400) % 2400) - 600, yy, 0, len * (1 + v), 1.2 + q() * 1.4, PALE, 0.1 + q() * 0.16); }
  c.restore();
};
export const inPan = (w: Country, g: number) => g > w.pan[0] + 30 && g < w.pan[1] - 30;
/** The birds she puts up as she comes through the kopje: out of the grass ahead of her, up and across the sun. */
export const drawFlock = (c: Ctx, w: Country, X: number, F: number, horizon: number, frameAt: (g: number) => number) => {
  const t0 = frameAt(w.flockG - 700); if (F < t0) return;
  const col = mix(NIGHT, DARK, 0.4);
  for (const b of w.flock) {
    const t = F - t0 - b.t0; if (t < 0 || t > 110) continue;
    const x = 540 + (w.flockG - X) * 0.82 + b.dx + b.vx * t, y = horizon - 6 - b.vy * t * (1 - t / 260) - Math.sin(t * 0.25 + b.ph) * 6, flap = Math.sin(t * 0.85 + b.ph), s = 13 * b.size;
    if (x < -60 || x > 1140 || y < -40) continue;
    leaf(c, x, y, Math.PI + 0.25 + flap * 0.75, s * 1.5, s * 0.36, col); leaf(c, x, y, -0.25 - flap * 0.75, s * 1.5, s * 0.36, col); leaf(c, x - s * 0.5, y, 0, s, s * 0.22, col);
  }
};
/** What crosses close to the lens: a spray of grass, or a thorn trunk with a bough, dark and huge, gone in a few frames. */
export const drawLens = (c: Ctx, w: Country, X: number, bottom: number) => {
  for (const o of w.lens) {
    const x = 540 + (o.g - X) * 3.1; if (x < -700 || x > 1780) continue;
    const q = rng(o.seed), col = mix(NIGHT, DARK, 0.55);
    if (o.kind === "trunk") { leaf(c, x - 60, bottom + 60, UP + 0.06, 1500, 150, col); leaf(c, x - 30, bottom - 620, UP + 1.05, 700, 46, col); leaf(c, x - 60, bottom - 760, UP - 0.9, 560, 38, col); }
    else for (let k = 0; k < 16; k++) leaf(c, x + (q() - 0.5) * 420, bottom + 60, UP - 0.75 + (q() - 0.5) * 0.5, 520 + q() * 560, 26 + q() * 30, k % 5 === 0 ? mix(TEAL, NIGHT, 0.6) : col);
  }
};
export type Burst = { x: number; y: number; age: number; seed: number; wet: boolean; big: number };
/** What her feet throw up: dust off the plain, spray out of the pan. */
export const drawBurst = (c: Ctx, b: Burst) => {
  const q = rng(b.seed), n = b.wet ? 16 : 11, life = b.wet ? 13 : 18, k = b.age / life; if (k < 0 || k > 1) return;
  for (let i = 0; i < n; i++) {
    const a = b.wet ? UP + (q() - 0.5) * 1.9 : Math.PI + 0.15 + q() * 0.95, sp = 0.4 + q() * 0.6, d = q();
    if (b.wet) { const vx = Math.cos(a) * 9 * sp * b.big, vy = Math.sin(a) * 15 * sp * b.big, t = b.age; leaf(c, b.x + vx * t, b.y + vy * t + 0.75 * t * t, Math.atan2(vy + 1.5 * t, vx), 9 + sp * 13, 2.4 + d * 1.6, d < 0.4 ? PALE : mix(PALE, TEAL, 0.45), 0.9 * (1 - k)); }
    else leaf(c, b.x - d * 70 * k * b.big, b.y - 4 - d * 56 * k * b.big, a, (24 + d * 58) * b.big * Math.min(1, k * 3), (7 + q() * 8) * b.big, mix(mix(OCHRE, PALE, 0.4), NIGHT, 0.12 + q() * 0.25), (0.62 - d * 0.15) * (1 - k));
  }
};

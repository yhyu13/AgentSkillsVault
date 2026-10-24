// CHEETAH, DUSK. A 12 s loop for the motion graphics reel. The picture is timed in frames on a
// 120 bpm grid; the score is four bars at 80 bpm, the same 12 s, meeting it every 1.5 s.
// The coat is rings of tapered tufts radiating from the bridge of the nose; the tear lines are the
// one big black shape; the sun sits low behind the head and the moon is in the pupil.
//   0-60     night. The crescent moon sets as the sun comes up behind the grass.
//   60-180   the face makes itself: the head's mass, then the coat ring by ring from the nose
//            outward, the ears, the spots in waves, the tear lines drawn down, the muzzle, whiskers.
//   150-170  the eyes open; the moon is already in them. One blink at 236.
//   180-290  alive: the coat breathes in a ripple, an ear flicks, the grass moves, a slow push in.
//   290-338  the camera goes into the left pupil. The crescent in it is carried, at one size on
//            screen, to where the moon hangs in the sky (the persistent actor across the seam).
//   322-360  the pupil is the night; the grass comes back up. Frame 359 hands over to frame 0.
import { rng, type Ctx, type Env, type Layer, type P } from "./core";
import type { Film } from "./film";
import { mix } from "./gallery";
import { cheetahDuskScore } from "./music/pieces/cheetah";
import { renderLoop } from "./music/render";

const W = 1080, H = 1080, N = 360;
const NIGHT = "#0d1a22", TEAL = "#2a6a70", RUST = "#b8452a", OCHRE = "#e3a23a", GOLD = "#efb84e", CREAM = "#f2e4c5", PALE = "#fff5de", CORAL = "#f2643c", DARK = "#0a1216", PUPIL = "#070b0e";
const F: P = [540, 610], EYE_L: P = [388, 512], EYE_R: P = [692, 512], MOON: P = [760, 220], MOON_R = 46;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ramp = (f: number, a: number, b: number) => clamp((f - a) / (b - a));
const out3 = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
const inOut = (t: number) => { const c = clamp(t); return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2; };
const back = (t: number) => { const c = clamp(t) - 1; return 1 + 2.4 * c * c * c + 1.4 * c * c; }; // lands a little past, then settles
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// a tuft: a tapered leaf from radius r0 to r1 along angle a, darker at its root
const tuft = (c: Ctx, o: P, a: number, r0: number, r1: number, w: number, col: string, vein = 0.22) => {
  if (r1 - r0 < 1.5 || w < 0.6) return;
  const ca = Math.cos(a), sa = Math.sin(a), b: P = [o[0] + ca * r0, o[1] + sa * r0], t: P = [o[0] + ca * r1, o[1] + sa * r1], m = r0 + (r1 - r0) * 0.42, mx = o[0] + ca * m, my = o[1] + sa * m;
  const g = c.createLinearGradient(b[0], b[1], t[0], t[1]); g.addColorStop(0, mix(col, DARK, 0.6)); g.addColorStop(0.45, col); g.addColorStop(1, mix(col, "#ffffff", 0.16));
  c.fillStyle = g; c.beginPath(); c.moveTo(b[0], b[1]); c.quadraticCurveTo(mx - sa * w, my + ca * w, t[0], t[1]); c.quadraticCurveTo(mx + sa * w, my - ca * w, b[0], b[1]); c.fill();
  if (vein > 0) { c.strokeStyle = mix(col, DARK, 0.7); c.globalAlpha = vein; c.lineWidth = 1; c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(o[0] + ca * (r1 - 6), o[1] + sa * (r1 - 6)); c.stroke(); c.globalAlpha = 1; }
};
const crescent = (c: Ctx, x: number, y: number, R: number, col: string) => { // a true crescent, so it needs no ground colour behind it
  const ix = x + R * 0.5, iy = y - R * 0.24, ir = R * 0.9, out: P[] = [], inn: P[] = [];
  for (let i = 0; i < 90; i++) { const a = (i / 90) * Math.PI * 2 + 0.3, p: P = [x + Math.cos(a) * R, y + Math.sin(a) * R]; if (Math.hypot(p[0] - ix, p[1] - iy) >= ir) out.push(p); }
  for (let i = 0; i < 90; i++) { const a = (i / 90) * Math.PI * 2 + 0.3, p: P = [ix + Math.cos(a) * ir, iy + Math.sin(a) * ir]; if (Math.hypot(p[0] - x, p[1] - y) <= R) inn.push(p); }
  // both runs are contiguous once rotated to start at a gap
  const rot = (q: P[], far: (p: P) => number) => { let k = 0, best = -1; for (let i = 0; i < q.length; i++) { const d = Math.hypot(q[i][0] - q[(i + 1) % q.length][0], q[i][1] - q[(i + 1) % q.length][1]); if (d > best) { best = d; k = i + 1; } } void far; return [...q.slice(k), ...q.slice(0, k)]; };
  const A = rot(out, () => 0), B = rot(inn, () => 0).reverse();
  c.fillStyle = col; c.beginPath(); [...A, ...B].forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fill();
};

// ---------------------------------------------------------------- the parts, laid out once
const COAT = [
  { r0: 318, r1: 432, n: 92, w: 20, col: "#a9601f" }, { r0: 268, r1: 368, n: 84, w: 20, col: "#cf8a2c" }, { r0: 216, r1: 310, n: 74, w: 19, col: OCHRE },
  { r0: 164, r1: 254, n: 62, w: 18, col: GOLD }, { r0: 112, r1: 198, n: 50, w: 17, col: "#f2c263" }, { r0: 62, r1: 142, n: 38, w: 15, col: "#f4cd7e" },
];
type T = { a: number; r0: number; r1: number; w: number; col: string; t0: number; ring: number };
const PARTS = (() => {
  const r = rng(11);
  const neck = Array.from({ length: 6 * 14 }, (_, i) => { const row = 5 - Math.floor(i / 14), k = (i % 14) - 1; return { x: k * 94 + (row % 2) * 47 + 10, y: 820 + row * 56, col: mix(["#a9601f", "#cf8a2c", "#8f4f1c"][row % 3], DARK, 0.2 + row * 0.07 + r() * 0.1), t0: 52 + row * 5 + r() * 6 }; });
  const coat: T[] = [];
  COAT.forEach((k, i) => { for (let j = 0; j < k.n; j++) { const a = ((j + (i % 2) * 0.5) / k.n) * Math.PI * 2, down = clamp((Math.sin(a) - 0.25) * 1.7) * clamp((i - 1) / 3), len = 1 + (r() - 0.5) * 0.12; coat.push({ a, r0: k.r0, r1: k.r0 + (k.r1 - k.r0) * len, w: k.w, col: mix(mix(k.col, CREAM, down), DARK, r() * 0.1), t0: 72 + (5 - i) * 9 + (((a + Math.PI / 2) / (Math.PI * 2) + 1) % 1) * 12, ring: i }); } });
  const sr = rng(5), spots: { x: number; y: number; s: number; a: number; t0: number }[] = [];
  for (let ring = 0; ring < 9; ring++) { const rad = 150 + ring * 29, n = Math.round((rad * 2 * Math.PI) / 40);
    for (let j = 0; j < n; j++) { const a = ((j + (ring % 2) * 0.5 + (sr() - 0.5) * 0.3) / n) * Math.PI * 2, x = F[0] + Math.cos(a) * rad, y = F[1] + Math.sin(a) * rad * 0.95, s = 4.2 + ring * 0.55 + sr() * 1.8, jit = sr();
      if (Math.sin(a) > 0.2 && rad < 330) continue; if (Math.hypot(x - EYE_L[0], y - EYE_L[1]) < 132 || Math.hypot(x - EYE_R[0], y - EYE_R[1]) < 132) continue; if (Math.abs(x - 540) < 46 && y > 430) continue;
      spots.push({ x, y, s, a, t0: 128 + ring * 4 + jit * 8 }); } }
  const gr = rng(41), grass = Array.from({ length: 70 }, () => ({ x: gr() * W, h: 90 + gr() * 220, a: (gr() - 0.5) * 0.5, w: 9 + gr() * 8, col: gr() < 0.15 ? TEAL : mix(NIGHT, TEAL, gr() * 0.5), ph: gr() * 6.28 }));
  return { neck, coat, spots, grass };
})();

const ear = (c: Ctx, o: P, side: number, f: number) => {
  const g = back(ramp(f, 122, 140)); if (g <= 0) return;
  const flick = side < 0 ? Math.sin(ramp(f, 206, 222) * Math.PI * 2) * 0.16 * (1 - ramp(f, 206, 222)) : 0;
  c.save(); c.translate(o[0] + side * 40, o[1] + 70); c.rotate(flick); c.scale(g, g); c.translate(-o[0] - side * 40, -o[1] - 70);
  c.fillStyle = DARK; c.beginPath(); c.ellipse(o[0], o[1], 84, 92, side * 0.35, 0, Math.PI * 2); c.fill();
  for (let j = 0; j < 30; j++) tuft(c, [o[0] + side * 12, o[1] + 38], -Math.PI / 2 + side * 0.3 + (j / 29 - 0.5) * 2.3, 8, 78 - Math.abs(j - 14.5) * 1.8, 9, j % 2 ? CREAM : "#e9c98a", 0.15);
  for (let j = 0; j < 46; j++) tuft(c, o, (j / 46) * Math.PI * 2, 68, 100, 8, j % 3 ? "#a9601f" : OCHRE, 0);
  c.restore();
};
const eye = (c: Ctx, o: P, side: number, f: number, pupilCol: string, moon: boolean) => {
  const patch = ramp(f, 118, 138);
  for (let j = 0; j < 34; j++) { const g = back(clamp(patch * 1.6 - (j / 34) * 0.6)); tuft(c, o, (j / 34) * Math.PI * 2, 58, 58 + (54 + (j % 2) * 8) * g, 11 * g, j % 2 ? CREAM : PALE, 0.15); }
  const blink = 1 - 0.92 * Math.sin(ramp(f, 234, 246) * Math.PI), open = out3(ramp(f, 150, 170)) * blink; if (patch <= 0) return;
  const lid = (g: number) => { c.beginPath(); c.moveTo(o[0] - side * (86 + g), o[1] + 30 + g * 0.4); c.bezierCurveTo(o[0] - side * 40, o[1] - 62 - g, o[0] + side * 50, o[1] - 70 - g, o[0] + side * (92 + g), o[1] - 22); c.bezierCurveTo(o[0] + side * 46, o[1] + 58 + g, o[0] - side * 30, o[1] + 66 + g, o[0] - side * (86 + g), o[1] + 30 + g * 0.4); c.closePath(); };
  c.save(); c.translate(o[0], o[1]); c.scale(patch, Math.max(0.07, open) * patch); c.translate(-o[0], -o[1]);
  c.fillStyle = DARK; lid(15); c.fill();
  c.save(); lid(0); c.clip();
  const g = c.createRadialGradient(o[0], o[1], 16, o[0], o[1], 70); g.addColorStop(0, "#ffd24a"); g.addColorStop(0.55, "#f39a1e"); g.addColorStop(1, "#b84a14");
  c.fillStyle = g; c.fillRect(o[0] - 120, o[1] - 100, 240, 200);
  const r = rng(90 + side); c.lineCap = "round";
  for (let i = 0; i < 150; i++) { const a = (i / 150) * Math.PI * 2 + r() * 0.03, a0 = 30 + r() * 8, a1 = 44 + r() * 30, lt = r() < 0.4; c.strokeStyle = lt ? "#ffe9a0" : "#8a2c0c"; c.globalAlpha = 0.18 + r() * 0.3; c.lineWidth = 0.8 + r() * 1.3; c.beginPath(); c.moveTo(o[0] + Math.cos(a) * a0, o[1] + Math.sin(a) * a0); c.lineTo(o[0] + Math.cos(a) * a1, o[1] + Math.sin(a) * a1); c.stroke(); }
  c.globalAlpha = 1; c.fillStyle = "rgba(40,10,4,0.4)"; c.beginPath(); c.ellipse(o[0], o[1] - 96, 150, 66, 0, 0, Math.PI * 2); c.fill();   // the lid's shadow
  // the pupil: wide as the eye opens, narrowing in the light, widening again as the camera comes in
  const pr = 29 * (1.3 - 0.3 * out3(ramp(f, 166, 200)) + 0.35 * inOut(ramp(f, 286, 320)));
  c.fillStyle = pupilCol; c.beginPath(); c.arc(o[0], o[1] - 2, pr, 0, Math.PI * 2); c.fill();
  if (moon) crescent(c, o[0] - 10, o[1] - 12, 9.5, PALE);
  c.fillStyle = "rgba(255,245,222,0.9)"; c.globalAlpha = 1 - ramp(f, 300, 318); c.beginPath(); c.arc(o[0] + 13, o[1] + 11, 2.6, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
  c.restore(); c.restore();
};
// the tear line: one black stroke from the inner corner of the eye, round the muzzle, to the mouth
const tear = (c: Ctx, side: number, prog: number) => {
  if (prog <= 0) return;
  const p: P[] = [[540 - side * 76, 548], [540 - side * 70, 640], [540 - side * 128, 720], [540 - side * 110, 836]], bz = (t: number): P => { const u = 1 - t; return [u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0], u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1]]; };
  const L: P[] = [], R: P[] = [], n = 40, m = Math.max(1, Math.round(n * prog));
  for (let i = 0; i <= m; i++) { const t = i / n, a = bz(t), b = bz(Math.min(1, t + 0.01)), d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d, w = (7 + 15 * Math.sin(Math.PI * Math.pow(t, 0.6)) * (1 - t * 0.35)) * (i === m && prog < 1 ? 0.3 : 1); L.push([a[0] + nx * w, a[1] + ny * w]); R.push([a[0] - nx * w, a[1] - ny * w]); }
  c.fillStyle = DARK; c.beginPath(); [...L, ...R.reverse()].forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill();
};
export const duskGrass = PARTS.grass, FACE: P = F;
const grass = (c: Ctx, f: number, grow: number) => { for (const g of PARTS.grass) tuft(c, [g.x, H + 20], -Math.PI / 2 + g.a + Math.sin(f * (Math.PI / 45) + g.ph) * 0.07, 0, g.h * grow, g.w, g.col, 0); };

// the night's stars: they are out while it is night, at the start and again at the end, never still
const STARS = (() => { const r = rng(19); return Array.from({ length: 46 }, () => ({ x: r() * W, y: r() * 760, s: 1.2 + r() * 2.2, ph: r() * 6.28, cyc: [4, 6, 8, 9, 12][Math.floor(r() * 5)] })); })(); // cyc: whole twinkles per loop, so frame 359 meets frame 0
const stars = (c: Ctx, f: number, k: number) => { if (k <= 0) return; for (const st of STARS) { c.globalAlpha = k * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin((f / N) * Math.PI * 2 * st.cyc + st.ph))); c.fillStyle = PALE; c.beginPath(); c.arc(st.x, st.y, st.s, 0, Math.PI * 2); c.fill(); } c.globalAlpha = 1; };

// ---------------------------------------------------------------- the camera
export const camAt = (f: number) => {
  const a = inOut(ramp(f, 180, 290)), b = ramp(f, 290, 338), z = Math.pow(2, lerp(0, Math.log2(1.14), a) + inOut(b) * (Math.log2(52) - Math.log2(1.14))), lk = out3(b * 1.5);
  return { z, look: [lerp(lerp(540, 506, a), EYE_L[0], lk), lerp(lerp(540, 532, a), EYE_L[1] - 2, lk)] as P };
};

const grainLayer = (env: Env): Layer => { // the paper's tooth and the dusk settling at the edges: laid once, the same on every frame
  const key = "cheetah:grain"; let L = env.cache.get(key) as Layer | undefined; if (L) return L;
  L = env.canvas(Math.round(W * env.scale), Math.round(H * env.scale)); env.cache.set(key, L);
  const c = L.ctx, q = rng(77); c.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  for (let i = 0; i < 200000; i++) { const x = q() * W, y = q() * H, d = Math.hypot(x - 540, y - 520) / 740; if (q() > d * d * d * 1.1) continue; c.fillStyle = DARK; c.globalAlpha = 0.42; c.fillRect(x, y, 1.1, 1.1); }
  for (let i = 0; i < 30000; i++) { const x = q() * W, y = q() * H, lt = q() < 0.5; c.fillStyle = lt ? "#fff5de" : "#000000"; c.globalAlpha = lt ? 0.06 : 0.08; c.fillRect(x, y, 1.1, 1.1); }
  return L;
};

// The face on its own, for a caller that has set the transform: all of it, or one part. cheetahRun
// turns this head in space, so it takes the parts as layers: the neck, the head with no features (its back), the whole head.
export const duskFace = (c: Ctx, f: number, part: "all" | "neck" | "coat" | "head" = "all") => {
  const pupilCol = mix(PUPIL, NIGHT, ramp(f, 312, 336));
  // neck and shoulders rise
  if (part === "all" || part === "neck") for (const n of PARTS.neck) { const g = back(ramp(f, n.t0, n.t0 + 16)); tuft(c, [n.x, n.y - 70 + (1 - g) * 60], Math.PI / 2, 0, 150 * g, 52 * g, n.col, 0.3); }
  if (part === "neck") return;
  ear(c, [262, 300], -1, f); ear(c, [818, 300], 1, f);
  // the head's own mass, then the coat over it: rings of tufts from the nose outward, breathing once it is whole
  const mass = ramp(f, 70, 132); // it spreads just under the coat as the rings open, never a bare disc
  if (mass > 0) { c.fillStyle = "#b9731f"; c.beginPath(); c.ellipse(F[0], F[1], lerp(50, 372, mass), lerp(48, 352, mass), 0, 0, Math.PI * 2); c.fill(); }
  c.save(); c.translate(F[0], F[1]); c.scale(1, 0.95); c.translate(-F[0], -F[1]);
  const alive = ramp(f, 170, 200) * (1 - ramp(f, 300, 330));
  for (const t of PARTS.coat) { const g = back(ramp(f, t.t0, t.t0 + 15)); if (g <= 0) continue; const br = 1 + 0.045 * alive * Math.sin(f * (Math.PI / 45) + t.ring * 0.9); tuft(c, F, t.a, t.r0, t.r0 + (t.r1 - t.r0) * g * br, t.w * Math.min(1, g), t.col); }
  c.restore();
  for (const p of PARTS.spots) { const g = back(ramp(f, p.t0, p.t0 + 9)); if (g <= 0) continue; c.fillStyle = DARK; c.beginPath(); c.ellipse(p.x, p.y, p.s * 1.12 * g, p.s * 0.94 * g, p.a, 0, Math.PI * 2); c.fill(); }
  if (part === "coat") return;
  // the bridge of the nose: a pale fan falling from between the eyes
  for (let i = -4; i <= 4; i++) { const g = back(ramp(f, 108 + Math.abs(i) * 2, 126 + Math.abs(i) * 2)); tuft(c, [540, 452], Math.PI / 2 + i * 0.075, 20, 20 + (194 - Math.abs(i) * 12) * g, 13 * g, i % 2 ? "#f4cd7e" : "#f8dca0", 0.18); }
  tear(c, 1, inOut(ramp(f, 134, 162))); tear(c, -1, inOut(ramp(f, 134, 162)));
  eye(c, EYE_L, -1, f, pupilCol, f < 290); eye(c, EYE_R, 1, f, pupilCol, true);
  // the muzzle: two pale lobes and the chin
  const mz = ramp(f, 124, 150);
  for (let j = 0; j < 22; j++) { const g = back(clamp(mz * 1.5 - 0.25)); tuft(c, [540, 760], Math.PI / 2 + (j / 21 - 0.5) * 1.7, 30, 30 + 98 * g, 13 * g, j % 2 ? CREAM : PALE, 0.15); }
  for (const sd of [-1, 1]) for (let j = 0; j < 30; j++) { const g = back(clamp(mz * 1.6 - (j / 30) * 0.5)); tuft(c, [540 + sd * 52, 742], (j / 30) * Math.PI * 2, 6, 6 + (72 + (j % 2) * 6) * g, 12 * g, j % 2 ? PALE : CREAM, 0.15); }
  const dots = ramp(f, 150, 162); if (dots > 0) for (const sd of [-1, 1]) for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) { c.fillStyle = "#2a1a12"; c.beginPath(); c.arc(540 + sd * (36 + k * 20 + row * 5), 742 + row * 17 - k * 3, 3.2 * dots, 0, Math.PI * 2); c.fill(); }
  // nose, mouth, whiskers
  const ns = back(ramp(f, 140, 154));
  if (ns > 0) { c.save(); c.translate(540, 690); c.scale(ns, ns); c.translate(-540, -690);
    c.fillStyle = "#1a0f0c"; c.beginPath(); c.moveTo(488, 672); c.bezierCurveTo(510, 656, 570, 656, 592, 672); c.bezierCurveTo(588, 706, 560, 728, 540, 734); c.bezierCurveTo(520, 728, 492, 706, 488, 672); c.fill();
    c.strokeStyle = "rgba(255,245,222,0.35)"; c.lineWidth = 3; c.lineCap = "round"; c.beginPath(); c.moveTo(506, 674); c.quadraticCurveTo(540, 664, 574, 674); c.stroke(); c.restore(); }
  const mo = ramp(f, 152, 166); if (mo > 0) { c.strokeStyle = "#1a0f0c"; c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); c.moveTo(540, 732); c.lineTo(540, 732 + 36 * mo); if (mo >= 1) { const q = ramp(f, 166, 176); c.moveTo(540, 768); c.quadraticCurveTo(540 - 28 * q, 768 + 32 * q, 540 - 70 * q, 768 + 18 * q); c.moveTo(540, 768); c.quadraticCurveTo(540 + 28 * q, 768 + 32 * q, 540 + 70 * q, 768 + 18 * q); } c.stroke(); }
  const wh = out3(ramp(f, 160, 184)); if (wh > 0) for (const sd of [-1, 1]) for (let k = 0; k < 5; k++) { const sway = Math.sin(f * (Math.PI / 60) + k) * 6 * alive, a: P = [540 + sd * 96, 742 + k * 9], m: P = [540 + sd * 250, 720 + k * 22 + sway * 0.5], e: P = [540 + sd * (400 + k * 14), 690 + k * 46 + sway]; c.strokeStyle = PALE; c.globalAlpha = 0.85; c.lineWidth = 2; c.beginPath(); c.moveTo(a[0], a[1]); for (let i = 1; i <= 16; i++) { const t = (i / 16) * wh, u = 1 - t; c.lineTo(u * u * a[0] + 2 * u * t * m[0] + t * t * e[0], u * u * a[1] + 2 * u * t * m[1] + t * t * e[1]); } c.stroke(); }
  c.globalAlpha = 1;
};
// Another film may borrow this one's world (cheetahRun does): its own camera, a clock for the sun's
// rays and the grass that runs on while the face's own time is held, the face moved aside or left
// out, the grass and the grain left for the borrower to lay. With no options it is this film, exactly.
export type DuskOpts = { cam?: { z: number; look: P }; world?: number; face?: false; grass?: false; grain?: false };
export const drawDusk = (ctx: Ctx, f: number, env: Env, o: DuskOpts = {}) => {
  const c = ctx, s = env.scale, cam = o.cam ?? camAt(f), wf = o.world ?? f;
  c.setTransform(s, 0, 0, s, 0, 0); c.fillStyle = NIGHT; c.fillRect(0, 0, W, H);
  if (f < 60) stars(c, f, 1 - ramp(f, 14, 52));
  c.setTransform(s * cam.z, 0, 0, s * cam.z, s * (540 - cam.look[0] * cam.z), s * (540 - cam.look[1] * cam.z));
  // the moon, setting; the sun, rising behind the grass with its rays opening
  const set = ramp(f, 4, 52); if (set < 1) crescent(c, MOON[0] - set * set * 160, MOON[1] + set * set * 1000, MOON_R, PALE);
  const rise = out3(ramp(f, 8, 74)), sy = lerp(1700, 430, rise), rays = back(ramp(f, 40, 86));
  for (let j = 0; j < 96; j++) tuft(c, [540, sy], (j / 96) * Math.PI * 2 + wf * 0.0016, 440, 440 + (80 + (j % 2) * 26) * rays, 12, j % 2 ? RUST : "#8f3a26", 0);
  const sg = c.createRadialGradient(540, sy, 80, 540, sy, 470); sg.addColorStop(0, "#ff8a4a"); sg.addColorStop(1, CORAL); c.fillStyle = sg; c.beginPath(); c.arc(540, sy, 470, 0, Math.PI * 2); c.fill();
  if (o.face !== false) duskFace(c, f);
  if (o.grass !== false) grass(c, wf, 1);
  // screen space: the crescent carried out of the pupil to its place in the sky, and the grass coming back
  c.setTransform(s, 0, 0, s, 0, 0);
  if (f >= 290) { const u = ramp(f, 290, 338), e = inOut(u), from: P = [540 + (EYE_L[0] - 10 - cam.look[0]) * Math.min(cam.z, 1.6), 540 + (EYE_L[1] - 12 - cam.look[1]) * Math.min(cam.z, 1.6)]; crescent(c, lerp(from[0], MOON[0], e), lerp(from[1], MOON[1], e) - Math.sin(Math.PI * u) * 40, 9.5 * Math.pow(MOON_R / 9.5, e), PALE); }
  if (f >= 322) { stars(c, f, ramp(f, 326, 352)); grass(c, f, inOut(ramp(f, 322, 359))); }
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; if (o.grain !== false) c.drawImage(grainLayer(env).canvas, 0, 0);
};
const draw = (ctx: Ctx, f: number, env: Env) => drawDusk(ctx, f, env);

// the score: four bars at 80 bpm are the film's 12 s exactly, so the loop is the music's own
/** The night the film ends on, held: the stars, the crescent in its place, the grass. At t = 359 it is the film's last frame, and it runs on from there. */
export const duskNight = (ctx: Ctx, t: number, env: Env) => {
  const c = ctx, s = env.scale;
  c.setTransform(s, 0, 0, s, 0, 0); c.fillStyle = NIGHT; c.fillRect(0, 0, W, H);
  crescent(c, MOON[0], MOON[1], MOON_R, PALE); stars(c, t, 1); grass(c, t, 1);
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.drawImage(grainLayer(env).canvas, 0, 0);
};
export const DUSK_PALE = PALE;

const audio = (sr: number): [Float32Array, Float32Array] => {
  const n = Math.round((N / 30) * sr), L = new Float32Array(n), R = new Float32Array(n), m = renderLoop(cheetahDuskScore(), sr); // its tail folded back onto its start: no cut at the seam
  for (let i = 0; i < n && i < m.L.length; i++) { L[i] = m.L[i]; R[i] = m.R[i]; }
  return [L, R];
};

export const cheetahDusk: Film = {
  meta: { title: "Cheetah, dusk", W, H, fps: 30, bpm: 120, durationFrames: N, raster: "cpu", kind: "loop", poster: 260, score: { tempo: 80, form: "4 bars, looping: pad and phrase, groove, climb, half-time home" } },
  assets: { images: {} },
  shots: [{ id: "cheetah", start: 0, end: N, draw }],
  audio: Object.assign(audio, { scores: [cheetahDuskScore()] }),
};

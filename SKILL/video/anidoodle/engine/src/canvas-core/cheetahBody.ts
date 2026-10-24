// THE CHEETAH, SIDE VIEW. One character module: a pose goes in, the animal is drawn. Shots pose it,
// they never redraw it. It is the same animal as the face in cheetahDusk and is made the same way:
// tapered tufts over a mass, solid spots, the tear line as the one big black shape.
// Reference opened (Wikimedia Commons), for structure only:
//   - "Sarah Sprints" (CC BY 2.0): the build side-on, deep chest, tucked waist, spots following the form
//   - "Acinonyxrunningrespiration.png" (CC BY-SA 3.0): the two flight phases, where the spine folds and opens
//   - "Speed 2 - Running Cheetah" bronze (CC BY-SA 4.0): the extended phase, how the hind legs trail
//   - de Blainville's skeleton plate (public domain): scapula, the long metatarsus, the hock high off the foot
// The anatomy it commits to: a small domed head held level; a long neck in line with the back; the
// scapula riding over the ribs; chest twice as deep as the waist; hind legs longer than fore, with a
// knee, a hock and a long metatarsus; a tail two thirds of the body, ringed at the end, white-tipped;
// claws that show; dark pads on a trailing hind foot.
// Everything is authored FACING RIGHT, y down, in the animal's own units (about 920 nose-paw to tail tip).
import { rng, type Ctx, type P } from "./core";
import { mix } from "./gallery";

const NIGHT = "#0d1a22", OCHRE = "#e3a23a", GOLD = "#efb84e", CREAM = "#f2e4c5", PALE = "#fff5de", DARK = "#0a1216";
const ROWS = ["#a9601f", "#cf8a2c", OCHRE, GOLD, "#f2c263", "#f4cd7e", CREAM]; // back to belly
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type Pose = {
  spine: P[];   // 10 stations: rump, hip, loin, waist, rear ribs, chest, shoulder, neck base, neck, head join
  tail: P[];    // 6, from its root to its tip
  foreN: P[]; foreF: P[];   // scapula, shoulder, elbow, wrist, toes (near side, far side)
  hindN: P[]; hindF: P[];   // hip, knee, hock, ball, toes
  head: number; // the head's own angle, radians: 0 is level, positive is nose down
};

// the build: how thick the animal is at each station. A pose moves points; it never changes these.
const SPINE_UP = [14, 38, 40, 44, 54, 66, 66, 50, 38, 34], SPINE_DN = [22, 52, 44, 42, 68, 90, 76, 48, 36, 32];
const TAIL_W = [15, 13, 12, 12, 13, 11], FORE_W = [20, 30, 19, 12, 8], HIND_W = [44, 30, 13, 12, 8];


// a tuft: a tapered leaf from radius r0 to r1 along angle a, darker at its root (the mark cheetahDusk is made of)
const tuft = (c: Ctx, o: P, a: number, r0: number, r1: number, w: number, col: string, vein = 0.22, root = 0.6) => {
  if (r1 - r0 < 1.5 || w < 0.6) return;
  const ca = Math.cos(a), sa = Math.sin(a), b: P = [o[0] + ca * r0, o[1] + sa * r0], t: P = [o[0] + ca * r1, o[1] + sa * r1], m = r0 + (r1 - r0) * 0.42, mx = o[0] + ca * m, my = o[1] + sa * m;
  const g = c.createLinearGradient(b[0], b[1], t[0], t[1]); g.addColorStop(0, mix(col, DARK, root)); g.addColorStop(0.45, col); g.addColorStop(1, mix(col, "#ffffff", 0.16));
  c.fillStyle = g; c.beginPath(); c.moveTo(b[0], b[1]); c.quadraticCurveTo(mx - sa * w, my + ca * w, t[0], t[1]); c.quadraticCurveTo(mx + sa * w, my - ca * w, b[0], b[1]); c.fill();
  if (vein > 0) { c.strokeStyle = mix(col, DARK, 0.7); c.globalAlpha = vein; c.lineWidth = 1; c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(o[0] + ca * (r1 - 3), o[1] + sa * (r1 - 3)); c.stroke(); c.globalAlpha = 1; }
};

// a ribbon: a smooth curve through the points with its own thickness on each side. Side a is on the
// left hand of travel (the top, for a chain running to the right); side b is the other.
type Rib = { c: P[]; a: P[]; b: P[]; ang: number[]; len: number };
const cr = (p0: number, p1: number, p2: number, p3: number, t: number) => 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
const ribbon = (pts: P[], wa: number[], wb: number[] = wa, per = 12): Rib => {
  const g = (i: number) => pts[clamp(i, 0, pts.length - 1)], cs: P[] = [], ua: number[] = [], ub: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < per + (i === pts.length - 2 ? 1 : 0); k++) {
    const t = k / per, e = t * t * (3 - 2 * t);
    cs.push([cr(g(i - 1)[0], g(i)[0], g(i + 1)[0], g(i + 2)[0], t), cr(g(i - 1)[1], g(i)[1], g(i + 1)[1], g(i + 2)[1], t)]); ua.push(lerp(wa[i], wa[i + 1], e)); ub.push(lerp(wb[i], wb[i + 1], e));
  }
  const a: P[] = [], b: P[] = [], ang: number[] = []; let len = 0;
  cs.forEach((p, i) => { const q0 = cs[Math.max(0, i - 1)], q1 = cs[Math.min(cs.length - 1, i + 1)], th = Math.atan2(q1[1] - q0[1], q1[0] - q0[0]), nx = Math.sin(th), ny = -Math.cos(th); ang.push(th); a.push([p[0] + nx * ua[i], p[1] + ny * ua[i]]); b.push([p[0] - nx * ub[i], p[1] - ny * ub[i]]); if (i) len += Math.hypot(p[0] - cs[i - 1][0], p[1] - cs[i - 1][1]); });
  return { c: cs, a, b, ang, len };
};
// a place on the ribbon: s along it (0-1), v across it (-1 is side a, +1 is side b)
const on = (r: Rib, s: number, v: number) => {
  const x = clamp(s) * (r.c.length - 1), i = Math.min(r.c.length - 2, Math.floor(x)), f = x - i, e = v < 0 ? r.a : r.b, k = Math.abs(v), L = (q: P[], d: 0 | 1) => lerp(q[i][d], q[i + 1][d], f);
  return { p: [lerp(L(r.c, 0), L(e, 0), k), lerp(L(r.c, 1), L(e, 1), k)] as P, ang: r.ang[i], w: Math.hypot(L(r.a, 0) - L(r.b, 0), L(r.a, 1) - L(r.b, 1)) };
};
const fillRib = (c: Ctx, r: Rib, col: string) => { c.fillStyle = col; c.beginPath(); r.a.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); [...r.b].reverse().forEach((p) => c.lineTo(p[0], p[1])); c.closePath(); c.fill(); };
const blob = (c: Ctx, pts: P[], per = 8) => { const n = pts.length, g = (i: number) => pts[((i % n) + n) % n]; c.beginPath(); for (let i = 0; i < n; i++) for (let k = 0; k < per; k++) { const t = k / per, x = cr(g(i - 1)[0], g(i)[0], g(i + 1)[0], g(i + 2)[0], t), y = cr(g(i - 1)[1], g(i)[1], g(i + 1)[1], g(i + 2)[1], t); if (i + k) c.lineTo(x, y); else c.moveTo(x, y); } c.closePath(); };
const spot = (c: Ctx, p: P, rx: number, ry: number, a: number, col: string) => { c.fillStyle = col; c.beginPath(); c.ellipse(p[0], p[1], rx, ry, a, 0, Math.PI * 2); c.fill(); };

// a foot: four toes, each its own mark, each with its claw (a cheetah's never fully sheathe). A
// trailing hind foot shows its pads.
const paw = (c: Ctx, r: Rib, shade: number, hind: boolean) => {
  const sh = (col: string) => (shade ? mix(col, NIGHT, shade) : col), { p, ang } = on(r, 0.88, 0), pads = hind && Math.cos(ang) < -0.35; // a hind foot trailing behind shows its sole
  for (const k of [-1.5, 1.5, -0.5, 0.5]) {
    const a = ang + k * 0.15, L = 34 - Math.abs(k) * 3;
    tuft(c, p, a, 0, L, 6.6, sh(Math.abs(k) > 1 ? CREAM : PALE), 0.3, 0.35);
    tuft(c, [p[0] + Math.cos(a) * (L - 3), p[1] + Math.sin(a) * (L - 3)], a + 0.5, 0, 8, 1.9, sh("#2a1a12"), 0);
  }
  if (pads) { const q = on(r, 0.93, 0.8); spot(c, q.p, 5, 2.3, ang, sh("#3a2418")); const t = on(r, 1, 0.7); spot(c, [t.p[0] + Math.cos(ang) * 6, t.p[1] + Math.sin(ang) * 6], 2.4, 1.7, ang, sh("#3a2418")); }
};

// a leg: its mass, the fur lying toward the foot (laid from the foot upward, so each tuft overlaps
// the one below it), the spots thinning out toward the wrist, the fold where it meets the body.
const limb = (c: Ctx, joints: P[], widths: number[], seed: number, shade: number, hind: boolean) => {
  // the leg starts inside the body: the haunch and the point of the shoulder taper back into it, never a cut end
  const d = Math.hypot(joints[1][0] - joints[0][0], joints[1][1] - joints[0][1]) || 1, ext = widths[0] * 0.85, pts: P[] = [[joints[0][0] - ((joints[1][0] - joints[0][0]) / d) * ext, joints[0][1] - ((joints[1][1] - joints[0][1]) / d) * ext], ...joints], w = [widths[0] * 0.45, ...widths];
  const r = ribbon(pts, w, w, 10), L = Math.round(ext + (hind ? 320 : 315)), q = rng(seed), sh = (col: string) => (shade ? mix(col, NIGHT, shade) : col);
  fillRib(c, r, sh("#c2832a"));
  for (let i = Math.floor((L * 0.88) / 7); i >= 0; i--) {
    const s = (i * 7) / L, w0 = on(r, s, 0).w, rows = Math.max(2, Math.round(w0 / 11));
    for (let j = 0; j < rows; j++) {
      const v = lerp(-0.78, 0.78, rows === 1 ? 0.5 : j / (rows - 1)) + (q() - 0.5) * 0.3, at = on(r, s + (q() - 0.5) * (6 / L), v), under = hind ? v < -0.35 : v > 0.35, pale = clamp(s * 1.5 - 0.5) * 0.55;
      tuft(c, at.p, at.ang + (q() - 0.5) * 0.22, 0, clamp(w0 * 0.8, 16, 34) * (0.75 + q() * 0.5), clamp(w0 * 0.2, 2.6, 7), sh(mix(under ? "#f4cd7e" : q() < 0.5 ? GOLD : OCHRE, CREAM, pale)), 0.08, 0.26);
    }
  }
  for (let i = 1; i * 15 < L * 0.8; i++) {
    const s = (i * 15) / L, w0 = on(r, s, 0).w, n = Math.max(1, Math.round(w0 / 19));
    for (let j = 0; j < n; j++) { const v = (n === 1 ? 0 : lerp(-0.62, 0.62, j / (n - 1))) + (q() - 0.5) * 0.3, at = on(r, s + (q() - 0.5) * 0.02 + (j % 2) * (7 / L), v), z = clamp(w0 * 0.075, 1.7, 6.2) * (0.8 + q() * 0.4); spot(c, at.p, z * 1.15, z * 0.85 * Math.sqrt(1 - v * v * 0.6), at.ang, sh(DARK)); }
  }
  // the fold: the stifle under the thigh, the back of the shoulder. Thinner than an outline, and it fades.
  const e = hind ? r.a : r.b, m = Math.floor(e.length * 0.3); c.strokeStyle = sh(DARK); c.lineWidth = 2.2; c.lineCap = "round";
  for (let i = 1; i < m; i++) { c.globalAlpha = 0.34 * (1 - i / m); c.beginPath(); c.moveTo(e[i - 1][0], e[i - 1][1]); c.lineTo(e[i][0], e[i][1]); c.stroke(); }
  c.globalAlpha = 1;
  paw(c, r, shade, hind);
};

const tail = (c: Ctx, pts: P[]) => {
  const r = ribbon(pts, TAIL_W, TAIL_W, 10), L = 299, q = rng(23);
  fillRib(c, r, "#c2832a");
  for (let i = 0; i * 11 < L; i++) { const s = (i * 11) / L; for (const v of [0.6, -0.6, 0]) { const at = on(r, s, v); tuft(c, at.p, at.ang + (q() - 0.5) * 0.25 - v * 0.12, 0, 26 + q() * 8, 6.5, v > 0.3 ? "#f4cd7e" : v < -0.3 ? "#cf8a2c" : OCHRE, 0.18); } }
  // spots that close up into rings toward the end, then the white tip
  for (let i = 1; i * 17 < L * 0.62; i++) for (const v of [-0.5, 0.25]) { const at = on(r, (i * 17) / L + (v > 0 ? 8 / L : 0), v + (q() - 0.5) * 0.2); spot(c, at.p, 5, 3.8, at.ang, DARK); }
  for (const [s, wd] of [[0.68, 9], [0.78, 11], [0.88, 12]] as const) { const k = ribbon([on(r, s - 0.006, -1.05).p, on(r, s, 0).p, on(r, s + 0.006, 1.05).p], [wd / 2, wd / 2 + 1.5, wd / 2], undefined, 6); fillRib(c, k, DARK); }
  const end = on(r, 0.95, 0); for (let j = -3; j <= 3; j++) tuft(c, end.p, end.ang + j * 0.2, 0, 30 - Math.abs(j) * 3, 6.5, j % 2 ? PALE : CREAM, 0.15);
};

// the head in profile, authored point by point in its own frame (origin mid-skull, nose toward +x).
// The coat still opens in rings from the bridge of the nose, as it does on the face seen from the front.
const SKULL: P[] = [[-37, 2], [-33, -16], [-19, -30], [2, -33], [20, -27], [33, -17], [45, -9], [57, -5], [61, 3], [57, 11], [50, 22], [34, 28], [10, 31], [-16, 28], [-33, 17]];
const head = (c: Ctx, at: P, ang: number) => {
  c.save(); c.translate(at[0], at[1]); c.rotate(ang); c.scale(1.18, 1.18);
  // the far ear's tip, then the skull
  blob(c, [[-12, -28], [-17, -43], [-27, -45], [-30, -30]]); c.fillStyle = mix("#a9601f", NIGHT, 0.45); c.fill();
  blob(c, SKULL); c.fillStyle = "#c98a2e"; c.fill();
  c.save(); blob(c, SKULL); c.clip();
  const q = rng(61), N: P = [44, -8];
  for (let ring = 6; ring >= 0; ring--) { const rad = 6 + ring * 14, n = 9 + ring * 3; for (let j = 0; j < n; j++) { const a = Math.PI + lerp(-1.25, 1.35, (j + (ring % 2) * 0.5) / n), low = clamp((Math.sin(a) * -1 - 0.2) * 2.2); tuft(c, N, a + (q() - 0.5) * 0.06, rad, rad + 21, 5.2, mix(ROWS[Math.min(5, 5 - Math.min(5, ring)) ] , CREAM, low * 0.85), 0.18); } }
  // muzzle, chin and throat: pale
  blob(c, [[58, 5], [47, 1], [35, 6], [26, 16], [24, 30], [44, 32], [54, 20]]); c.fillStyle = PALE; c.fill();
  for (let j = 0; j < 9; j++) tuft(c, [50, 6], Math.PI * 0.5 + 0.25 + j * 0.16, 2, 24, 4.4, j % 2 ? CREAM : PALE, 0.14);
  c.restore();
  // crown and cheek spots, small, none on the muzzle
  for (let i = 0; i < 46; i++) { const x = -32 + q() * 56, y = -30 + q() * 54; if (Math.hypot(x - 22, y + 11) < 12 || (x > 12 && y > -4) || y > 20 - (x + 32) * 0.1) continue; spot(c, [x, y], 1.7 + q() * 1.1, 1.4 + q() * 0.8, q() * 3, DARK); }
  // the near ear, laid back by the wind: dark behind, pale inside, a fur rim
  blob(c, [[-5, -27], [-12, -44], [-27, -49], [-35, -37], [-29, -22]]); c.fillStyle = DARK; c.fill();
  for (let j = 0; j < 7; j++) tuft(c, [-14, -25], -Math.PI / 2 - 0.25 - j * 0.13, 3, 17 - Math.abs(j - 3) * 1.6, 3.2, j % 2 ? CREAM : "#e9c98a", 0.12);
  for (let j = 0; j < 9; j++) tuft(c, [-18, -31], -0.5 - j * 0.3, 13, 20, 3, j % 3 ? "#a9601f" : OCHRE, 0);
  // the tear line: from the inner corner of the eye, round the muzzle, to the corner of the mouth
  fillRib(c, ribbon([[27, -7], [30, 2], [36, 10], [37, 16]], [1.6, 3.6, 3.8, 1.4], undefined, 8), DARK);
  // the eye under its brow: lids, amber iris, pupil, the light in it
  blob(c, [[11, -10], [18, -17], [28, -15], [31, -8], [23, -5], [15, -6]]); c.fillStyle = DARK; c.fill();
  blob(c, [[14, -10], [19, -14.5], [26, -13], [28, -8.5], [22, -7], [16, -7.5]]); c.fillStyle = "#f39a1e"; c.fill();
  spot(c, [21.5, -10.5], 2.9, 3.1, 0, "#070b0e"); spot(c, [22.8, -11.8], 1, 1, 0, PALE);
  c.strokeStyle = DARK; c.lineCap = "round"; c.lineWidth = 2.4; c.beginPath(); c.moveTo(9, -15); c.quadraticCurveTo(20, -22, 31, -17); c.stroke();
  // nose pad, nostril, the mouth and the split of the lip, the chin's edge
  blob(c, [[52, -6], [58, -6], [62, 1], [60, 7], [54, 5]]); c.fillStyle = "#1a0f0c"; c.fill();
  c.strokeStyle = "rgba(255,245,222,0.4)"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(54, -3); c.lineTo(59, -2); c.stroke();
  c.strokeStyle = "#1a0f0c"; c.lineWidth = 2; c.beginPath(); c.moveTo(57, 7); c.quadraticCurveTo(55, 13, 48, 14); c.quadraticCurveTo(42, 16, 36, 15); c.stroke();
  c.lineWidth = 1.2; c.globalAlpha = 0.5; c.beginPath(); c.moveTo(50, 22); c.quadraticCurveTo(40, 30, 24, 30); c.stroke(); c.globalAlpha = 1;
  for (let row = 0; row < 3; row++) for (let k = 0; k < 3; k++) spot(c, [50 - k * 5 - row, 6.5 + row * 2.6 - k * 0.6], 0.8, 0.8, 0, "#2a1a12");
  // whiskers, swept back
  c.strokeStyle = PALE; c.lineWidth = 1.1; c.globalAlpha = 0.85;
  for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(47 - k * 2, 8 + k * 1.6); c.quadraticCurveTo(26, 14 + k * 5, -2 + k * 3, 24 + k * 7); c.stroke(); }
  c.globalAlpha = 1; c.restore();
};

/** Where her head sits on this pose: the middle of the skull. A head drawn another way (cheetahTurn's) goes here. */
export const headAnchor = (pose: Pose): P => { const end = on(ribbon(pose.spine, SPINE_UP, SPINE_DN, 14), 1, 0); return [end.p[0] + Math.cos(end.ang) * 14, end.p[1] + Math.sin(end.ang) * 14]; };
export const drawCheetah = (c: Ctx, pose: Pose, o: { head?: false } = {}) => {
  tail(c, pose.tail);
  limb(c, pose.hindF, HIND_W, 31, 0.36, true); limb(c, pose.foreF, FORE_W, 32, 0.36, false);
  // the body: its mass, then the coat in seven rows from the belly up, each row laid from the tail forward
  const r = ribbon(pose.spine, SPINE_UP, SPINE_DN, 14), L = 517, q = rng(7);
  fillRib(c, r, "#b9731f");
  c.fillStyle = "#e9d6ad"; c.beginPath(); for (let i = 0; i <= 60; i++) { const at = on(r, 0.14 + (i / 60) * 0.86, 0.98).p; if (i) c.lineTo(at[0], at[1]); else c.moveTo(at[0], at[1]); } for (let i = 60; i >= 0; i--) { const e = i / 60, at = on(r, 0.14 + e * 0.86, lerp(0.62, 0.42, e)).p; c.lineTo(at[0], at[1]); } c.closePath(); c.fill();
  const VS = [-0.84, -0.58, -0.3, 0, 0.28, 0.52, 0.74, 0.93], RC = [...ROWS, CREAM];
  for (let j = VS.length - 1; j >= 0; j--) for (let i = 0; i * 19 < L; i++) {
    const s = (i * 19 + (j % 2) * 9 + (q() - 0.5) * 7) / L; if (s > 1 || s < 0.05) continue;
    const at = on(r, s, VS[j]), k = clamp(at.w / 120, 0.55, 1), neck = clamp((s - 0.72) * 5), rump = 1 - clamp((s - 0.04) * 9), col = mix(mix(RC[j], CREAM, j >= 4 ? neck * 0.5 : 0), ROWS[2], j >= 4 ? rump : 0);
    tuft(c, at.p, at.ang + Math.PI - Math.max(0, VS[j]) * 0.22 + (q() - 0.5) * 0.1, 0, (40 + q() * 12) * k * (j >= 6 ? 0.62 : 1), 12 * k * (j >= 6 ? 0.8 : 1), j >= 6 ? mix(col, OCHRE, 0.1 + q() * 0.12) : mix(col, DARK, q() * 0.08), 0.22, j >= 5 ? 0.3 : 0.6);
  }
  // spots: solid, round, following the surface (they narrow toward the top and the belly line), none on the belly
  const sr = rng(5);
  for (let i = 0; i * 21 < L - 8; i++) for (let j = 0; j < 8; j++) {
    const v = -0.93 + j * 0.2 + (sr() - 0.5) * 0.09, s = (i * 21 + (j % 2) * 10.5 + (sr() - 0.5) * 6 + 8) / L, at = on(r, s, v), k = clamp(at.w / 130, 0.5, 1), z = (5.4 + sr() * 2.4) * k * (1 - clamp(v) * 0.25);
    spot(c, at.p, z * 1.12, z * 0.92 * Math.sqrt(1 - v * v * 0.72), at.ang, DARK);
  }
  limb(c, pose.hindN, HIND_W, 33, 0, true); limb(c, pose.foreN, FORE_W, 34, 0, false);
  if (o.head !== false) head(c, headAnchor(pose), pose.head);
};

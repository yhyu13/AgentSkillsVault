// BRICK BALLOON · the crayon balloon turns into toy bricks, builds itself, and flies.
//
// STORY (13.3 s, 90 bpm, a beat is 20 frames):
//   0-30     the crayon balloon plate, exactly as balloon.ts draws it.
//   30-72    a wave climbs the picture bottom to top; behind it the crayon becomes a brick mosaic,
//            one 1x1 plate per cell, each popping up with a press-fit, coloured from the crayon
//            beneath it snapped to the real toy-brick colour table.
//   80-126   the mosaic lets go: tiles fall away bottom rows first and the studio shows through,
//            where a baseplate drops in and the balloon is rebuilt in 3D, instruction-booklet
//            style: hills, a tree, a house, the path, the basket, the burner, then the envelope
//            course by course, bottom up, each part falling down its insertion axis, ghosted in
//            flight, seating with a one-frame press-fit.
//   200-228  the burner lights (a trans-orange flame that flickers); the world assembles around
//            the launch plate, tile by tile outward, and the camera pulls back into the sky.
//   228-400  lift-off: the balloon rises and travels, the camera follows a beat behind, the brick
//            country scrolls beneath (hills, woods, houses, a river), brick clouds pass behind and
//            in front at their own depths.
//
// MEDIUM: the toy-brick plate's (toyBrick.ts): moulded ABS in real toy-brick colours, orthographic
// at azimuth 45 / elevation 30, the cube rule for face tones, bevels, seams and real studs, one key
// light from the upper left. Every brick is drawn by toyBrickKit.
// THE ENVELOPE is a surface of revolution (the balloon plate's own profile: a narrow mouth, widest
// a little above the middle, a rounded crown) built as 13 one-brick courses. Each course is a
// 24-sided ring cut into 12 gores that run the full height in rainbow order, joints staggered
// course to course like a running bond; studs show only on the terraces the next course leaves
// bare. The basket hangs from the mouth by four black bars; the burner sits between them.
import { fractal, rng, type Ctx, type Env, type Layer, type P } from "./core";
import type { Film } from "./film";
import { renderFrame } from "./film";
import { balloon } from "./balloon";
import { aabb, BRICK, Cam, drawPart, LIGHT, order, PLATE, shade, STUD, STUD_H, stud, type Part } from "./toyBrickKit";

const W = 1080, H = 1080, N = 400, FPS = 30;
// real toy-brick colours (LDraw / BrickLink names in the comments)
const K = {
  red: "#B40000", orange: "#D67923", yellow: "#FAC80A", bgreen: "#4B9F4A" /* Bright Green */, green: "#237841" /* Green */, dgreen: "#184632" /* Dark Green */,
  blue: "#1E5AA8", azure: "#68C3E2" /* Medium Azure */, lblue: "#9FC3E9" /* Bright Light Blue */, lav: "#AC78BA" /* Medium Lavender */,
  white: "#F4F4F4", lbg: "#969696", dbg: "#646464", black: "#1B2A34", brown: "#5F3109" /* Reddish Brown */, tan: "#D7BA8C", dtan: "#958A73",
  tOrange: "#F08F1C" /* Trans-Orange */, tYellow: "#F5CD2F" /* Trans-Yellow */, byellow: "#FFF03A" /* Bright Light Yellow */,
};
const BACKDROP = "#E7E4DE", SKY = "#CFE7F2", HAIR = 0.7;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ramp = (f: number, a: number, b: number) => clamp((f - a) / (b - a));
const smooth = (t: number) => { const c = clamp(t); return c * c * (3 - 2 * c); };
const out3 = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mixHex = (a: string, b: string, t: number) => { const h = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)); const x = h(a), y = h(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], clamp(t)))).join(",")})`; };

// ---------------------------------------------------------------- the cue table (frames)
const T = { waveA: 30, waveB: 72, fallA: 80, fallB: 126, base: 96, build0: 104, env0: 146, envStep: 3, ropes: 140, settle: 192, fire: 200, world0: 200, lift: 228 };
const FALL = 10, DROP = 190;

// ---------------------------------------------------------------- the launch plate (tile 0,0)
type Placed = Part & { land: number };
const rect = (x0: number, z0: number, x1: number, z1: number): [number, number][] => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const TILE = 16;
// what stands on one 16x16 baseplate. `ox, oz` put it in the world; `launch` is the balloon's own plate
const tileParts = (i: number, j: number, launch: boolean): Part[] => {
  const P: Part[] = [], r = rng(9001 + i * 131 + j * 7919), ox = i * TILE, oz = j * TILE;
  const add = (foot: [number, number][], y0: number, h: number, color: string, studs = true, kind: Part["kind"] = "prism") => P.push({ id: P.length, color, kind, foot: foot.map(([x, z]) => [x + ox, z + oz] as [number, number]), y0, h, studs, step: 0 });
  // the river runs the whole length of the world along Z, at i = 2
  const river = i === 2;
  if (river) { add(rect(0, 0, 6, 16), -0.4, 0.4, K.bgreen); add(rect(6, 0, 10, 16), -0.4, 0.4, K.blue); add(rect(10, 0, 16, 16), -0.4, 0.4, K.bgreen); }
  else add(rect(0, 0, 16, 16), -0.4, 0.4, K.bgreen);
  const hill = (x0: number, z0: number, x1: number, z1: number, tiers: number) => { for (let k = 0; k < tiers; k++) add(rect(x0 + k, z0 + k, x1 - k, z1 - k), k * 3, 3, [K.green, K.bgreen, K.green, K.dgreen][k % 4]); };
  const tree = (x: number, z: number, kind: number) => {
    add(rect(x, z, x + 1, z + 1), 0, 3, K.brown, false, "round"); add(rect(x, z, x + 1, z + 1), 3, 3, K.brown, false, "round");
    if (kind === 0) { add(rect(x - 1, z - 1, x + 2, z + 2), 6, 3, K.green); add(rect(x - 0.5, z - 0.5, x + 1.5, z + 1.5), 9, 3, K.green); add(rect(x, z, x + 1, z + 1), 12, 3, K.bgreen, true, "round"); }
    else { add(rect(x - 1, z - 1, x + 2, z + 2), 6, 3, K.dgreen); add(rect(x - 1, z - 1, x + 2, z + 2), 9, 3, K.dgreen); add(rect(x, z, x + 1, z + 1), 12, 3, K.dgreen, true, "round"); }
  };
  const house = (x: number, z: number, roof: string) => {
    add(rect(x, z, x + 4, z + 3), 0, 3, K.white); add(rect(x, z, x + 4, z + 3), 3, 3, K.white);
    add(rect(x + 4 - 0.01, z + 1, x + 4, z + 2), 1, 3, K.azure, false); // a window in the lit face
    add(rect(x - 0.5, z - 0.5, x + 4.5, z + 3.5), 6, 1, roof); add(rect(x, z, x + 4, z + 3), 7, 1, roof); add(rect(x + 0.5, z + 0.5, x + 3.5, z + 2.5), 8, 1, roof); add(rect(x + 1, z + 1, x + 3, z + 2), 9, 1, roof);
    add(rect(x + 3, z + 0.5, x + 4, z + 1.5), 7, 5, K.dbg, true, "round");
  };
  if (launch) {
    hill(0, 0, 7, 6, 3); house(10, 1, K.red); tree(3, 11, 1); tree(14, 7, 0);   // nothing stands in front of the basket
    add(rect(10, 8, 16, 9), 0, 1, K.tan, false); add(rect(8, 7, 10, 9), 0, 1, K.tan, false);
    return P;
  }
  if (river) { add(rect(7, 3, 9, 4), 0, 0.4, K.azure, false); add(rect(6.5, 11, 8, 12), 0, 0.4, K.azure, false); if (j % 2 === 0) { add(rect(3, 6, 6, 10), 0, 3, K.green); tree(12, 4, 1); } else { tree(2, 3, 0); tree(12, 10, 0); } return P; }
  // the countryside: a hill, a wood or a farm, chosen by the tile's own seed
  const kind = Math.floor(r() * 5);
  if (kind === 0) { hill(1 + Math.floor(r() * 3), 1 + Math.floor(r() * 3), 13 - Math.floor(r() * 2), 12 - Math.floor(r() * 2), 2 + Math.floor(r() * 2)); if (r() < 0.5) tree(13, 13, 1); }
  else if (kind === 1) { const n = 2 + Math.floor(r() * 2); for (let k = 0; k < n; k++) tree(2 + Math.floor(r() * 11), 2 + Math.floor(r() * 11), k % 2); }
  else if (kind === 2) { house(3 + Math.floor(r() * 4), 3 + Math.floor(r() * 3), r() < 0.5 ? K.red : K.blue); tree(12, 12, 0); }
  else if (kind === 3) { const x0 = 1 + Math.floor(r() * 3), z0 = 1 + Math.floor(r() * 3), col = r() < 0.5 ? K.yellow : K.tan; for (let k = 0; k < 5; k++) add(rect(x0, z0 + k * 2, x0 + 9, z0 + k * 2 + 1), 0, 1, col, true); }   // a field in rows
  else { add(rect(4, 4, 11, 10), 0, 0.4, K.blue, false); add(rect(5, 5, 7, 6), 0, 0.4, K.azure, false); add(rect(8, 8, 10, 9), 0, 0.4, K.azure, false); tree(12, 3, 1); }   // a pond
  return P;
};

// ---------------------------------------------------------------- the balloon, in LDU
const AXIS: [number, number] = [8.5 * STUD, 8.5 * STUD];   // on the launch plate
const COURSES = 15, R_MAX = 6.5, R_MOUTH = 1.6, MOUTH_Y = 17 * PLATE, SEGS = 24;
const GORE = [K.red, K.orange, K.yellow, K.bgreen, K.blue, K.lav];
// the balloon plate's profile: a long cone out of the mouth that swells into the shoulder,
// widest at 60% of the height, then a round crown
const courseR = (i: number) => { const u = (i + 0.5) / COURSES; return u < 0.6 ? R_MOUTH + (R_MAX - R_MOUTH) * Math.pow(Math.sin((Math.PI / 2) * (u / 0.6)), 1.35) : R_MAX * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.6) / 0.43, 2))); };
const sideTone = (nx: number, nz: number) => -0.11 - 0.11 * (nx - nz);
const goreAt = (a: number) => GORE[Math.floor((((a / (Math.PI * 2)) % 1) + 1) % 1 * 12) % 6];
const basketParts = (): Part[] => {
  const P: Part[] = []; let id = 1000;
  const add = (foot: [number, number][], y0: number, h: number, color: string, studs = true, kind: Part["kind"] = "prism") => P.push({ id: id++, color, kind, foot, y0, h, studs, step: 0 });
  add(rect(7, 7, 10, 10), 0, 3, K.brown, false); add(rect(7, 7, 10, 10), 3, 3, K.brown, false); add(rect(7, 7, 10, 10), 6, 1, K.tan, false);
  add(rect(8, 8, 9, 9), 7, 2, K.dbg, true, "round");
  return P;
};

// one course of the envelope: camera-facing faces, the top, the bare terrace's studs
const drawCourse = (c: Ctx, cam: Cam, i: number, lift: number, dy: number, alpha: number, hair: number) => {
  const r = courseR(i) * STUD, rn = i + 1 < COURSES ? courseR(i + 1) : 0, Y0 = MOUTH_Y + i * BRICK + lift + dy, Y1 = Y0 + BRICK, [cx, cz] = AXIS, s = cam.s;
  const off = (i % 2) * (Math.PI / SEGS), A = (k: number) => (k / SEGS) * Math.PI * 2 + off, pt = (k: number): [number, number] => [cx + Math.cos(A(k)) * r, cz + Math.sin(A(k)) * r];
  c.globalAlpha = alpha;
  // tops first (they are behind the faces), one fan per segment in its gore colour
  for (let k = 0; k < SEGS; k++) { const a = pt(k), b = pt(k + 1), col = goreAt((A(k) + A(k + 1)) / 2 - off); const q = [cam.p(cx, Y1, cz), cam.p(a[0], Y1, a[1]), cam.p(b[0], Y1, b[1])]; c.beginPath(); q.forEach(([x, y], n) => (n ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = shade(col, 0.1); c.fill(); c.strokeStyle = shade(col, 0.1); c.lineWidth = 0.6; c.stroke(); }
  const faces: { q: [number, number][]; col: string; k: number }[] = [];
  for (let k = 0; k < SEGS; k++) {
    const am = (A(k) + A(k + 1)) / 2, nx = Math.cos(am), nz = Math.sin(am); if (nx + nz <= 0) continue;
    const a = pt(k), b = pt(k + 1), col = goreAt(am - off);
    const q: [number, number][] = [cam.p(a[0], Y0, a[1]), cam.p(b[0], Y0, b[1]), cam.p(b[0], Y1, b[1]), cam.p(a[0], Y1, a[1])];
    c.beginPath(); q.forEach(([x, y], n) => (n ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = shade(col, sideTone(nx, nz)); c.fill(); c.strokeStyle = shade(col, sideTone(nx, nz)); c.lineWidth = 0.6; c.stroke();
    faces.push({ q, col, k });
  }
  // bevel along the lit top edge, seams along the bottom, and a vertical joint where the gore
  // changes colour or where the running bond puts one
  c.lineCap = "round";
  faces.forEach(({ q, col, k }) => {
    c.strokeStyle = shade(col, 0.32); c.lineWidth = Math.max(1, 0.9 * s); c.beginPath(); c.moveTo(q[3][0], q[3][1] + 0.5 * s); c.lineTo(q[2][0], q[2][1] + 0.5 * s); c.stroke();
    c.strokeStyle = shade(col, -0.45); c.lineWidth = hair; c.beginPath(); c.moveTo(q[0][0], q[0][1]); c.lineTo(q[1][0], q[1][1]); c.stroke();
    const prev = goreAt((A(k - 1) + A(k)) / 2 - off), joint = prev !== col || (k + i) % 2 === 0;
    if (joint) { c.beginPath(); c.moveTo(q[0][0], q[0][1]); c.lineTo(q[3][0], q[3][1]); c.stroke(); }
  });
  // studs on the terrace the next course leaves bare, back to front
  const cells: [number, number][] = [];
  const R = Math.ceil(courseR(i)) + 1;
  for (let x = -R; x < R; x++) for (let z = -R; z < R; z++) { const d = Math.hypot(x + 0.5, z + 0.5); if (d < courseR(i) - 0.5 && d > rn + 0.15) cells.push([x + 0.5, z + 0.5]); }
  cells.sort((a, b) => a[0] + a[1] - (b[0] + b[1])).forEach(([x, z]) => stud(c, cam, cx + x * STUD, Y1, cz + z * STUD, goreAt(Math.atan2(z, x) - off), hair));
  c.globalAlpha = 1;
};
// the four bars from the basket rim to the mouth; `front` picks the pair nearer the camera
const drawBars = (c: Ctx, cam: Cam, lift: number, front: boolean, grow: number) => {
  if (grow <= 0) return;
  const [cx, cz] = AXIS, y0 = 7 * PLATE + lift, y1 = MOUTH_Y + lift, r0 = 1.5 * STUD, r1 = R_MOUTH * STUD * 0.9;
  [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].forEach((a) => {
    const isFront = Math.cos(a) + Math.sin(a) > -0.1; if (isFront !== front) return;
    const b = cam.p(cx + Math.cos(a) * r0 * 1.41, y0, cz + Math.sin(a) * r0 * 1.41), t = cam.p(cx + Math.cos(a) * r1, y1, cz + Math.sin(a) * r1), e: P = [lerp(b[0], t[0], grow), lerp(b[1], t[1], grow)];
    c.lineCap = "round"; c.strokeStyle = K.black; c.lineWidth = Math.max(1.4, 2.2 * cam.s); c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(e[0], e[1]); c.stroke();
    c.strokeStyle = shade(K.black, 0.35); c.lineWidth = Math.max(0.6, 0.7 * cam.s); c.beginPath(); c.moveTo(b[0] - 0.8 * cam.s, b[1]); c.lineTo(e[0] - 0.8 * cam.s, e[1]); c.stroke();
  });
};
// the burner's flame: trans-orange outside, trans-yellow core, flickering on noise, into the mouth
const drawFlame = (c: Ctx, cam: Cam, lift: number, f: number, power: number) => {
  if (power <= 0) return;
  const [cx, cz] = AXIS, base = cam.p(cx, 9 * PLATE + lift, cz), n = fractal(77, f * 0.35, 0.5, 1, 1, 2), h = (18 + 34 * n) * power * cam.s, w = (7 + 2 * n) * cam.s * Math.min(1, power * 1.5);
  const tongue = (hh: number, ww: number, col: string, a: number) => { c.globalAlpha = a; c.fillStyle = col; c.beginPath(); c.moveTo(base[0] - ww, base[1]); c.quadraticCurveTo(base[0] - ww * 0.9, base[1] - hh * 0.55, base[0] + ww * 0.25 * Math.sin(f * 0.9), base[1] - hh); c.quadraticCurveTo(base[0] + ww * 0.9, base[1] - hh * 0.55, base[0] + ww, base[1]); c.closePath(); c.fill(); };
  tongue(h, w, K.tOrange, 0.82); tongue(h * 0.62, w * 0.55, K.tYellow, 0.9); c.globalAlpha = 1;
  // the glow the flame throws up into the mouth
  const m = cam.p(cx, MOUTH_Y + lift, cz); c.globalAlpha = 0.28 * power * (0.8 + 0.2 * n); c.fillStyle = K.tYellow; c.beginPath(); c.ellipse(m[0], m[1], R_MOUTH * STUD * 0.95 * cam.s * 0.707 * 2, R_MOUTH * STUD * 0.95 * cam.s * 0.707, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
};

// ---------------------------------------------------------------- the camera
// q = the unit projection (Cam(1,0,0)); screen = (q - F) * z + centre
const U = new Cam(1, 0, 0);
type View = { F: P; z: number };
const camOf = (v: View, sc: number) => new Cam(v.z * sc, (W / 2 - v.F[0] * v.z) * sc, (H * 0.56 - v.F[1] * v.z) * sc);
const BUILD: View = { F: U.p(AXIS[0], 150, AXIS[1]) as P, z: 1.25 };
const lift = (f: number) => (f < T.lift ? 0 : 820 * smooth((f - T.lift) / 130) + 1.8 * Math.max(0, f - T.lift - 70) + 5 * Math.sin(((f - T.lift) / 40) * Math.PI) * ramp(f, T.lift, T.lift + 40));
const travel = (f: number) => (f < T.lift + 12 ? 0 : 40 * Math.pow((f - T.lift - 12) / (N - T.lift - 12), 1.5)) * STUD; // along +X -Z: screen right
const balloonAt = (f: number) => ({ dx: travel(f), dz: -travel(f), y: lift(f) });
const view = (f: number): View => {
  const b = balloonAt(Math.max(0, f - 16)), follow: P = U.p(AXIS[0] + b.dx, 230 + b.y * 0.55, AXIS[1] + b.dz) as P;
  const pull = smooth(ramp(f, T.world0, T.lift + 30));
  return { F: [lerp(BUILD.F[0], follow[0], pull), lerp(BUILD.F[1], follow[1], pull)], z: lerp(BUILD.z, 0.86, pull) * (1 - 0.2 * smooth(ramp(f, T.lift + 20, N))) };   // ortho has no perspective: pulling back is the altitude cue
};

// ---------------------------------------------------------------- sprites (the world is static: draw it once)
type Sprite = { L: Layer; q0: P; k: number };   // canvas origin in unit-projection coords; k = px per unit
const SPRITE_K = 1.25;
const spriteOf = (env: Env, key: string, parts: Part[], shadow = true): Sprite => {
  const ck = `bb/sprite/${key}/${env.scale}`; let s = env.cache.get(ck) as Sprite | undefined; if (s) return s;
  const k = SPRITE_K * env.scale; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  parts.forEach((p) => { const b = aabb(p); for (const X of [b.x0, b.x1]) for (const Y of [b.y0, b.y1]) for (const Z of [b.z0, b.z1]) { const q = U.p(X, Y, Z); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); } });
  const pad = 30, L = env.canvas(Math.ceil((x1 - x0) * k + pad * 2), Math.ceil((y1 - y0) * k + pad * 2)), cam = new Cam(k, -x0 * k + pad, -y0 * k + pad);
  const base = parts.filter((p) => p.y0 < 0), rest = parts.filter((p) => p.y0 >= 0);
  order(base.map((p) => ({ p, dy: 0 })), cam).forEach((i) => drawPart(L.ctx, cam, base[i], 0, HAIR * env.scale));
  if (shadow) groundShadow(env, L.ctx, cam, rest, 0.3);
  order(rest.map((p) => ({ p, dy: 0 })), cam).forEach((i) => drawPart(L.ctx, cam, rest[i], 0, HAIR * env.scale));
  s = { L, q0: [x0 - pad / k, y0 - pad / k], k }; env.cache.set(ck, s); return s;
};
const blit = (ctx: Ctx, s: Sprite, v: View, sc: number, dyScreen = 0, alpha = 1) => {
  const z = v.z * sc, x = (W / 2 + (s.q0[0] - v.F[0]) * v.z) * sc, y = (H * 0.56 + (s.q0[1] - v.F[1]) * v.z) * sc - dyScreen * sc;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha; ctx.drawImage(s.L.canvas as CanvasImageSource, x, y, (s.L.canvas.width * z) / s.k, (s.L.canvas.height * z) / s.k); ctx.globalAlpha = 1;
};
// soft ground shadows, swept along the light onto Y = 0, drawn small and scaled back up (no filter)
const hull = (pts: P[]) => { const q = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo: P[] = [], up: P[] = []; for (const p of q) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (let i = q.length - 1; i >= 0; i--) { const p = q[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); } return [...lo.slice(0, -1), ...up.slice(0, -1)]; };
const groundShadow = (env: Env, c: Ctx, cam: Cam, parts: Part[], a: number, lifted = 0) => {
  if (!parts.length) return;
  const sx = -LIGHT[0] / LIGHT[1], sz = -LIGHT[2] / LIGHT[1], k = 0.2, w = Math.ceil(c.canvas.width * k) + 2, h = Math.ceil(c.canvas.height * k) + 2;
  const key = `bb/soft/${w}x${h}`; let S = env.cache.get(key) as Layer | undefined; if (!S) { S = env.canvas(w, h); env.cache.set(key, S); }
  const s = S.ctx; s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, w, h); s.fillStyle = "#000";
  const tr = c.getTransform();
  parts.forEach((p) => { const b = aabb(p, lifted), pts: P[] = []; for (const Y of [b.y0, b.y1 - (p.studs ? STUD_H : 0)]) for (const X of [b.x0, b.x1]) for (const Z of [b.z0, b.z1]) { const q = cam.p(X + sx * Y, 0, Z + sz * Y); pts.push([(tr.a * q[0] + tr.e) * k, (tr.d * q[1] + tr.f) * k]); } const hh = hull(pts); s.beginPath(); hh.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); s.fill(); });
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = true; c.globalAlpha = a; c.drawImage(S.canvas as CanvasImageSource, 0, 0, w, h, 0, 0, w / k, h / k); c.restore();
};

// ---------------------------------------------------------------- the world
type WTile = { i: number; j: number; d: number; parts: Part[] };
const WORLD: WTile[] = (() => {
  const out: WTile[] = [];
  for (let i = -8; i <= 9; i++) for (let j = -13; j <= 4; j++) {
    if (i === 0 && j === 0) continue;
    // keep a tile only if some frame of the flight shows it (checked at the zoom and centre of every 8th frame)
    const c = U.p((i + 0.5) * TILE * STUD, 0, (j + 0.5) * TILE * STUD); let seen = false;
    for (let f = T.world0; f < N && !seen; f += 8) { const v = view(f), x = W / 2 + (c[0] - v.F[0]) * v.z, y = H * 0.56 + (c[1] - v.F[1]) * v.z; seen = x > -380 * v.z && x < W + 380 * v.z && y > -260 * v.z && y < H + 520 * v.z; }
    if (!seen) continue;
    const d = Math.max(Math.abs(i), Math.abs(j)) + 0.35 * (Math.abs(i) + Math.abs(j)); out.push({ i, j, d, parts: tileParts(i, j, false) });
  }
  return out.sort((a, b) => a.i + a.j - (b.i + b.j));   // back to front
})();
const LAUNCH = tileParts(0, 0, true);
// the launch plate's build: the plate, then the hills bottom-up, the trees, the house, the path
const LAUNCH_LAND: number[] = (() => { const land: number[] = []; let t = T.build0; LAUNCH.forEach((p, n) => { land.push(n === 0 ? T.base : t); if (n > 0) t += 2; }); return land; })();
const BASKET = basketParts(), BASKET_LAND = [136, 139, 142, 145];

// ---------------------------------------------------------------- clouds: white bricks, grey undersides
const cloudParts = (seed: number): Part[] => {
  const r = rng(seed), P: Part[] = []; let id = 2000;
  const add = (x0: number, z0: number, x1: number, z1: number, y0: number, h: number, col: string, kind: Part["kind"] = "prism") => P.push({ id: id++, color: col, kind, foot: rect(x0, z0, x1, z1), y0, h, studs: true, step: 0 });
  // two or three puffs side by side, each a dome: a wide grey-bottomed plate, then white courses
  // stepping in, a round on top
  const puffs = 2 + Math.floor(r() * 2);
  for (let k = 0; k < puffs; k++) {
    const w = 6 - (k % 2) * 2 + Math.floor(r() * 2), x = k * 4.5, z = (k % 2) * 1.5, y = (k % 2) * 3;
    add(x, z, x + w, z + w * 0.6 + 1, y, 1, K.lbg); add(x, z, x + w, z + w * 0.6 + 1, y + 1, 3, K.white);
    add(x + 1, z + 0.5, x + w - 1, z + w * 0.6 + 0.5, y + 4, 3, K.white); add(x + 2, z + 1, x + w - 2, z + w * 0.6, y + 7, 3, K.white);
    add(x + w / 2 - 0.5, z + w * 0.3, x + w / 2 + 0.5, z + w * 0.3 + 1, y + 10, 2, K.white, "round");
  }
  return P;
};
type Cloud = { seed: number; X: number; Z: number; Y: number; par: number; front: boolean };
const CLOUDS: Cloud[] = [
  { seed: 1, X: 280, Z: -520, Y: 620, par: 0.7, front: false }, { seed: 2, X: 620, Z: -760, Y: 880, par: 0.75, front: false },
  { seed: 3, X: 980, Z: -1180, Y: 700, par: 0.7, front: false }, { seed: 4, X: 470, Z: -980, Y: 980, par: 1.3, front: true },
  { seed: 5, X: 860, Z: -1560, Y: 1180, par: 1.35, front: true }, { seed: 6, X: 150, Z: -220, Y: 1020, par: 0.65, front: false },
];
const drawCloud = (ctx: Ctx, env: Env, cl: Cloud, v: View, f: number) => {
  const s = spriteOf(env, `cloud${cl.seed}`, cloudParts(cl.seed), false), sc = env.scale;
  const q = U.p(cl.X, cl.Y, cl.Z), view0 = view(T.lift), par: View = { F: [lerp(view0.F[0], v.F[0], cl.par), lerp(view0.F[1], v.F[1], cl.par)], z: v.z };
  const a = ramp(f, T.world0 + 10, T.lift + 20) * (cl.front ? 0.92 : 1);
  if (a <= 0) return;
  const shifted: Sprite = { ...s, q0: [s.q0[0] + q[0], s.q0[1] + q[1]] };
  blit(ctx, shifted, par, sc, 0, a);
};

// ---------------------------------------------------------------- the crayon, and its mosaic
const CELL = 27, NC = W / CELL;   // 40 x 40 one-by-one plates
const PAL = [K.white, K.lblue, K.azure, K.blue, K.red, K.orange, K.yellow, K.byellow, K.bgreen, K.green, K.dgreen, K.brown, K.tan, K.black, K.lav];
const crayonLayer = (env: Env): Layer => {
  const key = `bb/crayon/${env.scale}`; let L = env.cache.get(key) as Layer | undefined; if (L) return L;
  L = env.canvas(Math.round(W * env.scale), Math.round(H * env.scale));
  renderFrame(balloon, L.ctx, 0, { W, H, scale: env.scale, cache: new Map(), canvas: env.canvas, image: env.image });
  env.cache.set(key, L); return L;
};
const mosaic = (env: Env): string[] => {
  const key = "bb/mosaic"; let m = env.cache.get(key) as string[] | undefined; if (m) return m;
  const Ls = env.canvas(NC * 4, NC * 4); renderFrame(balloon, Ls.ctx, 0, { W, H, scale: (NC * 4) / W, cache: new Map(), canvas: env.canvas, image: env.image });
  const d = Ls.ctx.getImageData(0, 0, NC * 4, NC * 4).data, rgb = PAL.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  m = [];
  for (let cy = 0; cy < NC; cy++) for (let cx = 0; cx < NC; cx++) {
    let R = 0, G = 0, B = 0; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const o = ((cy * 4 + y) * NC * 4 + cx * 4 + x) * 4; R += d[o]; G += d[o + 1]; B += d[o + 2]; }
    R /= 16; G /= 16; B /= 16;
    // crayon hatching is colour over paper: find the most saturated sample and lean the cell toward it
    let sat = -1, sr = R, sg = G, sb = B; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const o = ((cy * 4 + y) * NC * 4 + cx * 4 + x) * 4, mx = Math.max(d[o], d[o + 1], d[o + 2]), mn = Math.min(d[o], d[o + 1], d[o + 2]), c = mx - mn; if (c > sat) { sat = c; sr = d[o]; sg = d[o + 1]; sb = d[o + 2]; } }
    if (sat > 60) { R = 0.25 * R + 0.75 * sr; G = 0.25 * G + 0.75 * sg; B = 0.25 * B + 0.75 * sb; }
    let best = 0, bd = 1e9; rgb.forEach(([r, g, b], k) => { const e = 0.3 * (r - R) ** 2 + 0.59 * (g - G) ** 2 + 0.11 * (b - B) ** 2; if (e < bd) { bd = e; best = k; } }); m.push(PAL[best]);
  }
  env.cache.set(key, m); return m;
};
// a 1x1 plate seen from above: the top, a darker lip right and below, the stud with its crescents
const tile2d = (c: Ctx, x: number, y: number, s: number, col: string) => {
  const g = s * 0.06;
  c.fillStyle = shade(col, -0.25); c.fillRect(x + g, y + g, s - g, s - g);
  c.fillStyle = col; c.fillRect(x, y, s - g * 1.6, s - g * 1.6);
  const cx = x + s * 0.46, cy = y + s * 0.46, r = s * 0.3;
  c.fillStyle = shade(col, -0.22); c.beginPath(); c.arc(cx + r * 0.16, cy + r * 0.2, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = shade(col, 0.12); c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
  c.strokeStyle = shade(col, 0.5); c.lineWidth = Math.max(1, s * 0.05); c.beginPath(); c.arc(cx, cy, r * 0.72, Math.PI * 1.02, Math.PI * 1.55); c.stroke();
};
const popAt = (cx: number, cy: number) => T.waveA + (1 - (cy + 0.5) / NC) * (T.waveB - T.waveA - 10) + fractal(31, cx * 0.4, cy * 0.4, 1, 1, 2) * 8;
const fallAt = (cx: number, cy: number) => T.fallA + (1 - (cy + 0.5) / NC) * 26 + fractal(32, cx * 0.5, cy * 0.5, 1, 1, 2) * 10;
const drawMosaic = (ctx: Ctx, env: Env, f: number) => {
  const m = mosaic(env), sc = env.scale; ctx.setTransform(sc, 0, 0, sc, 0, 0);
  for (let cy = 0; cy < NC; cy++) for (let cx = 0; cx < NC; cx++) {
    const t0 = popAt(cx, cy); if (f < t0) continue;
    const u = (f - t0) / 7, pop = u >= 1 ? 1 : 1 + 0.35 * Math.sin(Math.PI * u) * (1 - u) - (1 - out3(u)) * 0.6;
    const tf = fallAt(cx, cy), fall = f > tf ? f - tf : 0, drop = 0.9 * fall * fall, spin = fractal(33, cx, cy, 1, 1, 1) - 0.5;
    if (drop > H + 60) continue;
    const s = CELL * clamp(pop, 0, 1.3), x = cx * CELL + (CELL - s) / 2 + spin * fall * 2.2, y = cy * CELL + (CELL - s) / 2 + drop;
    tile2d(ctx, x, y, s, m[cy * NC + cx]);
  }
};

// ---------------------------------------------------------------- one frame
const drawFrame = (ctx: Ctx, fr: number, env: Env) => {
  const f = Math.min(fr, N - 1), sc = env.scale;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  if (f < T.waveA) { ctx.drawImage(crayonLayer(env).canvas as CanvasImageSource, 0, 0); return; }
  if (f < T.fallA) { ctx.drawImage(crayonLayer(env).canvas as CanvasImageSource, 0, 0); drawMosaic(ctx, env, f); return; }
  const v = view(f), cam = camOf(v, sc), sky = ramp(f, T.world0, T.lift + 40);
  ctx.fillStyle = sky > 0 ? mixHex(BACKDROP, SKY, smooth(sky)) : BACKDROP; ctx.fillRect(0, 0, W * sc, H * sc);
  // the world tiles drop in around the launch plate, nearest first
  WORLD.forEach((t) => { const L = T.world0 + t.d * 3.2; if (f < L - FALL) return; const u = clamp((f - (L - FALL)) / FALL), dyS = (1 - out3(u)) * 260 * v.z; blit(ctx, spriteOf(env, `t${t.i},${t.j}`, t.parts), v, sc, dyS, 0.35 + 0.65 * Math.min(1, u / 0.6)); });
  // the launch plate: built part by part, then one sprite
  if (f >= LAUNCH_LAND[LAUNCH_LAND.length - 1] + 2) blit(ctx, spriteOf(env, "launch", LAUNCH), v, sc);
  else {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const live = LAUNCH.map((p, n) => { const L = LAUNCH_LAND[n]; if (f < L - FALL) return null; if (f >= L) return { p, dy: f === L ? -0.5 : 0, a: 1 }; const u = (f - (L - FALL)) / FALL; return { p, dy: DROP * (1 - out3(u)) * (n === 0 ? 2 : 1), a: 0.35 + 0.65 * Math.min(1, u / 0.6) }; }).filter((x): x is NonNullable<typeof x> => !!x);
    const base = live.filter((s) => s.p.y0 < 0), rest = live.filter((s) => s.p.y0 >= 0);
    base.forEach((s) => { ctx.globalAlpha = s.a; drawPart(ctx, cam, s.p, s.dy, HAIR * sc); ctx.globalAlpha = 1; });
    if (base.length && rest.length) groundShadow(env, ctx, cam, rest.filter((s) => s.dy === 0).map((s) => s.p), 0.3);
    order(rest.map((s) => ({ p: s.p, dy: s.dy })), cam).forEach((i) => { ctx.globalAlpha = rest[i].a; drawPart(ctx, cam, rest[i].p, rest[i].dy, HAIR * sc); ctx.globalAlpha = 1; });
  }
  // the balloon: its shadow on the ground, then back bars, basket, burner, flame, front bars, envelope
  const b = balloonAt(f), bc = new Cam(cam.s, cam.ox + ((b.dx - b.dz) * 0.70711) * cam.s, cam.oy + ((b.dx + b.dz) * 0.35355) * cam.s), up = b.y;
  if (f >= T.lift) {
    // a high midday sun for the balloon's own shadow, so it stays in frame and grows apart from the
    // basket as it climbs: the ground point slides down-light a fifth of the height
    const R = R_MAX * 0.85, sh = up / STUD, gx = 8.5 + 0.08 * sh, gz = 8.5 - 0.17 * sh, disc: [number, number][] = Array.from({ length: 12 }, (_, k) => [gx + Math.cos((k / 12) * Math.PI * 2) * R, gz + Math.sin((k / 12) * Math.PI * 2) * R * 0.9]);
    const shp: Part = { id: 0, color: "#000", kind: "prism", foot: disc, y0: 0, h: 0.1, studs: false, step: 0 };
    groundShadow(env, ctx, bc, [shp], 0.46 - 0.16 * ramp(up, 0, 1100));
  }
  CLOUDS.filter((c) => !c.front).forEach((c) => drawCloud(ctx, env, c, v, f));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const bars = ramp(f, T.ropes, T.ropes + 6);
  drawBars(ctx, bc, up, false, bars);
  BASKET.forEach((p, n) => { const L = BASKET_LAND[n]; if (f < L - FALL) return; const u = f >= L ? 1 : (f - (L - FALL)) / FALL, dy = (f >= L ? (f === L ? -0.5 : 0) : DROP * (1 - out3(u))) + up; ctx.globalAlpha = f >= L ? 1 : 0.35 + 0.65 * Math.min(1, u / 0.6); drawPart(ctx, bc, p, dy, HAIR * sc); ctx.globalAlpha = 1; });
  drawFlame(ctx, bc, up, f, ramp(f, T.fire, T.fire + 6) * (f < T.fire + 14 ? 0.6 + 0.4 * Math.sin((f - T.fire) * 1.3) ** 2 : 1));
  drawBars(ctx, bc, up, true, bars);
  for (let i = 0; i < COURSES; i++) {
    const L = T.env0 + i * T.envStep; if (f < L - FALL) break;
    const u = f >= L ? 1 : (f - (L - FALL)) / FALL, dy = f >= L ? (f === L ? -0.5 : 0) : DROP * (1 - out3(u));
    drawCourse(ctx, bc, i, up, dy, f >= L ? 1 : 0.35 + 0.65 * Math.min(1, u / 0.6), HAIR * sc);
  }
  CLOUDS.filter((c) => c.front).forEach((c) => drawCloud(ctx, env, c, v, f));
  // the mosaic's last tiles falling away over the build
  if (f < T.fallB) drawMosaic(ctx, env, f);
};

export const STYLE = { id: "brickBalloon", name: "Toy brick, from crayon, flying", family: "rendered", medium: "the crayon balloon turned into a toy-brick mosaic, rebuilt in moulded ABS bricks, then flown over a brick world", nearest: "toyBrick", hero: "the crayon hot-air balloon rebuilt in bricks, lifting off", sceneOf: "toyBrick" };

export const brickBalloon: Film = {
  // held: the crayon plate seen whole before the wave turns it to bricks (0-33), the finished mosaic
  // resting before it lets go (75-82), the built balloon standing complete before the burner lights (190-194)
  meta: { title: "Balloon · crayon to bricks, and away", W, H, fps: FPS, bpm: 90, durationFrames: N, raster: "cpu", kind: "story", holds: [[0, 34], [75, 83], [190, 195]] },
  assets: { images: {} },
  shots: [{ id: "flight", start: 0, end: N, draw: drawFrame }],
};

// THE HEAD THAT TURNS. cheetahDusk's face is a flat drawing; here it is wrapped onto a head (a ball,
// with the muzzle standing out of it) and that head is turned about its upright axis, so the camera
// can come round from the front to the side and it is the same face all the way: at yaw 0 it is the
// drawing, untouched; by 90 degrees one eye and one tear line are left, the nose is the profile's
// leading edge, and the back of the head has come round from behind, in the same coat.
// How: the face is drawn once into a layer and laid over a grid of small triangles. Each corner of the
// grid has a depth; turning moves it sideways by that depth; each triangle carries its piece of the
// drawing across with an affine map. Nothing is generated and nothing is sampled from a clock.
import { type Ctx, type Env, type Layer, type P } from "./core";
import { duskFace, FACE } from "./cheetahDusk";

const R = 372, SQ = 0.95, OVER = 1.25;                       // the head's radius in the drawing; its slight flattening; the layer's oversampling
const X0 = 60, X1 = 1020, Y0 = 150, Y1 = 1070, NX = 34, NY = 32;
type Part = "neck" | "coat" | "head";
const layer = (env: Env, f: number, part: Part): Layer => {
  const key = `cheetahTurn:${part}:${f}`; let L = env.cache.get(key) as Layer | undefined; if (L) return L;
  const k = env.scale * OVER; L = env.canvas(Math.round(1080 * k), Math.round(1080 * k)); env.cache.set(key, L);
  L.ctx.setTransform(k, 0, 0, k, 0, 0); duskFace(L.ctx, f, part); L.ctx.setTransform(1, 0, 0, 1, 0, 0);
  return L;
};
const ball = (x: number, y: number) => { const dx = x - FACE[0], dy = (y - FACE[1]) / SQ, r2 = dx * dx + dy * dy; return r2 < R * R ? Math.sqrt(R * R - r2) : 0; };
// the front of the head: the ball, and the muzzle pushed forward out of it below the eyes
const front = (x: number, y: number) => ball(x, y) + 150 * Math.exp(-((x - 540) ** 2 + (y - 735) ** 2) / (2 * 105 * 105));
const GRID = (() => { const g: { x: number; y: number; zf: number; zb: number; in: boolean }[] = []; for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { const x = X0 + ((X1 - X0) * i) / NX, y = Y0 + ((Y1 - Y0) * j) / NY, b = ball(x, y); g.push({ x, y, zf: front(x, y), zb: -b, in: b > 0 }); } return g; })();

/** The head, turned by `yaw` radians (0 faces us, positive brings the nose round to the right), its centre at (cx, cy) on screen, drawn at scale k. */
export const turnedHead = (c: Ctx, env: Env, f: number, yaw: number, cx: number, cy: number, k: number) => {
  const s = env.scale, cs = Math.cos(yaw), sn = Math.sin(yaw), head = layer(env, f, "head"), coat = layer(env, f, "coat");
  const put = (x: number, y: number, z: number): [number, number, number] => [cx + k * ((x - FACE[0]) * cs + z * sn), cy + k * (y - FACE[1]), -(x - FACE[0]) * sn + z * cs];
  const F = GRID.map((g) => put(g.x, g.y, g.zf)), B = yaw > 0.02 ? GRID.map((g) => put(g.x, g.y, g.zb)) : [];
  const tris: { img: Layer; a: number; b: number; c: number; v: [number, number, number][]; d: number }[] = [];
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const p = j * (NX + 1) + i, q = p + 1, r = p + NX + 1, t = r + 1;
    for (const [a, b, cc] of [[p, q, r], [q, t, r]] as const) {
      const area = (v: [number, number, number][]) => (v[b][0] - v[a][0]) * (v[cc][1] - v[a][1]) - (v[cc][0] - v[a][0]) * (v[b][1] - v[a][1]);
      if (area(F) > 0.02 * k * k) tris.push({ img: head, a, b, c: cc, v: F, d: F[a][2] + F[b][2] + F[cc][2] });                                 // facing us
      if (B.length && GRID[a].in && GRID[b].in && GRID[cc].in && area(B) < -0.02 * k * k) tris.push({ img: coat, a, b, c: cc, v: B, d: B[a][2] + B[b][2] + B[cc][2] }); // the back, come round
    }
  }
  tris.sort((m, n) => m.d - n.d);
  const o = OVER;
  for (const t of tris) {
    const s0 = GRID[t.a], s1 = GRID[t.b], s2 = GRID[t.c], d0 = t.v[t.a], d1 = t.v[t.b], d2 = t.v[t.c];
    const ax = s1.x - s0.x, ay = s1.y - s0.y, bx = s2.x - s0.x, by = s2.y - s0.y, det = ax * by - bx * ay; if (!det) continue;
    const ux = d1[0] - d0[0], uy = d1[1] - d0[1], vx = d2[0] - d0[0], vy = d2[1] - d0[1];
    const m11 = (ux * by - vx * ay) / det, m12 = (vx * ax - ux * bx) / det, m21 = (uy * by - vy * ay) / det, m22 = (vy * ax - uy * bx) / det;
    const tx = d0[0] - m11 * s0.x - m12 * s0.y, ty = d0[1] - m21 * s0.x - m22 * s0.y;
    // clip to the triangle, grown a hair so neighbours leave no seam, then lay the drawing through the map
    const gx = (d0[0] + d1[0] + d2[0]) / 3, gy = (d0[1] + d1[1] + d2[1]) / 3, grow = (p: [number, number, number]): P => { const dx = p[0] - gx, dy = p[1] - gy, l = Math.hypot(dx, dy) || 1; return [p[0] + (dx / l) * 0.8, p[1] + (dy / l) * 0.8]; };
    const e0 = grow(d0), e1 = grow(d1), e2 = grow(d2);
    c.save(); c.setTransform(s, 0, 0, s, 0, 0); c.beginPath(); c.moveTo(e0[0], e0[1]); c.lineTo(e1[0], e1[1]); c.lineTo(e2[0], e2[1]); c.closePath(); c.clip();
    c.setTransform(m11 / o, m21 / o, m12 / o, m22 / o, s * tx, s * ty); c.drawImage(t.img.canvas, 0, 0); c.restore();
  }
};

/** The chest under the face, as cheetahDusk has it: a flat front that narrows away as the camera comes round. */
export const turnedNeck = (c: Ctx, env: Env, f: number, yaw: number, cx: number, cy: number, k: number) => {
  const w = Math.cos(yaw) ** 2; if (w < 0.03) return;
  const s = env.scale, L = layer(env, f, "neck");
  c.save(); c.setTransform(s * k * w, 0, 0, s * k, s * (cx - FACE[0] * k * w), s * (cy - FACE[1] * k)); c.drawImage(L.canvas, 0, 0, 1080, 1080); c.restore();
};
/** The size the turned head must be drawn at to stand in for the profile head cheetahBody draws. */
export const HEAD_K = 0.118;

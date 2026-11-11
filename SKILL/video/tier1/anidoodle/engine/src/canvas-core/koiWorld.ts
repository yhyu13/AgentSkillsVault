// KOI WORLD. The marker-comic koi, swimming for real: it leaves the plate's pose, turns, picks up
// speed and travels through a pond much bigger than the frame while the camera follows. The pads,
// lilies, lit water, current streaks and drifting petals are placed in the WORLD, so the scenery
// changes as the fish moves; it slides under pads (they are drawn over it and throw their shadows
// on it); its wake rings spread from its nose.
//
// At t = 0 the world is framed exactly like the koi plate (the same pads, the same lit water, the
// fish in the plate's pose), so the launch film can hand over from the still card without a seam.
// World units are the plate's pixels, 1:1 (the fish's widths and fins are authored in pixels).
import { Gfx, PENCIL, rng, type Ctx, type Env, type P } from "./core";
import type { Film } from "./film";
import { blob, fillShape, mix, smooth } from "./gallery";
import { drawFish, inkP, koiBody, koiFins, lilyPad, ripples, SPINE_C, SPINE_HEADING, tail, waterLily, WATER, WATER_D, WATER_L, type KoiClock } from "./koi";

const ALL: KoiClock = () => 1;
const FPS = 30, DT = 1 / FPS;

// ---------------------------------------------------------------- the swim path
// Heading: the plate's koi faces up-left; it turns clockwise through 135 degrees in its first
// 1.8 s (clear of the plate's big lily pad), then weaves gently. Speed builds from rest over 1.2 s: a cruising koi, not a dart.
const CRUISE = 235; // world px per second
const headingAt = (t: number) => {
  const turn = (Math.PI * 135) / 180, u = Math.min(1, t / 1.8), e = u * u * (3 - 2 * u);
  return SPINE_HEADING + turn * e + (t > 2.5 ? 0.3 * Math.sin((2 * Math.PI * (t - 2.5)) / 3.4) * Math.min(1, (t - 2.5) / 1.5) : 0);
};
const speedAt = (t: number) => CRUISE * Math.min(1, (t / 1.2) ** 1.6);
let PATH: { p: P; h: number }[] | null = null;
const path = () => {
  if (PATH) return PATH;
  PATH = [{ p: SPINE_C, h: SPINE_HEADING }];
  for (let i = 1; i <= 30 * FPS; i++) { const t = i * DT, h = headingAt(t), v = speedAt(t), q = PATH[i - 1].p; PATH.push({ p: [q[0] + Math.cos(h) * v * DT, q[1] + Math.sin(h) * v * DT], h }); }
  return PATH;
};
export const fishAt = (t: number) => { const P = path(), f = Math.max(0, Math.min(P.length - 1.001, t * FPS)), i = Math.floor(f), a = P[i], b = P[i + 1], u = f - i; return { p: [a.p[0] + (b.p[0] - a.p[0]) * u, a.p[1] + (b.p[1] - a.p[1]) * u] as P, h: a.h + (b.h - a.h) * u }; };

// the camera: held on the plate's framing, then it eases into following the fish with a little
// lag and lead room ahead of it (the frame looks where the fish is going)
export const camAt = (t: number): P => {
  const f = fishAt(Math.max(0, t - 0.35)), lead = 170 * Math.min(1, t / 2), want: P = [f.p[0] + Math.cos(f.h) * lead, f.p[1] + Math.sin(f.h) * lead];
  const u = Math.min(1, Math.max(0, (t - 0.3) / 1.6)), e = u * u * (3 - 2 * u), home: P = [540, 540];
  return [home[0] + (want[0] - home[0]) * e, home[1] + (want[1] - home[1]) * e];
};

// ---------------------------------------------------------------- the pond, placed in the world
type Pad = { c: P; r: number; notch: number; seed: number; lily?: number };
const PLATE_PADS: Pad[] = [{ c: [905, 205], r: 168, notch: 2.3, seed: 3100, lily: 1.15 }, { c: [890, 905], r: 120, notch: 3.6, seed: 3300 }, { c: [120, 640], r: 88, notch: 0.2, seed: 3400 }];
let WORLD: { pads: Pad[]; lit: { c: P; rx: number; ry: number; seed: number; rot: number }[]; streaks: { p: P; l: number; a: number; w: number; seed: number }[]; petals: { p: P; seed: number }[] } | null = null;
const world = () => {
  if (WORLD) return WORLD;
  const r = rng(8123), P = path(), pads: Pad[] = [...PLATE_PADS], lit = [{ c: [560, 540] as P, rx: 610, ry: 470, seed: 401, rot: -0.75 }, { c: [520, 520] as P, rx: 400, ry: 290, seed: 402, rot: -0.9 }];
  const clear = (c: P, r0: number) => pads.every((q) => Math.hypot(q.c[0] - c[0], q.c[1] - c[1]) > q.r + r0 + 60);
  const lane = (c: P, r0: number) => P.every((q, j) => j % 6 !== 0 || Math.hypot(q.p[0] - c[0], q.p[1] - c[1]) > r0 + 230);
  for (let i = 45; i < P.length; i += 9) {
    const { p, h } = P[i];
    for (const side of [-1, 1]) {
      if (r() < 0.5) continue;
      const d = 330 + r() * 420, c: P = [p[0] - Math.sin(h) * d * side + (r() - 0.5) * 120, p[1] + Math.cos(h) * d * side + (r() - 0.5) * 120], rad = 70 + r() * 110;
      if (clear(c, rad) && lane(c, rad)) pads.push({ c, r: rad, notch: r() * Math.PI * 2, seed: 5000 + pads.length * 17, lily: r() < 0.3 ? 0.75 + r() * 0.35 : undefined });
    }
    // the one pad it swims under is the plate's own lily pad, early on; the lane stays clear after that
    if (i % 18 === 0) lit.push({ c: [p[0] + (r() - 0.5) * 700, p[1] + (r() - 0.5) * 700], rx: 420 + r() * 300, ry: 280 + r() * 200, seed: 600 + i, rot: -0.7 + (r() - 0.5) * 0.4 });
  }
  const streaks = Array.from({ length: 140 }, (_, i) => { const q = P[Math.floor(r() * (P.length - 1))].p; return { p: [q[0] + (r() - 0.5) * 1900, q[1] + (r() - 0.5) * 1300] as P, l: 70 + r() * 150, a: -0.42 + (r() - 0.5) * 0.12, w: 5 + r() * 5, seed: 500 + i }; });
  const petals = Array.from({ length: 40 }, (_, i) => { const q = P[Math.floor(r() * (P.length - 1))].p; return { p: [q[0] + (r() - 0.5) * 1700, q[1] + (r() - 0.5) * 1100] as P, seed: 9000 + i }; });
  return (WORLD = { pads, lit, streaks, petals });
};

// ---------------------------------------------------------------- drawing
export type KoiWorldView = { t: number; amp?: number };
export const drawKoiWorld = (ctx: Ctx, env: Env, v: KoiWorldView) => {
  const W = env.W, H = env.H, t = v.t, cam = camAt(t), V = (p: P): P => [p[0] - cam[0] + W / 2, p[1] - cam[1] + H / 2];
  const onScreen = (p: P, pad: number) => { const q = V(p); return q[0] > -pad && q[0] < W + pad && q[1] > -pad && q[1] < H + pad; };
  const g = new Gfx(ctx, env, 0, PENCIL), w = world(), flow = 9 * t; // the current carries the surface slowly down-right
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  // water: deep everywhere, the lit bodies of water where the sun gets in, the current's streaks
  g.group("plain", () => {
    const sq: P[] = [[-10, -10], [W + 10, -10], [W + 10, H + 10], [-10, H + 10]];
    fillShape(g, sq, WATER_D);
    w.lit.forEach((l, i) => { if (!onScreen(l.c, Math.max(l.rx, l.ry) + 60)) return; const c = V(l.c); fillShape(g, blob(c[0], c[1], l.rx, l.ry, l.seed, 0.1, 20, l.rot), i === 1 ? mix(WATER, WATER_L, 0.22) : WATER); });
    w.streaks.forEach((s) => {
      const p: P = [s.p[0] + flow, s.p[1] + flow * 0.45]; if (!onScreen(p, 240)) return;
      const q = V(p), ln = smooth([q, [q[0] + Math.cos(s.a) * s.l * 0.5, q[1] + Math.sin(s.a) * s.l * 0.5 + 3], [q[0] + Math.cos(s.a) * s.l, q[1] + Math.sin(s.a) * s.l]], false, 6);
      inkP(g, ln, WATER_L, { w: s.w, shadow: 0, taper: [0.4, 0.4], seed: s.seed }, 0.45, 1);
    });
  });
  // the fish, posed on the path, beating its tail faster as it cruises
  const f = fishAt(t), sp = speedAt(t) / CRUISE, amp = v.amp ?? 1;
  const turn = (fishAt(t + 0.1).h - fishAt(t - 0.1).h) / 0.2; // rad/s: the body bends into the turn
  const live = { t, amp: amp * (0.55 + 0.45 * sp), beat: 2 - 0.9 * sp, pose: { x: V(f.p)[0], y: V(f.p)[1], rot: f.h - SPINE_HEADING, k: 1, straight: 0.8 * sp * amp, bend: -Math.max(-1, Math.min(1, turn * 1.1)) * amp } };
  const b = koiBody(live), fins = koiFins(b, live), cau = tail(b);
  drawFish(g, ALL, b, fins, cau);
  const nose = b.at(0, 0);
  ripples(g, nose[0], nose[1], 2100, ALL, (t / 1.2) % 1, 0.8);
  // petals riding the current, turning slowly
  g.group("plain", () => w.petals.forEach((pt) => {
    const r = rng(pt.seed), p: P = [pt.p[0] + flow * (1.4 + r()), pt.p[1] + flow * 0.6 + 10 * Math.sin(t * 0.8 + pt.seed)]; if (!onScreen(p, 30)) return;
    const q = V(p), a = pt.seed * 0.7 + t * (0.4 + r() * 0.5) * (r() < 0.5 ? -1 : 1), s = 9 + r() * 5;
    const shape = blob(q[0], q[1], s * 1.25, s * 0.7, pt.seed, 0.08, 10, a);
    fillShape(g, shape, r() < 0.5 ? "#ffd3e0" : "#fff0f4"); inkP(g, shape, "#15122a", { w: 2, closed: true, shadow: 0, seed: pt.seed }, 0.9, 1);
  }));
  // pads over everything in the water: the fish slides under them; each rides the swell on its own phase
  w.pads.forEach((pd, i) => {
    if (!onScreen(pd.c, pd.r + 60)) return;
    const bob: P = [3 * Math.sin(t * 1.6 + i * 2.1), 4 * Math.sin(t * 1.6 + i * 2.1 + 1.2)], c = V([pd.c[0] + bob[0], pd.c[1] + bob[1]]);
    lilyPad(g, c[0], c[1], pd.r, pd.notch, pd.seed, ALL, "pad");
    if (pd.lily) waterLily(g, c[0] - pd.r * 0.15, c[1] - pd.r * 0.06, pd.lily, pd.seed + 100, ALL);
  });
  g.paper("paper", 0.05);
};

const film = (W: number, H: number, N: number, title: string): Film => ({
  meta: { title, W, H, fps: FPS, bpm: 90, durationFrames: N },
  assets: { images: {} },
  shots: [{ id: "swim", start: 0, end: N, draw: (ctx, fr, env) => drawKoiWorld(ctx, env, { t: fr / FPS, amp: Math.min(1, fr / 20) }) }],
});
export const koiWorld = film(1920, 1080, 300, "Koi · marker comic, swimming through the pond");
export const koiWorldSquare = film(1080, 1080, 300, "Koi · marker comic, swimming (square)");

// where the lily-flower pads are on screen at time t, for a camera move that dives into one
export const padsOnScreen = (t: number, W: number, H: number) => {
  const cam = camAt(t), w = world();
  return w.pads.map((pd, i) => { const bob: P = [3 * Math.sin(t * 1.6 + i * 2.1), 4 * Math.sin(t * 1.6 + i * 2.1 + 1.2)]; return { i, x: pd.c[0] + bob[0] - cam[0] + W / 2, y: pd.c[1] + bob[1] - cam[1] + H / 2, r: pd.r, lily: !!pd.lily }; });
};

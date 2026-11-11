import { Gfx, rng, type Ctx, type Env, type Layer, type P } from "./core";
import type { Film } from "./film";
import { clamp, lerp, lerpP, resample, smooth } from "./gallery";
import { drawShadows, drawThreads, knot, longShort, satin, splitStitch, stemStitch, straight, type St } from "./embroideryKit";
import { BEE, BS, BUTTER, C, EMB_M, G, GOLD, HEAD, OCHRE, PC, PETALS, POPPY, R, SILVER, add, bee, build, cached, daisy, disc, DWH, drawRun, faceOn, ground, hoop, lavender, onWreath, polar, rad, rot } from "./embroidery";

// THE WREATH, ALIVE · a seamless 8 s loop of the embroidery plate.
//
// Everything stays thread. Nothing here warps pixels: every frame the stitches themselves are
// re-posed (a stitch is two holes and a colour, so bending a stem means moving its holes along the
// bend) and drawn again with the plate's own thread renderer, so each one keeps its twist, its sheen
// toward the window at upper left, and its hair of shadow down and right.
//
// THE STORY OF THE LOOP (240 frames, 90 bpm: a beat is 20 frames):
//   0-36    the bee sits on the poppy, wings folded, one flick of the wings.
//   36-56   it lifts off the linen: its shadow slides away and softens as it rises.
//   36-206  it flies once round the wreath (up the left side past the daisy and the lavender, a
//           loop-the-loop in the gap at the top, down the right side past two more daisies, back
//           along the bottom). Behind it the needle sews its flight line in gold running stitch,
//           and the oldest stitches unpick themselves, so the line stays one length.
//           Every flower it passes nods in its wake (a damped swing about the stem's base, the stem
//           bending with it), daisy rays flutter, the lavender keeps a slow sway of its own.
//   206     it lands back on the poppy: the head dips under its weight and springs back, and a puff
//           of pollen pops out as French knots that rise, drift and unpick.
//   206-240 the rest of the line unpicks; the frame after 239 is frame 0.
// WINGS: straight stitches, re-stitched at two angles on twos (the embroiderer's motion blur), the
//   other angle ghosted in fainter thread.
// DEPTH: the bee's shadow is its own stitches' shadow, pushed further away and softened by height.

const W = 1080, H = 1080, N = 240, TAKE = 36, LAND = 206, UNPICKED = 236;

// ---------------------------------------------------------------- the moving flowers, as groups
type Group = { id: string; base: P; head: P; sts: St[]; flutter?: { c: P; r: number }; sway: number; phase: number };
const flowerStem = (deg: number, to: P, seed: number) => stemStitch([onWreath(deg), lerpP(onWreath(deg), to, 0.5), to], 8, 2.2, G.stem, seed);
const groups = (): Group[] => {
  const D1 = faceOn(polar(189, R + 20), 1.22), D2 = faceOn(polar(27, R + 16), 1.18, 0.52, -24), D3 = faceOn(polar(-21, R + 8), 0.92, 0.92, 8);
  const daisyGroup = (id: string, T: (p: P) => P, deg: number, stemSeed: number, rays: St[], d: St[], r1: number): Group => ({ id, base: onWreath(deg), head: T([0, 0]), sts: [...flowerStem(deg, T([0, 0]), stemSeed), ...rays, ...d], flutter: { c: T([0, 0]), r: r1 }, sway: 0, phase: deg * 0.05 });
  const poppy: St[] = [
    ...flowerStem(122, PC, 34), ...PETALS.flatMap((p) => splitStitch(p.arc, 5, 2, POPPY[3])), ...PETALS.flatMap((p, i) => longShort(p.arc, p.target, 4, 2.3, 2.2, POPPY, 300 + i)),
    ...satin([add(PC, [-9, 0]), PC, add(PC, [9, 0])], (t) => 8 * Math.sin(Math.PI * clamp(t * 0.85 + 0.08)), 2.1, 2, () => "#7d8f4b"),
    ...Array.from({ length: 8 }, (_, k) => straight(PC, add(PC, rot([7, 0], (k / 8) * Math.PI * 2)), 1.3, "#2d2723")),
    ...Array.from({ length: 16 }, (_, k) => knot(add(PC, rot([15 + (k % 2) * 3, 0], (k / 16) * Math.PI * 2 + 0.2)), 2.2, "#221d1a")),
  ];
  const lav = ([[167, 21], [233, 22], [63, 23], [8, 24]] as const).map(([deg, seed], i): Group => {
    const l = lavender(deg, seed), all = [...l.stem, ...l.spike], base = onWreath(deg);
    let head = base, far = 0; for (const s of all) for (const p of [s.a, s.b]) { const d = Math.hypot(p[0] - base[0], p[1] - base[1]); if (d > far) { far = d; head = p; } }
    return { id: `lav${i}`, base, head, sts: all, sway: 0.05, phase: i * 1.7 };
  });
  return [
    daisyGroup("d1", D1, 186, 30, daisy(D1, 19, 11, 48, 40), disc(D1, 11, 50), 48 * 1.22),
    daisyGroup("d2", D2, 30, 31, daisy(D2, 17, 11, 46, 41, 0.6), disc(D2, 11, 51), 46 * 1.18),
    daisyGroup("d3", D3, -16, 32, daisy(D3, 15, 9, 38, 42), disc(D3, 9, 52), 38 * 0.92),
    { id: "poppy", base: onWreath(122), head: PC, sts: poppy, sway: 0, phase: 2.2 },
    ...lav,
  ];
};
// the plate minus the bee, its flight line and everything that moves: stitched once into the linen
const key = (s: St) => `${s.k}|${s.a[0].toFixed(3)},${s.a[1].toFixed(3)}|${s.b[0].toFixed(3)},${s.b[1].toFixed(3)}|${s.w}|${s.c}`;
const staticStitches = (gs: Group[]): St[] => {
  const moving = new Map<string, number>(); for (const g of gs) for (const s of g.sts) moving.set(key(s), (moving.get(key(s)) ?? 0) + 1);
  const bees = new Set(["flight", "abdomen", "thorax", "head", "legs", "wings"]), out: St[] = [];
  for (const sec of build()) { if (bees.has(sec.id)) continue; for (const s of sec.sts) { const k = key(s), n = moving.get(k) ?? 0; if (n > 0) moving.set(k, n - 1); else out.push(s); } }
  const left = [...moving.values()].reduce((a, b) => a + b, 0); if (left) throw new Error(`embroideryAlive: ${left} moving stitches not found in the plate`); // a group that drifted from the plate would draw twice
  return out;
};

// ---------------------------------------------------------------- the flight
// the bee sits with its head on the poppy's seed pod, its body lying back across the petals
const REST_HEADING = rad(-118), SIZE = 0.82;
const PERCH: P = add(PC, [Math.cos(REST_HEADING) * -56, Math.sin(REST_HEADING) * -56]);
// the round: kept well inside the hoop (the bee is 120 px long), past every flower worth nodding
const FLIGHT: P[] = [PERCH, [352, 790], [306, 660], [288, 536], [318, 424], [378, 338], [448, 288], [502, 250], [560, 262], [568, 322], [522, 340], [494, 296], [542, 248], [630, 250], [718, 298], [780, 398], [800, 520], [782, 640], [720, 758], [640, 838], [548, 884], [470, 906], [428, 900], PERCH];
type Path = { pts: P[]; step: number; len: number };
const path = (): Path => { const sm = smooth(FLIGHT, false, 18); let len = 0; for (let i = 1; i < sm.length; i++) len += Math.hypot(sm[i][0] - sm[i - 1][0], sm[i][1] - sm[i - 1][1]); const n = Math.round(len / 1.5), pts = resample(sm, n); return { pts, step: len / (n - 1), len }; };
const at = (pa: Path, s: number): P => { const x = clamp(s / pa.step, 0, pa.pts.length - 1), i = Math.min(pa.pts.length - 2, Math.floor(x)); return lerpP(pa.pts[i], pa.pts[i + 1], x - i); };
const tangent = (pa: Path, s: number): number => { const a = at(pa, s - 9), b = at(pa, s + 9); return Math.atan2(b[1] - a[1], b[0] - a[0]); };
const ease = (t: number) => { const c = clamp(t); return c * c * (3 - 2 * c); };
// where along the line the bee is: still until take-off, a soft start, cruising, a soft landing
const RAMP = 16; // frames of speeding up and of slowing down: a trapezoid of speed, cruising between
const travel = (t: number) => { const T = LAND - TAKE, v = 1 / (T - RAMP), c = clamp(t, 0, T); return c < RAMP ? (0.5 * v * c * c) / RAMP : c > T - RAMP ? 1 - (0.5 * v * (T - c) ** 2) / RAMP : v * (c - RAMP / 2); };
const sAt = (pa: Path, f: number) => (f < TAKE ? 0 : f >= LAND ? pa.len : pa.len * travel(f - TAKE));
const height = (f: number) => 30 * ease((f - TAKE) / 20) * (1 - ease((f - (LAND - 16)) / 16)) + (f > TAKE && f < LAND ? 3 * Math.sin(((f - TAKE) / 20) * Math.PI) * ease((f - TAKE) / 20) * (1 - ease((f - (LAND - 16)) / 16)) : 0);
const perched = (f: number) => 1 - ease((f - TAKE) / 14) + ease((f - (LAND - 12)) / 12);   // 1 on the poppy, 0 in the air
const angDiff = (a: number, b: number) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

// a damped swing started at frame fp, periodic over the loop (it has died away long before it comes round)
const swing = (f: number, fp: number, tau = 18, period = 24) => { const d = (((f - fp) % N) + N) % N; return Math.exp(-d / tau) * Math.sin((d / period) * Math.PI * 2); };

type Plan = { pa: Path; gs: Group[]; pass: { fp: number; amp: number; sign: number }[]; bodyLocal: St[] };
const plan = (): Plan => {
  const pa = path(), gs = groups();
  const pass = gs.map((g) => {
    if (g.id === "poppy") return { fp: LAND, amp: 0, sign: 1 };
    let best = 1e9, fp = 0;
    for (let f = TAKE; f < LAND; f++) { const p = at(pa, sAt(pa, f)), d = Math.hypot(p[0] - g.head[0], p[1] - g.head[1]); if (d < best) { best = d; fp = f; } }
    const v = [Math.cos(tangent(pa, sAt(pa, fp))), Math.sin(tangent(pa, sAt(pa, fp)))], arm = [g.head[0] - g.base[0], g.head[1] - g.base[1]];
    return { fp, amp: 0.3 * Math.exp(-((best / 120) ** 2)) + 0.04, sign: Math.sign(arm[0] * v[1] - arm[1] * v[0]) || 1 };   // the draft pushes the head the way the bee flew
  });
  // the bee's body in its own frame (x toward the head, scaled as authored), wings made fresh per frame
  const b = bee(), bodyLocal = [...b.abdomen, ...b.thorax, ...b.head, ...b.legs].map((s) => ({ ...s, a: rot([s.a[0] - BEE[0], s.a[1] - BEE[1]], -HEAD), b: rot([s.b[0] - BEE[0], s.b[1] - BEE[1]], -HEAD) }));
  return { pa, gs, pass, bodyLocal };
};

// ---------------------------------------------------------------- posing
// bend a flower: each hole turns about the stem's base by the swing times how far up the stem it is
const bend = (g: Group, theta: number, dip: number, flutter: number, f: number) => (s: St): St => {
  const ax = g.head[0] - g.base[0], ay = g.head[1] - g.base[1], L2 = ax * ax + ay * ay;
  const mv = (p: P): P => {
    let q = p;
    if (g.flutter && flutter) { const dx = p[0] - g.flutter.c[0], dy = p[1] - g.flutter.c[1], r = Math.hypot(dx, dy); if (r > g.flutter.r * 0.22) { const a = Math.atan2(dy, dx), phi = flutter * Math.sin(a * 3 + f * 0.9) * clamp(r / g.flutter.r); q = add(g.flutter.c, rot([dx, dy], phi)); } }
    const u = clamp(((q[0] - g.base[0]) * ax + (q[1] - g.base[1]) * ay) / L2, 0, 1.3), k = Math.pow(u, 1.6), th = theta * k;
    q = add(g.base, rot([q[0] - g.base[0], q[1] - g.base[1]], th));
    if (dip && u > 0.8) { const hc = add(g.base, rot([ax, ay], theta)), sc = 1 - 0.06 * dip; q = [hc[0] + (q[0] - hc[0]) * sc + 3 * dip, hc[1] + (q[1] - hc[1]) * sc + 4 * dip]; }
    return q;
  };
  return { ...s, a: mv(s.a), b: s.k === "knot" ? mv(s.a) : mv(s.b) };
};

// the wings, re-stitched: forewing larger over the hindwing's leading edge, swept back by `back`
const WING_EDGE = "#a9b3ba";
const wings = (sweep: number, spread: number, col = 1): St[] => {
  const out: St[] = [];
  const wing = (s: number, len: number, wd: number, back: number, rootX: number) => {
    const root: P = [rootX * BS, s * 9 * BS], dir: P = [-Math.cos(rad(back)), s * Math.sin(rad(back))], nrm: P = [-dir[1] * s, dir[0] * s];
    const pt = (fq: number, gq: number): P => add(add(root, dir, len * BS * fq / 1.42), nrm, wd * spread * BS * gq / 1.42);
    const edge = smooth([pt(0, 0), pt(0.3, 0.55), pt(0.7, 0.62), pt(0.98, 0.25), pt(0.95, -0.15), pt(0.6, -0.32), pt(0.25, -0.22), pt(0, 0)], false, 6);
    const c = (x: string) => (col < 1 ? "#dde2e4" : x);
    out.push(...splitStitch(edge, 6, 1.5, c(WING_EDGE)));
    out.push(straight(pt(0.05, 0.05), pt(0.7, 0.3), 1.2, c(SILVER)), straight(pt(0.1, 0), pt(0.85, 0.02), 1.2, c(SILVER)), straight(pt(0.3, 0.15), pt(0.55, -0.2), 1.1, c(SILVER)));
    for (let k = 0; k < 7; k++) { const fq = 0.2 + k * 0.1, g0 = -0.25 + (k % 2) * 0.1; out.push(straight(pt(fq, g0), pt(fq + 0.12, 0.5 - (k % 3) * 0.08), 1.1, c(k % 2 ? "#eef1f2" : SILVER))); }
  };
  for (const s of [-1, 1]) { wing(s, 58, 26, 64 + sweep, 12); wing(s, 82, 34, 40 + sweep, 16); }
  return out;
};
const place = (sts: St[], pos: P, heading: number, sc: number): St[] => sts.map((s) => ({ ...s, a: add(pos, rot([s.a[0] * sc, s.a[1] * sc], heading)), b: add(pos, rot([s.b[0] * sc, s.b[1] * sc], heading)), w: s.k === "knot" ? s.w * sc : s.w * Math.sqrt(sc) }));

// ---------------------------------------------------------------- drawing helpers
// the needle, as the plate draws it (steel, a lit edge, the eye), with its gold thread running from
// the eye straight down into the newest stitch's hole, which is what a needle mid-sew looks like
const drawNeedle = (c: Ctx, tip: P, dir: P, thread: P[]) => {
  const back = add(tip, dir, -52), n: P = [-dir[1], dir[0]];
  c.save(); c.lineCap = "round";
  const th = smooth(thread, false, 8);
  c.globalAlpha = 0.3; c.strokeStyle = "#3b2c1c"; c.lineWidth = 2.6; c.beginPath(); th.forEach(([x, y], i) => (i ? c.lineTo(x + 2, y + 3) : c.moveTo(x + 2, y + 3))); c.stroke();
  c.globalAlpha = 1; c.strokeStyle = GOLD; c.lineWidth = 2.2; c.beginPath(); th.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
  c.globalAlpha = 0.35; c.strokeStyle = "#2b1d10"; c.lineWidth = 3; c.beginPath(); c.moveTo(back[0] + 5, back[1] + 7); c.lineTo(tip[0] + 5, tip[1] + 7); c.stroke();   // it rides a little off the cloth
  c.globalAlpha = 1; c.strokeStyle = "#8d949a"; c.lineWidth = 2.6; c.beginPath(); c.moveTo(back[0], back[1]); c.lineTo(tip[0], tip[1]); c.stroke();
  c.strokeStyle = "#f5f7f8"; c.lineWidth = 0.9; c.beginPath(); c.moveTo(back[0] + n[0] * 0.6, back[1] + n[1] * 0.6); c.lineTo(tip[0] + n[0] * 0.6, tip[1] + n[1] * 0.6); c.stroke();
  c.fillStyle = "#3b3f42"; c.beginPath(); c.ellipse(back[0] + dir[0] * 4, back[1] + dir[1] * 4, 2.6, 0.7, Math.atan2(dir[1], dir[0]), 0, Math.PI * 2); c.fill();
  c.restore();
};
const box = (sts: St[]) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const s of sts) { x0 = Math.min(x0, s.a[0], s.b[0]); y0 = Math.min(y0, s.a[1], s.b[1]); x1 = Math.max(x1, s.a[0], s.b[0]); y1 = Math.max(y1, s.a[1], s.b[1]); } return [x0, y0, x1, y1]; };
// stitches standing `h` off the cloth: their shadow further away and softer, the thread itself unchanged
const aloft = (g: Gfx, sts: St[], h: number, alpha = 1) => {
  if (!sts.length) return; const [x0, y0, x1, y1] = box(sts), o: P = [h * 0.55, h * 0.8];
  g.group("plain", () => { g.touch(x0 - 10, y0 - 10, x1 + 12, y1 + 12); drawShadows(g.cur, sts); }, { blur: 0.9 + h * 0.07, alpha: alpha * (1 - h * 0.011), off: o });
  g.group("plain", () => { g.touch(x0 - 6, y0 - 6, x1 + 6, y1 + 6); drawThreads(g.cur, sts); }, { alpha });
};
// the gold flight line: stitch holes fixed along the path (they never slide), shown between the
// unpicking tail and the needle; the newest stitch is still being pulled, the oldest being pulled out
const DASH = 10, GAP = 6;
const flightLine = (pa: Path, s0: number, s1: number): St[] => {
  const out: St[] = []; if (s1 - s0 < 0.5) return out;
  for (let k = Math.floor(s0 / (DASH + GAP)); k * (DASH + GAP) < s1; k++) { const a = Math.max(s0, k * (DASH + GAP)), b = Math.min(s1, k * (DASH + GAP) + DASH); if (b - a > 0.6) out.push({ k: "flat", a: at(pa, a), b: at(pa, b), w: 2.8, c: GOLD, t: 0.8 }); }
  return out;
};

export const drawEmbroideryAlive = (ctx: Ctx, fr: number, env: Env) => {
  const f = ((fr % N) + N) % N, pl = cached(env, "embA:plan", plan), [dw, dh] = DWH(env);
  const still = cached(env, `embA:static:${env.scale}:${env.W}x${env.H}`, (): Layer => { const L = env.canvas(dw, dh); L.ctx.setTransform(1, 0, 0, 1, 0, 0); L.ctx.drawImage(ground(env).canvas as CanvasImageSource, 0, 0); drawRun(L, env, staticStitches(pl.gs)); return L; });
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(still.canvas as CanvasImageSource, 0, 0);
  const me: Layer = { canvas: ctx.canvas as unknown as Layer["canvas"], ctx };

  // the flowers, each on its swing
  const land = swing(f, LAND, 16, 26), lift = swing(f, TAKE + 2, 14, 22);
  // a flower at rest is blitted from its own cached stitching; only the ones swinging are re-stitched
  const posed = pl.gs.flatMap((g, i) => {
    const p = pl.pass[i], amb = g.sway * Math.sin((f / N) * Math.PI * 2 * (i % 2 ? 2 : 1) + g.phase);
    let th: number, dip = 0, fl = 0;
    if (g.id === "poppy") { dip = Math.max(0, land) * 1.0 + Math.max(0, -lift) * 0.35; th = amb + 0.05 * land - 0.03 * lift; }
    else { th = amb + p.amp * p.sign * swing(f, p.fp - 3, 20, 26); fl = g.flutter ? 0.1 * Math.exp(-(((((f - p.fp) % N) + N) % N) / 16)) * p.amp * 5 : 0; }
    if (Math.abs(th) < 0.0015 && dip < 0.01 && fl < 0.001) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(cached(env, `embA:rest:${g.id}:${env.scale}:${env.W}x${env.H}`, () => { const L = env.canvas(dw, dh); drawRun(L, env, g.sts); return L; }).canvas as CanvasImageSource, 0, 0); return []; }
    return g.sts.map(bend(g, th, dip, fl, f));
  });
  drawRun(me, env, posed);

  // the flight line, then the pollen (on and just off the cloth)
  const sB = sAt(pl.pa, f), BACK = 152, head = f < TAKE ? 0 : f >= LAND ? pl.pa.len - BACK : Math.max(0, sB - BACK), LT = 360;
  const tail = f < TAKE ? 0 : f < LAND ? Math.max(0, head - LT) : lerp(Math.max(0, pl.pa.len - BACK - LT), pl.pa.len - BACK, ease((f - LAND) / (UNPICKED - LAND)));
  const g = new Gfx(ctx, env, 0, EMB_M);
  drawRun(me, env, flightLine(pl.pa, tail, f < TAKE ? 0 : head));
  const dP = (((f - LAND) % N) + N) % N;
  if (dP < 50) {
    const r = rng(612), pollen: St[] = [], rise = 26 * Math.sin(Math.PI * clamp(dP / 50));
    for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2 + r() * 0.35, dist = 8 + (40 + r() * 38) * (1 - Math.pow(1 - clamp(dP / 22), 3)), drift: P = [-dP * 0.3, -dP * 0.55], rad0 = (3 + r() * 1.6) * clamp(dP / 4) * (1 - ease((dP - 24 - r() * 10) / 16)); if (rad0 > 0.2) pollen.push(knot(add(add(PC, [Math.cos(a) * dist, Math.sin(a) * dist * 0.85]), drift), rad0, [BUTTER, OCHRE, "#f5d36a"][i % 3])); }
    aloft(g, pollen, rise);
  }

  // the needle, sewing just behind the bee; on the poppy it rests on the linen beside it
  const perch = clamp(perched(f)), sN = clamp(sB - 94, 0, pl.pa.len), rest: P = add(PERCH, [58, 30]), fly = at(pl.pa, sN);
  const tip = lerpP(fly, rest, perch), tn = tangent(pl.pa, sN), ang = tn + angDiff(tn, REST_HEADING + 0.35) * perch;
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  const nd: P = [Math.cos(ang), Math.sin(ang)], eye = add(tip, nd, -52), last = f >= TAKE && head > 0 ? at(pl.pa, head) : add(eye, [-14, 10]);
  drawNeedle(ctx, tip, nd, [eye, lerpP(eye, last, 0.5), last]);

  // the bee
  const h = height(f), hd0 = tangent(pl.pa, sB), heading = REST_HEADING + angDiff(REST_HEADING, hd0) * (1 - perch);
  const dipOff: P = [3 * Math.max(0, land) * perch, 4 * Math.max(0, land) * perch];
  const pos = add(at(pl.pa, sB), dipOff), sc = SIZE * (1 + h * 0.0045);
  const flying = h > 1.5, flick = (f >= 8 && f < 16) || (f >= 222 && f < 230), twos = Math.floor(f / 2) % 2;
  const up = flying || flick ? (twos ? { sweep: -26, spread: 0.55 } : { sweep: 10, spread: 1.05 }) : { sweep: 30, spread: 0.72 }, other = twos ? { sweep: 10, spread: 1.05 } : { sweep: -26, spread: 0.55 };
  const body = place(pl.bodyLocal, pos, heading, sc), wing = place(wings(up.sweep, up.spread), pos, heading, sc);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(hoop(env).canvas as CanvasImageSource, 0, 0);
  if (flying || flick) aloft(g, place(wings(other.sweep, other.spread, 0.5), pos, heading, sc), h + 2, 0.4);
  aloft(g, body, h); aloft(g, wing, h + 2);
  void C; void H; void W;
};

export const embroideryAlive: Film = {
  // held: the bee resting on the poppy (one wing flick) until it lifts at TAKE, and the last of the
  // gold line unpicking after it lands, into the seam. Both are the loop's breath, watched, not waits.
  meta: { title: "A wreath and a bee · embroidery, alive", W, H, fps: 30, bpm: 90, durationFrames: N, kind: "loop", holds: [[0, TAKE + 2], [220, N]] },
  assets: { images: {} },
  shots: [{ id: "alive", start: 0, end: N, draw: drawEmbroideryAlive }],
};

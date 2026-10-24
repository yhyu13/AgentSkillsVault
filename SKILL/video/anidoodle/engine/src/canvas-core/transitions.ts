// TRANSITIONS. Three seams every film used to hand-roll, as reusable calls: a brush wipe, an iris,
// and a flash on a cut. Each takes the two scenes as draw functions and a progress, at any frame
// size, and is a pure function of its arguments (the brush's bristles come from rng(seed), never
// from the clock). A gentle move stays the default seam (references/workflows/launch-video.md,
// Motion); which of these fits a seam, and when none does, is references/motion-grammar.md.
//
//   const p = seam(local, 120, 22);                         progress 0..1 over frames 120-142
//   brushWipe(ctx, env, p, drawA, drawB, { angle: -0.2, ink: "#1d1a16" });
//   iris(ctx, env, p, drawA, drawB, { center: [1400, 300] });       opens on B from a point
//   iris(ctx, env, p, drawA, drawB, { close: true });               closes on A, B is behind it
//   flashCut(ctx, env, local, 240, drawA, drawB);                   A until 240, B from 240
//   checkFlashes([240, 400], fps);                                  throws if they could strobe
//
// A scene is drawn in its own coordinates: it sets its transform itself, as every film's shots do.
// The incoming scene is already complete under the seam on every frame, so there is never an empty
// frame between two scenes. At p <= 0 only the outgoing scene is drawn, at p >= 1 only the incoming.
import { rng, type Ctx, type Env, type P } from "./core";
import { blot, clamp, inOut, lerp, pathOf, ramp, selfLayer } from "./launchKit";

export type Scene = (ctx: Ctx) => void;
/** Progress of a seam that starts at frame `at` and lasts `len` frames. */
export const seam = (local: number, at: number, len: number) => (len > 0 ? ramp(local, at, at + len) : local >= at ? 1 : 0);

// the incoming scene on its own full-frame surface, then set down through a clip in logical units
const through = (ctx: Ctx, env: Env, key: string, scene: Scene, clip: () => void, rim?: () => void) => {
  const L = selfLayer(env, `seam:${key}`, Math.round(env.W * env.scale), Math.round(env.H * env.scale));
  const lc = L.ctx as Ctx & { reset?: () => void }; // a clean context every frame: nothing a scene left behind may reach the next one
  if (typeof lc.reset === "function") lc.reset(); else { lc.globalAlpha = 1; lc.globalCompositeOperation = "source-over"; lc.setLineDash([]); lc.shadowBlur = 0; }
  scene(L.ctx);
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  ctx.save(); rim?.(); clip(); ctx.clip();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(L.canvas, 0, 0); ctx.restore();
};

// ---------------------------------------------------------------- brush wipe
// A loaded flat brush pulled across the frame. Two edges, both the brush's own: the incoming
// picture's edge, and ahead of it the front of the wet ink the brush carries (`ink`; leave it out
// for a clean edge). Each is a row of fine bristles of uneven width following a slow curve, each
// bristle a little ahead of or behind its neighbour. A few bristles are loaded and streak well
// ahead of the ink; a few drag, and leave a thread of ink over the new picture for a moment. The
// two edges have different profiles, so the ink between them is thick here and thin there, as a
// stroke is. The bristles splay in the middle of the stroke and close up where it starts and lands.
export type WipeOpts = {
  angle?: number;    // direction of travel in radians: 0 left to right, PI/2 top to bottom
  seed?: number;
  bristles?: number; // how many across the stroke (default 96)
  ragged?: number;   // how far the bristle tips vary, in logical px (default 5% of the frame's diagonal)
  stray?: number;    // share of bristles that streak ahead (ink) or drag behind (picture) (default 0.1)
  ink?: string; band?: number; // the wet ink's colour and its mean width (default 1.1 x ragged)
  ease?: (t: number) => number;
};
const STRAY = 2.4; // a stray bristle runs up to this many times `ragged` from the edge
const smooth = (t: number) => t * t * (3 - 2 * t);
/** One edge of the stroke as the polygon of everything behind it, in logical px (pure): the incoming picture's, or the ink's. */
export const wipeFront = (p: number, W: number, H: number, o: WipeOpts = {}, edge: "picture" | "ink" = "picture"): P[] => {
  const a = o.angle ?? 0, dx = Math.cos(a), dy = Math.sin(a), n = Math.max(1, Math.round(o.bristles ?? 96)), rag = o.ragged ?? Math.hypot(W, H) * 0.05, band = o.ink ? o.band ?? rag * 1.1 : 0, ink = edge === "ink";
  const cs: P[] = [[0, 0], [W, 0], [W, H], [0, H]], S = cs.map(([x, y]) => x * dx + y * dy), T = cs.map(([x, y]) => -x * dy + y * dx);
  const s0 = Math.min(...S), s1 = Math.max(...S), t0 = Math.min(...T) - 4, t1 = Math.max(...T) + 4, back = s0 - 8;
  const e = clamp((o.ease ?? smooth)(clamp(p))), splay = 0.4 + 0.6 * Math.sin(Math.PI * e), base = lerp(s0 - band - rag * (0.4 * (1 + STRAY) + 0.1), s1 + rag * STRAY, e);
  const r = rng((o.seed ?? 31) + (ink ? 101 : 0)), ph = [r() * 6.28, r() * 6.28, r() * 6.28], stray = o.stray ?? 0.1;
  // bristle widths and reaches, fixed for the whole stroke: the profile of one brush
  const br = Array.from({ length: n }, (_, i) => {
    const u = i / n, body = clamp(0.5 + 0.3 * Math.sin(u * 5.1 + ph[0]) + 0.16 * Math.sin(u * 13.7 + ph[1]) + 0.07 * Math.sin(u * 41 + ph[2]) + (r() - 0.5) * 0.16), st = r() < stray, far = 0.5 + r() * (STRAY - 0.5);
    return { w: st ? 0.35 + r() * 0.3 : 0.6 + r() * 0.8, reach: st ? (ink ? body + far : body - far) : body };
  });
  const tot = br.reduce((s, b) => s + b.w, 0), at = (s: number, t: number): P => [s * dx - t * dy, s * dy + t * dx];
  const pts: P[] = [at(back, t0)];
  let t = t0;
  for (const b of br) { const w = (b.w / tot) * (t1 - t0), f = Math.max(back, base + b.reach * rag * splay + (ink ? band : 0)); pts.push(at(f, t), at(f, t + w)); t += w; } // square-ended: bristle marks
  pts.push(at(back, t1));
  return pts;
};
export const brushWipe = (ctx: Ctx, env: Env, p: number, from: Scene, to: Scene, o: WipeOpts = {}) => {
  if (p >= 1) { to(ctx); return; }
  from(ctx);
  if (!(p > 0)) return; // before the seam, or not a number: the outgoing scene, whole
  const W = env.W, H = env.H;
  through(ctx, env, "wipe", to, () => pathOf(ctx, wipeFront(p, W, H, o)), o.ink ? () => { pathOf(ctx, wipeFront(p, W, H, o, "ink")); ctx.fillStyle = o.ink!; ctx.fill(); } : undefined);
};

// ---------------------------------------------------------------- iris
// A round opening that grows from a point until the incoming scene fills the frame, or (`close`)
// shrinks to a point on the outgoing one. Open it from the thing the next scene is about, close it
// on the thing this scene was about: an iris centred on nothing is only a shape. "blot" gives the
// ink bloom's wobbling rim instead of a clean circle; `rim` is the edge's width in `ink`.
export type IrisOpts = { center?: P; close?: boolean; shape?: "circle" | "blot"; rim?: number; ink?: string; seed?: number; ease?: (t: number) => number };
/** The opening's radius in logical px (pure): 0 at p = 0, past the farthest corner at p = 1 (the reverse with `close`). */
export const irisRadius = (p: number, W: number, H: number, o: IrisOpts = {}) => {
  const [cx, cy] = o.center ?? [W / 2, H / 2], far = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));
  const e = clamp((o.ease ?? inOut)(clamp(p))), full = (far + (o.rim ?? 0) + 2) / (o.shape === "blot" ? 0.86 : 1); // a blot's rim dips to 0.9 R
  return full * (o.close ? 1 - e : e);
};
/** The ink rim's width at an opening of radius R (pure): it grows with the opening, so it never appears or vanishes in one frame. */
export const irisRim = (R: number, o: IrisOpts = {}) => (o.rim ?? (o.shape === "blot" ? 22 : 0)) * clamp(R / 70);
export const iris = (ctx: Ctx, env: Env, p: number, from: Scene, to: Scene, o: IrisOpts = {}) => {
  if (p >= 1) { to(ctx); return; }
  if (!(p > 0)) { from(ctx); return; }
  const W = env.W, H = env.H, c: P = o.center ?? [W / 2, H / 2], R = irisRadius(p, W, H, o), rim = irisRim(R, o);
  const edge = (r: number) => { if (o.shape === "blot") pathOf(ctx, blot(c, Math.max(0, r), o.seed ?? 88)); else { ctx.beginPath(); ctx.arc(c[0], c[1], Math.max(0, r), 0, Math.PI * 2); } };
  // opening: B grows inside the hole over A. closing: A shrinks inside the hole over B.
  const [outer, inner] = o.close ? [to, from] : [from, to];
  outer(ctx);
  if (R < 1) return;
  through(ctx, env, "iris", inner, () => edge(R - (rim > 0 ? 3 : 0)), rim > 0 ? () => { edge(R + rim); ctx.fillStyle = o.ink ?? "#1d1a16"; ctx.fill(); } : undefined);
};

// ---------------------------------------------------------------- flash
// A cut hidden under a burst of light: the frame lifts toward `color` over `inF` frames, the scene
// changes on the brightest frame, and the light falls away over `outF`. It is a hard cut, so the
// hard cut's conditions apply (a strong beat, in a piece whose energy asks for it), and it is the
// one seam here that can hurt: a flash is never a single frame, never full white by default, and
// never repeated quickly: two flashes are at least half a second apart, which also keeps a film
// well under three a second. checkFlashes holds a film to that.
export type FlashOpts = { color?: string; peak?: number; inF?: number; outF?: number };
const FLASH = { color: "#fff8ea", peak: 0.86, inF: 2, outF: 9 };
/** The light's opacity at a frame (pure): `peak` on the cut frame, 0 outside [cut - inF, cut + outF). */
export const flashAlpha = (local: number, cut: number, o: FlashOpts = {}) => {
  const peak = o.peak ?? FLASH.peak, inF = o.inF ?? FLASH.inF, outF = o.outF ?? FLASH.outF;
  if (inF < 1 || outF < 3) throw new Error(`flash: inF ${inF}, outF ${outF}: the light must rise over at least 1 frame and fall over at least 3 (a one-frame flash is a fault, not a transition)`);
  if (local <= cut - inF - 1 || local >= cut + outF) return 0;
  const k = local < cut ? (local - (cut - inF - 1)) / (inF + 1) : Math.pow(1 - (local - cut) / outF, 2);
  return clamp(peak) * clamp(k);
};
/** The light alone, over whatever is already drawn (when the film switches the scene itself). */
export const flash = (ctx: Ctx, env: Env, local: number, cut: number, o: FlashOpts = {}) => {
  const a = flashAlpha(local, cut, o); if (a <= 0) return;
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = a; ctx.fillStyle = o.color ?? FLASH.color; ctx.fillRect(0, 0, env.W, env.H); ctx.globalAlpha = 1;
};
export const flashCut = (ctx: Ctx, env: Env, local: number, cut: number, from: Scene, to: Scene, o: FlashOpts = {}) => { (local < cut ? from : to)(ctx); flash(ctx, env, local, cut, o); };
/** Throws when a film's flashes could strobe: any two closer than half a second. */
export const checkFlashes = (cuts: number[], fps: number) => {
  const c = [...cuts].sort((a, b) => a - b);
  for (let i = 1; i < c.length; i++) if (c[i] - c[i - 1] < fps / 2) throw new Error(`flash: frames ${c[i - 1]} and ${c[i]} are ${((c[i] - c[i - 1]) / fps).toFixed(2)} s apart: leave at least half a second between flashes`);
  return cuts;
};

// THE CAMERA. One dolly over depth planes, keyed on the frame grid. A film either draws in world
// coordinates inside begin()/end() (the transform path, dirty boxes stay right), or asks
// toScreen() where a world point lands and draws there (the projector path). Both come from the
// same state, so a caption pinned to the frame and the world it floats over can never disagree.
//
// CRAFT, and why the numbers work this way:
// - THE `zoom` KEY IS A DOLLY, THE `lens` KEY IS A ZOOM. `zoom` sets how close the camera stands
//   (distance D = 1/zoom), so moving it changes parallax: near planes grow faster than far ones.
//   `lens` is the focal length, a factor on every plane at once about the frame's centre: a true
//   lens zoom magnifies without changing the depth relationships at all. Moving both against each
//   other is the dolly zoom (dollyZoom below): the hero plane holds its size while depth stretches.
// - DOLLY AND LENS ARE INTERPOLATED IN log2. Each is a ratio: halving the apparent size twice should take
//   twice as long as halving it once. Easing the zoom value itself makes a long push-in sprint at
//   the near end and crawl at the far one; easing log2(zoom) spends time evenly per stop.
// - EASING PER SEGMENT, ease-in-out by default. A camera move with no live operator should
//   accelerate gently and arrive gently; linear reads as mechanical, ease-out alone reads as
//   interrupted. The ease lives on the key the segment LEAVES.
// - PARALLAX IS ONE NUMBER. The camera sits at distance D = 1/zoom from the hero plane (z = 0);
//   a plane at depth z scales by 1/(D + z) and moves with it. Near planes swing wide, far
//   ones barely stir, and every element at a depth agrees with every other, because there is only
//   one camera. Positive z recedes; a negative z crosses the lens (grass across the glass).
// - A CLOSE SHOT MUST NOT FATTEN THE LINE. Ink is authored at some view; at zoom S the same nib
//   reads S times heavier, so stroke widths divide by weight(S) = S^0.35 (not S: a little weight
//   gain is what makes a close-up feel close rather than enlarged).
// - SHAKE IS DECAYING NOISE, NEVER RANDOM PER FRAME. An impact rings down: full amplitude at the
//   hit, gone a beat later, smooth in between. White noise per frame reads as static, not as a
//   camera; low-frequency gradient noise with an attack ramp and a squared decay reads as mass.
//   The shake is given in SCREEN pixels so it reads the same at any zoom, plus a small rotation
//   about the frame's centre, which is what actually sells handheld.
import { fractal, Gfx, P } from "./core";

// look: world point at the frame's centre; zoom: the dolly, screen px per world unit on the hero plane
// at lens 1; lens: the focal length as a factor, scaling every plane equally (1 when no key sets it;
// once one does, frames before the first lens key hold that key's value, so key lens: 1 where it starts)
export type Cam = { look: P; zoom: number; lens?: number };
export type EaseName = "linear" | "in" | "out" | "inout";
export const EASE: Record<EaseName, (u: number) => number> = {
  linear: (u) => u,
  in: (u) => u * u * u,
  out: (u) => 1 - Math.pow(1 - u, 3),
  inout: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2), // easeInOutCubic: the camera default
};
export type CamKey = { f: number; look?: P; zoom?: number; lens?: number; ease?: EaseName }; // ease governs the segment this key LEAVES
export type Shake = { from: number; to: number; amp: number; seed: number; freq?: number; rot?: number; attack?: number };

// Monotone cubic (Fritsch-Carlson): a smooth path through every key that never overshoots into a
// value it was not given and never reverses. With log2 set, the values are read and returned in
// stops: log2 in, linear out. Use it for a zoom path with several keys, where per-segment easing
// would breathe at every key.
export const monoPath = (keys: readonly (readonly [number, number])[], opts: { log2?: boolean } = {}): ((x: number) => number) => {
  const xs = keys.map((k) => k[0]), ys = keys.map((k) => (opts.log2 ? Math.log2(k[1]) : k[1])), n = xs.length;
  if (n === 0) throw new Error("monoPath needs at least one key");
  for (let i = 1; i < n; i++) if (xs[i] <= xs[i - 1]) throw new Error(`monoPath keys must increase: ${xs[i - 1]} then ${xs[i]}`);
  const mono = (x: number): number => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    const d: number[] = []; for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    const m: number[] = [d[0]]; for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2); m.push(d[n - 2]);
    for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; } }
    let i = 0; while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return ys[i] * (2 * t3 - 3 * t2 + 1) + h * m[i] * (t3 - 2 * t2 + t) + ys[i + 1] * (-2 * t3 + 3 * t2) + h * m[i + 1] * (t3 - t2);
  };
  return opts.log2 ? (x) => Math.pow(2, mono(x)) : mono;
};

const clampF = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ---- explicit-state helpers, for films that hold their own Cam per frame. The Camera class
// below delegates to these; there is one math, whether the film keys the camera or computes it.
// The dolly model: camera distance D = 1/zoom from the hero plane (z = 0); a plane at depth z
// scales by lens/(D + z) and moves with it. Positive z recedes; negative z crosses the lens.
// The lens multiplies every plane by the same factor, so it never changes parallax; the dolly does.
export const planeScale = (c: Cam, z = 0): number => (c.lens ?? 1) / (1 / c.zoom + z);
// how many screen px one world unit on the hero plane covers: the dolly times the lens
export const heroScale = (c: Cam): number => planeScale(c, 0);
export const projectCam = (centre: P, c: Cam, z: number, p: P, rot = 0): P => {
  const k = planeScale(c, z), co = Math.cos(rot), si = Math.sin(rot), dx = p[0] - c.look[0], dy = p[1] - c.look[1];
  return [centre[0] + k * (co * dx - si * dy), centre[1] + k * (si * dx + co * dy)];
};
export const unprojectCam = (centre: P, c: Cam, z: number, s: P, rot = 0): P => {
  const k = planeScale(c, z), co = Math.cos(rot), si = Math.sin(rot), dx = (s[0] - centre[0]) / k, dy = (s[1] - centre[1]) / k;
  return [c.look[0] + co * dx + si * dy, c.look[1] - si * dx + co * dy];
};
// ink authored at some view reads its screen scale times heavier at a close one (dolly or lens);
// divide stroke widths by this. 0.35, not 1: a little weight gain is what makes a close-up feel
// close, not enlarged.
export const strokeWeight = (c: Cam, exp = 0.35): number => Math.pow(heroScale(c), exp);

// THE DOLLY ZOOM. Wrap any camera path (keys via cam.at, or your own function): the dolly moves as
// authored and the lens is solved on every frame so the hero plane keeps one screen scale. Dolly in
// and the background falls away behind a subject who does not change size; dolly out and it looms.
// hold: the hero-plane scale to keep, or { at } to keep the scale the path has at that frame.
export const dollyZoom = (path: (f: number) => Cam, opts: { hold?: number; at?: number } = {}): ((f: number) => Cam) => {
  const hold = opts.hold ?? heroScale(path(opts.at ?? 0)); // the path's own lens counts here; after this the lens is solved
  if (!(hold > 0) || !Number.isFinite(hold)) throw new Error(`dollyZoom: the scale to hold must be a positive number (got ${hold})`);
  return (f) => { const c = path(f); if (!(c.zoom > 0 && Number.isFinite(c.zoom))) throw new Error(`dollyZoom: zoom must be positive (got ${c.zoom} at frame ${f})`); return { look: c.look, zoom: c.zoom, lens: hold / c.zoom }; };
};

export class Camera {
  private shakes: Shake[] = [];
  private keys: CamKey[];
  private path?: (f: number) => Cam;
  private monoZoom: boolean;
  private zoomPath?: (f: number) => number; // the monotone zoom path, built once from the keys (they never change)
  // centre: the frame's centre in logical px (usually [W/2, H/2]); every projection goes through it
  constructor(readonly centre: P, keys: CamKey[] = [], opts: { monoZoom?: boolean; path?: (f: number) => Cam } = {}) {
    this.keys = [...keys]; // authored order, strictly increasing: a camera path is a cue table
    this.path = opts.path;
    this.monoZoom = opts.monoZoom ?? false;
    if (!this.path && this.keys.length === 0) throw new Error("camera needs keys or a path");
    let last = -1;
    for (const k of this.keys) {
      if (!Number.isInteger(k.f) || k.f < 0) throw new Error(`camera key at non-integral or negative frame ${k.f}`);
      if (k.f <= last) throw new Error(`camera keys must increase: ${last} then ${k.f}`);
      if (k.zoom !== undefined && !(k.zoom > 0 && Number.isFinite(k.zoom))) throw new Error(`camera zoom must be positive, got ${k.zoom} at frame ${k.f}`);
      if (k.lens !== undefined && !(k.lens > 0 && Number.isFinite(k.lens))) throw new Error(`camera lens must be a positive number, got ${k.lens} at frame ${k.f}`);
      last = k.f;
    }
  }

  // one channel of the keys, eased per segment. Missing values hold the nearest given one, so a
  // key may set only look, only zoom or only lens.
  private channel(f: number, get: (k: CamKey) => number | undefined, log2: boolean, mono = log2): number {
    const ks = this.keys.map((k, i) => ({ k, v: get(k), i })).filter((e) => e.v !== undefined) as { k: CamKey; v: number; i: number }[];
    if (!ks.length) throw new Error("camera keys never set this channel");
    if (mono && this.monoZoom && ks.length > 1) return (this.zoomPath ??= monoPath(ks.map((e) => [e.k.f, e.v] as const), { log2: true }))(f);
    if (f <= ks[0].k.f) return ks[0].v;
    if (f >= ks[ks.length - 1].k.f) return ks[ks.length - 1].v;
    let i = 0; while (f >= ks[i + 1].k.f) i++;
    const [a, b] = [ks[i], ks[i + 1]], u = (f - a.k.f) / (b.k.f - a.k.f), e = EASE[a.k.ease ?? "inout"](clampF(u, 0, 1));
    if (log2) return Math.pow(2, Math.log2(a.v) + (Math.log2(b.v) - Math.log2(a.v)) * e);
    return a.v + (b.v - a.v) * e;
  }

  // the clean move at frame f, before shake. Pure. A camera whose keys never set lens returns no
  // lens (it is 1); one that sets it anywhere eases it in log2 like the dolly, per segment.
  at(f: number): Cam {
    if (this.path) return this.path(f);
    const c: Cam = { look: [this.channel(f, (k) => k.look?.[0], false), this.channel(f, (k) => k.look?.[1], false)], zoom: this.channel(f, (k) => k.zoom, true) };
    if (this.keys.some((k) => k.lens !== undefined)) c.lens = this.channel(f, (k) => k.lens, true, false);
    return c;
  }

  // register an impact or a handheld stretch. amp in SCREEN px; rot in radians at full strength.
  shake(s: Shake): this {
    if (!(s.to > s.from)) throw new Error(`shake window must have length: ${s.from}..${s.to}`);
    if (s.amp < 0) throw new Error("shake amp must be >= 0");
    this.shakes.push(s);
    return this;
  }

  // screen-space shake at f: [dx, dy] px and dr radians about the frame's centre. Pure.
  shakeAt(f: number): [number, number, number] {
    let dx = 0, dy = 0, dr = 0;
    for (const s of this.shakes) {
      if (f < s.from || f >= s.to) continue;
      const u = (f - s.from) / (s.to - s.from), ramp = clampF((f - s.from + 1) / (s.attack ?? 2), 0, 1), fall = (1 - u) * (1 - u);
      const amp = s.amp * ramp * fall, fq = s.freq ?? 0.35;
      dx += amp * (fractal(s.seed, f * fq, 0, 1, 1, 2) * 2 - 1);
      dy += amp * (fractal(s.seed + 101, f * fq, 0, 1, 1, 2) * 2 - 1);
      dr += (s.rot ?? 0) * ramp * fall * (fractal(s.seed + 211, f * fq, 0, 1, 1, 2) * 2 - 1);
    }
    return [dx, dy, dr];
  }

  // the move the audience sees: the clean path with its shake folded in. A screen-space nudge of
  // [dx, dy] is the camera's look point stepping BACK by that much, in world units.
  shaken(f: number): Cam & { rot: number } {
    const c = this.at(f), [dx, dy, dr] = this.shakeAt(f), k = heroScale(c);
    const out: Cam & { rot: number } = { look: [c.look[0] - dx / k, c.look[1] - dy / k], zoom: c.zoom, rot: dr };
    if (c.lens !== undefined) out.lens = c.lens;
    return out;
  }

  // plane scale at depth z for a camera state: the hero plane (z = 0) scales by zoom x lens exactly.
  scaleAt(c: Cam, z = 0): number { return planeScale(c, z); }

  // stroke-weight compensation for a close shot (see strokeWeight above)
  weight(c: Cam, exp = 0.35): number { return strokeWeight(c, exp); }

  // ---- the transform path: draw in world coordinates inside begin/end. Dirty boxes stay right
  // because the camera rides the Gfx transform stack instead of touching the context.
  begin(g: Gfx, f: number, z = 0) {
    const c = this.shaken(f), k = this.scaleAt(c, z), co = Math.cos(c.rot), si = Math.sin(c.rot);
    g.push(this.centre[0] - k * (co * c.look[0] - si * c.look[1]), this.centre[1] - k * (si * c.look[0] + co * c.look[1]), k, c.rot);
  }
  end(g: Gfx) { g.pop(); }

  // ---- the projector path: ask where a world point lands, draw there yourself
  toScreen(p: P, f: number, z = 0): P { const c = this.shaken(f); return projectCam(this.centre, c, z, p, c.rot); }
  toWorld(s: P, f: number, z = 0): P { const c = this.shaken(f); return unprojectCam(this.centre, c, z, s, c.rot); }
}

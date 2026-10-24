// SEAMS WITH NUMBERS. A cut between two moving shots reads as one move when the motion carries
// across it: the outgoing shot accelerates, the cut lands at its fastest frame, and the incoming
// shot opens already travelling the same way at the same speed, then comes to rest. This file is
// the arithmetic for that, and the checks that hold a film to it. It draws nothing: the numbers
// go into each scene's own camera (camera.ts), so nothing is ever slid across an empty frame.
// Which seam a story is asking for, and when none of these is, is references/motion-grammar.md.
//
//   const m = matchedMove({ dir: 0, exitDist: 260, exitF: 12, entryF: 40 });
//   sceneA camera look = restA + m.out(local, CUT)      accelerates away over its last 12 frames, the last being CUT - 1
//   sceneB camera look = restB + m.in(local, CUT)       arrives over the 40 frames from CUT, at rest on restB
//   const z = matchedZoom({ push: 1.2, exitF: 6, entryF: 15 });
//   sceneA zoom = zoomA * z.out(local, CUT); sceneB zoom = zoomB * z.in(local, CUT);   a flight through the cut
//   checkSeam(velocityAt(lookA, CUT - 1), velocityAt(lookB, CUT + 1), { W, fps })      findings, empty when it holds
//   checkSeamPlan([{ type: "iris" }, { type: "matched cut" }, ...])                    a seam used a third time
//
// The incoming shot owns the cut frame, as everywhere in the engine: the outgoing shot's last
// frame on screen is CUT - 1, and that frame is its fastest. The step a viewer sees into CUT - 1 and
// the step they see out of CUT are the same size.
// Everything is a pure function of its arguments. Distances are in the units of the thing they
// are added to (world units for a camera's look), speeds in those units per frame.
import type { P } from "./core";
import { clamp, ramp } from "./launchKit";

export type Ease = (t: number) => number;
/** Slow start, fastest at the end: the curve of a move that leaves. */
export const easeIn: Ease = (t) => { const c = clamp(t); return c * c * c; };
/** Fastest at the start, zero slope at the end: the curve of a move that arrives. Its mirror image. */
export const easeOut: Ease = (t) => 1 - easeIn(1 - t);

/** Speed on the last frame of a move of `dist` over `frames` (its fastest, on easeIn). */
export const exitSpeed = (dist: number, frames: number, ease: Ease = easeIn) => dist * (ease(1) - ease(1 - 1 / frames));
/** How far an arriving move over `frames` must travel to start at `speed` per frame. */
export const entryDistance = (speed: number, frames: number, ease: Ease = easeOut) => speed / (ease(1 / frames) - ease(0));

export type MatchedMove = {
  speed: number;      // per frame, on both sides of the cut
  entryDist: number;  // how far out the incoming shot starts
  /** What to add to the outgoing camera's look: 0 until the exit begins, `exitDist` along `dir` on its last frame, `cut - 1`. */
  out: (local: number, cut: number) => P;
  /** What to add to the incoming camera's look: `entryDist` short of rest at the cut, 0 from `entryF` frames after it. */
  in: (local: number, cut: number) => P;
};
/** A cut hidden in travel. `dir` is the direction of travel in radians (0 is +x); the two sides share it and the speed. */
export const matchedMove = (o: { dir?: number; exitDist: number; exitF: number; entryF: number }): MatchedMove => {
  if (!(o.exitF >= 2) || !(o.entryF >= 2) || !Number.isFinite(o.exitF) || !Number.isFinite(o.entryF)) throw new Error(`matchedMove: an exit and an entry need at least 2 frames each (got ${o.exitF} and ${o.entryF})`);
  if (!Number.isFinite(o.exitDist) || !Number.isFinite(o.dir ?? 0)) throw new Error(`matchedMove: exitDist and dir must be numbers (got ${o.exitDist} and ${o.dir})`);
  const ux = Math.cos(o.dir ?? 0), uy = Math.sin(o.dir ?? 0), speed = exitSpeed(o.exitDist, o.exitF), entryDist = entryDistance(speed, o.entryF);
  return {
    speed, entryDist,
    out: (local, cut) => { const d = o.exitDist * easeIn(ramp(local, cut - 1 - o.exitF, cut - 1)); return [ux * d, uy * d]; },
    in: (local, cut) => { const d = -entryDist * (1 - easeOut(ramp(local, cut, cut + o.entryF))); return [ux * d, uy * d]; },
  };
};

/** The smallest an incoming shot may open at, as a share of its resting size. */
export const MIN_ZOOM_FROM = 0.4;
export type MatchedZoom = {
  rate: number;  // change of log(zoom) per frame, on both sides of the cut
  from: number;  // the scale the incoming shot opens at, relative to its rest
  /** Multiply the outgoing camera's zoom by this: 1 until the exit begins, `push` on its last frame, `cut - 1`. */
  out: (local: number, cut: number) => number;
  /** Multiply the incoming camera's zoom by this: `from` at the cut, 1 from `entryF` frames after it. */
  in: (local: number, cut: number) => number;
};
/** A flight through the cut: the outgoing shot is pushed into, the incoming one opens already growing at the same rate. A zoom is a ratio, so both run in log space. */
export const matchedZoom = (o: { push?: number; exitF: number; entryF: number }): MatchedZoom => {
  const push = o.push ?? 1.2;
  if (!(push > 1)) throw new Error(`matchedZoom: push is how far the camera goes in, above 1 (got ${push})`);
  if (!(o.exitF >= 2) || !(o.entryF >= 2) || !Number.isFinite(o.exitF) || !Number.isFinite(o.entryF)) throw new Error(`matchedZoom: an exit and an entry need at least 2 frames each (got ${o.exitF} and ${o.entryF})`);
  const lp = Math.log(push), rate = exitSpeed(lp, o.exitF), lf = -entryDistance(rate, o.entryF);
  // the incoming shot opens small and has to be painted that much wider than the frame: under 0.4 no scene is
  if (!(Math.exp(lf) >= MIN_ZOOM_FROM)) throw new Error(`matchedZoom: the incoming shot would open at ${Math.exp(lf).toFixed(2)} of its size (the least is ${MIN_ZOOM_FROM}): push less, lengthen the exit or shorten the entry`);
  return {
    rate, from: Math.exp(lf),
    out: (local, cut) => Math.exp(lp * easeIn(ramp(local, cut - 1 - o.exitF, cut - 1))),
    in: (local, cut) => Math.exp(lf * (1 - easeOut(ramp(local, cut, cut + o.entryF)))),
  };
};

/** Per-frame velocity of anything that moves, at frame f: where it is, less where it was. */
export const velocityAt = (pos: (f: number) => P, f: number): P => { const a = pos(f - 1), b = pos(f); return [b[0] - a[0], b[1] - a[1]]; };
/** The fastest an element should cross the frame, in screen px per frame: two and a half frame widths a second. Past it blur stops reading as motion and shows as a streak with stepped copies. */
export const speedCeiling = (W: number, fps: number) => (2.5 * W) / fps;

export type SeamFinding = { level: "warn" | "error"; msg: string; fix: string };
/**
 * Does motion carry across a cut? `a` is the screen velocity of the outgoing shot's last step on screen
 * (into frame cut - 1), `b` of the incoming shot's first (out of frame cut), in screen px per frame.
 * Empty when the seam holds. A turn of more than 30 degrees counts as a turn.
 */
export const checkSeam = (a: P, b: P, o: { W: number; fps: number; rest?: number }): SeamFinding[] => {
  if (![...a, ...b, o.W, o.fps].every(Number.isFinite) || !(o.W > 0) || !(o.fps > 0)) throw new Error(`checkSeam: velocities, W and fps must be numbers, W and fps above 0 (got [${a}], [${b}], W ${o.W}, fps ${o.fps})`);
  const out: SeamFinding[] = [], va = Math.hypot(a[0], a[1]), vb = Math.hypot(b[0], b[1]), rest = o.rest ?? 0.5, top = speedCeiling(o.W, o.fps), r1 = (v: number) => v.toFixed(1);
  if (va <= rest && vb <= rest) return out; // both at rest: a plain cut, judged by what it matches, not by this
  if (va <= rest || vb <= rest) out.push({ level: "error", msg: `one side of the cut is at rest and the other is moving (${r1(va)} then ${r1(vb)} px a frame): it reads as a jerk`, fix: "bring both sides to rest, or open the incoming shot at the outgoing speed (matchedMove)" });
  else {
    if ((a[0] * b[0] + a[1] * b[1]) / (va * vb) < Math.cos(Math.PI / 6)) out.push({ level: "error", msg: "the direction of travel turns at the cut", fix: "keep one screen direction across the seam" });
    const ratio = vb / va;
    if (ratio < 0.7 || ratio > 1.4) out.push({ level: "warn", msg: `the speed ${ratio < 1 ? "drops" : "jumps"} at the cut (${r1(va)} then ${r1(vb)} px a frame)`, fix: "size the entry with entryDistance(exit speed, entry frames)" });
  }
  if (Math.max(va, vb) > top) out.push({ level: "warn", msg: `${r1(Math.max(va, vb))} px a frame is past what blur can carry at this size (about ${r1(top)})`, fix: "shorten the travel and hide the rest behind the cut, or make it a cut on the beat" });
  return out;
};

/** The seams a film plans, in order. `cut` is a plain or matched cut; `signature` marks the film's own move. */
export type PlannedSeam = { type: string; cut?: boolean; signature?: boolean };
/** A designed seam used a third time has turned into a preset. Cuts are exempt; the signature move gets three (open, middle, close). */
export const checkSeamPlan = (plan: PlannedSeam[]): SeamFinding[] => {
  const out: SeamFinding[] = [], n = new Map<string, { count: number; sig: boolean }>();
  for (const s of plan) { if (s.cut) continue; const type = s.type.trim().toLowerCase(), e = n.get(type) ?? { count: 0, sig: false }; e.count++; e.sig ||= !!s.signature; n.set(type, e); }
  const sigs = [...n].filter(([, e]) => e.sig);
  if (sigs.length > 1) out.push({ level: "warn", msg: `${sigs.length} signature moves (${sigs.map(([t]) => t).join(", ")})`, fix: "a film has one move that is its own" });
  for (const [type, e] of n) { const max = e.sig ? 3 : 2; if (e.count > max) out.push({ level: "warn", msg: `"${type}" is used ${e.count} times`, fix: e.sig ? "the signature move belongs at the open, the middle and the close" : "use it for the two seams that matter most and give the others a seam of their own" }); }
  return out;
};

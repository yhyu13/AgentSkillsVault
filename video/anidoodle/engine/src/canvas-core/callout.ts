// CALLOUT. A label that names one thing in the picture, and can carry the viewer into the next
// scene: a dot lands on the thing, a leader line is drawn out from it, the label is written at the
// end of the line. The thing may move (the anchor is asked for every frame, so pin it to the world
// with camera.ts: `anchor: (f) => cam.toScreen(worldPoint, f, z)`); the label stays put so it can
// be read. Screen coordinates in logical px, any frame size. Pure functions of their arguments.
//
// It is type over the picture, so that judgement applies (references/workflows/launch-video.md,
// Type): the label sits on a calm area, names the thing it points at, and one or two are on screen
// at a time. Where the picture under it is not calm, give it a `backing`, or do not use a callout.
//
//   const c: Callout = { text: "LIVE PREVIEW", anchor: (f) => cam.toScreen([820, 410], f), label: { p: [1180, 300], size: 44 }, t0: 60, out: 150 };
//   drawCallout(ctx, env, c, f);
//
// THE HANDOFF. Instead of leaving, the label can travel to where the next scene starts and become
// its heading: `handoff: { leave, at, pose }`. From `leave` the dot and line retract while the
// label moves and resizes; on frame `at`, the next scene's first frame, it sits exactly on `pose`,
// and from there the next scene draws it itself with drawLabel at that pose. checkHandoff holds the
// two sides to within 2 px, the motif's rule (motif.ts), and throws if the seam jumps.
import type { Ctx, Env, P } from "./core";
import { clamp, inOut, lerp, out3, ramp, rr } from "./launchKit";
import { measure, setType, setWidth, writeOn, type KStyle } from "./kinetic";
import { checkRelay } from "./motif";

/** Where a label sits: `p` is the left end of its baseline, `size` its cap height (drawn) or font px (clean). */
export type LabelPose = { p: P; size: number };
export type Callout = {
  text: string;
  anchor: (f: number) => P; // the thing named, on screen, at frame f
  label: LabelPose;
  t0: number;               // the frame the dot lands; the line and the label follow
  out?: number;             // the frame it starts to leave (the label is taken back, the line retracts); omit to stay
  handoff?: { leave: number; at: number; pose: LabelPose; arc?: number }; // see THE HANDOFF; `arc` lifts the path (px, up)
  register?: "drawn" | "clean"; // drawn: written in ink with a hand's curved line. clean: set type, an elbow line, an underline
  style?: KStyle; color?: string; accent?: string;
  backing?: string;         // a chip of this colour behind the label, for a picture that is not calm there
  dot?: number;             // the dot's radius (default 0.16 x size)
};
// frames after t0: the dot lands, the line is drawn, the label is written; and how long leaving takes
export const CALLOUT_T = { dot: [0, 7], line: [4, 17], text: [11, 30], leave: 12 } as const;
/** The frame a callout is fully on screen and readable. */
export const calloutReady = (c: Callout) => c.t0 + CALLOUT_T.text[1];

const widthOf = (ctx: Ctx, c: Pick<Callout, "text" | "register">, size: number) => (c.register === "clean" ? setWidth(ctx, c.text, size) : measure(c.text, size, { weight: 1.15 }));
/** The label's pose at frame f (pure): its own until a handoff leaves, then on the way, then the destination on `at`. Null before t0. */
export const calloutPose = (c: Callout, f: number): LabelPose | null => {
  if (f < c.t0) return null;
  const h = c.handoff; if (!h || f <= h.leave) return c.label;
  const u = ramp(f, h.leave, h.at), e = inOut(u), a = c.label, b = h.pose;
  return { p: [lerp(a.p[0], b.p[0], e), lerp(a.p[1], b.p[1], e) - Math.sin(Math.PI * u) * (h.arc ?? 0)], size: a.size > 0 && b.size > 0 ? a.size * Math.pow(b.size / a.size, e) : lerp(a.size, b.size, e) }; // size eased as a ratio
};
/** The label alone, at a pose: what the next scene calls from the handoff frame on, so both sides draw the same marks. */
export const drawLabel = (ctx: Ctx, env: Env, c: Pick<Callout, "text" | "register" | "style" | "color" | "backing">, pose: LabelPose, p = 1, chip = true) => {
  if (chip && c.backing) { ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); const s = pose.size, w = widthOf(ctx, c, s), pad = s * 0.38; ctx.fillStyle = c.backing; rr(ctx, pose.p[0] - pad, pose.p[1] - s * 1.02 - pad * 0.5, w + pad * 2, s * 1.42 + pad, s * 0.22); ctx.fill(); } // the chip travels with the label
  if (c.register === "clean") setType(ctx, env, c.text, pose.p[0], pose.p[1], pose.size, p, { color: c.color ?? "#111214" });
  else writeOn(ctx, env, c.text, pose.p[0], pose.p[1], pose.size, p, c.style ?? "ink", { color: c.color ?? "#1b1510", seed: 7, weight: 1.15, pop: 0.7 });
};
/** Throws unless the callout's label lands on the next scene's heading within `tol` px (position and size). */
export const checkHandoff = (c: Callout, into: LabelPose, tol = 2) => {
  const h = c.handoff; if (!h) throw new Error(`callout "${c.text}": no handoff to check`);
  if (h.at - h.leave < CALLOUT_T.leave || h.leave < calloutReady(c)) throw new Error(`callout "${c.text}": the handoff leaves at ${h.leave} and lands at ${h.at}; it must leave after the label is readable (frame ${calloutReady(c)}) and take at least ${CALLOUT_T.leave} frames, the time the dot and line need to retract`);
  const out = calloutPose(c, h.at)!;
  return checkRelay([{ frame: h.at, label: `callout "${c.text}"`, out: { p: out.p, r: out.size }, into: { p: into.p, r: into.size } }], tol);
};

// the first `u` of a polyline, by length
const partial = (pts: P[], u: number): P[] => {
  const L = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1])), tot = L.reduce((a, b) => a + b, 0);
  let left = tot * clamp(u); const out: P[] = [pts[0]];
  for (let i = 0; i < L.length && left > 0; i++) { const k = Math.min(1, left / (L[i] || 1)); out.push([lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]); left -= L[i]; }
  return out;
};
/** The leader line from the thing to the label (pure), in screen px: an elbow and an underline (clean), or one bowed stroke (drawn). */
export const leaderPath = (anchor: P, pose: LabelPose, width: number, register: "drawn" | "clean" = "drawn", dot = pose.size * 0.16, side?: boolean): P[] => {
  const [x0, y] = pose.p, s = pose.size, right = side ?? anchor[0] <= x0 + width / 2; // the label is to the right of the thing (`side` pins it)
  if (register === "clean") {
    const uy = y + s * 0.34, near: P = [right ? x0 - s * 0.1 : x0 + width + s * 0.1, uy], far: P = [right ? x0 + width + s * 0.1 : x0 - s * 0.1, uy];
    const d = Math.hypot(near[0] - anchor[0], near[1] - anchor[1]) || 1, a: P = [anchor[0] + ((near[0] - anchor[0]) / d) * dot * 2, anchor[1] + ((near[1] - anchor[1]) / d) * dot * 2];
    return [a, near, far];
  }
  const e: P = [right ? x0 - s * 0.35 : x0 + width + s * 0.35, y - s * 0.42], d = Math.hypot(e[0] - anchor[0], e[1] - anchor[1]) || 1;
  const a: P = [anchor[0] + ((e[0] - anchor[0]) / d) * dot * 2.2, anchor[1] + ((e[1] - anchor[1]) / d) * dot * 2.2];
  const bow = Math.min(d * 0.18, s * 1.6) * (right ? 1 : -1), m: P = [(a[0] + e[0]) / 2 + ((e[1] - a[1]) / d) * bow, (a[1] + e[1]) / 2 - ((e[0] - a[0]) / d) * bow];
  return Array.from({ length: 25 }, (_, i): P => { const t = i / 24; return [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * m[0] + t * t * e[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * m[1] + t * t * e[1]]; });
};

export const drawCallout = (ctx: Ctx, env: Env, c: Callout, f: number) => {
  const h = c.handoff, T = CALLOUT_T;
  if (f < c.t0 || (h && f >= h.at)) return; // from `at` on, the next scene owns the label
  const pose = calloutPose(c, f)!, clean = c.register === "clean", accent = c.accent ?? "#d4622b", L = f - c.t0;
  // leaving: everything is taken back in the reverse of the order it was made; on a handoff only the dot and line go
  const gone = h ? ramp(f, h.leave, h.leave + T.leave) : c.out === undefined ? 0 : ramp(f, c.out, c.out + T.leave);
  const pd = ramp(L, T.dot[0], T.dot[1]), pl = out3(ramp(L, T.line[0], T.line[1])) * (1 - inOut(gone)), pt = h ? ramp(L, T.text[0], T.text[1]) : ramp(L, T.text[0], T.text[1]) * (1 - inOut(clamp(gone * 1.4)));
  ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  const w = widthOf(ctx, c, pose.size), s = pose.size, A = c.anchor(f), dotR = c.dot ?? c.label.size * 0.16;
  const right = A[0] <= c.label.p[0] + widthOf(ctx, c, c.label.size) / 2; // which side the line leaves from is the settled label's, so it cannot flip while the label travels
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.globalAlpha = 1;
  if (c.backing && pt > 0) { // a chip that grows from the line's side as the label is written
    const pad = s * 0.38, bw = (w + pad * 2) * out3(pt);
    ctx.fillStyle = c.backing; rr(ctx, right ? pose.p[0] - pad : pose.p[0] + w + pad - bw, pose.p[1] - s * 1.02 - pad * 0.5, bw, s * 1.42 + pad, s * 0.22); ctx.fill();
  }
  if (pl > 0) {
    const pts = partial(leaderPath(A, pose, w, clean ? "clean" : "drawn", dotR, right), pl);
    ctx.strokeStyle = accent; ctx.lineWidth = clean ? Math.max(2, s * 0.05) : s * 0.06;
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  }
  const r = dotR * (out3(pd) + 0.3 * Math.sin(Math.PI * pd) * (1 - pd)) * (1 - inOut(gone)); // lands with a small overshoot
  if (r > 0.2) {
    if (clean) { ctx.strokeStyle = accent; ctx.lineWidth = Math.max(2, s * 0.05); ctx.beginPath(); ctx.arc(A[0], A[1], r * 1.5, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(A[0], A[1], r * 0.55, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(A[0], A[1], r, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
  if (pt > 0) drawLabel(ctx, env, c, pose, pt, false);
};

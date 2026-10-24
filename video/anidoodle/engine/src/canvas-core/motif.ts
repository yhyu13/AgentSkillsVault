// MOTIF. One object that carries the viewer across the film's seams: a match cut is designed, not
// a transition laid over a join. The rule (references/workflows/launch-video.md, "The motif"):
//   pick ONE object the story already owns (the ink drop, the product's dot), and at every seam it
//   crosses, its screen position and size on the last frame of the outgoing shot equal those on the
//   first frame of the incoming one; the incoming scene opens FROM it (the bloom's centre).
// A seam is checked, never assumed: seamGap measures it and checkRelay throws past 2 px.
//
//   const path = relay([{ at: 400, p: [960, 700], r: 30 }, { at: 414, p: [610, 400], r: 18 }]);  // cut frames
//   path(407)            -> { p, r } between the keys (null outside them): draw the object there
//   checkRelay([{ frame: 414, out: poseOfA(414), into: poseOfB(414) }])
import type { P } from "./core";
import { inOut, lerp } from "./launchKit";

export type MotifPose = { p: P; r: number };
export type MotifKey = MotifPose & { at: number; arc?: number };
/** A continuous path through keyed poses (cut frames), eased key to key; `arc` lifts the path between two keys (px, up). */
export const relay = (keys: MotifKey[], ease = inOut) => (F: number): MotifPose | null => {
  if (!keys.length || F < keys[0].at || F > keys[keys.length - 1].at) return null;
  let i = 0; while (i < keys.length - 2 && F > keys[i + 1].at) i++;
  const a = keys[i], b = keys[i + 1] ?? a, u = b.at === a.at ? 1 : (F - a.at) / (b.at - a.at), e = ease(u);
  return { p: [lerp(a.p[0], b.p[0], e), lerp(a.p[1], b.p[1], e) - Math.sin(Math.PI * u) * (b.arc ?? 0)], r: lerp(a.r, b.r, e) };
};
/** How far apart the two sides of a seam put the object: position (px) and size (px of radius). */
export const seamGap = (out: MotifPose, into: MotifPose) => ({ dp: Math.hypot(out.p[0] - into.p[0], out.p[1] - into.p[1]), dr: Math.abs(out.r - into.r) });
export type Seam = { frame: number; label?: string; out: MotifPose; into: MotifPose };
/** Every seam matched within `tol` px, or an error naming the seam and the gap. Returns the gaps. */
export const checkRelay = (seams: Seam[], tol = 2) => {
  const gaps = seams.map((s) => ({ ...s, ...seamGap(s.out, s.into) }));
  const bad = gaps.filter((g) => g.dp > tol || g.dr > tol);
  if (bad.length) throw new Error(`motif: ${bad.map((g) => `seam ${g.label ?? ""} at frame ${g.frame} jumps ${g.dp.toFixed(1)} px (size ${g.dr.toFixed(1)} px)`).join("; ")}; the object must sit in the same place on both sides of a match cut`);
  return gaps;
};

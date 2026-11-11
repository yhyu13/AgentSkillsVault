// THE CHEETAH'S SKELETON. A rig is a set of angles; fk() turns it into the points cheetahBody draws.
// Bones never change length, so a leg swings in arcs and folds at its joints, it never stretches.
// Angles are in degrees, absolute, y down: 0 points forward (the animal faces right), 90 down, 180 back.
// The gallop is the rotary gallop of the reference: two flight phases a stride, the spine folding
// (gathered, hind feet reaching past the fore) and opening (extended), the forelegs landing one
// after the other, then the hind legs. The head is held level at its own height whatever the body does.
import type { P } from "./core";
import type { Pose } from "./cheetahBody";

type Leg = [number, number, number, number];
export type Rig = {
  pitch: number; lumb: number; thor: number;   // the body's tilt (nose down is positive); how far the loin and the chest fold
  headH: number; head: number;                 // the head's height above the ground; its own angle (nose down is positive)
  fore: Leg; foreF: Leg;                       // scapula, upper arm, forearm, hand
  hind: Leg; hindF: Leg;                       // thigh, shank, metatarsus, toes
  tail: number[];                              // its five segments
};

const D = Math.PI / 180, clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const step = (p: P, deg: number, len: number): P => [p[0] + Math.cos(deg * D) * len, p[1] + Math.sin(deg * D) * len];
const off = (p: P, deg: number, x: number, y: number): P => { const c = Math.cos(deg * D), s = Math.sin(deg * D); return [p[0] + x * c - y * s, p[1] + x * s + y * c]; };
export const FORE_BONES = [54, 98, 103, 60], HIND_BONES = [102, 105, 79, 34], TAIL_BONES = [65, 66, 66, 59, 43];
const REAR = [65.1, 75.3, 43.3], FRONT = [65.3, 70, 60.3], NECK = 138; // spine segments out from the waist; the neck's chord
const chain = (p: P, dirs: number[], bones: number[]): P[] => { const out: P[] = [p]; dirs.forEach((d, i) => out.push(step(out[i], d, bones[i]))); return out; };

/** The points, with the waist at (x, y) and the ground at `ground`. */
export const fk = (r: Rig, x: number, y: number, ground: number): Pose => {
  const waist: P = [x, y], p = r.pitch;
  const fwd = [p + 5 + r.thor * 0.3, p + 2 + r.thor * 0.7, p - 5 + r.thor], back = [p + 3.5 - r.lumb * 0.3, p + 5 - r.lumb * 0.75, p + 7 - r.lumb * 1.1];
  const ribs = step(waist, fwd[0], FRONT[0]), chest = step(ribs, fwd[1], FRONT[1]), shoulder = step(chest, fwd[2], FRONT[2]);
  const loin = step(waist, back[0] + 180, REAR[0]), hip = step(loin, back[1] + 180, REAR[1]), rump = step(hip, back[2] + 180, REAR[2]);
  // the neck reaches whatever is left between the shoulders and a head that keeps its own height
  const dy = clamp(ground - r.headH - shoulder[1], -NECK * 0.82, NECK * 0.82), dx = Math.sqrt(NECK * NECK - dy * dy), join: P = [shoulder[0] + dx, shoulder[1] + dy];
  const nx = dy / NECK, ny = -dx / NECK, bow = (t: number, b: number): P => [lerp(shoulder[0], join[0], t) + nx * b, lerp(shoulder[1], join[1], t) + ny * b];
  return {
    spine: [rump, hip, loin, waist, ribs, chest, shoulder, bow(0.38, 7), bow(0.73, 5), join],
    tail: chain(off(rump, back[2], 4, -14), r.tail, TAIL_BONES),
    foreN: chain(off(shoulder, fwd[2], -10, -24), r.fore, FORE_BONES), foreF: chain(off(shoulder, fwd[2], -2, -20), r.foreF, FORE_BONES),
    hindN: chain(off(hip, back[1], 7, 15), r.hind, HIND_BONES), hindF: chain(off(hip, back[1], 15, 17), r.hindF, HIND_BONES),
    head: r.head * D,
  };
};

const low = (leg: P[]) => Math.max(leg[3][1], leg[4][1]) + 5;   // a foot's sole: the lower of its ball and its toes, plus the pad
export const lowest = (q: Pose) => ({ fore: Math.max(low(q.foreN), low(q.foreF)), hind: Math.max(low(q.hindN), low(q.hindF)) });
const blend = (a: number[], b: number[], t: number) => a.map((v, i) => lerp(v, b[i], t));
export const mixRig = (a: Rig, b: Rig, t: number): Rig => ({
  pitch: lerp(a.pitch, b.pitch, t), lumb: lerp(a.lumb, b.lumb, t), thor: lerp(a.thor, b.thor, t), headH: lerp(a.headH, b.headH, t), head: lerp(a.head, b.head, t),
  fore: blend(a.fore, b.fore, t) as Leg, foreF: blend(a.foreF, b.foreF, t) as Leg, hind: blend(a.hind, b.hind, t) as Leg, hindF: blend(a.hindF, b.hindF, t) as Leg, tail: blend(a.tail, b.tail, t),
});

/** A standing pose settles onto the ground: the body tilts until fore and hind feet both bear, and its height follows. */
export const settle = (r: Rig): { rig: Rig; y: number } => {
  let rig = r;
  for (let k = 0; k < 8; k++) { const q = fk(rig, 0, 0, 0), l = lowest(q); rig = { ...rig, pitch: rig.pitch + (Math.atan2(l.hind - l.fore, q.foreN[4][0] - q.hindN[4][0]) / D) * 0.9 }; }
  const l = lowest(fk(rig, 0, 0, 0)); return { rig, y: -Math.max(l.fore, l.hind) };
};

// ---------------------------------------------------------------- the held poses
export const STAND: Rig = { pitch: 0, lumb: 0, thor: 0, headH: 356, head: 6, fore: [80, 118, 88, 68], foreF: [76, 108, 92, 72], hind: [58, 128, 86, 18], hindF: [66, 134, 90, 20], tail: [118, 100, 98, 122, 160] }; // the tail at rest: down behind the hocks, its tip turned up
// the bow: forelegs walked out flat along the ground, chest down between them, the rump left high, the back hollow
export const BOW: Rig = { pitch: 0, lumb: -22, thor: -12, headH: 150, head: -14, fore: [52, 38, 8, 2], foreF: [50, 44, 12, 4], hind: [78, 112, 88, 14], hindF: [84, 118, 92, 16], tail: [250, 262, 285, 318, 350] };
// the crouch before the start: weight back over folded hind legs, the chest low, the head stretched forward
export const CROUCH: Rig = { pitch: 0, lumb: 16, thor: 6, headH: 196, head: 10, fore: [88, 150, 62, 50], foreF: [84, 142, 68, 54], hind: [36, 142, 72, 12], hindF: [44, 148, 78, 14], tail: [176, 170, 176, 190, 204] };
// the stop: forelegs braced out ahead, the rump dropped under, the tail thrown up for balance
export const SKID: Rig = { pitch: 0, lumb: 20, thor: 2, headH: 262, head: -4, fore: [62, 62, 56, 30], foreF: [60, 70, 62, 34], hind: [30, 138, 66, 10], hindF: [40, 146, 74, 12], tail: [228, 246, 262, 280, 300] };

// ---------------------------------------------------------------- the gallop
// One stride. Keys: 0 extended flight · .14 the forefeet reach the ground · .27 over the forelegs ·
// .40 they push off · .52 gathered flight · .66 the hind feet land ahead · .80 over the hind legs · .92 they drive off.
const T = [0, 0.14, 0.27, 0.4, 0.52, 0.66, 0.8, 0.92];
const FORE = [[70, 23, 15, 15], [78, 55, 50, 35], [92, 118, 78, 45], [105, 140, 125, 140], [105, 135, 172, 225], [95, 110, 150, 215], [82, 60, 95, 150], [72, 28, 30, 50]];
const HIND = [[141, 187, 164, 159], [128, 185, 150, 150], [100, 170, 125, 135], [60, 176, 122, 122], [22, 146, 56, 30], [40, 128, 58, 8], [88, 140, 85, 10], [122, 168, 135, 100]];
//            lumb thor pitch tail  height of the waist in flight
const BODY = [[-12, -4, 0, 188, 262], [-8, -1, 3, 180, 266], [6, 5, 4, 176, 286], [36, 13, 2, 190, 292], [64, 22, 0, 212, 300], [54, 17, -3, 218, 296], [20, 5, -4, 204, 288], [-6, -3, -2, 194, 272]];
const TAIL_CURL = [0, -10, 4, 20, 34];
const cyc = (V: number[][], ph: number): number[] => {
  const n = T.length, f = ((ph % 1) + 1) % 1; let i = n - 1; for (let k = 0; k < n; k++) if (f >= T[k]) i = k;
  const tt = (k: number) => T[((k % n) + n) % n] + Math.floor(k / n), vv = (k: number) => V[((k % n) + n) % n], t1 = tt(i), t2 = tt(i + 1), h = t2 - t1, u = (f - t1) / h, u2 = u * u, u3 = u2 * u;
  return vv(i).map((v1, c) => { const v2 = vv(i + 1)[c], m1 = ((v2 - vv(i - 1)[c]) / (t2 - tt(i - 1))) * h, m2 = ((vv(i + 2)[c] - v1) / (tt(i + 2) - t1)) * h; return (2 * u3 - 3 * u2 + 1) * v1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * v2 + (u3 - u2) * m2; });
};
// the far legs run the same stride a little later: one forefoot lands, then the other
const FAR_FORE = 0.085, FAR_HIND = 0.07;
export const gallopRig = (ph: number): Rig => {
  const b = cyc(BODY, ph);
  return { pitch: b[2], lumb: b[0], thor: b[1], headH: 300, head: 5 + b[2] * 0.3, fore: cyc(FORE, ph) as Leg, foreF: cyc(FORE, ph - FAR_FORE) as Leg, hind: cyc(HIND, ph) as Leg, hindF: cyc(HIND, ph - FAR_HIND) as Leg, tail: TAIL_CURL.map((k, i) => { const a = cyc(BODY, ph - 0.09 * i)[3]; return 196 + (a - 196) * (1 + i * 0.18) + k; }) }; // each segment follows the one before it, later and wider: the whip of the tail
};
// how firmly the feet are on the ground through the stride: two stances, two flights
const stance = (ph: number) => { const f = ((ph % 1) + 1) % 1, bump = (c: number, w: number) => { const d = Math.min(Math.abs(f - c), 1 - Math.abs(f - c)); return clamp(1 - d / w); }; const s = Math.max(bump(0.27, 0.15), bump(0.8, 0.15)); return s * s * (3 - 2 * s); };
/** The waist's height (negative, above the ground at 0) at this point of the stride: on its feet in the stances, carried through the air between. */
export const gallopY = (ph: number, rig = gallopRig(ph)): number => { const l = lowest(fk(rig, 0, 0, 0)), contact = -Math.max(l.fore, l.hind), air = Math.min(contact, -cyc(BODY, ph)[4]); return lerp(air, contact, stance(ph)); };

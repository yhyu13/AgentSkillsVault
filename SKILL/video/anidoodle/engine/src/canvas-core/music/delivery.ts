// THE DELIVERY MASTER. The last thing a film's whole mix passes through, score and effects together:
// one static gain to the web loudness target, then the smooth true-peak limiter, whose work is capped.
// When reaching the target would need more than `maxLimitDb` of limiting (sharp hits over near
// silence), the gain gives way instead of the hits being squashed, and the shortfall is reported.
import { loudness, truePeak } from "./meter";
import { smoothLimiter } from "./mixDsp";
import { db } from "./dsp";

export type MasterMode = "gentle" | "dense" | "none" | number;
export type Delivered = { targetLufs: number; gainDb: number; limitDb: number; lufs: number; dbtp: number; shortLu: number };
/** -16 LUFS for gentle films (drawing films, explainers), -14 for dense ones (launch films, trailers) */
export const targetOf = (m: MasterMode) => (typeof m === "number" ? m : m === "dense" ? -14 : -16);

export const deliver = (L: Float32Array, R: Float32Array, sr: number, mode: MasterMode = "gentle", o: { ceilingDb?: number; maxLimitDb?: number } = {}): Delivered => {
  const n = L.length, ceil = o.ceilingDb ?? -1, maxLim = o.maxLimitDb ?? (mode === "dense" ? 6 : 4), target = targetOf(mode);
  const scale = (g: number) => { if (g === 1) return; for (let i = 0; i < n; i++) { L[i] *= g; R[i] *= g; } };
  const before = n >= sr * 0.4 ? loudness([L, R], sr).integrated : -Infinity;
  if (mode === "none" || !Number.isFinite(before)) { const tp = truePeak([L, R]).dbtp; return { targetLufs: target, gainDb: 0, limitDb: 0, lufs: before, dbtp: tp, shortLu: 0 }; }
  // the limiter may take at most maxLim off the loudest peaks: try the gain on copies, and where it would
  // limit harder, give gain back; where the peak estimate left room, take it, up to the target
  const src = [L.slice(), R.slice()];
  let gainDb = target - before, limitDb = 0;
  for (let k = 0; k < 4; k++) {
    L.set(src[0]); R.set(src[1]); scale(db(gainDb));
    limitDb = smoothLimiter(L, R, sr, db(ceil - 0.15));
    const lu = loudness([L, R], sr).integrated, roomLu = target - lu;
    if (limitDb > maxLim + 0.05) gainDb -= limitDb - maxLim;
    else if (roomLu > 0.1 && limitDb < maxLim - 0.1) gainDb += Math.min(roomLu, maxLim - limitDb);
    else break;
  }
  // a last static trim for inter-sample overshoot the limiter's estimate missed
  const tp = truePeak([L, R]).dbtp; if (tp > ceil) { gainDb -= tp - ceil + 0.02; scale(db(-(tp - ceil + 0.02))); }
  const lufs = loudness([L, R], sr).integrated;
  return { targetLufs: target, gainDb, limitDb, lufs, dbtp: truePeak([L, R]).dbtp, shortLu: Math.max(0, target - lufs) };
};

/**
 * Room tone: the quiet air a foley track sits on, so an effects-only film never drops to digital
 * silence between its cues. Seeded pink noise, band-limited (80 Hz to 5 kHz) and nearly mono (the two
 * sides share most of their signal, so a phone's mono fold keeps it), faded in over 20 ms and out over
 * the last 0.4 s. Returned at unit loudness scale; the caller sets its level against the cues.
 */
export const roomTone = (n: number, sr: number, seed = 1): [Float32Array, Float32Array] => {
  let x = (seed * 2654435761) >>> 0; const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296 * 2 - 1; };
  const pink = () => { let b0 = 0, b1 = 0, b2 = 0; return () => { const w = rnd(); b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; return (b0 + b1 + b2 + w * 0.1848) * 0.2; }; };
  const shared = pink(), sideL = pink(), sideR = pink(), L = new Float32Array(n), R = new Float32Array(n);
  const hp = 1 - Math.exp((-2 * Math.PI * 80) / sr), lp = 1 - Math.exp((-2 * Math.PI * 5000) / sr), st = [0, 0, 0, 0];
  const fin = Math.round(0.02 * sr), fout = Math.round(0.4 * sr);
  for (let i = 0; i < n; i++) {
    const c = shared(), l = c + 0.35 * sideL(), r = c + 0.35 * sideR();
    st[0] += (l - st[0]) * lp; st[1] += (r - st[1]) * lp; st[2] += (st[0] - st[2]) * hp; st[3] += (st[1] - st[3]) * hp;
    const g = Math.min(1, i / fin, (n - 1 - i) / fout); L[i] = (st[0] - st[2]) * g; R[i] = (st[1] - st[3]) * g;
  }
  return [L, R];
};
/** lay room tone under an effects-only mix, `bedDb` under the effects' own loudness (no-op when they are silent) */
export const layBed = (L: Float32Array, R: Float32Array, fx: [Float32Array, Float32Array], sr: number, seed: number, bedDb = 22) => {
  const n = L.length; if (n < sr * 0.4) return;
  const fxLu = loudness(fx, sr).integrated; if (!Number.isFinite(fxLu)) return;
  const [bL, bR] = roomTone(n, sr, seed), bLu = loudness([bL, bR], sr).integrated, g = db(fxLu - bedDb - bLu);
  for (let i = 0; i < n; i++) { L[i] += bL[i] * g; R[i] += bR[i] * g; }
};

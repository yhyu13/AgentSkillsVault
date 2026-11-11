// Mix-chain building blocks (sound v2). Pure functions over whole float buffers, deterministic,
// no rng. Written from the textbook forms: RBJ cookbook EQ (dsp.ts), feed-forward soft-knee
// compressor (Giannoulis, Massberg and Reiss, JAES 2012), halfband 2x oversampling, Linkwitz-Riley
// crossovers, the Web Audio "StereoPannerNode" equal-power law for stereo sources, and a
// hold + box-filter look-ahead limiter (the Signalsmith "smooth limiter" construction).
import { Biquad, db } from "./dsp";

const lin2db = (x: number) => 20 * Math.log10(Math.max(x, 1e-12));

// ---------------------------------------------------------------- EQ
/** A stem's EQ: 12 dB/oct high-pass and low-pass, a tilt around 1 kHz (dB from the low end to the high end), bells [f, q, dB]. */
export type StemEq = { hp?: number; lp?: number; tilt?: number; bells?: [number, number, number][]; air?: number };
export const eqChain = (sr: number, e: StemEq): Biquad[] => {
  const fs: Biquad[] = [], ny = sr * 0.45;
  if (e.hp && e.hp > 10) fs.push(Biquad.make(sr, "hp", e.hp, 0.7071));
  if (e.tilt) { fs.push(Biquad.make(sr, "lowshelf", 1000, 0.5, -e.tilt / 2)); fs.push(Biquad.make(sr, "highshelf", 1000, 0.5, e.tilt / 2)); }
  for (const [f, q, g] of e.bells ?? []) if (f < ny && g) fs.push(Biquad.make(sr, "peak", f, q, g));
  if (e.air && 10000 < ny) fs.push(Biquad.make(sr, "highshelf", 10000, 0.7, e.air));
  if (e.lp && e.lp < ny) fs.push(Biquad.make(sr, "lp", e.lp, 0.7071));
  return fs;
};
export const runEq = (buf: Float32Array, fs: Biquad[]) => { for (const f of fs) f.run(buf); return buf; };

// ---------------------------------------------------------------- pan
/** True stereo pan (Web Audio StereoPanner, equal power): pan 0 is the identity; a panned stereo source keeps its power. */
export const stereoPan = (L: Float32Array, R: Float32Array, p: number) => {
  if (!p) return;
  const q = Math.max(-1, Math.min(1, p)), x = q <= 0 ? q + 1 : q, gl = Math.cos((x * Math.PI) / 2), gr = Math.sin((x * Math.PI) / 2);
  for (let i = 0; i < L.length; i++) {
    const l = L[i], r = R[i];
    if (q <= 0) { L[i] = l + r * gl; R[i] = r * gr; } else { L[i] = l * gl; R[i] = r + l * gr; }
  }
};

// ---------------------------------------------------------------- oversampled saturation
/** Halfband FIR (odd taps only + centre 0.5), 2x up/down. Kaiser-ish window, ~80 dB image rejection above 0.6 Nyquist. */
const HB = (() => { const M = 15, h: number[] = []; for (let k = 1; k <= M; k += 2) { const w = 0.42 + 0.5 * Math.cos((Math.PI * k) / (M + 1)) + 0.08 * Math.cos((2 * Math.PI * k) / (M + 1)); h.push((0.5 * Math.sin((Math.PI * k) / 2)) / ((Math.PI * k) / 2) * w); } return h; })(); // h[j] is the tap at k = 2j+1 (and -k)
/** Run `f` on a 2x-oversampled copy of x (in place). */
export const oversample2 = (x: Float32Array, f: (v: number) => number) => {
  const n = x.length, H = HB.length, up = new Float64Array(2 * n);
  for (let i = 0; i < n; i++) {
    up[2 * i] = f(x[i]);
    let s = 0; for (let j = 0; j < H; j++) { const k = 2 * j + 1, a = i + ((1 - k) >> 1), b = i + ((1 + k) >> 1); s += HB[j] * ((a >= 0 && a < n ? x[a] : 0) + (b >= 0 && b < n ? x[b] : 0)); }
    up[2 * i + 1] = f(2 * s);
  }
  for (let i = 0; i < n; i++) {
    const m = 2 * i; let s = 0.5 * up[m];
    for (let j = 0; j < H; j++) { const k = 2 * j + 1; s += HB[j] * ((m - k >= 0 ? up[m - k] : 0) + (m + k < 2 * n ? up[m + k] : 0)); }
    x[i] = s;
  }
  return x;
};
/** Asymmetric tanh saturation, unity small-signal gain; `bias` adds even harmonics (tape/tube). DC removed after. */
export const saturate = (x: Float32Array, sr: number, drive: number, bias = 0, mix = 1) => {
  if (drive <= 0 || mix <= 0) return x;
  const d = drive, t0 = Math.tanh(d * bias), g0 = d * (1 - t0 * t0), dry = mix < 1 ? Float32Array.from(x) : null;
  oversample2(x, (v) => (Math.tanh(d * (v + bias)) - t0) / g0);
  // DC blocker (5 Hz)
  const R = Math.exp((-2 * Math.PI * 5) / sr); let x1 = 0, y1 = 0; for (let i = 0; i < x.length; i++) { const y = x[i] - x1 + R * y1; x1 = x[i]; y1 = y; x[i] = y; }
  if (dry) for (let i = 0; i < x.length; i++) x[i] = dry[i] + (x[i] - dry[i]) * mix;
  return x;
};

/**
 * Guitar amp + cab, in place on a stereo stem (a part with `opts.amp` = drive, 1 clean .. 8 high gain). The DI is
 * normalised so the playing peak hits the same point of the curve whatever the fader, then: a tube-screamer style
 * pre-EQ (HP 110 Hz, +3 dB at 750 Hz), 2x oversampled asymmetric saturation (even harmonics), a 4x12 cab curve
 * (HP 80 Hz, +2 dB at 2.4 kHz, 12 dB/oct low-pass at 5 kHz) and the stem's energy matched back: the fader keeps the balance.
 */
export const ampSim = (L: Float32Array, R: Float32Array, sr: number, drive: number) => {
  let pk = 0, e0 = 0; for (let i = 0; i < L.length; i++) { pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); e0 += L[i] * L[i] + R[i] * R[i]; }
  if (pk < 1e-9 || drive <= 0) return;
  const ref = 0.5 / pk;
  for (const c of [L, R]) {
    for (let i = 0; i < c.length; i++) c[i] *= ref;
    for (const b of [Biquad.make(sr, "hp", 110, 0.7071), Biquad.make(sr, "peak", 750, 0.8, 3)]) b.run(c);
    saturate(c, sr, drive, 0.12);
    for (const b of [Biquad.make(sr, "hp", 80, 0.7071), Biquad.make(sr, "peak", 2400, 1.1, 2), Biquad.make(sr, "lp", 5000, 0.7071)]) b.run(c);
  }
  let e1 = 0; for (let i = 0; i < L.length; i++) e1 += L[i] * L[i] + R[i] * R[i];
  if (e1 > 0) { const k = Math.sqrt(e0 / e1); for (let i = 0; i < L.length; i++) { L[i] *= k; R[i] *= k; } }
};

/**
 * Transient-aware gain for one stem (gentle styles: the plucks, plucked basses and piano, whose picks and hammers
 * pin a static master at the -1 dBTP ceiling 2-3 dB short of -16 LUFS). A fast peak envelope (instant attack, 5 ms
 * release) against the note's own body (a 20 ms / 150 ms mean level) says how far a sample stands above its body;
 * only that excess comes down (above `thrDb`, at `ratio`, at most `maxDb`), with a 2 ms look-ahead so the dip lands
 * on the pick, a 40 ms recovery, and the stem's energy matched back. The body, the decay and the balance between
 * stems do not move: only the crest of each attack does. Not a compressor on the master (spec 08 forbids that on
 * gentle styles); gentleGlue stays a separate, default-off decision. Returns the p99 gain reduction in dB.
 */
export const transientGain = (L: Float32Array, R: Float32Array, sr: number, o: { maxDb?: number; thrDb?: number; ratio?: number } = {}) => {
  const n = L.length, maxDb = o.maxDb ?? 6, thr = o.thrDb ?? 4, k = 1 - 1 / (o.ratio ?? 3);
  let e0 = 0; for (let i = 0; i < n; i++) e0 += L[i] * L[i] + R[i] * R[i];
  if (e0 <= 0) return 0;
  const rF = Math.exp(-1 / (0.005 * sr)), aS = Math.exp(-1 / (0.02 * sr)), rS = Math.exp(-1 / (0.15 * sr)), want = new Float32Array(n);
  let fast = 0, slow = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.max(Math.abs(L[i]), Math.abs(R[i]));
    fast = a > fast ? a : rF * fast; slow = fast > slow ? aS * slow + (1 - aS) * fast : rS * slow + (1 - rS) * fast;
    const over = slow > 1e-7 ? 20 * Math.log10(fast / slow) - thr : 0;
    want[i] = over > 0 ? Math.min(maxDb, over * k) : 0;
  }
  // look-ahead: the reduction starts 2 ms before the peak it answers (running max over the next window), then a smooth recovery
  const la = Math.max(1, Math.round(0.002 * sr)), rec = Math.exp(-1 / (0.04 * sr)), g = new Float32Array(n), q: number[] = [];
  for (let i = n - 1; i >= 0; i--) { while (q.length && want[q[q.length - 1]] <= want[i]) q.pop(); q.push(i); while (q[0] > i + la) q.shift(); g[i] = want[q[0]]; }
  let cur = 0; const grs: number[] = [];
  for (let i = 0; i < n; i++) { cur = g[i] > cur ? g[i] : rec * cur + (1 - rec) * g[i]; const m = Math.pow(10, -cur / 20); L[i] *= m; R[i] *= m; if (cur > 0.05 && (i & 63) === 0) grs.push(cur); }
  let e1 = 0; for (let i = 0; i < n; i++) e1 += L[i] * L[i] + R[i] * R[i];
  if (e1 > 0) { const m = Math.sqrt(e0 / e1); for (let i = 0; i < n; i++) { L[i] *= m; R[i] *= m; } }
  grs.sort((a, b) => a - b); return grs.length ? grs[Math.floor(grs.length * 0.99)] : 0;
};

// ---------------------------------------------------------------- compressor
export type CompOpts = { ratio: number; attackMs: number; releaseMs: number; kneeDb?: number; /** target gain reduction on the loud passages (p90 of GR while active); the threshold is solved for it */ targetGrDb: number; maxGrDb?: number };
/** Stereo-linked feed-forward compressor with auto threshold (solved so the loud passages see `targetGrDb`) and RMS makeup. Returns the measured GR stats. */
/** The k-th smallest of a[0..m) (Hoare quickselect, reorders a in place): the value a sort would put at index k. */
export const kth = (a: Float64Array, m: number, k: number) => {
  let lo = 0, hi = m - 1;
  while (lo < hi) {
    const x = a[(lo + hi) >> 1]; let i = lo, j = hi;
    while (i <= j) { while (a[i] < x) i++; while (a[j] > x) j--; if (i <= j) { const t = a[i]; a[i] = a[j]; a[j] = t; i++; j--; } }
    if (k <= j) hi = j; else if (k >= i) lo = i; else return a[k];
  }
  return a[k];
};
export const compress = (L: Float32Array, R: Float32Array, sr: number, o: CompOpts) => {
  const n = L.length, W = o.kneeDb ?? 6, slope = 1 / o.ratio - 1;
  // detector: peak-ish level in dB (fast 1 ms attack, 40 ms release on the absolute value)
  const det = new Float32Array(n), aA = Math.exp(-1 / (0.001 * sr)), aR = Math.exp(-1 / (0.04 * sr)); let e = 0, mx = -200;
  for (let i = 0; i < n; i++) { const a = Math.max(Math.abs(L[i]), Math.abs(R[i])); e = a > e ? aA * e + (1 - aA) * a : aR * e + (1 - aR) * a; det[i] = lin2db(e); if (det[i] > mx) mx = det[i]; }
  if (mx < -80) return { thresholdDb: 0, p90GrDb: 0, maxGrDb: 0 };
  const gc = (x: number, T: number) => { const ov = x - T; if (2 * ov < -W) return 0; if (2 * Math.abs(ov) <= W) return (slope * (ov + W / 2) ** 2) / (2 * W); return slope * ov; };
  const ga = Math.exp(-1 / ((o.attackMs / 1000) * sr)), gr = Math.exp(-1 / ((o.releaseMs / 1000) * sr));
  const act = new Float64Array(n + 1);
  const run = (T: number, out?: Float32Array, step = 1) => {
    let g = 0, m = 0; const ga2 = Math.pow(ga, step), gr2 = Math.pow(gr, step);
    for (let i = 0; i < n; i += step) { const c = gc(det[i], T); g = c < g ? ga2 * g + (1 - ga2) * c : gr2 * g + (1 - gr2) * c; if (out) out[i] = g; if (det[i] > mx - 30) act[m++] = -g; }
    return m ? kth(act, m, Math.floor(m * 0.9)) : 0; // the 90th percentile: the same value a full sort puts there, in linear time
  };
  // bisection on the threshold: p90 GR is monotone in T
  let lo = mx - 40, hi = mx + 1; const step = Math.max(1, Math.floor(sr / 6000));
  for (let it = 0; it < 22; it++) { const mid = (lo + hi) / 2; if (run(mid, undefined, step) > o.targetGrDb) lo = mid; else hi = mid; }
  const T = (lo + hi) / 2, gcurve = new Float32Array(n), p90 = run(T, gcurve);
  let e0 = 0, e1 = 0, maxGr = 0;
  for (let i = 0; i < n; i++) { const gg = Math.max(gcurve[i], -(o.maxGrDb ?? 12)); if (-gg > maxGr) maxGr = -gg; const k = db(gg); e0 += L[i] * L[i] + R[i] * R[i]; L[i] *= k; R[i] *= k; e1 += L[i] * L[i] + R[i] * R[i]; }
  const mk = e1 > 0 ? Math.sqrt(e0 / e1) : 1; for (let i = 0; i < n; i++) { L[i] *= mk; R[i] *= mk; }
  return { thresholdDb: T, p90GrDb: p90, maxGrDb: maxGr };
};

// ---------------------------------------------------------------- width
/** Linkwitz-Riley 4th-order split of x into [low, high] at f. */
export const lr4 = (x: Float32Array, sr: number, f: number): [Float32Array, Float32Array] => {
  const lo = Float32Array.from(x), hi = Float32Array.from(x);
  for (let k = 0; k < 2; k++) { Biquad.make(sr, "lp", f, 0.7071).run(lo); Biquad.make(sr, "hp", f, 0.7071).run(hi); }
  return [lo, hi];
};
/** Per-band M/S width: the side below `monoHz` is removed (mono lows), `mid` scales the side from monoHz to `splitHz`, `high` above it. */
export const bandWidth = (L: Float32Array, R: Float32Array, sr: number, o: { monoHz: number; splitHz: number; mid: number; high: number }) => {
  const n = L.length, M = new Float32Array(n), S = new Float32Array(n);
  for (let i = 0; i < n; i++) { M[i] = 0.5 * (L[i] + R[i]); S[i] = 0.5 * (L[i] - R[i]); }
  const [, above] = lr4(S, sr, o.monoHz), [sMid, sHigh] = lr4(above, sr, o.splitHz);
  for (let i = 0; i < n; i++) { const s = sMid[i] * o.mid + sHigh[i] * o.high; L[i] = M[i] + s; R[i] = M[i] - s; }
};

// ---------------------------------------------------------------- limiter
/** Inter-sample peak estimate per sample (4x windowed sinc, same kernel as meter.truePeak), skipped where the sample itself is far below `floor`. */
const TP = (() => { const O = 4, T = 16, h: number[][] = []; for (let ph = 1; ph < O; ph++) { const row: number[] = []; for (let t = 0; t < T; t++) { const x = t - T / 2 + 1 - ph / O, w = 0.5 + 0.5 * Math.cos((Math.PI * x) / (T / 2)); row.push(x === 0 ? 1 : (Math.sin(Math.PI * x) / (Math.PI * x)) * w); } h.push(row); } return h; })();
const ispPeak = (c: Float32Array, out: Float32Array, floor: number) => {
  const n = c.length;
  for (let i = 0; i < n; i++) {
    let p = Math.abs(c[i]);
    if (p > floor || (i + 1 < n && Math.abs(c[i + 1]) > floor)) for (const row of TP) { let s = 0; for (let t = 0; t < 16; t++) { const j = i + t - 7; if (j >= 0 && j < n) s += c[j] * row[t]; } const v = Math.abs(s); if (v > p) p = v; }
    if (p > out[i]) out[i] = p;
  }
};
/**
 * Smooth true-peak limiter: 4x inter-sample detection, look-ahead hold (`lookMs`), instant-attack
 * release (`releaseMs`), then a box filter the length of the look-ahead so the gain ramps in with no
 * corners (no clicks, no brickwall buzz). The ramp is provably at or under the needed gain at every
 * peak. Offline, so no output delay. Returns the maximum gain reduction in dB.
 */
export const smoothLimiter = (L: Float32Array, R: Float32Array, sr: number, ceil: number, lookMs = 5, releaseMs = 90) => {
  const n = L.length, D = Math.max(2, Math.round((lookMs / 1000) * sr)), pk = new Float32Array(n);
  ispPeak(L, pk, ceil * 0.5); ispPeak(R, pk, ceil * 0.5);
  const need = new Float32Array(n); for (let i = 0; i < n; i++) need[i] = pk[i] > ceil ? ceil / pk[i] : 1;
  // hold: m[j] = min(need[j-D .. j]) via a monotone deque
  const m = new Float32Array(n), dq = new Int32Array(n); let h = 0, t = 0;
  for (let j = 0; j < n; j++) { while (t > h && need[dq[t - 1]] >= need[j]) t--; dq[t++] = j; while (dq[h] < j - D) h++; m[j] = need[dq[h]]; }
  // release (instant attack): never above m
  const rc = 1 - Math.exp(-1 / ((releaseMs / 1000) * sr)); let r = 1;
  for (let j = 0; j < n; j++) { r = Math.min(m[j], r + (1 - r) * rc); m[j] = r; }
  // box filter over D, read D ahead: s at sample i averages m[i+1 .. i+D], all <= need[i]
  let acc = 0, maxGr = 0; const at = (j: number) => (j < n ? m[j] : 1);
  for (let j = 1; j <= D; j++) acc += at(j);
  for (let i = 0; i < n; i++) { const g = acc / D; L[i] *= g; R[i] *= g; if (g < 1) maxGr = Math.max(maxGr, -lin2db(g)); acc += at(i + 1 + D) - at(i + 1); }
  return maxGr;
};

/** RMS of a stereo pair over its samples above -70 dBFS (the active part). */
export const activeRms = (L: Float32Array, R: Float32Array) => {
  let e = 0, k = 0; const th = 1e-7;
  for (let i = 0; i < L.length; i++) { const v = L[i] * L[i] + R[i] * R[i]; if (v > th) { e += v; k++; } }
  return k ? Math.sqrt(e / (2 * k)) : 0;
};

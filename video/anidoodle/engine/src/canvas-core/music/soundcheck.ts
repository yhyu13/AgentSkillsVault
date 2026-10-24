// SOUNDCHECK. Pure functions that score a film's decoded stereo mix, shared by tools/soundcheck.mjs and
// the tests so both always see the same numbers. Everything is measured from the samples; no model and
// no listening is involved. What gets measured:
//   level     BS.1770 integrated / LRA / true peak from meter.ts; 10 ms K-weighted powers for the rest
//   shape     first sound, holes, dead tail, fade, final moment, an 11-point arc, accents, held breaths
//   spectrum  five band shares of the mid, centroid, the loudest third-octave in a band (to name a fix)
//   stereo    side vs mid, L/R correlation overall and per band, mono-fold loss beyond the expected 3 dB
//   picture   frame-difference events against onsets, with a chance baseline from shifted events
// evaluate() then checks each number against a profile's range and, where one is out, writes the
// concrete change to the mix that would bring it back.
import { loudness, truePeak, onsetsDetail, centroid, fft } from "./meter";
import { kWeight } from "./sfxCore";

// five listening regions: what you feel, what warms, where notes live, what cuts through, what shines
export const BANDS: Record<string, [number, number]> = { rumble: [20, 80], warmth: [80, 300], body: [300, 1200], bite: [1200, 5000], sparkle: [5000, 16000] };
/** Where a stereo mix's body sits: decorrelation here is what a phone's one speaker combs away. */
export const BODY: [number, number] = [150, 2000];
const HOP = 0.01, BLK = 0.05;
const lufsOf = (z: number) => -0.691 + 10 * Math.log10(Math.max(z, 1e-20));
const meanOf = (p: ArrayLike<number>, a: number, b: number) => { const lo = Math.max(0, a), hi = Math.min(p.length, b); let s = 0; for (let i = lo; i < hi; i++) s += p[i]; return hi > lo ? s / (hi - lo) : 0; };
const median = (xs: number[]) => { if (!xs.length) return NaN; const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length & 1 ? s[m] : 0.5 * (s[m - 1] + s[m]); };
const r1 = (x: number, d = 1) => (Number.isFinite(x) ? +x.toFixed(d) : null);

/** K-weighted power per 10 ms hop, channels summed (BS.1770 weights L and R at 1). */
const hopPowers = (k: Float64Array[], sr: number) => {
  const h = Math.round(HOP * sr), n = Math.floor(k[0].length / h), p = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (const c of k) for (let j = i * h; j < (i + 1) * h; j++) s += c[j] * c[j]; p[i] = s / h; }
  return p;
};
/** Gated integrated loudness from hop powers: 400 ms blocks every 100 ms, -70 absolute, -10 relative (meter.ts's gates). */
export const gatedLufs = (p: ArrayLike<number>) => {
  const per = Math.round(0.4 / HOP), step = Math.round(0.1 / HOP), bl: number[] = [];
  for (let a = 0; a + per <= p.length; a += step) bl.push(meanOf(p, a, a + per));
  const abs = bl.filter((z) => lufsOf(z) > -70); if (!abs.length) return -Infinity;
  const rel = lufsOf(abs.reduce((a, b) => a + b, 0) / abs.length) - 10, g = abs.filter((z) => lufsOf(z) > rel);
  return lufsOf(g.reduce((a, b) => a + b, 0) / g.length);
};

/** Welch-averaged auto and cross spectra of L and R (Hann, 50 % overlap). */
const spectra = (L: Float32Array, R: Float32Array, N = 8192) => {
  const bins = N / 2 + 1, ll = new Float64Array(bins), rr = new Float64Array(bins), lr = new Float64Array(bins), w = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  const n = L.length, starts: number[] = []; for (let a = 0; a + N <= n; a += N / 2) starts.push(a); if (!starts.length) starts.push(0); // shorter than one frame: zero-padded
  for (const a of starts) {
    const lr_ = new Float64Array(N), li = new Float64Array(N), rre = new Float64Array(N), ri = new Float64Array(N);
    for (let i = 0; i < N && a + i < n; i++) { lr_[i] = L[a + i] * w[i]; rre[i] = R[a + i] * w[i]; }
    fft(lr_, li); fft(rre, ri);
    for (let k = 0; k < bins; k++) { ll[k] += lr_[k] * lr_[k] + li[k] * li[k]; rr[k] += rre[k] * rre[k] + ri[k] * ri[k]; lr[k] += lr_[k] * rre[k] + li[k] * ri[k]; }
  }
  return { ll, rr, lr, N };
};

export type Gap = { at: number; len: number; allowed: boolean };
export type Measures = {
  durationS: number; lufs: number; lra: number; truePeak: number; samplePeak: number; crest: number; peakPos: number;
  introLu: number; endLu: number; arc: (number | null)[]; arcDip: number; arcDipAt: number;
  firstSound: number | null; insideGap: number; insideGapAt: number | null; gaps: Gap[]; endSilence: number; endSilenceFrom: number;
  fade: number; finalLu: number; tailLu: number; quietAt: number | null; loudAt: number;
  onsetRate: number; accentRate: number; heldBreaths: { at: number; len: number }[];
  bands: Record<string, number>; centroid: number; peakHz: Record<string, number>;
  sideMid: number; corr: number; bandCorr: Record<string, number>; bodyCorr: number; monoDrop: number; monoLoss: number;
  silent: boolean;
};
export type Curves = { momentary: number[]; shortTerm: number[]; hopS: number; levels50: number[]; onsets: number[]; accents: number[] };

/** Every model-free number for one decoded stereo mix. `allow` lists [from, to] seconds where a hole is meant (a declared held breath). */
export const analyze = (L: Float32Array, R: Float32Array, sr: number, { allow = [] as [number, number][] } = {}): { measures: Measures; curves: Curves } => {
  const dur = L.length / sr, chans = [L, R];
  const lo = loudness(chans, sr), tp = truePeak(chans), I = lo.integrated, silent = !(I > -70);
  const kL = kWeight(L, sr), kR = kWeight(R, sr), p10 = hopPowers([kL, kR], sr);
  // mono fold: K-weighting is linear, so the mid's K-weighted signal is the mean of the channels'
  const kM = new Float64Array(kL.length); for (let i = 0; i < kM.length; i++) kM[i] = 0.5 * (kL[i] + kR[i]);
  const pM = hopPowers([kM], sr), monoDrop = gatedLufs(p10) - gatedLufs(pM);
  // 50 ms block levels: fine enough to time a 0.25 s hole, coarse enough that one quiet cycle is not a gap.
  // Unweighted, against the same gating on unweighted power: K-weighting rings for ~30 ms past an abrupt
  // cut, which would move every hole and every dead tail by a block.
  const pRaw = hopPowers([Float64Array.from(L), Float64Array.from(R)], sr), Iraw = gatedLufs(pRaw);
  const per = Math.round(BLK / HOP), nb = Math.floor(pRaw.length / per), lv: number[] = [];
  for (let j = 0; j < nb; j++) lv.push(lufsOf(meanOf(pRaw, j * per, (j + 1) * per)));
  const body = (j: number) => lv[j] >= Iraw - 20, alive = (j: number) => lv[j] > Iraw - 30 && lv[j] > -70;
  let first = -1, last = -1, lastBody = -1;
  for (let j = 0; j < nb; j++) { if (first < 0 && body(j)) first = j; if (alive(j)) last = j; if (body(j)) lastBody = j; }
  const aliveFirst = lv.findIndex((_, j) => alive(j));
  const gaps: Gap[] = [];
  if (aliveFirst >= 0) for (let j = aliveFirst, run = -1; j <= last + 1; j++) {
    if (j <= last && !alive(j)) { if (run < 0) run = j; continue; }
    if (run >= 0) { const at = run * BLK, len = (j - run) * BLK; gaps.push({ at, len, allowed: allow.some(([a, b]) => at >= a - 0.05 && at + len <= b + 0.05) }); run = -1; }
  }
  const open = gaps.filter((g) => !g.allowed).sort((a, b) => b.len - a.len);
  const endFrom = last >= 0 ? (last + 1) * BLK : 0;
  // the arc: each point the energy mean of the tenth of the film around it, against the whole
  const nh = p10.length, arc: (number | null)[] = [];
  for (let q = 0; q <= 10; q++) { const c = (q / 10) * nh, half = nh / 20, l = lufsOf(meanOf(p10, Math.floor(c - half), Math.ceil(c + half))); arc.push(l > -70 ? r1(l - I) : null); }
  let arcDip = 0, arcDipAt = 0; for (let q = 1; q <= 9; q++) { const v = arc[q] ?? -70 - I; if (v < arcDip) { arcDip = v; arcDipAt = (q / 10) * dur; } } // ends are first sound and end silence's job
  const tenth = Math.max(1, Math.round(nh / 10));
  const introLu = lufsOf(meanOf(p10, 0, tenth)) - I, endLu = lufsOf(meanOf(p10, nh - tenth, nh)) - I;
  // the final moment: the loudest 400 ms block centred in the last 3 s
  const fin = lo.momentary.filter((_, i) => i * lo.hopS + 0.2 >= dur - 3);
  const st = lo.shortTerm; let si = 0; st.forEach((v, i) => { if (v > st[si]) si = i; });
  let qi = -1; st.forEach((v, i) => { if (v > I - 40 && (qi < 0 || v < st[qi])) qi = i; });
  // accents (sudden jumps) and held breaths (short dips that come back) on a 100 ms level every 10 ms
  const S = Array.from({ length: nh }, (_, i) => lufsOf(meanOf(p10, i - 5, i + 5)));
  const accents: number[] = [];
  for (let i = 8; i < nh; i++) if (S[i] - S[i - 8] >= 6 && S[i] >= I - 8 && (!accents.length || i * HOP - accents[accents.length - 1] > 0.3)) accents.push(i * HOP);
  const heldBreaths: { at: number; len: number }[] = [];
  for (let i = 50; i < nh; i++) {
    const ref = lufsOf(meanOf(p10, i - 50, i)); if (ref < I - 10 || S[i] >= ref - 10 || S[i - 1] < ref - 10) continue;
    let j = i; while (j < nh && S[j] < ref - 10) j++;
    const len = (j - i) * HOP; let back = false; for (let k = j; k < Math.min(nh, j + 30); k++) if (S[k] >= ref - 6) { back = true; break; }
    if (len >= 0.15 && len <= 1.5 && back) heldBreaths.push({ at: i * HOP, len: +len.toFixed(2) });
    i = j;
  }
  const on = silent ? [] : onsetsDetail(chans, sr).times;
  // spectrum and stereo
  const sp = spectra(L, R), df = sr / sp.N, bins = sp.ll.length, mid = new Float64Array(bins), side = new Float64Array(bins);
  for (let k = 0; k < bins; k++) { mid[k] = (sp.ll[k] + sp.rr[k] + 2 * sp.lr[k]) / 4; side[k] = Math.max(0, (sp.ll[k] + sp.rr[k] - 2 * sp.lr[k]) / 4); }
  const sum = (a: Float64Array, f0: number, f1: number) => { let s = 0; for (let k = Math.ceil(f0 / df); k < Math.min(bins, Math.ceil(f1 / df)); k++) s += a[k]; return s; };
  const tot = sum(mid, 20, 16000) || 1e-30, bands: Record<string, number> = {}, bandCorr: Record<string, number> = {}, peakHz: Record<string, number> = {};
  const corrIn = (f0: number, f1: number) => { const d = Math.sqrt(sum(sp.ll, f0, f1) * sum(sp.rr, f0, f1)); return d > 1e-20 ? sum(sp.lr, f0, f1) / d : NaN; };
  const thirds = Array.from({ length: 28 }, (_, i) => 1000 * Math.pow(2, (i - 15) / 3));
  for (const [b, [f0, f1]] of Object.entries(BANDS)) {
    bands[b] = 10 * Math.log10(Math.max(sum(mid, f0, f1), 1e-30) / tot); bandCorr[b] = corrIn(f0, f1);
    let best = -1, bc = 0; for (const c of thirds) if (c >= f0 && c < f1) { const e = sum(mid, c / Math.pow(2, 1 / 6), c * Math.pow(2, 1 / 6)); if (e > best) { best = e; bc = c; } }
    peakHz[b] = Math.round(bc);
  }
  let sl = 0, sr_ = 0, slr = 0, ml = 0, mr = 0; for (let i = 0; i < L.length; i++) { ml += L[i]; mr += R[i]; } ml /= L.length || 1; mr /= L.length || 1;
  for (let i = 0; i < L.length; i++) { const a = L[i] - ml, b = R[i] - mr; sl += a * a; sr_ += b * b; slr += a * b; }
  const sm = sum(side, 20, 20000), mm = sum(mid, 20, 20000);
  const measures: Measures = {
    durationS: dur, lufs: I, lra: lo.lra, truePeak: tp.dbtp, samplePeak: tp.samplePeakDb, crest: lo.shortMax - I, peakPos: Math.min(1, (si * lo.hopS + 1.5) / dur),
    introLu, endLu, arc, arcDip, arcDipAt,
    firstSound: first >= 0 ? first * BLK : null, insideGap: open[0]?.len ?? 0, insideGapAt: open[0]?.at ?? null, gaps, endSilence: Math.max(0, dur - endFrom), endSilenceFrom: endFrom,
    fade: lastBody >= 0 && last >= lastBody ? (last - lastBody) * BLK : 0, finalLu: fin.length ? Math.max(...fin) - I : NaN, tailLu: lv.length ? Math.max(lv[lv.length - 1] - Iraw, -70 - I) : NaN,
    quietAt: qi >= 0 ? qi * lo.hopS + 1.5 : null, loudAt: si * lo.hopS + 1.5,
    onsetRate: on.length / dur, accentRate: accents.length / dur, heldBreaths,
    bands, centroid: silent ? 0 : centroid(chans, sr).energyWeighted, peakHz,
    sideMid: 10 * Math.log10(Math.max(sm, 1e-30) / Math.max(mm, 1e-30)), corr: sl > 0 && sr_ > 0 ? slr / Math.sqrt(sl * sr_) : NaN,
    bandCorr, bodyCorr: corrIn(BODY[0], BODY[1]), monoDrop, monoLoss: monoDrop - 10 * Math.log10(2), silent,
  };
  return { measures, curves: { momentary: lo.momentary, shortTerm: lo.shortTerm, hopS: lo.hopS, levels50: lv, onsets: on, accents } };
};

// ---------------------------------------------------------------- picture against sound
/** Frame-difference spikes: a frame whose changed area is 4x the median of the second around it (and at least 2 %), or 15 % outright. `changed[i]` compares frame i with i - 1. */
export const visualEvents = (changed: number[], fps: number) => {
  const ev: number[] = [], win = Math.max(1, Math.round(fps));
  for (let i = 1; i < changed.length; i++) {
    const ctx: number[] = []; for (let k = Math.max(1, i - win); k <= Math.min(changed.length - 1, i + win); k++) if (k !== i) ctx.push(changed[k]);
    const c = median(ctx), d = changed[i];
    if (((d >= 4 * Math.max(c || 0, 0.005) && d >= 0.02) || d >= 0.15) && (!ev.length || i / fps - ev[ev.length - 1] > 0.2)) ev.push(i / fps);
  }
  return ev;
};
/** Share of events with an onset within `tol`, against the same events shifted off their frames (chance), the unanswered ones, and the nearest-onset offsets. */
export const visualSync = (events: number[], onsets: number[], dur: number, tol = 0.1) => {
  const near = (e: number) => onsets.reduce((b, o) => (Math.abs(o - e) < Math.abs(b - e) ? o : b), Infinity);
  const share = (evs: number[]) => (evs.length && onsets.length ? evs.filter((e) => Math.abs(near(e) - e) <= tol).length / evs.length : NaN);
  const shifts = [0.23, 0.31, 0.43, 0.57, 0.71, 0.87, -0.29, -0.41, -0.53, -0.67];
  const chance = median(shifts.map((s) => share(events.map((e) => e + s).filter((e) => e > 0 && e < dur))).filter(Number.isFinite));
  const offsets = events.map((e) => near(e) - e).filter((d) => Math.abs(d) <= 0.25).map((d) => Math.round(d * 1000));
  return { events: events.length, share: share(events), chance, unanswered: events.filter((e) => !(Math.abs(near(e) - e) <= tol)), medianOffsetMs: offsets.length ? median(offsets) : NaN, offsets };
};

// ---------------------------------------------------------------- holding the numbers to a profile
export type Range = { min?: number; max?: number; tol?: number };
export type Status = "PASS" | "WARN" | "FAIL" | "INFO";
export type Profile = { name: string; ranges: Record<string, Range>; allow?: [number, number][] };
/** Built-in ranges for drawing films: web loudness, sound from frame 0, no hole, no dead tail, phone-safe mids. */
export const DEFAULT_PROFILE: Profile = {
  name: "built-in: drawing film",
  ranges: {
    lufs: { min: -16, max: -13, tol: 1 }, truePeak: { max: -1, tol: 0 }, lra: { max: 9, tol: 3 },
    firstSound: { max: 0.5, tol: 0.5 }, insideGap: { max: 0.25, tol: 0.25 }, endSilence: { max: 0.5, tol: 0.5 }, arcDip: { min: -10, tol: 6 }, tailLu: { max: -20, tol: 10 },
    bodyCorr: { min: 0.3, tol: 0.15 }, monoLoss: { max: 1.5, tol: 0.5 }, corr: { min: 0.3, tol: 0.3 }, sideMid: { min: -15, max: -4, tol: 3 },
    rumble: { max: -5, tol: 2 }, body: { max: -3, tol: 1.5 },
  },
};
/** Delivery limits a reference set never loosens: a profile built from films can only move the taste ranges. */
export const HARD = ["truePeak", "firstSound", "insideGap", "endSilence", "monoLoss"];
const TOL: Record<string, number> = { lufs: 1, lra: 3, crest: 2, introLu: 3, endLu: 3, arcDip: 4, tailLu: 6, fade: 0.5, finalLu: 4, onsetRate: 1, accentRate: 0.3, corr: 0.2, bodyCorr: 0.15, sideMid: 3, centroid: 400, rumble: 2, warmth: 2, body: 2, bite: 2, sparkle: 2 };

export type Row = { key: string; label: string; value: number | null; text: string; status: Status; range?: Range; fix?: string; at?: number; covered?: boolean };
const fmtT = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
export { fmtT };
const f1 = (x: number | null, d = 1) => (x === null || !Number.isFinite(x) ? "n/a" : x.toFixed(d));
const sign = (x: number, d = 1) => (x > 0 ? "+" : "") + x.toFixed(d);
export const grade = (v: number | null, r?: Range): Status => {
  if (!r) return "INFO"; if (v === null || !Number.isFinite(v)) return "FAIL";
  const tol = r.tol ?? 0, over = Math.max(r.min !== undefined ? r.min - v : 0, r.max !== undefined ? v - r.max : 0);
  return over <= 1e-9 ? "PASS" : over <= tol + 1e-9 ? "WARN" : "FAIL";
};
const rangeText = (r?: Range) => (!r ? "" : r.min !== undefined && r.max !== undefined ? `${r.min}..${r.max}` : r.min !== undefined ? `>= ${r.min}` : r.max !== undefined ? `<= ${r.max}` : "");

type Def = { key: string; label: string; get: (m: Measures) => number | null; show: (v: number, m: Measures) => string; fix?: (v: number, m: Measures, r: Range) => string; at?: (m: Measures) => number | undefined };
const BAND_LABEL: Record<string, string> = { rumble: "rumble 20-80 Hz", warmth: "warmth 80-300 Hz", body: "body 300-1200 Hz", bite: "bite 1.2-5 kHz", sparkle: "sparkle 5-16 kHz" };
const bandFix = (b: string, v: number, m: Measures, r: Range) => {
  const hot = r.max !== undefined && v > r.max, pk = m.peakHz[b], at = pk ? ` (strongest near ${pk} Hz)` : "";
  if (b === "rumble") return hot ? `the rumble takes ${f1(v)} dB of the energy: little speakers cannot play it and it uses up the loudness; roll off under 40 Hz on the effects and shorten the low tails` : `nothing under 80 Hz (${f1(v)} dB): one low voice or the big hit can carry some weight`;
  if (b === "warmth") return hot ? `woolly, ${f1(v)} dB in the warmth${at}: dip that spot a few dB or clear the pads out from under 100 Hz` : `cold (${f1(v)} dB of warmth): the bass or a low pad can come up`;
  if (b === "body") return hot ? `crowded body, ${f1(v)} dB${at}: notch the strongest spot a couple of dB, or move a part up or down an octave` : `hollow body (${f1(v)} dB): the chords or the melody's lower notes can come forward`;
  if (b === "bite") return hot ? `pushy, ${f1(v)} dB of bite${at}: a small dip there, or a softer attack on the loudest part` : `muffled (${f1(v)} dB of bite): the melody wants to sit in 1.5-3 kHz; bring the lead forward`;
  return hot ? `glassy, ${f1(v)} dB of sparkle: tame the very top with a gentle shelf, or round off the sharpest transients` : `no shine (${f1(v)} dB of sparkle): a touch of top on the effects or the room`;
};
const DEFS: Def[] = [
  { key: "lufs", label: "integrated loudness", get: (m) => m.lufs, show: (v) => `${f1(v)} LUFS`, fix: (v, m, r) => v < (r.min ?? -99) ? `plays at ${f1(v)} LUFS, ${f1(-14 - v)} LU under the web target: master the mix to -14 LUFS (or -16 for a gentle film), a static gain then the limiter` : `too loud at ${f1(v)} LUFS: turn the master down to -14 LUFS` },
  { key: "truePeak", label: "true peak", get: (m) => m.truePeak, show: (v) => `${f1(v)} dBTP`, fix: (v) => `true peak ${f1(v)} dBTP: set the limiter ceiling to -1.5 dBTP before the encode, so the AAC overshoot stays under -1` },
  { key: "lra", label: "loudness range", get: (m) => m.lra, show: (v) => `${f1(v)} LU`, fix: (v, m) => `level swings ${f1(v)} LU (loudest at ${fmtT(m.loudAt)}${m.quietAt !== null ? `, quietest at ${fmtT(m.quietAt)}` : ""}): lift the quiet passages or keep a bed under them`, at: (m) => m.quietAt ?? undefined },
  { key: "firstSound", label: "first sound", get: (m) => m.firstSound, show: (v) => `${f1(v, 2)} s`, fix: (v) => `nothing reaches body level until ${fmtT(v)}: start the bed or a sound on frame 0`, at: (m) => m.firstSound ?? 0 },
  { key: "insideGap", label: "longest hole inside", get: (m) => m.insideGap, show: (v, m) => `${f1(v, 2)} s${m.insideGapAt !== null ? ` at ${fmtT(m.insideGapAt)}` : ""}`, fix: (v, m) => `${f1(v)} s hole at ${fmtT(m.insideGapAt ?? 0)}: keep the bed under it, or if the silence is meant as a held breath pass --allow ${f1(m.insideGapAt ?? 0, 2)}:${f1((m.insideGapAt ?? 0) + v, 2)}`, at: (m) => m.insideGapAt ?? undefined },
  { key: "endSilence", label: "dead air at the end", get: (m) => m.endSilence, show: (v) => `${f1(v, 2)} s`, fix: (v, m) => `${f1(v)} s of dead air at the end (from ${fmtT(m.endSilenceFrom)}): carry the bed or a tail to the last frame, or end the film sooner`, at: (m) => m.endSilenceFrom },
  { key: "arcDip", label: "deepest dip in the arc", get: (m) => (m.silent ? null : m.arcDip), show: (v, m) => `${sign(v)} LU at ${fmtT(m.arcDipAt)}`, fix: (v, m) => `the sound drops ${f1(-v)} LU under the film at ${fmtT(m.arcDipAt)} (${Math.round((100 * m.arcDipAt) / m.durationS)} %): keep the bed or room tone under it`, at: (m) => m.arcDipAt },
  { key: "tailLu", label: "level of the last 50 ms", get: (m) => (m.silent ? null : m.tailLu), show: (v, m) => (v + m.lufs <= -70 + 1e-6 ? "silent" : `${sign(v)} LU`), fix: (v) => `ends on a cut (the last 50 ms still at ${sign(v)} LU): end on a tail or fade the last 0.3 s`, at: (m) => m.durationS - 0.05 },
  { key: "bodyCorr", label: "L/R correlation 150-2k", get: (m) => m.bodyCorr, show: (v) => f1(v, 2), fix: (v) => `mids decorrelated (150-2k correlation ${f1(v, 2)}): narrow the stereo width below 2 kHz (mixDsp.bandWidth with mid around 0.5, or a mono room send)` },
  { key: "monoLoss", label: "mono fold, extra loss", get: (m) => m.monoLoss, show: (v) => `${f1(v)} dB`, fix: (v) => `folded to mono it loses ${f1(v)} dB more than a centred mix: phones will comb it; narrow the width or check the stereo pair's phase` },
  { key: "corr", label: "L/R correlation", get: (m) => m.corr, show: (v) => f1(v, 2), fix: (v) => `L and R barely agree (correlation ${f1(v, 2)}): pan the lead and bass to the centre, keep width for pads and room` },
  { key: "sideMid", label: "side vs mid", get: (m) => m.sideMid, show: (v) => `${f1(v)} dB`, fix: (v, m, r) => v > (r.max ?? 99) ? `too wide (side ${f1(v)} dB against the mid): narrow the overall width` : `very narrow (side ${f1(v)} dB): widen the pads or the room a little` },
  ...Object.keys(BANDS).map((b): Def => ({ key: b, label: `${BAND_LABEL[b]} share`, get: (m) => (m.silent ? null : m.bands[b]), show: (v) => `${f1(v)} dB`, fix: (v, m, r) => bandFix(b, v, m, r) })),
  { key: "centroid", label: "brightness (centroid)", get: (m) => m.centroid, show: (v) => `${Math.round(v)} Hz`, fix: (v, m, r) => v > (r.max ?? 1e9) ? `brighter than the references (${Math.round(v)} Hz): soften the top` : `darker than the references (${Math.round(v)} Hz): lift the top` },
  { key: "crest", label: "loudest 3 s over integrated", get: (m) => m.crest, show: (v) => `${sign(v)} LU` },
  { key: "introLu", label: "intro level (first 10 %)", get: (m) => m.introLu, show: (v) => `${sign(v)} LU` },
  { key: "endLu", label: "end level (last 10 %)", get: (m) => m.endLu, show: (v) => `${sign(v)} LU` },
  { key: "peakPos", label: "loudest moment", get: (m) => m.peakPos, show: (v, m) => `${Math.round(v * 100)} % (${fmtT(v * m.durationS)})` },
  { key: "fade", label: "fade / ring-out", get: (m) => m.fade, show: (v) => `${f1(v, 2)} s` },
  { key: "finalLu", label: "final moment (last 3 s)", get: (m) => m.finalLu, show: (v) => `${sign(v)} LU` },
  { key: "onsetRate", label: "onsets per second", get: (m) => m.onsetRate, show: (v) => f1(v, 2) },
  { key: "accentRate", label: "accents per second", get: (m) => m.accentRate, show: (v) => f1(v, 2) },
  { key: "heldBreaths", label: "held breaths", get: (m) => m.heldBreaths.length, show: (v, m) => `${v}${m.heldBreaths.length ? ` (${m.heldBreaths.slice(0, 4).map((s) => fmtT(s.at)).join(", ")})` : ""}` },
];
/** Fix order: what most makes a film read unfinished goes first. */
const ORDER = ["lufs", "endSilence", "insideGap", "firstSound", "arcDip", "truePeak", "lra", "bodyCorr", "monoLoss", "rumble", "body", "sideMid", "corr", "tailLu"];

export const evaluate = (m: Measures, profile: Profile = DEFAULT_PROFILE): Row[] =>
  DEFS.map((d) => {
    const v = d.get(m), r = profile.ranges[d.key], status = m.silent && d.key === "lufs" ? "FAIL" : grade(v, r);
    const row: Row = { key: d.key, label: d.label, value: v === null ? null : r1(v, 3), text: v === null ? "n/a" : d.show(v, m), status, range: r };
    if ((status === "FAIL" || status === "WARN") && r) { row.fix = m.silent ? "the file is silent: there is no sound to check" : v === null ? `${d.label}: not measurable` : d.fix ? d.fix(v, m, r) : `${d.label} ${d.show(v, m)} is outside ${rangeText(r)}`; const at = d.at?.(m); if (at !== undefined) row.at = at; }
    // a dip that sits in a hole or the dead tail is that fault again: one fix, not two
    if (d.key === "arcDip" && row.fix && (m.gaps.some((g) => !g.allowed && g.len > (profile.ranges.insideGap?.max ?? 0.25) && m.arcDipAt >= g.at - m.durationS / 20 && m.arcDipAt <= g.at + g.len + m.durationS / 20) || (m.endSilence > (profile.ranges.endSilence?.max ?? 0.5) && m.arcDipAt >= m.endSilenceFrom - m.durationS / 20))) row.covered = true;
    return row;
  });
/** One fix per cause: the stereo numbers all point at the width, so they fold into the first of them that is out. */
const GROUP: Record<string, string> = { bodyCorr: "stereo", monoLoss: "stereo", corr: "stereo", sideMid: "stereo" };
export const startHere = (rows: Row[]) => {
  const out: Row[] = [], seen = new Map<string, Row>();
  for (const r of rows.filter((x) => x.fix && !x.covered).sort((a, b) => (a.status === b.status ? 0 : a.status === "FAIL" ? -1 : 1) || rank(a.key) - rank(b.key))) {
    const g = GROUP[r.key], lead = g && seen.get(g);
    if (lead) { lead.fix += `${lead.fix!.includes("(also ") ? "; " : " (also "}${r.label} ${r.text}`; continue; }
    const copy = { ...r }; if (g) seen.set(g, copy); out.push(copy);
  }
  for (const r of seen.values()) if (r.fix!.includes("(also ")) r.fix += ")";
  return out;
};
const rank = (k: string) => { const i = ORDER.indexOf(k); return i < 0 ? 99 : i; };
export { rangeText };

/** Ranges from films the user picked: min, max and median of every number, per metric. */
export const buildProfile = (name: string, sets: { file: string; measures: Measures }[]) => {
  const metrics: Record<string, { min: number; max: number; median: number }> = {};
  for (const d of DEFS) {
    const vs = sets.map((s) => d.get(s.measures)).filter((v): v is number => v !== null && Number.isFinite(v));
    if (vs.length) metrics[d.key] = { min: r1(Math.min(...vs), 2)!, max: r1(Math.max(...vs), 2)!, median: r1(median(vs), 2)! };
  }
  return { name, built: "soundcheck profile", from: sets.map((s) => s.file), metrics };
};
/** A built profile as ranges: the references' own span, padded by half a tolerance, over the defaults; HARD limits stay. */
export const profileFrom = (built: { name: string; metrics: Record<string, { min: number; max: number }>; allow?: [number, number][] }): Profile => {
  const ranges: Record<string, Range> = { ...DEFAULT_PROFILE.ranges };
  for (const [k, v] of Object.entries(built.metrics ?? {})) {
    if (HARD.includes(k) || k === "heldBreaths" || k === "peakPos") continue;
    const tol = TOL[k] ?? DEFAULT_PROFILE.ranges[k]?.tol ?? 1, pad = tol / 2;
    ranges[k] = { min: +(v.min - pad).toFixed(2), max: +(v.max + pad).toFixed(2), tol };
  }
  return { name: built.name, ranges, allow: built.allow };
};

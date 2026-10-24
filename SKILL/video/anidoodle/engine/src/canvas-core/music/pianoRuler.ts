// The piano ruler. Measures how far a played note sits from a real recording of the same note, in a
// unit a listener can feel: the real piano's own change from soft to loud at that key. A score of 1.0
// means the note is as far off as playing it a whole dynamic step wrong; 0.3 and under reads as close.
// Pure functions on mono PCM (unit-tested on synthetic tones); tools/pianoruler.mjs runs them on the
// recorded grand with each recording held out in turn, so the truth is always a real take.
import { fft } from "./meter";
import { PIANO_BANDS } from "./keysTables";

const FRAME = 2048, HOP = 1024;
const edges = PIANO_BANDS.map((c) => [c / Math.SQRT2, c * Math.SQRT2]);
/** Onset: the first sample within 30 dB of the peak, so a quiet lead-in does not shift every window. */
export const onsetOf = (x: Float32Array) => { let pk = 0; for (let i = 0; i < x.length; i++) pk = Math.max(pk, Math.abs(x[i])); const th = pk * 0.0316; for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) >= th) return i; return 0; };
/** Hann-framed power spectra between two times (s) after the onset, averaged. */
const meanPower = (x: Float32Array, sr: number, from: number, to: number) => {
  const o = onsetOf(x), a = o + Math.round(from * sr), b = Math.min(x.length, o + Math.round(to * sr)), acc = new Float64Array(FRAME / 2); let frames = 0;
  const re = new Float64Array(FRAME), im = new Float64Array(FRAME);
  for (let s = a; s + FRAME <= b || (frames === 0 && s < b); s += HOP) {
    for (let i = 0; i < FRAME; i++) { const j = s + i; re[i] = (j < x.length ? x[j] : 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FRAME)); im[i] = 0; }
    fft(re, im); for (let k = 0; k < FRAME / 2; k++) acc[k] += re[k] * re[k] + im[k] * im[k]; frames++;
  }
  for (let k = 0; k < acc.length; k++) acc[k] /= Math.max(1, frames);
  return acc;
};
const toBands = (p: Float64Array, sr: number) => edges.map(([lo, hi]) => { let e = 1e-20; for (let k = 0; k < p.length; k++) { const f = (k * sr) / FRAME; if (f >= lo && f < hi) e += p[k]; } return 10 * Math.log10(e); });
/** Energy per half-octave piano band (dB), in a window measured from the onset. */
export const bandEnvelope = (x: Float32Array, sr: number, from: number, to: number) => toBands(meanPower(x, sr, from, to), sr);
/** Mean absolute difference (dB) of two envelopes after each is set to its own loudest band; bands far
 * below both are ignored so noise floors do not count. Level-free: only the tone colour is compared. */
export const envelopeGap = (a: number[], b: number[], floorDb = -50) => {
  const ma = Math.max(...a), mb = Math.max(...b); let s = 0, n = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i] - ma, y = b[i] - mb; if (Math.max(x, y) < floorDb) continue; s += Math.abs(Math.max(x, floorDb) - Math.max(y, floorDb)); n++; }
  return n ? s / n : 0;
};
/** Spectral centroid (Hz) of a window after the onset. */
export const centroidHz = (x: Float32Array, sr: number, from: number, to: number) => { const p = meanPower(x, sr, from, to); let s = 0, w = 0; for (let k = 1; k < p.length; k++) { const f = (k * sr) / FRAME; if (f < 30) continue; s += f * p[k]; w += p[k]; } return w ? s / w : 0; };
/** Decay rate per band (dB per second, positive = falling): a least-squares line through 1024-sample
 * band levels between two times after `start` (s, absolute). Bands that start under `floorDb` from the
 * loudest band, or reach the noise floor inside the window, come back NaN. */
export const bandDecay = (x: Float32Array, sr: number, start: number, from: number, to: number, bands: [number, number][], floorDb = -60) => {
  const a = Math.round((start + from) * sr), b = Math.min(x.length, Math.round((start + to) * sr)), re = new Float64Array(FRAME), im = new Float64Array(FRAME), series: number[][] = bands.map(() => []), ts: number[] = [];
  for (let s = a; s + FRAME <= b; s += HOP) {
    for (let i = 0; i < FRAME; i++) { re[i] = x[s + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FRAME)); im[i] = 0; }
    fft(re, im); ts.push((s - a) / sr);
    bands.forEach(([lo, hi], j) => { let e = 1e-20; for (let k = 1; k < FRAME / 2; k++) { const f = (k * sr) / FRAME; if (f >= lo && f < hi) e += re[k] * re[k] + im[k] * im[k]; } series[j].push(10 * Math.log10(e)); });
  }
  const top = Math.max(...series.map((s) => s[0] ?? -Infinity));
  return series.map((s) => {
    if (s.length < 3 || s[0] < top + floorDb) return NaN;
    const mt = ts.reduce((p, t) => p + t, 0) / ts.length, my = s.reduce((p, y) => p + y, 0) / s.length; let num = 0, den = 0;
    ts.forEach((t, i) => { num += (t - mt) * (s[i] - my); den += (t - mt) * (t - mt); });
    return -num / den;
  });
};
/** How far `played` sits from `truth`, as a fraction of the real soft-to-loud step (`soft` vs `loud`). */
export const ruled = (played: number[], truth: number[], soft: number[], loud: number[]) => envelopeGap(played, truth) / Math.max(0.5, envelopeGap(soft, loud));
export const RULER_WINDOWS = Object.freeze({ attack: [0, 0.15] as const, body: [0.3, 1.5] as const, centroid: [0, 0.3] as const });
export const mono = (ch: Float32Array[]) => { if (ch.length === 1) return ch[0]; const m = new Float32Array(ch[0].length); for (let i = 0; i < m.length; i++) m[i] = 0.5 * (ch[0][i] + ch[1][i]); return m; };

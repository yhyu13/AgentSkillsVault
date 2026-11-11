// AV SYNC. The two measurements verify-export makes on a delivered file's sound, as pure functions
// (no ffmpeg, no browser) so they are unit-tested on synthetic signals:
//   xcorrOffset  where the decoded audio sits against the master mix around one sync marker: the lag
//                (samples, sub-sample by a parabola through the peak) that best lines the decoded window
//                up with the master's. An encoder or muxer that shifts the sound shows up here, exactly.
//   onsetNear    when a cue actually starts in the delivered audio, near the frame it is meant for:
//                the first 1 ms hop whose energy rises 12 dB over the quiet just before the window.
// The two answer different questions: the first is "did the file keep the mix's timing", the second
// "is the sound on its picture frame".
export const mono = (L, R) => { const m = new Float32Array(L.length); for (let i = 0; i < L.length; i++) m[i] = 0.5 * (L[i] + R[i]); return m; };

/** Lag (in samples; + = the decoded sound is late) of `dec` against `ref` around time `t` (s). */
export const xcorrOffset = (ref, dec, t, sr, { win = 0.3, maxLagMs = 40 } = {}) => {
  const W = Math.round(win * sr), a = Math.max(0, Math.round(t * sr - W / 3)), b = Math.min(ref.length, a + W), L = Math.round((maxLagMs / 1000) * sr);
  let e = 0; for (let i = a; i < b; i++) e += ref[i] * ref[i];
  if (e < 1e-9) return { lag: NaN, ms: NaN, corr: 0 };
  const at = (lag) => { let s = 0, d = 0; for (let i = a; i < b; i++) { const j = i + lag; const v = j >= 0 && j < dec.length ? dec[j] : 0; s += ref[i] * v; d += v * v; } return d > 0 ? s / Math.sqrt(e * d) : 0; };
  let best = 0, bc = -Infinity; const c = new Map();
  for (let lag = -L; lag <= L; lag++) { const v = at(lag); c.set(lag, v); if (v > bc) { bc = v; best = lag; } }
  const y0 = c.get(best - 1) ?? bc, y2 = c.get(best + 1) ?? bc, den = y0 - 2 * bc + y2, frac = den < 0 ? (0.5 * (y0 - y2)) / den : 0;
  const lag = best + Math.max(-0.5, Math.min(0.5, frac));
  return { lag, ms: (lag / sr) * 1000, corr: bc };
};

/** The onset time (s) of the sound that starts nearest `t` in [t - before, t + after], or NaN. */
export const onsetNear = (x, t, sr, { before = 0.05, after = 0.08, riseDb = 12, hopMs = 1 } = {}) => {
  const hop = Math.max(1, Math.round((hopMs / 1000) * sr)), e = (i) => { let s = 0; for (let k = i; k < Math.min(x.length, i + hop); k++) s += x[k] * x[k]; return s / hop; };
  const a = Math.max(0, Math.round((t - before) * sr)), b = Math.min(x.length - hop, Math.round((t + after) * sr));
  const pre = []; for (let i = Math.max(0, a - Math.round(0.06 * sr)); i < a; i += hop) pre.push(e(i));
  pre.sort((p, q) => p - q); const floor = Math.max(pre[pre.length >> 1] ?? 0, 1e-10), thr = floor * Math.pow(10, riseDb / 10);
  for (let i = a; i < b; i += hop) if (e(i) > thr) return i / sr;
  return NaN;
};

/** WebVTT / SubRip from caption cues in frames: [{ from, to, text }], lines wrapped at `width` characters, two lines at most. */
const wrap = (s, width = 42) => { const out = []; let line = ""; for (const w of s.split(/\s+/)) { if ((line + " " + w).trim().length > width && line) { out.push(line); line = w; } else line = (line + " " + w).trim(); } out.push(line); return out.length > 2 ? [out[0], out.slice(1).join(" ")] : out; };
const stamp = (sec, sep) => { const ms = Math.round(sec * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}${sep}${String(ms % 1000).padStart(3, "0")}`; };
export const toSrt = (caps, fps) => caps.map((c, i) => `${i + 1}\n${stamp(c.from / fps, ",")} --> ${stamp(c.to / fps, ",")}\n${wrap(c.text).join("\n")}\n`).join("\n");
export const toVtt = (caps, fps) => "WEBVTT\n\n" + caps.map((c) => `${stamp(c.from / fps, ".")} --> ${stamp(c.to / fps, ".")}\n${wrap(c.text).join("\n")}\n`).join("\n");

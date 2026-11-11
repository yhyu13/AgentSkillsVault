// AV SYNC TESTS. verify-export measures a delivered file's sound against its master mix and against
// the picture's own sync frames; these hold the measurements to known answers on synthetic signals.
// @ts-ignore: a plain ES module shared with the tools
import { xcorrOffset, onsetNear, toSrt, toVtt } from "../tools/avsync.mjs";

export const name = "avsync";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const sr = 48000, n = sr * 3, ref = new Float32Array(n);
  let s = 12345; const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296) * 2 - 1;
  for (let i = 0; i < n; i++) ref[i] = 0.05 * rnd(); // a noise bed
  const click = (x: Float32Array, at: number) => { for (let k = 0; k < 480; k++) x[at + k] += 0.8 * Math.exp(-k / 60) * Math.sin(k * 0.9); };
  click(ref, sr * 1); click(ref, Math.round(sr * 2.2));
  for (const shift of [0, 7, -13, 96]) {
    const dec = new Float32Array(n); for (let i = 0; i < n; i++) { const j = i - shift; dec[i] = j >= 0 && j < n ? ref[j] : 0; }
    const r = xcorrOffset(ref, dec, 1.0, sr);
    ok(Math.abs(r.lag - shift) < 0.05, `a ${shift}-sample shift (${((shift / sr) * 1000).toFixed(2)} ms) is measured as ${r.lag.toFixed(2)} samples (corr ${r.corr.toFixed(3)})`);
  }
  // a half-sample shift (linear interpolation) is found to a fraction of a sample
  const half = new Float32Array(n); for (let i = 1; i < n; i++) half[i] = 0.5 * (ref[i] + ref[i - 1]);
  ok(Math.abs(xcorrOffset(ref, half, 1.0, sr).lag - 0.5) < 0.2, `a half-sample delay reads as ${xcorrOffset(ref, half, 1.0, sr).lag.toFixed(2)} samples (sub-sample)`);
  ok(Number.isNaN(xcorrOffset(new Float32Array(n), ref, 1.0, sr).ms), "silence has no offset to measure (NaN, never a fake zero)");
  // onsets: the click at 1.000 s is found within a millisecond, and on the decoded copy 7 samples late
  const t1 = onsetNear(ref, 1.0, sr), late = new Float32Array(n); for (let i = 480; i < n; i++) late[i] = ref[i - 480];
  ok(Math.abs(t1 - 1.0) <= 0.001, `the onset of a cue at 1.000 s is found at ${t1.toFixed(4)} s`);
  ok(Math.abs(onsetNear(late, 1.0, sr) - 1.01) <= 0.001, `a cue 10 ms late reads as ${((onsetNear(late, 1.0, sr) - 1) * 1000).toFixed(1)} ms late`);
  ok(Number.isNaN(onsetNear(ref, 1.6, sr)), "no cue near a frame: NaN, not the nearest noise");
  // captions
  const caps = [{ from: 0, to: 45, text: "a lighthouse at sunset, as a print" }, { from: 3600 * 30 + 15, to: 3600 * 30 + 90, text: "One sentence that says what it is, and then a second sentence that wraps" }];
  const srt = toSrt(caps, 30), vtt = toVtt(caps, 30);
  ok(srt.startsWith("1\n00:00:00,000 --> 00:00:01,500\na lighthouse at sunset, as a print\n"), "SubRip: numbered cues, comma milliseconds");
  ok(/01:00:00,500 --> 01:00:03,000\n.{1,42}\n.+\n/.test(srt), "an hour in, and a long line wraps to two");
  ok(vtt.startsWith("WEBVTT\n\n00:00:00.000 --> 00:00:01.500\n"), "WebVTT: the header and dot milliseconds");
};

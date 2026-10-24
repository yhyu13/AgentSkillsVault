// RECORDING WIDTH TESTS. A stereo recording whose sides are out of phase in the body of the sound is
// narrowed when its bank is registered, so a mono fold keeps it; the air above 2 kHz stays wide; a mono
// recording and a second registration are left alone.
//   node tools/test.mjs recordingWidth
import { registerBank, clearBanks, type SampleBank } from "../src/canvas-core/music/sampler";

export const name = "recordingWidth";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const sr = 48000, n = sr, tone = (f: number, ph: number) => Float32Array.from({ length: n }, (_, i) => 0.3 * Math.sin(2 * Math.PI * f * (i / sr) + ph));
  const corr = (a: Float32Array, b: Float32Array) => { let c = 0, x = 0, y = 0; for (let i = sr / 4; i < n; i++) { c += a[i] * b[i]; x += a[i] ** 2; y += b[i] ** 2; } return c / Math.sqrt(x * y); };
  const zone = (ch: number) => ({ file: `z${ch}.flac`, midi: 60, layer: 1, rr: 1, frames: n, channels: ch, peakDb: -10, rmsDb: -20, sha256: "a".repeat(64) });
  const bank = (chs: Float32Array[]): SampleBank => ({ entry: { title: "t", source: "s", license: "CC0", kind: "struck", range: [48, 72], layers: 1, damped: false, zones: [zone(chs.length)] }, zones: [{ zone: zone(chs.length), channels: chs }] });
  clearBanks();
  const low = registerBank("t.low", bank([tone(500, 0), tone(500, Math.PI * 0.85)])).zones[0].channels;
  ok(corr(tone(500, 0), tone(500, Math.PI * 0.85)) < -0.8 && corr(low[0], low[1]) > 0.3, `a 500 Hz body recorded out of phase (${corr(tone(500, 0), tone(500, Math.PI * 0.85)).toFixed(2)}) is narrowed until a mono fold keeps it (${corr(low[0], low[1]).toFixed(2)})`);
  const high = registerBank("t.high", bank([tone(6000, 0), tone(6000, Math.PI / 2)])).zones[0].channels;
  ok(Math.abs(corr(high[0], high[1])) < 0.1, `the air above 2 kHz keeps its width (${corr(high[0], high[1]).toFixed(2)})`);
  const mono = tone(500, 0), m = registerBank("t.mono", bank([mono])).zones[0].channels;
  ok(m.length === 1 && m[0] === mono, "a mono recording is left alone");
  const again = registerBank("t.again", { ...bank([low[0], low[1]]) }).zones[0].channels;
  ok(again[0] === low[0], "a recording already narrowed is not narrowed twice");
  clearBanks();
};

// Fixed calibration context: default gain, C major / 90 bpm, seed 1, 48 kHz.
// A steady -22.36 dBFS score (220 Hz + 440 Hz + a quiet 4 kHz partial), no modulation.
import { SFX_KINDS, sfxVariants, renderSfx } from "../src/canvas-core/music/sfxKit";
import { sfxDuck, sfxHarshness, type PlacedCue } from "../src/canvas-core/music/sfxMix";
export const survey = () => {
  const sr = 48000, n = sr * 12, L = Float32Array.from({ length: n }, (_, i) => 0.1 * Math.sin(2 * Math.PI * 220 * i / sr) + 0.035 * Math.sin(2 * Math.PI * 440 * i / sr) + 0.02 * Math.sin(2 * Math.PI * 4000 * i / sr));
  const silence: [Float32Array, Float32Array] = [new Float32Array(n), new Float32Array(n)];
  return SFX_KINDS.flatMap((kind) => sfxVariants(kind).flatMap((variant) => {
    const sound = renderSfx(kind, { variant, key: "C", bpm: 90 }, sr), start = 4 * sr - sound.hit;
    const pc: PlacedCue = { i: 0, cue: { kind, variant, frame: 120 }, sound, hitS: 4, snappedFromS: 4, start, window: [start + sound.window[0], start + sound.window[1]] };
    const duck = sfxDuck([pc], n, sr), bed = Float32Array.from(L, (x, i) => x * duck[i]);
    return ([["silence", silence], ["score", [bed, bed]]] as [string, [Float32Array, Float32Array]][]).map(([context, music]) => ({ context, ...sfxHarshness([pc], music, sr, {})[0] }));
  }));
};

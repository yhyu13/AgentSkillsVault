import { Biquad } from '../canvas-core/music/dsp';
export type AudioPayload = { sampleRate: number; frames: number; float32: string };

/** Embedded Float32 is the complete Node mix, including cues. No decoder or fetch changes it. */
export const embeddedAudio = (a: AudioPayload) => {
  const bytes = atob(a.float32), data = new Uint8Array(bytes.length);
  for (let i = 0; i < data.length; i++) data[i] = bytes.charCodeAt(i);
  if (data.length !== a.frames * 8 || !Number.isSafeInteger(a.sampleRate) || a.sampleRate <= 0) throw new Error('invalid embedded film audio');
  const view = new DataView(data.buffer), L = new Float32Array(a.frames), R = new Float32Array(a.frames);
  for (let i = 0; i < a.frames; i++) { L[i] = view.getFloat32(i * 8, true); R[i] = view.getFloat32(i * 8 + 4, true); }
  const cache = new Map<number, [Float32Array, Float32Array]>([[a.sampleRate, [L, R]]]);
  return (sr: number): [Float32Array, Float32Array] => {
    if (!Number.isSafeInteger(sr) || sr <= 0) throw new Error('invalid film audio sample rate');
    const hit = cache.get(sr); if (hit) return hit;
    const resample = (c: Float32Array) => {
      const source = Float32Array.from(c);
      if (sr < a.sampleRate) for (const q of [0.5412, 1.3066]) Biquad.make(a.sampleRate, 'lp', sr * 0.45, q).run(source);
      const out = new Float32Array(Math.round(a.frames * sr / a.sampleRate));
      for (let i = 0; i < out.length; i++) { const x = i * a.sampleRate / sr, j = Math.floor(x), f = x - j; out[i] = (source[j] ?? 0) * (1 - f) + (source[Math.min(j + 1, source.length - 1)] ?? 0) * f; }
      return out;
    };
    const out: [Float32Array, Float32Array] = [resample(L), resample(R)]; cache.set(sr, out); return out;
  };
};

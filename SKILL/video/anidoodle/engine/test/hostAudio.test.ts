import { embeddedAudio } from '../src/hosts/audio';
export const name = 'embedded film track';
export const run = (ok: (cond: boolean, label: string) => void) => {
  const sr = 48000, n = sr / 10, bytes = new Uint8Array(n * 8), view = new DataView(bytes.buffer);
  for (let i = 0; i < n; i++) { view.setFloat32(i * 8, 1.4 * Math.sin(2 * Math.PI * 18000 * i / sr), true); view.setFloat32(i * 8 + 4, -0.25, true); }
  const audio = embeddedAudio({ sampleRate: sr, frames: n, float32: btoa(String.fromCharCode(...bytes)) }), [L, R] = audio(sr);
  ok(L.every((v, i) => v === view.getFloat32(i * 8, true)) && R.every(v => v === -0.25), 'embedded stereo keeps every Float32 sample, including unclipped values');
  const [down] = audio(24000), [up] = audio(96000), [device] = audio(44100);
  ok(down.length === n / 2 && up.length === n * 2 && device.length === 4410, 'alternate sample rates keep the complete track duration');
  ok(down.slice(100).reduce((e, x) => e + x * x, 0) / down.length < 0.01, 'downsampling removes tones above the new Nyquist frequency');
  ok(audio(sr)[0].every((v, i) => v === view.getFloat32(i * 8, true)), 'sample-rate conversion leaves the pinned 48 kHz master untouched');
};

// Interleaved stereo Float32 transport stays unclipped until the final AAC encoder.
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { overlay } from './overlay.mjs';
import { splitShape, requireFilm } from './names.mjs';
import { loadBanks, soundIds, printSounds, soundsNotice } from './sounds.mjs';
import { soundsDir } from './soundfetch.mjs';
import { isMain } from "./is-main.mjs";
let filmModuleId = 0;

/** Film and music registry share one bundle, so its audio closure sees the loaded banks. */
export const loadFilmModule = async (title, plugins = [overlay]) => {
  const { base, shape } = splitShape(title);
  const js = (await build({ stdin: { contents: `export { ${base} as film } from "./src/canvas-core/${base}"; export * as music from "./src/canvas-core/music/index";`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, format: 'esm', write: false, platform: 'neutral', plugins })).outputFiles[0].text;
  const mod = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64') + `#film-${++filmModuleId}`);
  if (shape && !mod.film.reshape) throw new Error(`${base} has one shape; ${shape} needs film.reshape`);
  return { film: shape ? mod.film.reshape(shape) : mod.film, music: mod.music };
};
export const prepareFilmSounds = (film, M, pack = process.env.ANIDOODLE_SOUNDS || soundsDir()) => {
  M.clearBanks(); M.clearRooms();
  if (!film.audio) return false;
  const scores = film.audio.scores ?? [];
  loadBanks(M, pack, [...new Set(scores.flatMap(soundIds))]);
  for (const p of scores) printSounds(M, p);
  const recorded = scores.some(p => !p.legacy && (p.parts.some(part => part.notes.length && part.opts?.sampled !== false && M.bankFor(part.inst, typeof part.opts?.variant === 'string' ? part.opts.variant : undefined)) ||
    [p.plan.space?.room ?? M.mixProfile(p.plan.style, p.mix).space?.room, M.mixProfile(p.plan.style, p.mix).drumRoom?.room].some(id => M.roomFor(id))));
  soundsNotice(M, scores);
  return recorded;
};
export const filmFloat32 = (film, sampleRate = 48000) => {
  if (!film.audio) return null;
  const [L, R] = film.audio(sampleRate);
  if (L.length !== R.length) throw new Error('audio channels have different lengths');
  const pcm = Buffer.alloc(L.length * 8);
  for (let i = 0; i < L.length; i++) { pcm.writeFloatLE(L[i], i * 8); pcm.writeFloatLE(R[i], i * 8 + 4); }
  return { sampleRate, frames: L.length, float32: pcm.toString('base64') };
};
export const float32Wav = ({ sampleRate, frames, float32 }) => {
  const pcm = Buffer.from(float32, "base64");
  if (!Number.isSafeInteger(sampleRate) || sampleRate < 1 || pcm.length !== frames * 8) throw new Error("invalid stereo Float32 audio payload");
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(sampleRate, 24); h.writeUInt32LE(sampleRate * 8, 28);
  h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34);
  h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
};
if (isMain(import.meta.url)) {
  const title = requireFilm(process.argv[2], 'audio', 'node tools/audio.mjs <film> <out.wav>');
  if (!process.argv[3]) throw new Error('audio needs an output WAV path');
  const { film, music } = await loadFilmModule(title);
  prepareFilmSounds(film, music);
  const audio = filmFloat32(film);
  if (!audio) throw new Error(`${title}: silent film`);
  writeFileSync(process.argv[3], float32Wav(audio));
  console.log(`audio: ${audio.frames} frames @ ${audio.sampleRate} Hz -> ${process.argv[3]}`);
}

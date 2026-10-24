// CAPTIONS. The words a viewer reads in a film, as sidecar caption files: SubRip (.srt) and WebVTT
// (.vtt), timed in the film's own frames (meta.captions; a launch template film writes them from
// its prompts, its word pages, its split beats and its end card). Feeds autoplay muted: the captions
// are the channel most viewers get. A platform that takes a sidecar (YouTube, LinkedIn, the site's
// <track>) gets these; a feed that does not gets them burned into their own band (captions: "burn").
//   node tools/captions.mjs <film>[-<shape>] [--out out/<film>]     writes <out>.srt and <out>.vtt
import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { overlay } from "./overlay.mjs";
import { requireFilm, splitShape } from "./names.mjs";
import { toSrt, toVtt } from "./avsync.mjs";
import { isMain } from "./is-main.mjs";

export const loadFilm = async (name) => {
  const { base, shape } = splitShape(name);
  const js = (await build({ stdin: { contents: `export { ${base} as film } from "./src/canvas-core/${base}";`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, format: "esm", write: false, platform: "neutral", plugins: [overlay], logLevel: "error" })).outputFiles[0].text;
  const { film } = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
  return shape ? film.reshape(shape) : film;
};
export const filmMeta = async (name) => (await loadFilm(name)).meta;
export const writeCaptions = async (name, out = `out/${name}`) => {
  const meta = await filmMeta(name), caps = meta.captions ?? [];
  if (!caps.length) return { count: 0, files: [] };
  mkdirSync(dirname(resolve(out)), { recursive: true });
  const srt = resolve(`${out}.srt`), vtt = resolve(`${out}.vtt`);
  writeFileSync(srt, toSrt(caps, meta.fps)); writeFileSync(vtt, toVtt(caps, meta.fps));
  return { count: caps.length, files: [srt, vtt] };
};
if (isMain(import.meta.url)) {
  const name = requireFilm(process.argv[2], "captions", "node tools/captions.mjs <film>[-<shape>] [--out out/<film>]");
  const i = process.argv.indexOf("--out"), r = await writeCaptions(name, i > 0 ? process.argv[i + 1] : undefined);
  if (!r.count) { console.error(`captions: ${name} has no meta.captions (a launch template film writes them; add your own to meta.captions)`); process.exit(1); }
  console.log(`captions: ${r.count} cues -> ${r.files.join(", ")}`);
}

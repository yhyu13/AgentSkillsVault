// Build ONE self-contained HTML file: the art core + film, bundled, with every asset in the
// manifest inlined as a data URI. No network, no server, no sibling files.
import { build } from "esbuild";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { extname, join, relative, resolve } from "node:path";
import { overlay, resolveOverlay } from "./overlay.mjs";
import { requireFilm, splitShape } from "./names.mjs";
import { loadFilmModule, prepareFilmSounds, filmFloat32 } from './audio.mjs';
import { isMain } from "./is-main.mjs";

// BAKE KEYS (see Env.bake and hosts/page.ts). Every module that exports `const X: Film` is tagged
// in the bundle with its own path, and each tagged module gets a hash of its WHOLE import closure
// (file contents, not timestamps) plus the renderer and this format's version. Change one line
// anywhere a plate's pixels come from and its key changes, so a stale bake can never be served.
const BAKE_FORMAT = "bake-1";
const FILM_EXPORT = /export\s+const\s+([A-Za-z_$][\w$]*)\s*:\s*Film\b/g;
const tagFilms = {
  name: "anidoodle-film-tags",
  setup(b) {
    b.onLoad({ filter: /[\\/]canvas-core[\\/].*\.ts$/ }, (a) => {
      const src = readFileSync(a.path, "utf8"), names = [...src.matchAll(FILM_EXPORT)].map((m) => m[1]);
      if (!names.length) return undefined;
      const rel = relative(process.cwd(), a.path).split("\\").join("/");
      return { contents: `${src}\n;{ const t = ((globalThis as any).__ANIDOODLE_SRC__ ??= new WeakMap()); ${names.map((n) => `t.set(${n}, ${JSON.stringify(rel)});`).join(" ")} }\n`, loader: "ts" };
    });
  },
};
const bakeHashes = (metafile, salt) => {
  const inputs = metafile.inputs, fileHash = new Map(), memo = new Map();
  const h = (p) => { if (!fileHash.has(p)) fileHash.set(p, createHash("sha256").update(readFileSync(resolve(p))).digest("hex")); return fileHash.get(p); };
  const closure = (p, seen = new Set()) => { if (seen.has(p) || !inputs[p]) return seen; seen.add(p); for (const i of inputs[p].imports ?? []) closure(i.path, seen); return seen; };
  const out = {};
  for (const p of Object.keys(inputs)) {
    if (!/canvas-core\/.*\.ts$/.test(p)) continue;
    const src = readFileSync(resolve(p), "utf8"); if (!src.match(FILM_EXPORT)) continue;
    const all = [...closure(p)].sort(), d = createHash("sha256").update(salt);
    for (const q of all) d.update(`${q}\0${h(q)}\0`);
    if (!memo.has(p)) memo.set(p, d.digest("hex").slice(0, 24));
    out[p.split("\\").join("/")] = memo.get(p);
  }
  return out;
};

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
export const buildPage = async ({ entry, out, title, plugins: extra = [] }) => {
  const plugins = [...extra, overlay]; // extra first: a caller's shim (snap --only) outranks the overlay
  // <film>-<shape>: the film's own host page, told which shape to compose (hosts/page.ts reshapes it)
  const { base, shape } = splitShape(title);
  if (shape) { entry = entry.replace(`page-${title}.ts`, `page-${base}.ts`); title = base; }
  if (!existsSync(entry)) entry = resolveOverlay("./" + entry, process.cwd()) ?? entry; // e.g. the example's own host page
  if (!existsSync(entry) && title) requireFilm(title, "build", "a film name: src/hosts/page-<film>.ts"); // a clear exit with the known films, not an esbuild trace
  const main = await build({ absWorkingDir: process.cwd(), entryPoints: [resolve(entry)], bundle: true, format: "iife", target: "es2020", minify: true, write: false, legalComments: "none", metafile: true, plugins: [...plugins, tagFilms] });
  const js = main.outputFiles[0].text;
  // read the manifest out of the film module itself, so the page and the film can never disagree
  const { film, music } = await loadFilmModule(shape ? `${title}-${shape}` : title, plugins);
  const recorded = prepareFilmSounds(film, music), audio = recorded ? filmFloat32(film) : null;
  const assets = Object.fromEntries(Object.entries(film.assets.images).map(([name, file]) => { const mime = MIME[extname(file).toLowerCase()]; if (!mime) throw new Error(`asset '${name}': unsupported type ${file}`); return [name, `data:${mime};base64,${readFileSync(join(process.cwd(), file)).toString("base64")}`]; }));
  // the renderer that draws every plate frame, and the assets any plate may read, salt every key
  const salt = [BAKE_FORMAT, ...["src/canvas-core/film.ts", "src/canvas-core/core.ts"].map((f) => readFileSync(resolve(f), "utf8")), JSON.stringify(assets)].join("\0");
  const bakeSrc = bakeHashes(main.metafile, salt);
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${film.meta.title}</title>
<style>html,body{margin:0;height:100%;background:#1b1a1a;display:grid;place-items:center}canvas{max-width:100vw;max-height:100vh;aspect-ratio:${film.meta.W}/${film.meta.H};cursor:pointer;background:#fff}</style></head>
<body><canvas id="film"></canvas><script>window.__ASSETS__=${JSON.stringify(assets)};window.__BAKE_SRC__=${JSON.stringify(bakeSrc)};${audio ? `window.__AUDIO__=${JSON.stringify(audio)};` : ''}${shape ? `window.__SHAPE__=${JSON.stringify(shape)};` : ""}</script><script>${js.replace(/<\/script/g, "<\\/script")}</script></body></html>`;
  mkdirSync(join(out, ".."), { recursive: true }); writeFileSync(out, html);
  const meta = film.meta;
  return { out, bytes: html.length, meta, assets: Object.keys(film.assets.images) };
};
if (isMain(import.meta.url)) { const title = requireFilm(process.argv[2], "build-page", "node tools/build-page.mjs <film>"); const r = await buildPage({ entry: `src/hosts/page-${title}.ts`, out: `dist/${title}.html`, title }); console.log(`built ${r.out} (${(r.bytes / 1024).toFixed(0)} KB, self-contained)`); }

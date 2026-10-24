// Names shared by the tools: where a film's MP4 lands by default, and which films exist.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ROOTS } from "./overlay.mjs";

export const defaultOutput = (film) => `out/${film}.mp4`;

// A film in another frame shape: <film>-<shape> (launchExample-9x16). The host page is the film's own;
// the page reshapes the film (film.reshape, which a launch template film has). One timeline, many shapes.
export const SHAPE_NAMES = ["16x9", "1x1", "4x5", "9x16"];
export const splitShape = (film) => { const m = /^(.+)-(16x9|1x1|4x5|9x16)$/.exec(film ?? ""); return m ? { base: m[1], shape: m[2] } : { base: film, shape: null }; };

/** Every film this project can build: one host page, src/hosts/page-<film>.ts (the worked example's too). */
export const knownFilms = () => [...new Set([join(process.cwd(), "src"), ...ROOTS].flatMap((r) => { const d = join(r, "hosts"); return existsSync(d) ? readdirSync(d).filter((f) => /^page-.+\.ts$/.test(f)).map((f) => f.slice(5, -3)) : []; }))].sort();
const hostOf = (film) => [join(process.cwd(), "src"), ...ROOTS].map((r) => join(r, "hosts", `page-${splitShape(film).base}.ts`)).find((f) => existsSync(f));

/** The film named on the command line, or a clear exit: the usage when none is given, the known films when it is not one. */
export const requireFilm = (film, tool, usage) => {
  const list = () => { const k = knownFilms(); return `known films (${k.length}): ${k.join(", ")}`; };
  if (!film || film.startsWith("--")) { console.error(`usage: ${usage}\n${list()}`); process.exit(2); }
  if (!/^[A-Za-z_$][\w$]*$/.test(splitShape(film).base) || !hostOf(film)) {
    const path = /[\\/.]/.test(film) ? `: '${film}' looks like a file path; ${tool} takes a film name (the module src/canvas-core/<film>.ts with its host page src/hosts/page-<film>.ts)` : `: no host page src/hosts/page-${film}.ts`;
    console.error(`${tool}: unknown film '${film}'${path}\n${list()}`); process.exit(2);
  }
  return film;
};

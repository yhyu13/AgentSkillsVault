// FILM SHAPE TESTS. A finished film's sound starts with the picture, never drops out, and ends with it;
// a silence the film declares in meta.quiet is not a fault.
//   node tools/test.mjs filmshape
// @ts-ignore: a plain ES module shared with the tools
import { filmShape } from "../tools/filmshape.mjs";

export const name = "filmshape";
export const run = (ok: (cond: boolean, label: string) => void) => {
  const sr = 8000, film = (secs: number, on: (t: number) => boolean) => { const n = sr * secs, L = new Float32Array(n), R = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / sr, v = on(t) ? 0.2 * Math.sin(2 * Math.PI * 330 * t) : 0; L[i] = v; R[i] = v; } return [L, R] as const; };
  const kinds = (r: ReturnType<typeof filmShape>) => r.problems.map((p: { kind: string }) => p.kind).join(",");
  ok(kinds(filmShape(...film(6, () => true), sr)) === "", "sound from start to end: a finished shape");
  ok(kinds(filmShape(...film(6, (t) => t > 1.2), sr)) === "late start", "a film that starts 1.2 s late is caught");
  const dead = filmShape(...film(16, (t) => t < 5.4), sr);
  ok(kinds(dead) === "dead end" && Math.abs(dead.endS - 10.6) < 0.15, `sound that stops at 5.4 s of 16 is a dead end (${dead.endS.toFixed(1)} s)`);
  const hole = filmShape(...film(8, (t) => t < 3.1 || t > 6.4), sr);
  ok(kinds(hole) === "hole" && Math.abs(hole.holeS - 3.3) < 0.15, `a 3.3 s hole in the middle is caught (${hole.holeS.toFixed(1)} s)`);
  ok(kinds(filmShape(...film(8, (t) => t < 3.1 || t > 3.3), sr)) === "", "a 0.2 s breath is not a hole");
  ok(kinds(filmShape(...film(8, (t) => t < 3.1 || t > 4.0), sr, { fps: 30, quiet: [[90, 123, "a held breath before the reveal"]] })) === "", "a declared held breath is not a fault");
  ok(kinds(filmShape(...film(4, () => false), sr)) === "silent", "a silent film is caught");
};

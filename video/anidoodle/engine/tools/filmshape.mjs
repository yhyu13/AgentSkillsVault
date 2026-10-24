// FILM SHAPE. Whether a film's sound has the shape of a finished piece: it starts with the picture, it
// never drops out mid-film, and it ends with the film instead of stopping early and leaving dead air.
// Measured in 100 ms blocks against the mix's own body level (the median of its active blocks), so a
// quiet film and a loud one are judged alike. A silence the film means (a held breath before a reveal, a
// pause on a beat) is declared in meta.quiet as [fromFrame, toFrame, reason] and is not a fault.
//   import { filmShape } from "./filmshape.mjs"; filmShape(L, R, sr, { fps, quiet })
export const SHAPE = Object.freeze({ firstS: 0.5, holeS: 0.25, endS: 0.5, quietDb: 30, bodyDb: 20 });

export const filmShape = (L, R, sr, o = {}) => {
  const B = Math.round(sr * 0.1), nb = Math.floor(L.length / B), lv = new Float64Array(nb);
  for (let b = 0; b < nb; b++) { let s = 0; for (let i = b * B; i < (b + 1) * B; i++) s += L[i] * L[i] + R[i] * R[i]; lv[b] = 10 * Math.log10(s / (2 * B) + 1e-20); }
  const active = [...lv].filter((v) => v > -70).sort((a, b) => a - b), body = active.length ? active[Math.floor(active.length / 2)] : -Infinity;
  const fps = o.fps ?? 30, quiet = (o.quiet ?? []).map(([a, b]) => [a / fps, b / fps]);
  const declared = (t0, t1) => quiet.some(([a, b]) => a <= t0 + 0.05 && b >= t1 - 0.05);
  const silent = (b) => lv[b] < body - SHAPE.quietDb, problems = [];
  if (!Number.isFinite(body)) return { body, problems: [{ kind: "silent", atS: 0, durS: nb / 10, msg: "the whole film is silent" }], firstS: NaN, endS: NaN, holeS: 0 };
  let first = 0; while (first < nb && lv[first] < body - SHAPE.bodyDb) first++;
  const firstS = first / 10; if (firstS > SHAPE.firstS && !declared(0, firstS)) problems.push({ kind: "late start", atS: 0, durS: firstS, msg: `nothing reaches body level until ${fmt(firstS)}` });
  let last = nb - 1; while (last >= 0 && silent(last)) last--;
  const endS = (nb - 1 - last) / 10; if (endS > SHAPE.endS && !declared((last + 1) / 10, nb / 10)) problems.push({ kind: "dead end", atS: (last + 1) / 10, durS: endS, msg: `the sound stops at ${fmt((last + 1) / 10)} and the picture runs ${endS.toFixed(1)} s more` });
  let holeS = 0;
  for (let b = first; b <= last; ) {
    if (!silent(b)) { b++; continue; }
    const a = b; while (b <= last && silent(b)) b++;
    const d = (b - a) / 10; holeS = Math.max(holeS, d);
    if (d > SHAPE.holeS && !declared(a / 10, b / 10)) problems.push({ kind: "hole", atS: a / 10, durS: d, msg: `a ${d.toFixed(1)} s hole at ${fmt(a / 10)}` });
  }
  return { body, problems, firstS, endS, holeS };
};
const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

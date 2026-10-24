// FRAMECHECK. Design faults the determinism gate cannot see, found on the frames themselves.
//   1. Cut by the edge. Every line of text (fillText, writeOn, setType) and every content box the art
//      reports (probeRect: an answer card, a product window, a film's card) must lie wholly inside the
//      frame or wholly outside it, on every frame checked. A deliberate full-bleed is not reported as a box.
//   2. Reading time. Each declared text cue (meta.captions) stays up for max(0.7 s, 0.3 s per word).
//      A film that declares no cues reports N/A, never a pass.
//   3. Phone safe zones, 9:16 frames only. No text inside the top band, the bottom band or the right
//      button column the platforms cover with their own interface. Other shapes report N/A.
// The rules and their numbers are textrules.mjs.
//   node tools/framecheck.mjs <film>[-<shape>] [--every 1] [--from F] [--to T] [--zones fail|warn]
// --zones warn lists safe-zone text as FLAG and does not fail the run (launch.mjs ship passes it on with
// its own --zones warn; by default safe-zone text fails). Reading time and the edge cut always fail.
import { resolve } from "node:path";
import { buildPage } from "./build-page.mjs";
import { detect } from "./detect.mjs";
import * as playwright from "./adapters/playwright.mjs";
import { requireFilm } from "./names.mjs";
import { isMain } from "./is-main.mjs";
import { SAFE_ZONES, isPortrait916, readingTime, safeZoneHits } from "./textrules.mjs";

const USAGE = "node tools/framecheck.mjs <film>[-<shape>] [--every 1] [--from F] [--to T] [--zones fail|warn]";
export const frameCheck = async (film, { every = 1, from = 0, to } = {}) => {
  const page = await buildPage({ entry: `src/hosts/page-${film}.ts`, out: resolve(`dist/${film}.html`), title: film });
  const s = await playwright.open(detect(), page.out, { workers: 1 }), meta = await s.info(), N = to ?? meta.durationFrames, portrait = isPortrait916(meta.W, meta.H);
  const frames = []; for (let f = from; f < N; f += every) frames.push(f);
  const recs = []; for (let i = 0; i < frames.length; i += 40) recs.push(...(await s.probe(frames.slice(i, i + 40), portrait)));
  await s.close();
  return { meta, frames: frames.length, bad: recs.filter((r) => r.cut !== false), reading: readingTime(meta.captions, meta.fps), zones: safeZoneHits(recs, meta.W, meta.H) };
};
if (isMain(import.meta.url)) {
  const pos = [], opt = {};
  for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith("--")) opt[a.slice(2)] = process.argv[++i]; else pos.push(a); }
  const film = requireFilm(pos[0], "framecheck", USAGE), warnZones = opt.zones === "warn";
  if (opt.zones !== undefined && !["fail", "warn"].includes(opt.zones)) { console.error(`framecheck: --zones is fail or warn, got '${opt.zones}'\nusage: ${USAGE}`); process.exit(2); }
  const r = await frameCheck(film, { every: Number(opt.every ?? 1), from: Number(opt.from ?? 0), to: opt.to === undefined ? undefined : Number(opt.to) });
  const list = (fs) => `${fs.slice(0, 8).join(", ")}${fs.length > 8 ? " ..." : ""}`;
  const groups = new Map(); for (const b of r.bad) { const k = `${b.kind} "${b.label.slice(0, 48)}"`; const g = groups.get(k) ?? []; g.push(b.frame); groups.set(k, g); }
  console.log(`FRAMECHECK   ${film}   ${r.meta.W}x${r.meta.H}, ${r.frames} frames`);
  for (const [k, fs] of groups) { const b = r.bad.find((x) => `${x.kind} "${x.label.slice(0, 48)}"` === k); console.log(`  FAIL  ${k} cut by the frame's edge on ${fs.length} frame(s): ${list(fs)}   box ${[b.x0, b.y0, b.x1, b.y1].map((v) => Math.round(v)).join(",")}`); }
  const rd = r.reading, zn = r.zones;
  for (const b of rd.bad) console.log(`  FAIL  text "${b.text.slice(0, 48)}" is up ${b.seconds} s from frame ${b.from}; reading it takes ${b.need} s`);
  for (const h of zn.hits ?? []) console.log(`  ${warnZones ? "FLAG" : "FAIL"}  text "${h.label.slice(0, 48)}" sits in the ${h.zone} on ${h.frames.length} frame(s): ${list(h.frames)}`);
  const zp = (x) => Math.round(x * 100);
  console.log(`  READING-TIME: ${rd.status}${rd.status === "N/A" ? `   ${rd.reason}` : `   ${rd.checked} cue(s), each at least max(0.7 s, 0.3 s per word)`}`);
  console.log(`  SAFE-ZONES:   ${zn.status === "FAIL" && warnZones ? "FLAG" : zn.status}${zn.status === "N/A" ? `   ${zn.reason}` : `   ${zn.hits.length ? `${zn.hits.length} text(s) inside` : "no text in"} the top ${zp(SAFE_ZONES.top)}%, bottom ${zp(SAFE_ZONES.bottom)}% or right ${zp(SAFE_ZONES.right)}% of the frame`}`);
  const nz = zn.hits?.length ?? 0, fails = groups.size + rd.bad.length + (warnZones ? 0 : nz);
  console.log(fails ? `FRAMECHECK: FAIL   ${fails} problem(s): ${groups.size} cut by the frame's edge, ${rd.bad.length} read too briefly, ${warnZones ? 0 : nz} in a phone safe zone` : `FRAMECHECK: PASS   no text or content box cut by the frame's edge; reading time ${rd.status}; safe zones ${nz ? `FLAGGED (${nz} text(s))` : zn.status}`);
  process.exit(fails ? 1 : 0);
}

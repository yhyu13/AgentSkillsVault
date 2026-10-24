// PLACEMENT. Site art has a zone the art must never enter: the headline's. This reads a rendered still
// and fails if anything (a part, a cast shadow, a highlight) is drawn there, then writes the picture at phone
// width so you look at it the size most visitors will.
//   node tools/placement.mjs out/hero.png --W 1200 --safe 0,0,480,640 [--paper #faf7f2] [--tol 6] [--phone out/hero-390.png]
// --W is the film's logical width (meta.W); --safe is in the same units (assetKit PLACEMENTS[...].safe).
// --paper defaults to the commonest colour in the picture, which on site art is the page.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const file = process.argv[2] && resolve(process.argv[2]);
if (!file || !existsSync(file)) { console.error("usage: node tools/placement.mjs <still.png> --W <logical width> --safe x,y,w,h [--paper #hex] [--tol 6] [--phone out.png]"); process.exit(2); }
const { width: w, height: h } = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", file])).streams[0];
const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: w * h * 3 + 1024 });
const k = w / Number(arg("W", w)), tol = Number(arg("tol", 6));

let paper = arg("paper");
if (!paper) { const n = new Map(); for (let i = 0; i < raw.length; i += 3 * 7) { const c = (raw[i] << 16) | (raw[i + 1] << 8) | raw[i + 2]; n.set(c, (n.get(c) ?? 0) + 1); } paper = "#" + [...n].sort((a, b) => b[1] - a[1])[0][0].toString(16).padStart(6, "0"); }
const pv = parseInt(paper.slice(1), 16), pr = (pv >> 16) & 255, pg = (pv >> 8) & 255, pb = pv & 255;

let fail = false;
const safe = arg("safe");
if (safe) {
  const [sx, sy, sw, sh] = safe.split(",").map((v) => Math.round(Number(v) * k));
  let count = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = Math.max(0, sy); y < Math.min(h, sy + sh); y++) for (let x = Math.max(0, sx); x < Math.min(w, sx + sw); x++) {
    const i = (y * w + x) * 3;
    if (Math.abs(raw[i] - pr) > tol || Math.abs(raw[i + 1] - pg) > tol || Math.abs(raw[i + 2] - pb) > tol) { count++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  }
  fail = count > 0;
  console.log(`  ${fail ? "FAIL" : "PASS"}  headline zone ${safe} on ${paper}: ${count ? `${count} px of art inside, x ${(x0 / k).toFixed(0)}-${(x1 / k).toFixed(0)}, y ${(y0 / k).toFixed(0)}-${(y1 / k).toFixed(0)}` : "clean"}`);
}
const phone = arg("phone");
if (phone) { execFileSync("ffmpeg", ["-v", "error", "-y", "-i", file, "-vf", "scale=390:-1:flags=area", phone]); console.log(`  phone width (390 px): ${resolve(phone)}  look at it`); }
console.log(`PLACEMENT: ${fail ? "FAIL" : "PASS"}`);
process.exit(fail ? 1 : 0);

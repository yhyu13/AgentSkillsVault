// node tools/popscan.mjs <film|path.mp4> [--from F] [--to T] [--grid 12] [--min 0.4] [--ratio 0.35] [--json]
// POPSCAN. Finds the one-frame pop: a frame that differs from BOTH neighbours while the
// neighbours agree with each other (a flashed element, a vanished element, a one-frame jump).
// A hard cut is not a pop (after it, f and f+1 agree); fast continuous motion is not a pop
// (f-1 and f+1 differ too); an intentional one-frame flash IS listed - a human reviews, the
// tool never fails a film. The first and last frames cannot pop: a pop needs both neighbours.
//
// Measured per TILE, not per frame: a small pop inside a busy frame vanishes in a whole-frame
// number. Decoded small and grey like deadair, split into a grid x grid of tiles, three
// differences per tile: in = d(f-1,f), out = d(f,f+1), across = d(f-1,f+1). A tile pops when
// in and out are both at least --min percent of the tile and across is at most --ratio of the
// smaller of the two. Adjacent (diagonals count) popping tiles on one frame are ONE finding
// with a bounding box. `kind` is a cheap guess from texture in the box: appears/vanishes
// add/remove it, jumps rearrange it. --from/--to bound which frames may be findings; the
// decode still runs from 0 so frame numbers stay absolute (a --to stops it early).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { basename, resolve } from "node:path";
import { greyFrames } from "./motion.mjs";
import { isMain } from "./is-main.mjs";

// The detector: pure, frames in -> findings out, no I/O. `frames` is any (sync or async)
// iterable of width*height greyscale bytes. Findings: { frame, box [x0,y0,x1,y1] as frame
// fractions, in, out, across as changed shares 0..1, tiles, kind }.
export const scanPops = async (frames, { width: W, height: H, grid = 12, min = 0.004, ratio = 0.35, thresh = 4, from = 1, to = Infinity } = {}) => {
  const g2 = grid * grid, px = W * H;
  const tileOf = new Uint16Array(px), size = new Uint32Array(g2);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const t = Math.floor((y * grid) / H) * grid + Math.floor((x * grid) / W); tileOf[y * W + x] = t; size[t]++; }
  const diff = (a, b) => { const c = new Uint32Array(g2); for (let i = 0; i < px; i++) if (Math.abs(a[i] - b[i]) > thresh) c[tileOf[i]]++; return Float64Array.from(c, (v, t) => v / size[t]); };
  const std = (f, x0, y0, x1, y1) => { let s = 0, s2 = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const v = f[y * W + x]; s += v; s2 += v * v; } const n = (x1 - x0) * (y1 - y0), m = s / n; return Math.sqrt(Math.max(0, s2 / n - m * m)); };
  const findings = [];
  let index = -1, p2 = null, p1 = null, dIn = null;
  for await (const cur of frames) {
    index++;
    if (p1 === null) { p1 = cur; continue; }
    const dOut = diff(p1, cur), f = index - 1;
    const dAcross = dIn && p2 && f >= from && f <= to ? diff(p2, cur) : null; // skip the third diff on ineligible frames
    if (dAcross) {
      const hit = new Uint8Array(g2);
      for (let t = 0; t < g2; t++) if (dIn[t] >= min && dOut[t] >= min && dAcross[t] <= ratio * Math.min(dIn[t], dOut[t])) hit[t] = 1;
      const seen = new Uint8Array(g2);
      for (let t = 0; t < g2; t++) {
        if (!hit[t] || seen[t]) continue;
        const stack = [t], tiles = []; seen[t] = 1;
        let tx0 = grid, ty0 = grid, tx1 = -1, ty1 = -1;
        while (stack.length) {
          const u = stack.pop(); tiles.push(u);
          const uy = Math.floor(u / grid), ux = u % grid;
          tx0 = Math.min(tx0, ux); ty0 = Math.min(ty0, uy); tx1 = Math.max(tx1, ux); ty1 = Math.max(ty1, uy);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const vy = uy + dy, vx = ux + dx;
            if (vx < 0 || vy < 0 || vx >= grid || vy >= grid) continue;
            const v = vy * grid + vx;
            if (hit[v] && !seen[v]) { seen[v] = 1; stack.push(v); }
          }
        }
        let iN = Infinity, oU = Infinity, aC = 0;
        for (const t of tiles) { iN = Math.min(iN, dIn[t]); oU = Math.min(oU, dOut[t]); aC = Math.max(aC, dAcross[t]); }
        const px0 = Math.floor((tx0 * W) / grid), py0 = Math.floor((ty0 * H) / grid), px1 = Math.floor(((tx1 + 1) * W) / grid), py1 = Math.floor(((ty1 + 1) * H) / grid);
        const dStd = std(p1, px0, py0, px1, py1) - (std(p2, px0, py0, px1, py1) + std(cur, px0, py0, px1, py1)) / 2;
        findings.push({ frame: f, tiles: tiles.length, box: [px0 / W, py0 / H, px1 / W, py1 / H], in: iN, out: oU, across: aC, kind: dStd > 3 ? "appears" : dStd < -3 ? "vanishes" : "jumps" });
      }
    }
    p2 = p1; p1 = cur; dIn = dOut;
  }
  return findings;
};

const MAIN = isMain(import.meta.url);
if (MAIN) {
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const die = (m) => { console.error(`popscan: ${m}`); process.exit(2); };
  const a0 = process.argv[2];
  if (!a0 || a0.startsWith("--")) { console.error("usage: node tools/popscan.mjs <film|path.mp4> [--from F] [--to T] [--grid 12] [--min 0.4] [--ratio 0.35] [--json]"); process.exit(2); }
  const file = resolve(a0.endsWith(".mp4") ? a0 : `out/${a0}.mp4`);
  if (!existsSync(file)) die(`no such file: ${file}`);
  let probe;
  try { probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,avg_frame_rate", "-of", "json", file], { stdio: ["pipe", "pipe", "pipe"] })); }
  catch (e) { die(`ffprobe cannot read ${file}: ${String(e.stderr || e.message).trim().split("\n")[0] || "failed"}`); }
  const stream = probe.streams?.[0];
  if (!stream) die(`ffprobe finds no video stream in ${file}`);
  const [fpsNum, fpsDen] = stream.avg_frame_rate.split("/").map(Number);
  const fps = fpsNum / fpsDen || 30;
  const GRID = Number(arg("grid", 12)), MIN = Number(arg("min", 0.4)) / 100, RATIO = Number(arg("ratio", 0.35)), THRESH = Number(arg("thresh", 4)), SIZE = Number(arg("size", 270));
  const FROM = Number(arg("from", 1)), TO = arg("to") === undefined ? Infinity : Number(arg("to"));
  if ([GRID, MIN, RATIO, THRESH, SIZE, FROM].some((v) => !Number.isFinite(v)) || Number.isNaN(TO)) die("a numeric option is not a number");
  if (!Number.isInteger(GRID) || GRID < 2 || GRID > 64) die("--grid wants an integer in [2, 64]");
  if (!(MIN > 0 && MIN < 1) || !(RATIO > 0)) die("--min wants a percent in (0, 100), --ratio a positive number");
  const W = SIZE, H = Math.max(2, Math.round((SIZE * stream.height) / stream.width));
  if (Math.floor(W / GRID) < 2 || Math.floor(H / GRID) < 2) die(`--grid ${GRID} leaves tiles under 2px at ${W}x${H}`);
  const OUT = resolve("out"); mkdirSync(OUT, { recursive: true });
  const stem = basename(file).replace(/\.[^.]*$/, "").replace(/[^\w.-]+/g, "-");
  let n = 0;
  const counted = (async function* () { for await (const fr of greyFrames(file, W, H, TO === Infinity ? Infinity : TO + 2)) { n++; yield fr; } })();
  let findings;
  try { findings = await scanPops(counted, { width: W, height: H, grid: GRID, min: MIN, ratio: RATIO, thresh: THRESH, from: FROM, to: TO }); }
  catch (e) { die(String(e.message || e).trim().split("\n")[0]); }
  if (!n) die("decoded 0 frames");
  const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`; // POSIX single-quote: the strip is safe to paste whatever the film is named
  const strip = (f) => {
    const lo = Math.max(0, f - 2), hi = Math.min(n - 1, f + 2), sel = [];
    for (let i = lo; i <= hi; i++) sel.push(`eq(n,${i})`);
    const png = resolve(OUT, `popscan-${stem}-f${f}.png`);
    return `ffmpeg -v error -y -i ${shq(file)} -vf "select='${sel.join("+")}',scale=384:-2,tile=${hi - lo + 1}x1" -fps_mode passthrough -frames:v 1 ${shq(png)}`;
  };
  const pct = (v) => +(v * 100).toFixed(2);
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(findings.map((r) => ({ frame: r.frame, t: +(r.frame / fps).toFixed(3), box: r.box.map(pct), in: pct(r.in), out: pct(r.out), across: pct(r.across), tiles: r.tiles, kind: r.kind, strip: strip(r.frame) })), null, 2));
  } else {
    console.log(`${file}\n  ${n} frames decoded at ${W}x${H} grey, ${GRID}x${GRID} tiles, threshold ${THRESH}/255`);
    for (const r of findings) {
      console.log(`  POP  frame ${r.frame}  t=${(r.frame / fps).toFixed(3)}s  box ${r.box.map((v) => (v * 100).toFixed(1)).join(",")}%  in ${pct(r.in)}%  out ${pct(r.out)}%  across ${pct(r.across)}%  ${r.kind}  (${r.tiles} tile${r.tiles > 1 ? "s" : ""})`);
      console.log(`       strip: ${strip(r.frame)}`);
    }
    console.log(findings.length ? `  POPSCAN: ${findings.length} finding(s) to review (a flag, never a fail)` : "  POPSCAN: clean, no one-frame pops");
  }
  // exitCode, not process.exit: a big --json write to a pipe would otherwise truncate at 64k
  process.exitCode = 0;
}

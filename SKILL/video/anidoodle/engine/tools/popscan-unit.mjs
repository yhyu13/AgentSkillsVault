#!/usr/bin/env node
// Unit + end-to-end tests for tools/popscan.mjs. The detector (scanPops) is pure, so the unit
// half feeds it synthetic greyscale frames - no video needed. The e2e half builds two tiny
// MP4s with ffmpeg lavfi (no assets) under a temp dir inside out/: one with a known one-frame
// pop at a known frame and place, one clean clip holding a hard cut and continuous motion.
// popscan must report exactly the known pop and nothing else. Temp dir removed afterwards.
// Boundary rule under test: the first and last frames can never be pops - a pop needs a
// neighbour on both sides.
//   node tools/popscan-unit.mjs
import { execFileSync } from "node:child_process";
import { strict as assert } from "node:assert";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { scanPops } from "./popscan.mjs";

const TOOLS = import.meta.dirname;
const ENGINE = resolve(TOOLS, "..");
const root = join(ENGINE, "out", ".popscan-unit");
rmSync(root, { recursive: true, force: true });
mkdirSync(root, { recursive: true });
let pass = 0;
const ok = (name) => console.log(`PASS ${++pass} ${name}`);

// ---------------------------------------------------------------- synthetic frames: 48x48, grid 4 -> 12px tiles
const W = 48, H = 48;
const OPTS = { width: W, height: H, grid: 4, min: 0.01, ratio: 0.35, thresh: 4 }; // min is a fraction here (1% of a tile)
const flat = (v = 30) => new Uint8Array(W * H).fill(v);
const rect = (f, x0, y0, x1, y1, v) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) f[y * W + x] = v; return f; };
const tex = (seed) => { const f = flat(30); let s = seed; for (let y = 14; y < 24; y++) for (let x = 14; x < 24; x++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; f[y * W + x] = 40 + (s >>> 0) % 180; } return f; };

// a one-frame APPEAR: a bright block exists on frame 2 only (inside tile (1,1): x12-23, y12-23)
{
  const fs = [flat(), flat(), rect(flat(), 14, 14, 24, 24, 220), flat(), flat()];
  const r = await scanPops(fs, OPTS);
  assert.equal(r.length, 1, "one finding");
  assert.equal(r[0].frame, 2);
  assert.deepEqual(r[0].box.map((v) => +v.toFixed(4)), [0.25, 0.25, 0.5, 0.5], "box is tile (1,1)");
  assert.equal(r[0].kind, "appears");
}
ok("one-frame appear: found at frame 2 with the tile's box, kind appears");

// a one-frame VANISH: the block exists on every frame except 2
{
  const block = () => rect(flat(), 14, 14, 24, 24, 220);
  const r = await scanPops([block(), block(), flat(), block(), block()], OPTS);
  assert.equal(r.length, 1);
  assert.equal(r[0].frame, 2);
  assert.equal(r[0].kind, "vanishes");
}
ok("one-frame vanish: found at frame 2, kind vanishes");

// a JUMP: same texture, shifted inside the region for one frame (texture kept -> not appears/vanishes)
{
  const base = () => tex(7);
  const jumped = () => { const f = flat(), t = tex(7); for (let y = 14; y < 24; y++) for (let x = 14; x < 24; x++) f[y * W + x + 3] = t[y * W + x]; return f; };
  const r = await scanPops([base(), base(), jumped(), base(), base()], OPTS);
  assert.equal(r.length, 1);
  assert.equal(r[0].kind, "jumps");
}
ok("one-frame rearrange: found, kind jumps (texture preserved)");

// a HARD CUT is not a pop: after the cut, f and f+1 agree
{
  const r = await scanPops([flat(30), flat(30), flat(200), flat(200), flat(200)], OPTS);
  assert.equal(r.length, 0, "hard cut produces no finding");
}
ok("hard cut: no finding");

// FAST CONTINUOUS MOTION is not a pop: f-1 and f+1 differ too
{
  const moved = (x) => rect(flat(), x, 14, x + 10, 24, 220);
  const r = await scanPops([moved(2), moved(6), moved(10), moved(14), moved(18)], OPTS);
  assert.equal(r.length, 0, "a sliding block never pops");
}
ok("smooth fast motion: no finding");

// a SMALL POP in one tile of an otherwise moving frame: the busy top row moves every frame
// (whole-frame change is high everywhere it matters), the quiet tile still gets caught
{
  const busy = (x, pop) => { const f = flat(24); rect(f, x, 2, x + 12, 8, 200); if (pop) rect(f, 38, 26, 46, 34, 210); return f; };
  const fs = [busy(2), busy(5), busy(8, true), busy(11), busy(14)];
  const r = await scanPops(fs, OPTS);
  assert.equal(r.length, 1, "only the quiet-tile pop is found");
  assert.equal(r[0].frame, 2);
  assert.deepEqual(r[0].box.map((v) => +v.toFixed(4)), [0.75, 0.5, 1, 0.75], "box is tile (3,2) only");
}
ok("small pop in a busy frame: found, box is the one tile");

// TWO POPS on different frames -> two findings
{
  const fs = [flat(), flat(), rect(flat(), 2, 2, 10, 10, 220), flat(), flat(), rect(flat(), 40, 40, 47, 47, 220), flat()];
  const r = await scanPops(fs, OPTS);
  assert.equal(r.length, 2);
  assert.deepEqual(r.map((x) => x.frame), [2, 5]);
}
ok("two pops on different frames: two findings");

// BOUNDARY: a pop on the first or last frame is never reported - both neighbours are required
{
  const first = await scanPops([rect(flat(), 14, 14, 24, 24, 220), flat(), flat(), flat(), flat()], OPTS);
  const last = await scanPops([flat(), flat(), flat(), flat(), rect(flat(), 14, 14, 24, 24, 220)], OPTS);
  assert.equal(first.length, 0, "frame 0 has no f-1, cannot pop");
  assert.equal(last.length, 0, "last frame has no f+1, cannot pop");
}
ok("first/last frame can never be a pop");

// ADJACENT popping tiles merge into ONE finding; DISJOINT regions are two findings
{
  const merged = await scanPops([flat(), flat(), rect(flat(), 18, 14, 30, 24, 220), flat(), flat()], OPTS);
  assert.equal(merged.length, 1, "a block spanning tiles (1,1)+(2,1) is one finding");
  assert.deepEqual(merged[0].box.map((v) => +v.toFixed(4)), [0.25, 0.25, 0.75, 0.5], "merged box covers both tiles");
  assert.equal(merged[0].tiles, 2);
  const two = await scanPops([flat(), flat(), rect(rect(flat(), 2, 2, 10, 10, 220), 40, 40, 47, 47, 220), flat(), flat()], OPTS);
  assert.equal(two.length, 2, "two separated pops on one frame are two findings");
}
ok("adjacent tiles merge to one finding; disjoint regions stay separate");

// --min gates: a 2x2 px blip under the floor is not a pop; --from/--to bound eligibility
{
  const fs = [flat(), flat(), rect(flat(), 14, 14, 16, 16, 220), flat(), flat()];
  assert.equal((await scanPops(fs, { ...OPTS, min: 0.05 })).length, 0, "blip under --min is ignored");
  const pop = [flat(), flat(), rect(flat(), 14, 14, 24, 24, 220), flat(), flat()];
  assert.equal((await scanPops(pop, { ...OPTS, to: 1 })).length, 0, "--to 1 excludes frame 2");
  assert.equal((await scanPops(pop, { ...OPTS, from: 3 })).length, 0, "--from 3 excludes frame 2");
  assert.equal((await scanPops(pop, { ...OPTS, from: 2, to: 2 })).length, 1, "--from 2 --to 2 keeps it");
}
ok("--min floor and --from/--to bounds respected");

// ---------------------------------------------------------------- end to end, real MP4s via lavfi
const popMp4 = join(root, "pop.mp4"), cleanMp4 = join(root, "clean.mp4");
try {
  // a 36x24 white box on frame 15 only: x60-96 of 160 (37.5-60%), y48-72 of 120 (40-60%)
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=0x202830:s=160x120:r=30:d=1,drawbox=x=60:y=48:w=36:h=24:c=0xf0f0f0:t=fill:enable='eq(n,15)'", "-pix_fmt", "yuv420p", popMp4]);
  // two 30-frame halves, each with a box in continuous motion, concatenated -> a hard cut at 30
  execFileSync("ffmpeg", ["-v", "error", "-y",
    "-f", "lavfi", "-i", "color=c=0x182028:s=160x120:r=30:d=1",
    "-f", "lavfi", "-i", "color=c=0xe8e8e8:s=20x20:r=30:d=1",
    "-f", "lavfi", "-i", "color=c=0x3a2020:s=160x120:r=30:d=1",
    "-f", "lavfi", "-i", "color=c=0x30c0b0:s=16x16:r=30:d=1",
    "-filter_complex", "[0:v][1:v]overlay=x='4+4*n':y=30[a];[2:v][3:v]overlay=x='140-4*n':y=70[b];[a][b]concat=n=2:v=1[out]",
    "-map", "[out]", "-pix_fmt", "yuv420p", "-r", "30", cleanMp4]);
  ok("lavfi fixtures built: pop.mp4 (pop at frame 15), clean.mp4 (cut + motion)");

  const run = (args) => JSON.parse(execFileSync("node", [join(TOOLS, "popscan.mjs"), ...args, "--json"], { cwd: ENGINE, encoding: "utf8" }));
  const pops = run([popMp4]);
  assert.equal(pops.length, 1, `expected exactly one finding, got ${pops.length}`);
  assert.equal(pops[0].frame, 15, "the known pop frame");
  assert(pops[0].box[0] <= 48.75 && pops[0].box[2] >= 48.75 && pops[0].box[1] <= 50 && pops[0].box[3] >= 50, `box ${pops[0].box} contains the drawn box centre`);
  assert.equal(pops[0].kind, "appears");
  assert(pops[0].strip.includes("eq(n,15)") && pops[0].strip.includes("tile=5x1"), "review strip command embedded");
  ok("e2e pop clip: exactly the known pop at frame 15, box covers it, strip command given");

  const clean = run([cleanMp4]);
  assert.equal(clean.length, 0, `the clean clip reports nothing, got ${JSON.stringify(clean)}`);
  ok("e2e clean clip: hard cut and motion report zero findings");

  try { execFileSync("node", [join(TOOLS, "popscan.mjs"), "definitely-not-a-film"], { cwd: ENGINE, encoding: "utf8" }); assert.fail("missing file must exit 2"); }
  catch (e) { assert.equal(e.status, 2, "unreadable/missing file exits 2"); }
  const okExit = execFileSync("node", [join(TOOLS, "popscan.mjs"), cleanMp4], { cwd: ENGINE, encoding: "utf8" });
  assert(okExit.includes("POPSCAN: clean"), "a film never fails: clean scan exits 0 and says so");
  ok("exit codes: 0 always after a scan, 2 for a file that cannot be read");

  // the printed strip command is POSIX-paste-safe for any filename: the metacharacters below
  // must arrive at ffmpeg as literal bytes, so an injected command never runs
  {
    const nasty = join(root, `pop 'q' $(touch INJECTED-A) \`touch INJECTED-B\` "dq".mp4`);
    copyFileSync(popMp4, nasty);
    const r = run([nasty]);
    assert.equal(r.length, 1, "a shell-hostile name still scans");
    const cmd = r[0].strip;
    assert(cmd.includes("-fps_mode passthrough") && !cmd.includes("-vsync"), "the strip uses -fps_mode passthrough, not the deprecated -vsync");
    assert(cmd.includes(`'\\''`), "a single quote in the name is '\\\\''-escaped");
    const outDir = join(ENGINE, "out"), pngsBefore = readdirSync(outDir);
    execFileSync("sh", ["-c", cmd], { cwd: ENGINE }); // really paste it: a quoting slip makes ffmpeg fail or runs the injection
    assert(!existsSync(join(ENGINE, "INJECTED-A")) && !existsSync(join(ENGINE, "INJECTED-B")), "no injected command ran");
    const png = readdirSync(outDir).filter((f) => f.startsWith("popscan-") && f.endsWith("-f15.png") && !pngsBefore.includes(f));
    assert.equal(png.length, 1, `the strip rendered its review PNG (${png[0]})`);
    rmSync(join(outDir, png[0]));
  }
  ok("strip command: paste-safe under shell metacharacters, -fps_mode passthrough, renders the PNG");

  // a missing or failing ffprobe/ffmpeg is one clear line and exit 2, not a stack trace
  {
    const oneLine = (e) => { assert.equal(e.status, 2, "exit 2"); const err = (e.stderr || "").trim(); assert.equal(err.split("\n").length, 1, `one line on stderr, got: ${err.slice(0, 120)}`); assert(err.startsWith("popscan:"), `the line names the tool: ${err}`); };
    writeFileSync(join(root, "not-video.mp4"), "this is not a video");
    try { execFileSync("node", [join(TOOLS, "popscan.mjs"), join(root, "not-video.mp4")], { cwd: ENGINE, encoding: "utf8" }); assert.fail("a non-video must exit 2"); }
    catch (e) { oneLine(e); }
    try { execFileSync(process.execPath, [join(TOOLS, "popscan.mjs"), cleanMp4], { cwd: ENGINE, encoding: "utf8", env: { PATH: "/nonexistent-dir" } }); assert.fail("missing ffprobe must exit 2"); }
    catch (e) { oneLine(e); }
    const stub = join(root, "stub-bin"); mkdirSync(stub); // ffprobe answers, ffmpeg is gone
    writeFileSync(join(stub, "ffprobe"), `#!/bin/sh\necho '{"streams":[{"width":160,"height":120,"avg_frame_rate":"30/1"}]}'\n`);
    chmodSync(join(stub, "ffprobe"), 0o755);
    try { execFileSync(process.execPath, [join(TOOLS, "popscan.mjs"), cleanMp4], { cwd: ENGINE, encoding: "utf8", env: { PATH: stub } }); assert.fail("missing ffmpeg must exit 2"); }
    catch (e) { oneLine(e); }
  }
  ok("tool failures: unprobeable file, missing ffprobe, missing ffmpeg -> one clear line, exit 2");
} finally {
  rmSync(root, { recursive: true, force: true });
}
console.log(`\nPOPSCAN-UNIT: PASS   ${pass} checks`);

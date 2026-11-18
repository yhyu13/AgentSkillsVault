// Frame-by-frame renderer for a canvas reel.
//
//   node render_frames.mjs <project> [--from N] [--to N]
//   node render_frames.mjs <project> --stills 3,12.5,40 --out reel/stills
//
// The page must expose window.renderAt(t) and set window.__ready = true after
// fonts are loaded. Frames are read from the canvas itself (toDataURL), never
// from a page screenshot: on this machine a plain screenshot of a canvas page
// repeats the same shallow image, which quietly produces a still film.
//
// Resolution is whatever timeline.json says (width/height/fps).
//
// Resume is keyed on a manifest, not on file existence. File size alone is not
// identity: after you edit the narration, timeline.json changes, and merging new
// audio with old frames produces a film whose picture is out of sync while every
// frame still looks alive. The manifest hashes timeline.json and index.html; when
// either hash changes the frame directory is cleared and rendered again.
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function loadPlaywright() {
  const roots = [
    process.cwd(),
    path.dirname(process.argv[1]),
    path.join(path.dirname(process.argv[1]), ".."),
    path.join(process.env.APPDATA || "", "npm", "node_modules"),
    process.env.PLAYWRIGHT_ROOT || "",
  ].filter(Boolean);
  try {
    const globalRoot = execSync("npm root -g", { stdio: ["ignore", "pipe", "ignore"] })
      .toString().trim();
    if (globalRoot) roots.push(globalRoot);
  } catch {
    /* npm not on PATH: the other roots still get a chance */
  }
  const require = createRequire(import.meta.url);
  for (const root of roots) {
    try {
      return require(require.resolve("playwright", { paths: [root] }));
    } catch {
      /* next root */
    }
  }
  throw new Error("playwright not found; install it with: npm i -g playwright && npx playwright install chromium");
}

const args = process.argv.slice(2);
const root = args[0];
if (!root) {
  console.error("usage: node render_frames.mjs <project> [--from N] [--to N] [--stills t1,t2]");
  process.exit(2);
}
const pick = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
};
const stills = pick("--stills", "");
const stillDir = pick("--out", path.join(root, "reel", "stills"));

const timeline = JSON.parse(fs.readFileSync(path.join(root, "reel", "timeline.json"), "utf8"));
const W = timeline.width || 1920;
const H = timeline.height || 1080;
const FPS = timeline.fps || 30;
// one source of truth for how many frames exist: build_timeline.py writes it
const total = timeline.frames || Math.round(timeline.total * FPS);

const { chromium } = loadPlaywright();
const browser = await chromium.launch({ args: ["--disable-lcd-text"] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("page error:", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.error("console:", m.text());
});
await page.goto(pathToFileURL(path.join(root, "reel", "index.html")).href);
await page.waitForFunction("window.__ready === true", { timeout: 30000 });

const canvas = await page.$("#stage canvas");
if (!canvas) throw new Error("no #stage canvas — the reel must draw on one canvas");
const buffer = await page.evaluate(() => {
  const c = document.querySelector("#stage canvas");
  return { w: c.width, h: c.height };
});
if (buffer.w !== W || buffer.h !== H) {
  throw new Error(`canvas buffer is ${buffer.w}x${buffer.h}, timeline says ${W}x${H}: ` +
    "a CSS-scaled canvas produces frames at the wrong pixel size");
}
const box = await canvas.boundingBox();
if (!box || Math.round(box.width) !== W || Math.round(box.height) !== H) {
  throw new Error(`canvas is ${box && box.width}x${box && box.height}, timeline says ${W}x${H}`);
}

async function grab(t) {
  const data = await page.evaluate((time) => {
    window.renderAt(time);
    const el = document.querySelector("#stage canvas");
    return el.toDataURL("image/png").split(",")[1];
  }, t);
  if (!data || data.length < 2000) throw new Error(`empty canvas at t=${t}`);
  return Buffer.from(data, "base64");
}

// the page reads timeline.js, the renderer reads timeline.json: if they disagree
// the picture follows old timings while every gate checks the new ones
// deep compare, not just total: two timelines can share a duration while every
// segment start, text and chapter differ — the picture would follow the old one
const pageTimeline = await page.evaluate(() => window.TIMELINE || null);
const canonical = (o) => {
  if (!o) return "";
  // whole object, key-sorted: a projection let chapter/metric/text-past-24-chars
  // drift past the check while the picture followed the old values
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      return Object.keys(v).sort().reduce((acc, k) => {
        acc[k] = walk(v[k]);
        return acc;
      }, {});
    }
    return v;
  };
  return JSON.stringify(walk(o));
};
const a = canonical(pageTimeline);
const b = canonical(timeline);
if (!pageTimeline) {
  await browser.close();
  throw new Error("reel/index.html did not define window.TIMELINE (timeline.js missing?)");
}
if (a !== b) {
  await browser.close();
  throw new Error("timeline.js 与 timeline.json 不一致：页面会按旧时间轴作画，"
    + "闸门却按新的判。先跑 build_timeline.py 再出帧。");
}

if (stills) {
  fs.mkdirSync(stillDir, { recursive: true });
  const times = stills.split(",").map(Number).filter((n) => !Number.isNaN(n));
  for (const t of times) {
    const file = path.join(stillDir, `t_${t.toFixed(2).replace(".", "_")}.png`);
    fs.writeFileSync(file, await grab(t));
    console.log("still", file);
  }
  await browser.close();
  process.exit(0);
}

const fromRaw = pick("--from", null);
const toRaw = pick("--to", null);
const from = fromRaw === null ? 0 : Number(fromRaw);
const to = toRaw === null ? total : Math.min(total, Number(toRaw));
if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to <= from || to > total) {
  console.error(`bad range --from ${fromRaw} --to ${toRaw}: need integers 0 <= from < to <= ${total}`);
  process.exit(2);
}
const outDir = path.join(root, "reel", "frames");
fs.mkdirSync(outDir, { recursive: true });

// manifest = identity of the picture that a frame belongs to
const sha = (p) => crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex");
const manifest = {
  timeline: sha(path.join(root, "reel", "timeline.json")),
  canvas: sha(path.join(root, "reel", "index.html")),
  fps: FPS,
  width: W,
  height: H,
  total,
};
const manifestPath = path.join(outDir, ".render_manifest.json");
const previous = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  : null;
const pngs = fs.readdirSync(outDir).filter((f) => f.endsWith(".png"));
if (!previous && pngs.length) {
  console.log(`frames: ${pngs.length} png(s) with no manifest — cannot prove they belong to this cut, clearing`);
  for (const f of pngs) fs.unlinkSync(path.join(outDir, f));
} else if (previous && JSON.stringify(previous) !== JSON.stringify(manifest)) {
  const why = ["timeline", "canvas", "fps", "width", "height", "total"]
    .filter((k) => previous[k] !== manifest[k]);
  console.log(`frames: ${why.join("/")} changed since the last render, clearing ${outDir}`);
  for (const f of fs.readdirSync(outDir)) {
    if (f.endsWith(".png")) fs.unlinkSync(path.join(outDir, f));
  }
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));

let written = 0;
for (let i = from; i < to; i++) {
  const file = path.join(outDir, `f_${String(i).padStart(5, "0")}.png`);
  if (fs.existsSync(file) && fs.statSync(file).size > 10000) continue;
  fs.writeFileSync(file, await grab(i / FPS));
  written++;
  if (i % 120 === 0 || i === to - 1) {
    console.log(`frame ${i}/${to} (${((i + 1) / (to || 1) * 100).toFixed(1)}%)`);
  }
}
await browser.close();

const present = fs.readdirSync(outDir).filter((f) => f.endsWith(".png")).length;
const partial = args.includes("--from") || args.includes("--to");
console.log(`done written=${written} frames=${present} expected=${total}${partial ? " (partial range)" : ""}`);
if (present < total && !partial) {
  console.error("frame count short of timeline; rerun to resume");
  process.exit(1);
}

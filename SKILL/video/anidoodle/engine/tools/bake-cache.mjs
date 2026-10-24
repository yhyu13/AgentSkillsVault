// BAKE CACHE, the disk half of Env.bake (the page half is hosts/page.ts). Finished plate frames
// live in .cache/bakes/<browser version>-<binary hash>/<source hash>.<frame>.<w>x<h>.png. The source hash is
// computed by build-page.mjs over the plate's whole import closure, so an edited plate simply
// misses and is drawn again; a different browser build (which may rasterise differently) gets a
// different folder. Nothing here is ever needed: delete .cache/ and every frame is drawn cold.
// Off with ANIDOODLE_BAKE_CACHE=0 (or an adapter's { bakeCache: false }).
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const bakeCacheOn = (opt) => opt !== false && process.env.ANIDOODLE_BAKE_CACHE !== "0";
const dirFor = (browserVersion) => resolve(".cache/bakes", String(browserVersion || "unknown").replace(/[^\w.-]/g, "_"));

// before frame 0: hand the page every stored frame whose source hash it still has
export const loadBakes = async (page, browserVersion) => {
  const dir = dirFor(browserVersion), hashes = new Set(await page.evaluate(() => window.FILM.bakes.hashes())), entries = {};
  if (existsSync(dir)) for (const f of readdirSync(dir)) { const m = f.match(/^([0-9a-f]+)\.(\d+)\.(\d+x\d+)\.png$/); if (m && hashes.has(m[1])) entries[f.slice(0, -4)] = readFileSync(join(dir, f)).toString("base64"); }
  await page.evaluate((e) => window.FILM.bakes.load(e), entries);
  return Object.keys(entries).length;
};

// after the last frame: keep what the page drew fresh
export const saveBakes = async (page, browserVersion) => {
  const fresh = await page.evaluate(() => window.FILM.bakes.take()), dir = dirFor(browserVersion);
  const keys = Object.keys(fresh); if (!keys.length) return 0;
  mkdirSync(dir, { recursive: true });
  for (const k of keys) { const f = join(dir, `${k}.png`), t = `${f}.${process.pid}.tmp`; writeFileSync(t, Buffer.from(fresh[k], "base64")); renameSync(t, f); } // atomic: a crash never leaves half a PNG
  // bounded: edits leave old hashes behind, so keep the newest KEEP files and let the rest go
  const all = readdirSync(dir).filter((f) => f.endsWith(".png"));
  if (all.length > KEEP) all.map((f) => [f, statSync(join(dir, f)).mtimeMs]).sort((a, b) => b[1] - a[1]).slice(KEEP).forEach(([f]) => { try { unlinkSync(join(dir, f)); } catch { /* another process got there */ } });
  return keys.length;
};
const KEEP = 600;

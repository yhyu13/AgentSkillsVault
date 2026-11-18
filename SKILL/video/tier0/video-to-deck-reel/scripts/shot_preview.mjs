// Screenshot every slide of ppt/preview.html, one PNG each.
//
//   node shot_preview.mjs <project>
//
// The HTML is generated from the real pptx geometry by deck_preview.py, so a
// PNG here shows the file that ships, not a second layout.
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const roots = [
    process.cwd(),
    path.join(process.cwd(), ".."),
    path.join(process.env.APPDATA || "", "npm", "node_modules"),
  ].filter(Boolean);
  try {
    const g = execSync("npm root -g", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    if (g) roots.push(g);
  } catch { /* keep the rest */ }
  for (const root of roots) {
    try { return require(require.resolve("playwright", { paths: [root] })); } catch { /* next */ }
  }
  throw new Error("playwright not found");
}

const root = path.resolve(process.argv[2] || ".");
const page_path = path.join(root, "ppt", "preview.html");
if (!fs.existsSync(page_path)) throw new Error("run deck_preview.py first: " + page_path);

const outDir = path.join(root, "ppt", "preview");
fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(outDir)) fs.unlinkSync(path.join(outDir, f));

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
// deviceScaleFactor 2 so a 13.33x7.5 in slide lands at 2560x1440: the same text
// is legible enough to judge 8 pt footers and 10 px rules without zooming.
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(page_path).href);
await page.waitForFunction("document.fonts.status === 'loaded'");

const ids = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".slide")).map((el) => el.id));
for (const id of ids) {
  await page.locator("#" + id).screenshot({ path: path.join(outDir, id + ".png") });
}
await browser.close();
console.log(`OK ${outDir} slides=${ids.length}`);

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve("playwright", {
  paths: [process.cwd(), path.dirname(process.argv[1]), process.env.APPDATA + "/npm/node_modules"],
}));
const root = process.argv[2];
const timeline = JSON.parse(fs.readFileSync(root + "/reel/timeline.json", "utf8"));
const frames = Math.round(timeline.total * timeline.fps);
const out = root + "/reel/frames";
fs.mkdirSync(out, { recursive: true });
const start = Number(process.argv[3] || 0);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(root + "/reel/index.html").href);
await page.waitForFunction("window.__ready === true", { timeout: 20000 });
for (let i = start; i < frames; i++) {
  const file = out + "/f_" + String(i).padStart(5, "0") + ".png";
  if (fs.existsSync(file) && fs.statSync(file).size > 10000) continue;
  const data = await page.evaluate((t) => {
    window.renderAt(t);
    return document.querySelector("#stage canvas").toDataURL("image/png").split(",")[1];
  }, i / timeline.fps);
  fs.writeFileSync(file, Buffer.from(data, "base64"));
  if (i % 300 === 0) console.log("frame", i, "/", frames);
}
await browser.close();
console.log("done", frames);

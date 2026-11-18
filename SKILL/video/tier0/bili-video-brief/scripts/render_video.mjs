import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = process.argv[2];
const tl = JSON.parse(fs.readFileSync(path.join(root, 'reel/timeline.json'), 'utf8'));
const frames = path.join(root, 'reel/frames');
fs.mkdirSync(frames, { recursive: true });
const fps = tl.fps || 30;
const n = Math.round(tl.total * fps);
const start = Number(process.argv[3] || 0);
const stop = Math.min(n, Number(process.argv[4] || n));

const browserRoot = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
const chromiumHome = fs.readdirSync(browserRoot).filter(name => name.startsWith('chromium-')).sort().at(-1);
if (!chromiumHome) throw new Error('no Chromium under ' + browserRoot);
const browser = await chromium.launch({
  executablePath: path.join(browserRoot, chromiumHome, 'chrome-win64', 'chrome.exe'),
  args: ['--force-device-scale-factor=1', '--font-render-hinting=none']
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.log('PAGEERROR', e.message); process.exit(1); });
await page.goto('file:///' + root + '/reel/index.html');
await page.waitForFunction('window.__ready === true', { timeout: 20000 });
await page.evaluate(() => document.body.classList.add('capture'));

const t0 = Date.now();
for (let i = start; i < stop; i++) {
  await page.evaluate(v => window.renderAt(v), i / fps);
  await page.screenshot({ path: path.join(frames, 'f_' + String(i).padStart(5, '0') + '.png') });
  if (i % 300 === 0 || i === n - 1) {
    const el = (Date.now() - t0) / 1000;
    const done = i - start + 1;
    const eta = (el / done) * (stop - i - 1) / 60;
    console.log('frame ' + (i + 1) + '/' + stop + '  eta ' + eta.toFixed(1) + ' min');
  }
}
await browser.close();
console.log('captured ' + (stop - start));

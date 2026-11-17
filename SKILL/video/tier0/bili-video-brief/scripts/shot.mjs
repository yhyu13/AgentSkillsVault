import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2];
const times = process.argv.slice(3).map(Number);
const browserRoot = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
const chromiumHome = fs.readdirSync(browserRoot).filter(name => name.startsWith('chromium-')).sort().at(-1);
if (!chromiumHome) throw new Error('no Chromium under ' + browserRoot);
const browser = await chromium.launch({
  executablePath: path.join(browserRoot, chromiumHome, 'chrome-win64', 'chrome.exe'),
  args: ['--force-device-scale-factor=1', '--font-render-hinting=none']
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await page.goto('file:///' + root + '/reel/index.html');
await page.waitForFunction('window.__ready === true', { timeout: 20000 });
for (const t of times) {
  await page.evaluate(v => window.renderAt(v), t);
  const file = path.join(root, 'qa', 'still_' + t.toFixed(2) + '.png');
  await page.screenshot({ path: file });
  console.log('still', t);
}
await browser.close();

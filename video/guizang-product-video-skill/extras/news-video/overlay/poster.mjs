// Poster frame: the finished opening (title + date + facts), captured without the subtitle line.
import {chromium} from 'playwright';
import {serve} from './server.mjs';
const t = Number(process.argv[2] || 1.6);
const {server, url} = await serve();
const browser = await chromium.launch({headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const page = await browser.newPage({viewport: {width: 1920, height: 1080}});
await page.goto(url, {waitUntil: 'networkidle'}); await page.evaluate(() => window.__filmReady);
await page.evaluate(x => window.seek(x), t);
await page.evaluate(() => { document.querySelector('.subs').style.visibility = 'hidden'; document.querySelector('#poster').style.display = 'none'; });
await page.screenshot({path: 'public/poster.png'});
await browser.close(); server.close(); console.log('public/poster.png @', t);

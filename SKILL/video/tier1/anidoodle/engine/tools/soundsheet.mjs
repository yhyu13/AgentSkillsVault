// SOUNDSHEET. Draws a film's soundtrack as a single PNG, everything stacked on one shared timeline: a
// strip of frames, the spectrogram, the waveform, momentary and short-term loudness with lines for the
// integrated level and the -14 LUFS target, onset ticks, accents, picture events, and shading over
// every hole and over dead air at the end. A gap, a silent ending or a late accent jumps out at a
// glance. It runs the soundcheck.mjs analysis, and that verdict and its top fixes sit at the top.
//   node tools/soundsheet.mjs <film|file.mp4|file.wav> -o out/<name>-sound.png [--profile p.json] [--allow a:b] [--width 1600]
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { detect } from "./detect.mjs";
import { loadCheck, resolveInput, check, loadProfile, parseAllow } from "./soundcheck.mjs";

const argv = process.argv.slice(2), opt = (...ks) => { for (const k of ks) { const i = argv.indexOf(k); if (i >= 0) return argv[i + 1]; } return undefined; };
const VAL = new Set(["-o", "--out", "--profile", "--allow", "--width"]), pos = argv.filter((a, i) => !a.startsWith("-") && !VAL.has(argv[i - 1]));
const die = (m) => { console.error(m); process.exit(2); };
if (!pos[0]) die("usage: node tools/soundsheet.mjs <film|file.mp4|file.wav> -o out/<name>-sound.png [--profile p.json] [--allow a:b] [--width 1600]");
const env = detect();
if (!env.pw.ok || !env.browser.ok) die(`no browser to draw the sheet in.\n  playwright: ${env.report.playwright}\n  browser:    ${env.report.browser}\n  fix: npm install, then npx playwright-core install chromium`);

let file; try { file = resolveInput(pos[0]); } catch (e) { die(e.message); }
const out = resolve(opt("-o", "--out") ?? `out/${basename(file).replace(/\.[^.]+$/, "")}-sound.png`);
const WIDTH = Number(opt("--width") ?? 1600), LEFT = 92, RIGHT = 24, PW = WIDTH - LEFT - RIGHT;
const C = await loadCheck(), r = await check(C, file, { profile: loadProfile(C, opt("--profile")), allow: parseAllow(opt("--allow")) });
const m = r.measures, dur = m.durationS, tmp = mkdtempSync(join(tmpdir(), "soundsheet-"));
const png64 = (f) => "data:image/png;base64," + readFileSync(f).toString("base64");
try {
  // the picture: ten frames, each at the middle of its tenth, so tile k sits over its own stretch of the axis
  let strip = null;
  if (r.video) {
    const K = 10, tw = Math.floor(PW / K), th = Math.max(2, 2 * Math.round((tw * r.video.height) / r.video.width / 2));
    execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(dur / K / 2), "-i", file, "-vf", `fps=${K / dur},scale=${tw}:${th},tile=${K}x1`, "-frames:v", "1", join(tmp, "strip.png")]);
    strip = { src: png64(join(tmp, "strip.png")), w: tw * K, h: th };
  }
  // the spectrogram from ffmpeg, log frequency, both channels combined; drawn across the whole duration
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", file, "-lavfi", `showspectrumpic=s=${PW}x240:legend=0:mode=combined:fscale=log:scale=log:color=intensity:gain=2`, "-frames:v", "1", join(tmp, "spec.png")]);
  // waveform envelope: min/max of the mid per pixel column
  const env_ = []; const n = r.L.length, per = n / PW;
  for (let x = 0; x < PW; x++) { let lo = 0, hi = 0; for (let i = Math.floor(x * per); i < Math.min(n, Math.floor((x + 1) * per)); i++) { const v = 0.5 * (r.L[i] + r.R[i]); if (v < lo) lo = v; if (v > hi) hi = v; } env_.push([+lo.toFixed(4), +hi.toFixed(4)]); }
  const fails = r.rows.filter((x) => x.status === "FAIL").length, warns = r.rows.filter((x) => x.status === "WARN").length;
  const data = {
    title: basename(file), dur, I: m.lufs, verdict: fails ? `FAIL: ${fails} fail, ${warns} warn` : warns ? `PASS with ${warns} warning${warns > 1 ? "s" : ""}` : "PASS",
    stats: `${m.lufs.toFixed(1)} LUFS  ·  LRA ${m.lra.toFixed(1)} LU  ·  ${m.truePeak.toFixed(1)} dBTP  ·  150-2k corr ${Number.isFinite(m.bodyCorr) ? m.bodyCorr.toFixed(2) : "n/a"}  ·  rumble ${m.bands.rumble.toFixed(1)} dB`,
    fixes: r.fixes.slice(0, 4).map((x) => `${x.status}  ${x.fix}`),
    strip, spec: png64(join(tmp, "spec.png")), env: env_,
    momentary: r.curves.momentary.map((v, i) => [i * r.curves.hopS + 0.2, v]), shortTerm: r.curves.shortTerm.map((v, i) => [i * r.curves.hopS + 1.5, v]),
    onsets: r.curves.onsets, accents: r.curves.accents, events: r.sync?.times ?? [], unanswered: r.sync?.unanswered ?? [],
    shade: [...m.gaps.filter((g) => g.len >= 0.1).map((g) => ({ a: g.at, b: g.at + g.len, label: g.allowed ? "allowed hole" : `hole ${g.len.toFixed(1)} s` })), ...(m.endSilence >= 0.1 ? [{ a: m.endSilenceFrom, b: dur, label: `dead tail ${m.endSilence.toFixed(1)} s` }] : []), ...(m.firstSound && m.firstSound >= 0.1 ? [{ a: 0, b: m.firstSound, label: "before body level" }] : [])],
    LEFT, PW, WIDTH,
  };
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  :root { --ink: #1d1b18; --paper: #f7f5f0; --line: #d9d4ca; --fail: #c0392b; --warn: #b9770e; --accent: #ca4901; --blue: #2c6e9b; }
  * { margin: 0; box-sizing: border-box; } body { background: var(--paper); color: var(--ink); font-family: Poppins, "Helvetica Neue", Arial, sans-serif; width: ${WIDTH}px; }
  header { padding: 22px ${RIGHT}px 12px ${LEFT}px; } h1 { font-size: 22px; font-weight: 600; } .v { font-size: 15px; font-weight: 600; margin-top: 4px; } .s { font-size: 13px; margin-top: 2px; }
  ol { margin: 8px 0 0 18px; font-size: 13px; line-height: 1.45; } canvas { display: block; }
  </style></head><body><header><h1></h1><div class="v"></div><div class="s"></div><ol></ol></header><canvas id="c"></canvas>
  <script>
  const D = ${JSON.stringify(data)};
  document.querySelector("h1").textContent = D.title; const v = document.querySelector(".v"); v.textContent = D.verdict; v.style.color = D.verdict.startsWith("FAIL") ? "var(--fail)" : D.verdict.includes("warn") ? "var(--warn)" : "#1e7d4f";
  document.querySelector(".s").textContent = D.stats; for (const f of D.fixes) { const li = document.createElement("li"); li.textContent = f; document.querySelector("ol").appendChild(li); }
  const css = (k) => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
  const load = (src) => new Promise((ok) => { if (!src) return ok(null); const i = new Image(); i.onload = () => ok(i); i.src = src; });
  Promise.all([load(D.strip && D.strip.src), load(D.spec), document.fonts.ready]).then(([strip, spec]) => {
    const rows = [["picture", strip ? D.strip.h : 0], ["spectrogram", 240], ["waveform", 130], ["loudness", 210], ["onsets / accents / picture", 64]].filter((r) => r[1]);
    const GAP = 14, H = rows.reduce((a, r) => a + r[1] + GAP, 0) + 40, cv = document.getElementById("c"); cv.width = D.WIDTH; cv.height = H;
    const g = cv.getContext("2d"), X = (t) => D.LEFT + (t / D.dur) * D.PW; let y = 4; const top = {};
    g.font = "500 12px Poppins, Arial, sans-serif"; g.textBaseline = "middle";
    for (const [name, h] of rows) { top[name] = [y, h]; g.fillStyle = css("--ink"); g.textAlign = "right"; g.fillText(name === "onsets / accents / picture" ? "onsets" : name, D.LEFT - 10, name === "onsets / accents / picture" ? y + h / 6 : y + h / 2); if (name === "spectrogram") { g.font = "10px Poppins, Arial, sans-serif"; g.fillText("log Hz", D.LEFT - 10, y + h / 2 + 16); g.font = "500 12px Poppins, Arial, sans-serif"; } g.strokeStyle = css("--line"); g.strokeRect(D.LEFT + 0.5, y + 0.5, D.PW - 1, h - 1); y += h + GAP; }
    const bottom = y - GAP;
    // shading first, through every panel: holes, the dead tail, the silent start
    for (const s of D.shade) { g.fillStyle = "rgba(192,57,43,0.13)"; g.fillRect(X(s.a), 4, Math.max(2, X(s.b) - X(s.a)), bottom - 4); g.fillStyle = css("--fail"); g.textAlign = "left"; g.fillText(s.label, Math.min(X(s.a) + 4, D.LEFT + D.PW - g.measureText(s.label).width), bottom + 12); }
    if (strip) { const [t, h] = top.picture; g.drawImage(strip, D.LEFT, t, D.strip.w, h); }
    { const [t, h] = top.spectrogram; g.drawImage(spec, D.LEFT, t, D.PW, h); }
    { const [t, h] = top.waveform, mid = t + h / 2; g.fillStyle = css("--blue"); D.env.forEach(([lo, hi], x) => g.fillRect(D.LEFT + x, mid - hi * h / 2, 1, Math.max(1, (hi - lo) * h / 2))); }
    { const [t, h] = top.loudness, lo = -60, hi = 0, Y = (l) => t + h - ((Math.max(lo, Math.min(hi, l)) - lo) / (hi - lo)) * h;
      g.textAlign = "right"; g.fillStyle = css("--ink"); g.font = "11px Poppins, Arial, sans-serif";
      for (const l of [-50, -40, -30, -20, -10]) { g.strokeStyle = css("--line"); g.beginPath(); g.moveTo(D.LEFT, Y(l)); g.lineTo(D.LEFT + D.PW, Y(l)); g.stroke(); g.fillText(String(l), D.LEFT + D.PW - 4, Y(l) - 7); }
      g.setLineDash([6, 4]); g.strokeStyle = css("--accent"); g.beginPath(); g.moveTo(D.LEFT, Y(-14)); g.lineTo(D.LEFT + D.PW, Y(-14)); g.stroke(); g.textAlign = "left"; g.fillStyle = css("--accent"); g.fillText("target -14", D.LEFT + 6, Y(-14) - 8);
      if (D.I > -70) { g.strokeStyle = css("--ink"); g.beginPath(); g.moveTo(D.LEFT, Y(D.I)); g.lineTo(D.LEFT + D.PW, Y(D.I)); g.stroke(); g.fillStyle = css("--ink"); g.fillText("integrated " + D.I.toFixed(1), D.LEFT + 90, Y(D.I) - 8); }
      g.setLineDash([]);
      const curve = (pts, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); let pen = false; for (const [tt, l] of pts) { if (!(l > -70)) { pen = false; continue; } pen ? g.lineTo(X(tt), Y(l)) : g.moveTo(X(tt), Y(l)); pen = true; } g.stroke(); g.lineWidth = 1; };
      curve(D.momentary, "rgba(44,110,155,0.55)", 1); curve(D.shortTerm, css("--ink"), 2);
      g.fillStyle = css("--ink"); g.textAlign = "left"; g.fillText("momentary (thin), short-term (thick), LUFS", D.LEFT + 6, t + 12); }
    { const [t, h] = top["onsets / accents / picture"], third = h / 3;
      g.strokeStyle = css("--ink"); for (const o of D.onsets) { g.beginPath(); g.moveTo(X(o) + 0.5, t + 2); g.lineTo(X(o) + 0.5, t + third); g.stroke(); }
      g.fillStyle = css("--accent"); for (const o of D.accents) { g.beginPath(); g.arc(X(o), t + third * 1.5, 4, 0, 7); g.fill(); }
      for (const e of D.events) { const miss = D.unanswered.includes(e); g.strokeStyle = miss ? css("--fail") : "#1e7d4f"; g.lineWidth = 2; g.beginPath(); g.moveTo(X(e), t + third * 2 + 2); g.lineTo(X(e), t + h - 2); g.stroke(); g.lineWidth = 1;
        g.strokeStyle = miss ? "rgba(192,57,43,0.35)" : "rgba(30,125,79,0.3)"; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(X(e), 4); g.lineTo(X(e), t); g.stroke(); g.setLineDash([]); }
      g.font = "10px Poppins, Arial, sans-serif"; g.fillStyle = css("--ink"); g.textAlign = "right"; g.fillText("accents", D.LEFT - 10, t + third * 1.5); g.fillText("picture events", D.LEFT - 10, t + third * 2.5); }
    // the time axis
    g.font = "11px Poppins, Arial, sans-serif"; g.fillStyle = css("--ink"); g.textAlign = "center"; const step = D.dur > 40 ? 5 : D.dur > 12 ? 2 : 1;
    for (let s = 0; s <= D.dur + 1e-6; s += step) g.fillText(Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"), X(s), bottom + 28);
    document.body.dataset.done = "1";
  });
  </script></body></html>`;
  const browser = await env.pw.lib.chromium.launch({ executablePath: env.browser.executablePath });
  try {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: 600 }, deviceScaleFactor: 1 });
    await page.setContent(html); await page.waitForSelector("body[data-done]", { timeout: 20000 });
    mkdirSync(dirname(out), { recursive: true }); await page.screenshot({ path: out, fullPage: true });
  } finally { await browser.close(); }
  console.log(`${out}\n  ${data.verdict}   ${data.stats}`);
} finally { rmSync(tmp, { recursive: true, force: true }); }

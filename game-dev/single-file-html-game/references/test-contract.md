# Test Contract — `window.__<name>Test`

Every high-risk game exposes a `window.__<name>Test` namespace so its
`promo-video/scripts/check-<name>.mjs` script can verify content, rules,
and archives without scraping the DOM or re-implementing the engine.
The check script is the executable evidence pack — what it asserts is
what A-tier review reads.

## Required API surface

The exact shape varies per game, but every check script depends on at
least these:

| Function | Purpose | Example |
| --- | --- | --- |
| `validateContent()` | Returns `{ challenges, chapters, referenceWins, uniqueGoals, … }` so the check can assert structural totals. | `midnight-chess` returns `{challenges:12, chapters:4, referenceWins:12, uniqueGoals:9, castling:2, enPassant:1}` |
| `referenceResult(i)` | Plays the canonical reference for chapter `i` using the same rule functions the player uses. Returns `{ legal, won, moves, … }`. | All `referenceResult(i)` are `{legal:true, won:true}` for `midnight-chess`. |
| `encodeArchive(profile)` / `decodeArchive(code)` | Round-trip a save profile through the portable archive format. | `midnight-chess` exposes `encodeArchive(p)` / `decodeArchive(code)` (prefix `CHESS2`). |
| Pure rule functions | Exposed for cross-validation. | `midnight-chess`: `fen`, `legal`, `make`, `status`, `uci`, `perft`, `freshProfile`. `tiny-factory`: `solveContract(i)`. |
| `getState()` | Returns the current live state for click-driven tests. | `midnight-chess`: `{result, moves, last}` after each click. |

Rules:

- Attach **after** the game initialises. The check script waits on
  `window.__<name>Test` with `page.waitForFunction`.
- All functions are pure of side effects on the DOM **except** `getState()`,
  which is allowed to read live state.
- The `validateContent` totals must be hard-coded into the check script
  so any accidental change shows up as a failure.

## Example skeleton (lifted from `midnight-chess`)

```js
window.__chessTest = {
  // structural totals — used by check-midnight-chess.mjs
  validateContent() {
    return {
      challenges: this.challenges.length,           // 12
      chapters: this.chapterOfIndex.length,         // 4
      referenceWins: this.referenceMoves.filter(Boolean).length,
      uniqueGoals: new Set(this.challenges.map(c => c.goal)).size,
      castling: this.castlingRights.size,           // 2
      enPassant: this.epTargets.size                // 1
    };
  },

  // pure rule functions — same ones the player calls
  fen, legal, make, status, uci, perft,

  // canonical reference plays — calls legal+make internally
  referenceResult(i) {
    const c = this.challenges[i];
    let s = this.fromFen(c.fen);
    const played = [];
    for (const uci of c.solution) {
      const m = this.uci(s, uci);
      if (!m || !this.legal(s).includes(m)) return { legal: false, won: false };
      s = this.make(s, m);
      played.push(uci);
    }
    return { legal: true, won: this.status(s).kind === c.target, moves: played };
  },

  // archive round-trip — see references/archive-code.md
  freshProfile() { return { challenge: 0, stars: Array(12).fill(0), clears: Array(12).fill(0), bestMoves: Array(12).fill(0) }; },
  encodeArchive, decodeArchive
};
```

## What the check script asserts

The script asserts **contract**, not visuals:

1. `validateContent()` totals match the README / AUDIT claims.
2. Pure-rule invariants: e.g. start perft `20 / 400`, Kiwipete perft `48`,
   stalemate / insufficient / 50-move / threefold all detected.
3. Every `referenceResult(i)` is `{ legal: true, won: true }`.
4. Real DOM interactions: `page.locator('[data-square="13"]').click()`
   followed by `getState().result.kind === "puzzle"`.
5. Real touch interactions: `phone.locator('[data-square="28"]').tap()`
   on a 390×844 `isMobile:true, hasTouch:true` context.
6. Archive round-trip succeeds; tampered code rejected:
   `await assert.rejects(() => page.evaluate(c => decodeArchive(c + "x"), archive))`.
7. No browser errors: `assert.deepEqual(errors, [])` after attaching
   `page.on("pageerror")` / `page.on("console", m => m.type()==="error")`.

## Check-script template

```js
import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "file:///...";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(here, "..", "..");
const outputDir = path.join(rootDir, "output");
const port = 4500;

await mkdir(outputDir, { recursive: true });

const server = http.createServer(async (req, res) => {
  try {
    const target = path.resolve(rootDir, decodeURIComponent(new URL(req.url, "http://local").pathname).slice(1));
    if (!target.startsWith(rootDir + path.sep)) { res.writeHead(403).end("Forbidden"); return; }
    const info = await stat(target);
    if (!info.isFile()) throw new Error("Not a file");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    createReadStream(target).pipe(res);
  } catch { res.writeHead(404).end("Not found"); }
});
await new Promise(r => server.listen(port, "127.0.0.1", r));

let browser, errors = [];
function observe(page, label) {
  page.on("pageerror", e => errors.push(label + ": " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(label + ": " + m.text()); });
}

try {
  try { browser = await chromium.launch({ channel: "msedge", headless: true }); }
  catch { browser = await chromium.launch({ headless: true }); }

  // Desktop
  const desktop = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  const page = await desktop.newPage();
  observe(page, "desktop");
  await page.goto(`http://127.0.0.1:${port}/<name>.html`, { waitUntil: "load" });
  await page.waitForFunction(() => Boolean(window.__<name>Test));

  const content = await page.evaluate(() => window.__<name>Test.validateContent());
  assert.deepEqual(content, { /* expected totals */ });

  for (let i = 0; i < content.<chapters>; i++) {
    const r = await page.evaluate(i => window.__<name>Test.referenceResult(i), i);
    assert.equal(r.legal && r.won, true, `reference ${i}`);
  }

  await desktop.close();

  // Mobile (390×844 touch)
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    isMobile: true, hasTouch: true, deviceScaleFactor: 2
  });
  const phone = await mobile.newPage();
  observe(phone, "mobile");
  await phone.goto(`http://127.0.0.1:${port}/<name>.html`, { waitUntil: "load" });
  await phone.waitForFunction(() => Boolean(window.__<name>Test));
  await phone.locator("[data-touch-target]").first().tap();
  // assert touch-only behaviour here

  await mobile.close();

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks: "PASS" }));
} finally {
  if (browser) await browser.close();
  server.close();
}
```

## Wiring it into a new game

When adding a new game with a non-trivial engine:

1. Add the `__<name>Test` block at the bottom of the `<script>`. Order:
   `validateContent` → pure rule exports → `referenceResult(i)` →
   archive encode/decode → `getState`.
2. Add `promo-video/scripts/check-<name>.mjs` (template above).
3. Wire it into `promo-video/package.json` `"check:<name>": "node scripts/check-<name>.mjs"`.
4. Add the entry to `promo-video/scripts/check-game-tiers.mjs` if the
   check script is referenced from there.

## Anti-patterns

- Hiding `__<name>Test` behind `if (location.search.includes("test"))`.
  The contract is "always exposed", not "exposed when tested".
- Implementing `validateContent` by parsing the DOM. It must come from
  the same data structures the player sees.
- Defining `referenceResult(i)` to call a different rule function than
  the player. The whole point is shared source of truth.
- Letting `getState()` mutate state. It is read-only.
- Forgetting to also remove `__<name>Test` from production builds — there
  is no production build, just keep it small (~1–2 KB).
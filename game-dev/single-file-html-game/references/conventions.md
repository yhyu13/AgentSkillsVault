# Conventions

Hard rules every `<name>.html` must satisfy. These are checked by hand, by
`check-game-tiers.mjs` (file count), and by `check-pages-catalog.mjs` (mobile
overflow, console errors).

## File-level rules

| Rule | Why | How |
| --- | --- | --- |
| Single file | Doubles as a portable artifact; works on GitHub Pages and offline | Everything inline: `<style>` + `<main>` + `<script>` in one document |
| No CDN, no `node_modules`, no build | Pages site copies `./` html verbatim; no install step | Inline JS, inline CSS, inline SVG for icons; no `<script src="http…">`, no `import` from a remote URL |
| UTF-8 without BOM | `.gitattributes` rewrites CRLF→LF; BOM survives and breaks `git diff` | Save as plain UTF-8; PowerShell/VS Code: "UTF-8 (no BOM)" / "UTF-8 without signature" |
| LF line endings | `.gitattributes` enforces this for `*.html *.md *.css *.js`; a CRLF diff is unreadable | Configure editor "EOL = LF"; on Windows use `git config core.autocrlf false` |
| `lang="zh-CN"` | Catalog and most content is Chinese; helps keyboard, screen readers, font fallbacks | `<html lang="zh-CN">` |
| Viewport meta | Mobile touch must work | `<meta name="viewport" content="width=device-width,initial-scale=1">` |
| Title | Appears in catalog, browser tab, and screenshot | Single `<title>` near the top, in Chinese |

## Mobile canvas / layout

The QA viewport is **390 × 844** (CSS pixels, deviceScaleFactor 2,
`isMobile: true`, `hasTouch: true`). Any failure here blocks A tier.

- Canvas: fit inside `min(100vw - 24px, 390px)` for the play area. Use CSS
  `aspect-ratio` rather than fixed pixel sizes.
- Touch targets: `min-height: 40px`, `padding ≥ 9px`. Per
  `promo-video/scripts/check-pages-catalog.mjs`, the assertions include
  `scrollWidth <= clientWidth + 4`.
- No horizontal scroll. The check asserts
  `scrollWidth <= clientWidth + 4` and fails on any element with
  `rect.left < -4 || rect.right > clientWidth + 4`.
- Use CSS Grid / Flex with `clamp()` for typography:
  `font-size: clamp(14px, 4vw, 18px)`.
- No `position: fixed` full-screen overlays that block touch on the canvas.

## Game-level rules

- **Pure rule engine.** All game logic lives in plain functions that take
  state and return a new state. The same functions power the player and any
  reference solution / tests. See `references/test-contract.md`.
- **Deterministic campaigns.** Multi-stage content (e.g. "12 contract
  campaigns") uses a fixed seed list, e.g. `const seeds = [0xC1, 0xC2, …]`.
  Do not use `Date.now()` or `Math.random()` for content that must be
  reproducible.
- **No second engine for tests.** Reference solutions must call the same
  functions the player uses (`validateContent`, `referenceResult(i)`).
  Anything else is auto-rejected at A-tier review.
- **Three-star scoring** is the standard. Surface `score / bestScore / stars`
  per chapter; reference solutions target `stars === 3`.
- **Archive codes** (see `references/archive-code.md`) for any save state
  that survives reload. `localStorage` is fine for transient prefs, but
  cross-device / tamper-checked saves must use the portable format.
- **Pause / restart / reset.** `Space` toggles pause, `R` restarts the
  current run, `P` is acceptable as an alias. Surface these in the on-screen
  help.
- **Dual input.** All gameplay actions must work with mouse **and** touch.
  A test that taps the same element it clicks is part of every A-tier
  evidence pack.

## Anti-patterns to refuse during refactor

- Splitting the game into multiple files (`index.html` + `main.js` + …).
  The pipeline copies only `*.html` from the root.
- Hard-coded `Date.now()` in the random seed for fixed campaigns.
- Magic numbers without a named constant in the same file. Every constant
  used by reference solutions must be visible (and named) in the engine.
- "Secret rules" — anything the engine does that `validateContent()` does
  not describe.

## Quick QA before publishing

```powershell
# 1. Tier consistency (file presence, ordering, README/AUDIT counts)
node promo-video/scripts/check-game-tiers.mjs

# 2. Catalog + mobile + desktop Playwright smoke test
node promo-video/scripts/check-pages-catalog.mjs

# 3. Broader audit
node promo-video/scripts/audit-games.mjs

# 4. No whitespace / EOL surprises
git diff --check
```

For a single game, also run the matching `check-<name>.mjs`
(`promo-video/scripts/check-<name>.mjs`) when the file exists. See
`references/tier-workflow.md` for the rules around writing one.
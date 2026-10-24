---
name: single-file-html-game
description: Create, refactor, or audit single-file zero-dependency HTML browser games in the `mini-browser-games` style — one self-contained `.html`, no build, no CDN, mobile-first canvas, optional tamper-checked archive codes, and tiered against GAME_TIERS.json. Use this skill when a user asks to make a new browser game, port a prototype to the project's conventions, raise an existing game's tier, add archive codes, write a per-game check script, or run the tier/catalog audit pipeline.
---

# Single-File HTML Game

Build, refactor, or audit a `mini-browser-games`-style game: one `.html` file that opens by double-click, runs on GitHub Pages, fits a 390×844 phone, and lives under a strict eight-tier rating ladder.

## When to use

- "Make me a browser game" / "vibecode a <genre> game" / "create a new game for the collection"
- "Refactor / rewrite / improve `<name>.html`" — improve rules, content, archive codes, or dual-device UX
- "Promote `<name>.html` to A" / "what does it take to reach A tier"
- "Add archive codes / save codes to `<name>.html`"
- "Write / update `check-<name>.mjs` for `<name>.html`"
- "Run the tier / catalog / audit pipeline"
- "What conventions must `<name>.html` follow"

## Workflow

1. **Read the convention reference first** — `references/conventions.md`. Every game must satisfy the file-level rules (UTF-8, LF, no CDN, mobile canvas, ≥40 px targets) before tier work begins.
2. **Decide the target tier.** Default to `D` for a new prototype. The ladder and evidence rules live in `references/tier-workflow.md`.
3. **Pick the starting point.** Drop `assets/skeleton.html` into the repo as `<name>.html` for greenfield work; otherwise edit the existing file in place.
4. **Implement.** Keep all CSS + JS inline. Use Canvas or DOM as appropriate; never import a library or hit a CDN. For deterministic content (campaigns, daily seeds, fixed scenarios), use a Mulberry32 / xorshift PRNG with documented seeds — see `references/test-contract.md`.
5. **If the game has meaningful save state**, add the portable archive code per `references/archive-code.md`. Tamper rejection is mandatory for A-tier.
6. **Expose a `window.__<name>Test` surface** so the per-game Playwright check script can verify content, rules, and archives without re-implementing the engine — see `references/test-contract.md`.
7. **Update tier metadata together.** If the file is new, renamed, or moved between tiers, edit all three files in the same commit:
   - `GAME_TIERS.json` (preserve order `SSS,SS,S,A,B,C,D,E`, every `.html` exactly once)
   - `README.md` → the `## 游戏总览` table (the `index.html` parser reads this)
   - `GAME_AUDIT.md` (heading `### <Tier> 第<N>款` count must match)
8. **Run the verification pipeline** in `references/tier-workflow.md`:
   ```powershell
   node promo-video/scripts/check-game-tiers.mjs
   node promo-video/scripts/check-pages-catalog.mjs   # needs Playwright + chromium
   node promo-video/scripts/audit-games.mjs
   git diff --check
   ```
   For high-risk changes (rule engine, archive codes, content lists), also write or run the matching `check-<name>.mjs`.
9. **Stop short of S/SS/SSS.** Auto-checks cannot promote to those tiers — `RATING_STANDARD.md` requires a documented manual playthrough. Hand off to the user with the evidence checklist from `references/tier-workflow.md`.

## Anti-patterns to refuse

- Adding a CDN `<script src="https://…">`, fetching a font, or pulling a Web Worker from a remote URL.
- BOM at the start of the file, CRLF line endings, or any character that breaks `.gitattributes` LF normalization.
- A `<canvas>` wider than 390 CSS pixels, fixed pixel widths > 100vw, or touch targets < 40 px.
- Save data stored only in `localStorage` without a tamper-check hash. If save is exposed, expose it as a portable archive code.
- Two engines: a "real" one used by the player and a second one used by the reference solution or tests. Both must call the same functions.
- Editing only `GAME_TIERS.json` and not `README.md` / `GAME_AUDIT.md` — `index.html` and the consistency script will both fail.
- Claiming A/S/SS/SSS based only on automated checks.

## References

- `references/conventions.md` — file-level rules, HTML skeleton, mobile canvas math, control sizing, no-CDN policy, line endings.
- `references/tier-workflow.md` — eight-tier ladder, the four A-tier evidence pieces, exact check-script commands, how to add a per-game `check-<name>.mjs`.
- `references/archive-code.md` — `<PREFIX>.<version>.<base64url-payload>.<checksum>` format, FNV-1a, sanitization, legacy version readers, integration into a game.
- `references/test-contract.md` — `window.__<name>Test` contract that every check script depends on: `validateContent()`, pure rule functions, `encodeArchive`/`decodeArchive`, `referenceResult(i)`.

## Assets

- `assets/skeleton.html` — drop-in single-file game skeleton: UTF-8 LF, no CDN, viewport meta, mobile-fit canvas wrapper, placeholders for state, draw loop, input, archive code, and `window.__<name>Test`.

## Scripts

- `scripts/new-game.ps1` — interactively scaffold a new `<name>.html` from the skeleton, register it in `GAME_TIERS.json` (tier `D`), add a row to `README.md`, and add an `E` slot to `GAME_AUDIT.md`.
- `scripts/tier-audit.ps1` — run the full tier + catalog + audit pipeline and summarise which check failed.
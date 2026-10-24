# Tier Workflow

The repository uses an eight-tier ladder. Metadata lives in three files that
**must always be edited together**. Hard thresholds are codified in
`RATING_STANDARD.md`.

## Ladder

`SSS / SS / S / A / B / C / D / E` — 102 active games (`SSS–D`),
9 archived (`E`). Sorted top-down in `GAME_TIERS.json`.

| Tier | What it means | How it gets there |
| --- | --- | --- |
| `SSS` | Project showcase. Full manual playthrough, no obvious weakness. | Manual only. Never auto. |
| `SS`  | High-completion long-form with multiple systems changing the build. | Manual + auto evidence. |
| `S`   | Complete, replayable, ~20 min of new content, dual-device solid. | Manual + auto evidence. |
| `A`   | Core loop clear, replayable; engineering/dual-device/test evidence required. | Auto evidence + the four A-tier pieces. |
| `B`   | Short but fun; missing depth or long-term structure. | Manual judgement. |
| `C`   | Single-loop prototype with obvious gaps. | Manual judgement. |
| `D`   | Low quality today, but has a clear upgrade path. | Default tier for new files. |
| `E`   | Archived (replaced by a stronger game, too similar to another, or upgrade cost too high). File and URL kept, but no active QA. |

## A-tier evidence (the four pieces)

Required for any new file or any promotion to `A`. From `RATING_STANDARD.md`:

1. **Content listing** — fixed chapters / contracts / puzzles / levels
   statable by a script. Variation must be more than numeric scaling.
2. **Source-of-truth rule** — reference solution / auto-demo calls the
   same rule functions the player uses. No second engine.
3. **Dual-device playthrough** — at least one real desktop input and one
   `390 × 844` touch input covering the main loop.
4. **Engineering evidence** — `pageerror === 0`, `console.error === 0`,
   horizontal overflow `0`; for games with archives, archive round-trip
   works **and** tampered codes are rejected by the same loader.

Missing any one of these caps the file at `B` (or `C` for prototypes).

## Editing the three metadata files

Any new / renamed / moved / re-tiered game must update all three:

### `GAME_TIERS.json`

```jsonc
{
  "version": 1,
  "updatedAt": "2026-08-08",   // bump on every edit
  "tiers": {
    "SSS": [...],
    "SS":  [...],
    "S":   [...],
    "A":   [...],
    "B":   [],
    "C":   [],
    "D":   ["new-game.html"],   // add here for prototypes
    "E":   [...]
  }
}
```

Rules enforced by `check-game-tiers.mjs`:

- `Object.keys(config.tiers)` must be exactly
  `["SSS","SS","S","A","B","C","D","E"]` in that order.
- Every `.html` in the repo root (except `index.html`) appears **once**.
- No duplicates.
- The total matches `await readdir(rootDir).filter(html).length`.

### `README.md` → `## 游戏总览`

`index.html` parses this Markdown table at runtime via this regex:

```
^\|\s*([^|]+?)\s*\|\s*\[([^\]]+)\]\(([^)]+\.html)\)\s*\|\s*([^|]+?)\s*\|
```

So each row needs four columns: rating, `[title](file.html)`, content,
controls. Place new games in the matching `###` category section
(`### 策略、养成与大型玩法`, `### 动作、射击与即时反应`, …). Keep the
badge tier as plain text without `+` (no `A+`, no `S+`).

### `GAME_AUDIT.md`

Each tier has a heading shaped like
`### <Tier> 第<N>款`。The `<N>` after `第` must equal
`config.tiers[<Tier>].length`. The check script parses both the heading
and `^\| [^|]+ \| \`([^`]+\.html)\` |` rows.

## Verification pipeline

Run in this order before committing tier / catalog / game HTML changes:

```powershell
node promo-video/scripts/check-game-tiers.mjs
# Optional but recommended — needs Playwright + chromium installed:
node promo-video/scripts/check-pages-catalog.mjs
node promo-video/scripts/audit-games.mjs
git diff --check
```

`check-pages-catalog.mjs` writes evidence to `output/`. First time setup:

```powershell
cd promo-video
npm.cmd install
npx playwright install chromium
python -m pip install --target .tools\python -r requirements.txt   # if needed
```

## Per-game check script

High-risk games have their own `promo-video/scripts/check-<name>.mjs`.
Write one when:

- The rule engine is non-trivial (chess, sokoban, factory, sudoku, etc.).
- Tamper rejection or archive round-trip is part of the contract.
- A grid / canvas / physics simulation drives the gameplay.

The pattern (copy from `check-midnight-chess.mjs` or
`check-tiny-factory-contracts.mjs`):

1. Spin up a local `http.createServer` that serves repo files.
2. Launch Chromium (`channel: "msedge"` if available, else headless).
3. Navigate to `http://127.0.0.1:<port>/<name>.html`, wait for
   `window.__<name>Test` to attach.
4. Call the rule API directly (see `references/test-contract.md`) and
   assert content / reference / archive properties.
5. Drive a real desktop click sequence plus a real `tap` sequence on a
   `390 × 844` mobile context.
6. Capture screenshots to `output/<name>-{desktop,mobile}.png`.
7. Fail if `pageerror` or `console.error` fired.

Expose the API on `window.__<name>Test` from inside the game itself
(see `references/test-contract.md`).

## S/SS/SSS evidence handoff

`RATING_STANDARD.md` forbids automatic promotion past `A`. Hand off to the
user with this checklist before they finalize:

- [ ] Two complete manual long-form playthroughs (timestamps + decisions).
- [ ] For `SS`: ~40 min of new decisions, ≥3 systems that change the build.
- [ ] For `SSS`: zero obvious weaknesses across content / replay / control / originality.
- [ ] No tier-promotion commit message claims S+ that the file does not satisfy.
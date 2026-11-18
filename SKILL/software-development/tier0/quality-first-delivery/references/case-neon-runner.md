# Recorded case: NEON RUNNER

A real delivery where this skill was applied end to end. The artifacts stay in the project; the hashes below pin the version that was checked.

- Workspace: `C:/Git-repo-my/个人成长/fable5.2-repro/reproduction/spec-html/neon-runner/`
- Deliverable: `index.html`, 55,206 bytes, SHA-256 `0148586e…`, one self-contained file with no external requests.
- Contract: `quality-contract.json`, 11 user requirements, all `pass`, checker exit 0.
- Observation record: `evidence/observations.json` (Chromium), five screenshots, and `test-playwright.py` to rerun the suite.
- Author-applied: the same operator wrote the skill and delivered the game. This is task-level evidence, not an independent usability study; a reviewer should reopen the artifacts and rerun the suite.

## What the loop changed

The first playable build was not accepted as finished:

1. **Performance failed.** The first measurement was 15.5 fps at 1440×900. Removing a full-screen `mix-blend-mode` scanline layer, `backdrop-filter` on overlays, and rendering at 0.75× brought it to 60.0 fps (p95 16.7 ms). The fix was found by measuring, not by reading the effect labels.
2. **Readability failed.** A pre-rendered rooftop-prop layer placed dark boxes on the run line; they read as unlit obstacles. The layer was removed rather than defended, keeping magenta hazards unambiguous.
3. **Pickups were unreachable.** Shield and magnet spawned outside the player's vertical reach; an isolated test exposed it (shield stayed 0). Spawn height and pickup radius were corrected, then the shield absorbed a crate and the magnet pulled a shard.
4. **The fairness log was empty at first.** The invincibility debug flag was reset by `start()`, so the test crashed after three spawns. Reordering the test produced 81 spawns and a 0.747 s minimum gap. The test itself was fixed; the game's spawn rule did not need to change.
5. **Evidence drifted from data.** A later review found the shield and best-score rows quoted stale values. The tests now isolate the world, clear the stored best before the persistence run, and the contract quotes the values actually produced. Fixing the test, not the prose, closed the gap.

## Verified results

| Dimension | Observation |
|---|---|
| Loop | menu → run → pause → resume → crash → over → Enter restart, read from live state |
| Input | keyboard jump (720→636 px in 90 ms), ground slide, 68 px touch buttons, CDP swipe |
| Fairness | 81 spawns, 35 crates / 22 signs / 24 drones, minimum 0.747 s against 0.62 s floor |
| Pickups | isolated shield 1 → absorbed a crate with the run still running; magnet 7.34 s, shard count 0→1 |
| Persistence | score 52 → best 52 after reload; mute survives reload |
| Performance | 60.0 fps mean, p95 16.7 ms, 300 frames |
| Layout | 375 px: scrollWidth 375, no overflow, 68×68 targets |
| Hygiene | 0 console errors, 0 page errors, 0 failed requests, 1 unique request |
| Reduced motion | rain 93 → 34 drops |

## Still unverified

- The synthesized mix was not heard through speakers.
- Touch was emulated, not a physical phone.
- No screen-reader session.
- The FPS number is a headless software-renderer measurement, not GPU or phone performance.

## Reproduce

```bash
cd C:/Git-repo-my/个人成长/fable5.2-repro/reproduction/spec-html/neon-runner
python -m http.server 8000 --directory .
# in another shell, with Playwright + Chromium installed:
python test-playwright.py
python C:/Users/yuhang/.agents/skills/quality-first-delivery/scripts/check_contract.py quality-contract.json --base-dir .
```

Artifact hashes: contract `ef47de00…`, observations `df7bfae4…`, desktop play `088fd558…`, mobile `547d5385…`, menu `c97b2b23…`, pause `8cd71c4b…`, over `2fe1b8e5…`.

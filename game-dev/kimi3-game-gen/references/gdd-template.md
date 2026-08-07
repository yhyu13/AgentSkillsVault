# GDD Template (Condensed)

A condensed, web-game-flavored subset of `C:\Git-repo-my\GDDMarkdownTemplate`. The Designer agent fills these sections into the per-concern design-docs (see [`assets/design-doc-template.md`](../assets/design-doc-template.md)). Not every section is needed for every game — skip what does not apply.

Full original template lives at `C:\Git-repo-my\GDDMarkdownTemplate\` (13 sections, SmallerTableOfContents.md). Use this file when you need to look up a section's full depth.

---

## §3 Game Overview (→ `00-concept.md`)

- **Game Concept** — one-paragraph elevator pitch.
- **Genre** — Vampire Survivors / bullet hell / roguelike / arcade / idle / puzzle / etc.
- **Target Audience** — age, platform, session length.
- **Game Flow** — title → gameplay → game-over → retry loop.
- **Look and Feel** — palette (≤ 6 colors), typography, vibe (cozy? tense? neon?).
- **Project Scope** — number of enemies, weapons, levels, bosses.

## §4 Gameplay & Mechanics (→ `01-gameplay.md`)

- **Gameplay**
  - Game Progression — minute-by-minute curve (e.g. "0:00–2:00 = warm-up, 2:00+ = first mini-boss").
  - Mission / Challenge Structure — what is the player's loop?
  - Objectives — primary + secondary.
  - Play Flow — state diagram.
- **Mechanics**
  - Physics — gravity? top-down? fixed-plane?
  - Movement — speed, dash, knockback.
  - Objects — pick-ups, interactables.
  - Actions — primary fire, secondary, special.
  - Combat — damage formulas, crit, status effects.
  - Economy — XP / gold / souls / gems. Sources and sinks.
- **Screen Flow** — every screen and its transitions.
- **Game Options** — settings the user can toggle in-game.
- **Replaying and Saving** — meta-progression? localStorage keys?

## §5 Story, Setting & Character (→ `02-story-world.md`)

- **Story & Narrative** — back story, plot elements.
- **Game World** — general look, areas, connections.
- **Characters** — player, NPCs, bosses. Each gets: back story, personality, look, abilities, stats.

## §6 Levels (→ `02-story-world.md`)

- For each level: synopsis, objectives, physical description, encounters, walkthrough.

## §7 Interface (→ `03-interface.md`)

- **Visual System**
  - HUD — health, XP bar, timer, weapon slots, mini-map.
  - Menus — main menu, pause, options, game-over, victory.
  - Rendering System — Canvas 2D, DPR scaling, color tokens.
  - Camera — follow, shake, zoom.
  - Lighting Models — if any (most procedural games fake this with overlays).
- **Control System** — touch / mouse / keyboard mappings. Fall-back ladder.
- **Audio** — direction: synth palette (square/saw/triangle/noise), tempo, mood.
- **Music** — loop length, layers, transitions.
- **Sound Effects** — SFX catalogue (hit, pickup, death, level-up, ...).
- **Help System** — tutorial cards? tooltips?

## §8 Artificial Intelligence (→ `04-ai-systems.md`)

- **Enemy AI** — state machines, behavior trees, pathfinding (most 2D uses straight-line or steering).
- **Support AI** — aimbots, formation, scripted sequences.
- **Player & Collision Detection** — spatial hash? quadtree? simple AABB?
- **Pathfinding** — usually none for bullet hells; document the choice if used.

## §9 Technical (→ `05-tech-risk.md`)

- **Target Hardware** — desktop browser + low-end mobile (if applicable).
- **Development Hardware and Software** — Node 20+, Vite 5+, React 19, TS strict.
- **Development Procedures and Standards** — frozen contracts, tsc gate, no dev server per agent.
- **Game Engine** — fixed-timestep 1/60 in `engine.ts`.
- **Scripting Language** — TypeScript strict, no JS files in `src/`.
- **Risk Register** — what could blow up scope? (e.g. "boss 3 has 12 attacks" → mitigation: cap at 6).

## §10 Game Art (→ `05-tech-risk.md` + per-system data files)

- **Style Guides** — palette + silhouette vocabulary. Procedural-first.
- **Concept Art** — only if AI-generated hero art is needed (≤ 2 images).
- **Characters / Enemies / Equipment** — for each: silhouette description, palette, behavior.

## §13 Appendices (→ distributed into data files)

- **Asset List** — what is generated procedurally vs AI-imaged.
- **Sound** — SFX catalog with synthesis recipe.
- **Music** — BGM themes and loop structure.

---

## Skip-list for most web games

These full-template sections are usually overkill for a one-shot browser game and can be omitted:

- §1 Copyright Information — add a single-line credit in `index.html`.
- §2 Version History — generate from `git log` post-build.
- §11 Secondary Software — no installer, no editor.
- §12 Management — schedule/budget/risk-analysis/localization are waterfall-team artifacts.

## Section-to-doc mapping (canonical)

```
00-concept.md        ← §3
01-gameplay.md       ← §4
02-story-world.md    ← §5, §6
03-interface.md      ← §7
04-ai-systems.md     ← §8
05-tech-risk.md      ← §9, §10
```
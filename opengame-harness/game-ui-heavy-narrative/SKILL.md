---
name: game-ui-heavy-narrative
description: Design and build UI-driven games — visual novels, card battles, quizzes, and local PVP duels with dialogue, choices, and endings.
---

# UI-Heavy Game Design

## When to use

- Interaction is primarily UI: dialogue, cards, quizzes, menus. No physics, no tilemaps, no free movement.

## Scene types and flow patterns

Scene types: chapter (narrative), battle (turn-based card/quiz), ending (result), character select. Every game needs at least one.

Pick a flow pattern — don't invent a scene graph:

| Pattern | Flow | Best for |
|---|---|---|
| Single duel | Title → Battle → Ending | Simple card/quiz games |
| Story + battle | Title → Intro → Battle → Ending | Educational with narrative framing |
| Visual novel | Title → Chapters… → Ending | Interactive fiction |
| Full campaign | Title → Chapter select → Chapters + Battles → Ending | Multi-stage games, RPG card games |
| PVP duel | Title → optional Character select → Battle → Ending | Two-player local duels |

## Dialogue design

Entry types: text (speaker + content + optional expression; waits for click), choice (prompt + options with effects), event (side effect, auto-advances), character enter/exit (with position), branch (conditional path), wait (timed pause).

Each character needs an id, a portrait texture, a display name, optional expression map, and a default position. Choice effects modify tracked stats (`knowledge +2`) and can drive branches later.

## Battle design

- **Cards**: each has id, name, type (attack / heavy attack / defend / heal / special), value, optional description and quiz-subject link. Typical values: attack 10–20, heavy 25–40, defend 10–20, heal 15–25.
- **Quiz questions**: always exactly 4 options, 0-based correct index, and a REQUIRED explanation field for educational feedback. Optional difficulty (1–5) and subject.
- **Combo system**: streaks multiply damage — 2–3 streak ≈ 1.2×, 4–5 ≈ 1.5×, 6+ ≈ 2×. Combo applies to attacks only, not heal/shield.
- **Single-player turn flow**: intro → player turn → quiz phase → feedback → action → enemy turn → end check → loop.
- **Enemy config**: name, max HP, portrait, damage range.

## PVP round flow (local 2-player)

Show the question to both players first, then enable buzzers. First to buzz answers; correct = attack the opponent, wrong = self-damage. Track which player buzzed for damage attribution. Between rounds: destroy old UI before creating new, reset per-round timers and flags, and draw questions without repetition (pop from the bank).

## Presentation rules

- Characters are static portraits: front or 3/4 view, bust framing, one image per expression, named `{character}_{expression}`. Never animated sprites.
- One background per scene; endings get a mood-matched backdrop.
- Audio: one music track per scene mood; distinct effects for click, correct, wrong, damage, victory/defeat jingles.
- Large asset sets: split generation into two calls when the total exceeds ~8.

## Configuration values

Text typewriter speed, auto-advance delay, volumes, player/enemy max HP, hand size, optional quiz time limit, combo tiers, and dialogue box dimensions all belong in configuration — never hardcoded.

## Frequent runtime pitfalls

- Never start the battle flow from the setup hook — the lifecycle starts it automatically after the HUD exists; double-starting corrupts state (duplicate timers).
- Set HP values in the setup hook so the HUD can read them when it's created.
- When overriding the enemy turn, always signal turn completion at the end — otherwise the game freezes.
- Hide any open quiz modal before applying damage so HP bars stay visible (modal depth covers them).
- Guard answer handlers against double clicks — disable input immediately on the first click.
- Reset mutable state when scenes restart; engine instances are reused.
- Set click interactivity on the inner shape, not on a container — containers have no implicit hit area and crash.
- Register scene cleanup through shutdown events rather than overriding shutdown.

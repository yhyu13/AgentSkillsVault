---
name: journey
description: Dump a JOURNEY doc — a two-column ME/YOU chronological narrative of how a project was built (the human's requests, decisions, corrections, pivots vs the AI's builds, discoveries, falsifications, fixes), followed by a distilled "vibe coding with AI" lesson section. Use when the user says "dump journey" / "journey doc" / "write the journey", asks "how was this project built" or "summarize the history", or wants the meta-lesson on how to vibe-code with AI.
version: 1.0.0
metadata:
  category: software-development
  created_by: agent
---

# JOURNEY doc — project history + vibe-coding lessons

A JOURNEY doc captures not just *what* was built, but *how*: the chronological back-and-forth between the human (deciding, correcting, killing) and the AI (executing, falsifying, reporting), plus the reusable working-style lessons that fell out. It is durable record, not a chat summary.

## When to use

- User says "dump journey", "journey doc", "write the journey".
- User asks "how was this project built" / "summarize the history / progress chronologically".
- User wants the meta-lesson: "how does this project teach vibe coding / working with AI".

## Output structure (two columns + one lesson section)

1. **Header + legend** — state the column meanings up front: `ME = the human`, `YOU = the AI`. Dates as `YYYY-MM-DD`.
2. **Era sections** — group the chronology into ~8–12 eras (Foundation → Architecture → … → Current). Within each era, a two-column table:

   | ME | YOU |
   |---|---|
   | the human's request / decision / correction / pivot (verbatim where you have it) | what the AI built / discovered / got wrong / fixed |

3. **"How this project teaches vibe coding with AI" section** — three parts:
   - **The human's job** (decide, correct, kill) — each point anchored to a concrete project event.
   - **The AI's job** (instrument, falsify, report honestly) — each point anchored.
   - **The portable rules** — numbered, each tied to a real event.
   - **One-sentence takeaway** that names the division of labor.

## Rules for writing it

1. **Rebuild the timeline from durable memory, not the current chat.** Read the project's memory store / cerebrum / phase-status docs / anatomy index first. The chronological spine lives there.
2. **Quote ME verbatim when you have the words.** The highest-signal ME cells are the user's actual one-liners ("go b then c", "why are we still visual testing — diff the reference", "AABB is killing the PT results"). A quote beats a paraphrase.
3. **YOU cells report honest negatives.** The best YOU cells are falsifications and DEAD / MARGINAL / FAILED verdicts — they show the AI actually measuring and killing, not just shipping.
4. **Anchor every vibe lesson to a real event.** Generic advice ("communicate clearly") is dead weight. No anchor, no bullet.
5. **End with one sharp sentence** naming the division of labor.
6. **Write to a durable location** (`doc/<N>_<topic>/journey.md` or the project's phase-doc convention) — never a scratch path.

## The vibe-coding thesis to extract

Regardless of project, look for and surface these recurring patterns:

- **Measure before building, diff before measuring** — a reference impl exists → diff the algorithm; no reference → measure the gap first.
- **Fail fast at Step 0** — pre-commit a verdict band, test the premise in the cheap script that ships the data.
- **One correction → durable Do-Not-Repeat** — the highest-leverage human move is a one-sentence correction the AI banks forever.
- **Visual conclusions need a number** — a heatmap that *looks* like X is wrong until a script confirms X.
- **Narrow, don't widen** — each failure rules out a *class* of fixes, not just a value.

## Worked example

`d:\GitRepo-My\radiance-cascades-demo\3d\doc\11_generalization\journey.md` — a 10-era JOURNEY of the Radiance Cascades demo (2D→3D migration → cascade architecture → hybrid → measurement-first MBRC → ShaderToy pivot → data-driven-kernel refactor), ending in the vibe-coding lesson section. Use it as the template for structure, column voice, and lesson extraction.

## Reference anchors

- Canonical example: `d:\GitRepo-My\radiance-cascades-demo\3d\doc\11_generalization\journey.md`
- Source-of-truth for that example's history: `C:\Users\XINDONG\.claude\projects\d--GitRepo-My-radiance-cascades-demo\memory\*.md` and `.wolf\cerebrum.md`

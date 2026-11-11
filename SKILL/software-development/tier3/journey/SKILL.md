---
name: journey
description: Dump a JOURNEY.md at the project root — a Chinese-language two-column ME/YOU chronological narrative of how a project was built (the human's requests, decisions, corrections, pivots vs the AI's builds, discoveries, falsifications, fixes), with all risks and TODOs rolled up in a highlight section at the top, followed by a distilled "vibe coding with AI" lesson section. Use when the user says "dump journey" / "journey doc" / "write the journey", asks "how was this project built" or "summarize the history", or wants the meta-lesson on how to vibe-code with AI.
version: 1.1.0
metadata:
  category: software-development
  created_by: agent
---

# JOURNEY.md — 项目历史 + vibe-coding 经验（中文输出）

A JOURNEY doc captures not just *what* was built, but *how*: the chronological back-and-forth between the human (deciding, correcting, killing) and the AI (executing, falsifying, reporting), plus the reusable working-style lessons that fell out. It is a durable record, not a chat summary.

**本项目缘起·经过·结果**：缘起是 Radiance Cascades 演示（2D→3D 迁移）收尾时留下的 `journey.md`——一份 ME/YOU 双列记录人机来回的文档，事后证明比聊天记录更能沉淀经验。经过是把它抽成通用 skill，并两轮收敛：先确立双列叙述与 vibe-coding 经验结构，再改为中文输出、风险/TODO 前置高亮、`JOURNEY.md` 存项目根目录。结果是一个跨项目复用、把项目历史写成固定结构的写作 skill。

**Output conventions (non-negotiable):**

- Written in **Chinese**.
- Saved as **`JOURNEY.md`** (uppercase) at the **project root**.
- Opens with a **风险与待办 (Risks & TODO)** highlight section — see structure below.

## When to use

- User says "dump journey", "journey doc", "write the journey".
- User asks "how was this project built" / "summarize the history / progress chronologically".
- User wants the meta-lesson: "how does this project teach vibe coding / working with AI".

## Output structure (risk/TODO highlight + two columns + one lesson section)

1. **Header + legend** — state the column meanings up front: `ME = 用户`, `YOU = AI`. Dates as `YYYY-MM-DD`.
2. **风险与待办 (Risks & TODO) — highlight at the top.** Immediately after the header, roll up every risk and open TODO that appears anywhere in the doc into a short list, each item tagged with the era it belongs to. This is a highlight/roll-up only — **do not delete the inline risk/TODO mentions from the era tables**; the era tables still carry them verbatim.
3. **Era sections** — group the chronology into ~8–12 eras (起步 → 架构 → … → 当前). Within each era, a two-column table:

   | ME | YOU |
   |---|---|
   | 用户的请求 / 决策 / 纠正 / 转向（有原话就引原话） | AI 构建了什么 / 发现了什么 / 哪里错了 / 修了什么 |

4. **"这个项目如何教 vibe coding with AI" section** — three parts:
   - **人的工作** (decide, correct, kill) — each point anchored to a concrete project event.
   - **AI 的工作** (instrument, falsify, report honestly) — each point anchored.
   - **可复用的规则** — numbered, each tied to a real event.
   - **一句话总结** that names the division of labor.

## Rules for writing it

1. **Rebuild the timeline from durable memory, not the current chat.** Read the project's memory store / cerebrum / phase-status docs / anatomy index first. The chronological spine lives there.
2. **Quote ME verbatim when you have the words.** The highest-signal ME cells are the user's actual one-liners ("先做 b 再做 c", "为什么还在目测 — 直接 diff 参考实现", "AABB 正在毁掉 PT 结果"). A quote beats a paraphrase.
3. **YOU cells report honest negatives.** The best YOU cells are falsifications and DEAD / MARGINAL / FAILED verdicts — they show the AI actually measuring and killing, not just shipping.
4. **Anchor every vibe lesson to a real event.** Generic advice ("多沟通") is dead weight. No anchor, no bullet.
5. **End with one sharp sentence** naming the division of labor.
6. **Write in Chinese throughout.** Every narrative line, era title, table cell, and lesson point is Chinese. Keep `ME`/`YOU` as the column keys (legend `ME = 用户`, `YOU = AI`) or use `我`/`你` — pick one and stay consistent.
7. **Roll up risks & TODOs at the top.** Every risk and open TODO in the doc also appears in the 风险与待办 highlight section, each tagged with its era. The inline mentions stay in the era tables — the top section highlights, it does not replace.
8. **Save as `JOURNEY.md` (uppercase) at the project root.** Write to `<project root>/JOURNEY.md` — never `journey.md`, never a subfolder, never a scratch path.

## The vibe-coding thesis to extract

Regardless of project, look for and surface these recurring patterns:

- **Measure before building, diff before measuring** — a reference impl exists → diff the algorithm; no reference → measure the gap first.
- **Fail fast at Step 0** — pre-commit a verdict band, test the premise in the cheap script that ships the data.
- **One correction → durable Do-Not-Repeat** — the highest-leverage human move is a one-sentence correction the AI banks forever.
- **Visual conclusions need a number** — a heatmap that *looks* like X is wrong until a script confirms X.
- **Narrow, don't widen** — each failure rules out a *class* of fixes, not just a value.

## Worked example

`<radiance-cascades>/3d/doc/11_generalization/journey.md` — a 10-era JOURNEY of the Radiance Cascades demo (2D→3D migration → cascade architecture → hybrid → measurement-first MBRC → ShaderToy pivot → data-driven-kernel refactor), ending in the vibe-coding lesson section. Use it as the template for structure, column voice, and lesson extraction. (It predates the current conventions: the new output is Chinese, named `JOURNEY.md`, and placed at the project root.)

## Reference anchors

- Canonical example: `<radiance-cascades>/3d/doc/11_generalization/journey.md`
- Source-of-truth for that example's history: `<claude-project-history>/<radiance-cascades>/memory/*.md` and `.wolf\cerebrum.md`

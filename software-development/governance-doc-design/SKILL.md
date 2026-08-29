---
name: governance-doc-design
description: Use when authoring governance, rule, or design docs.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [docs, governance, rules, design-system, conventions]
    related_skills: [hermes-agent-skill-authoring, technical-design-document]
---

# Governance Doc Design

A disciplined structure for project governance docs — product rules, design
rules, dev rules, and legal/compliance. Derived from the Cindy client repo's
`docs/` conventions (F:\XD\git-repo\cindy\docs), which is the reference
implementation; the pattern is reusable for any repo that wants rules an agent
can actually follow.

## When to Use

- Authoring a NEW product/design/dev/legal rule doc, or a design spec / decision
  log / index for a repo.
- Updating an existing rule doc and needing to know which bucket it belongs in
  and how to keep it self-consistent.
- Setting up (or auditing) a `docs/` tree so that rules are discoverable,
  traceable to code, and checkable by tests rather than only by reading.

## Core principles

1. **Separate intent from implementation.** Product rules say "what the user
   should get / what behavior must not break"; design rules say "how it looks /
   interacts"; dev rules say "how code implements and verifies it". Never mix
   them in one file — each bucket has its own 收录标准 (inclusion criteria).
2. **Status is explicit and binding.** Every doc is either `authoritative`
   (约束力, agents must follow) or `参考` (background/spike, non-binding). A
   doc that doesn't state its status is ambiguous — that's a defect.
3. **A rule must say WHEN to read it, not just what it says.** Every rule doc
   opens with a `读取时机` (when-to-read) line so an agent knows when it applies.
4. **Every rule states trigger / must-do / must-not / verify / exception.** The
   dev-rules 收录标准 is the canonical shape of a single rule.
5. **Trace to code, not prose.** Rules cite a 事实来源 (source-of-truth) table —
   the authoritative file path (e.g. `colors.ts`, `layoutTree.ts`) that the rule
   governs. "grep the source" beats "trust the doc".
6. **Rules should be enforced by tests/lint, not just by reading.** If a rule
   can be frozen as a test invariant, do it and cite the test file. A rule only
   an agent reads will drift.
7. **Decisions are append-only.** Overturned decisions are never deleted — they
   are marked 作废/推翻/修正 and kept so the trail is legible.

## The four buckets

| bucket | governs | 收录标准 (a doc belongs here when…) |
|---|---|---|
| `product-rules/` | product behavior, UX, cross-end consistency | "what the user should get / what must not break" |
| `design-rules/` | visual, interaction, content design | "how it looks / interacts / reads" |
| `dev-rules/` | engineering constraints, implementation, verification | "how code implements / verifies, what tech ops are forbidden" |
| `legal/` | compliance, licenses, SBOM | legal/compliance artifacts |

Localized rules for a single directory/module go in that directory's nested
`AGENTS.md`; only cross-cutting or long-explanation rules go in `docs/`.

## Per-doc skeleton

A well-formed rule/design doc follows this shape (Cindy's concrete example in
parentheses):

1. **Title + status blockquote** — the first lines are a blockquote:
   `> 状态：权威/参考`, `> 适用范围：…`, `> 读取时机：…之前`. This is the routing
   signal; put it first, before any content.
2. **事实来源 table** — `| 内容 | 权威来源 |` listing the code file(s) that are
   the real source of truth.
3. **Numbered sections (§1, §2, …)** — stable IDs. Section numbers are frozen
   identifiers; renumbering breaks cross-references, so never renumber casually.
   If a section is absorbed/moved, leave a `§N 编号留占位` note.
4. **Review 清单** — a checklist an agent/reviewer runs against the diff.
5. **验证方法** — the test/typecheck command that must pass for changes touching
   this rule.

Example (dev-rule):
```
# 架构不变量
> **状态**：权威开发规则（authoritative）
> **读取时机**：新增或修改 package 依赖方向、main 加载方式、布局树结构之前

## 事实来源
| 内容 | 权威来源 |
| 布局树结构定义 | apps/desktop/src/shared/layoutTree.ts |

## 1. package 解耦
## 2. main 进程静态依赖
## Review 清单
## 验证方法
```

## Index and version ledger

- **Top index (`docs/README.md`)** — a table: `| 文档 | 类型 | 状态 | 治理/相关代码 | owner |`.
  Every doc registers here; a doc absent from the index is undiscoverable.
- **Per-bucket index (`<bucket>/README.md`)** — lists 收录标准 + current docs.
- **Version ledger (design index)** — dated entries, newest first, each:
  `- YYYY-MM-DD（主题）: what changed → where it landed (DESIGN.md §N + token/test)`.
  The ledger records change *history*; the spec file holds only current rules.

## Append-only decision log

Separate the "current truth" from "how we got here":

- The spec (e.g. `DESIGN.md`) holds **only currently-valid rules**.
- The decision log (e.g. `design-decision-log.md`) holds **history** — each entry:
  **date / 决策 / 背景与被取代方案 / 现行落点** (which section + token/test froze it).
- It is **只增不改** (append-only, never rewrite history). Overturned decisions are
  marked with explicit verbs: **推翻** (overthrown), **修正** (corrected), **作废但保留**
  (voided but kept for trail). Never silently delete a past decision.
- **Conflict rule**: when the spec and the decision log disagree, the spec wins.
  State this explicitly in the log's header.

## Errata discipline

When a documented value turns out wrong:
- Mark the stale text `~~struck through~~` with a date + reason + the replacement.
- Do not silently edit history — leave the erratum visible.
- Point to the frozen test/constant that now locks the correct value.

## Authoring workflow

1. Determine the bucket (product / design / dev / legal) — ask "what does this
   constrain: user outcome, appearance, or implementation?".
2. Check the bucket's 收录标准 — if it doesn't fit, put it in the right bucket or
   in a nested `AGENTS.md`, not here.
3. Write the doc with the skeleton above (status blockquote → 事实来源 → §sections
   → Review 清单 → 验证方法).
4. Register it in the top index + bucket index (type + status + owner).
5. If it can be enforced mechanically, add the test/lint and cite it in 验证方法.
6. For a decision that changes/overthrows a prior one, append to the decision log
   (date + 决策 + 背景 + 现行落点), never rewrite the spec silently.

## Pitfalls

- Mixing product intent with code detail in one doc (the top sin — buckets exist
  to prevent it).
- Omitting 状态/读取时机 — the doc becomes a wall of text no agent knows when to read.
- Renumbering §sections — breaks every cross-reference; freeze IDs, leave placeholders.
- Rewriting a decision log entry instead of appending a 推翻/修正 entry.
- A rule that only lives in prose with no test — it will drift; freeze invariants.
- Citing a value without its source file — "trust the doc" instead of "grep the source".

## Verification

- New doc appears in the top index AND its bucket index with a 状态 + owner.
- Every rule has trigger / must-do / must-not / verify / exception (or an explicit
  reason it doesn't need one).
- 事实来源 table cites real file paths that actually exist (grep-checked).
- Enforceable rules are backed by a test, and the test file is cited.

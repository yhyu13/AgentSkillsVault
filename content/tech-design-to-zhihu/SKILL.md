---
name: tech-design-to-zhihu
description: >-
  Turn a technical design or architecture analysis (是什么/不是什么, 根/主干/分支,
  ADRs, mermaid) into a Zhihu 专栏 article. Zhihu does not render mermaid or SVG
  — emit PNG diagrams and paste-ready Chinese prose. Use when the user asks
  写成知乎文章, 技术设计稿转知乎专栏, 知乎长文 from a design doc, 知乎没有 mermaid, or
  wants a public rewrite of packages/*/README-style analysis.
version: 1.0.0
metadata:
  category: content
  created_by: agent
---

# Tech design → Zhihu column

Rewrite a technical design document as a **Zhihu 专栏** the public can read. The source is a quarry, not a script. The article has one thesis. Zhihu does not render mermaid or SVG — every diagram is a **PNG**.

Worked example: `examples/goal-design-principles/` (from DeepSeek Harness `packages/goal` analysis). Companion architecture skill: **goal-design-principles**.

## When not to use

- A feed-sized 想法 / 短帖 — use a social-post skill.
- A LinkedIn / X post — use `blog-to-linkedin-post` / `blog-to-twitter-post`.
- Publishing via Zhihu Open Platform APIs — this skill stops at a paste pack.
- The source is only a topic or outline. Ask for the design doc; do not invent architecture.

## Output pack

```
<out>/
  article.md      paste-ready body (no mermaid, no SVG)
  images/*.png    figures in article order
  PUBLISH.md      upload order + title + 一句话导语
```

Default `<out>`: beside the source as `<stem>-zhihu/`, or the path the user names.

## Workflow

### 1. Read the pile

Read the source end-to-end. Collect: thesis, the **thread** (ordered 是什么/不是什么 steps), tree layers (根/主干/分支/树叶), diagrams (mermaid / SVG / PNG), named mechanisms, contrasts with other systems, file indexes (usually drop). Prefer the source's thread as the article spine when it exists.

If mermaid or SVG exists and no PNG yet, you will convert in step 4 — do not leave the fence for later.

### 2. Pick one public thesis

Write 2–3 candidate openings that imply different angles. Choose one (or the user picks). The rest of the article must serve that opening.

Default angle for harness / architecture docs: **the judgment a practitioner can steal**, not the file tree. Example: 「状态可回放，权限必须重授」beats 「本文拆解 packages/goal」。

### 3. Ground the reader

List concepts the Zhihu reader does **not** walk in with (fold, CAS, capability seam, phase vs activation). Each must be grounded in a block before a later block leans on it. Repo-internal names (`dsh-goal`, `GOAL_STALE_REVISION`) earn a line of gloss or they stay out.

### 4. Diagrams → PNG only

Zhihu will not render mermaid. SVG does not display. Read `references/zhihu-platform-rules.md`.

For every figure the article needs:

| Source | Action |
|---|---|
| Existing PNG that already states the claim | Copy into `images/`, keep the claim in alt text |
| Mermaid / ASCII / SVG | Render or redraw as PNG. Prefer the existing renderer in the repo (`html/…/*.png`) over regenerating. If none exists, draw a clean diagram PNG (title + 4–8 labeled boxes, light background, Chinese labels). |
| Decorative screenshot | Omit unless it proves a claim |

Never ship ` ```mermaid ` in `article.md`. Never link `.svg`. Alt text states the figure's claim, not "架构图".

### 5. Write original Chinese prose

- One idea per short paragraph. Prose carries argument; one table is enough for a true parallel set (four branches, two persistence choices).
- Recast 是什么 / 不是什么 as contrast sentences, not a spec dump.
- Drop file-path indexes from the body. At most a short trailing 「想对照源码」 of ≤ 8 lines if the user asked.
- Do not invent anecdotes, metrics, or affiliation.
- Headings stop at `####`. No GitHub admonitions.

### 6. Publish notes

Write `PUBLISH.md`: recommended title, 30–40 字导语, image upload order matching the article, reminder that local `images/` paths will not resolve on Zhihu until uploaded.

## Completion

Done when `article.md` has no mermaid/SVG, every figure is a PNG on disk, the opening's thesis is the article's thesis, and `PUBLISH.md` lists upload order. Then copy this skill directory to the vault if the user asked to publish the skill itself.

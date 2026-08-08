# Mindmap Extension Template

> Use this when extending an existing Markmap / MindNode / XMind mindmap with chapter content.
> Default format: Markdown source for [Markmap](https://markmap.js.org/) — easy to edit, easy to diff.

---

## Existing mindmap structure (assumed)

```markdown
# <Title>

> Markmap source file (rendered to HTML separately).

## 核心能力

### 已有分支 1
#### 子节点
- leaf 1
- leaf 2

### 已有分支 2
...
```

## Step 1 — Find the right branch to extend

For each chapter, identify the **existing top-level branch** that matches the chapter's domain:

| Chapter topic | Branch to extend |
|---------------|------------------|
| Rapid prototyping / MVP | `客户交付 > 售前` (or `实施`) |
| Deployment / DevOps | `工程能力 > 部署运维` |
| Customer communication | `客户交付 > 售后` (or `商业洞察 > 软实力`) |
| AI technique (RAG / Agent) | `AI 技术栈 > RAG` (or `Agent`) |
| Product / PM | `核心能力 > 产品思维` |
| Career / business | `核心能力 > 商业洞察` |

If the chapter is from a **distinct book** (e.g. FDE book vs generic PM book), create a **new top-level branch**:

```markdown
### 📘 <Book Name>（来源：<book>）

#### 第 X 章 · <Title>
- <key concept 1>
- <key concept 2>

#### 第 Y 章 · <Title>
- <key concept 1>
- <key concept 2>
```

## Step 2 — Add a `🆕` sub-branch to the existing branch

If the chapter is **part of the same book the existing mindmap is for**, extend the existing branch with a `🆕` sub-branch:

```markdown
### 客户交付

#### 售前
- 需求调研
- POC 设计
...

#### 🆕 快速原型能力（第 X 章）
- **决策快 ≠ 代码快**
- **需求五问法**
  - 现状
  - 痛点
  - 期望
  - 约束
  - 优先级
- **MVP 三条铁律**
  - 先让客户说 yes
  - 每行代码要回答问题
  - 假数据比没数据好
```

**Naming convention**: `🆕 <sub-topic>（第 X 章）` — the emoji flags "newly added", the chapter ref makes it traceable.

## Step 3 — Add leaf nodes

For each concept in the chapter note, add a leaf node under the new sub-branch. **Prefer bold for the top 1-2 leaves per cluster** to make scanning easier.

## Step 4 — Update the file header

```markdown
# <Title>

> Markmap source file (rendered to HTML separately).
>
> **更新日志**：
> - YYYY-MM-DD 扩充 <branch>（第 X/Y/Z 章）
> - YYYY-MM-DD 初始版本
```

## Step 5 — Note about regenerating the HTML

Most Markmap workflows have a separate `.html` file. The skill only updates the `.md` source. To regenerate the HTML:

```bash
# Using markmap-cli (if installed)
npx -p markmap-cli markmap mindmap/技能树.md -o mindmap/技能树.html
```

If the user doesn't have markmap installed, the `.html` file becomes stale. Note this in the README of the user's learning vault:

```markdown
> 📌 **如何更新 HTML**：在 VS Code 安装 Markmap 插件（按 `Ctrl+Shift+P` → "Markmap: Open Preview"），
> 或运行 `npx -p markmap-cli markmap mindmap/技能树.md -o mindmap/技能树.html`。
```

## What to AVOID

- ❌ Adding **every concept** as a leaf. The mindmap is for navigation, not storage. 5-10 leaves per new sub-branch.
- ❌ Creating **deep nesting** (H4+). Markmap renders H4+ as small text — use 2-3 levels max.
- ❌ Putting **long sentences** as leaves. Mindmaps are for **keywords** — 1-5 words per leaf.
- ❌ Forgetting the **date stamp** in the file header. If the user regenerates the HTML a year later, they need to know which version they're rendering.

## Worked example

See `examples/fde-ai-pm-ch2-4/mindmap/技能树.md` for the actual extension. The file shows:
- 3 new `🆕` sub-branches under `工程能力 > 部署运维` and `客户交付`
- 1 new top-level branch `📘 FDE 实战圣经`
- Updated header with 2026-08-08 date

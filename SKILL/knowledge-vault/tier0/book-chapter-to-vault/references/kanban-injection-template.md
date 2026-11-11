# Kanban Injection Template

> Use this when extending an existing Logseq / Obsidian / GitHub Projects Kanban with chapter-derived tasks.
> Compatible with the `kanban-plugin: basic` frontmatter (Logseq default).

---

## Existing Kanban structure (assumed)

```markdown
---
kanban-plugin: basic
---

## 📋 Backlog（待开始）
- [ ] existing task 1
- [ ] existing task 2

## 🚧 In Progress（进行中）
- [ ] existing task 3

## ✅ Done（已完成）
- [x] done task

## 🎯 季度目标（Q3 2026）
- [ ] goal 1
- [ ] goal 2

## 📝 更新日志
- [x] YYYY-MM-DD ...
```

## Step 1 — Add a sub-section to Backlog per chapter

For each chapter processed, add a new sub-section under **Backlog** with the chapter's `D1`...`D7` items:

```markdown
### 🆕 第 X 章《<Title>》衍生（YYYY-MM-DD 增）
- [ ] **D1** <action from chapter note>
- [ ] **D2** <action from chapter note>
- [ ] **D3** <action from chapter note>
- [ ] **D4** <action from chapter note>
- [ ] **D5** <action from chapter note>
- [ ] **D6** <action from chapter note>
```

**Naming convention**: `🆕 第 X 章《...》衍生（<date> 增）` — the `🆕` emoji makes it scannable, the date makes it traceable.

## Step 2 — Add a "currently working on" item to In Progress

If the user is starting any of the D-items immediately, move (don't copy) that D-item to In Progress and add a top-level "anchor" item:

```markdown
## 🚧 In Progress（进行中）

- [ ] <existing tasks>

- [ ] **🆕 背 <Book> 速查卡 N 章合集**（打印贴工位，YYYY-MM-DD 起）
```

This is the **cheatsheet-as-active-task** trick — committing to use the cheatsheet is itself a task.

## Step 3 — Mark reading-complete in Done

```markdown
## ✅ Done（已完成）

- [x] <existing done items>
- [x] YYYY-MM-DD 读完 <Book> 第 X-Y 章，生成 N 篇结构化学习笔记 + 速查卡
```

The format: `<date> 读完 <book> 第 X-Y 章，生成 N 篇结构化学习笔记 + 速查卡`. This makes "I read X book" visible in the Done column without being a vanity brag.

## Step 4 — Add a quarterly goal if the book enables a major project

If the book's action items add up to a larger project (e.g. FDE book enables "complete an end-to-end POC"), add to **季度目标**:

```markdown
## 🎯 季度目标（QX YYYY）

- [ ] <existing goals>
- [ ] **🆕 FDE 实战**：完成 1 个端到端 POC（包含"快速原型 + 部署 + 客户交付"全链路）
```

Only add this if the book genuinely unlocks a quarter-scale project. Don't add for "I read a book about time management."

## Step 5 — Update the 更新日志

```markdown
## 📝 更新日志

- [x] YYYY-MM-DD 初始化看板...
- [x] YYYY-MM-DD 读完 <Book> 第 X-Y 章，追加 N 个衍生任务（D1...DN）
```

## Edge cases

### User has no existing Kanban

Create a minimal one with the structure above. Put ALL D-items in Backlog. The user can rearrange.

### User has 10+ chapter D-items

Don't dump them all. Promote 2-3 to In Progress (the "I'm doing this week" ones), keep 4-5 in Backlog as "next week", and merge the rest into 1-2 thematic items like:
- [ ] 上述 6 项之外的 FDE 第三章衍生任务（按需挑选）

### User has multiple books being processed in parallel

Use a different emoji per book in the Backlog sub-section:
- 🆕 第 2 章《...》(FDE 书) 衍生
- 📘 第 3 章《...》(PM 书) 衍生

This prevents merge conflicts when the user has multiple books going at once.

## Worked example

See `examples/fde-ai-pm-ch2-4/kanban/kanban.md` for the actual injection. The file shows:
- 3 new sub-sections in Backlog (ch2/ch3/ch4, 5-6 items each)
- 1 new item in In Progress (cheatsheet commitment)
- 1 new item in Done (reading-complete)
- 1 new quarterly goal (end-to-end POC)
- 1 new log entry

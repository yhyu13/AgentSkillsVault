# Argument Map Template

> The intermediate artifact you build before writing the article note. This is your **private scratchpad** — not the final note. The note is the polished version; the argument map is the rough version that gets discarded after the note is written.

---

## What is an "argument map"?

An argument map is a structured list of the article's claims, each with its evidence. It's the analytical equivalent of a chapter's outline.

The goal: separate **load-bearing** claims (removing them breaks the thesis) from **decorative** ones (mentioning them is nice but the argument works without them).

## Template

```markdown
# <Article Title> — Argument Map

> Central thesis: <one sentence>
> Author/source: <who wrote it, when, where>
> Date processed: <YYYY-MM-DD>

## Load-bearing arguments (6-10)

### A1 · <Argument name>
- **Claim**: <1 sentence, the actual assertion>
- **Evidence**: <data point / case study / quote / comparison>
- **Source quote**: "..."
- **Status**: load-bearing (removing this = thesis breaks)
- **Cluster with**: <other arguments that support the same super-claim, if any>

### A2 · <Argument name>
...

## Decorative arguments (mention but don't develop)

- D1 · <name>: <1 sentence on what's mentioned but not load-bearing>
- D2 · <name>: ...

## Counter-arguments the article doesn't address

- C1 · <objection the article should have addressed>
- C2 · ...

## Open questions (will become the "待探索" section in the note)

- Q1 · <question the article raised but didn't answer>
- Q2 · ...
```

## How to fill it in

### Step 1 — Read once for the thesis

Read the article end-to-end (or skim 3 random sections if it's long). Write down **one sentence** that captures the article's central claim. If you can't, the article doesn't have a clear thesis — either ask the user what they want extracted, or downgrade to a "summary" note.

### Step 2 — Re-read section by section, list every claim

For each section, write down **what is being claimed** (not what's being described). The verb matters: "argues that...", "claims that...", "demonstrates that..." vs "describes...", "reports...", "introduces..."

A **claim** is a sentence that can be **true or false**. A **description** is a sentence that just reports.

Examples:
- ❌ Description: "FDE is a role at Palantir" (true by definition, no claim)
- ✅ Claim: "FDE exists because 95% of AI projects fail at the integration step" (assertion, can be tested)

### Step 3 — Cluster by super-claim

You probably have 15-25 raw claims. Most of them support a smaller number (6-10) of **super-claims**. Cluster them.

Example for the deep-analysis-fde article:
- Super-claim 1: "AI 落地失败率高" ← clusters: 95% MIT data, three breakpoints, AI ≠ AGI myth
- Super-claim 2: "FDE 模式能 scale" ← clusters: Echo+Delta, 碎石路→高速公路, 滚雪球
- Super-claim 3: "FDE 在 AI 时代被放大" ← clusters: AI 副驾驶, 量级跃迁, 7-3 缩到 3 天
- ... etc.

### Step 4 — Tag load-bearing vs decorative

For each super-claim, ask: "if I removed this, would the central thesis still stand?"

- **Yes** → decorative
- **No** → load-bearing

Load-bearing = 6-10. Decorative = drop or compress to one bullet.

### Step 5 — List counter-arguments the article ignores

This is the **most underrated step**. A weak analytical article ignores obvious counter-arguments. A strong one addresses them. Either way, you should know what's missing — this becomes part of your day-job "skepticism" toolkit.

### Step 6 — List open questions

What did the article make you want to know more about? These become your reading list.

## How to use the argument map

After filling this in, **the actual note is a re-statement** of the argument map in narrative form. You can literally convert:

- A1 → "论点 1 · <name>" section in the note
- Load-bearing argument list → "核心论点 (N 个)" section
- Decorative arguments → dropped (or merged into the most relevant load-bearing argument)
- Counter-arguments → folded into "Open Questions" or noted in the day-job section as "watch out for X"
- Open questions → "待探索的问题" section

You don't have to fill in every field. The point is to **think before you write** so the note is structured from the first sentence.

## Worked example

The actual argument map for "深度解析 FDE 数据特种兵" was:

**Load-bearing (10):**
1. 95% 失败率 → FDE 存在理由
2. 55 秒换线 → FDE 价值是结果不是软件
3. Echo+Delta 双人战术
4. 5 天 Bootcamp
5. 碎石路→高速公路（核心商业哲学）
6. Ontology 三步法
7. 滚雪球（3 月→3 天）
8. AI 解放 FDE 回架构师
9. FDE ≠ 咨询（两个核心指标）
10. FDE = 创业者黄埔军校

**Decorative (dropped):**
- 上海 200 人计划（叙事，不是论据）
- 摩根士丹利案例（举例，不是论据）

**Counter-arguments not addressed:**
- LLM 越强，FDE 是不是越被替代？（被论点 8 部分回应但不彻底）
- FDE 模式的人力成本 ROI 数据缺失

**Open questions (5):**
- Echo 在国内的对应角色是什么？
- Ontology 和 Data Mesh / 知识图谱的关系？
- 国内 FDE 薪资数据？
- ...

The 10 load-bearing arguments became the 10-argument note.

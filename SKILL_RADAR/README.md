# SKILL_RADAR

Research notes and live radars for the **AgentSkillsVault** — evidence-backed scans of the agent-skill ecosystem, written for one purpose: deciding **what to adopt into this vault, and what to build**.

## Convention

| Item | Rule |
|------|------|
| Filename | `YYYY-MM-DD-<topic>.md` — dated scan, immutable once written |
| Content | Conclusion first → evidence table → gaps/caveats → `[判断与建议]` → sources → disclaimer |
| Star counts | Always carry the fetch timestamp and the verification method (`GET /repos/…` vs `GET /search/…` vs aggregator †) |
| Unverified | Mark it † or "unverified". Never silently present an aggregator number as API-verified |
| Re-runs | New file, don't edit the old one. Diff the two and report the delta |

## Notes

| Date | Note | Scope |
|------|------|-------|
| 2026-10-24 | [Top 20 most-starred agent skills for FDE prototyping](./2026-10-24-top-20-agent-skills-for-fde-prototyping.md) | Top-20 star ranking + per-vertical radar across sales, marketing, database/data, monitoring/observability, info gathering, support, DevOps, orchestration |
| 2026-10-24 | [Agent 可编程视频雷达](./2026-10-24-agent-programmable-video-radar.md) | 渲染层 vs 流水线层 vs skill 层；BGM/TTS 混音缺口 |
| 2026-10-24 | [Agent 单文件 HTML 幻灯片 + TTS 朗读 / 自动播放雷达](./2026-10-24-agent-narrated-html-slides-radar.md) | Top-20 单文件 HTML 幻灯片 skill（带朗读/自动播放）+ 严格四合一下子集 + 高星无朗读对照表 |
| 2026-10-24 | [Top 20 agent-driven programmable video repos](./2026-10-24-agent-programmable-video-radar.md) | Code-rendered video (Remotion / HyperFrames / HTML→MP4 / Manim / Motion Canvas) + agentic video pipelines, with BGM/TTS audio-stack evidence per repo; CSV twin alongside |
| 2026-10-24 | [Top 20 most-starred work-deliverable agent skills](./2026-10-24-top-20-most-starred-work-deliverable-agent-skills.md) | Agent skills whose output is a work artifact - **slides/PPTX, tables/XLSX, documents/DOCX, OKR/plans, reports**. 49 finalists star-verified via GET /repos; per-vertical radar; finding: **OKR writing is a white space (max 11 stars)**, XLSX is suite-shaped (10.7k for genoffice); CSV twin alongside |
| 2026-10-24 | [Agent startup radar — skill builders, AI employees, all-night workers, distilled masters](./2026-10-24-agent-startup-radar-skill-employee-allnight-distilled-masters.md) | Top-20 star ranking across four agent-startup archetypes + per-archetype radar, OSS digital-worker tier (all sub-1k★), and the commercial startup layer; CSV twin alongside |
| 2026-10-24 | [Top 20 agent skills for MBA / business domains](./2026-10-24-top-20-agent-skills-for-mba-business-domains.md) | Market analysis, competitive analysis, PRD, entrepreneurship kits, finance/accounting/valuation, sales & GTM, strategy frameworks, HR/legal/ops — ranked by stars plus a by-vertical radar; CSV twin alongside |
| 2026-10-24 | [雷达采纳批次：submodule 落地 + skill 安装记录](./2026-10-24-radar-adoption-install-record.md) | 上面 6 篇笔记各自结尾的「采纳清单」如何落地：34 个 repo 变 `vendor/` submodule、137 个 skill 装进分类目录并分发到用户级；含 7 类不装理由、4 处刻意适配（重命名 / 前缀 / frontmatter 补丁） |

## Adoption status（哪些结论已经落进 vault）

| 结论 | 状态 | 落地位置 |
|------|------|---------|
| Office 文档编辑（docx/xlsx/pptx/pdf）缺能力 | 已装 | `content/genoffice` `content/excel-hygiene` `content/legalrabbit-docx`；`vendor/document-SKILLs` 只 vendor（与 anthropic 同名冲突） |
| OKR 写作是白区（最高 11★） | 已装现成件，但建议后续与 vault 自有件合并 | `content/okr-planner` vs `software-development/perf-tracking-platform` / `content/progress-doc-style` |
| 金融方法密度 > star 密度（6★ 的 DCF/LBO 包胜过 163k★ 名单） | 已装 | `management/finance/**`（15 个，vendor/everything-claude-finance） |
| 可观测性是最好的一块白区 | 已铺观察面 | `devops/grafana/**` `devops/dynatrace/**` `devops/monte-carlo/**` `devops/planetscale/**`（71 个，产品绑定，未实跑） |
| 装第三方 pack 前先过安全闸 | 已装 | `software-development/skill-inspector`（NVIDIA SkillSpector） |
| 少加渲染类 skill，优先补 BGM/TTS 混音契约 | 部分 | `vendor/html-video`（契约参数来源）+ `video/elevenlabs` `video/acestep`；契约本身仍是本地自建活 |
| 朗读层是增量（不是再加一套 HTML 幻灯片） | 已装样本 | `design/opendeck` `design/storyboard` `design/visual-learner` `design/video-production`；`narrated-deck` 仍是待建的活 |
| 采纳上游依赖四件套（format/scoring/safety/method） | 3/4 | format=`vendor/agentskills-spec`（只 vendor）、scoring=`software-development/skillopt-sleep`、safety=`software-development/skill-inspector`、method=`software-development/` 8 个 superpowers skill |

详见 [采纳批次安装记录](./2026-10-24-radar-adoption-install-record.md)。

## Method: two independent passes, then diff

The first scan (2026-10-24) ran one topic-sweep query set and **missed `obra/superpowers` (304,476 stars) — the #1 skills repo in the ecosystem**, because it carries no `topic:agent-skills` label. A second, independent pass that queried skill-framework repos directly found it.

**Rule for future scans: use at least two query strategies and diff the results.**
1. Topic sweeps (`topic:agent-skills`, `topic:claude-skills`, `topic:mcp`, `topic:observability`, …) — see `scripts/refresh-stars.ps1`.
2. A fixed list of known skill-framework / marketplace repos looked up directly via `/repos/{owner}/{repo}`.

Anything found by only one strategy is a candidate for a miss, and anything found by neither needs a manual check before the note claims it is absent.

## Re-running a star scan

`scripts/refresh-stars.ps1` — one GitHub search-API call per topic, prints `stars<TAB>full_name<TAB>description`. Unauthenticated GitHub allows 60 core requests/hour and 10 search requests/minute; use a `GITHUB_TOKEN` if you have one.

```powershell
pwsh -File scripts/refresh-stars.ps1 -Topics "agent-skills","claude-skills","observability","sre"
```

`scripts/gh_sweep.py` — the same job in Python (works around .NET TLS/connection failures that broke `Invoke-RestMethod` on this host, and around the PS 5.1 `ConvertFrom-Json` depth limit on large search payloads). It takes a query list from a file, sleeps 8s between calls, and emits TSV.

```powershell
python scripts/gh_sweep.py sweep  --out data/sweep.txt --queries-file data/queries.txt --per-page 40
python scripts/gh_sweep.py verify --out data/verify.txt --queries-file data/verify-list.txt
```

Raw payloads for the 2026-10-24 agent-startup scan are kept in `data/` (`sweep-2026-10-24.txt`, `sweep-phrases-2026-10-24.txt`, `verify-2026-10-24.txt`) so any row in the notes can be re-checked without re-running the sweep.

## Why stars are not enough

The most useful finding from the first scan: **stars follow the kit, installs follow the file.** A 287k-star repo's most-installed skill (18,189 installs) is out-installed by a same-named skill from a 1,075-star repo (20,611 installs). Index future skills by `stars` **and** `installs` **and** `pushed_at` — a high-star repo with a stale `pushed_at` is dead weight.

The MBA/business scan adds a sharper version of the same lesson: **stars are inversely correlated with method depth in that niche.** `brainbytes-dev/everything-claude-finance` (6 stars) contains `dcf-valuation`, `lbo-modeling`, `precedent-transactions` and `pitch-book-creation`; `M-MMahmood/business-frameworks-agent-skills` (0 stars) contains all 26 canonical strategy frameworks. Both beat a 163k-star agent roster that has no financial model at all.

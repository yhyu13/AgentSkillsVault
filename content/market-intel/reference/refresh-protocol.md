# Refresh protocol, keep the source matrix current

This skill's value is a curated source matrix. Tools, prices, and barriers in the commercial-data
space move fast (every survey round found acquisitions, price changes, and dead tools within
months). Re-run this protocol periodically to keep `domains/`, `volatile/pricing-install.md`, and
`sources-index.md` accurate.

## Cadence

**v0.17.0 overhaul**, the old "quarterly default" was a v0 residue from when the matrix had
~30 entries. With 155+ tool docs and a `live-runs.jsonl` feedback loop, the default is now
**monthly**. Quarterly is reserved for the broad horizon scan.

- **Weekly** (light pass, Discovery angles ①②④ only, i.e. just discover-new, no full
  re-verify, no shard rewrite): `crypto-defi`, `browser-automation`, `frontier-research`,
  and the new meta-domain `mcp-ecosystem`. These move on a sub-week timescale (patchright →
  camoufox → nodriver reactive-detection turnover happened inside 4 weeks; new MCP releases
  daily). Weekly pass writes to `discovery-state.md` candidate inbox; full Verify & Diff
  defers to the monthly sweep.
- **Monthly** (full sweep): everything else. Was quarterly pre-v0.17.0.
- **Quarterly**: only the **Horizon scan H1-H4** (cross-domain trend / new-territory /
  new-research-angle discovery). Per-domain monthly already catches new tools in known
  domains; horizon-scan is the place to catch new *categories* of work.
- **Opportunistic**: a dead/changed tool encountered in a real run → fix that shard
  immediately, log to `live-runs.jsonl`, do not wait for the cadence.

If `live-runs.jsonl` flags a domain as `hot` in Step -1 of a sweep, that domain's
Discovery budget for the sweep is **doubled** (more angles, more candidates) regardless
of its cadence tier.

## Procedure (full sweep)

每次自动运行分两阶段：**发现阶段（Discovery，找新东西）** + **核实/差分阶段（Verify & Diff，旧条目校验
+ 落库）**。旧版协议只做后者，会停滞,必须先跑发现阶段主动挖掘更前沿的工具，再用准入门槛过滤。

> 发现阶段的完整规则见下方 **「Discovery phase（前沿发现 + 质量筛选）」** 一节。它产出一个
> 「候选池（candidate pool）」，核实/差分阶段只处理通过准入门槛的候选 + 旧条目复检。

-1. **Step -1, 消费 live-run 账本（必跑，v0.17.0 起）。** 账本在**私有 store**（`<伴生仓>/
    data/metrics/live-runs.jsonl`，由 `fleet_guards.runtime` 解析），**不在本仓**：它记录你真实在调研什么，是
    data 而非工具知识。在 Horizon scan 之前,先读账本自上次 refresh 以来的所有条目（按 `ts` 过滤;首次跑取最近 90 天）,按
    `outcome` 分桶:

    | outcome | 含义 | 该轮的处置 |
    |---|---|---|
    | `dead` | 真实使用中工具死了 | 该工具所在 domain 升级为 **hot**(本轮 Discovery 预算 ×2);该工具该轮必复检,八成进入 C4 墓碑 |
    | `barrier_found` | 命中新付费墙/captcha/反爬 | 该 domain 升级为 hot;启动 D-PRICE / D-TOS / D-CAPTCHA 评估;考察是否到达"第 3 次同档 D-PRICE → 触发 ROADMAP brokerage transport"(P2 触发条件) |
    | `coverage_gap` | 用户问题用现有矩阵答不上 | 该 domain 升级为 hot;Discovery 时显式带"为什么这个 gap 没被现存工具覆盖"角度 |
    | `price_mismatch` | shard 排名/价格与真实不符 | 该工具该轮必复检 + 改 shard,但**该 domain 不一定升 hot**(可能是缓慢漂移) |
    | `verified` | 已核实记录明确指定的能力或文档范围 | 只有 `verification_scope=tool_documentation` 且 `evidence_ref` 非空时，才可在 cleanup 阶段推进整份工具文档的日期；单次能力调用成功不获得整份文档的 STALE 豁免 |
    | `fallback_used` / `unverifiable` | 保留原始结果含义 | 列入待复检项；不自动授予核实信用，也不推断为访问壁垒 |
    | `transport_error` / `auth_failed` / `quota_exceeded` / `content_invalid` | 分别记录传输、鉴权、额度或内容校验失败 | 保留失败类型并复检；不能当成成功的空结果 |
    | `user_correction` | 用户人工修正 | 最高优先级复检信号；原话保存在私有账本，公开文档只写经核实的通用工具事实 |

    完整的 12 种结果、必填字段及日期推进条件见 `live-run-contract.json`；未知结果必须保留并触发复检。

    输出: hot-domains 清单(本轮 Discovery 这些 domain 的角度数 + 候选数翻倍)、必复检 slug 列表、
    cleanup-auto-bump 清单。**此步是后续所有步骤的优先级输入**,不是装饰。

0. **按季度运行 Horizon scan**：仅在 Jan/Apr/Jul/Oct 的月度全量扫中运行 H1-H4，按下方规则寻找已有域之外的新领域、工具品类和调研角度。FOLD 项并入下一步；NEW-DOMAIN/NEW-SKILL 进 PR。其他月份的全量扫只做 10 分钟的“当月脉搏”快照，再继续域内 Discovery。
1. **跑发现阶段**：按下方 Discovery phase 规则，对每个域并行盲扫多个发现源，产出候选池
   （每个候选附带：来源、score、对现有首选的「新增/替换/不收录」裁决 + 理由）。
2. **Apply the same quality guardrails** as a normal run (verify each claimed tool exists and the
   price against its official site, do not trust a subagent's recalled pricing).
3. **Incremental edit, don't rewrite**: for each domain, update only changed rows in
   `domains/<domain>.md`; move/refresh price+install lines in `volatile/pricing-install.md`; bump
   that section's `last_verified: YYYY-MM`. Update `sources-index.md` only if a domain's top pick
   changed.
3b. **Keep the L2 per-tool docs + install guide in sync** (added v0.10.0): for every tool **ADDed or
   REPLACEd**, create/update `reference/tools/<slug>.md` (per-tool how-to: install + auth + usage +
   踩坑, each fact gh-api/official-site verified), its `reference/tools/index.md` row and its
   canonical `reference/tools/registry.json` record together. Apply the same synchronization to
   renames. For every tool **tombstoned**, retain and mark its shard row, index row and tool card
   `⚠ Avoid (dead, D-xxx)`, and retain its registry record with synchronized metadata. Touch `reference/install-guide.md` only when install *mechanics* change (a new
   prerequisite, an HTTP/stdio transport shift), per-tool commands live in the tool doc +
   `pricing-install.md`, not the overview. **Also re-verify the swept domain's EXISTING docs (not just
   changed ones) and bump each `## Last verified` only when actually re-checked**, full doctrine in
   **§文档层防腐协议 (R1 to R4)** below. The gate enforces this layer: **TOOLS** (index↔doc, BLOCK) +
   **REPO/STAR** verify repos cited inside tool docs (a hallucinated doc repo 404s → BLOCK) +
   **FRESH** rejects future doc dates + **STALE** WARNs docs unchecked >9mo + **DOCCOVER** WARNs a live
   shard repo with no doc (catches lost tracking).
4. **Record the diff** in `CHANGELOG.md` at the repo root (date + per-domain added/removed/changed),
   and bump the plugin `version` in `.claude-plugin/plugin.json`.
5. **Commit + push** to whichever Git remote this matrix repo lives at.

## Discovery phase（前沿发现 + 质量筛选）

发现阶段的目标：**主动发现新出现的、可能比现状更前沿/更优的工具·MCP·开源仓库·技术路线**，并在它们进库
之前用「去炒作 + 去低质」门槛过滤掉垃圾。原则一句话：**广撒网发现、严准入筛选、对比式裁决、宁缺毋滥**。
发现阶段不直接改任何 shard,它只产出一个**候选池**交给核实/差分阶段。

发现阶段读 `domains/<domain>.md` 拿到该域的**现有首选 + 现有条目 + 各条目的 barrier route（①②③④）**，
作为对比基线；下面所有「替代升级」裁决都是相对这个基线做的。

**Discovery agent MANDATORY reads (修正自 2026-06-17 prompt-bug)**: 每个 Discovery agent 在 fan-out 时
MUST 读这 5 个文件,而不仅仅是它自己的 domain shard:

1. `sources-index.md`, 矩阵地图,知道域间分工
2. `domains/<this-agent-domain>.md`, 自己域的现状基线
3. `refresh-protocol.md` D1-D5(本节及以下), 发现规则
4. **`discovery-cn.md`**, 中文源(没有它,所有 Discovery agent 都看不见 CN 工具生态)
5. **`domains/mcp-ecosystem.md`**, 元域(MCP 来源汇总,避 15 个 agent 各自重派 MCP 注册中心)

历史 lesson: 2026-06-17 sweep 的 16 个 Discovery agents 因为 prompt 写了 "Read these THREE files only",
直接锁死了第 4-5 项 → CN 工具 0 命中,mcp-ecosystem 元域形同虚设。本错误已修复,任何未来的 Discovery
workflow script MUST 包含上述 5 项 reads。

### D1. 发现源清单（discovery surfaces）

按「覆盖什么 / 怎么查 / 信号质量」三栏组织。每个域至少覆盖 A/B/C 三大类发现源（注册中心、GitHub、社区）；
能替代付费的免费方案（route ④/③）要专门跑 D 类。

**A. MCP 注册中心**（覆盖：现成可即插即用的 MCP server）, 完整发现源 + 轮询节奏见 `domains/mcp-ecosystem.md`（meta-domain）。下表是 A 类最常用入口子集；新注册中心 / 新 IDE marketplace 出现时只更新 mcp-ecosystem shard，不必散到 13 个域。
| 发现源 | 怎么查 | 信号质量 |
|---|---|---|
| smithery.ai | 按域关键词搜 + 看「新上架 / 安装量排序」 | 中。安装量是弱采用度信号，但有刷量；很多是套壳 |
| glama.ai/mcp | 关键词搜 + 它给的质量评分/排行 | 中。有自带质量分可参考，仍需复核 |
| mcp.so | 关键词搜 + 分类浏览 | 中低。收录广但噪声大、停更多 |
| pulsemcp.com | 关键词搜 + 「Newest」时间序 + 周报 newsletter | 中高。**时间序最适合「自上次以来的新增」**；周报已做一轮人工筛 |
| registry.modelcontextprotocol.io（官方 registry） | 官方索引/API 查 | 高（权威来源）。但收录滞后、覆盖不全 |
| mcp.apify.com / Apify Store | 搜 actor + 看运行量、评分、维护者 | 中高。actor 有真实运行量与定价，采用度信号较硬 |

**B. GitHub**（覆盖：开源仓库、自托管/浏览器路线、有无现成 MCP wrapper）
| 发现源 | 怎么查 | 信号质量 |
|---|---|---|
| Trending（按语言/按周） | github.com/trending 按域语言筛 | 中。能抓「正在起势」，但易被运营/营销带节奏 |
| 新建高星仓库 | GitHub Search API：`created:>last_verified stars:>N`，按 star 排序 | 中高。**「新建 + 已聚星」是前沿性最强信号之一**，但要查刷量 |
| 近期高活跃 | Search：`pushed:>last_verified` + 关键词，按更新排序 | 中。抓「老仓库突然加速」 |
| awesome-lists | 搜 `awesome <domain> mcp` / `awesome <platform>`，取近期 commit 的清单的 diff | 中高。人工策展 + 看清单本身是否在维护 |
| topic 搜索 | 按 topic（`mcp-server`、`web-scraping`、`twitter`…）+ 排序 | 中。覆盖广，需配合活跃度过滤 |
| 现有首选仓库的 network | 看现有 top pick 的 forks/「used by」/「dependents」与 release notes | 高。能发现「替代品」「更活跃的 fork」「上游已弃用」 |

**C. 社区讨论 / 信号面**（覆盖：真实采用、口碑、踩坑、是否炒作）
| 发现源 | 怎么查 | 信号质量 |
|---|---|---|
| Hacker News | Algolia HN API 搜域关键词 + 工具名，看 points/评论质量 | 高。**评论区是去炒作的金矿**,HN 会直接拆穿 vaporware/套壳 |
| Reddit | 对应 subreddit（r/webscraping、r/SEO、r/algotrading…）搜近月帖 | 中。真实使用反馈多，也有营销号；看评论而非楼主 |
| X / 推特 | 复用本 skill 的 x-twitter 源搜工具名 | 中低。**发现力强但炒作最重**，只当线索不当证据 |
| Product Hunt | 按域类目看近期 launch + upvote/评论 | 中低。营销驱动，upvote 可买；只取「真有人用」的信号 |

**D. 各工具 changelog / release（覆盖：现有条目与候选的真实维护节奏、能力变更、定价变更）**
| 发现源 | 怎么查 | 信号质量 |
|---|---|---|
| GitHub Releases / CHANGELOG | 现有首选 + 候选仓库的 release 频率与最近一条 | 高。维护节奏的硬证据，停更/加速一眼可见 |
| 官方 pricing / blog | 抓官网定价页 + 更新日志（验证价，不信 subagent 记忆） | 高（L1）。**barrier-route 漂移的权威来源**（API 转付费、免费层砍量） |

**E. 高信号面 (auto-pollable)**（覆盖：单次 HTTP / RSS 即可拉到的高 S/N 候选源,v0.17.0 weekly tier 的主力）

A to D 多需关键词组合 + 翻页 + 人读。E 类不同：**一次 HTTP/RSS 调用就能拿到结构化结果**，每条结果就是一个候选
线索，零运营成本。理想搭档 = Cadence 的 weekly 轻量扫（不全量 verify，只往 `discovery-state.md` 的 inbox
追加候选，留给月度 sweep 复核）。每个候选记录到 inbox 用统一格式：`{discovered_at, surface, name, url,
signal(stars/score/points/dl-growth/upload-date), one_line_pitch}`，让月度 sweep 按 signal 排序处理。

| 发现源 | 怎么查 | 阈值 | 信号质量 |
|---|---|---|---|
| **E1. PulseMCP newsletter RSS** | RSS：`https://www.pulsemcp.com/feed.xml`（若 404 退回 `https://www.pulsemcp.com/` 找 `<link rel="alternate" type="application/rss+xml">`；URL 未在 curl 下成功验证，**首次跑须人工确认**）| 任何新条目（已人工策展）| **最高**。已经过 PulseMCP 团队人工筛，每 token 的 MCP 发现密度最高；几乎无噪。Weekly 轮询。<br>**候选日志**：把每条 newsletter 提到的 MCP 单独写一行进 `discovery-state.md` inbox，标 `surface=E1` + 摘自哪期 |
| **E2. GitHub Search velocity API** | `gh api --hostname github.com 'search/repositories?q=created:>YYYY-MM-DD+stars:>50+topic:mcp-server'`；并行重复 `topic:claude-skill`、`topic:llm-agent` | **≥50 star 且 <90 天龄** | **高**。捕「天生即火」型仓库,纯靠 github.com/trending 看不到（trending 偏向已有粉丝基础的作者发新仓时短暂上榜）。每次 refresh sweep（含 weekly）都跑。<br>**候选日志**：每仓库一行 `surface=E2`，记录 `created_at + stars + repo` 三元组，月度 sweep 再 gh api 复核 star 真实性（防刷量） |
| **E3. HF Spaces trending JSON** | HTTP GET：`https://huggingface.co/api/spaces?sort=trendingScore&limit=50`（JSON，无须鉴权）| `trendingScore > X`（初轮经验校准；建议从前 10% 切，跑 2 轮后定阈值）| **中高**。常在 GitHub trending **之前** 抓到新 agent demo / tool wrapper to HF demo 上线门槛比开源发布低。Weekly during hot-sweep。<br>**候选日志**：每 Space 一行 `surface=E3` + `trendingScore` + `task tag` + author |
| **E4. npm download velocity API** | 候选 npm 包：`https://api.npmjs.org/downloads/range/last-week/<pkg>` + `last-month/<pkg>`，算 WoW 增长比 | **WoW ≥2x 且周下载绝对值 ≥500** | **高**（远强于 star）。下载量＝真实安装动作，比 star 抗刷量、抗营销得多。每次 refresh sweep。<br>**候选日志**：每包一行 `surface=E4` + `weekly_dl + WoW_ratio + npm_url`，触发条件后直接进 month-sweep 的必复检列表 |
| **E5. Show HN / Launch HN scan** | Algolia HN API：`https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&query=mcp+OR+agent+OR+scraper`（按时间排序，无需鉴权）| `points ≥ 30` **或** 顶层有实质讨论串（≥10 评论且非营销号）| **高**。Show HN 是**工具优先**的展示窗口（不是 think-piece），往往在 release 后 24 to 72h 出现，HN 评论区天然去炒作。Weekly during hot-sweep。<br>**候选日志**：每帖一行 `surface=E5` + `points + comment_count + repo/site_url`（HN 帖子里附的链接） |
| **E6. AI YouTube early-demo handles** | YouTube 每频道 RSS：`https://www.youtube.com/feeds/videos.xml?channel_id=<UCID>`；订阅 4 个频道：Matthew Berman、AI Explained、Cole Medin、AI Coffee Break（首次跑需各自抓 UCID）| 任何提到 MCP / 新 agent / 新工具的新视频 | **中高**。这几位常在重要 release 后 24h 内出 demo,**「有人真试过」的最快信号**，能补 HN/Reddit 还没消化的真空期。Manual digest weekly。<br>**候选日志**：每视频一行 `surface=E6` + 频道 + `published_at` + 视频里点名的工具列表 |

> **Polling automation note**：E1 to E5 全部是**单次 HTTP / RSS 调用**，E6 是**每频道一次 RSS**,零运营成本、
> 无需浏览器自动化、无登录态、无速率限制风险（HN/npm/HF/GitHub 均公开匿名可用）。这正是 v0.17.0 引入的
> weekly 轻量扫节奏的理想匹配：一个 ~50 行的 cron 脚本即可把 6 个面全拉一遍，输出统一格式直接 append 进
> `discovery-state.md` 的 inbox section。月度全量 sweep 再从 inbox 按 signal 排序消费,把 weekly 的「发现」
> 与 monthly 的「核实」彻底解耦，发现端不再受 subagent 预算约束。

**F. 中文发现源（CN surfaces）**,A to E 主扫英文圈，会系统性漏掉国产生态（DeepSeek 工具圈 / 即梦 / 可灵 /
MiniMax / 抖音电商 / 小红书 / Qwen ecosystem）。每轮 sweep 按 `discovery-cn.md` 跑一遍 CN 源（即刻 / 36Kr AI /
量子位 / 极客公园 / 十字路口播客；小红书 + DeepSeek 群仅 Horizon 季度扫）；候选写入 已验证私有伴生仓 DATA 目录下的 `discovery-state.md`
的 **CN candidates** 子段，每条同时记录中文原名 + 最近的英文等价物/GitHub 链接以便与主候选池 dedup。完整清
单、polling 方式、入选准则、CN-only 必跑域见 `discovery-cn.md`。

### D2. 多模态盲扫策略（multi-angle blind scan）

对**同一个域**派多个 subagent，**各自只从一个角度扫、互相不知道对方结论**（盲扫，减少互相锚定的盲区），
最后由 combiner 去重合并。每个域的盲扫角度（按域繁忙度取 2 to 4 个，受 Budget 上限约束）：

- **角度①「注册中心视角」**：只扫 A 类（MCP 注册中心）。问：该域有哪些新上架/高安装量的 MCP？
- **角度②「GitHub 视角」**：只扫 B 类。问：该域有哪些新建高星 / 近期高活跃 / 有现成 MCP wrapper 的仓库？
- **角度③「社区视角」**：只扫 C 类。问：HN/Reddit 最近在推荐/吐槽哪些该域工具？口碑与踩坑是什么？
- **角度④「免费替代付费视角」**（route ④/③ 专扫，**最高价值**）：问：有没有新的免费 OSS / 浏览器
  act-like-human 方案，能替代本域当前那个**付费**首选（点名现有 top pick 与其价格）？要求它直接对标
  现有付费源的能力缺口。

盲扫纪律：每个 subagent **只准报自己角度查到的**，禁止脑补其他角度；禁止编造仓库名/star 数,所有数字
必须来自 GitHub API / 注册中心页 / changelog 的**实抓**，附 URL。返回结构化候选单（见 D5）。

### D3. 评分（前沿性 × 质量，满分各维度后取加权）

对每个候选打分。**前沿性与质量是两个轴，缺一不可**,只前沿不优质 = 炒作；只老牌不前沿 = 停滞。
维度（每项 0 to 2 分，标注证据 URL，无证据该项记 0 并标 `unverified`）：

| 维度 | 0 | 1 | 2 | 反陷阱注记 |
|---|---|---|---|---|
| **活跃度** | 停更 >12 月 / archived | 6 to 12 月内有提交 | 近 3 月有 release/commit 且节奏稳 | 看**提交节奏**不只看最后一次；一次性 dump 仓库≠活跃 |
| **采用度** | 仅作者自用 | 有少量真实用户/第三方提及 | 多个独立来源（HN/Reddit/dependents）在真实用 | **高 star ≠ 采用**,查 star 时间曲线，一夜暴涨=刷量嫌疑 |
| **现成 MCP** | 无、需自己包 | 有社区 MCP 但维护存疑 | 有维护良好的官方/社区 MCP | 有现成 MCP 降低接入成本，但别为「有 MCP」牺牲数据质量 |
| **barrier 路线优劣** | 比现状更脆/更易封/更贵 | 与现状同级 | **比现状更优**（更免费/更稳/更难被封/拿到 API 藏的字段） | route ④ 免费且拿到更全字段 → 加分；纯套壳付费 API → 不加分 |
| **成本** | 比现状贵且无新能力 | 与现状相当 | 免费或显著更便宜且能力不降 | 「免费但要自备账号+代理+承担封号」要在 risk 栏写清，不算白嫖 |
| **是否真比现有条目更好** | 不如现有首选 | 与现有条目互补（覆盖新子能力） | 在现有首选的核心能力上**实测/有证据更强** | **这是裁决核心**,没有「比现状更好」的证据，再新也只是「新增候选」不是「替换」 |

**入池门槛**：总分需达阈值**且**「活跃度」「barrier 路线优劣」两项均 ≥1，**且**至少有 1 个独立第三方采用
证据（采用度 ≥1）。任一不满足 → 不入池（理由记录在 reject log，避免下次重复发现同一垃圾）。

**两个硬陷阱明令**：
- **「新 ≠ 好」**：新建仓库若采用度=0 且无现成可用形态，只标记为 *watchlist*（观察名单），不进候选池，
  留待下一轮看是否成势。前沿性高但未被验证的，**不收录、只观察**。
- **「高星 ≠ 适用」**：star 高但 (a) 与本域能力不匹配、或 (b) 停更、或 (c) star 曲线异常暴涨 → 直接降级。
  适用性以「能不能在本域 barrier route 下真正拿到我们要的数据」为准，不以 star 为准。

### D4. 去炒作 / 去低质（reject filters，宁缺毋滥）

任一命中即**拒收**（记入 reject log，附命中理由 + 证据 URL）：

- **Vaporware**：只有 landing page / waitlist / demo 视频，无可用仓库或可调用 endpoint。
- **营销号吹捧无实证**：发现仅来自 Product Hunt/X 软文，HN/Reddit 无独立用户复述其真实效果。
- **star 灌水嫌疑**：star 曲线短期陡升、star 数与 issue/PR/fork/contributor 数严重背离（高星零 issue 零 fork）、
  贡献者高度集中于单账号或新号集群。
- **停更/弃坑**：最后提交 >12 月、archived、README 标 deprecated、或上游已迁移到别处而此仓库是旧壳。
- **套壳工具**：只是对某付费 API 的薄包装却不揭示底层依赖/不增任何能力/不省成本,尤其当它把别人的
  免费 OSS 重新包装后收费。套壳但**真降低接入成本或补了能力**的可保留，但要在条目里点明底层依赖。
- **来源单一不可复核**：所有证据都来自同一发布方（L3），无 L1/L2 佐证 → 不够格做首选，最多 watchlist。

发现阶段同样遵守 SKILL.md 的核实门槛：**所有 star/价格/能力数字必须实抓带 URL，禁止凭 subagent 记忆。**

### D5. 「替代升级」逻辑（candidate → 裁决）

每个入池候选必须带一条**相对现有 shard 基线**的裁决，三选一，且**必须给对比理由**（缺理由的裁决无效）：

- **【新增 ADD】**：覆盖了现有条目没有的子能力 / 新 barrier route，但不取代现有首选。
  理由格式：`补足 <现有条目缺的能力>；与现有首选 <X> 互补，不替换`。
- **【替换首选 REPLACE】**：在现有首选的**核心能力**上更优，且 D3「是否真比现有更好」=2。
  理由格式：`相较现首选 <X>：在 <核心能力/成本/路线> 上更优（证据 URL）；劣势 <…>；建议把首选改为本候选，
  旧首选降为备选`。**REPLACE 门槛最高**：必须有能力对比证据（最好实测/第三方对比），不能仅凭「更新更火」。
- **【不收录 SKIP / WATCH】**：未过门槛 → SKIP（记 reject log）；前沿但未验证 → WATCH（记 watchlist，下轮复看）。

裁决产物交给核实/差分阶段：ADD/REPLACE 经独立核实后才落 shard；REPLACE 还需同步改 `sources-index.md` 的
top pick 并在 CHANGELOG 写明通用的替换理由。WATCH/SKIP 不动 shard，记录保存在
已验证私有伴生仓 DATA 目录下的 `discovery-state.md`（watchlist + reject log，带发现日期），让后续运行不重复造轮子、也能追踪成势。

### D5b. Verify 管道结构（2026-06-17 修正,从 3-LLM-lens → L0 deterministic + L1 单 lens）

**问题历史**: 2026-06-17 sweep 用 3 个 LLM lens (existence / freshness / top_pick_impact),BigGo 的
13.5mo stale URL **三票全过**。同 model 同 cutoff 的 3 票投票相关性高,本质 ≈ 1.3 票。砍掉这设计。

**新管道**:

```
candidate → L0 deterministic → (PASS / BLOCK / UNCERTAIN)
                              ↓
                        L1 single LLM lens (top-pick-impact only)
                              ↓
                        verdict: LAND / HOLD / BLOCK
```

**L0 deterministic check** (实现: `tools/l0_verify.py`,见 PHILOSOPHY §P4):
- URL 类型自动分流: github / web / npm / pypi / web-registry
- github: gh api --hostname github.com repos/<o>/<r>, 404→BLOCK,archived→BLOCK,>12mo→BLOCK,else→PASS
- web: HEAD 后检查 GET 状态和正文；GET 2xx 且正文未发现异常才可 PASS，404→BLOCK，5xx/timeout 或正文检查失败→UNCERTAIN。普通站点的 anti-bot 403 还需 DNS、证书和新鲜度证据；只有 DNS/证书健康仍为 UNCERTAIN。
- npm/pypi: registry API, time.modified ≤12mo + 未 deprecated→PASS
- web-registry (github.com/mcp, chatgpt.com/apps 等元页): anti-bot 403 + DNS+cert→PASS(此类注册页本身就 anti-bot,内容用其他证据)

**L1 single LLM lens** (top-pick-impact ONLY):
- 跳过若 L0=BLOCK
- 判: 这候选真能在 `domains/<domain>.md` 现状基础上**移动 top pick 的指针**吗?边际 → refuted
- prompt 默认 refuted unless positively confirm,但**仅在 LLM 必要时介入**

**Verdict 合成**:
- L0=BLOCK → final=BLOCK
- L0=PASS + L1=confirmed → final=LAND
- L0=PASS + L1=refuted/uncertain → final=HOLD
- L0=UNCERTAIN + L1=confirmed → final=HOLD (don't auto-land on weak L0)
- L0=UNCERTAIN + L1=refuted → final=HOLD

**节省**: 18 个候选 18 LLM calls(单 lens),vs 旧版 18×3=54 calls。约 50% token,质量严于(BigGo 类 case
不再漏)。验证回放报告: `CHANGELOG.md` v0.21.0 entry §R1 + v0.22.0 entry edge fixes 段(就地记录,不存独立 md)。

### D6. 发现阶段返回的候选单结构（structured candidate unit）

每个盲扫 subagent 对每个候选返回（沿用 SKILL.md 的字段化要求，禁自由散文）：

```
{ name, repo_or_registry_url, domain, discovery_surface(A/B/C/D + 具体源),
  barrier_route(①②③④), has_ready_mcp(bool + url),
  evidence: { stars, star_trend_note, last_commit_date, release_cadence, adoption_signals[url...], price[url] },
  score: { activity, adoption, mcp, route, cost, better_than_existing },  // 各 0–2 + 证据 url
  reject_hits[],                  // 命中的 D4 过滤项（空=通过）
  verdict: ADD|REPLACE|WATCH|SKIP,
  vs_current_top_pick: "对比理由（REPLACE 必填能力对比证据）" }
```

## Horizon scan（发现新角度 / 新域, 与时俱进，不只完善已有）

Discovery phase 在**已知 13 个域内**找更好的工具。但工具世界会长出**全新的域和调研角度**,新平台崛起、
新一类工具出现、新的调研方法论成形、API 政策剧变打开/关闭一整条路线。只完善已有 = 框架被冻结在过去。
Horizon scan 是 PHILOSOPHY.md **P1（改框架，不只改症状）应用到本 skill 自己的范围上**：定期问"地图本身
是不是该长大了？"，并在适当时**新增子域 / 子 skill**。

**何时跑：** 域内矩阵每月全量扫。H1-H4 只在季度窗口（Jan/Apr/Jul/Oct）运行；其他月份保留 10 分钟的“当月脉搏”快照，不执行完整 Horizon scan。每周的 Discovery 轻量扫仍按上方 cadence 运行。

### H1. 扫什么（跨域、看趋势，而非看单个工具）
- **当月发生了什么**：本月该领域的大事件,平台 API 政策变动、重大收购、某类工具突然爆发、某条壁垒
  路线被打开或封死。来源：HN/Reddit 月度热帖、各大框架的 release/blog、MCP 注册中心的**新类目**。
- **新平台 / 新数据territory**：出现了现有 13 域装不下的新数据源吗？（如一个新社交平台成气候、一种新的
  另类数据市场、一个新的内容形态）。
- **新一类工具**：出现了**全新品类**的工具/MCP 吗？（不是"又一个 X 抓取器"，而是"一种以前不存在的能力"，
  如某种新的 agent 记忆服务、实时多模态采集、新的反检测范式）。
- **新调研角度 / 方法论**：有没有**更新颖的"做调研"的方式**本身？（如一种新的交叉验证手段、一种新的
  信号源、一种把多个域串起来的新工作流）,这是用户明确要的"比较新颖的调研角度"。

### H2. 决策：折叠 / 新增子域 / 新增子 skill（默认最小，门槛递增）
对每个发现的新角度，三选一，**必须给理由**：
- **【折叠 FOLD】（默认）**：作为新行/新路线并入某个现有域。绝大多数新工具属于这一类。
- **【新增子域 NEW-DOMAIN】**：仅当它是一块**与现有 13 域都不同的独立数据territory**、且**有 ≥3 个真实
  可用源**、且**有反复出现的相关性**（不是一次性热点）。落地 = 新建 `domains/<x>.md` + 加 `sources-index.md`
  一行（保持 index↔shard 一致，否则闸门 STRUCT 拦截）+ CHANGELOG 写明"为何它值一个新域"。
- **【新增子 skill NEW-SKILL】（最高门槛，需人类拍板）**：仅当该角度需要自己的**触发词 + 工作流 + 分诊
  逻辑**，已超出"源矩阵一行"能承载的范畴（如它本身就是一套独立的多步流程）。自动运行**不得**自建新 skill，
  只能写入提案交人审。

### H3. 防膨胀门槛（用 P3 约束 P1, 范围增长不等于腐化）
"与时俱进"绝不等于"什么新东西都加一个域"。膨胀本身就是一种退化。所以：
- **新 ≠ 需要一个新域**：新角度先进 已验证私有伴生仓 DATA 目录下的 `discovery-state.md` 的 **new-angle watchlist**（带发现日期），
  **至少跨 2 次扫仍持续相关**才可提名升级为新域,一次性炒作会自然过期。
- **必须过生成式检验**（PHILOSOPHY.md）："这是在改框架（真的有一块没被覆盖的territory），还是只在打补丁
  （其实塞进现有域更对）？" 倾向折叠；提名新域/新 skill 的举证责任在提名方。
- **结构性变更永远走人审**：新增域/子 skill 是高权限结构变更，自动运行只产出**提案**（写入 watchlist +
  CHANGELOG 草案 + PR 描述），由人类批准才落地；绝不自动新建并直接合并。

### H4. 产出
Horizon scan 产出一个 **新角度提案清单**（每条：发现的角度 + 来源证据 URL + FOLD/NEW-DOMAIN/NEW-SKILL
裁决 + 理由 + 是否已在 watchlist 复现）。FOLD 项交给正常的核实/差分阶段；NEW-DOMAIN/NEW-SKILL 项进 PR 等
人审。无新角度时显式写"本月无新territory，已扫 H1 四类",不留白、不假装。

## Budget

Treat a full sweep like a `deep` run: cap at 12 subagents, single round each, plus verification.
Don't let a refresh balloon, it's a diff against an existing matrix, not a from-scratch survey.

**发现阶段的预算分配**：13 个域 × 多角度盲扫会爆 subagent 上限，因此**分波而非全量并行**：每波取一个
「域 × 角度」批，受 depth 的 max-subagents 上限约束；**优先把预算给波动快的域**（x-twitter / web-scraping /
social-publishing / crypto-defi / browser-automation，见 Cadence）和**角度④（免费替代付费）**,这两类
ROI 最高。其余域每轮至少跑角度②（GitHub）+ 角度③（社区）两个角度做最小覆盖。combiner 合并候选后再进
核实，主 agent 不读 subagent 的原始页面 dump，只读候选单。

## 防退化协议（强制, 保证只进化不退化）

无人值守更新有退化风险（幻觉仓库、误删好源、填错价、丢方法论）。原则：**LLM 只提议，确定性闸门否决；
坏更新进不了 main；护栏只增不减。** 每次自动运行必须遵守：

0. **先读 `CONSTITUTION.md`（仓库根），逐条作为硬约束遵守 C1 to C10。** 自动运行**不得修改**宪法/`tools/`。
1. **只在 `refresh/<date>` 分支工作，绝不直推 main。**
2. **事实一律 API 实测**：每个收录/改动的仓库用 `gh api --hostname github.com repos/<o>/<r>` 核实存在 + 真实 star（写 API 返回的
   真值，标 `(NNk★)` 紧贴仓库名）；价格核官网。**禁止凭记忆**。核实不了 → 不收录（C1/C6）。
3. **删除是高权限操作**：必须带死亡码 + 证据（C4：D-404/D-STALE/D-PRICE/D-TOS/D-SUPERSEDED）；死条目移入
   "Avoid (dead)" 墓碑行而非静默删除；机器判活的源默认不可删。
4. **增量编辑，不重写**（C7）；大改（>40% 或整表替换）转人审。
5. **编辑后跑确定性闸门**：`python tools/verify_matrix.py`（检查 STRUCT/REPO 存在性/STAR 容差/FRESH 时间
   单调/METH 方法论完整/COVER 防批量误删/CONST 宪法未改）。**任一 BLOCK → 回滚、不提交、Discord 告警、停。**
   闸门有最终否决权；LLM reviewer 只能更保守，不能把 FAIL 改成 PASS。
6. **全绿才落地**：写 CHANGELOG + 升 version + commit 到分支 + push + `gh pr create`（**开 PR，不自动 merge**）
   + Discord 通知人审。合并后由 `tools/deploy_skill.sh` 同步到生效版 skill（先在 main 上重跑闸门才部署）。

   For a completed manual refresh, create the normal commit only after the required
   verification above passes, with these completion trailers:

   ```bash
   git commit -m "Refresh market-intel source matrix" \
     --trailer "Market-Intel-Refresh: success" \
     --trailer "Market-Intel-Refresh-Month: $(date -u '+%Y-%m')"
   ```

   Keep both trailers in the final message when squash-merging. They record the
   completed refresh; a pending PR, an ordinary reference edit, or an unfinished or
   failed refresh does not confirm completion on the default branch.
   No scheduled heartbeat is configured.

> 本地调度脚本 `refresh-market-intel.sh` 曾实现 1/5/6 的编排骨架与 scope guard（拒绝越界改动）；2026-10-01 起它随每月定时任务一起退役，刷新改为手动触发，按本协议在会话里执行。
> v1 闸门覆盖协议强制的格式（github URL + star 标注）；裸 slug 无标注的漏检由 ROADMAP 的「机读镜像块」补全。

## 文档层防腐协议（anti-rot）, 保证 L2 逐工具文档不因迭代而失效或丢追踪

L2 逐工具文档（`reference/tools/<slug>.md`）+ L0 `install-guide.md` 是 v0.10.0 起的一等资产。迭代最易在
这层出三种腐化：**孤儿文档 · 静默过期 · 丢追踪**。三道防线兜底：**确定性闸门否决 + 协议强制 + 周期独立审计**。

### R1. 增删工具 = 四文件原子操作
新增一个工具 ⇒ 必须**同时**落：(a) 分片行 `domains/<域>.md`、(b) 索引行 `tools/index.md`、(c) 文档
`tools/<slug>.md`、(d) 机读清单 `tools/registry.json` 一条 `{slug,name,kind,repo,domain,top_pick}`。
绝不允许只改其一。闸门三网兜底：**REGISTRY**（registry↔index↔doc 三方一致，**含非仓库 SaaS**，不符即
BLOCK,这是 SaaS 工具的确定性追踪网）+ **TOOLS**（index↔doc，缺即 BLOCK）+ **DOCCOVER**（活跃分片仓库无
文档即 WARN）。`registry.json` 是工具清单的**权威来源**。新增、替换、改名和墓碑处理都要同步其中的来源记录及操作元数据，再运行 REGISTRY 检查。替代品必须有自己的规范来源标识，不能借用旧工具的身份。

### R2. 扫到一个域，复检该域的全部文档（不止变更项）
旧步骤 3b 只更新「被改动」工具的文档，不变的会静默腐化。补足：每次 sweep 对**所扫域**的每份
`tools/<slug>.md` 复检,`gh api` 复核仓库存活 + star、抓官网复核头条价格,**仅在真正复检后**才把
`## Last verified: YYYY-MM` 推进到当月。闸门 **STALE**（>9 月未检 → WARN，按最旧优先点名复检清单）+
**FRESH**（禁未来日期，防「名新实旧」）。**禁止不复检就改日期**（C8 时间只前进 + 诚实原则）。

### R3. 死亡 = 墓碑，不是删除（保住追踪链）
工具死亡（死亡码 D-404/D-STALE/D-PRICE/D-TOS/D-SUPERSEDED）时：分片行进 `⚠ Avoid (dead, D-xxx)` 墓碑、
索引行去星或标注、**文档保留并在顶部加死亡横幅**（不要删文件）,死条目才不会被下一轮重新「幻觉」回来，
追踪链不断。`registry.json` 中的记录也要保留，并同步名称、仓库、域和 `top_pick` 等既有字段，不能靠删除记录消除检查结果。**改名（rebrand，如 Polygon→Massive）不是死亡**：保留为 live、标 REBRAND，别误套死亡码。

### R4. 经验必须真实，禁止编造
文档的「General experience & gotchas / 踩坑」只能来自：分片沉淀的真实运行教训、live-run 账本（私有 store）
反馈、或本轮实跑/实抓所得,**绝不凭模型记忆编造**（C1/C6），所有 star/价格实测带 URL。每轮 sweep 派一个
**零上文的独立审计 subagent**（仿 `citation-audit` 模式）抽检若干文档：核对仓库存在性、star 容差、价格、
以及 shard↔doc↔index↔pricing 四者自洽，发现即修。live-run 账本是经验的活水,真实调研中触到
新坑就回写一行，下轮据此把对应 `tools/<slug>.md` 的踩坑段加厚。

## Cleanup pass (mandatory every sweep)

Doc/script entropy grows silently. Every full sweep must include a 5-min cleanup pass that
kills accumulated cruft. Without this, the skill bloats by ~5-10% per cycle and new users
get buried.

### What to check + cut

1. **One-shot session artifacts**, any runbook/doc that's clearly tied to a past session's
   task list (e.g. `phase3-handoff.md`, `bucket-B-checklist.md`). If all items are
   completed → delete; if any pending → migrate the pending parts into a generic runbook
   and delete the stub.
2. **Stale storage-mode references**, runbooks must match the companion's declared
   mode (spec §5.3). Under Mode B with a vault projection, no runbook may tell operators
   to edit, commit or restore `secrets/*.env`; they change the vault and regenerate the
   projection. The OneDrive backup scripts in `scripts/legacy/` (v0.9.0 convention) apply
   only to plain Mode B; if a runbook references them as live elsewhere, fix it.
3. **CHANGELOG bloat**, once a major doctrinal pivot lands (e.g. a storage-mode switch,
   spec v1 → v2), compress all pre-pivot entries to a single summary paragraph. Keep
   only entries from the current doctrinal era as full text. **Half-year archive
   convention (added 2026-06-17 ops audit):** at each Cleanup pass, if `CHANGELOG.md` is
   older than 6 months in any entry, move entries older than 6mo into
   `CHANGELOG.archive/YYYY-Hn.md` and keep a one-line link in the main file. Prevents
   the main file from passing ~5000 lines where GitHub's renderer gets slow + Discovery
   agents have to load too much history. Hard cap on main file: 24 months of entries.
4. **PII drift in committed READMEs**, grep `tools/*/README.md` for email patterns,
   phone numbers, real usernames. Per spec §4.3 these belong in the companion's private
   credential storage (vault records under a vault projection, otherwise
   `secrets/_credentials.env` + `secrets/_account-info.env`), not in committed docs.
5. **Duplicate or near-duplicate docs**, when a runbook covers one Windows gotcha or one
   provider quirk, ask "should this be a standalone file or a section in a larger
   runbook?" Single-purpose files <80 lines that share an audience with a sibling are
   merge candidates.
6. **Per-tool docs with `## Last verified` >9mo old**, covered by the STALE gate, but
   the cleanup pass should triage: re-verify, deprecate, or tombstone (`⚠ Avoid (dead)`).
7. **The live-run ledger** (`<data>/metrics/live-runs.jsonl` in the PRIVATE store, NOT this
   repo), keep all entries in this active file; this is the feedback ledger and the refresh
   consumes it. Do not compress it or move older entries into annual files.
   `feedback-bump.py` reads only the active `live-runs.jsonl`, including when `--since`
   selects an earlier date. Annual archives are not searched, so moving rows out would
   silently remove their failures and recheck signals from feedback. Retain the complete
   active ledger until archive-aware reading is implemented and verified.
8. **Top-level doc drift sweep** (2026-06-17 added against entropy growth)
   - **Machine-checkable**: run `python tools/check_doc_drift.py`. Fail-level drift
     blocks the sweep (must fix in this cleanup, not the next). Warn-level drift
     surfaces in the sweep report.
   - **Narrative freshness**: if any of `README.md` / `README_CN.md` / `PHILOSOPHY.md` /
     `ROADMAP.md` / `EVOLUTION.md` has not been touched in 12+ months while `CHANGELOG.md`
     has had ≥5 entries since, spawn a fork agent: "compare README narrative section to
     `SKILL.md` + `sources-index.md`; does it still describe the system honestly?"
     The fork judges PASS or specific drift; cleanup pass records the verdict.
   - **ROADMAP demotion**: any "Triggered work" item with no progress in 12 months → propose
     demotion to "deferred" with reason. Per P3 monotonic evolution: triggers only
     accumulate or get explicitly retired, never silently sit indefinitely.
   - Full doctrine: `runbooks/doc-sync.md`.
8. **Advance `## Last verified` only from scoped documentation verification.** At the
   end of cleanup, accept a `verified` entry for a whole tool document only when
   `verification_scope` is `tool_documentation` and `evidence_ref` is nonempty.
   A successful capability call alone does not refresh the document or exempt it
   from STALE. Follow `live-run-contract.json`; preserve typed failures and unknown
   outcomes for review. Keep the real verification ledger in PRIVATE DATA and
   describe only the resulting public documentation changes in release notes.

### Downstream: companion-config sync (skip if no companion repo)

When this skill is paired with a `market-intel-config` repo (per-machine inventory of
installed + keyed tools), the matrix changes from the sweep need to be reconciled
downstream, otherwise the config repo accumulates orphan secrets, dead MCP entries,
and broken `installed:true` flags.

After the sweep, run **`python scripts/sync-check.py`** in the config repo. It reports
six drift buckets (A: matrix has it / config doesn't · B: config points to a missing
skill doc / renamed-or-deleted · C: config points to a tombstoned doc · D: orphan secret
· E: orphan MCP · F: `installed:true` with no secret file). Per-bucket action is in the
config repo's `runbooks/sync-with-skill.md`.

Key invariant: the link between the two repos is the config registry's
`matrix_slug` field == the skill's `tools/<slug>.md` filename. If you rename a tool in
the skill, you MUST update `matrix_slug` everywhere that pointed to the old name.

This downstream sync is a separate concern from the cleanup pass above (cleanup =
inside the skill; sync = skill→config drift) and should be done in the same session so
the CHANGELOG can record both.

### What NOT to cut

- Per-tool docs (`tools/<slug>.md`) regardless of count, they're load-on-demand.
- Domain shards regardless of length, same.
- Companion-config-* docs (overview/spec/hardening), three distinct audiences.
- Active feedback ledgers (`live-runs.jsonl`, `discovery-state.md`).

### Output

In the sweep CHANGELOG entry, the cleanup pass gets its own section:

```
### Cleanup (mandatory per-sweep)
- Deleted: <files>
- Merged: <a> → <b>
- Compressed: CHANGELOG pre-<version>
- PII stripped from: <N> READMEs

### Downstream config sync (when companion repo present)
- sync-check buckets cleared: B=<n>, C=<n>, D=<n>, E=<n>, F=<n>
- Renames: <old> → <new>
- Tombstoned in config: <slug> (code D-xxx)
```

## After the sweep, landing checklist (2026-06-17 added)

Once the sweep produces ADD/REPLACE/WATCH/SKIP verdicts, the actual landing is a 7-step
mechanical sequence. Skip any step and the matrix drifts:

1. **Edit `domains/<X>.md`**, add/replace/tombstone rows per verdict. A retirement must meet
   `CONSTITUTION.md` C4 and retain a row marked `⚠ Avoid (dead, D-xxx)`.
2. **Update `sources-index.md`**, only if a domain's top pick changed. Most sweeps don't touch this.
3. **Update `tools/<slug>.md`** for every add, replacement, rename or tombstone. Keep retired
   cards with their death banner. Per-tool naming rule: `companion-config-spec.md §3.1`.
4. **Update `tools/index.md` and `tools/registry.json` together**, including canonical source
   and operation metadata. Retain marked index rows and registry records for tombstoned tools.
5. **Run `python tools/verify_matrix.py`**, including REGISTRY / TOOLS consistency. Any BLOCK
   must be resolved before continuing.
6. **Resolve the optional companion** using `companion-config-spec.md` §1. Report an explicitly selected invalid path. If a companion
   exists, run `python "<resolved-companion>/scripts/sync-check.py"` and address its reported
   buckets; missing checker or failed execution is an unresolved sync gap, never a clean check.
7. **Prepare and review the release commit**, including the public changelog entry,
   plugin version and derived documentation, through the normal hooks. Then run
   `tools/release.ps1` with `-Version`, the PRIVATE `-ConfigRepo` path and
   `-DryRun`. It validates the prepared clean commit without editing or committing
   files. Remove `-DryRun` only after publication authorization; see
   `../../../runbooks/release.md` for exact tag/push and remote-readback requirements.

Discovery agents writing `git@` SSH or `/blob/` URLs is normal, `l0_verify.py` and the
post-sweep `verify_matrix.py` GHACTIVE gate both sanitize them, so no extra step needed.

## Trigger

- Manual: ask "refresh the market-intel source matrix" / "刷新工具库".
- Scheduled: none. The monthly Windows Task `RefreshMarketIntel` and its local `refresh-market-intel.sh` runner were retired on 2026-10-01.

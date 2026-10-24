# Tool: dreammis/social-auto-upload (automated CN + global video publishing)

**Runtime storage status: setup only.** No shipped adapter admits this tool's
complete file output. Do not launch collection, login or persistence until every
child-file write meets the [external-tool storage requirements](../../../../DATA.md#external-tool-storage).
`resolve_directory` alone does not authorize writes; examples below are setup guidance.

- **Domain(s):** social-publishing (also: browser-automation)
- **Barrier route:** ④ browser / act-like-human · **Source tier:** L4 · **Ready MCP:** no, but it ships a `sau` CLI **and bundled Claude-Code skills**, so it is agent-drivable without one
- **Cost:** free (OSS, MIT). Account access and IPs carry costs and risks; see the gotchas
- **Repo / Provider:** github.com/dreammis/social-auto-upload, `dreammis/social-auto-upload (14.8k★, gh-api 2026-09-06)`, MIT, not archived, created 2023-12-04, pushed 2026-09-02, 2,538 forks / 90 watchers / 64 open issues
- **Top pick for its domain:** no. Buffer ① / Publora ① stay the default; this is the ④ row for **CN video publishing**, which no other row in the shard can do

## What it does / when to pick it
Drives real logged-in browsers (Playwright) to **upload video** to 11 platforms. From the repo's own capability matrix (README, fetched 2026-09-06):

| platform | video | 图文 | 定时发布 | CLI | Skill |
|---|---|---|---|---|---|
| 抖音 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Bilibili | ✅ | ❌ | ✅ | ✅ | ✅ |
| 小红书 (浏览器版) | ✅ | ✅ | ✅ | ✅ | ✅ |
| 快手 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 视频号 | ✅ | ❌ | ✅ | ✅ | ❌ |
| 百家号 · 支付宝生活号 · 微博 · 虎扑 | ✅ | ❌ | ❌ | ✅ | ❌ |
| TikTok | ✅ | ❌ | ✅ | ❌ | ❌ |
| YouTube | ✅ | ❌ | ❌ | ✅ | ❌ |

**Decision rule:** pick this when the job is "publish video to CN majors on a schedule, automatically." Ayrshare's 13 platforms do not include 抖音/视频号/快手/百家号 at all, so for those this is not the cheaper route, it is **the only** route. The shard's other CN entries do not compete: MediaCrawler is a *crawler* (read, never write) and xiaohongshu-mcp is 小红书-only and note-oriented. AiToEarn covers similar ground but the shard itself marks it "publish manually not automated" (Electron GUI handoff), that annotation is precisely the gap this fills.

## Install
Python + Playwright. Two entry points: the `sau` CLI (`--headless` supported) and the bundled agent
skills, which `init`-style tooling installs for Claude Code / Codex / OpenClaw. Before any login
or launch, use the full Market checkout's `tools.private_inventory.resolve_directory` to resolve
an existing `runtime/social-auto-upload` directory in the configured PRIVATE versioned companion.
Verify the installed version's supported options for every session, browser profile, log and
output destination, and configure an adapter to use those absolute private paths. Keep setup-only
if any writer cannot be redirected. A public clone must never receive account sessions or outputs.

## Auth / keys
Browser access uses a **logged-in account session per platform**. Treat session files as
credentials: store and version them in the PRIVATE companion and its approved backup,
never in the public clone or transcript. Each platform may require interactive login and later
re-authentication; a saved session does not establish current access.

## Usage, call examples
After private persistence is configured and revalidated, the installed version's `sau login`
operation can create the selected platform's session. Verify login through an authorized
read-only status operation or navigation; readiness checks never upload content. Publishing
requires explicit authorization for the account, media, title and schedule. Only then invoke the
supported upload operation with an absolute private media path and the configured private runtime.
Per-platform flags and scheduling support differ (the historical matrix above lists scheduling
on 6 of 11 platforms); verify the installed version before promising coverage.

## General experience & gotchas (踩坑)
> Not yet exercised in a live market-intel run; notes below are from the repo README + gh api, fetched 2026-09-06. Record first-use observations in the PRIVATE versioned ledger (R4).
- **CN 风控 is the harshest surface in this matrix, and a banned 抖音 account is not recoverable with a credit card.** Past a handful of accounts you need one browser context and one residential proxy per account, which is how the dollar cost walks back in. "Free" here means *differently priced*, not costless.
- **No SLA, no delivery receipt.** There is no per-post status webhook and no unified analytics; when a platform changes its upload UI the uploader breaks until someone lands a PR. That absence is a real part of what Ayrshare's $149/mo buys.
- **It is mid-refactor, and the README says so.** The stated plan is converging the per-platform uploaders, unifying the CLI, skill-ifying for Claude Code/Codex/OpenClaw, **switching the driver to `patchright`**, and pushing headless as the mainline. As of this check patchright is a *plan*, not the shipped driver. The Web UI code is explicitly no longer the mainline and is "not guaranteed to run."
- **Coverage is uneven.** 图文 upload exists on only 4 platforms, 定时发布 on 6, CLI on 10 (TikTok has none), and bundled skills on 4. Read the matrix before promising a platform.
- Automated posting violates most of these platforms' terms; use throwaway accounts, and never the account that matters.

## Failure signals & fallback
Failure looks like a login session gone invalid mid-run, an upload that reports success while the post never appears (风控 shadow-drop), or a selector break right after a platform UI change. **Fallbacks:** (1) re-bank the session and retry non-headless, headless is the mainline but is also the first thing platforms fingerprint; (2) for 小红书 specifically, **xpzouying/xiaohongshu-mcp** (④, ready MCP) is the narrower but better-worn path; (3) for a human-in-the-loop CN publish, **yikart/AiToEarn**'s GUI handoff still works; (4) for Western platforms, do not use this at all, **Buffer ①** or **Postiz ③** are cheaper, safer and supported.

## Last verified: 2026-09

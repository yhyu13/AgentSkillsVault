# Tool: NanmiCoder/MediaCrawler

**Runtime storage status: setup only.** No shipped adapter admits this tool's
complete file output. Do not launch collection, login or persistence until every
child-file write meets the [external-tool storage requirements](../../../../DATA.md#external-tool-storage).
`resolve_directory` alone does not authorize writes; examples below are setup guidance.

- **Domain(s):** browser-automation (also: reddit-community, social-publishing)
- **Barrier route:** ④ · **Source tier:** L4 · **Ready MCP:** no (Python CLI / framework; drive directly, no MCP wrapper)
- **Cost:** free (self-host OSS), proxies are the only hidden cost at scale [github.com/NanmiCoder/MediaCrawler, fetched 2026-06]
- **Repo / Provider:** github.com/NanmiCoder/MediaCrawler, `NanmiCoder/MediaCrawler (64.5k★, gh-api 2026-09-06)`; license NOASSERTION (non-commercial source-available, see repo LICENSE), active (pushed 2026-08-14)
- **Top pick for its domain:** no (specialist, the go-to for Chinese platforms, not a general browser tool)

## What it does / when to pick it
Playwright-based crawler purpose-built for **7 Chinese platforms**: 小红书 (Xiaohongshu), 抖音 (Douyin), 快手 (Kuaishou), B站 (Bilibili), 微博 (Weibo), 贴吧 (Tieba), 知乎 (Zhihu). It logs in via a real browser (QR-scan or cookie), then pulls posts, comments, sub-comments, and creator profiles. **Decision rule:** reach for MediaCrawler when the target is a *Chinese* social platform and you need cross-platform breadth in one codebase, it beats stitching together single-platform repos. For 小红书 specifically where you also need to *post* notes, prefer the sibling **xpzouying/xiaohongshu-mcp** (ready Go MCP, route ④). For non-Chinese platforms use the per-platform repos in their own domain shards (twikit for X, instagrapi for IG, etc.). Plain **playwright MCP** is the fallback if you only need one page from one platform.

## Install in a PRIVATE runtime checkout
Before any real run, resolve the full consumer checkout and use
`tools/private_inventory.py`'s `resolve_destination(path=...)` for individual
config/output files and `resolve_directory(path=...)` for existing runtime or
browser-profile directories. Pass the final absolute path. Each check resolves the
containing Git worktree, including a repository rooted at the directory itself,
and refuses destinations outside it or inside this checkout. Stop when it fails.
Keep runtime files versioned in that PRIVATE companion. An ignored directory in
this public checkout is not a valid destination. A later real run must repeat the
check; this recipe is not a live destination attestation.

This upstream project uses repository-relative runtime paths. Do not clone or
launch its real workload under the public market-intel checkout. Prepare a
runtime source copy inside the PRIVATE companion, with no nested
PUBLIC upstream Git repository; verify the final containing repository after
preparation. Keep upstream version/license metadata with the private copy.
Install dependencies there using the upstream instructions. Only then launch
`main.py` from that PRIVATE runtime directory. The known output/config shapes
are `data/`, `browser_data/`, logs and configured databases; inspect the installed version for additional outputs before use.

## Auth / keys
No API key. Auth is a **logged-in session**: launch with `--lt qrcode`, scan the QR with the platform's mobile app, and the cookie is cached to `browser_data/` for reuse. You can also paste a cookie string via `--lt cookie` (config `config/base_config.py` → `COOKIES`). Secret-hygiene: the cached cookie under `browser_data/` is a live session credential, treat it like a key, store `browser_data/` only under the PRIVATE credential policy; never paste the cookie into the transcript; use a throwaway account.

## Usage
Keep target identifiers, queries and authentication inputs in the PRIVATE runtime
configuration. Use the installed upstream `main.py` CLI help for supported
options; this guide does not assume an output-redirection flag exists. Run only
from the PRIVATE runtime copy so `data/`, `browser_data/`, logs and configured databases stay private and versioned.
Validate actual content and record gaps before accepting a run.

## General experience & gotchas (踩坑)
- **License is non-commercial / source-available (NOASSERTION),** not a permissive OSS license, for paid client deliverables read the repo LICENSE first; scraping these platforms also violates each platform's ToS (ban risk → throwaway account).
- **Rate / ban signals:** Xiaohongshu and Douyin throttle aggressively; without a residential proxy pool (`config` → `ENABLE_IP_PROXY`, `IP_PROXY_POOL_COUNT`) you get sliding-CAPTCHA walls (滑块验证) and 461/risk-control responses within a few hundred requests. Software is free; **proxies are the real cost at scale.**
- **Cookie rot:** cached `browser_data/` sessions expire silently, symptom is an abrupt empty-result run, not an error. Re-scan the QR.
- **Comment depth costs:** `ENABLE_GET_SUB_COMMENTS` multiplies request volume (each top comment fans out), the fastest way to trip risk-control. Pull top-level first, sub-comments only when needed.
- **Field quirks:** 抖音/快手 return short-lived signed media URLs; download immediately, don't store the URL. Note volumes (点赞/收藏) are snapshot-at-fetch, not historical.

## Failure signals & fallback
You know it failed when: QR login loops without caching a cookie, runs return empty `data/` with a 461/滑块 in the browser, or the platform serves a risk-control interstitial. **Fallback ladder:** (1) for 小红书 posting *and* reading, switch to **xpzouying/xiaohongshu-mcp** (ready MCP); (2) for 微博 specifically, **dataabc/weibo-crawler**; (3) for a one-off single page, drop to **playwright MCP** after current-session verification with a throwaway logged-in session; (4) if fingerprint-blocked, route the browser through **camoufox** / **camofox-browser**.

## Last verified: 2026-09 (repository existence, stars and activity checked through gh api; usage/gotcha notes carried forward unchanged from the prior check)

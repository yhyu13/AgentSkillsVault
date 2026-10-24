# Tool: dataabc/weibo-crawler

**Runtime storage status: setup only.** No shipped adapter admits this tool's
complete file output. Do not launch collection, login or persistence until every
child-file write meets the [external-tool storage requirements](../../../../DATA.md#external-tool-storage).
`resolve_directory` alone does not authorize writes; examples below are setup guidance.

- **Domain(s):** browser-automation (also: social-publishing)
- **Barrier route:** ④ · **Source tier:** L4 · **Ready MCP:** no (Python script / config-driven; the agent runs it directly)
- **Cost:** free (open source). ⚠ **No LICENSE file** in the repo (gh-api 2026-06), no explicit grant; treat as research-only and don't assume reuse rights. Proxies/cookies are the hidden cost.
- **Repo / Provider:** github.com/dataabc/weibo-crawler, `dataabc/weibo-crawler (4.5k★, gh-api 2026-06)`, no license, pushed 2026-05
- **Top pick for its domain:** no

## What it does / when to pick it
A focused crawler for **微博 (Weibo)**: pull a given user's posts (text, images, video links, reposts), post metadata (likes/comments/reposts counts, timestamps), and basic profile info, exporting to CSV/JSON/MySQL/MongoDB/SQLite. **Pick it when the target is specific Weibo users/accounts** and you want a ready config-driven pull. For multi-platform Chinese coverage (also 抖音/小红书/B站/快手/知乎/贴吧) prefer **NanmiCoder/MediaCrawler** (66.7k★); use weibo-crawler when Weibo is the whole job and you want the lighter single-purpose tool.

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
`weibo.py` from that PRIVATE runtime directory. The known output/config shapes
are `weibo/`, target lists, `config.json` and cookie state; inspect the installed version for additional outputs before use.

## Auth / keys
No service key. It reads Weibo's m.weibo.cn endpoints; for anything beyond public/limited data you must supply a **logged-in cookie** in `config.json` (`cookie` field). The cookie is a session secret, treat like a key: user supplies it themselves, never echo it; follow the PRIVATE credential backup policy (see `install-guide.md` secret hygiene). **Use a throwaway Weibo account**, this is route ④, ToS-violating, ban risk on the account whose cookie you use.

## Usage
Keep target identifiers, queries and authentication inputs in the PRIVATE runtime
configuration. Use the installed upstream `weibo.py` CLI help for supported
options; this guide does not assume an output-redirection flag exists. Run only
from the PRIVATE runtime copy so `weibo/`, target lists, `config.json` and cookie state stay private and versioned.
Validate actual content and record gaps before accepting a run.

## General experience & gotchas (踩坑)
- **Cookie is mandatory for real coverage.** Without a logged-in cookie you get a thin/empty pull; with one you risk that account, always a throwaway, never a primary.
- **Weibo throttles aggressively.** Rapid pulls trigger rate limits / empty pages / the account getting challenged. Slow the crawl, cap UIDs per run, rotate cookies+proxies for volume. Proxies are the real cost at scale (software is free).
- **Brittle to Weibo's changes.** It depends on m.weibo.cn response shapes; when Weibo tweaks them fields go null or the crawl stalls silently, check for empty output, don't trust exit code. Last push 2026-05 (active), but verify it still works before a big run.
- **No license** is the sharpest catch vs. siblings, research use only; don't bundle/redistribute.
- **Chinese-language config & docs**, field names and README are 中文; budget time to map config keys.

## Failure signals & fallback
Failed = empty/partial CSV, null engagement counts, the crawl stalling, or a challenge/login redirect (cookie expired or account flagged). Fallbacks: refresh the cookie / swap to another throwaway, add proxies + throttle; for broader Chinese-platform coverage switch to **NanmiCoder/MediaCrawler**; or drive **playwright MCP** against the rendered m.weibo.cn page for a small manual pull.

## Last verified: 2026-06

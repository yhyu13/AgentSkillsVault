# Tool: jackwener/OpenCLI (any website → deterministic CLI, over your logged-in Chrome)

- **Domain(s):** browser-automation (adapters also touch: x-twitter, reddit-community, ecommerce-arbitrage, social-publishing, crypto-defi, trends-discovery)
- **Barrier route:** ④ browser / act-like-human · **Source tier:** L4 · **Ready MCP:** no, it ships a CLI **plus 7 bundled agent skills** (`opencli-browser`, `opencli-adapter-author`, `smart-search`, …), so it is agent-drivable without one
- **Cost:** free (OSS, Apache-2.0). The price is accounts, sessions and ToS risk, not dollars
- **Repo / Provider:** github.com/jackwener/OpenCLI, `jackwener/OpenCLI (29.1k★, gh-api 2026-09-09)`, Apache-2.0, not archived, created 2026-03-14, pushed 2026-08-30, 2,855 forks / 62 watchers / 248 open issues
- **Top pick for its domain:** no. Playwright MCP stays the default first tool; this is the row for **"a deterministic adapter already exists for this site."**

## What it does / when to pick it
Two different things under one binary:

1. **182 prebuilt per-site adapters** (`clis/`, counted via `gh api .../contents/clis` 2026-09-09) that expose a website as a
   deterministic subcommand, driven through **your own logged-in Chrome profile**. The ones that
   overlap this matrix: `twitter`, `reddit`, `hackernews`, `producthunt`, `github` / `github-trending`,
   `xiaohongshu`, `douyin`, `weibo`, `zhihu`, `bilibili`, `tiktok`, `youtube`, `instagram`, `linkedin`,
   `amazon`, `taobao`, `xianyu`, `binance`, `coingecko`, `xueqiu`.
2. **Generic browser primitives** (`opencli browser`): navigate, click, type/fill, extract and inspect,
   for pages with no adapter, plus an `opencli-adapter-author` skill that walks you through writing one.

**Decision rule:** reach for this when the target site is on the adapter list and you want a *stable,
parseable* result. The distinction from the neighbours is the interesting part: **playwright MCP** is
low-level (you write the selectors), **browser-use** is LLM-driven (non-deterministic, costs tokens per
run), and this sits between them: a hand-written adapter returns the same shape every time at zero
token cost, until the site changes and the adapter breaks. Its login model is also the point: it reuses
an existing Chrome profile rather than spoofing a fresh fingerprint, so it is an **access** play, not an
anti-detection one. If you are being fingerprint-blocked, this is the wrong tool; go to camoufox/nodriver.

## Install
Node.js **>= 20.18.1**.
```bash
npm install -g @jackwener/opencli      # v1.8.7 at check, Apache-2.0
```
A desktop bundle (OpenCLIApp, opencli.info/download) also exists for macOS/Windows and manages the
`opencli` command plus browser-login keepalive. The npm route is the one to use on CI/servers.

## Auth / keys
No API keys; that is the whole route-④ premise. It drives **your logged-in browser session**, so
access equals whatever those accounts can already see. Treat the profile directory as a credential
store: never commit it, never paste session cookies into a transcript.

## Usage, call examples
```bash
opencli twitter search "<query>"        # adapter subcommand, deterministic output
opencli browser open <url>              # generic primitives when no adapter exists
```
Run `opencli <site> --help` for a given adapter's surface; coverage is per-adapter and uneven, so check
before promising a capability.

## General experience & gotchas (踩坑)
> Not yet exercised in a live market-intel run. Everything above is from `gh api`, the npm registry and
> the repo README, fetched 2026-09-09. Harden with a `live-runs.jsonl` entry after first real use (R4).
- **The adoption evidence is npm, not GitHub chatter.** 84,338 downloads in the last month with a flat
  ~3k/day weekday profile (api.npmjs.org, 2026-09-09) is real recurring install traffic. Its Hacker News
  submission (2026-03-16) drew **6 points and no substantive thread**, so do not expect community
  troubleshooting to exist yet; you will be reading source when something breaks.
- **Star:watcher is 470:1** (29,133★ vs 62 subscribers), which is the shape that usually earns a
  D4 inflation flag. What argues against it here: 2,855 forks, a long-tail contributor curve
  (933/85/65/30/27/21/…​ across 100+ accounts), and the npm figure above. Judged genuine, but it is the
  weakest part of the case. Re-check the star slope next sweep.
- **182 adapters is a maintenance surface, not a guarantee.** Each one is scraped UI that breaks when
  its site ships a redesign; 248 open issues is consistent with that. Verify the specific adapter you
  depend on before building on it, and expect to fix rather than file.
- **Single-maintainer concentration.** 933 of ~1,200 commits are one account. Bus factor is low despite
  the contributor count.
- **Reusing your real logged-in profile means real-account risk.** Automated access violates most of
  these platforms' terms. Use a throwaway profile, never the account that matters. The failure mode
  here is losing a personal account, not a rate-limit.

## Failure signals & fallback
Failure looks like an adapter returning empty/malformed output after a site redesign, or a session that
has silently logged out. **Fallbacks:** (1) drop to `opencli browser` primitives for that one site;
(2) **playwright MCP** (available only after current-session operation verification) for a bespoke one-off; (3) **browser-use** when the task
needs goal-level reasoning rather than a fixed shape; (4) if the block is fingerprinting rather than a
missing adapter, escalate to **camoufox** / **nodriver**; OpenCLI does not spoof and will not help.

## Last verified: 2026-09

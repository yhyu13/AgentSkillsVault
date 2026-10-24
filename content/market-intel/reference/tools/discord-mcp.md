# Tool: elyxlz/discord-mcp

> ⚠ **ToS / ban risk.** This reads Discord via **your own user session (self-bot)**, which violates
> Discord's Terms of Service and risks account suspension. Use a throwaway account, last-resort only.

- **Domain(s):** reddit-community (also: none)
- **Barrier route:** ④ browser / act-like-human (user session) · **Source tier:** L4 · **Ready MCP:** yes (self-host), you run it with your Discord user token
- **Cost:** free (OSS, self-host), you supply a logged-in Discord session; no provider fee
- **Repo / Provider:** github.com/elyxlz/discord-mcp, `elyxlz/discord-mcp (14★, gh-api 2026-06)`; not archived, pushed 2025-06 (~12mo), **no license file** (treat usage rights as unclear, another reason it's last-resort)
- **Top pick for its domain:** no, last-resort, ToS-violating; the shard flags it as ban-risk

## What it does / when to pick it
Reads/scrapes Discord servers and channels through **your user session** (self-bot pattern), message history, channels you're already in. **Decision rule:** only reach for it when the target community lives **exclusively on a private Discord** and there is no compliant alternative, and you accept the ToS/ban risk on a throwaway account. The shard marks it ⚠ "violates Discord ToS, ban risk." Prefer everything else in the domain first: **mcp-hn** (HN), **reddit-mcp-buddy / praw** (Reddit), **stack-overflow-mcp** (SE). If you control the server, use a **proper Discord bot** (official Bot API) instead of this self-bot route.

## Install
Self-host: clone `github.com/elyxlz/discord-mcp`, install deps, run per its README (stdio), supply your Discord user token via config/env. No key-echo provider header, but the token is your account credential, see Auth. Not in the L1 volatile file as a default; it's an `④`-route last resort. On Windows, stdio MCPs are flaky (path/shell), test in a plain shell first; see `reference/install-guide.md`. A newly added MCP needs a session restart / `/mcp` reconnect.

## Auth / keys
Auth is your **Discord user token** (a logged-in account's session), this is a self-bot, which is what triggers the ToS violation. Use a **throwaway / low-value account**, never your main. The token is a full account credential: load it from an env var the **user** sets, never paste or echo it into the transcript, never commit it. Treat it like a password. One-line reminder; full secret hygiene in `reference/install-guide.md`.

## Usage, call examples
Via MCP (after self-hosting with your token): tools to list servers/channels you're a member of and read message history from a channel. Minimal: point it at a server you've joined, pull recent messages from the relevant channel, and mine them for pain points / product chatter. List exact tool names with your client after connecting, don't assume signatures from memory.

## General experience & gotchas (踩坑)
- **Self-bot = account-ban risk, full stop.** Discord actively detects and bans self-bots; even read-only automation can trip it. Throwaway account only, and assume it may be lost.
- **No license on the repo** (gh-api 2026-06), usage/redistribution rights are unclear; another reason to treat this as last-resort rather than a standard tool.
- **You can only read what your account can already see**, it doesn't bypass private servers you haven't joined; you still need a legitimate invite/membership.
- **Low adoption (10★), ~12mo since last push**, Discord changes its internal client/API and self-bot libs break quietly; expect maintenance gaps and a possibly-stale dependency.
- **ToS gray zone (shard):** Discord/Quora scraping is explicitly called out as a ToS gray zone, flag this clearly in any report that relies on it (SKILL.md: no silent degradation).
- This is route ④ free, but the "free" hides real account/ban cost, it is **not** a CONSTITUTION-C2 "prefer free" win; prefer the compliant ① Reddit/HN/SE routes.

## Failure signals & fallback
Failure looks like: token rejected / 401 (session expired or account actioned), account suddenly suspended mid-run, or the self-bot lib erroring after a Discord client change. **Fallbacks:** if you own the server, switch to an **official Discord bot** (compliant Bot API); otherwise route the community-intel question to compliant sources, **reddit-mcp-buddy** / **praw** (Reddit), **mcp-hn** (HN), **stack-overflow-mcp** (SE), and note the Discord gap in the report rather than scraping.

## Last verified: 2026-06

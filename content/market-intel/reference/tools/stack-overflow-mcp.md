# Tool: midodimori/stack-overflow-mcp

- **Domain(s):** reddit-community (also: none)
- **Barrier route:** ① official (free Stack Exchange API) · **Source tier:** L2 · **Ready MCP:** yes, ready MCP; connects to the SE API (works with no key at 300/day; an SE key raises the quota)
- **Cost:** free, Stack Exchange API is free; a free SE key lifts the daily quota [https://api.stackexchange.com, fetched 2026-06]
- **Repo / Provider:** github.com/midodimori/stack-overflow-mcp, `midodimori/stack-overflow-mcp (0★, gh-api 2026-06)`; not archived, MIT, pushed 2025-10 (~8mo; ⚠ near-zero adoption, 0★, treat as a thin convenience wrapper over the public SE API and be ready to call the API directly)
- **Top pick for its domain:** no, niche pick for developer-tooling / technical pain-point questions

## What it does / when to pick it
Searches Stack Exchange (Stack Overflow + sister sites) and returns questions and answers over the official SE API. **Decision rule:** pick it when the research is about a **developer-facing product or technical pain point**, "what breaks with library X", "what do people struggle with in tool Y", error-message frequency. It complements **mcp-hn** (HN dev sentiment) and **reddit-mcp-buddy** (subreddit pain-points): SE gives you the *concrete technical-problem* layer. Not a default, only reach for it when the question is genuinely technical/dev-tool shaped.

## Install
Add the ready MCP per its README (stdio). Works with **no key at 300 req/day**; supply a free SE API key to raise it to **10k/day**. Exact L1 line: `reference/volatile/pricing-install.md → reddit-community` (Stack Exchange: midodimori-stack-overflow-mcp, free; SE key raises 300→10k/day). On Windows, stdio MCPs are flaky, test in a plain shell first; see `reference/install-guide.md`. A newly added MCP needs a session restart / `/mcp` reconnect.

## Auth / keys
Optional, runs keyless at 300/day. For more, register a free app at stackapps.com to get an SE **key** (raises to 10k/day). The key is a **secret**: supply it via an env var the **user** sets, don't echo it into the transcript; for the secret-bearing config edit `~/.claude.json` from clipboard rather than `claude mcp add`. One-line reminder; full hygiene in `reference/install-guide.md`.

## Usage, call examples
Via MCP: search questions by keyword/tag, fetch a question's accepted/top answers, and pull question metadata (score, tags, view count). Minimal: "search Stack Overflow for <library> <error>, top answers" → read the answers for the canonical fix and how common the problem is. Direct REST equivalent (no MCP): `https://api.stackexchange.com/2.3/search/advanced?q=<kw>&site=stackoverflow&order=desc&sort=relevance`. List exact tool names with your client after connecting.

## General experience & gotchas (踩坑)
- **0★ repo, low adoption, treat as disposable.** It's a thin wrapper over the public SE API; if it breaks or won't connect, fall straight back to the REST endpoint above rather than debugging the wrapper. (CONSTITUTION C5, verify, don't trust the wrapper blindly.)
- **300/day keyless quota burns fast** in a loop, a handful of search+answer calls per topic, then you're throttled. Add the free SE key (10k/day) before any batch run.
- **SE is technical-only.** Useless for consumer/physical-product demand; it answers "how hard is X to use / what breaks", not "do people want to buy X".
- **Question score ≠ demand**, a high-score question signals a common technical snag, which can be a *feature opportunity*, but don't read it as market size.
- Tag-scoped search is much sharper than free-text, use `tagged=<tag>` to cut noise.
- Free official API, so per CONSTITUTION C2 prefer it over any paid dev-sentiment source.
- **OAuth-app registration is fully headless-friendly** (confirmed 2026-06-16), sign in to `stackapps.com` with Stack Exchange's Google login → `Register an application` at `/applications/register` → fill app name + description + URL + accept terms → submit creates a Client ID (the OAuth app number, e.g. 39160). Then on the app page click **Generate new API Key** → name + expiry (`Never` is option index 4) → key is shown ONCE in a dialog, masked except last 4 chars in the visible cell but the full 28-char value is reachable via `navigator.clipboard.writeText` from a hidden readonly input. **Key raises rate limit 300→10,000/day per IP**, confirmed by `quota_remaining: 9999` on first call.
- The "API Key" (rate-limit raiser) and "OAuth Client Secret" (user-context auth) are separate, the key alone gives anonymous-read 10k/day; the secret is only needed for user-write ops you probably don't want.

## Failure signals & fallback
Failure looks like: HTTP 400 `throttle_violation` (quota hit, add the SE key or wait for the daily reset), the 0★ wrapper failing to connect (drop to the REST API directly), or empty results on a niche tag (broaden the query / drop the tag filter). **Fallbacks:** call the SE REST API directly; for broader developer sentiment switch to **mcp-hn**; for subreddit-level technical complaints use **reddit-mcp-buddy**.

## Last verified: 2026-06

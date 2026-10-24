# Tool: jmanek/google-news-trends-mcp

- **Domain(s):** trends-discovery (also: none)
- **Barrier route:** ③ self-host wrapper (public Google News RSS + unofficial Trends endpoints) · **Source tier:** L2 · **Ready MCP:** yes, self-host MCP server, no key (5 tools)
- **Cost:** free, no key, no quota (you pay only your own hosting) [https://github.com/jmanek/google-news-trends-mcp, fetched 2026-06]
- **Repo / Provider:** github.com/jmanek/google-news-trends-mcp, `jmanek/google-news-trends-mcp (81★, gh-api 2026-06)` (MIT; not archived; last push 2026-03-29)
- **Top pick for its domain:** no, GDELT/Trends MCP/Product Hunt lead; this is a free no-key complement for Google-native trending terms

## What it does / when to pick it
Self-host MCP (5 tools) that wraps **Google News RSS** (search/headlines/topics) plus **Google Trends trending keywords**, returning current trending search terms and the news articles around them. **Decision rule:** pick it to add *Google-native* trending keywords + headline context on top of **GDELT**, GDELT gives global multilingual tone/events, this gives you "what is Google trending right now and the stories behind it." Prefer **Trends MCP** when you need cross-platform acceleration with a clean growth-rate; prefer **SerpApi Google Trends** when you need reliable structured Trends JSON and don't mind the free 250/mo cap (confirmed `serpapi.com/pricing` 2026-06). Use this when free + no-key + Google-flavored trending is the priority.

## Install
Self-host: `git clone https://github.com/jmanek/google-news-trends-mcp` (or `uvx`/`pip` per its README), then register the local MCP server. Exact command lives in the volatile L1 line `reference/volatile/pricing-install.md → trends-discovery` (jmanek/google-news-trends-mcp, self-host, free no-key). No secret to leak, so `claude mcp add` is safe here. On Windows, stdio `uvx`/`pip` MCPs are flaky (path/shell), use absolute paths and test in a plain shell first. Restart / `/mcp` reconnect before use. L0 mechanics: `reference/install-guide.md`.

## Auth / keys
None. No API key, no account, no quota, the secret-hygiene script does **not** apply. It reads Google News RSS and the public Google Trends endpoints, so the only limits are Google's own throttling (see gotchas).

## Usage, call examples
After connecting, the 5 tools cover: search Google News by keyword, get top/topic headlines, and pull Google Trends trending keywords (optionally by geo). Typical flow: pull `trending keywords` for a region → for an interesting term, call the news-search tool to read the articles driving it → feed both into your report. List the exact tool names with your client after connecting, do not assume signatures from memory.

## General experience & gotchas (踩坑)
- **News and Trends use different operations:** news tools read public Google News RSS feeds; Trends tools rely on undocumented/unofficial endpoints. This wrapper does not establish a supported official Trends API. Google can throttle (HTTP 429) or change response shape with no notice, a previously-working query can start returning empty/garbled. Verify each selected operation and its returned content in the current session before trusting a run; add backoff for batches.
- **Google Trends values are relative (0 to 100 index), not absolute volume.** Good for "is this rising vs. its own baseline," useless for "how many people search this." For absolute volume use Google Ads Keyword Planner / DataForSEO.
- **RSS feeds are headline-level, not full text**, you get title/source/link/snippet; fetch the article separately (web-scraping shard) if you need body content.
- **Geo/locale matters**, trending terms are region-scoped; set the geo explicitly or you'll get US-default trends and misread a non-US market.
- **Single-author repo (81★, MIT; push 2026-03).** Thin adoption and no SLA mean current operation still needs verification; breakage is yours to fix.
- **Free L2 wrapper, route ③:** consider it before paid Trends sources when the selected operation and required content have been verified in the current session. Free access does not make it an official API or L1 source.

## Failure signals & fallback
Failure looks like: empty trending-keyword list or HTTP 429 from Google (throttled), or malformed parses after a Google response change. **Fallbacks:** for global multilingual news tone use **GDELT MCP** (free, no auth); for structured Google Trends JSON use **SerpApi Google Trends** (free 250/mo, confirmed `serpapi.com/pricing` 2026-06); for normalized cross-platform acceleration use **Trends MCP**; for the OSS Trends-only route use **flack0x/trendspyg / sdil87/trendspy** (browser-automation shard, post-pytrends).

## Last verified: 2026-06

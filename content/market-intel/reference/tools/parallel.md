# Tool: Parallel Search MCP

- **Domain(s):** web-scraping
- **Barrier route:** ② hosted search/extraction · **Source tier:** L2 for discovery; classify each original source separately
- **Ready MCP:** yes, Streamable HTTP at https://search.parallel.ai/mcp
- **Cost:** anonymous free access for exploration/light use; account/API key for higher limits. Do not infer an SLA or fixed free quota. [official documentation fetched 2026-09-23]
- **Repo / Provider:** https://parallel.ai · https://docs.parallel.ai/integrations/mcp/search-mcp
- **Top pick for its domain:** no, an independent search/fetch alternative to compare on the actual task

## What it does / when to pick it
Search the public web and extract focused excerpts from selected URLs. Use it for another
retrieval route when a primary search returns little or when full-page dumps waste context.
Search-provider diversity is not source independence: syndicated pages still count once.

## Install
Register the keyless endpoint in the current client's MCP configuration. Claude uses
`mcpServers`; Codex uses `[mcp_servers.parallel]` with `url = "https://search.parallel.ai/mcp"`.
Reconnect existing clients to expose newly registered tools. Direct HTTP clients can connect
immediately. Follow `reference/install-guide.md` before adding any credential.

## Auth / keys
The `/mcp` endpoint permits anonymous use at lower limits. `/mcp-oauth` requires authentication;
these endpoints are not interchangeable. Keep one generated `session_id` for the entire research
conversation, reusing it for search and fetch. Never rotate it to evade rate limits.

## Usage, call examples
Inspect `tools/list` for the current schema. The September 2026 interface exposes:
- `web_search(objective, search_queries, session_id?)`: a focused objective and 2 to 3 short queries.
- `web_fetch(urls, objective?, search_queries?, full_content?, allow_live_fetch?, session_id?)`:
  targeted excerpts by default; request full content only when necessary.

Do not invent `model_name`; omit it unless exact active model metadata is available.

## General experience & gotchas (踩坑)
- Empty search output is a result state, not proof that the subject does not exist. Rewrite once,
  retain both attempts, and report any remaining gap.
- Excerpts can omit qualifying context. Fetch the original page before making a decision-grade claim.
- `publish_date: null` remains unknown. Neither fetch time nor a query freshness instruction proves recency.
- Provider benchmark claims are interested-party evidence, not independent proof of superiority.

## Failure signals & fallback
Keep HTTP 401/403, 429, empty output and invalid content separate. Respect bounded retry/backoff.
Use Exa or another configured search source for discovery, and Firecrawl or an authorized browser
for pages the extractor cannot read. A successful call does not prove sustained availability.

## Last verified: 2026-09

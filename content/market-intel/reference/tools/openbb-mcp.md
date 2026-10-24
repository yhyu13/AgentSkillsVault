# Tool: openbb-mcp

- **Domain(s):** finance-markets
- **Barrier route:** 1 official API (self-hosted MCP over upstream provider APIs) · **Source tier:** free OSS plus paid provider keys · **Ready MCP:** yes (official, self-hosted at `openbb_platform/extensions/mcp_server`)
- **Top pick for its domain:** yes for consolidating several finance MCPs; the first-line free-start picks remain SEC EDGAR + FRED + Finnhub.

## What it does / when to pick it
Self-hosted MCP that exposes the full **OpenBB Platform** (~100 data providers, FMP, FRED, BLS, IMF, Polygon, yfinance, SEC, Intrinio, and more) behind a single MCP endpoint. **Connect once, dynamic tool activation per query**, the server surfaces only the relevant tools for what the agent is asking, instead of dumping all 100 providers into the tool list. Upstream repo (OpenBB-finance/OpenBB) sits at ~69k stars with active commits (last push 2026-06-16), so the project is healthy.

**Decision rule:** pick OpenBB MCP when you'd otherwise wire up 4 to 5 separate finance MCPs (Polygon **plus** FRED **plus** BLS **plus** yfinance **plus** SEC) into the same agent. It collapses that surface area into one MCP at the cost of a self-host step plus per-provider key management. For a one-off quote pull or a single-provider workflow, the dedicated MCP (e.g. Polygon MCP, SEC EDGAR direct) is lighter.

## Install
```bash
pip install openbb-mcp-server
```
Then launch the MCP server per the repo's `openbb_platform/extensions/mcp_server` README, see https://github.com/OpenBB-finance/OpenBB. Self-hosted: you run the process, the agent connects to it over MCP.

## Auth / keys
- **The server itself:** free, OSS, no key.
- **The providers it fronts:** each upstream is its own auth story. **Free no-key:** yfinance, SEC EDGAR, FRED (key recommended but generous free), BLS, IMF. **Key required:** FMP, Polygon, Intrinio, and other commercial providers. Configure provider keys in the OpenBB Platform credentials store before the MCP can route to them.

## Usage, call examples
Once the MCP server is running and registered with the agent:
```
# Agent-side: ask in natural language, MCP dynamically activates the right provider tool
"Get the latest 10-K filing for AAPL"        # → routes to SEC provider
"Pull US CPI YoY for the last 5 years"        # → routes to FRED provider
"Stream AAPL minute bars for the last 30d"    # → routes to Polygon (needs key)
```
The dynamic activation means you don't pre-select a provider, the server picks based on the query and your configured credentials.

## General experience and gotchas (踩坑)
- **Self-host is the price of admission**, unlike Polygon MCP or a Finnhub MCP (point your agent at someone else's endpoint), here **you run the server**. Budget the setup time and a place to host it before committing.
- **One MCP, many keys**, "~100 providers" sounds free, but the *useful* commercial ones (Polygon, FMP, Intrinio) still need their own paid keys. OpenBB consolidates the *interface*, not the *billing*.
- **Provider coverage is not Finnhub**, verified 2026-06 the bundled provider list is FMP / FRED / BLS / IMF / Polygon / yfinance / SEC / Intrinio etc. **Finnhub is NOT a built-in provider**, if your shard relies on Finnhub's free 60/min quotes, keep the dedicated Finnhub route separate.
- **Dynamic tool activation is the headline feature**, when it works, the agent sees a clean per-query tool list instead of 100 tools at once. When it misroutes, you get the wrong provider's quirks (e.g. yfinance rate limits vs Polygon delayed tier). Log which provider answered.
- **Overkill for single-source workflows**, if you only need SEC filings, hit SEC EDGAR directly; if you only need one realtime feed, Polygon MCP is simpler. The value compounds at 4+ providers.

## Last verified: 2026-06

# Tool: stefanoamorelli/sec-edgar-mcp

- **Domain(s):** finance-markets (also: none)
- **Barrier route:** ① free official · **Source tier:** L1 · **Ready MCP:** yes (stdio, `uvx`/Docker, no key, only a User-Agent string)
- **Cost:** free, no key, no quota (SEC EDGAR is a public US-gov data source; fair-access ~10 req/s)
- **Repo / Provider:** github.com/stefanoamorelli/sec-edgar-mcp, `stefanoamorelli/sec-edgar-mcp (313★, gh-api 2026-06)`; active (pushed 2026-06-05, not archived, AGPL-3.0)
- **Top pick for its domain:** yes (half of the free-start default: SEC EDGAR + FRED + Finnhub free tier)

## What it does / when to pick it
Wraps the SEC EDGAR system: 13M+ filings, full-text 10-K / 10-Q / 8-K, XBRL financial facts, and insider (Form 4) transactions, institutional-grade primary-source data at zero cost. **Decision rule:** this is the FIRST tool to reach for any US-company fundamentals, earnings, filing, or insider-trade question. Pick it over Finnhub/FMP/Polygon whenever the answer lives in an SEC filing (revenue/segments from the 10-K, risk factors, exec compensation, insider buys), those are the canonical numbers and the source is free and authoritative. Reach for the priced siblings only for live quotes, macro series, or pre-parsed valuation ratios it doesn't compute.

## Install
stdio MCP via `uvx` (or Docker). The AGPL repo requires a `SEC_EDGAR_USER_AGENT` env (SEC mandates a contact string like `"Name email@domain"`). Exact, time-stamped command: `reference/volatile/pricing-install.md → finance-markets`. L0 mechanics (stdio is flaky on Windows, prefer absolute paths, test in a plain shell first): `reference/install-guide.md`. Restart / `/mcp` reconnect after adding.

## Auth / keys
No API key. SEC requires a **User-Agent** identifying the client with a contact address. The documentation example `"market-intel-research user1@example.com"` is synthetic and is not an operational contact. Put the operator's real contact only in approved PRIVATE configuration and pass it through a supported no-echo mechanism. A contact address is personal data even though it is not an API token; MCP registration commands, configuration inspection and diagnostics must not print it. Verify a bounded filing read and content validity without logging the User-Agent.

## Usage, call examples
MCP tools cover company lookup (by ticker/CIK), filing retrieval, XBRL financial-fact extraction, and insider transactions. Minimal: resolve a ticker to its CIK, pull the latest 10-K, then extract a specific XBRL concept (e.g. `Revenues`, `NetIncomeLoss`) rather than dumping the whole filing.

## General experience & gotchas (踩坑)
- **Zero cost, institutional-grade, start here (shard).** It is the canonical source for US fundamentals; don't pay a vendor for numbers that are free and authoritative in the filing.
- **US-only.** EDGAR covers SEC registrants, no coverage for non-US-listed companies (use the company's home-market regulator or a paid global vendor for those).
- **Set the User-Agent or you get blocked.** SEC fair-access enforces it; a missing/garbage UA throttles you fast.
- **XBRL tags vary by filer/era.** The same economic line can sit under different us-gaap concepts across companies and years, confirm the tag you pulled actually maps to the metric you want; don't assume one tag fits all.
- **Filings are large and verbose.** Extract the specific section/XBRL fact you need; pulling whole 10-Ks burns context for little gain.
- **AGPL-3.0**, fine for internal research; relevant only if you redistribute a modified server.

## Failure signals & fallback
Failure looks like: empty result for a ticker (likely non-US / wrong CIK), EDGAR throttling (missing User-Agent), or a missing XBRL concept. **Fallbacks:** pre-parsed financials/valuation ratios → **Financial Modeling Prep** (`fmp`, free 250/day) or **Finnhub** (free 60/min); macro/economic context → **FRED MCP**; live quotes/history → **Polygon.io**.

## Last verified: 2026-06

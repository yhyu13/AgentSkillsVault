# Tool: stefanoamorelli/fred-mcp-server

- **Domain(s):** finance-markets (also: none)
- **Barrier route:** ① free official · **Source tier:** L1 · **Ready MCP:** yes (stdio, `uvx`/Docker, needs a free FRED API key)
- **Cost:** free (FRED is a public St. Louis Fed data source; free key, generous limits)
- **Repo / Provider:** github.com/stefanoamorelli/fred-mcp-server, `stefanoamorelli/fred-mcp-server (98★, gh-api 2026-06)`; active (pushed 2026-05-16, not archived, AGPL-3.0)
- **Top pick for its domain:** yes (part of the free-start default: SEC EDGAR + FRED + Finnhub free tier)

## What it does / when to pick it
Wraps FRED (Federal Reserve Economic Data): 800k+ macroeconomic time series, GDP, CPI/inflation, interest rates, unemployment, money supply, exchange rates, housing, and more, from the St. Louis Fed. **Decision rule:** pick FRED for any *macro/economic* context, the broad backdrop a single ticker doesn't give you. It is the macro half of the free-start default; reach for it whenever the question is about rates, inflation, growth, or the economy rather than a specific equity. Use SEC EDGAR for company fundamentals, Polygon/Finnhub/Twelve Data for live security prices, and FRED for the macro series around them.

## Install
stdio MCP via `uvx` (or Docker). Needs a `FRED_API_KEY` env. Exact, time-stamped command: `reference/volatile/pricing-install.md → finance-markets`. L0 mechanics (stdio flaky on Windows, prefer absolute paths, test in a plain shell): `reference/install-guide.md`. Restart / `/mcp` reconnect after adding.

## Auth / keys
Free API key, request one at fred.stlouisfed.org (account → API keys). It's free and instant; no paid tier. **Secret hygiene (key-bearing):** set `FRED_API_KEY` via the env form the USER runs; never echo the key into the transcript, and prefer editing `~/.claude.json` directly over `claude mcp add` (which echoes args). One-liner rules + full procedure: `reference/install-guide.md`.

## Usage, call examples
MCP tools let you search series by keyword and fetch observations for a series ID over a date range. Minimal: look up the series ID (e.g. `CPIAUCSL` for CPI, `GDP`, `UNRATE`, `DGS10` for the 10-yr Treasury), then fetch its observations between two dates.

## General experience & gotchas (踩坑)
- **Zero cost (shard).** Free key, no quota pain, front-load it for any macro question; don't pay a vendor for series FRED already hosts.
- **You must know (or search for) the series ID.** Series are keyed by FRED codes; search first, then pull. Picking the wrong vintage of a similarly named series is the common mistake (e.g. seasonally-adjusted vs not, real vs nominal, index vs % change).
- **Release lag and revisions.** Macro series are revised after first publication and lag the period they describe, FRED gives the official figure, not a nowcast. Note the observation date and whether the series is revised.
- **It's macro, not micro.** No per-company or per-ticker security data here, that's SEC EDGAR / the quote vendors. Don't try to source single-stock fundamentals from FRED.
- **AGPL-3.0**, fine for internal research; matters only on redistribution of a modified server.

## Failure signals & fallback
Failure looks like: empty/`Bad Request` for an unknown series ID, or a 400 if the key is missing/invalid. **Fallbacks:** company-level fundamentals → **SEC EDGAR MCP**; live security prices/history → **Polygon.io** / **Twelve Data**; if you just need a quick macro datapoint and the MCP is down, the FRED REST API (`api.stlouisfed.org/fred`) with the same key works directly.

## Last verified: 2026-06

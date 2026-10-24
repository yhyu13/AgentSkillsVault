# Tool: Kukapay/funding-rates-mcp

> ⚠ **D-STALE 2026-06**, last push 2025-04-21 (>13 months), only 7★. Functional but unmaintained; watch for a live alternative before relying on it for production. Not 404, just stale.

- **Domain(s):** crypto-defi (also: none)
- **Barrier route:** ① · **Source tier:** L1 · **Ready MCP:** yes, stdio via `uv` (clone + `uv sync`)
- **Cost:** free, open-source (MIT). No API keys (reads public exchange funding endpoints).
- **Repo / Provider:** github.com/kukapay/funding-rates-mcp, `kukapay/funding-rates-mcp (7★ ⚠, gh-api 2026-06)`, MIT, **last push 2025-04 (stale)**
- **Top pick for its domain:** no

## What it does / when to pick it
One MCP tool that pulls **current perpetual funding rates** across Binance, OKX, Bybit, Bitget, Gate, and CoinEx and returns a pivoted table (symbols × exchanges) with a `Divergence` column = max funding-rate gap per symbol. Pick it for a fast **perp funding-arb signal**: where funding diverges enough that a long-on-one / short-on-another carry could pay. It complements ccxt (spot/price spreads), funding-rates-mcp is the *funding* layer specifically.

## Install
No HTTP transport, stdio only, so it's clone + run locally (flaky on Windows; prefer a Linux box):
```
git clone https://github.com/kukapay/funding-rates-mcp && cd funding-rates-mcp && uv sync
```
Then register stdio: `command: uv`, `args: ["--directory", "/abs/path/funding-rates-mcp", "run", "funding-rates-mcp"]`. Restart / `/mcp` reconnect before use. Exact line: `reference/volatile/pricing-install.md` → crypto-defi.

## Auth / keys
None, it reads public funding endpoints, no key, no secret-hygiene step. (No `claude mcp add` key-leak concern here.)

## Usage, call examples
- Tool `compare_funding_rates(symbols, exchanges?, params?)`, e.g. `symbols=["BTC/USDT:USDT","ETH/USDT:USDT"]`; `exchanges` defaults to all six. Returns a Markdown table with a `Divergence` column.
- Prompt `compare_funding_rates_prompt(symbols)` generates the NL query for the above.
- Note the **perp symbol format** `BASE/QUOTE:QUOTE` (e.g. `BTC/USDT:USDT`), not spot `BTC/USDT`.

## General experience & gotchas (踩坑)
- **It's stale (D-STALE):** 7★, no commits since 2025-04. If an exchange changed its funding API since then, a column may silently return blank/error for that exchange. Sanity-check the table isn't half-empty.
- **Current funding only, no history.** It shows the present rate, not the realized funding you'd have collected. A high instantaneous divergence can mean-revert before the next funding interval; don't size a trade off one snapshot.
- **Divergence ≠ profit.** The number ignores the spot/perp basis, taker fees on both legs, and that funding intervals differ across exchanges (8h vs 4h vs 1h), naive carry math overstates edge.
- **Perp symbol format trap:** pass `BTC/USDT:USDT`; spot `BTC/USDT` returns nothing or wrong markets.
- Only six exchanges hard-coded; a venue with the real divergence may simply not be covered, cross-check with ccxt's `fetchFundingRate` for anything outside the six.

## Failure signals & fallback
Failure = MCP `✗ Failed` (stdio/uv path issue on Windows), blank cells for an exchange (its funding API moved, given the staleness), or empty table (bad symbol format). Fallback: query funding directly with **ccxt** (`exchange.fetch_funding_rate(symbol)` across exchanges), same data, maintained, and lets you add venues beyond the six. The shard flags watching for a live alternative (e.g. a vooi-app MCP) if this repo decays further.

## Last verified: 2026-06

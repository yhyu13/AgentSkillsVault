# Tool: Alpaca MCP (alpacahq/alpaca-mcp-server)

- **Domain(s):** finance-markets (also: none)
- **Barrier route:** ① official · **Source tier:** L1 · **Ready MCP:** yes, official, vendor-maintained (`alpacahq/alpaca-mcp-server`)
- **Cost:** **free** for paper trading and basic market data (IEX); free Alpaca account. Real-time SIP data + live trading require a funded/paid plan, see https://alpaca.markets/data and https://alpaca.markets/pricing.
- **Repo / Provider:** github.com/alpacahq/alpaca-mcp-server, `alpacahq/alpaca-mcp-server (0.8k★, gh-api 2026-06)` · MIT · active (pushed 2026-06-05)
- **Top pick for its domain:** no

## What it does / when to pick it
This is an **execution** tool, not a data source: place/cancel orders, read positions/balances, and pull quotes/bars via the Alpaca brokerage. Pick it when the task genuinely needs to *act on* a market (paper backtests, order placement) rather than just research it. **DECISION RULE: always start in paper-trading mode** (the master one-liner: "paper trading free, USE FIRST"). For read-only price/fundamentals/macro research, prefer the free data sources (SEC EDGAR, FRED, Finnhub), do not introduce an execution-capable MCP into a pure research run.

## Install
Official MCP. Clone/run per the repo README; supply `ALPACA_API_KEY` + `ALPACA_SECRET_KEY` and **point the base URL at the paper endpoint** (`https://paper-api.alpaca.markets`) first. Exact command + the paper-first note live in `reference/volatile/pricing-install.md` → finance-markets. stdio launcher is flaky on Windows (path/shell), prefer absolute paths and test in a plain shell first; see `reference/install-guide.md` Windows notes. Restart / `/mcp` reconnect after adding.

## Auth / keys
Generate paper-trading keys from the Alpaca dashboard (free account), keep paper and live keys separate and load the **paper** pair first. Secret hygiene (one line): keys land in plaintext in `~/.claude.json`; have the user supply them via `-e KEY=$VAR` themselves, never echo/commit/screenshot, full rules in `reference/install-guide.md` "Secret-handling hygiene".

## Usage, call examples
Tools cover account (balances, positions, orders), market data (quotes, bars), and order placement. Minimal example: "what's my paper buying power?" → account/balances tool; "buy 1 share of AAPL (paper)" → place-order tool with `symbol=AAPL, qty=1, side=buy, type=market`. Verify it routed to `paper-api.alpaca.markets` before any live key is ever loaded.

## General experience & gotchas (踩坑)
- **Guardrails are mandatory** (shard rule): the MCP holds the key and is execution-capable. Enforce a risk policy in front, small test sizing, paper-first, no oversized orders, auto-trading without guardrails is a hard no.
- **Paper ≠ live fills.** Paper trading uses simulated fills and (default) free IEX data, not full SIP; backtest results will not perfectly match live slippage. Don't present paper P&L as a real-money claim.
- **Free data is IEX, often delayed/partial**, "free realtime" is usually 15-min delayed (shard note). Real-time SIP is a paid add-on; if a research question needs tick-accurate realtime, this free tier won't deliver it.
- **Live and paper share key shape**, the danger is loading a live key against code you tested in paper. Keep them in distinct env vars and double-check the base URL on every session.

## Failure signals & fallback
Failure signals: `✗ Failed` in `claude mcp list`; 401/403 (wrong key or paper key against live URL / vice-versa); orders rejected for insufficient buying power. Fallback for **execution**: Tradier MCP (sibling, also has a free sandbox). Fallback for **read-only data** (if you only needed quotes): Finnhub free (60/min) or Twelve Data free (800/day), no execution risk.

## Last verified: 2026-06

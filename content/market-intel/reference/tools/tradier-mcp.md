# Tool: Tradier MCP

- **Domain(s):** finance-markets (also: none)
- **Barrier route:** ① official · **Source tier:** L1 · **Ready MCP:** ⚠ NOT a canonical official MCP, Tradier ships a REST brokerage API; the "MCP" is community/build-your-own. Searched 2026-06: only tiny unverified repos exist (`amoljavheri/Tradier-MCP` 0★, `fi222/tradier-mcp` 0★, `lyzetam/mcp-tradier` 1★). Treat as "wrap the REST API" rather than an off-the-shelf server.
- **Cost:** **free** sandbox/paper-trading token on signup (confirmed at docs.tradier.com). Live trading needs a funded brokerage account; real-time/streaming market-data subscription fees apply, **price unverified 2026-06, confirm at https://tradier.com/products/market-data and https://docs.tradier.com**.
- **Repo / Provider:** https://tradier.com (API docs https://docs.tradier.com/docs/getting-started), brokerage SaaS; no first-party MCP repo
- **Top pick for its domain:** no

## What it does / when to pick it
An **execution** brokerage API (quotes, options chains, account, order placement for equities/ETFs/options). Like Alpaca, it is for *acting on* a market, not researching one. **DECISION RULE: use the free sandbox first.** Pick Tradier over Alpaca only if you specifically want Tradier's options-chain/order model or already hold a Tradier account; otherwise Alpaca is the better-supported default (it has a real official MCP). For read-only research, use the free data sources instead.

## Install
No reliable official MCP, either wrap the REST API yourself or vet one of the tiny community repos (all 0 to 1★, unverified, read the code before trusting it with keys). Point at the **sandbox** base URL `https://sandbox.tradier.com/v1/` first; production is `https://api.tradier.com/v1/`. Confirm any install line in `reference/volatile/pricing-install.md` → finance-markets. Windows + secret-bearing → direct `~/.claude.json` edit, not `claude mcp add`; restart / `/mcp` reconnect after. L0 mechanics: `reference/install-guide.md`.

## Auth / keys
Create a Tradier account → you get a **sandbox token** (free, paper trading) and a production token. Use the sandbox token until guardrails + small test sizing are proven. Secret hygiene (one line): token goes plaintext into `~/.claude.json`; user supplies via env var, never echo/commit/screenshot, see `reference/install-guide.md` "Secret-handling hygiene".

## Usage, call examples
REST endpoints (the MCP/wrapper just surfaces these): `/v1/markets/quotes`, `/v1/markets/options/chains`, `/v1/accounts/{id}/positions`, `/v1/accounts/{id}/orders` (POST to place). Minimal example (sandbox): GET `https://sandbox.tradier.com/v1/markets/quotes?symbols=AAPL` with `Authorization: Bearer <sandbox_token>`; place a paper order via POST to the sandbox orders endpoint. Confirm the host is `sandbox.tradier.com` before any production token is loaded.

## General experience & gotchas (踩坑)
- **"Ready MCP" overstated**, the master inventory says yes, but there is no canonical first-party server; you are wrapping REST or trusting a 0★ repo. Budget time for a thin custom wrapper rather than expecting plug-and-play.
- **Guardrails mandatory** (shard rule): execution-capable + holds the key → enforce small test sizing and sandbox-first; auto-trading without guardrails is a hard no.
- **Sandbox market data is delayed**, and live realtime/streaming is a paid market-data sub, "free realtime" is usually 15-min delayed (shard). Don't promise tick-accurate data on the free tier.
- **Sandbox vs production host mix-up** is the classic footgun, distinct tokens, distinct base URLs; verify the host on every session so a live token never hits code you only tested in sandbox.

## Failure signals & fallback
Failure signals: `✗ Failed` / `! Needs authentication` in `claude mcp list`; 401 (token/host mismatch); orders silently rejected in sandbox. Fallback for **execution**: **Alpaca MCP** (sibling, official server, free paper trading, the better-supported default). Fallback for **read-only data**: Finnhub free (60/min) or Twelve Data free (800/day).

## Last verified: 2026-06

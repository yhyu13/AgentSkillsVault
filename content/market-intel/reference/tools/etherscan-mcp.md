# Tool: Etherscan MCP

- **Domain(s):** crypto-defi (also: none)
- **Barrier route:** ① official · **Source tier:** L1 · **Ready MCP:** yes, official hosted endpoint, free key as bearer
- **Cost:** free key (rate/coverage-limited). Free-tier **chain coverage cut ~10% in 2026-05**; verified-contract + ABI endpoints stay free on all chains. "Lite" plan = ~25% of the prior lowest tier [info.etherscan.com/whats-changing-in-the-free-api-tier-coverage-and-why, fetched 2026-06]
- **Repo / Provider:** https://etherscan.io (official hosted MCP at `mcp.etherscan.io`)
- **Top pick for its domain:** yes

## What it does / when to pick it
On-chain reads across 60+ EVM chains: address balances, transactions, contract source/ABI, gas oracle, token transfers, logs. **Decision rule:** this is the **first pick for on-chain analysis**, addresses, tx tracing, pulling a contract's verified source/ABI, gas. Pair it with CoinGecko's GeckoTerminal for DEX OHLCV. **Crucially:** for any chain that fell out of the free tier in the 2026-05 cut, **back it up with Blockscout MCP** (free, 3000+ chains) rather than paying for the chain.

## Install
HTTP/remote MCP `https://mcp.etherscan.io/mcp`, **free key supplied as bearer**. Exact, time-stamped command: `reference/volatile/pricing-install.md → crypto-defi`. Prefer HTTP transport on Windows. L0 mechanics: `reference/install-guide.md`. Restart / `/mcp` reconnect after adding.

## Auth / keys
Free API key from etherscan.io (account → API keys). The unified key works across the 60+ supported chains. **Secret hygiene (key-bearing):** USER supplies the key as the bearer; never echo it; edit `~/.claude.json` directly from clipboard rather than `claude mcp add` (which echoes the header with the key), and never `browser_snapshot` the key page. One line + full rules: `reference/install-guide.md`.

## Usage, call examples
Tools cover account balance/txlist, contract `getabi`/`getsourcecode`, `gastracker`, token transfers, and event logs. Minimal: pull an address's normal + token tx history, then fetch the verified ABI of the contract it interacts with to decode the calls.

## General experience & gotchas (踩坑)
- **The 2026-05 free-tier cut is the big trap:** ~10% of chains were dropped from the free tier, and the "Lite" paid plan is only ~25% of the old lowest tier. **Verified-contract + ABI endpoints stay free on ALL chains**, so contract/ABI lookups are safe, but raw tx/balance on a dropped chain may now 403/empty on a free key.
- **Don't pay to recover a dropped chain, switch to Blockscout MCP** (free, no key for dev, 3000+ chains). The shard explicitly positions Blockscout as the free backstop for the Etherscan cut.
- Per-chain rate limits are modest on the free key (historically ~5 calls/s); a tight loop over an address's full history will 429, page and back off.
- Read-only, no execution. Anything touching private keys → small test wallet, never enable withdrawals (shard reality check).
- Chain id / network must match the address; querying the wrong chain returns an empty (not error) result and looks like "no activity."

## Failure signals & fallback
Failure looks like: `403`/empty on a chain dropped from the free tier, HTTP 429 (rate limit), or `NOTOK` on a malformed query. **Fallbacks:** dropped/unsupported chain or higher throughput → **Blockscout MCP** (free, 3000+ chains); normalized multi-chain wallet/portfolio → **Moralis** / **Covalent (GoldRush)**; price/DEX history → **CoinGecko MCP**; smart-money labels → **Nansen**.

## Last verified: 2026-06

# Tool: blockscout/mcp-server

- **Domain(s):** crypto-defi (also: none)
- **Barrier route:** ① official · **Source tier:** L1 · **Ready MCP:** yes, official, public endpoint, no key for dev
- **Cost:** free read-only. No key needed for dev/research throughput; a free Pro key raises prod throughput.
- **Repo / Provider:** github.com/blockscout/mcp-server, `blockscout/mcp-server (40★, gh-api 2026-06)`; active (pushed 2026-06-08, not archived; license NOASSERTION, confirm before redistribution). Docs: docs.blockscout.com/devs/mcp-server
- **Top pick for its domain:** no

## What it does / when to pick it
Official Blockscout MCP for read-only on-chain data across **3000+ chains**: addresses, transactions, blocks, contracts/ABI, and contract view (read) calls. **Decision rule:** pick Blockscout when Etherscan doesn't cover (or has dropped) the chain you need, or when you want a fully free, no-key on-chain source. It is the **explicit free backstop for the Etherscan 2026-05 free-tier cut**, same on-chain reads, far wider chain coverage, zero cost. For Ethereum-mainnet-centric work with the richest tooling, Etherscan is still the first pick; Blockscout fills the long tail.

## Install
Official MCP, **no key for dev**. Install/endpoint per `docs.blockscout.com/devs/mcp-server`; time-stamped pointer in `reference/volatile/pricing-install.md → crypto-defi`. Prefer the hosted HTTP endpoint on Windows. L0 mechanics: `reference/install-guide.md`. Restart / `/mcp` reconnect after adding.

## Auth / keys
None required for dev/research. A **free Pro key** (from Blockscout) only raises throughput for production load, not needed for typical research. If you do add one, secret-hygiene applies (one line + rules: `reference/install-guide.md`).

## Usage, call examples
Tools cover address info/tokens, tx details, block data, contract source/ABI, and view-method calls. Minimal: look up an address on a non-Ethereum chain (where Etherscan's free tier dropped it), pull its token holdings + recent tx, then read a contract view method for current state.

## General experience & gotchas (踩坑)
- **This is the free fix for the Etherscan free-tier cut**, when an Etherscan free-key query 403s/empties on a dropped chain, re-run it here instead of paying. The shard names Blockscout exactly for this.
- **Coverage depends on a Blockscout instance existing for the chain**, 3000+ chains are indexed, but a brand-new or obscure chain without a Blockscout deployment won't resolve; confirm the chain is supported before assuming "no data."
- Read-only / view calls only, no execution. Private keys → small test wallet (shard reality check).
- **License is NOASSERTION** (not a clean SPDX id), fine to use the hosted service; check the repo LICENSE before vendoring/redistributing the server code.
- No-key dev throughput is for research scale; sustained heavy/prod load needs the free Pro key to avoid throttling.

## Failure signals & fallback
Failure looks like: chain/instance not found (no Blockscout deployment), throttling under heavy no-key load, or an empty result from a wrong chain id. **Fallbacks:** Ethereum-mainnet-rich tooling, gas oracle, ABI on a covered chain → **Etherscan MCP**; normalized multi-chain wallet/portfolio → **Moralis** / **Covalent (GoldRush)**; price/DEX history → **CoinGecko MCP**.

## Last verified: 2026-06

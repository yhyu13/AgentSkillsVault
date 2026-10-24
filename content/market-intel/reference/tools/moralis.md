# Tool: Moralis

- **Domain(s):** crypto-defi (also: none)
- **Barrier route:** ① official · **Source tier:** L1 · **Ready MCP:** yes, official, needs free key
- **Cost:** free tier, **40k Compute Units/day (~1.2M CU/mo) · 40 RPS** [https://moralis.com/pricing/, fetched 2026-06]. Cheapest paid: Starter $49/mo (annual) → 2M CU/mo.
- **Repo / Provider:** https://moralis.io (official Moralis MCP / Web3 Data API)
- **Top pick for its domain:** no

## What it does / when to pick it
Multi-chain **wallet / portfolio data, normalized across 100+ chains**, balances, token holdings, NFT holdings, transfers, and DeFi positions in one schema. **Decision rule:** pick Moralis (or its sibling Covalent/GoldRush) when you need **normalized portfolio/wallet data across many chains at once** and don't want to stitch per-chain Etherscan/Blockscout responses yourself. For single-chain raw tx/ABI, Etherscan/Blockscout are simpler and free; Moralis earns its place on cross-chain portfolio aggregation. Between Moralis and Covalent, Moralis has the more generous **free tier** (≈1.2M CU/mo vs Covalent's 14-day trial).

## Install
Official Moralis MCP / Web3 Data API, **needs a free key**. Time-stamped pointer in `reference/volatile/pricing-install.md → crypto-defi` (shard: "Moralis / Covalent ... 100+ chains normalized"). Prefer HTTP transport on Windows. L0 mechanics: `reference/install-guide.md`. Restart / `/mcp` reconnect after adding.

## Auth / keys
Free API key from the Moralis dashboard (admin.moralis.com → Web3 APIs → API key). **Secret hygiene (key-bearing):** USER supplies the key; never echo it; edit `~/.claude.json` directly from clipboard rather than `claude mcp add` (which echoes the header/URL with the key), and never `browser_snapshot` the key page. One line + full rules: `reference/install-guide.md`.

## Usage, call examples
Tools cover wallet token/NFT balances, token/NFT transfers, native + ERC-20 portfolio, and token price. Minimal: pull a wallet's full ERC-20 holdings across all supported chains in one call, then its transfer history for the asset of interest.

## General experience & gotchas (踩坑)
- **Billed in Compute Units, not requests**, different endpoints cost different CU amounts, so the "40k/day" free budget drains unevenly; a few heavy multi-chain portfolio calls cost far more than a single balance check. Watch CU, not call count.
- **Its advantage over Etherscan/Blockscout is normalization**, one schema across 100+ chains. If you only need one chain, the free Etherscan/Blockscout route is cheaper/simpler; don't spend CU where a free single-chain read suffices (CONSTITUTION C2).
- 40 RPS is generous for research, but the **daily CU cap resets daily**, a long backfill can stall at the cap; spread it or upgrade.
- Some advanced/enterprise endpoints (deep history, certain DeFi protocol coverage) are higher-tier, a free-tier call may return partial coverage rather than an error.
- Read-only data API, no execution; private keys → small test wallet (shard reality check).
- **Signup silently rejects headless Google OAuth** (confirmed 2026-06-16), `admin.moralis.com/register` shows "Login with Google" but clicking does not navigate from headless playwright (no visible error; the page just stays on /register). Likely a Cloudflare-like fingerprint check. User-only signup. Once logged in, key is at admin.moralis.com Web3 APIs tab.

## Failure signals & fallback
Failure looks like: HTTP 429 (40 RPS) or daily-CU-exhausted error, partial coverage on a higher-tier endpoint, or empty result on an unsupported chain. **Fallbacks:** equivalent normalized multi-chain portfolio → **Covalent (GoldRush)**; single-chain raw tx/ABI → **Etherscan MCP** / **Blockscout MCP** (free); price/DEX history → **CoinGecko MCP**; smart-money labels → **Nansen**.

## Last verified: 2026-06

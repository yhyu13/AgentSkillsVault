# Tool: Covalent / GoldRush

- **Domain(s):** crypto-defi (also: none)
- **Barrier route:** ① official · **Source tier:** L1 · **Ready MCP:** yes, official, needs free key
- **Cost:** free **14-day trial · 25k API credits · 4 RPS** [https://goldrush.dev/pricing/, fetched 2026-06]. Cheapest ongoing paid: "Vibe Coding" $10/mo → 10k credits/mo (prorated), 4 RPS.
- **Repo / Provider:** https://goldrush.dev (Covalent's GoldRush API / MCP)
- **Top pick for its domain:** no

## What it does / when to pick it
Multi-chain **normalized wallet / portfolio data across 100+ chains**, the same category as Moralis: balances, token holdings, transfers, transactions, historical portfolio value, in one unified schema. **Decision rule:** pick Covalent/GoldRush when you want cross-chain normalized portfolio data and either prefer its historical-portfolio coverage or have hit Moralis's limits. **Note the free-tier difference:** Covalent's free access is a **14-day trial (25k credits)**, whereas Moralis offers an ongoing free monthly tier, so for a sustained free-first workflow, **default to Moralis** and use Covalent when you need its specific historical/coverage strengths or as a same-shape fallback.

## Install
Official GoldRush (Covalent) API / MCP, **needs a free key**. Time-stamped pointer in `reference/volatile/pricing-install.md → crypto-defi` (shard: "Moralis / Covalent (GoldRush) ... 100+ chains normalized"). Prefer HTTP transport on Windows. L0 mechanics: `reference/install-guide.md`. Restart / `/mcp` reconnect after adding.

## Auth / keys
Free API key from the GoldRush dashboard (goldrush.dev → sign up → API keys). The trial is **time-boxed (14 days)**, plan around that, not just the credit count. **Secret hygiene (key-bearing):** USER supplies the key; never echo it; edit `~/.claude.json` directly from clipboard rather than `claude mcp add` (which echoes the header/URL with the key), and never `browser_snapshot` the key page. One line + full rules: `reference/install-guide.md`.

## Usage, call examples
Tools cover token balances for an address, transactions, transfers, and historical portfolio value over time across supported chains. Minimal: pull a wallet's token balances across all chains, then its historical portfolio-value series for a P&L view.

## General experience & gotchas (踩坑)
- **Free access is a 14-day trial, not a standing free tier**, the clock, not the 25k credits, is usually what runs out first. For ongoing free crypto work, **Moralis's monthly free tier is the better default** (CONSTITUTION C2); reach for Covalent for its historical-portfolio depth or as a fallback.
- **Credit-metered + 4 RPS**, the low 4 RPS throttle makes large backfills slow; page deliberately and don't fan out parallel calls.
- Normalization across 100+ chains is the value-add (same as Moralis), if you only need one chain, free Etherscan/Blockscout is cheaper; don't burn trial credits on single-chain reads.
- Historical-portfolio-value endpoints can be heavier (more credits), budget the trial accordingly.
- Read-only data API, no execution; private keys → small test wallet (shard reality check).

## Failure signals & fallback
Failure looks like: trial-expired / credit-exhausted error, HTTP 429 (4 RPS), or empty result on an unsupported chain. **Fallbacks:** equivalent normalized multi-chain portfolio with a standing free tier → **Moralis**; single-chain raw tx/ABI → **Etherscan MCP** / **Blockscout MCP** (free); price/DEX history → **CoinGecko MCP**; smart-money labels → **Nansen**.

## Last verified: 2026-06

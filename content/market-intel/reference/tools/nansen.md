# Tool: Nansen

- **Domain(s):** crypto-defi (also: none)
- **Barrier route:** ① · **Source tier:** L1 · **Ready MCP:** yes, official Nansen MCP (key-bearing); also REST API
- **Cost:** paid sub; shard notes ~$49/mo annual (collapsed from up to ~$999/mo). Price unverified 2026-06, confirm at https://www.nansen.ai/pricing (page is JS/bot-gated, did not load via fetch)
- **Repo / Provider:** https://nansen.ai (docs https://docs.nansen.ai), non-GitHub SaaS, no public repo
- **Top pick for its domain:** no

## What it does / when to pick it
Smart-money wallet labels + token "god mode": entity-labeled flows, holder breakdowns, Smart Money / Profiler / Token Screener / Portfolio / Hyperliquid endpoints. Pick it ONLY when the question hinges on *who* is moving, labeled smart-money accumulation/distribution that raw on-chain (Etherscan/Blockscout) can't tell you. For plain price, balances, tx, or TVL/yields, the free siblings (CoinGecko, Etherscan, DefiLlama) win, do not pay Nansen for those.

## Install
Official Nansen MCP + REST API gated behind a paid subscription. Connection guide + supported tools at https://docs.nansen.ai (MCP section). Prefer the HTTP/remote MCP on Windows over stdio (install-guide.md → MCP transport). Exact command rots, verify the L1 line in `reference/volatile/pricing-install.md` → crypto-defi and the docs before adding.

## Auth / keys
API key issued from the Nansen dashboard once on a qualifying plan. Key-bearing: do NOT `claude mcp add` (it echoes the key to the transcript); have the user copy the key and edit `~/.claude.json` directly. Never `browser_snapshot` the key page. Full procedure in `reference/install-guide.md` → Secret-handling hygiene.

## Usage, call examples
REST: categories Smart Money, Profiler, Token Screener, Portfolio, Hyperliquid, Agent, Prediction Markets (see docs.nansen.ai). Typical flow: token god-mode → smart-money net flow + top labeled holders over a window. After reconnect, discover callable tools through the active host/session and verify the selected read-only operation and returned fields. Configuration inspection is not tool discovery and may expose credentials.

## General experience & gotchas (踩坑)
- The ONLY differentiated value is the **labels**. If your finding doesn't depend on labeled entities, you are overpaying, drop to free CoinGecko/Etherscan/DefiLlama (CONSTITUTION C2 free-first).
- Pricing has been volatile: the shard records a collapse from ~$999/mo down to ~$49/mo annual. Do NOT quote a hard number to the user, confirm live on the pricing page; tiers/limits change.
- Labels are heuristic, not ground truth: "smart money" is Nansen's classification, can lag or mislabel fresh wallets. Treat as a *signal*, corroborate the actual flow on-chain.
- Paid quota/credits can be burned fast by broad token screens, scope queries to specific tokens/wallets.

## Failure signals & fallback
Failure = the selected operation is unavailable in the current session, returns 401/403 (expired or under-tier key), or lacks required label fields. A saved connection inventory alone cannot establish readiness. Fallback: raw flows via **Etherscan MCP** / **Blockscout MCP** (free), protocol-level TVL/flows via **DefiLlama API** (free, no-key), after verifying that route; accept you lose the entity labels and say so in the report.

## Last verified: 2026-06

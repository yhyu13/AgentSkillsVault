# Tool: Barker (barker.money)

- **Domain(s):** crypto-defi (also: none)
- **Barrier route:** ① official · **Source tier:** L2 · **Ready MCP:** no, REST API + iframe embed; no official MCP server
- **Cost:** dashboard + read API appear free; `BarkerEngine` partner contract takes `barkerFeeBps` from yields (skill the user pays via vault economics, not subscription). Confirm at https://barker.money [fetched 2026-06]
- **Repo / Provider:** https://barker.money, closed-source SaaS; docs at https://docs.barker.money (llms.txt available); positions as "yield primitive for the agent economy"
- **Top pick for its domain:** no (specialist: stablecoin yields across DeFi + CEX; DefiLlama remains the broad-spectrum default)

## What it does / when to pick it
Aggregates yields for **stablecoins specifically**, across 515+ DeFi protocols and 20+ centralized exchanges, in one comparison surface. Differentiates from DefiLlama on three axes: (1) **CEX yields covered** (DefiLlama is DeFi-only, Binance/OKX/Bybit campaign rates don't show up there), (2) **stablecoin-tight scope** so the leaderboard isn't diluted by volatile-asset farms with misleading IL-ignoring APYs, (3) **actionable**, exposes ERC-4626 vault deposits via a per-partner `BarkerEngine` contract, not just read-only data. **Decision rule:** pick Barker when the question is "where's the best safe USD/USDC/USDT yield right now across CEX + DeFi" or "track yield drift on a specific stable position." Stick with **DefiLlama** for cross-protocol TVL/fees/volume analytics, protocol-level health, or any non-stablecoin asset.

## Install
No MCP, no local install. Use one of two integration shapes:
1. **Read-only research** (the market-intel use case), call the REST API directly. Index of endpoints + the `llms.txt` agent-friendly catalog at https://docs.barker.money. Plain `curl`, no key claimed for read paths (verify on docs before bulk use).
2. **Embed / vault execution** (out of scope for research; user-facing only), iframe widget or partner-deployed `BarkerEngine` ERC-4626 contract on Base / Arbitrum / Ethereum / BNB. Not relevant for fact-finding runs.

No transport / OS quirks (pure HTTPS REST). See L1 line in `reference/volatile/pricing-install.md` → crypto-defi; L0 mechanics in `reference/install-guide.md` only if/when an official MCP ships.

## Auth / keys
No key documented for the public read surface as of the verification date. **Verify in https://docs.barker.money/llms.txt before bulk pulling**, closed-source SaaS quietly add rate limits or auth gates. If a key gets introduced later, treat it as Bearer-token shaped and follow the standard `install-guide.md` secret hygiene (no `claude mcp add` echo, clipboard-only capture).

## Usage, call examples
Concrete endpoints aren't enumerated in the public landing pages (the `llms.txt` index is the canonical map, read it before composing requests). Conceptual flow for a research run:
1. Pull the leaderboard of stablecoin yields filtered by venue type (CEX vs DeFi) and asset (USDC / USDT / DAI / etc.).
2. Drill into one offering for: APY (and how it's computed, variable rate vs reward emission), TVL / pool depth, venue, lock period, risk surface.
3. Cross-check against DefiLlama's `yields.llama.fi/pools` for the DeFi-protocol entries to spot APY divergence (different sampling windows / fee handling).

If the live REST shape changes, fall back to **DefiLlama yields** for DeFi entries and **the CEX provider's own earn page** for CEX entries.

## General experience & gotchas (踩坑)
- **Stablecoin-only scope is the feature, not a limit.** Don't try to use it as a generic yield engine for ETH/BTC LSTs, it's intentionally curated and those queries will return empty.
- **CEX yields are campaign-driven and time-boxed.** The platform's "Campaigns" tab lists *limited-time* CEX promo rates; the same rate often does not exist a week later. **Always stamp the fetch date in any report citing a Barker CEX APY**, guardrail #5 (timestamp volatile data) bites hard here.
- **L2 source tier, not first-party.** Barker aggregates; the authoritative number is on the protocol's / CEX's own page. Use Barker for *discovery* (where to look), then verify the APY on the venue itself before recommending action.
- **No MCP yet (as of 2026-06).** Integration today = REST or browser. If/when an official MCP ships, promote this entry to a `claude mcp add` and demote the REST-only note.
- **"Agent economy" framing implies forthcoming AI-specific surfaces** (mentioned: Agent Skills), worth re-checking quarterly during refresh sweeps. May ship its own skill or MCP server that supersedes manual REST calls.
- **Fee model is built into the vault, not the API.** Read-only research is fee-free; actual deposits go through `BarkerEngine` which takes `barkerFeeBps` + `partnerFeeBps` from accrued yield. Not relevant for research output but worth knowing if a report recommends Barker as the user's *execution* venue.

## Failure signals & fallback
Failure looks like: empty response on a stable that should exist (slug mismatch with the platform's internal naming, re-resolve from the index endpoint), HTTP 429 / connection drops (closed-source, undocumented throttling, back off and cache), or the leaderboard contradicting the venue's own page (campaign expired or sampled stale, trust the venue).

**Fallbacks:**
- Broad DeFi-only yield comparison → **DefiLlama** (`yields.llama.fi/pools`, free, no key).
- A specific CEX's earn page → that CEX's official Earn / Simple Earn / Flexible Earn surface (Binance Earn, OKX Earn, Bybit Earn), first-party L1 and authoritative.
- Stablecoin supply + peg health (orthogonal but useful next to yield) → **DefiLlama stablecoins** subdomain (`stablecoins.llama.fi/stablecoins`).
- Protocol-level risk context for a DeFi pool Barker surfaces → **DefiLlama** `/protocol/{slug}` for TVL history + chain breakdown.

## Last verified: 2026-06

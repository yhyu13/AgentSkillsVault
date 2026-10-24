# Tool: Hummingbot core

**Runtime storage status: setup only.** No shipped adapter admits this tool's
complete file output. Do not launch collection, login or persistence until every
child-file write meets the [external-tool storage requirements](../../../../DATA.md#external-tool-storage).
`resolve_directory` alone does not authorize writes; examples below are setup guidance.

- **Domain(s):** crypto-defi (also: none)
- **Barrier route:** ① (execution layer) · **Source tier:** L1 · **Ready MCP:** no; the archived client is retired from the usable catalog
- **Cost:** free, open-source (Apache-2.0). You pay only for a VPS + exchange trading fees.
- **Repo / Provider:** github.com/hummingbot/hummingbot, `hummingbot/hummingbot (20.325k★, gh-api 2026-10-06)`, Apache-2.0, not archived, pushed 2026-10-06. The same metadata check found the old MCP client archived; its URL and evidence are preserved in [the retirement note](../../../../docs/retired-catalog.md). Installation, authentication and operations were not checked.
- **Top pick for its domain:** no

## What it does / when to pick it
Open-source bot framework that **executes** market-making and CEX/DEX + AMM arbitrage strategies across many exchanges. Pick it only when you've moved past analysis and actually want to *place orders* / run a live arb or MM strategy. For measuring spreads or funding (the usual research output) you do NOT need Hummingbot, that's ccxt + funding-rates-mcp. Hummingbot is the execution endpoint, and it needs a VPS to run continuously.

## Install
The core and optional **Hummingbot API** require supported version-specific configuration.
The retired MCP client is no longer an installation route. Before starting the core/API,
check the selected version's configuration and persistence options. From an importable full
Market checkout, resolve an existing private runtime directory:

```python
from tools.private_inventory import resolve_directory

runtime = resolve_directory("runtime/hummingbot")
```

Initialize that directory in the configured PRIVATE versioned companion first. The resolver
checks only that it is inside the companion's Git worktree and outside this checkout; a missing
or unmanaged directory fails setup.

Use supported absolute bind mounts beneath `runtime.path` for the core databases, encrypted
keystore, API state, logs, strategy configuration and exports. A Docker named volume alone
does not establish Git versioning or backup. Supply API configuration and credentials through a
supported external private env-file or secret configuration, never a `.env` in the public clone.
Verify every enabled writer, revalidate its destination before launch, and keep setup-only if
the installed version cannot redirect any writer.

Choose core/API installation instructions from the current upstream version. Start configured
services only after private persistence is established and the selected host is verified.
See `reference/volatile/pricing-install.md` → crypto-defi for dated setup prerequisites.

## Auth / keys
Exchange API keys belong in **Hummingbot's own encrypted keystore** in the private runtime. The
API authenticates through its supported private configuration; verify the selected version's
credential mechanism and variable names before setup.
Use a small isolated test wallet and disable withdrawal permission. Never expose credentials in
transcripts or public repositories; designated PRIVATE versioned credential backups are allowed.
See `reference/install-guide.md` → Secret-handling hygiene.

## Usage, call examples
Once the configured core/API is running, discover its actual supported operations.
Verify an authorized read-only status or balance operation, including authentication
and usable response content. Return only value-free status diagnostics; never dump raw service
configuration or secret-bearing listings. Installation checks never place orders or start a
trading strategy. Strategy execution requires separate explicit authorization and paper/dry-run
validation first.

## General experience & gotchas (踩坑)
- **Reality check (shard):** public arbitrage bots/scripts basically don't profit. Real edge is latency, order flow, gas/capital mgmt, not running a stock strategy. Set expectations before deploying live.
- **It needs a VPS.** It's a long-running process; laptop/intermittent runs miss fills and desync state. Budget a cheap always-on box.
- **Setup remains unverified.** The active core repository is not proof that the selected core/API version installs or works in the current host; the archived MCP client is not a fallback.
- **Disable withdrawals** on the exchange key and use a small isolated test wallet. A leaked trade-only key can still lose capital through unauthorized trades, adverse prices and fees.
- Docker networking depends on the host: `localhost` inside a container refers to that container. Docker Desktop commonly provides `host.docker.internal`; verify the supported address on the actual platform.

## Failure signals & fallback
Failure = core/API connection refused (service down or wrong URL), auth errors
(private API credentials rejected), or strategy never fills (spread gone after fees, or wrong
market symbol). Fallback for *research* (no execution): measure the opportunity with **ccxt**
(spreads) + **funding-rates-mcp** (perp funding divergence) and report whether an edge exists before
standing up a bot.

## Last verified: 2026-06

# Tool: open-seo (open-source Semrush/Ahrefs alternative, MCP-native)

- **Domain(s):** seo-keywords
- **Barrier route:** ①/③ · **Source tier:** L2 · **Ready MCP:** **yes**, the repo ships MCP support (topics include `mcp` and `google-search-console-mcp`), so Claude can drive keyword/SERP/audit queries as connected tools rather than screen-scraping a SaaS UI.
- **Cost:** free, open-source (self-host; the only cost is any third-party data source you plug in) [github.com/every-app/open-seo, gh-api fetched 2026-07-22]
- **Repo / Provider:** `every-app/open-seo (22.7k★, stars checked via GitHub API 2026-10-08)`, not archived, pushed 2026-07-21, TypeScript. Site openseo.so. Self-described "open source alternative to Semrush and Ahrefs." Topics: keyword-research, backlink-analysis, site-audit, seo-tools.
- **Top pick for its domain:** no (free **Google Search Console MCP** stays the first pick for *your own site's* real data. open-seo is the strongest **free OSS** option for the *external* keyword/SERP/backlink/audit work that otherwise pushes you to paid DataForSEO/Ahrefs/Semrush)

## What it does / when to pick it
open-seo bundles the common SEO-suite jobs, keyword research, SERP inspection, backlink analysis, site audit, into a self-hostable app with MCP access. **Decision rule:** after you have wired the free **GSC MCP** for first-party clicks/impressions, reach for open-seo when you need the *competitive/external* view (keywords you do not yet rank for, competitor backlinks, a crawl-based audit) and want to avoid a Semrush/Ahrefs subscription. Escalate to paid **DataForSEO** (① cheap, pay-per-call) only when you need vendor-grade SERP/keyword volume at scale or coverage open-seo's data sources do not reach.

## Install
Clone the selected source version and follow its README for dependency installation. Before starting the app, Docker runtime or MCP, use the full Market checkout's `tools/private_inventory.py` to verify an existing PRIVATE versioned runtime. Inventory its configuration, OAuth/provider credentials, databases, crawl results, caches, logs and exports, then use an adapter with supported absolute destinations for all real writes. Revalidate the private destination before launch. If any writer cannot be redirected and verified, keep the tool in setup.

After a verified runtime is running, enable MCP per that version's docs and reconnect the active host. Use a supported value-free diagnostic for the selected server, returning only allowlisted name, connection status and authentication state; report those states as unverified if unavailable. Discover and execute the selected operation with usable results before claiming readiness. Volatile install line: `pricing-install.md` → seo-keywords.

## Auth / keys
No central paid key for the tool itself. Depending on which data sources you enable, you may supply your own Google Search Console OAuth (for GSC-backed data) and/or keys for any third-party SERP/keyword provider you connect. Load those credentials through supported configuration at a verified absolute path in the PRIVATE versioned runtime. Keep values out of public source, commands that echo them and transcripts. A public clone's ignored env/config file does not establish private storage.

## Usage, call examples
Source and dependency preparation only:
```bash
git clone https://github.com/every-app/open-seo
cd open-seo
pnpm install
```
Launch through the verified private runtime adapter only after the storage checks above pass. Then discover the active MCP schema and run the selected keyword lookup, SERP fetch or audit. Prefer the MCP path for structured results. Exact runtime redirects and MCP operation names remain unverified here; source installation alone does not establish runtime readiness.

## General experience & gotchas (踩坑)
> Not yet exercised in a live market-intel run, notes are from the repo + topic metadata, gh-api verified 2026-07-15; harden with a `live-runs.jsonl` entry after first real use (R4).
- **Data quality depends on your sources:** it is a *tool* over data providers, not a proprietary index like Ahrefs. Backlink/keyword depth is only as good as the sources you connect; do not expect Ahrefs-grade coverage out of the box.
- **GSC MCP first:** for your own site's real metrics, the free GSC MCP is more authoritative, use open-seo for the external/competitive layer, not to replace first-party data.
- **Self-host effort:** unlike a hosted SaaS, you run and maintain it; budget setup time and keep it updated (pushed frequently, so pin a version).
- **MCP is the agent path:** the UI is for humans; wire the MCP so Claude gets structured results rather than parsing a dashboard.

## Failure signals & fallback
Failure looks like empty/low-confidence keyword or backlink data (a source not configured), an MCP that will not connect, or a crawl/audit that times out on a large site. **Fallbacks: (1)** verify the underlying data source keys are set; **(2)** for first-party data, fall back to the free **GSC MCP**; **(3)** for vendor-grade external data at scale, step up to paid **DataForSEO** (①).

## Last verified: 2026-07 (re-checked 2026-07-22: star count refreshed 4.3k→6.8k, still active)

# Tool: aso-skills

- **Domain(s):** ready-skills (mobile App Store Optimization)
- **Barrier route:** 1 official API · **Source tier:** free OSS (backing API: appeeky.com) · **Ready MCP:** no (Claude Code agent skills, not an MCP)
- **Top pick for its domain:** yes, the canonical ASO-on-Claude-Code pack

## What it does / when to pick it
40+ ready-made Claude Code agent skills for App Store Optimization across iOS App Store and Google Play, keyword research, metadata generation, competitor analysis, paywall analysis, preview-video audit, attribution, and a built-in `aso-router` that dispatches to the right sub-skill. Backed by appeeky.com's ASO data. **Decision rule:** pick when the work is *mobile app store* optimization (rankings, keywords, listing metadata, paywall/preview teardown for an iOS/Android app). Do **not** pick for general web SEO, that's the seo-keywords domain (DataForSEO / Ahrefs / SerpAPI etc.). Also not for app *install attribution at scale*, use a dedicated MMP (AppsFlyer/Adjust) for production attribution; the `attribution` skill here is analysis-side.

## Install
Install: <TODO: confirm install method>, see https://github.com/Eronred/aso-skills

(Repo is a Claude Code skills pack, typical pattern is clone into `~/.claude/skills/` or use the project's documented installer. Confirm against the README before running.)

## Auth / keys
Free, no key required to install the skills themselves. The skills call appeeky.com's ASO API as their data backend, check the repo README for whether an appeeky account/key is required for live data calls vs. demo/cached responses. MIT-licensed, so no usage restrictions on the skill code itself.

## Usage, call examples
Once installed, invoke via the router or a specific skill:

```
/aso-router "research keywords for a meditation app targeting US iOS"
/aso-router "tear down the paywall for app id 1234567890"
```

Or call a sub-skill directly (e.g. `paywall`, `preview-video`, `attribution`, `referral`, `competitor-analysis`) per the repo's skill list.

## General experience and gotchas (踩坑)
- **Mobile-only scope**, App Store + Google Play. Do not reach for this when the user means "SEO" in the web/Google-search sense; route to seo-keywords domain instead.
- **Data quality is appeeky-bound**, every keyword/ranking/competitor answer is only as fresh and accurate as appeeky.com's backing data. Cross-check critical rankings against App Store Connect / Play Console or a second ASO source (Sensor Tower, data.ai) before acting on them.
- **Active but young**, 1.5k stars / 98 forks and last meaningful commit 2026-05-08 (paywall, preview-video, attribution, referral, aso-router added). Healthy momentum but expect skill surface and prompts to keep shifting; re-pull periodically.
- **Skills, not an MCP**, this is the Claude Code *skills* mechanism, not an MCP server. No JSON-RPC tools, no `mcp__` namespace; it works by being available in the skills list and invoked via the Skill tool / router.
- **Attribution skill ≠ MMP**, useful for analysis and listing-side attribution reasoning, but it does not replace AppsFlyer/Adjust SDK-level install tracking for production.

## Last verified: 2026-06

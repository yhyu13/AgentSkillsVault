# Tool: Anthropic official Marketing plugin

- **Domain(s):** ready-skills (also: none)
- **Barrier route:**, (plugin scaffolding; data barrier handled by the MCPs it connects) · **Source tier:** L1 · **Ready MCP:** no itself, it's an official *plugin* of slash-commands that *connects* third-party MCPs
- **Cost:** free plugin; no pricing shown on the page (price unverified 2026-06, confirm at https://claude.com/plugins/marketing). The connected integrations (HubSpot/Ahrefs/Klaviyo) carry their own subscription costs.
- **Repo / Provider:** https://claude.com/plugins/marketing (Anthropic-verified plugin, not a GitHub repo)
- **Top pick for its domain:** no (official + clean, but the community bundles ship far more skills)

## What it does / when to pick it
Official Anthropic marketing plugin: a tight set of slash-commands, `/draft-content`, `/campaign-plan`, `/brand-review`, `/competitive-brief`, `/performance-report`, `/seo-audit`, `/email-sequence` (verified on the plugin page 2026-06), that orchestrate content, campaign, and analysis work and can connect Slack, Canva, Figma, HubSpot, Amplitude, Ahrefs, Klaviyo. **Decision rule:** prefer this when the user wants a *first-party, low-surface, verified* plugin (governance/trust matters, or they already use HubSpot/Ahrefs/Klaviyo). Reach for `coreyhaines31/marketingskills` instead when you want breadth (~40 skills vs ~7 commands).

## Install
Installed from the Claude plugin marketplace / Cowork (per the plugin page), **not** an MCP add and **not** `npx skills add`. There is no clone URL; it's a managed plugin. L0 mechanics (plugin vs MCP, restart-to-activate): `reference/install-guide.md`. Exact route lives in shard `reference/domains/ready-skills.md`.

## Auth / keys
The plugin itself needs no key. Its **integrations** (HubSpot, Ahrefs, Klaviyo, Amplitude, Slack, Canva, Figma) each authenticate via their own OAuth/connector, that's where keys live. **Secret hygiene (one line):** authorize each connector through its own OAuth flow, never paste a connector key into the transcript; see `reference/install-guide.md`.

## Usage, call examples
Slash-command driven: `/competitive-brief <competitor>`, `/seo-audit <site>`, `/campaign-plan <objective>`, `/email-sequence <product>`. Minimal flow: install plugin → connect the integrations you have (e.g. Ahrefs for `/seo-audit` to be data-backed) → run a command. Without a connected data source, commands still run but produce *ungrounded* drafts.

## General experience & gotchas (踩坑)
- **Commands without connectors = ungrounded output.** `/seo-audit` is only data-real if Ahrefs is connected; `/performance-report` needs HubSpot/Amplitude/Klaviyo. The plugin is the orchestration shell, same shard lesson: *the work moved to MCP/connector wiring + auth*.
- **Fewer commands than the community bundles** (~7 vs ~40 in `marketingskills`). Choose it for first-party trust + the specific HubSpot/Ahrefs/Klaviyo wiring, not for breadth.
- **Pricing not stated on the plugin page**, do not assert a number; the *plugin* appears free, but the integrations it connects (Ahrefs, HubSpot, Klaviyo) are paid SaaS. Confirm at the page before quoting cost.
- Availability is via Cowork/marketplace; verify it's actually installable in the user's Claude surface before promising commands.

## Failure signals & fallback
Failure looks like: a command produces generic text (no connector wired), or the plugin isn't available in the user's surface. **Fallbacks:** broader skill coverage → `coreyhaines31/marketingskills`; pure SEO depth → `claude-seo`; packaged research pipeline → `ishwarjha/claude-marketing-research-skill`. For the underlying data, wire the matching domain MCP (SEO → `ahrefs-mcp`/`gsc-mcp`; CRM → `hubspot-mcp`).

## Last verified: 2026-06

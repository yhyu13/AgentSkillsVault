# Tool: Smartlead MCP (LeadMagic)

- **Domain(s):** leadgen-crm (also: none)
- **Barrier route:** ① official API · **Source tier:** L2 · **Ready MCP:** yes, npm `smartlead-mcp-server` (latest 1.2.1, 2025-04) ⚠ verify before relying (see below)
- **Cost:** needs a Smartlead subscription, cheapest **Base $39/mo** (2k contacts / 6k sends), free trial no card; annual saves ~17% [https://www.smartlead.ai/pricing, fetched 2026-06]
- **Repo / Provider:** https://www.smartlead.ai (provider; the MCP is the `smartlead-mcp-server` npm package) ⚠ repo archived 2025-07, UNVERIFIED that the package still tracks current API
- **Top pick for its domain:** no (it's the *outreach/send* slot in the combo, not the default entry)

## What it does / when to pick it
Cold-email **outreach engine**: 113+ tools for campaigns, sequences, mailbox warmup, and
deliverability. **Decision rule:** pick Smartlead as the *send/sequence* hop, after Apollo ① has
found+enriched and Hunter/ZeroBounce ① has verified, Smartlead is where you actually run the outbound
campaign. It is not where you *find* leads. The shard's minimum combo is **Apollo → Hunter/ZeroBounce
→ Smartlead → CRM MCP**; Smartlead owns the third slot.

## Install
Stdio MCP via npm `smartlead-mcp-server` (latest 1.2.1, 2025-04), supply your Smartlead API key as
env. ⚠ **The repo was archived 2025-07** and the older "smartlead-mcp-by-leadmagic" install hint was
unreliable, **verify the package name + that it tracks the current Smartlead API before depending on
it** (shard note). Prefer stdio only if no HTTP option; on Windows stdio is flaky. Volatile line:
`reference/volatile/pricing-install.md` → leadgen-crm. L0 mechanics: `reference/install-guide.md`.
Restart / `/mcp` reconnect after adding.

## Auth / keys
Smartlead API key from your Smartlead dashboard (paid plan). **Key-bearing → secret hygiene:** user
supplies the key via `-e KEY=$VAR`; never echo it, never `browser_snapshot` the key page, edit
`~/.claude.json` from the clipboard, not `claude mcp add` (it echoes the key). See
`reference/install-guide.md` (Secret-handling hygiene).

## Usage, call examples
MCP tools cover campaigns/sequences/leads/analytics: create a campaign, add leads to a sequence, check
warmup/deliverability status, pull reply analytics. Minimal: create a campaign, push a verified lead
list into it, start the sequence, but **verify emails first** (ZeroBounce/Hunter) so you don't burn
sender reputation.

## General experience & gotchas (踩坑)
- ⚠ **Archived repo (2025-07):** the MCP wrapper may drift from Smartlead's live API, confirm it
  connects and the tool you need works before building on it (shard, repeated).
- **Deliverability is the whole game:** never send to unverified lists, pair with ZeroBounce/Hunter
  upstream or you torch domain reputation and land in spam (the reason the combo verifies *before*
  Smartlead).
- It's the most "dangerous" leadgen tool by side effect: it **sends real email**. Test with a tiny
  batch and your own warmup mailboxes before any volume send.
- Cold outreach has legal exposure (CAN-SPAM / GDPR consent), honor opt-out and delete-requests
  (shard compliance red line).
- 113+ tools can flood the tool list, pin/scope to the few you use (campaign, sequence, analytics).

## Failure signals & fallback
Failure looks like: MCP fails to connect (archived-package drift), 401/invalid-key, or sends bouncing
(unverified list / cold domain). **Fallbacks:** for the send layer there's no strong free sibling in
the matrix, if Smartlead's MCP is broken, drive the **Smartlead REST API** directly, or step back to
manual sequencing. Upstream verify fallback: **ZeroBounce** ① / **Hunter** ①.

## Last verified: 2026-06

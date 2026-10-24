# Tool: People Data Labs

- **Domain(s):** leadgen-crm (also: none)
- **Barrier route:** ① · **Source tier:** L2 · **Ready MCP:** no, dev API-first, self-wrap (REST)
- **Cost:** ~$0.01/record (cheapest at volume) + free trial credits; exact per-match price & trial size unverified 2026-06, confirm at https://www.peopledatalabs.com/pricing
- **Repo / Provider:** https://www.peopledatalabs.com
- **Top pick for its domain:** no

## What it does / when to pick it
PDL is a raw **person/company enrichment API**, give it an identifier (email, name+company, LinkedIn
URL) and it returns a normalized record (title, work history, location, socials). **Decision rule:**
pick PDL when you need *volume* enrichment cheaply (~$0.01/record beats Apollo/ZoomInfo per-unit) AND
you're willing to self-wrap (no ready MCP). For interactive, low-volume find+enrich, Apollo is faster
to stand up. PDL is the "I have 50k rows to enrich and a script" choice, not the ad-hoc lookup choice.

## Install
**No MCP**, it's a REST API you wrap yourself. Get a key, call the Person Enrichment / Search
endpoints from a small script (Python SDK `pip install peopledatalabs`, or raw HTTPS). There is no
`claude mcp add` step; this is the route-① "self-wrap" pattern. L0 mechanics (key hygiene, where the
key lives) still apply, see `reference/install-guide.md`; domain context in
`reference/volatile/pricing-install.md#leadgen-crm`.

## Auth / keys
Free API key from the PDL dashboard (free trial credits to evaluate). Since you wrap it yourself, keep
the key in an env var (`PDL_API_KEY`) the **user** sets, never paste it into the transcript. **Secret
hygiene:** never `browser_snapshot` the key page; clipboard-copy, verify by length only
(`reference/install-guide.md`).

## Usage, call examples
REST: `POST https://api.peopledatalabs.com/v5/person/enrich` with `{name, company}` or
`{profile: "linkedin.com/in/..."}` → returns a record + a `likelihood` (0 to 10) match-confidence score.
Minimal: enrich a list of emails, keep only rows with `likelihood >= 6`.

## General experience & gotchas (踩坑)
- **You pay per record returned, and the `likelihood` score is the cost lever**, set a minimum
  match-confidence threshold or you'll buy low-quality matches. Don't bill records you'll discard.
- No MCP means no plug-and-play; budget time to write + test the wrapper before relying on it mid-run
  (the shard marks it "self-wrap (no MCP)" / "dev API-first").
- Bulk/Search endpoints are the cheap-at-volume win, but Search counts against credits differently than
  single Enrich, read the pricing meter before a large batch.
- PII at volume, GDPR/CCPA delete-request handling is non-optional (shard compliance red line).

## Failure signals & fallback
401 (bad key) or a 200 with low/empty `likelihood` = no confident match. For interactive work or when
you don't want to build a wrapper, fall back to **Apollo.io** (ready connector, free tier) or **Hunter**
for email-only. For local-business leads, the free ④ **gosom/google-maps-scraper** route.

## Last verified: 2026-06

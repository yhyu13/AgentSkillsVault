# Tool: omkarcloud/google-maps-scraper

- **Domain(s):** leadgen-crm (also: browser-automation)
- **Barrier route:** ④ · **Source tier:** L4 · **Ready MCP:** no (desktop GUI app + optional REST API; no MCP)
- **Cost:** free (200 searches/month, lifetime; each search returns 1000s of rows). REST-API tier also 200/mo free. [github.com/omkarcloud/google-maps-scraper, fetched 2026-06]
- **Repo / Provider:** github.com/omkarcloud/google-maps-scraper, `omkarcloud/google-maps-scraper (3.6k★, gh-api 2026-10-10)`, MIT, active (pushed 2026-09-21)
- **Top pick for its domain:** no (the ④ default is **gosom/google-maps-scraper**, lower-friction headless; pick omkarcloud when you need its 50+ fields / built-in email+social enrichment)

## What it does / when to pick it
Extracts Google Maps Business Profiles (local B2B leads) with **50+ fields** including emails, social
profiles, and decision-maker contacts, enrichment is built in, so it goes further than gosom's
name/phone/site/email. Built on the author's Botasaurus anti-detect browser. **Decision rule:** for
plain local-business leads default to **gosom/google-maps-scraper** (route ④, headless, scriptable,
lower risk). Reach for omkarcloud only when you specifically want its richer field set / one-step
email+socials enrichment and a click-to-run GUI is acceptable.

## Install
Not a pip library anymore, it ships as a **desktop GUI app**. Download the platform build (Win `.exe`,
Mac `.dmg`, Ubuntu `.deb`, Fedora `.rpm`) from the upstream release source. Verify the
release provenance and available integrity/signature evidence before launching it.
Requires Google Chrome installed. An unknown-publisher warning is not proof of safety;
do not bypass it or add firewall permissions merely because this card names the app.
Confirm any permission is necessary for the intended operation. Headless/automation users can evaluate the separate REST
**Google Maps Extractor API** (omkar.cloud/tools/google-maps-extractor-api, 200/mo free) instead of the
GUI. See `reference/volatile/pricing-install.md` → leadgen-crm and `reference/install-guide.md` (L0
route-④ mechanics). No MCP, so nothing to add to `~/.claude.json`.

## Auth / keys
No login or API key for the GUI app (Google session handled by the bundled browser). The REST API tier
issues its own key from omkar.cloud, only that path is key-bearing.

## Usage, call examples
GUI: enter a keyword + location (e.g. "dentists in Austin"), Run, export CSV (name, phone, website,
email, socials, …). REST API path (if used): POST a search task to the omkar.cloud endpoint with your
key, poll for the CSV/JSON result. There is no MCP tool surface, drive it as an external app/REST call
and read the exported CSV into the research. Verify that browser state, logs and exports
can be directed to PRIVATE versioned DATA before a real collection run.

## General experience & gotchas (踩坑)
- **Far lower legal/ban risk than LinkedIn scraping** (shard compliance red line), Google Maps public
  business data, not personal-profile cookie scraping. Still apply GDPR/CCPA delete-request handling to
  any captured personal email.
- **200 searches/month free cap**, each search yields many rows, so the cap is generous, but it is a
  monthly ceiling, not a one-time grant. Plan batches.
- **Email/decision-maker enrichment is best-effort**, many rows come back with blank email; treat the
  enrichment fields as bonus, not guaranteed, and verify hits with Hunter/ZeroBounce before outreach.
- **GUI-first is awkward for agent automation**, the desktop app is click-driven; for any scripted/
  repeatable run use the REST API or fall back to gosom (headless by design).
- The Botasaurus engine name does not establish the provenance or safety of a downloaded desktop build.

## Failure signals & fallback
Fail signals: app blocked by SmartScreen/Firewall and never launches; runs return 0 rows or all-blank
emails; you hit the 200/mo cap. **Fallback:** **gosom/google-maps-scraper** (route ④, same domain,
headless, the shard default) for the leads themselves, then **Hunter.io** / **ZeroBounce** MCP to
find/verify the emails. For company intel at scale, **Bright Data** (free 5k/mo) absorbs the scraping
risk.

## Last verified: 2026-06

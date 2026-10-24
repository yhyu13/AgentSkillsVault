# Tool: gosom/google-maps-scraper

- **Domain(s):** leadgen-crm (also: browser-automation)
- **Barrier route:** ④ browser / act-like-human · **Source tier:** L4 · **Ready MCP:** no (Go CLI / self-host, no MCP)
- **Cost:** free (OSS, MIT), proxies are the only hidden cost at scale
- **Repo / Provider:** github.com/gosom/google-maps-scraper, `gosom/google-maps-scraper (5.8k★, gh-api 2026-09)` (MIT; active, last push 2026-08-22, not archived)
- **Top pick for its domain:** yes (the FREE-ROUTE default for local-business B2B leads)

## What it does / when to pick it
Scrapes Google Maps business listings → **name, phone, website, and email** (+ address, category,
ratings). **Decision rule: this is the shard's default free pick for local-business B2B leads**,
reach for it first on the ④ route. The killer point: it is **far lower legal/ban risk than LinkedIn
scraping** (Maps data is public business info, no login session burned). Pick it over joeyism/
linkedin_scraper ④ (25 to 35% ban rate) whenever the leads are local businesses; pick Apollo ① only when
you need person-level enrichment/ICP that Maps can't give.

## Install
Go CLI, `git clone` + `go run`/build, or the prebuilt binary / Docker per the repo. Self-host, no
MCP, drive it from a script. No login required (public data), proxies only matter at scale. Volatile
line: `reference/volatile/pricing-install.md` → leadgen-crm (and browser-automation B2B-leads row).
Prereqs: `reference/install-guide.md`. Route-④ → free software; proxies are the hidden cost.

## Auth / keys
**No account, no key, no login session**, it scrapes public Maps listings. This is exactly why it's
low-risk: nothing of yours gets banned. At volume, rotate proxies to avoid Google rate-limiting the
source IP (the only operational cost). No secret to handle → no key-hygiene step.

## Usage, call examples
CLI: feed search queries (e.g. `"dentists in Austin TX"`) + a results cap → outputs CSV/JSON with
name/phone/website/email per listing. Minimal: one query, small `--depth`, write to CSV, then verify
the emails (ZeroBounce/Hunter) before any outreach.

## General experience & gotchas (踩坑)
- **The shard's explicit free-route default** for local B2B leads, "emails + phones, **far lower risk
  than LinkedIn**." Front-load it before considering LinkedIn scraping at all.
- **Email coverage is partial**, Maps listings often lack email; the scraper derives some from the
  business website, so expect many rows phone/website-only. For email-heavy needs, sibling
  **omkarcloud/google-maps-scraper** ④ pulls 50+ fields incl socials + enrichment.
- Emails it does find are unverified, **always run ZeroBounce/Hunter** ① before sending, or you bounce
  and hurt sender reputation.
- Google rate-limits aggressive scraping, pace requests / rotate proxies at volume; too fast → empty
  results or soft-blocks.
- MIT license (permissive) and active (last push 2026-05), safe to embed.
- Personal-data (a named person's contact) still needs GDPR/CCPA delete-request handling, even though
  it's business data (shard red line).

## Failure signals & fallback
Failure looks like: empty result sets, truncated runs, or soft-block pages = Google rate-limiting →
slow down / rotate proxies. **Fallbacks:** **omkarcloud/google-maps-scraper** ④ (more fields +
enrichment) for the same low-risk Maps route; **Apollo.io** ① for person-level ICP prospecting Maps
can't reach; **Bright Data** ② if you need Maps/company data at defended scale. Avoid escalating to
LinkedIn scraping (joeyism ④), that's the high-risk path the shard steers away from.

## Last verified: 2026-06

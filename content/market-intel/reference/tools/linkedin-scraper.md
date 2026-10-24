# Tool: joeyism/linkedin_scraper

- **Domain(s):** leadgen-crm (also: social-publishing, browser-automation)
- **Barrier route:** ④ browser / act-like-human · **Source tier:** L4 · **Ready MCP:** no (Python lib, no MCP)
- **Cost:** free (OSS), real cost is the LinkedIn account you'll burn + proxies
- **Repo / Provider:** github.com/joeyism/linkedin_scraper, `joeyism/linkedin_scraper (4.2k★, gh-api 2026-06)` (GPL-3.0; active, last push 2026-04, not archived)
- **Top pick for its domain:** no (⚠ highest ban risk, the shard steers you away from it)

## What it does / when to pick it
Selenium-driven scraper that reads LinkedIn through **your logged-in session**, person profiles,
company pages, job listings. **Decision rule: avoid it unless LinkedIn data is truly unavoidable.**
The shard's free-route default for B2B leads is **gosom/google-maps-scraper** ④ (emails + phones, far
lower legal risk), not this. LinkedIn cookie-scraping (joeyism / PhantomBuster class) carries a
**25 to 35% ban rate** (shard compliance red line). If you must pull LinkedIn data, prefer **Bright Data**
② (collects off *their* infra, legally defended) over running this off your own account.

## Install
`pip install linkedin-scraper` + a Selenium-driven Chrome/ChromeDriver. No MCP, call it as a Python
lib from a script. Supply a logged-in LinkedIn session (cookie/credentials). Volatile line:
`reference/volatile/pricing-install.md` → leadgen-crm (and browser-automation row). Prereqs (Chrome,
driver, proxy pool): `reference/install-guide.md`. Route-④ → free software, proxies are the hidden cost.

## Auth / keys
Auth = your **LinkedIn login session** (cookie / credentials in env). Use a **small throwaway account
you can afford to lose**, never your real LinkedIn. The cookie is a secret: user supplies it, never
echo or `browser_snapshot` it (see `reference/install-guide.md` Secret-handling hygiene).

## Usage, call examples
Python lib: `from linkedin_scraper import Person, Company; Person("https://www.linkedin.com/in/...",
driver=driver)` → `.name`, `.experiences`, etc.; `Company(url, driver=driver)`. Minimal: open one
profile, extract name/title/company, then **stop**, small batches only.

## General experience & gotchas (踩坑)
- ⚠ **Highest ban risk in the whole skill** (shard): **25 to 35% ban rate** for LinkedIn cookie-scraping.
  Small batch only, slow pacing, throwaway account.
- **It's a lib, not an MCP**, sibling `stickerdaniel/linkedin-mcp-server` ④ is the ready-MCP version
  (same risk); this one you must script yourself.
- Selenium against LinkedIn breaks often, LinkedIn rotates DOM/anti-bot, and a maintained repo still
  hits intermittent breakage; expect to fix selectors.
- GPL-3.0 license, copyleft; matters if you embed it in distributed software.
- Personal-data workflow → GDPR/CCPA delete-request handling required (shard red line).

## Failure signals & fallback
Failure looks like: CAPTCHA/checkpoint redirects, empty/garbled fields, or sudden 999/403 = flagged →
**stop immediately** (continuing risks a permanent ban). **Fallbacks (preferred order):**
**gosom/google-maps-scraper** ④ for B2B contacts at a fraction of the risk; **Bright Data** ② for
defended LinkedIn/company pulls; **Apollo.io** ① / **Hunter.io** ① for compliant contact enrichment.

## Last verified: 2026-06

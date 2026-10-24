# Tool: cullenwatson/StaffSpy

**Runtime storage status: setup only.** No shipped adapter admits this tool's
complete file output. Do not launch collection, login or persistence until every
child-file write meets the [external-tool storage requirements](../../../../DATA.md#external-tool-storage).
`resolve_directory` alone does not authorize writes; examples below are setup guidance.

- **Domain(s):** leadgen-crm (also: none)
- **Barrier route:** ④ · **Source tier:** L4 · **Ready MCP:** no (Python library; self-host)
- **Cost:** free (open source). Hidden costs: a LinkedIn account (burned at risk) + optional CAPTCHA solver (CapSolver / 2Captcha, paid per solve). [github.com/cullenwatson/StaffSpy, fetched 2026-06]
- **Repo / Provider:** github.com/cullenwatson/StaffSpy, `cullenwatson/StaffSpy (341★, gh-api 2026-10-06)`, WTFPL, not archived but ⚠ last push 2025-06-17 (~15mo stale, LinkedIn DOM/anti-bot changes may have broken it; smoke-test before relying). This metadata recheck does not verify installation or scraping.
- **Top pick for its domain:** no (route-④ default is **gosom/google-maps-scraper**, LinkedIn scraping is the high-ban-rate path the shard tells you to avoid)

## What it does / when to pick it
A Python library that **fetches a company's staff roster from LinkedIn**, given a company + title +
location it returns employees in a Pandas DataFrame with skills, experiences, certifications, schools,
follower/connection counts, and a guessed `potential_email`. Also scrapes individual users by id, post
commenters, and your own connections' contact info. **Decision rule:** only pick StaffSpy when you
specifically need *who works at company X* and no compliant source covers it. For ordinary B2B leads
prefer **Apollo.io** (① find+enrich, no ban risk) or **gosom/google-maps-scraper** (④ low risk). This
is the LinkedIn-cookie route the shard flags at 25 to 35% ban rate.

## Install
```
pip install -U "staffspy[browser]"
```
Or latest from source: `pip install "git+https://github.com/cullenwatson/StaffSpy.git#egg=staffspy[browser]"`.
Python ≥ 3.10. Library only, no MCP server, nothing added to `~/.claude.json`. See
`reference/volatile/pricing-install.md` → leadgen-crm and `reference/install-guide.md` (route-④
self-host mechanics + throwaway-account/proxy note).

## Auth / keys
Needs a **logged-in LinkedIn session**: either pass `username`/`password`, or omit them and a browser
opens for a one-time manual sign-in (cookies saved to `session_file`, lasts ~a week). **Use a
throwaway/burner account, never the user's primary LinkedIn.** Optional `solver_service`
(`SolverType.CAPSOLVER` / `2CAPTCHA`) + `solver_api_key` for CAPTCHA challenges (paid). Secret hygiene:
do not echo the LinkedIn password or solver key into the transcript; have the USER supply them, see
`reference/install-guide.md` (secret-handling).

## Usage and PRIVATE runtime paths
Before any real run, resolve the full consumer checkout and use
`tools/private_inventory.py`'s `resolve_destination(path=...)` for individual
config/output files and `resolve_directory(path=...)` for existing runtime or
browser-profile directories. Pass the final absolute path. Each check resolves the
containing Git worktree, including a repository rooted at the directory itself,
and refuses destinations outside it or inside this checkout. Stop when it fails.
Keep runtime files versioned in that PRIVATE companion. An ignored directory in
this public checkout is not a valid destination. A later real run must repeat the
check; this recipe is not a live destination attestation.

Install the upstream library in the selected environment. Run its caller from a
PRIVATE runtime directory. Pass the absolute verified session path to
`LinkedInAccount(session_file=...)` and the absolute verified report path to
the returned DataFrame's `to_csv(...)`. This redirects the documented session
and CSV outputs. Verify any additional log/cache locations for the installed
version before querying. Keep company/target inputs in PRIVATE config.
Other supported entry points include `scrape_staff`, `scrape_users`,
`scrape_comments`, `scrape_companies` and `scrape_connections`.

## General experience & gotchas (踩坑)
- **⚠ HIGHEST-ban-risk route**, LinkedIn cookie-scraping = 25 to 35% account ban rate (shard compliance
  red line). Burner account only; **small batches** (`max_results` defaults low for a reason, pushing
  toward 1000 invites detection/throttling). The `block=True`/`connect=True` flags are account-altering
  side effects, leave them off unless intended.
- **Repo is ~12 months stale (last push 2025-06)**, LinkedIn changes its DOM and bot defenses often;
  expect possible breakage and verify a 1-row scrape works before any real run.
- **`potential_email` is GUESSED** (e.g. first.last@domain permutations), not verified, always pass
  through **Hunter.io** / **ZeroBounce** before outreach, or you'll bounce and burn sender reputation.
- CAPTCHA walls appear under load → without a configured solver the run silently stalls/returns partial.
- **GDPR/CCPA:** this is personal data of identified individuals, the strictest delete-request /
  lawful-basis obligations apply. The shard says: prefer Google Maps leads or Bright Data when possible.

## Failure signals & fallback
Fail signals: login loop / CAPTCHA wall with no solver; account checkpoint or ban; empty DataFrame or
all-blank fields (DOM drift on the stale code); throttled after a large `max_results`. **Fallback (in
shard order):** **Apollo.io** ① for find+enrich (compliant, no ban) → **gosom/google-maps-scraper** ④
for low-risk local leads → **Bright Data** ② (free 5k/mo, scrapes off their account, legally defended)
for company/people intel without burning your own account.

## Last verified: 2026-06

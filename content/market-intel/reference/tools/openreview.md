# Tool: OpenReview API

- **Domain(s):** frontier-research (also: none)
- **Barrier route:** ① · **Source tier:** L1 · **Ready MCP:** no native MCP, use the `openreview-py` client (`pip install openreview-py`) or the REST API2
- **Cost:** free [https://openreview.net, no pricing; public read; account optional]
- **Repo / Provider:** https://openreview.net (provider; API2 at https://api2.openreview.net)
- **Top pick for its domain:** no

## What it does / when to pick it
Submissions + **reviews + reviewer scores** for ICLR / NeurIPS / ACL-track / etc. **Pick it for the
*pre-publication significance* signal that nothing else gives**: reviewer ratings and accept/reject status
appear here months before citations exist. Use it when the question is "how was this received / is it
getting in," to complement Semantic Scholar (citations come later) and arXiv (no review signal at all).
Niche but high-value, it's the only source of peer-review scores in this domain.

## Install
No MCP. Python client: `pip install openreview-py`, then use `openreview.api.OpenReviewClient`. Or hit REST
directly: `https://api2.openreview.net/notes?...`. Exact line: `reference/volatile/pricing-install.md#frontier-research`.
L0 mechanics (it's a lib, not an MCP, no transport/restart concerns): `reference/install-guide.md`.

## Auth / keys
Public read needs no auth. An OpenReview account (free) is only needed for some venue-restricted content or
write actions; for scouting you almost never need it. Not a key-bearing tool for read use, no secret-hygiene
step. (If you do log in, it's username/password, not an API key.)

## Usage, call examples
- Python: `client = openreview.api.OpenReviewClient(baseurl='https://api2.openreview.net')`
  then `client.get_all_notes(invitation='ICLR.cc/2026/Conference/-/Submission')`.
- Reviews/scores: fetch the submission's reply notes (Official_Review invitations); ratings live in
  `note.content['rating']` / `['confidence']` (shape varies per venue).
- REST: `GET https://api2.openreview.net/notes?invitation=<venue>/-/Submission&limit=50`.

## General experience & gotchas (踩坑)
- **API1 vs API2**: most current venues use **API2** (`api2.openreview.net`); older ones use the legacy
  `api.openreview.net`. Hit the wrong base URL and you get empty results that look like a missing paper.
- **Invitation strings are venue-specific and brittle**, e.g. `ICLR.cc/2026/Conference/-/Submission`.
  They change per year/track; if a query returns nothing, the invitation string is usually wrong, not the API.
- **Content field schema varies per venue**: where the rating lives (`rating`, `recommendation`, a number vs
  a string like "6: marginally above") differs by conference and year. Don't hardcode one shape; inspect first.
- **Double-blind / embargo**: during review, author identities and sometimes scores are hidden; full data
  often appears only after decisions. A "missing review" may just be an active blind period.
- Be polite with pagination (`limit`/`offset`); large venues have thousands of submissions.
- Reviewer scores are a *signal*, not ground truth, borderline scores still get accepted/rejected by ACs.

## Failure signals & fallback
Empty note lists (wrong API version or wrong invitation string), or hidden fields during blind review.
Fallback for significance: **Semantic Scholar** citation velocity (post-publication), **HF Daily Papers** /
**GitHub** adoption for traction. For the canonical accepted version, the venue proceedings or arXiv v-final.
Deep synthesis → `research-lit` skill.

## Last verified: 2026-06

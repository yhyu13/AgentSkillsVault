# Tool: halcy/Mastodon.py

- **Domain(s):** social-publishing (also: none)
- **Barrier route:** ① official API · **Source tier:** L1 · **Ready MCP:** no (Python library, not an MCP, call it from a script)
- **Cost:** open-source client; API access and account approval depend on the chosen instance
- **Repo / Provider:** github.com/halcy/Mastodon.py, `halcy/Mastodon.py (1.0k★, gh-api 2026-06)`; active (pushed 2026-05-28, not archived, MIT)
- **Top pick for its domain:** no (not flagged top_pick); prefer the supported API for Mastodon tasks

## What it does / when to pick it
A mature Python client for the official Mastodon REST API. Register an app on the target instance
and obtain the scopes needed to read timelines, search or stream; authorized publishing can also
include media, polls and content warnings. **Decision rule:** prefer this supported API for
Mastodon tasks, route ①. Instance rules, moderation and rate limits still apply. Reach for a
multi-platform aggregator (Buffer/Blotato/Postiz/Typefully) when you need Mastodon plus other
networks in one call.

## Install
`pip install Mastodon.py` (note the capital M and the `.py`). It is a **library, not an MCP**, no `claude mcp add`; the agent drives it from a Python script. Exact line: `reference/volatile/pricing-install.md → browser-automation` ("Mastodon: `pip install Mastodon.py`"). No transport/restart concerns. L0 mechanics: `reference/install-guide.md`.

## Auth / keys
Register an app on your instance to get client id/secret (`Mastodon.create_app(...)` once, or the
instance's Settings → Development), then obtain a **user access token** through the supported
login or application flow. Tokens are **per-instance**: the token and API base URL must refer to
the same instance. Have the user supply credentials through environment variables or approved
private configuration, without returning them to the agent. Never expose them in transcripts or
public repositories; designated PRIVATE versioned credential backups are allowed. Full procedure
in `reference/install-guide.md`.

## Usage, call examples
```python
import os
from mastodon import Mastodon

m = Mastodon(
    access_token=os.environ["MASTODON_ACCESS_TOKEN"],
    api_base_url=os.environ["MASTODON_API_BASE_URL"],
)
timeline = m.timeline_home()
```

Validate the selected read operation before declaring the integration ready. Keep returned
account data and any enabled caches, logs or exports in PRIVATE versioned storage.
Publishing requires separate explicit authorization, for example
`m.status_post(approved_text)` or `m.media_post(approved_private_image_path)` followed by the
authorized post. Do not publish as an installation check.

## General experience & gotchas (踩坑)
- **Supported API access still has account risk.** Follow instance rules, moderation decisions and rate limits, including restrictions on automated posting.
- **Decentralized = per-instance everything.** `api_base_url` and the token must match the same instance; a token from instance A silently 401s on instance B. Pick the instance the account lives on.
- Each instance sets its **own** rate limits, max toot length (often 500 chars, but some raise it), and media rules, do **not** assume mastodon.social defaults hold elsewhere; read the instance's `/api/v1/instance`.
- Some instances throttle or block automated/bot posting per their rules, respect the instance ToS even though the protocol allows it.
- Use a **user access token**, not app-only creds, for posting; app-only can read public timelines but cannot post as the user.
- A 2026-06-16 observation reported automated signup without a captcha at
  `mastodon.social/auth/sign_up`; this is historical, not current readiness evidence. Check the
  chosen instance's present signup flow, approval requirements and email verification. The user
  supplies account details privately and completes any human-only step.
- **Application creation at `/settings/applications/new`**, requires explicit scope checkboxes (default is none); pick `read` at minimum for research use. After creation, the application page renders **all 3 of `client_key`, `client_secret`, `access_token` as readonly plaintext inputs simultaneously** (no copy-only button). For most research workflows you only need `access_token`; the client pair is for OAuth-app flows. **DOM-leak risk:** reading via `browser_evaluate` pipes all three values into the agent transcript.

## Failure signals & fallback
Failure looks like: 401/`MastodonUnauthorizedError` (token/instance mismatch or revoked), 422 on over-length/over-media toots, or 429 rate-limit from the instance. **Fallbacks:** route Mastodon through a **multi-platform aggregator** (Buffer ① free-tier / Blotato / Postiz / Typefully) when bundling with other networks; for one-offs, the instance web UI. No scraping fallback needed, the API is open.

## Last verified: 2026-06

# Install guide, market-intel sources & MCP servers (Level 0 / overview)

This is the **top of a three-level install system**. Most market-intel sources need a one-time
setup (an MCP server, an API key, or a cloned OSS repo). This file holds the *mechanics that apply
to everything*; the exact per-tool command + price lives one level down.

> ⚠️ Commands and prices rot. This file holds stable **mechanics**; the volatile exact commands live
> in `reference/volatile/pricing-install.md` (time-stamped, verify against the official site before
> running). A newly added MCP only takes effect **after a session restart / `/mcp` reconnect**.

## The three levels, where to look

| level | file | holds |
|---|---|---|
| **L0 overview** (this file) | `reference/install-guide.md` | prerequisites, MCP transport types, the `add` mechanics, secret hygiene, Windows notes, how to verify |
| **L1 per-domain** | `reference/volatile/pricing-install.md` (+ each `domains/<domain>.md` "Install guidance" line) | the exact install command + price for every source, grouped by domain |
| **L2 per-tool** | `reference/tools/<slug>.md` → `## Install` | exact steps + auth + gotchas for one specific tool. Find the slug in `reference/tools/index.md` |
| **L3a ops state, overview** | `reference/companion-config-repo.md` | the recommended pattern + tutorial for managing **your** install state in a per-user private companion repo separate from this public matrix |
| **L3b ops state, formal spec** | `reference/companion-config-spec.md` (version 1) | machine-readable contract: discovery convention, `registry.json` schema, template formats, conformance checklist. What skills + tooling actually consume. |
| **L3c ops state, GitHub hardening** | `reference/companion-config-hardening.md` | Policy-preserving review for a PRIVATE companion: visibility, existing security gates, scoped optional settings, access inventory and synthetic support exports. Review before adding runtime state or credentials. |

Flow: triage the domain → open its shard → for the picked tool, read `tools/<slug>.md` `## Install`
(or the L1 line in `pricing-install.md`) → if it's an MCP, restart/reconnect before using it.

## Prerequisites (install once, reused by everything)

| prereq | why | check |
|---|---|---|
| **Node.js ≥ 18** (`npx`) | most stdio MCPs ship as npm packages | `node -v` |
| **Python ≥ 3.10 + uv** (`uvx`) | `uvx`-launched MCPs + pip-installed scraper libs | `uv --version` |
| **gh CLI** (authenticated) | GitHub-API verification + cloning OSS repos | `gh auth status` |
| **git** | clone self-host OSS repos (route ③④) | `git --version` |
| **playwright MCP** | route ④ default (act-like-human), requires current-session verification | discover and execute the selected read-only operation in the active host |
| **Docker** (optional) | self-host MCPs (crawl4ai, hummingbot, steel-browser…) | `docker --version` |
| **throwaway account + proxy pool** (route ③④ only) | platform scraping at scale; software is free, proxies are the hidden cost | n/a |

## Python install target, ASK FIRST on the first `pip install`

The skill's scraper libs (`ddgs`, `trendspy`, `yt-dlp`, `ccxt`, `praw`, `botasaurus`,
`patchright`, etc., see `scripts/install-libs.sh`) are pure Python and go wherever
`pip` is pointed. Where they land matters: drop them in the user's `base` / system
Python and they pollute every other project; drop them in the wrong project venv and
they vanish next session.

**Before the first `pip install` of this session, ask the user explicitly.** Default
options to offer:

1. **Conda `base` / system Python**, simplest, subagents can just `python -c "import X"`.
   Acceptable when the user explicitly says so. Risk: a future pin (e.g. `requests<2.30`
   from some lib) breaks unrelated envs.
2. **Dedicated env** (`conda create -n market-intel python=3.13` or
   `python -m venv ~/.venvs/market-intel`), clean isolation. Cost: subagents must
   prefix calls with `conda run -n market-intel python ...` or activate the venv first;
   `scripts/install-libs.sh` must reflect that.
3. **Existing project env**, only if the user already has one they want everything in.

Whatever the user picks, **record it** in their companion-config repo (a one-liner in
the runbook is enough) so the next session doesn't have to re-ask. After install,
verify with `python -c "import sys; print(sys.executable)"` to confirm it actually
landed where intended.

Detect the active env before installing:

```bash
python -c "import sys; print(sys.executable, sys.prefix)"
echo "$CONDA_DEFAULT_ENV / $VIRTUAL_ENV"
```

If neither env var is set and `sys.prefix` points at a global Python, you are about
to write to base, pause and confirm with the user.

## Host scope

The Claude CLI/config commands below apply only to Claude. For Codex, use its own
MCP or app settings. In either host, verify the selected operation in the active
session; subprocess listings only diagnose installation. Secret-bearing settings
must never be returned in tool output.

## MCP transport types, which to prefer

> Canonical enum lives in `companion-config-spec.md §3.1` (`transport` field). Five values:
> `stdio` · `http` · `sse` · `rest` · `python-lib`. Below is the operational guidance.

- **HTTP (hosted/remote)**, `claude mcp add --transport http <name> <url>`. **Prefer this on Windows**:
  no local Node/uv process, far fewer flakes. Many providers now ship a hosted MCP URL.
- **stdio (local `npx`/`uvx`)**, launches a local process per call. Works, but **flaky on Windows**
  (path/shell quirks). Use only when there is no HTTP option.
- **sse**, uncommon; mostly older hosted MCPs. Treat like HTTP for hygiene purposes.
- **rest**, *not* an MCP; the credential is exercised by your subagent code via `os.environ`
  loading `secrets/<slug>.env`. No `claude mcp add` step.
- **python-lib**, Python library installed by `scripts/install-libs.sh`. No MCP transport;
  imported directly. Credential (if any) loaded the same way as `rest`.

## Adding an MCP, two ways (and when to use each)

1. **`claude mcp add -s user <name> ...`**, convenient. ⚠️ But it **echoes the full command** (incl.
   any key in `--header`/URL) to stdout → the key lands in the transcript. **Never use this for a
   secret-bearing source.** Fine for no-key sources (HN, CoinGecko, GDELT…).
2. **Direct `~/.claude.json` edit**, for **secret-bearing** MCPs, write `mcpServers.<name>.headers`
   /url straight from the OS clipboard with a tiny no-echo script (see hygiene below). `-s user` scope
   makes a source reusable across projects.

## Secret-handling hygiene, HARD rules (keys leaked 3× in real runs; treat as non-negotiable)

A key must **never enter the transcript** (it can sync to the user's cloud backup). Configuring the
tool yourself is fine, leaking the value is not.

- **NEVER `browser_snapshot` a page that displays a key.** Provider dashboards render the API key in
  **plaintext in the DOM** (confirmed: twitterapi.io rotation page, Bright Data API-keys table).
  Instead, have the user copy the value directly into the selected host's private configuration
  or use an approved no-echo transfer. Clipboard access must stay inside that helper; never run
  a standalone clipboard-read command that returns the value. Return only success or length.
- **For secret-bearing MCPs, do NOT use `claude mcp add`** (it echoes the `--header`/URL with the key).
  Edit `~/.claude.json` directly: a tiny python script reads the clipboard and writes
  `mcpServers.<name>.headers.Authorization` (or token-in-URL), with **no echo**.
- **Use value-free diagnostics when verifying.** Never return raw MCP listings or configuration:
  secret URLs, headers and environment values can appear in several forms. A diagnostic helper
  may return only allowlisted fields for the selected server: name, connection status and
  authentication state. A token-specific masking regex does not establish safe output.
- **Rotation cooldowns**: if a key leaks, rotate it, but check the provider's cooldown (e.g.
  twitterapi.io = once/24h). A truly transcript-clean key = the **user** rotates from their own browser.
- Keys may be plaintext in local host settings. **Never expose them in transcripts, screenshots
  or public repositories.** Designated PRIVATE versioned credential backups are allowed. The
  public skill holds the procedure, not the key; use the selected host's supported secret
  configuration and approved no-echo transfer.
- **Clipboard-capture sanity gates**, when piping a key from clipboard, reject anything outside
  `length ∈ [8, 512]`, anything containing whitespace, or anything matching `^https?://` (someone
  copied a URL by mistake). These cheap checks catch ~all paste-by-mistake errors before the value
  reaches `~/.claude.json`. Reference impl: companion-config-repo's `scripts/capture-key.ps1`.

## Anti-automation patterns to expect during install

Real-world batch registrations across 2026-06 hit these bot defenses. **None can be bypassed
headlessly**; the agent's job is to recognize the pattern fast, stop wasting cycles, and hand
off cleanly to the user with the right URL + clipboard handoff. Recording them here so a
first-time-setup user knows what to expect *before* clicking signup.

| Defense | Where we hit it | What it looks like | Workaround |
|---|---|---|---|
| **PerimeterX / Akamai fingerprint deny** | Webflow `/signup` | "Access to this page has been denied" served on first navigation | User-only signup in a normal browser |
| **Cloudflare Turnstile** | Buffer `/signup` | Submit button hangs in "Signing Up..." waiting for Turnstile token the headless browser never produces | User-only signup |
| **reCAPTCHA + hCaptcha double gate** | Contentful post-Google-OAuth lead-gen form | OAuth completes, but the follow-up form has `g-recaptcha-response` + `h-captcha-response` textareas; submit silently no-ops without both solved | User clears both captchas |
| **hCaptcha on forgot-password** | eBay `/fyp` | DOM has `target-icaptcha-slot` + 2 hcaptcha iframes; "Send Now" stays `disabled` | User solves captcha first |
| **B2B work-email gate** | Attio, Lusha | Rejects `gmail.com`; Attio's Google OAuth callback redirects to `email_is_public=1` error; Lusha's signup placeholder says "Enter your work email" | Skip unless you have a work-domain email |
| **readonly+disabled with active watcher** | Apollo onboarding wizard | Inputs render `readonly disabled`; if JS removes attrs, a watcher reapplies within milliseconds, defeats `playwright.fill`, JS event dispatch, attr removal | User-driven onboarding only |
| **OAuth provider mismatch** | HubSpot CRM signup | Only Microsoft / Apple / email; some matrices say Google but the page doesn't offer it | User chooses Microsoft or email + captcha |
| **Provider-side approval delay** | eBay developer | New developer account shows "Access to your new account is pending approval, which takes at least one business day", not a bot defense, fraud-prevention policy | Wait 1 business day, re-check `/my/keys` |
| **Email-verification email out of reach** | SerpApi, Buffer, Contentful, ZeroBounce, Mastodon | Verification email goes to the signup mailbox (e.g. `user1@example.com`); if the agent's Gmail MCP is bound to a *different* Google account (e.g. user's claude.ai login), agent can't read it | User opens the mailbox, clicks link, then continues |
| **Multi-step React onboarding wizards** | Sanity (8 steps), Apollo, FMP (5 questions) | Radio buttons rendered with `sr-only` (visually hidden) `<input>` under cosmetic labels; sticky header intercepts `playwright.click`; "Next" only enables after React state validates inputs | Click the `label[for=...]`, not the hidden input; use JS `.click()` to bypass sticky-header pointer interception; tolerate that some wizards need real keystrokes |

### DOM-visible plaintext credentials, a transcript-hygiene hazard

Several providers render the secret in **readable plaintext** on the dashboard page (no
masking, no copy-only button):

- **Twelve Data** `/account/api-keys`, key in the page DOM unmasked.
- **FMP** dashboard, key in the page DOM unmasked.
- **Mastodon** `/settings/applications/<id>`, all 3 of `client_key`, `client_secret`,
  `access_token` rendered simultaneously as readonly plaintext inputs.
- **Bluesky** App Password dialog, shows the password ONCE with no copy button; the user must save it locally before closing the dialog; do not return it to the agent.
- **Stack Apps** new-API-key dialog, masks all but last 4 chars in the visible cell, but
  the actual full value is reachable via `navigator.clipboard.writeText` from a hidden
  readonly input, use a browser-side or user-side no-echo transfer; do not return the DOM value.

Do not return DOM credential values from `browser_evaluate`, read them into the
conversation, or print clipboard contents. The same transcript rule applies to
both private storage modes. A private Git backup does not authorize transcript
exposure.

The user can copy the value directly into the selected host's supported secret
configuration. If an approved no-echo transfer helper is used, it must keep the
value inside the browser/OS/configuration process and return only success, length
or a value-free diagnostic. Do not snapshot a key page or request its raw DOM.
If such a transfer is unavailable, have the user complete it locally.

## Troubleshoot a non-Connected MCP

When a selected-server, value-free diagnostic reports `✗ Failed` or `! Needs authentication`,
check these categories in order. The selected operation in the active host remains the readiness
test; a Claude subprocess diagnostic does not establish Codex readiness.

| symptom | likely cause | first move |
|---|---|---|
| `! Needs authentication` | OAuth token expired or never completed | run `/mcp` and re-OAuth the server |
| `✗ Failed` for stdio MCP, immediate exit | `uvx`/`npx` not on PATH, or absolute path wrong | check `uv --version` / `node -v` and executable paths; if a launch probe is needed, keep secret-bearing arguments and captured output inside a private no-echo diagnostic |
| `✗ Failed` for HTTP MCP | Bearer token wrong / rotated / quota exceeded | use a no-echo diagnostic and return only status/auth/content checks |
| `✗ Failed` with env var error | required env var missing from the selected host's configuration | compare required variable names with private configuration through a no-echo helper; verify that required storage directories exist and resolve to PRIVATE versioned destinations |
| `✓ Connected` but actual tool calls fail | provider subscription gate, operation-specific auth or another runtime failure | inspect plan/quota without exposing dashboard secrets, then verify the selected operation's authentication and usable response content in the active host |

If still stuck, inspect only the selected host/server's private diagnostics with a helper that
returns allowlisted error categories. MCP stderr and logs can contain secrets and account data;
do not return raw logs or search matches to the transcript.

## Verify an install

Inspect the selected host's current callable tools. Verify source and operation
identity, execution, authentication and usable response content in that session.
Apply the timestamp and attribution rules in [host-capabilities.md](host-capabilities.md).
A Connected subprocess listing, installed library or keyless service is only a
setup signal. Avoid raw listing/config output that may contain secret URLs or
headers; return value-free diagnostics. A prefix match cannot transfer evidence
between operations or hosts.

## Install by barrier route (①②③④)

| route | what install looks like | cost shape |
|---|---|---|
| **① official API** | get key from provider dashboard → HTTP MCP or REST; provider rules, moderation and rate limits still apply | often paid/quota-limited; many free tiers |
| **② resale API** | provider key → HTTP MCP. Provider absorbs the account/proxy/login-wall barrier | cheap pay-per-use, gray-area |
| **③ self-host scrape** | `git clone` + `pip`/`npm install` → supply your own accounts + proxies | free software; you carry ToS/ban risk |
| **④ browser / act-like-human** | playwright MCP (available only after current-session operation verification) or a per-platform OSS repo → supply a logged-in session/cookies | free; proxies at scale; most platform scraping violates ToS |

**Prefer ④/③ (free) over paid ①/② when equivalent** (CONSTITUTION C2). Reach for paid only for data
the free route can't get (e.g. Keepa price history), scale reliability, or compliance.

## Per-domain install entry points

For the exact command, open the L1 section in `pricing-install.md`, or the L2 `tools/<slug>.md`.

| domain | free-first pick (route) | L1 section |
|---|---|---|
| x-twitter | twscrape ③ / playwright ④ (twitterapi.io ② if you want the provider to absorb upkeep; twikit only after a fresh operation check) | `pricing-install.md#x-twitter` |
| reddit-community | mcp-hn ① (no key) · reddit-research-mcp ① (hosted OAuth, no Reddit credentials to manage) · reddit-mcp-buddy ① (verified app-id/login; recorded anon 403 outage) | `#reddit-community` |
| web-scraping | Tavily/Exa ② + Firecrawl ② + Bright Data ② (free 5k/mo) | `#web-scraping` |
| ecommerce-arbitrage | Discount-Bandit ④ / playwright ④ (Keepa ① for history) | `#ecommerce-arbitrage` |
| finance-markets | SEC EDGAR + FRED ① (free, no/low key) | `#finance-markets` |
| crypto-defi | CoinGecko ① + ccxt + Etherscan/Blockscout ① (free) | `#crypto-defi` |
| seo-keywords | GSC ① (own site) + SearXNG ④ self-host | `#seo-keywords` |
| social-publishing | Buffer ① free-tier / twikit·xiaohongshu ④ · Bluesky/Mastodon official | `#social-publishing` |
| content-cms | static blog ④ (Hugo/Astro) / WordPress·Sanity MCP ① | `#content-cms` |
| leadgen-crm | gosom/google-maps-scraper ④ (low risk) / Apollo ① | `#leadgen-crm` |
| trends-discovery | GDELT ① (no auth) + Product Hunt ① | `#trends-discovery` |
| frontier-research | arXiv + HF Daily Papers ① (free, no key) | `#frontier-research` |
| ready-skills | `npx skills add coreyhaines31/marketingskills` (skill, not MCP) | shard `ready-skills.md` |
| browser-automation | playwright MCP ④ (verify the selected operation in the current session) + browser-use/crawl4ai | `#browser-automation` |

## Windows-specific notes

- Any approved no-echo helper that reads Claude settings must decode `~/.claude.json` as UTF-8;
  non-ASCII paths can fail under a legacy encoding. Never return the raw settings.
- **Prefer HTTP-transport MCPs**; stdio `npx`/`uvx` are flaky (path/shell). If you must use stdio,
  use absolute paths and test in a plain shell first.
- Keep PowerShell clipboard access inside an approved no-echo transfer; do not print its value.
- Discover callable operations in the active host and use selected-server, value-free diagnostics.
  Do not dump raw MCP configuration or listings.

## When an install is missing mid-research (non-blocking protocol)

Never block on install. If a topic clearly depends on a missing source, tell the user the one-line
host-specific setup path (or the `tools/<slug>.md` install); secret values stay in local settings + cost, note that **it won't work until session
restart**, then **proceed with a fallback source and flag the gap** in the report (SKILL.md guardrail
#4, no silent degradation).

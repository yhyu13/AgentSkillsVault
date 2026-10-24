# Companion config repo, formal specification

**Status**: STABLE. Spec version: `1.3`.

> v1.3 (additive, backward-compatible): adds `brokerage` to the `transport` enum (§3.1).
> **Promoted from ROADMAP-reserved to active** by the 2026-06-17 sweep's P2 trigger
> firing: `feedback-bump.py` detected ≥3 distinct domains with `barrier_found` outcome
> in a 90-day window. `brokerage` covers pay-per-query wrappers (Bright Data DaaS,
> datarade marketplace, SerpApi resale, etc.) that absorb the data-acquisition barrier
> the user no longer wants to fight. v1.2 / v1.1 / v1 consumers ignore unknown enum
> values per §3 (forward-compat), no migration needed.
>
> v1.2 (additive, backward-compatible): adds OPTIONAL judgment fields (`mcp_server_name`,
> `deprecation_code`, `ban_risk`, `evidence_url`, `supersedes`, `replacement_for`,
> `model_tier`, `route_agent_native`), these protect the matrix's *judgment* value once
> the upstream MCP registry can supply mechanical metadata. Single-sources the transport
> enum to §3.1 (install-guide now references back). Drops the v1.1 `-mcp` suffix SHOULD
> (replaced by `mcp_server_name` precise match + sync-check fuzzy fallback). Adds
> `deprecated` to the `health_last` enum. v1.1 and v1 consumers ignore unknown fields
> per §3 (forward-compat), so no migration needed.
>
> v1.1 (additive): adds `transport: "rest"` and `transport: "python-lib"` to the
> documented enum; adds OPTIONAL `expires` and `rotate_after` for credential-lifecycle
> tracking.

This is the **formal contract** between the market-intel skill (and sister skills following the
same pattern) and any companion config repo the user maintains. Conforming repos can be
mechanically read by inventory tooling and by an agent that needs configuration
history. Current operation availability follows SKILL.md Step 2 and
`host-capabilities.md`; registry conformance cannot substitute for that evidence.

The companion repo concept + rationale is in [`companion-config-repo.md`](companion-config-repo.md);
this file is the spec. The GitHub-side repo lockdown (visibility, Actions, Apps, Copilot
training opt-out) is in [`companion-config-hardening.md`](companion-config-hardening.md), run
that checklist **before** committing the first secret.

> ⚠️ **Conformance**: Any companion config repo claiming to be "market-intel spec v1" MUST
> satisfy every MUST clause below. Skills consuming such repos SHOULD ignore unknown fields
> (forward compatibility) and SHOULD degrade gracefully when optional fields are absent.

---

## 1. Discovery

Settings, initialization, diagnostics and runtime DATA use the fleet_guards
companion-root resolver through the source adapter, which checks `MARKET_INTEL_DATA_DIR`,
then `MARKET_INTEL_CONFIG`, then the sibling. `MARKET_INTEL_DATA_DIR` must identify
`<companion>/data`.

Without explicit selectors, discovery checks a proven sibling companion only.
There is no home-directory location and no independent XDG fallback. The doctor's `--config-dir` selects one
companion in isolation from inherited selectors. Runtime writers require the
`data/` directory to exist; an absent directory means uninitialized storage.

Catalog browsing remains usable without a companion. A selected path does not
establish PRIVATE storage or readiness: writes require a destination inside the
companion worktree at a declared artifact path, and an empty registry is TEMPLATE_VALID
but NOT READY. Public or unknown publication routes block writes.

---

## 2. Required directory structure

```
<companion-config-repo>/
├── registry.json                              # REQUIRED
├── tools/                                     # REQUIRED (may be empty)
│   └── <slug>/                                # OPTIONAL (zero or more)
│       ├── claude.json.template               # REQUIRED if <slug>/ exists
│       └── env.template                       # REQUIRED if <slug>/ exists
└── secrets/                                   # REQUIRED (storage mode declared in §5.3)
    └── <slug>.env                             # OPTIONAL (only when tool has env vars)
```

All other paths (`scripts/`, `runbooks/`, `.github/`, top-level docs) are CONVENTIONAL but not
part of the spec, they're tooling concerns specific to the user's workflow.

### 2.1 Required files at the repo root

| Path | Status | Purpose |
|---|---|---|
| `registry.json` | REQUIRED | Machine-readable index. See §3. |
| `tools/` | REQUIRED | Directory containing per-tool subdirs. May be empty when no tools installed. |
| `secrets/` | REQUIRED | Private credential directory under the declared storage mode. May be empty. |

### 2.2 Required gitignore patterns

Under Mode B, a conforming repo's `.gitignore` MUST exclude:

```
secrets/*
!secrets/README.md
!secrets/.gitkeep
*.env
!*.env.template
!env.template
claude.json
.claude.json
```

Under Mode B, real `.env` files and live host configuration MUST stay out of git.
Mode A instead versions credentials only in the PRIVATE repository (§5.3).
Additional Mode B ignore patterns (`*.key`, `*_token`, etc.) are RECOMMENDED.

---

## 3. `registry.json` schema

Top-level shape:

```json
{
  "schema_version": 1,            // REQUIRED — integer, this spec is version 1
  "generated": "YYYY-MM-DD",      // OPTIONAL — informational, free-text date
  "machine": "string",            // OPTIONAL — informational, free-text host/profile id
  "comment": "string",            // OPTIONAL — informational
  "summary": { ... },             // OPTIONAL — informational (see §3.2)
  "tools": [ ... ]                // REQUIRED — array of tool entries (see §3.1)
}
```

Skills MUST:
- Check `schema_version` and refuse to consume unknown major versions.
- Tolerate any number of unknown top-level fields (forward compatibility).

Skills SHOULD:
- Use `tools[]` as the primary source; `summary` is for humans.

### 3.1 Per-tool entry schema (`tools[]`)

```json
{
  "slug": "string",               // REQUIRED — kebab-case identifier; MUST match tools/<slug>/ dir
  "installed": true,              // REQUIRED — boolean; true if this tool is currently in use
  "matrix_slug": "string | null", // OPTIONAL — slug in the public matrix (market-intel by default)
                                  //            null if this tool isn't in any matrix yet
  "matrix_origin": "string",      // OPTIONAL — name of the matrix when not market-intel
                                  //            (e.g. "shopping-aggregator" for biggo-mcp)
  "domain": "string",             // OPTIONAL — fast-path routing hint (e.g. "finance-markets")
  "tier": "string",               // OPTIONAL — short summary: "free" | "freemium" | "paid"
  "transport": "string",          // OPTIONAL — "stdio" | "http" | "sse" | "rest" | "python-lib"
                                  //            | "brokerage"
                                  //            "rest"        = REST-only credential (no MCP server;
                                  //                            empty mcpServers template per §4.1;
                                  //                            loaded via os.environ in subagent code).
                                  //            "python-lib"  = installable Python library that
                                  //                            uses creds from secrets/<slug>.env
                                  //                            via its own auth (e.g. atproto,
                                  //                            Mastodon.py). Listed by
                                  //                            scripts/install-libs.sh.
                                  //            "brokerage"   = pay-per-query wrapper that
                                  //                            absorbs the upstream data-
                                  //                            acquisition barrier (Bright Data
                                  //                            DaaS, datarade marketplace,
                                  //                            SerpApi resale). v1.3-active —
                                  //                            promoted from ROADMAP-reserved
                                  //                            by the 2026-06-17 P2 trigger.
  "health_last": "string",        // OPTIONAL — "connected" | "needs_auth" | "failed" | "unknown" |
                                  //            "credential_ready" | "verified" | "installed" |
                                  //            "deprecated"
                                  //            (credential_ready: secret captured but not exercised;
                                  //             verified: historical verification; scope and
                                  //             evidence must be recorded separately. An import
                                  //             proves only library availability;
                                  //             installed: python-lib pip-installed locally;
                                  //             deprecated: upstream matrix tombstoned this tool,
                                  //             see `deprecation_code`)
  "health_checked": "ISO8601",    // OPTIONAL — when the historical observation was made
  "expires": "string",            // OPTIONAL — "never" or "YYYY-MM-DD (reason)" — platform-
                                  //            enforced expiration of the credential.
  "rotate_after": "string",       // OPTIONAL — "YYYY-MM-DD (reason)" or "annual" — voluntary
                                  //            rotation deadline distinct from `expires`
                                  //            (e.g. transcript-leak rotation, shared-password
                                  //            hygiene). Tooling SHOULD warn when rotate_after
                                  //            is reached even if expires says "never".

  // ---- v1.2 judgment fields (all OPTIONAL) -------------------------------
  "mcp_server_name": "string",    // OPTIONAL — exact `mcpServers.<key>` in ~/.claude.json when
                                  //            this entry maps to a live MCP. Lets sync-check
                                  //            do precise match instead of fuzzy stripping.
                                  //            Omit for non-MCP transports (rest, python-lib).
  "deprecation_code": "string",   // OPTIONAL — when health_last="deprecated", one of:
                                  //            "D-404" (provider gone),
                                  //            "D-PRICE" (was free, now paid),
                                  //            "D-STALE" (unmaintained, may still work),
                                  //            "D-TOS" (ToS forbids; legal risk),
                                  //            "D-SUPERSEDED" (replaced by another tool; use
                                  //                            `replacement_for` to name it).
  "ban_risk": "string",           // OPTIONAL — "low" | "medium" | "high" — IP/account ban
                                  //            likelihood when using this tool against its
                                  //            target. Mainly for route ③/④ scraping tools.
  "evidence_url": "string",       // OPTIONAL — URL backing the claim in `notes` (GitHub release,
                                  //            pricing page, etc). Used by sweep audits to
                                  //            re-verify; missing = "you're trusting the notes".
  "supersedes": "string",         // OPTIONAL — slug this entry replaces (used after rename).
  "replacement_for": "string",    // OPTIONAL — when health_last="deprecated" with
                                  //            deprecation_code="D-SUPERSEDED", the recommended
                                  //            replacement slug.
  "model_tier": "string",         // OPTIONAL — "local-ok" | "frontier-required" — what model
                                  //            class is sufficient to operate this tool well.
                                  //            local-ok: triage/dedup/citation-recheck-grade
                                  //            tools that don't need frontier reasoning.
  "route_agent_native": "boolean",// OPTIONAL — true if this entry represents a route-⑤
                                  //            agent-native browser tool (Computer Use /
                                  //            Operator / Skyvern / browser-use). Orthogonal
                                  //            to route ④ (playwright-style) — flagged so
                                  //            cadence/cost compares can be A/B-split.
  // -----------------------------------------------------------------------

  "notes": "string"               // OPTIONAL — free text
}
```

**MUST**: `slug` and `installed` are the only strictly required fields. Everything else is
OPTIONAL but RECOMMENDED.

**MUST (2026-06-17, on new entries only)**: any entry added after spec v1.3 MUST also include
`evidence_url`, `ban_risk`, and `model_tier` (the v1.2 judgment fields). The matrix's irreplaceable
value once MCP registry matures is its judgment metadata, leaving these blank on new entries is
spec rot (debt fork audit). Existing v1.0/v1.1/v1.2 entries do NOT need backfill: P3 (monotonic
evolution) prefers not spending tokens rewriting historical entries when only forward-going
discipline is needed.

**MUST**: `slug` MUST be valid as a filesystem directory name on all major OSes (no `/`, `\`,
`:`, `?`, `*`, `"`, `<`, `>`, `|`, no leading dot, no trailing whitespace). Convention:
kebab-case ASCII.

**MUST**: `matrix_slug` (when present and non-null) MUST exactly match a `reference/tools/<slug>.md`
in the corresponding public matrix repo. This is how skill detection reverse-looks up
tier/domain info from the matrix.

**SHOULD**: The companion repo's `slug` MAY follow the matrix slug verbatim (including any
`-mcp`/`-io` suffix), but the **live MCP server key** in `~/.claude.json` (often the suffix-less
form, e.g. `fred` rather than `fred-mcp`) MUST be recorded in `mcp_server_name` when applicable.
sync-check uses `mcp_server_name` as the precise match against `~/.claude.json` and falls back
to fuzzy suffix stripping (`-mcp/-io/-py/-server`) only when `mcp_server_name` is absent.

**SHOULD (2026-06-17, naming rule for `tools/<slug>.md`)**: the matrix-side slug is the **pure
tool name** (kebab-case, no owner prefix) when it is unambiguous. Owner prefix is added ONLY
when a same-name tool already exists from a different owner (e.g. `discord-mcp.md` already exists
for elyxlz's version → SaseQ's version must be filed as `saseq-discord-mcp.md`). One-off OSS
catalog forks like `sickn33/antigravity-awesome-skills` get the pure tool name
(`antigravity-awesome-skills.md`) since "antigravity" is already a unique brand. Examples:
- `arctic_shift.md` not `arthurheitmann-arctic-shift.md` (unique brand)
- `saseq-discord-mcp.md` (owner needed, `discord-mcp.md` already taken)
- `antigravity-awesome-skills.md` not `sickn33-antigravity-awesome-skills.md` (unique brand)

### 3.2 `summary` shape (optional)

When `summary` is present, it MUST follow this shape:

```json
{
  "config_tools_total": <int>,
  "config_tools_with_keys": <int>,
  "config_tools_key_free": <int>,
  "comment": "string"
}
```

`summary` counts MUST be scoped to **this companion repo's tracked tools only**, NOT
session-wide MCP counts (which would conflate with plugin-managed and claude.ai-managed MCPs).

---

## 4. Per-tool directory: `tools/<slug>/`

When `tools/<slug>/` exists, it MUST contain at minimum:

| File | Status | Purpose |
|---|---|---|
| `claude.json.template` | REQUIRED | MCP configuration, or an empty `mcpServers` map for a non-MCP transport. See §4.1. |
| `env.template` | REQUIRED | KEY=VALUE skeleton documenting required env vars. See §4.2. |
| `README.md` | RECOMMENDED | Human-readable doc with tier, register URL, rotation history. Free-form. |
| `manifest.json` | OPTIONAL (future) | Structured per-tool metadata. Spec reserved for v2; not yet defined. |

### 4.1 `claude.json.template` format

A standalone JSON document containing an `mcpServers` partial. Two valid shapes:

**Shape A (preferred): top-level `mcpServers` wrapper.**
```json
{
  "mcpServers": {
    "<server-name>": {
      "type": "stdio",
      "command": "uvx",
      "args": ["<pypi-package>"],
      "env": {
        "<UPPER_SNAKE_NAME>": "<UPPER_SNAKE_NAME>"   // placeholder, see below
      }
    }
  }
}
```

**Shape B (compact): top-level keys are MCP server names.**
```json
{
  "<server-name>": { "type": "stdio", "command": "uvx", "args": ["..."] }
}
```

Skills implementing apply-like behavior MUST accept both shapes; tooling SHOULD emit Shape A.
For `rest`, `python-lib` and any `brokerage` entry without an MCP endpoint, the required template
uses Shape A with an empty `mcpServers` object. It declares that there is no server to activate.
Apply tooling MUST skip MCP creation for these entries; their actual API/library operation
needs separate verification. Verify that the selected companion implements this behavior
before applying it; otherwise retain a setup gap. The bundled configuration doctor does not
validate per-tool templates or prove apply support.

**Placeholder syntax**: a token of the form `<NAME>` where `NAME` matches `[A-Z][A-Z0-9_]*`
(UPPER_SNAKE_CASE) is a placeholder for substitution from `secrets/<slug>.env`. A placeholder
MUST resolve to a value at apply time; if any placeholder is missing its value, apply MUST
fail loudly and refuse to write the resulting JSON.

**Transport-specific shapes:**

| transport | required keys | example |
|---|---|---|
| stdio | `type: "stdio"`, `command`, `args[]`, optional `env` | `{"type":"stdio","command":"uvx","args":["mcp-hn"]}` |
| http | `type: "http"`, `url`, optional `headers` | `{"type":"http","url":"https://mcp.apify.com","headers":{"Authorization":"Bearer <APIFY_API_TOKEN>"}}` |
| sse | `type: "sse"`, `url` | `{"type":"sse","url":"https://mcp.api.coingecko.com/sse"}` |
| http (token-in-URL) | `type: "http"`, `url` (with `<TOKEN>` placeholder in querystring) | `{"type":"http","url":"https://mcp.brightdata.com/mcp?token=<BRIGHTDATA_TOKEN>"}` |

### 4.2 `env.template` format

Plain `KEY=VALUE` lines, one per env var the tool needs. Values MUST be empty (the template
documents the variable names; real values go in `secrets/<slug>.env`).

```bash
# <tool name> — register at <provider URL>
# Brief notes about each variable, optional

REQUIRED_VAR_1=
REQUIRED_VAR_2=
```

**MUST**: UTF-8 **without BOM**. PowerShell 5's `Set-Content -Encoding UTF8` writes BOM and
breaks parsers; tooling that writes env files MUST use BOM-less UTF-8.

**MUST**: keys use UPPER_SNAKE_CASE. Keys substituted into MCP configuration MUST
match the placeholder names in `claude.json.template`. Non-MCP entries MAY document
transport-specific env keys even though their empty `mcpServers` template has no
placeholders; verify how the selected API/library consumer loads those keys.

For tools with no env vars, `env.template` SHOULD still exist as a one-line marker:

```bash
# <slug> — no env vars required (free, no key)
```

### 4.3 `README.md` format (recommended)

Free-form markdown. RECOMMENDED sections (skills may scan for these but MUST handle their
absence):

- `## What it provides`, 2-5 bullets on capabilities.
- `## Tier`, pricing tier + rate limits.
- `## Register`, provider's signup URL.
- `## Reinstall on a new machine`, typically just `python3 scripts/apply.py --tool <slug>`.

Per-account identifying info (email, username, phone, account IDs) MUST NOT appear in this
README; that information belongs in the companion's private credential storage under
the selected Mode A or Mode B policy: `secrets/_account-info.env`, or vault records when
Mode B uses a vault projection (see §5.1 and §5.3).

---

## 5. `secrets/` directory

### 5.1 File naming

| File | Status | Purpose |
|---|---|---|
| `secrets/<slug>.env` | OPTIONAL per slug | Real env values for `tools/<slug>/`; versioned in Mode A, gitignored in Mode B. |
| `secrets/_account-info.env` | OPTIONAL | Cross-service metadata (default email/username/auth-method preference, per-service registration log). Leading underscore = "not-a-tool". Under a vault projection this metadata stays in vault records and no `_`-prefixed file is projected. |
| `secrets/README.md` | RECOMMENDED | Human-readable note explaining the directory. |
| `secrets/.gitkeep` | RECOMMENDED | Ensures the dir exists after fresh clone. |

### 5.2 File format

UTF-8 **without BOM**. Plain `KEY=VALUE` lines. Values:
- MAY contain any characters except newline (use `\n` if needed, though tooling typically
  doesn't support that).
- SHOULD NOT be quoted (consumers expecting plain bash `.env` semantics).
- MAY use forward slashes for filesystem paths on Windows (avoid backslash JSON escape
  issues when values are substituted into `claude.json.template`).

### 5.3 Storage modes (Mode A vs Mode B)

The spec recognizes **two valid storage modes**. Either is conformant; pick based on
threat model.

#### Mode A, committed to the (private) repo

- `secrets/*.env` is **committed** alongside templates.
- **Pros**: single source of truth; `git clone` + `apply.py` is the full new-machine
  bootstrap; git history is the backup.
- **Cons**: GitHub data-breach / OAuth-token compromise / accidental-public-flip / forking
  by a collaborator all expose the keys. GitHub Secret Scanning Partnership scans private
  repos too, partner providers (OpenAI `sk-`, Anthropic `sk-ant-`, AWS `AKIA`, Stripe
  `sk_live_`, GitHub `ghp_`, Slack `xox`, etc.) are notified on detection and may
  **auto-revoke** the key.
- **When appropriate**: the operator has chosen credential versioning in a verified
  PRIVATE repository and its supported tooling follows that policy. Check current
  provider and Git-host behavior; a token prefix alone does not prove auto-revocation.

#### Mode B, gitignored + out-of-band backup

- `secrets/*.env` is **gitignored**; real values backed up via cloud-storage sync, encrypted
  USB, or a dedicated secret-management tool.
- **Pros**: keys never enter git; no GitHub exposure surface; safe to add collaborators.
- **Cons**: bootstrap is two-step (`git clone` + restore).
- **Vault projection (a Mode B variant)**: the values live in an encrypted credential
  vault kept outside the companion, and each `secrets/<slug>.env` is a generated,
  gitignored plaintext projection of one vault target (a `materialize` step per tool).
  The projection is disposable: regenerate it, never edit, commit or hand-copy it.
  Writers (the companion's key-capture script and `config-bridge.py --register`) store
  the value in the vault and then regenerate the projection; without the vault, its
  key or its tool they fail and write nothing anywhere else. Readers that find a
  projection missing report the regeneration command and must not restore plaintext
  from Git history or another machine. The same Mode B ignore patterns apply.
- **Required `.gitignore` patterns under Mode B**:
  ```
  secrets/*
  !secrets/README.md
  !secrets/.gitkeep
  *.env
  !*.env.template
  !env.template
  claude.json
  .claude.json
  ```

#### Declaring the mode

Declare `Active storage mode: A` or `Active storage mode: B` near the top of
`secrets/README.md`. The bundled doctor reads only this marker; a missing marker, a
missing `secrets/README.md`, or an invalid or conflicting declaration is an error.

The reference companion deployment declares Mode B with a vault projection (since
2026-10-12; it used Mode A from its v0.5.0 until then). Plaintext committed under
Mode A remains in that repository's history; switching modes does not remove it, so a
key exposed there stays exposed until it is rotated at the provider.

The bundled initializer supports Mode B only and refuses Mode A. Its doctor checks
configuration shape and the declared mode's ignore policy; a successful result does not
prove PRIVATE visibility, credential backup durability, template validity or host readiness.
Verify those requirements separately before writing credentials or applying configuration.

### 5.4 Backup

- **Mode A**: git is the backup (pushing to a private remote covers durability).
- **Mode B**: backup mechanism is the user's choice. `scripts/backup-secrets.sh` +
  `scripts/restore-from-onedrive.sh` are conventional helpers but not required.
- **Mode B with a vault projection**: the vault and its key are the backup; projections
  are regenerated after restore and are never backed up as plaintext. Recovery needs
  the companion, the vault and the vault key.

---

## 6. The "apply" contract

A conforming companion repo SHOULD ship a script (canonically `scripts/apply.py`) that:

| MUST | The script |
|---|---|
| **Idempotency** | be idempotent: re-runs produce the same `~/.claude.json` content. |
| **No-echo** | NEVER print secret values to stdout/stderr. Log length-only summaries. |
| **Fail-loud** | refuse to write when a `claude.json.template` placeholder has no matching `secrets/<slug>.env` value. |
| **Backup** | back up the existing `~/.claude.json` before writing. |
| **Merge semantics** | merge each tool's rendered snippet into `~/.claude.json`'s `mcpServers` section without touching other top-level fields. |
| **Atomic write** | write via a temp file + atomic rename. |

Check the selected companion's `apply.py` against this contract, including the
non-MCP behavior in §4.1, before applying configuration. A doctor result alone
does not establish apply conformance.

---

## 7. Inventory checks and current-operation verification

A companion MAY ship installation diagnostics such as `scripts/verify.sh`. Its
inventory observations MUST retain their source, scope and timestamp. A subprocess
listing, import or transport handshake MUST NOT be relabeled as current selected
operation readiness. Commands that could print credentials require a supported
no-echo inspection mechanism; masking after disclosure is insufficient.

Current readiness MUST come from the active host/session with exact source and
capability attribution, successful execution, valid authentication and usable
response content, as defined by `host-capabilities.md`. Record this evidence in
PRIVATE DATA. Unknown tools in the active host need not be added to the
companion before they can be examined; missing inventory is a configuration gap,
not proof of unsupported capability.

---

## 8. Versioning policy

- `schema_version` is a single integer.
- **Minor changes** (new optional fields, new optional files) MUST NOT bump the version.
  Skills that don't understand new optional fields MUST continue working.
- **Breaking changes** (removing fields, repurposing fields, restructuring the directory)
  MUST bump the major integer.
- Skills consuming companion repos MUST refuse to operate on a `schema_version` newer than
  they understand, but MAY operate on older versions if they remain backward-compatible.

Migration from version N to N+1 SHOULD ship with a documented mechanical migration in the
spec itself.

---

## 9. Conformance checklist

A repo conforms to this spec when:

- [ ] The storage mode is declared as in §5.3. Mode B uses the §2.2 ignore patterns and
      a separately verified backup (for a vault projection, the vault and its key).
      Mode A versions credentials in the PRIVATE
      repository; confirm that its history and private backup preserve those files.
- [ ] `registry.json` exists at the repo root and has `schema_version: 1` (or higher that's
      backward-compat with v1).
- [ ] Every entry in `registry.json` `tools[]` has REQUIRED fields `slug` and `installed`.
- [ ] For every `slug` in `tools[]`, `tools/<slug>/` exists and contains
      `claude.json.template` + `env.template`. Non-MCP transports use the empty
      `mcpServers` map from §4.1 and do not create a host MCP server.
- [ ] Every `claude.json.template` parses as valid JSON after placeholder substitution from
      the corresponding `secrets/<slug>.env`.
- [ ] All `.env` files (real and template) are UTF-8 without BOM.
- [ ] No per-account identifying info in committed READMEs (audit by grepping for emails
      / phone / personal usernames).

Tooling (apply.py, verify.sh, capture-key) is RECOMMENDED but not part of conformance.

---

## 10. Companion to this spec, see also

- [`companion-config-repo.md`](companion-config-repo.md), overview + tutorial (the
  rationale, the recommended bootstrap flow, the file-format examples).
- [`companion-config-hardening.md`](companion-config-hardening.md), GitHub-side hardening
  runbook (visibility, Features lockdown, Actions disable, GitHub Apps audit, Copilot
  training opt-out, periodic re-audit). Run this BEFORE the first push.

---

## 11. Future extensions (reserved)

- **`tools/<slug>/manifest.json`**, structured per-tool metadata (tier, transport, env_vars
  with descriptions, registration URLs). Currently OPTIONAL; v2 of this spec may make it
  REQUIRED for full machine consumption.
- **`schemas/`**, JSON Schema files for programmatic validation. Currently not shipped;
  may be added later.
- **`apply` as a callable**, currently apply.py is per-repo; a shared library could be
  factored out.

### 11.1 Skill-side `tools/<slug>.md` core / auto split (v1.2 prototype)

This is a **skill-repo doctrine**, not part of the companion-config contract, but the
companion spec documents it so consumers (sync-check, future generators) can rely on it.

**Problem.** Once the upstream MCP registry (`registry.modelcontextprotocol.io`) and
similar surfaces mature in Q3-Q4 2026, ~30-50% of each `tools/<slug>.md` (install
command, env vars, basic usage shape, current pricing) becomes mechanically derivable
from upstream metadata. Maintaining it by hand turns that fraction into **mirror
negative-value**: maintenance cost without judgment value.

**Convention.** A skill MAY split per-tool docs into two siblings:

| File | Contents | Lifecycle |
|---|---|---|
| `tools/<slug>.md` (core) | Header bullets · "When to pick" decision rule · 踩坑 · failure signals · fallback · `## Last verified` | Hand-authored. **This is the matrix's irreplaceable value.** |
| `tools/<slug>.auto.md` (auto) | Cost snapshot · install command · auth/keys · usage call shape | Hand-authored today; **regenerable** from upstream metadata once registry matures. |

**Constraints:**
1. `<slug>.md` is REQUIRED (sync-check looks for this filename for matrix membership).
   `<slug>.auto.md` is OPTIONAL, its absence means "all content stayed in core".
2. The two files MUST cross-reference each other in a short blockquote at the top.
3. `<slug>.auto.md` is the only file generators may overwrite. `<slug>.md` is never
   touched by automation.
4. The refresh-protocol's `## Last verified` lives in core.md only, re-verifying the
   auto.md sections (price, command) is the auto-regeneration's job, not the
   reviewer's STALE gate.

**Reference prototypes (v0.17.0):** `apify.md` + `apify.auto.md` (HTTP MCP),
`polygon.md` + `polygon.auto.md` (REST). When MCP registry maturity hits the trigger
condition in `ROADMAP.md`, migrate remaining `tools/<slug>.md` files following this
shape.

**Migration is NOT a P0**, only split a tool's doc when the auto.md content is
substantial (≥10 lines) AND there's a clear matrix-judgment / mechanical-fact divide.
Tiny tool docs stay as a single `<slug>.md`.

Until v2 of this spec, the items above are NOT part of the contract.

# Current host and selected operation evidence

> Maintenance commands below require the full consumer checkout. Replace
> `<absolute-market-intel-checkout>` with its located absolute path, and confirm
> that `tools/console.py` and `.claude-plugin/plugin.json` exist there. An installed
> skill-only directory or the current user project is not a checkout substitute.
> These commands guide setup; research uses current host tools directly.


Catalog entries describe possible sources. Machine inventory describes installed
paths, libraries and companion records. Neither establishes that a source works
for the selected operation in the current session.

During research, inspect the active host's callable tools and verify the chosen
operation using that host. Record authentication and validate that the response
contains the requested type of content. A login page or an HTTP 200 response alone
does not count. Keep the report scoped to the operation that was checked.

## Host activation

- **Claude:** configure the source with Claude's supported MCP settings, reconnect
  when required, and inspect the tools callable by this active Claude session.
  A separate `claude mcp list` process is an installation diagnostic.
- **Codex:** configure the source with Codex's MCP settings or activate the
  installed app, reconnect when required, and inspect this Codex session's
  available tools. Claude's configuration and tool list do not establish Codex
  exposure.
- **CLI, library, HTTP or browser:** validate the specific operation in the
  selected session. A path, importable module, saved login or reachable endpoint
  is only a discovery signal. Record the execution and usable response separately.

Use installed `llmcall` for any model or external-agent operation, inheriting its
current defaults. Deterministic classification does not call a model.

## Evidence schema v1

Maintenance callers may supply evidence through these environment variables:

| Variable | Meaning |
|---|---|
| `MARKET_INTEL_HOST` | Exact active host identifier, for example `codex` or `claude` |
| `MARKET_INTEL_SESSION_ID` | Identifier of the current session, changed for each new session |
| `MARKET_INTEL_CAPABILITIES` | Path to an explicitly supplied UTF-8 JSON evidence file |

The JSON object requires integer `schema_version: 1`, `host`, `session_id`,
`provenance` and a `capabilities` array. The invocation host must be `codex` or
`claude`; envelope and observation attribution must match it and the current
session exactly. `provenance` contains `host`, `session_id`, `observed_at` and
`observation_method: "current-session-adapter"`. It is the adapter response for
this session; a subprocess host listing cannot supply current-session exposure.

Each operation observation contains:

| Field | Accepted meaning |
|---|---|
| `source_id` | Exact operation source identity declared by the selected catalog entry |
| `capability_id` | Exact selected capability identity, independent of display slug/name |
| `host`, `session_id` | Required attribution matching the active invocation |
| `observed_at` | Valid ISO 8601 timestamp with timezone |
| `exposed` | Boolean `true` for current-session operation exposure |
| `supported` | Boolean `true` for supported operation; explicit `false` proves `hard-gap` |
| `execution` | `success` after the selected operation completed successfully |
| `authentication` | `authenticated` or `success`; `not-required` only when authentication is not required |
| `response_valid` | Boolean `true` after validating useful content for the selected operation |

Catalog entries declare `source_id` and `capability_id`; they can differ from the
display slug or name. A legacy entry without operation identity stays in `setup`
until the catalog declares it. Matching display names never transfer proof.
The optional catalog field `authentication_required: true` excludes
`authentication: "not-required"` from readiness. Authentication failures use
`failed`, `expired` or `denied`. Malformed strings never stand in for booleans.

Both provenance and operation evidence expire after 900 seconds, inclusive, and
allow future skew up to 60 seconds, inclusive. Foreign, missing, stale or malformed
attribution, and unsupported schemas, require fresh adapter evidence. The latest
observation for the exact source/capability identity wins. Authentication failure
defeats older success and simultaneous conflicting success; a later verified
recovery can establish readiness. Another operation cannot authorize or invalidate
the selected operation through a matching display name.

`available-now` requires supported exposure, successful execution, valid
authentication and usable content. `setup` includes an actionable reason for
missing or failed proof. `hard-gap` requires explicit current attributed
`supported: false`; absence alone does not prove unsupported capability.

The selected-tool report emits named `status:` and nonempty `reason:` lines.
Every selected-tool result includes `source_id:` and `capability_id:`.
An available result also emits `host:`, `session_id:`, `source_id:`,
`capability_id:`, `observed_at:`, `observation_method:`, `access: exposed`, and
`operation: ready`. Host exposure and operation readiness remain separate facts.

The [generated example](../../../inventory/host-capabilities.json.example) is a
synthetic schema illustration. It is not evidence for a real session. Real
evidence belongs in the PRIVATE versioned companion, outside the source tree.

## Maintenance console

These commands read the catalog and explicitly supplied evidence without machine
inventory discovery, credential discovery, network calls or writes:

```bash
python "<absolute-market-intel-checkout>/tools/console.py" status
python "<absolute-market-intel-checkout>/tools/console.py" tool github-mcp --capability search
python "<absolute-market-intel-checkout>/tools/console.py" connect github-mcp
```

`--capability` selects an operation for the catalog `source_id`; its default is
the catalog `capability_id`. `status --state available-now`, `setup` and
`hard-gap` filter the same classification. Host evidence is optional for catalog
browsing; absent or invalid evidence produces useful catalog output with `setup`.
Legacy filters (`cold`, `cold-mcp`, `needs-key`, `needs-install`, `needs-deploy`,
`unknown`) remain accepted as aliases for `setup`; the reason explains the gap.

Only an explicit `--refresh` collects inventory. Before collecting it, the console
resolves the final canonical path and the nearest containing Git worktree.
Missing, unmanaged (no Git worktree), Git-metadata and consumer-tree destinations
are rejected before directory creation. Filesystem links are resolved first, and
a nested repository is the worktree that owns its paths.

These are path checks only: no Git or `gh` process runs and repository visibility
is not checked at runtime. The commit and push hooks enforce that the
companion stays PRIVATE. See the
[config contract](../../../CONFIG.md#where-real-run-output-goes-the-private-companion-repo-versioned)
for initialization requirements.

The destination is `inventory/availability-cache.json` below the resolved DATA
directory. Set `MARKET_INTEL_CONFIG` to the selected private companion. Its `data/` child
must already exist; `MARKET_INTEL_DATA_DIR`, when set, must name that same child.
Follow [CONFIG.md](../../../CONFIG.md#discovery-convention-e2) for selection and
initialization. A failed explicit override never falls back.
An atomic write preserves a previous snapshot if replacement fails; the CLI returns
nonzero on a storage failure and names the companion on success. The
console does not commit; include the snapshot in the companion's normal backup
and versioning workflow. It never edits `.gitignore`.

The console is maintenance code. The research workflow uses the host's tools and
the evidence rules above without importing or invoking refresh scripts.

The incident helper uses the same canonical destination checks for
`metrics/live-runs.jsonl` below DATA, before reading or replacing the ledger.
Missing, unmanaged and consumer-tree destinations fail without directory
creation. Successful writes name the companion;
failed replacement preserves the previous ledger and returns a nonzero status.

## Catalog defaults and documentation aliases

Every canonical catalog row declares an operation source identity and a default
logical capability. `read` means read source content; it is not a guessed provider
CLI name. The active adapter must bind that logical operation to actual callable
tools and attest its response. `authentication_required: null` leaves no extra
catalog restriction; it never asserts that a source is keyless. Current evidence
must still establish authenticated access or confirmed `not-required` auth.

`apify.auto` and `polygon.auto` are backward-compatible aliases for their canonical
sources. Their `.auto.md` files are mechanical documentation siblings, not additional
tools, activations or coverage. The registry's `documentation` metadata keeps them discoverable.

## PRIVATE writer transactions

Discovery inboxes, surface rows, incident ledgers and feedback reports use the same
final destination path checks, including explicit output overrides. Validation
precedes observation or private-ledger reads. Dry-run writers create no storage.
Append writers hold an exclusive lock for the complete revalidate/read/modify/replace
transaction and recheck destinations before replacement. Concurrent appends are
retained; a stale lock fails closed instead of being deleted automatically.
The included concurrency regression uses threads; it is not cross-process runtime proof.

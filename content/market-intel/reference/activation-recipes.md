# Source activation recipes

Follow the [activation checklist](activation-checklist.md) for operation selection,
host configuration, reconnection, functional verification and readiness classification.
The checklist applies to both Claude and Codex; each host must expose and execute
the selected operation in its own active session.

| Setup detail | Reference |
|---|---|
| Source-specific installation, authentication and capability requirements | Selected entry in [the tool index](tools/index.md); verify current prices and access terms with the provider |
| Host setup and secret handling | [Installation guide](install-guide.md) |
| Evidence attribution and `available-now`, `setup`, `hard-gap` classification | [Host capability contract](host-capabilities.md) |
| Synthetic report shape | [Setup example](remaining-tools.md.example); it does not establish any operator's setup state |

Provider credentials and real readiness observations belong in the PRIVATE companion.
Installed packages and saved configuration alone do not establish readiness.

A real setup checklist can be stored as `reports/setup-state.md` below the verified
PRIVATE DATA directory. Resolve and validate the destination with the existing
`tools/private_inventory.py` writer before creating it. Never recreate the retired
public `remaining-tools.md` runtime report or use a repository-local fallback.

# Source activation checklist

Use this checklist for the source and capability selected from the current public
catalog. It contains no saved account inventory or host readiness claims.

- Read the selected tool document and confirm its current install, authentication
  and pricing requirements with the provider.
- Configure the source using the active host's supported settings. Claude and Codex
  have separate configuration and session exposure.
- Reconnect if required, then inspect this session's callable tool and operation.
- Run a bounded read-only request. Check execution, authentication and usable
  response content separately. Distinguish transport, authentication, quota and
  content failures from a valid empty response.
- Attribute evidence to the host, session, source, capability, timestamp and
  observation method in [host-capabilities.md](host-capabilities.md).
- Report `available-now`, `setup` with its missing prerequisite, or an evidenced
  `hard-gap`. CLI paths, installed libraries and companion inventory only guide setup.
- Save real observations in the PRIVATE companion. Follow
  [activation-recipes.md](activation-recipes.md) for the output boundary and
  [install-guide.md](install-guide.md) for secret handling.

Use the catalog console's `status`, `tool` and `connect` commands for navigation
and setup guidance. They do not prove operation readiness or silently collect
inventory. An explicit inventory refresh also requires the PRIVATE
versioned destination.

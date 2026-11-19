# Source intake

Establish what the demo is, which version is being analyzed, and what may legally be done with it. This stage produces no technical conclusions about the implementation.

## Inputs

- Candidate URL: official page, author repository, community catalog entry or mirror.
- The user's permission scope: public read, authorized analysis, redistribution, or unknown.
- Ability to save the response body, headers, license file and file contents.
- The project root from [the workspace contract](../SKILL.md).

## Outputs

- `sources/manifests/<demo_id>-source.json`: URL, final URL, status, UTC capture time, source type, author/publisher when verified, license, commit, per-file byte count, Git blob SHA-1 and SHA-256.
- `sources/snapshots/<demo_id>/`: read-only copies. Never edit them later.
- `demos/catalog/`: one entry per stable `demo_id`, with the quoted catalog text.

## Procedure

1. **Classify the source.** `official | author | community_catalog | mirror | unknown`. A community list stays a community list even when it is accurate.
2. **Quote the original.** Save the exact passage that names the demo, its author or its engine. A search snippet is a lead, not a quote.
3. **Pin a version.** Prefer a full commit hash. For a single file, record the Git blob SHA-1 and the SHA-256 of the bytes you analyzed. State the default branch you resolved.
4. **Read the license.** Open the actual `LICENSE` file and any per-asset notices. No license found means `unknown`, not "free to reuse". Public visibility never implies redistribution rights.
5. **Record reachability once.** Status code, UTC time and final URL. Do not describe a one-off `200` as "stable" or "playable".
6. **Deduplicate.** Several runs, forks or mirrors of one work are one demo with several artifacts. Give each artifact its own hash, not a new demo id.
7. **Note what is claimed by others.** Generation model, elapsed time, cost and "no errors" are author claims until independently reproduced.

## Evidence rules

- Git blob: `SHA1("blob <byte-length>\0" + content)`. Do not label it a commit.
- Store the SHA-256 of the exact bytes you read. If the upstream file changes later, the old analysis remains valid only for the old hash.
- Record failed access (login wall, 404, timeout) with the time and path tried. Do not fill the gap with cached text from another site.
- When a repository contains several demos, record each entry point and its size separately; do not count one repository as one game or many.

## Acceptance

- [ ] Every source has a type, a URL, a UTC time and a local evidence path.
- [ ] The analyzed bytes match the recorded SHA-256; any commit or blob is labeled correctly.
- [ ] License status is explicit, including `unknown`.
- [ ] Catalog quotes are separated from technical facts.
- [ ] Duplicates and multi-entry repositories are resolved without inflating the count.

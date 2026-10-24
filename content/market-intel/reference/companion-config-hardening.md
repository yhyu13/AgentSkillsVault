# Companion config repo, hardening runbook

Use this runbook to review a PRIVATE companion's access and automation before adding
runtime state or credentials. The [structural contract](companion-config-spec.md)
describes its contents. Existing repository and organization security policy remains
in force; creating a companion does not authorize changing that policy.

Record current settings first. Optional features and integrations are operator choices,
based on their purpose and permissions. Keep required security scanners, protection
rules, backup jobs and validation workflows enabled. Never delete workflows as a group.

## Threats and controls

| Threat | Control to verify |
|---|---|
| A companion is published accidentally | Authenticated PRIVATE visibility and all publication destinations |
| An integration reads more data than intended | Reviewed repository scope and least necessary permissions |
| A workflow exposes credentials | Reviewed jobs, trusted actions, limited token permissions and controlled outputs |
| A credential is exposed or revoked | Existing scanning and push protection, followed by actual credential rotation |
| An old collaborator, webhook or key retains access | An access inventory with an owner and current purpose for each grant |
| A support export carries private history | Fresh generator-owned synthetic output with no Git metadata or private input |

## Step 1, Create and verify the PRIVATE repository

For a new repository selected by the operator:

```bash
gh repo create <your-user>/market-intel-config --private
gh repo view <your-user>/market-intel-config --json nameWithOwner,visibility
```

Require the intended repository identity and explicit `PRIVATE` visibility. An
unauthenticated 404 alone cannot distinguish a private repository from an absent one.
Stop initialization if visibility is public or cannot be established. Review every
configured fetch and push destination, including alternate remotes, before runtime
writers use the companion.

## Step 2, Preserve the chosen credential-storage policy

Follow the storage mode and backup policy in
[companion-config-spec.md](companion-config-spec.md). A designated PRIVATE versioned
credential backup may contain credentials when the operator's policy allows it. Public
source, support exports and public examples contain only generated synthetic data.

Storing credentials privately does not waive existing scanning, push protection or
workflow requirements. Resolve a blocked operation under the applicable policy using a
narrow, reviewed exception where that policy permits one. Do not disable a scanner to
make a commit succeed. An exposed or revoked credential requires rotation of the
credential itself; editing a file does not remove its historical exposure.

## Step 3, Review optional repository features

Inspect `Settings > General > Features`. Keep features with a current purpose. The
operator may choose to disable an unused wiki, issues, projects or discussions after
checking their consumers. Do not infer that a personal companion must have every
feature disabled, or that private collaboration features are automatically public.

## Step 4, Keep required code-security controls

Inspect `Settings > Code security` and the policies inherited from the organization or
account. Preserve enabled secret scanning, push protection, code scanning and other
required checks. Their availability and controls depend on the current GitHub plan.

Review dependency manifests before deciding which Dependabot features are useful.
Alerts, security updates and scheduled version updates serve different purposes; an
operator may change an optional setting for a specific documented reason. The presence
of privately stored credentials is not a reason to turn all code-security features off.

## Step 5, Review Actions without removing existing gates

Inventory the existing workflows and required checks before changing Actions settings.
Keep security scanners, DATA-boundary checks, history checks, validation, synchronization
and backup jobs required by the repository's policy. Review each job's triggers, token
permissions, secret access, action versions and external destinations.

Use the repository's approved action allowlist and least necessary permissions. If the
operator wants to retire one optional workflow, identify that workflow and its callers,
confirm the remaining checks and backups still run, and make a scoped change. Do not
remove every file under `.github/workflows/` or disable Actions as an automatic companion
setup step. If all Actions are to be disabled by an explicit policy decision, first
establish how required checks and backups will continue to run.

## Step 6, Check publishing surfaces

Inspect `Settings > Pages` and any other publishing integration. A private source
repository does not establish the access policy of a published site or artifact.
Keep a publishing surface only for an explicit operator-selected purpose and verify its
actual audience. Disable an unused surface through a scoped operator decision.

## Step 7, Review webhooks, deploy keys and service credentials

Inventory webhooks, deploy keys, and Actions, Codespaces or Dependabot secrets without
printing their values. Each entry needs a current owner, purpose and access scope.
Keep legitimate integrations and the credentials their approved workflows require.
Revoke an unnecessary grant or rotate a compromised credential through the relevant
service; an empty list is not a universal requirement for a PRIVATE companion.

## Step 8, Limit collaborator access and prepare synthetic support exports

Review `Settings > Collaborators`. Grant only the access needed for the operator's
chosen collaboration. Repository access can expose historical commits, including old
credentials, so a temporary invitation is not a narrow file-sharing mechanism.

For a public support example, generate new synthetic output from the public tool's
`tools/make_fixtures.py`. Start with a new empty output directory outside the PRIVATE
companion, its backups and any existing Git worktree. From the public tool checkout:

```bash
python -B tools/make_fixtures.py --out <new-empty-export-directory>
python -B tools/make_fixtures.py --out <new-empty-export-directory> --check
```

The generator writes a flat set of synthetic examples;
`--check` verifies those outputs against the generator. If the problem needs another
example, add a synthetic recipe to the generator and regenerate it. Never construct the
example by reading, masking or copying a real private record.

Review the generated files needed for the support case, then package those files only.
The export must contain no `.git` metadata, private configuration, live DATA, credentials
or copied private history. Prepare it locally and obtain the operator's approval for the
specific destination before sharing. Do not create a public fork or branch from the
PRIVATE companion, even after deleting credential files: the history remains available.

## Step 9, Review account-level data-use settings

Inspect the account's current Copilot and other provider data-use settings and terms.
Their names, availability and scope can change. The operator chooses optional sharing
settings under the applicable account or organization policy; this runbook does not
make or authorize an account-wide change.

## Step 10, Audit installed GitHub Apps

For each installed app, review repository selection and its actual permissions. Prefer
access only to repositories needed for its approved purpose. Apply the same review to
coding assistants, automation, issue trackers and update services; the vendor name alone
does not establish the appropriate access scope.

Before narrowing, suspending or removing an integration, identify which repositories
and workflows depend on it. Preserve the operator's approved integrations and record
any scoped change in private audit notes. Do not silently uninstall an app or remove a
companion from its repository selection.

## Step 11, Preserve branch and repository protection

Inspect existing rulesets, branch protections, required reviews and required checks.
Keep applicable protections for both solo and collaborative use. An optional additional
rule is an operator choice after confirming that the normal maintenance and backup
processes can satisfy it.

## Step 12, Recheck access when it changes

Repeat the access review after adding an integration or collaborator, changing a
workflow, or changing repository visibility. The operator may also choose a recurring
review interval. Keep audit output in the PRIVATE companion; avoid exporting access
inventories or configuration values into public issues.

Read-only visibility and feature metadata can be inspected with:

```bash
gh repo view <your-user>/<repo> --json nameWithOwner,visibility,hasIssuesEnabled,hasWikiEnabled,hasProjectsEnabled,hasDiscussionsEnabled
```

Record which settings were inspected, which optional changes the operator selected,
and whether the required scanners, checks and backups still run. A setting being
present is not evidence that its workflow has executed successfully.

## Why this runbook lives with the public tool

Each operator creates their own PRIVATE companion. The public tool provides the setup
procedure and synthetic examples; the companion contains the actual configuration,
runtime state and approved credential backups. See
[companion-config-repo.md](companion-config-repo.md) for the overview and
[companion-config-spec.md](companion-config-spec.md) for the structural contract.

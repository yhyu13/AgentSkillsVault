# mypy on Hyphenated-Directory Checkouts

## Symptom

On a checkout whose top-level package directory contains a hyphen (e.g.
`sdv-mod-generator/`), a bare `python -m mypy specification/models.py` fails
with:

```text
sdv-mod-generator contains __init__.py but is not a valid Python package name
```

This is **not** an implementation defect. Python package names cannot contain
hyphens (PEP 8 / import system), so mypy refuses to treat the directory as a
package root. A worker that reports "mypy is broken" on such a checkout has
almost certainly used the bare invocation.

## Fix

Pass `--explicit-package-bases` so mypy resolves modules by file path rather
than by inferring a package root from the directory tree:

```bash
python -m mypy --explicit-package-bases specification/models.py specification/__init__.py
# → Success: no issues found in 2 source files
```

`--no-namespace-packages` does **not** help here — it still tries to infer the
package root and hits the same hyphen-name rejection.

## Orchestrator lesson

When a worker blocks citing a tool failure ("mypy is broken", "ruff won't
run"), do not take the failure at face value. Independently reproduce the
worker's evidence and try alternative invocations / flags before classifying
the block as genuine. A worker that stopped mid-handoff because of a
diagnosable invocation mistake should be unblocked with a corrective comment
showing the working command — not escalated as a human gate.

## Scope

This applies to any checkout where the repository or package root directory
name contains a character that is illegal in a Python identifier (hyphens,
leading digits, etc.). The fix is the flag, not renaming the directory.

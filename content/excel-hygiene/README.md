# excel-hygiene

A rigorous **"second pair of eyes"** on any `.xlsx` before it goes out — packaged as a
[Claude Code / Agent Skills](https://agentskills.io) skill.

It combines two layers:

1. **A deterministic Python script** (`scripts/check_excel.py`, openpyxl-only) for precise,
   reproducible **mechanical** checks.
2. **LLM reasoning** driven by the full **Panko–Halverson (2008) spreadsheet-error taxonomy**
   embedded in `SKILL.md` — violations vs errors · qualitative vs quantitative · mistakes / slips /
   lapses · life-cycle stages — applied with general business and spreadsheet knowledge.

The script is a **floor, not a ceiling**: the skill explicitly tells the agent to reason *beyond* the
listed checks, never to treat them as a fixed checklist. It is client-agnostic — no business rules
are baked in.

## What the script catches (mechanical, high-confidence)

| Check | What it flags |
|---|---|
| Number as text | A numeric value stored as a string → `SUM` silently skips it, the total is understated |
| Number over formula | A static number sitting in a column that is otherwise formulas → a formula may have been overwritten |
| Cell error | `#DIV/0!` / `#REF!` / … literals (EN **and** RU), and formulas that divide by zero |
| Truncated SUM | A vertical `SUM` that stops before the last populated data row → a row may be dropped |
| Percent as whole number | A value > 1 in a column whose header contains `%` → likely off by ×100 |

Everything else — logic errors, omissions, ambiguous units, structural smells — is surfaced by the
agent's reasoning against the taxonomy, and marked **"confirm"** (lower confidence than the script).

## Install

This is a personal/project skill — just drop the folder where Claude Code looks for skills.

**Personal (all projects):**
```bash
git clone https://github.com/BayramAnnakov/excel-hygiene ~/.claude/skills/excel-hygiene
pip install -r ~/.claude/skills/excel-hygiene/requirements.txt
```

**Project-scoped (this repo only):**
```bash
git clone https://github.com/BayramAnnakov/excel-hygiene .claude/skills/excel-hygiene
pip install -r .claude/skills/excel-hygiene/requirements.txt
```

The same `SKILL.md` folder also works in other Agent-Skills hosts (e.g. Cursor) — point them at their
skills directory instead.

## Usage

Once installed, the agent invokes it automatically when you ask it to review a spreadsheet ("check
this xlsx for errors"), or you can call it directly:

```
/excel-hygiene
```

You can also run the mechanical checker on its own, no agent required:

```bash
python3 scripts/check_excel.py path/to/file.xlsx
```

Try it on the bundled example, which trips every check:

```bash
python3 scripts/check_excel.py examples/broken.xlsx
```

## The two-layer pattern (generic + your domain skill)

`excel-hygiene` is the **universal layer**. It deliberately does **not** know your numbers. For
project-specific thresholds — your exact bonus %, margin rate, segment bands, program conditions — it
will *not* assert a verdict; it flags *"this looks off, confirm against your rules."*

Those rules belong in a **separate domain skill** you author with your own thresholds, sitting *on
top* of this one:

| Layer | Skill | Catches | Who can define it |
|---|---|---|---|
| Generic | **excel-hygiene** (this) | mechanical checks **+** generic logic/omission (totals that don't add up, % > 100%, missing rows, units mismatch, …) | universal — no project rules needed |
| Domain | *your skill* | your exact thresholds and business rules | only you / your expert |

The simplest way to create that domain skill is to ask the agent in plain language: *"create a skill
that holds my offer rules: bonus = X%, margin ≥ Y, … and save it to `.claude/skills/`."*

## Requirements

- Python 3
- [`openpyxl`](https://openpyxl.readthedocs.io/) ≥ 3.1 (`pip install -r requirements.txt`)

The script reads both formulas and values; it assumes a simple table with headers in row 1 of each
sheet. It is **conservative / high-precision** by design — it would rather miss a borderline case than
cry wolf.

## Credits

Error framework: Panko, *"Revisiting the Panko–Halverson Taxonomy of Spreadsheet Errors"* (EuSpRIG
2008); Reason, *"Human Error"* (1990); Rajalingham (2005); Powell, Lawson & Baker (2007).

Built by [Empatika Labs](https://empatika.com).

## License

[Apache-2.0](LICENSE).

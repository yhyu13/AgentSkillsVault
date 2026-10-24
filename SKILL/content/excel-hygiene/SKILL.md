---
name: excel-hygiene
license: Apache-2.0
description: >-
  A rigorous "second pair of eyes" on any xlsx before it goes out. Runs a deterministic script for
  precise MECHANICAL checks (numbers as text, hardcoded-over-formula, cell errors, truncated SUM,
  percent as whole number), then reasons across the full spreadsheet-error taxonomy (Panko 2008:
  violations vs errors; qualitative vs quantitative; mistakes / slips / lapses; life-cycle) using
  general business and spreadsheet knowledge. Use for calcs, offers, mediaplans, budgets, any table.
  Client-specific thresholds (exact rates, margins, segment bands) belong to a domain skill.
---

# Excel review — a second pair of eyes (taxonomy-driven)

## What to do
1. **Run the script** for precise, reproducible **mechanical** checks (openpyxl, no LibreOffice).
   It needs `openpyxl` — if the import fails, `pip install openpyxl` first:
   ```
   python3 scripts/check_excel.py <path/to/file.xlsx>
   ```
2. **Then review against the taxonomy below.** The script is a **floor, not a ceiling.** Read each
   sheet and reason through every class, using your general business/finance/spreadsheet knowledge.
   Goal (per Panko 2008): be **expansive — suggest issues to check, don't just confirm a fixed list.**

## The error taxonomy — your review framework (Panko–Halverson, revised 2008)
Work top-down. Each class has a different **detection rate** — the ones lowest for the human eye
(omission/lapses and qualitative) are where you must look hardest; that's where real value is added.

### 1. Violations vs Errors
- **Violation** — breaks a policy or compliance rule (even if the math is right): a banned/hardcoded
  rate, a missing required control/disclaimer/sign-off, a regulated calc done off-standard.
  *You usually can't know client policy — flag "confirm against your standards."*
- **Error** — inadvertent. Everything below.

### 2. Qualitative vs Quantitative
- **Qualitative** — the number is *not* wrong today, but the design is risky (latent). Often the most
  dangerous because it survives review. Examples:
  - **Hardcoding / "jamming"** — a constant buried in a formula (`=B2*0.10` instead of referencing a
    rate cell); a number typed over a formula. Breaks silently on the next what-if or update.
  - **Poor structure** — inputs mixed into calculations; no separation of assumptions.
  - **Ambiguous labeling / units** — a result that can be *misread* (units not stated, unclear header)
    → an interpretation error downstream.
  - **Smells** — magic numbers, overly long/nested formulas, volatile functions (NOW/TODAY/RAND),
    undocumented colour-coding, a formula inconsistent with the rest of its row/column.
- **Quantitative** — a bottom-line value is actually wrong. Break it down by §3.

### 3. Quantitative errors: Mistakes / Slips / Lapses (Reason–Norman)
- **Mistakes — the plan is wrong** (wrong formula/algorithm). Sub-sources:
  - *Domain mistake* — misunderstands the business rule (wrong margin definition, wrong tax/period
    treatment). Generic red flags you CAN judge: a percentage > 100% where impossible, a discount >
    price, a margin implausibly high/low, a negative where only non-negative makes sense.
  - *Logic / math mistake* — ratio on the wrong base, double-counting / overlapping ranges, a stated
    total ≠ sum of its parts, sign error, wrong order of operations, units mismatch (thousands vs
    units, mixed currency).
  - *Software-use mistake* — misusing a function: VLOOKUP approximate-match returning the wrong row,
    a SUM/AVERAGE over the wrong range, AVERAGE silently including blanks/text, absolute/relative
    reference drift after a copy, off-by-one ranges.
- **Slips — sensory-motor, in execution** (often leave visible artifacts → easier to catch):
  mistyped number, transposed digits, wrong sign typed, a formula pointing at the wrong cell,
  number stored as text.
- **Lapses — memory overload → OMISSION** (lowest detection rate — look hardest here):
  a row / line / period dropped from a total (truncated SUM); an expected client / product / segment
  absent; a required value left blank; a month missing from a series; a formula not extended to new
  rows. *Omission also includes a requirement left out of the model entirely — not visible as a cell,
  only by asking "what should be here that isn't?"*

### 4. Where to look — life-cycle lens
Different errors concentrate at different stages; when reviewing or modifying a file already **in
operation**, weight your attention there:
- *Requirements / design* — a wrong or incomplete rule baked in from the start.
- *Cell entry* — slips, mistyped constants.
- *Draft / debugging* — inconsistent formulas, broken refs (`#REF!`) after inserts/deletes.
- **Operation (most errors in live files):** wrong data entered, bad imports (numbers as text),
  **formulas overwritten with constants**, stale numbers, **misread outputs**. ← the modify/review case.

Also scan at multiple **levels**: cell → algorithm (a group of cells) → module → whole sheet →
the business system it feeds. Many errors come from losing sight of the broader flow, not the cell.

## Generic vs client-specific
Use general knowledge to flag **logic, omission, and qualitative** issues without project rules. For
**client-specific thresholds** (exact bonus %, margin rate, segment bands, program conditions) do
**not** assert a verdict — defer to your **domain skill** (a separate, project-specific skill that
holds your exact rules) or ask the human, and flag *"this looks off — confirm against your rules."*

## How to present (Verify)
Output a table: `sheet · cell · class · confidence · materiality · what's wrong`.
- **Script (mechanical) findings → high confidence.** Your reasoning findings → **"confirm."**
- **class** = the taxonomy bucket (violation / qualitative / mistake / slip / lapse-omission).
- **materiality** = how much it moves the bottom line, or whether a decision would change (rank the
  big ones first; note tiny ones but don't drown the report).
- For each finding **show the cell/formula and explain in plain words WHY** it's suspicious — a clear
  reason is what stops a real error from being dismissed (avoid the "warned-but-ignored" failure).

This is a **second pair of eyes** — the final call is the human's. Watch for false positives; when
unsure, ask rather than assert. Treat the list above as a starting frame: always ask **"what else
could be wrong here that isn't on it?"**

---
*Framework: Panko, "Revisiting the Panko–Halverson Taxonomy of Spreadsheet Errors" (EuSpRIG 2008);
Reason, "Human Error" (1990); Rajalingham (2005); Powell, Lawson & Baker (2007).*

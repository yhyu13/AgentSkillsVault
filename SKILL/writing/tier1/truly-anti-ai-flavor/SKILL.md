---
name: truly-anti-ai-flavor
description: Use when editing Chinese long-form copy with repeated claims, formulaic structure, or heading/body mismatch; also when asked to remove generic AI-like phrasing. Preserve source facts and mark unknowns. Not for detector evasion, poetry, lyrics, legal text, or translation.
version: 1.0.1
source: local distillation; anonymized public copy
---

# Fact-preserving Chinese long-form editing

Improve structure and readability without changing the author's facts. AI flavor is often structural before it is lexical: repeated claims, overly symmetric sections, unsupported climaxes, and internal notes left in reader-facing copy usually matter more than word substitutions.

The evidence summary in references/evidence.md describes one anonymized case. Its measurements are not universal thresholds. A bracketed-variable example is in examples/deduplication.md.

## 1. Ground before diagnosing

Read the materials that establish what is true and what the reader expects:

- current and earlier drafts, to preserve accepted wording and recover omitted details;
- the source transcript or primary records, to verify facts and quotations;
- the target platform's actual publishing or quality rules;
- a visual sample when the output has a fixed layout.

If a source or requirement is unavailable, say 未核实. Do not infer a source document from memory. Before editing, name the source materials actually reviewed.

## 2. Diagnose in five buckets

| Bucket | Look for | Change type |
|---|---|---|
| Duplication | A fact, example, or conclusion repeated in multiple sections | Fact-preserving compression |
| Symmetric scaffold | Sections or questions forced into identical shapes | Usually wording or structure |
| Officialese and climax | Stock phrases or a grand ending that adds no supported information | Wording-only unless it changes a claim |
| Heading/body mismatch | A heading promises a time, role, or event the body does not deliver; internal notes leak into published copy | May change facts or attribution |
| Title/body mismatch | The headline claims more than the body supports | Fact-sensitive; remove or verify the claim |

For each proposed edit, mark whether it changes facts or only wording. Resolve fact-sensitive problems against the source corpus before polishing style.

## 3. Rewrite in four layers

1. Density: keep each supported fact once; merge sections that only repeat earlier material.
2. Rhythm: break mechanical symmetry and vary sentence length without adding filler.
3. Vocabulary: remove stock phrases; preserve names, titles, dates, numbers, and verbatim quotations.
4. Structure: repair heading/body promises and move internal notes out of reader-facing copy.

Hard constraints: add no facts, remove no supported facts, and alter no direct quote. Mark uncertainty for the user instead of guessing. Keep the user's headings unless asked to change them; when a heading and body disagree, repair the body with source-backed content or flag the conflict.

## 4. Verify with reproducible checks

Use the project's existing QA rules or scripts when available. Check that:

- every factual name, number, and claim traces to a source;
- quotations match the source verbatim;
- headings describe the content beneath them;
- the final text meets the target platform's actual format and length requirements;
- any separately saved deliverable matches the final text shown in the conversation.

If no source corpus or QA tool is available, list the checks actually performed and mark the rest 未核实. Do not reuse thresholds from another platform or claim scripts passed if they were not run.

## 5. Deliver the edit clearly

For substantial edits, provide a concise before/after comparison and the complete revised copy. Separate verified facts from suggestions and unresolved questions. Report counts from checks rather than estimating them.

## Completion gate

Finish only when every factual claim in the revised copy has a source or an explicit uncertainty label, every direct quote remains exact, no supported fact was removed, the heading/body promises match, platform-specific checks are recorded, and any remaining unknown is visible to the user. If any item cannot be checked, report the gap instead of calling the edit verified.

## Boundaries

Use this skill to improve clarity, structure, and fidelity to supplied sources. Do not promise detector evasion, conceal AI assistance, or claim that an editing pass proves human authorship. Stop when the user requests a fact that the available sources cannot support. Not for poetry, lyrics, legal text, or translation.
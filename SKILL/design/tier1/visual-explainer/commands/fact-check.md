---
name: fact-check
description: Verify a generated document against actual code and git history
---

Load the visual-explainer skill and fact-check the document at `$@`. With no path, use the newest `<name>.html` that is not a `.src.html`, in `VISUAL_EXPLAINER_OUTPUT_DIR` when it is set and not blank (relative to the working directory), else in `~/.agent/diagrams/`.

1. Extract every claim that you can verify: paths, names, behavior, data flow, APIs, commands, dependencies, tests, numbers, and git history. Skip opinions.
2. Check each claim against the source or `git show`. Mark it verified, corrected, unsupported, or unverifiable.
3. Fix errors with small edits to the page's source (`<name>.src.html` when it exists, else the HTML) and render again; keep its structure and style. A wrong edge or label is a wrong claim too.
4. Add a verification strip at the top: counts per status as chips, with a `<details>` list of what changed.

Open the result; for Markdown, report the path.

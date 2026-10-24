---
name: plan-review
description: Compare an implementation plan against the current codebase, with each fix to accept or reject in the page
---

Load the visual-explainer skill and make a visual plan review.

Input: `$@` is a plan path or plan text. If it is empty, ask for the plan.

Read the whole plan, every file it references, and the code that depends on them. For each proposed change, check that the file, function, or type exists, that current behavior matches the plan, which ripple effects it misses, and whether its tests fit the repo style. Cite the plan section and `file:line`.

Write the review as a plan page (`references/plans.md`), so the reader accepts or rejects each fix in place:

- **Header**: h1 "Review: <plan name>"; the lead gives the verdict (approve, revise, or reject) and why.
- **Hero**: `<ve-flow>` of the planned design, the parts a finding touches marked `gone` or `new` and linked to its claim.
- **Claims**: one level-1 claim per finding, as a sentence that can be false ("Step 3 edits a function that no longer exists."), most serious first, at most 5; smaller findings as child claims. Each proves itself with `<ve-code src=… lines=…>` or a quote of the plan. Unconfirmed findings get `evidence="guess"`.
- **Decisions**: each finding gets `<ve-ask id="f1" q="Fix the plan this way?">` (then `f2`, …) with `<ve-opt value="accept" default>` describing the fix and `<ve-opt value="reject">Keep the plan as written</ve-opt>`, plus any real alternative.
- **End** with `aux="scope"`: what the plan gets right.

Hand over in one line. When the response arrives, edit the plan file: apply accepted fixes and leave rejected ones as written.

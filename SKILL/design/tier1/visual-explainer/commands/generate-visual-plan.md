---
name: generate-visual-plan
description: Generate an interactive visual implementation plan the reader can answer in place
---

Load the visual-explainer skill and make a visual implementation plan for: $@

Follow `references/plans.md`.

1. **Research first:** entry points, affected modules, public APIs, data model and config, tests, similar features, and README/CHANGELOG constraints. Note exact `file:line` and the user's own words.
2. **Write the level-1 claims** and fix them before anything else.
3. **Draw the hero** with `<ve-flow>`: new and removed parts marked, each linked to its claim.
4. **Add how and where claims, then the decisions.** Mark claims you could not confirm `evidence="guess"`; give each level-1 claim a `check`.
5. **Render** (in Pi, `viewer: "glimpse"` sends the response straight back), hand over in one line, and wait. Do not build before the response arrives.
6. **After you build**, set each claim's `status` and render again.

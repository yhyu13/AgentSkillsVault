---
name: taste-director
description: Use when building, redesigning, or visually directing any UI where "not looking templated" matters. Uber skill / router over the 7 taste-* anti-slop skills — reads the brief, dispatches to the right child (frontend / redesign / imagegen / brandkit / stitch / output), and enforces one shared taste contract.
version: 1.0.0
metadata:
  hermes:
    tags: [design, taste, router, orchestrator]
    related_skills: [taste-frontend, taste-redesign, taste-output, taste-imagegen-web, taste-imagegen-mobile, taste-brandkit, taste-stitch]
---

# Taste Director — router over the taste-* anti-slop skills

## What this is
A thin dispatcher. It does NOT re-implement the 7 taste-* skills. It classifies
the request, hands off to the correct specialized child, and enforces one shared
taste contract so output stays consistent no matter which child runs. Load the
child for its full instructions; come back here for routing + the common rules.

## When to use
Any request to build, redesign, or visually direct a UI where "not looking
templated" matters. If in doubt, route from here.

## Route (pick the single best child)

| Intent / signal | Winner | Why |
|---|---|---|
| Greenfield site / web app, need code | taste-frontend | flagship v2: brief inference → VARIANCE/MOTION/DENSITY dials → ships UI code |
| Improve/redesign an EXISTING codebase | taste-redesign | audit UI first → fix layout/spacing/hierarchy/styling; do not break function |
| Generate reference IMAGE comps (web) | taste-imagegen-web → taste-frontend | image-to-code: render frames, then implement to match |
| Mobile screens / flows | taste-imagegen-mobile | iOS/Android/cross-platform, readable type, coherent sets |
| Brand kit (logo/palette/type/identity) | taste-brandkit | logo directions, palettes, type, identity applications |
| Google Stitch screen generation | taste-stitch | emits a DESIGN.md in Stitch's Visual-Descriptions semantic language |
| Agent truncates output / leaves placeholders | taste-output | global post-step on ANY task, not just design |

## Shared taste contract (the non-negotiables in every child)
These are the floors regardless of which child fires. Auditing against them is
the whole point of the anti-slop system.

- No `Inter` for premium/creative context → Geist / Outfit / Cabinet Grotesk / Satoshi
- No pure black `#000000` → Off-Black / Zinc-950 / Charcoal
- No AI purple/blue-neon glow, no neon gradients
- One accent color max, saturation < 80%
- No generic serif (Times/Georgia/Garamond); modern serif only for editorial,
  never in dashboards
- No 3-equal-cards feature row; no centered hero when variance > 4
- No emojis; no "Elevate / Seamless / Unleash / Next-Gen" copy clichés
- No generic placeholder names (John Doe / Acme / Nexus)
- Spring physics (stiffness ~100, damping ~20), never linear ease
- Animate only `transform`/`opacity`; never `top/left/width/height`
- CSS Grid over flexbox math; `min-h-[100dvh]` not `h-screen`
- Mobile-first: single-column collapse < 768px, no horizontal scroll, 44px tap targets

## Chaining
- imagegen-web / imagegen-mobile → taste-frontend (render refs, then build to match)
- taste-output wraps the END of any task (enforce full output, no placeholder comments)

## Anti-blunder
taste-director is context-lean ON PURPOSE. If you reach for a child, load it —
its instructions live there, not here. Don't inline child logic into a request.

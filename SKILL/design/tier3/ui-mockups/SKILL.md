---
name: ui-mockups
description: Generate clean, realistic app-UI mockups as self-contained HTML — browser/app windows, dashboards, editors, canvases, chat apps, settings pages — for landing pages, presentations, portfolios and product demos. Use when the user asks for a "UI mockup", "app screenshot", "product demo shot", "browser window mockup", "dashboard mockup", "fake app UI", or wants a hero image showing a product interface. Produces window chrome, toolbars, panels, realistic content, real brand icons, named cursors, and optional CSS motion — never gray placeholder boxes.
---

# UI Mockups

Build product-UI mockups as one self-contained HTML document (inline CSS, optional inline
`<style>` keyframes, no external JS). Rendered at 2x they pass for real screenshots; kept as
HTML they stay editable, animate, and weigh a few KB.

## Method

1. **Decide the story first.** A mockup is a scene, not a component dump: one workspace name,
   2–4 named actors, one task in progress. Every panel, chip, badge and label must reference
   the same story. Incoherence is what makes mockups look fake.
2. **Build outside-in:** window chrome → app toolbar → content region → side panel →
   floating elements (cursors, chips, badges).
3. **Screenshot and inspect your own render** before calling it done. Check the checklist at
   the bottom; fix and re-render. One pass is never enough.

## The clean-UI ruleset

- **Hairlines, not shadows.** Borders `1px solid #e6e6e2`-class grays do the separation work.
  Shadows exist but whisper: `0 1px 2px rgba(20,20,15,.04), 0 8px 20px rgba(20,20,15,.05)`.
  A mockup with floaty shadows reads as a dribbble shot, not a product.
- **One accent color for state** (active borders, streaming, badges) + green for live/done.
  Everything else is a gray ramp on white. Pick the accent from the user's brand.
- **Sentence case, sans-serif, small.** UI text is 10–13px, weights 500–600. Never uppercase-mono
  inside the UI (it reads as "designed", not "software"). One tight grotesk family throughout
  (Inter Tight, Geist, or the user's brand face).
- **Density is realism.** Real software has 11px labels 8px apart. Generous marketing-site
  spacing inside a mockup is the #1 tell that it's fake.
- **Content must be real.** Invented but plausible names, prices, timestamps, file names.
  Skeleton lines are allowed only to represent *loading or in-progress* content — never as
  a substitute for content you were too lazy to write.

## Window chrome

- **Browser/app window:** radius 12, `1px solid #e3e3df`, the whisper shadow above, white bg.
  Title bar: white, 34px, three 8px pastel traffic dots (`#fca5a5 #fcd34d #86efac`), hairline
  bottom border. Add a URL pill only if the product's URL matters to the story.
- **App toolbar** (below chrome): 44px, white, hairline bottom. Left: logo + workspace name
  (12px/600) + a plain "● Live"/status in green. Right: overlapping 20px avatars (humans as
  gradient-initial circles, agents/brands as their real icons on `#f4f4f1` circles, −6px
  overlap, 1.5px white ring), then a ghost pill and one dark CTA pill.
- **Device frames:** for mobile, a 390×844 rounded-40 body with a hairline border and a
  dynamic-island bar beats any fake iPhone PNG.

## Content regions

- **Canvas/board areas:** `#fcfcfb` with a faint dot grid —
  `background-image:radial-gradient(#e5e5e0 1px,transparent 1px); background-size:22px 22px`.
- **Docked side panels:** fixed width (~220px), white, `border-left:1px solid #f0f0ec`,
  a 12px/600 title + count, icon rows, inset `#fafaf8` cards for secondary items.
- **Tables:** grid rows with hairline separators, a `#fafaf8` header row, mono/tabular numbers
  right-aligned. **Charts:** flexbox bar charts (divs with % heights, mix of accent-gradient
  and `#e4e4e0` bars) read perfectly at mockup scale — no chart library.
- **Artboards/cards inside the UI:** radius 8, hairline border, tight shadow, and a small
  gray label above (10.5px/500). Fill them with real mini-designs, not gray boxes.

## Presence & activity (what makes it feel alive)

- **Named cursors:** 13px SVG arrow `<path d="M4 2l16 8-7 2-3 7z"/>` + a name pill in that
  actor's color. Drift them: 8–11s ease-in-out translate loops, ≤24px travel, different
  period per cursor.
- **"Working" badge:** a colored pill above the element being changed — actor icon in white +
  "‹Name› is designing…" 10px/600 white text on the actor's color.
- **Active element:** soft accent border (e.g. `1px solid #a78bfa`) on the card being edited.
- **Streaming reveal:** a white cover over the active card animating `top:57%→101%` (7s,
  infinite) with a 2px gradient line + glow at its edge — content exists above the line,
  blank below. Pair with sequential skeleton-line builds and a `steps(2)` blinking caret.
- **Presence chips:** bottom-corner white pills — real icon + name (600) + activity (gray).

## Icons & logos

- Real marks only: `https://icons.duckduckgo.com/ip3/<domain>.ico` for any company (raster —
  display ≤18px, never upscale), `https://api.iconify.design/<set>/<name>.svg?color=%23<hex>&height=<px>`
  for UI glyphs and recolorable brand vectors (verify the icon exists; prefer light sets like
  `material-symbols-light` and `lucide`).
- **Never use raw unicode arrows/checks/carets** (`↗ ✓ ▾`) — they render as tofu or emoji
  depending on the font. Use tiny inline SVGs or CSS triangles.

## Sizing & export

- Desktop app: build at 1000–1100px wide inside a 1280 artboard; mobile: 390×844.
- Render screenshots at 2x for retina crispness. For static export, screenshot the HTML
  (headless browser, or a canvas tool like Doop which renders frames to PNG URLs).
- Copy-paste component snippets: see [references/components.md](references/components.md).

## Pre-ship checklist

- [ ] One coherent story — every label/chip/panel references the same actors and task
- [ ] No gray placeholder boxes; skeletons only where something is genuinely "loading"
- [ ] No unicode glyph rendered as tofu/emoji (screenshot and zoom to verify)
- [ ] Favicons ≤18px; nothing upscaled and blurry
- [ ] Hairlines align; repeated rows form clean vertical lanes
- [ ] Shadows tight, not floaty; one accent color, not four
- [ ] Text 10–13px inside the UI; nothing marketing-sized
- [ ] Screenshot reviewed at 100% AND zoomed before delivering

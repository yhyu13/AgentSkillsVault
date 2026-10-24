# Visual Learner — Design Language

> Derived from the **Nova Design System**. Canonical source: local export at
> `~/Downloads/Nova Design System/` (tokens/*.css, components/nova-ui.css, assets/icons/*.svg, readme.md).
> The skill copies token files verbatim; this doc adapts the system to the presentation/player context.
> Status: standard for all Visual Learner skill output. 2026-07-15.

## Principles (inherited from Nova)

1. **Achromatic by default.** The entire UI is a true-gray ramp (OKLCH, chroma 0). No navy, no purple, no blue-cast grays. Color appears only as data accent (cool blue family) or status tint.
2. **Borders, not shadows.** Hairline 1px borders structure everything. Shadows only on floating layers (glossary cards, panels).
3. **Dense, flat, quiet.** No gradients, no glassmorphism, no decorative motion.
4. **No emoji, ever.** Iconography is Central Icons (round/filled/fully-rounded, 24x24 viewBox, `currentColor`), inlined as real SVG paths. No icon fonts, no CDN, no PNG icons, no unicode symbols (keycaps inside Kbd excepted).
5. **Both themes from one token set.** Light + dark ship together; default follows `prefers-color-scheme`.

## Tokens

Fonts: **Inter** for all visible text incl. headings (weights 400/500/600/700, headings tracking -0.02em). **Geist Mono** for numbers, timecodes, IDs, keyboard keys. For offline single-file output, subset + embed as woff2 base64; system-ui fallback stack.

Color roles — exact values from `tokens/colors.css` (all neutrals are chroma-0 OKLCH):

| Role | Light | Dark (`.dark`) |
|---|---|---|
| background | `oklch(1 0 0)` | `oklch(0.145 0 0)` |
| foreground | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| card / popover | neutral-0 | neutral-900 `oklch(0.205 0 0)` |
| muted | neutral-100 `oklch(0.97 0 0)` | neutral-800 `oklch(0.269 0 0)` |
| muted-foreground | neutral-500 `oklch(0.556 0 0)` | neutral-400 `oklch(0.708 0 0)` |
| border | neutral-200 `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` |
| sidebar (control bar) | neutral-50 `oklch(0.985 0 0)` | neutral-900 |
| data accent (chart-1..5) | blue-300..700, e.g. chart-3 `oklch(0.546 0.245 262.881)` | same |
| destructive | red-500 `oklch(0.577 0.245 27.325)` | red-400 `oklch(0.704 0.191 22.216)` |
| success | green-500 `oklch(0.59 0.149 153)` | same |
| warning | amber-500 `oklch(0.74 0.155 75)` | same |
| ring (focus) | 3px `color-mix(in oklch, var(--ring) 50%, transparent)` | same |

Status colors are **tinted pills (10-14% alpha fills), never solid blocks**.

Type scale (from `tokens/typography.css`): 2xs 9px · xs 12px · sm 13px · base 14px · md 15px · lg 17px (card titles) · xl 22px (sections) · 2xl 28px (page titles) · 3xl 36px / 4xl 48px (display, for slide headlines). Tracking: headings -0.02em, uppercase eyebrows +0.06em. Weights 400/500/600/700.

Spacing: 4px base grid. Control padding 8-10px, gaps 6-8px, card padding 24px, section rhythm 24-48px.
Radius (from `tokens/radius.css`): base 10px; sm 6, md 8, lg 10 (buttons), xl 14 (cards), full for pills.
Shadows: cards `none`; popover `--shadow-lg`; dialog `--shadow-xl`. Motion: 0.15s ease, functional only; respect `prefers-reduced-motion`.

## Presentation-specific mapping

The player is an app shell in Nova terms: stage (content region) + control bar (top-bar equivalent).

| Element | Treatment |
|---|---|
| Stage background | `--background` (follows system theme) |
| Slide cards / boxes | `--card` surface, 1px `--border`, radius 14px, no shadow |
| Kickers | 11-12px uppercase, wide tracking, `--muted-foreground`; data-accent blue only when pointing at V1 scope |
| Headlines | Inter 600, tight tracking, `--foreground` |
| Screenshots | radius 10px, 1px border, no glow/shadow |
| **Annotation overlays** | 2px border + tinted label chip. Semantic: destructive = remove, warning = evolve/open question, success = keep, data-blue = informational. Labels 11.5px, 500 weight, sentence case |
| Control bar | 56px, `--sidebar` surface, hairline top border |
| Play/CC/glossary/speed controls | Nova Button vocabulary: compact, data-variant style, 3px focus ring, hover = `--muted` fill, no press-down |
| Timecode / speed | Geist Mono, tabular numerals |
| Captions | floating card on `--popover` surface, shadow-md (floating layer - allowed), 1px border, radius 10px; speaker name 600 weight - speaker A `--foreground`, speaker B `--muted-foreground`, or two chart-blues; never orange/purple |
| Glossary "jargon" card | popover treatment: shadow-md, 1px border, radius 14px, warning-tinted left edge 2px; term 600, body 13.5px |
| Glossary panel | dialog treatment: shadow-xl, centered, max 760px, hairline row separators |
| Timeline | 4px track `--border`, progress `--foreground` (not blue), slide ticks `--muted-foreground` |
| Chapter labels | 13px `--muted-foreground` |

## Icons (replaces all emoji)

Central Icons, round/filled/fully-rounded. Inline `<svg viewBox="0 0 24 24" fill="currentColor">` paths in a small `ICONS` map (pattern: `ui_kits/console/lib.js` CENTRAL_ICONS). 16px default, 14px small.

Available in the export (`assets/icons/`): activity, chevrons-up-down, credit-card, ellipsis, folder-kanban, git-branch, github, layout-dashboard, moon, plus, search, search-stroked, settings, shield-alert, shield-check, sun, trash-2, user-plus, users. Player additionally needs: play, pause, captions, book-open, gauge, x-close, chevron-right, lightbulb, flag, check, arrow-up-right — export these from Central Icons in the same round/filled style (swap `fill="black"` for `currentColor`).

Sizing: icon-only buttons 34x34; icon+label gap 6px.

## Copy rules

Sentence case everywhere; uppercase only for kickers. Labels 1-2 words. Terse, factual status language. Numbers and timecodes in mono. No exclamation marks, no marketing tone.

## Anti-patterns (what got us here)

- Navy/indigo/purple palettes or blue-tinted dark grays
- Emoji as icons
- Solid saturated color fills on large surfaces
- Glow, gradient, backdrop-blur
- Shadows on resting cards
- Decorative/bouncy animation

## Implementation note for the skill

Copy `tokens/*.css` from the Nova export verbatim into the skill's `assets/`, wrap dark as `.dark` + `@media (prefers-color-scheme: dark)` (system-following default, per decision). Component CSS follows `components/nova-ui.css` conventions (data-slot/data-variant keyed). Icon map as `assets/icons.js` built from `assets/icons/*.svg`. Note Nova's font caveat: Inter + Geist Mono load from Google Fonts; for fully-offline single-file output, subset and embed woff2, else fall back to system stack.

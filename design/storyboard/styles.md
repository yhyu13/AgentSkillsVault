# Signature style systems

A *style* is a named bundle of palette + type + motion vocabulary + transition palette + pacing. Picking one in the `concept` phase gives the whole video a coherent identity instead of a grab-bag of presets. Coherence is what separates "designed" from "templated."

> In the concept phase, pick ONE style (or let the user pick). Carry its tokens into the build. Don't mix two styles in one video.

Each style below lists: **palette**, **type**, **motion vocabulary** (the presets it favors), **signature emphasis** (the one preset reused for big moments), **transitions**, **pacing**, and **when to use**.

---

## `kurzgesagt` — playful explainer

The friendly-science look. Flat shapes, bright on dark, lots of small life.

- **Palette**: deep navy/charcoal background (`#1B2A4A`), bright saturated accents (coral `#FF6B6B`, teal `#4ECDC4`, yellow `#FFE066`, lavender `#A78BFA`). Multiple accents, used boldly.
- **Type**: rounded geometric sans (Quicksand, Baloo, Nunito). Friendly, medium weight. Titles 110–130px.
- **Motion vocabulary**: `scaleIn`, `bounce`, `wobble`, `float` (loop), `orbit` (loop), `pathdraw` for connective lines, `particles` for ambient life. Everything has a little secondary motion — nothing sits still.
- **Signature emphasis**: `bounce` (playful arrival).
- **Transitions**: `dissolve` and `irisIn`. Soft, never harsh.
- **Pacing**: medium-fast, 8–11s beats, always an ambient loop on something.
- **When**: education, nonprofit, "explain a complex thing warmly," kids/family.

## `apple-keynote` — premium product

Restraint, negative space, one hero element at a time, deep blacks.

- **Palette**: true black or near-black (`#000` / `#0A0A0A`) OR clean white (`#FBFBFD`). One accent max, often a product-derived gradient. Lots of empty space.
- **Type**: tight grotesk (SF Pro, Inter, Helvetica Now). Heavy weight on the hero word, light everywhere else. Titles 130–170px, `letter-spacing:-0.03em`.
- **Motion vocabulary**: `fadeUp` with long durations, `gradientSweep`, `focusBlur`, `cameraZoom` (slow push), `scaleIn` (subtle, 0.95→1). Calm. One thing moves at a time.
- **Signature emphasis**: `scaleIn` with a custom `data-spring="120,18"` (gentle, premium settle).
- **Transitions**: `cut` mostly; `dissolve` for chapter breaks. Never kinetic.
- **Pacing**: slow, confident. 10–14s beats. Hold on stillness — use the breath beat often.
- **When**: product launches, premium B2B, anything that should feel expensive.

## `documentary` — cinematic, photographic

Footage-and-VO feel. Full-bleed imagery, lower-thirds, vignettes.

- **Palette**: desaturated photography + one editorial accent (often a warm amber or a cold steel blue). Dark veils over images.
- **Type**: editorial serif for headlines (Tiempos, Playfair) OR condensed sans (Oswald). Lower-third placement.
- **Motion vocabulary**: `kenburns` on every photo (always), `wordReveal` for narration sync, `tracking`, `fadeIn`, vignette overlays. Text is quiet; the photography carries.
- **Signature emphasis**: `wordReveal` synced to the VO (the words land as spoken).
- **Transitions**: `dissolve` exclusively. Film never cuts hard here.
- **Pacing**: slow, breathing. 11–15s beats. Let images sit.
- **When**: brand stories, mission films, case studies, emotional arcs.

## `bold-editorial` — magazine / statement

Big type as the hero. Type IS the design. High contrast, confident.

- **Palette**: two-color or three-color max, high contrast (black + one hot accent + paper). Think Pentagram, Bloomberg Businessweek.
- **Type**: oversized display (Druk, Anton, Archivo Black). Titles fill the frame, 160–220px. Mixed weights/sizes in one headline.
- **Motion vocabulary**: `letterSpring`, `scramble`, `revealUp` (type wipes up behind a mask), `splitReveal`, `slideInLeft` for stacked lines, `highlight`. Type-forward.
- **Signature emphasis**: `letterSpring` (per-letter arrival on the hero word).
- **Transitions**: `wipe` and `blocks` (editorial bars). Decisive.
- **Pacing**: punchy, 6–9s beats. Quick, declarative.
- **When**: opinion/thought-leadership, manifestos, bold brand statements, launch teasers.

## `data-journalism` — numbers-first

The chart is the star. Clean, trustworthy, FiveThirtyEight/NYT-graphics energy.

- **Palette**: white or light-gray background, ink text, a small ordered categorical palette for series (one per data category). Restrained.
- **Type**: clean sans (Inter, Source Sans) + monospace for figures/labels (JetBrains Mono). Titles modest 60–80px — the data is bigger than the headline.
- **Motion vocabulary**: `barGrow`, `donutSweep`, `ringFill`, `lineDraw`, `counter`, `comparisonBar`. Charts draw on the audio clock as the narrator cites them. Minimal decoration.
- **Signature emphasis**: `counter` (the number lands) + a `highlight` on the key figure.
- **Transitions**: `cut` and `flash` (on a data reveal). Crisp.
- **Pacing**: medium, paced to let each stat register — hold ≥1.5s after a counter settles. 10–12s beats.
- **When**: reports, metrics, financial/scientific explainers, anything where the proof is quantitative.

## `neon-tech` — dark, glowing, futuristic

The showcase look. Dark canvas, glowing accents, glassy depth, 3D.

- **Palette**: near-black (`#05060a`), electric accents (violet `#7C5CFF`, mint `#19E3B1`, hot pink `#FF5C8A`), glow orbs, faint grid backdrop.
- **Type**: techy grotesk (Space Grotesk, Geist) + mono labels. Gradient-fill on heroes.
- **Motion vocabulary**: `letterSpring`, `gradientSweep`, `flipInY`/`tiltIn` (3D), `glow` (loop), `breathe` (loop), `beat` (audio-reactive), `scramble`, `donutSweep`. Depth and life everywhere.
- **Signature emphasis**: `spring` + `glow` loop on CTAs.
- **Transitions**: `whipPan`, `flash`, `dissolve`. Kinetic.
- **Pacing**: energetic, 7–9s beats. Always something glowing or breathing.
- **When**: dev tools, AI/SaaS, crypto, anything that wants to feel cutting-edge. (This is the bundled `examples/showcase` look.)

---

## How to apply a style in the build

1. In `concept.md`, set `"style": "<name>"` in the JSON block and copy its palette into `visual_direction` and its signature into `signature_motion`.
2. In `storyboard.html`, set the CSS `:root` tokens to the style's palette (`--accent`, `--accent2`, `--highlight`, fonts).
3. When authoring each beat, draw presets from that style's **motion vocabulary** first. Reach outside it only when a beat genuinely needs something the vocabulary lacks.
4. Use the style's **signature emphasis** on your 3 biggest moments (see `animator.md § Signature motion`).
5. Use only the style's **transitions**.

## Inventing a style

If the brand doesn't fit any of the six, derive a new one the same way: pick a palette (bg + 1–3 accents + highlight), a type pairing (display + mono/body), a motion vocabulary of 6–8 presets, ONE signature emphasis preset, a transition pair, and a pacing range. Write it into `concept.md` so the build stays coherent. If a `brand-profile.json` exists (from the `/ads` skill), derive the palette and type from it automatically.

---

## Transition vocabulary per style (v0.4)

Each style has a coherent transition pair. Use these, not a random one per slide.

| Style | Default transition | Accent (earned beats) | Avoid |
|---|---|---|---|
| `kurzgesagt` | `crossDissolve` | `irisOpen`, `spinZoom` | glitch, whipPan |
| `apple-keynote` | `cut` | `fade`, `crossDissolve` (slow) | glitch, spinZoom, blocks |
| `documentary` | `crossDissolve` | `fade`, `blurThrough` | push*, glitch, flip3D |
| `bold-editorial` | `cut` | `barWipe`, `pushLeft`, `blocks` | blurThrough, irisOpen |
| `data-journalism` | `cut` | `flash` (on a data reveal), `crossDissolve` | flip3D, spinZoom, glitch |
| `neon-tech` | `crossDissolve` | `glitch`, `whipPan`, `flip3D`, `zoomIn` | (anything goes — it's maximal) |


---

## `playful-pop` — maximal fun (v0.7)

Loud, joyful, social-first. The "lean into playful" default.

- **Palette**: bright multi-accent on a soft or dark bg (violet `#7C5CFF`, mint `#19E3B1`, hot pink `#FF5C8A`, gold `#FFD166`). Saturated, high-energy.
- **Type**: rounded heavy display (Poppins, Baloo, Fredoka). Big, friendly.
- **Motion vocabulary**: `spring`, `bounce`, `emojiPop`, `confettiBurst`, `partyPopper`, `starPop`, `ratingStars`, `floatEmojis` (loop), `pulseRings` (loop), `wobble`, `heartBeat`. Something is always celebrating or breathing.
- **Signature emphasis**: `bounce` / `confettiBurst` on every payoff.
- **Transitions**: `spinZoom`, `zoomIn`, `whipPan`, `irisOpen`. Kinetic and fun.
- **Pacing**: fast, 5–8s beats. Frequent micro-delight.
- **When**: social media, hype reels, app launches, anything aimed at a young/consumer audience or made to be shared.

### Maximal-dazzle bias (when the user wants playful)
For `playful-pop`, `kurzgesagt`, and `neon-tech`, bias toward: a fun-pack loop (`sparkle`/`floatEmojis`/`pulseRings`) on most beats, a celebration (`confettiBurst`/`fireworks`/`partyPopper`/`badgeUnlock`) on every genuine win, and emoji presets for quick reactions. Keep the ≤3-showy-*transitions* rule, but dazzle *effects* can fire more often here than in the restrained styles. Never let dazzle obscure the words — loops stay low-contrast, celebrations stay brief.

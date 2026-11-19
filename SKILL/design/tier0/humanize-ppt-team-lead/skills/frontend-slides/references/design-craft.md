# Design craft: choosing a look before touching HTML

`STYLE_PRESETS.md` lists the presets; `html-template.md` is the scaffold. This file is
the decision layer between them — how to pick, and what makes a deck read as designed
rather than generated.

## Pick by scene, not by taste

| Scene | Preset bias | Why |
|---|---|---|
| Internal review / status | quiet neutral, high data density | the numbers are the argument |
| Technical talk | editorial serif + mono accents | reads as authored, survives projector |
| Launch / keynote | high contrast, one accent, big type | seen from 10 m away |
| Teaching / workshop | warm neutral, generous line height | long dwell time per slide |
| Social / 小红书 图文 | portrait ratio, image-first | consumed on a phone |

Ask the user for the scene, not for a color. Non-designers cannot answer "which
aesthetic" but they can answer "who is in the room".

## Non-negotiables

1. **One accent color.** Everything else is neutral. A second accent is a bug.
2. **Two type sizes minimum per slide.** Title and body must differ by at least 1.6×.
3. **Eyebrow lines are cheap elegance.** A 12–13px uppercase label above a title
   does more than a decorative border.
4. **Line length ≤ 42 CJK chars** (≈70 latin chars). Longer means the slide is a document.
5. **Whitespace is a content decision.** If a slide feels empty, cut a sentence rather
   than filling the gap with an icon.

## Motion budget

- Entry: one transition family per deck, 200–400ms.
- Emphasis: only where the audience must look (a number, a before/after).
- Never animate two elements at once in different directions.
- `prefers-reduced-motion` must be honoured: wrap all non-essential animation.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
```

## Keyboard + presenter floor

A deck that cannot be driven from the keyboard is not shippable:

- `←/→` or `PageUp/PageDown` move slides; `Home/End` jump.
- `F` toggles fullscreen, `?` shows the shortcut sheet.
- Slide number visible, current/total, in a corner with 60% opacity.
- Deep link: writing `#7` in the URL opens slide 7.

## Export reality

- PDF export rasterizes the deck: video and WebGL backgrounds degrade to a still.
  State this before the user is surprised.
- Fonts must be system-safe or inlined; a webfont that 404s on export silently falls
  back and reflows every slide.

# {{TITLE}} — Concept

This document is the **plan** before any narration is written. It defines what the video is, who it's for, and what shape it takes. A later `script` phase reads this file. A `build` phase reads both.

The JSON block at the top is the machine-readable spec — keep it in sync with the prose below. When `/storyboard script` or `/storyboard build` runs, it parses this block.

---

## Step 0 — Explore 3 directions before committing (concept intelligence)

Don't write one plan. Sketch **three distinct creative directions** for the same source, then pick. This 5-minute divergence is what separates a designed video from a default one. For each direction give: a one-line angle, the narrative shape, the signature style (from `styles.md`), and the emotional through-line.

| # | Angle (one line) | Shape | Style | Emotional through-line | Best when |
|---|---|---|---|---|---|
| A | _e.g. "the cost of doing nothing"_ | problem-frame-solution | data-journalism | dread → relief | the data is the story |
| B | _e.g. "one person's morning"_ | narrative-arc | documentary | empathy → resolve | the human angle sells it |
| C | _e.g. "the bold claim, defended"_ | question-answer-evidence | bold-editorial | provocation → conviction | you want to stop the scroll |

**Pick one** (note why), then fill the spec below from it. If the user is present, show the three and let them choose. Record the chosen direction in `"chosen_direction"`.

## Step 0.5 — Map the emotional arc

A video that *feels* designed has a shaped energy curve, not a flat one. Assign each beat an **energy** (1–5) and an **emotion**. Aim for contrast: a quiet beat before the big reveal makes the reveal hit. The `"emotional_arc"` array in the JSON captures this; the build uses it to decide where to spend animation intensity (high-energy beats get the signature emphasis + transitions; low-energy beats get the breath).

Example arc for a 6-beat explainer: `[2, 4, 1, 3, 5, 2]` — open calm, raise the problem, drop to a quiet human beat, build, peak at the solution, settle into the CTA. Never flat (`[3,3,3,3,3]` reads as monotone).

```json
{
  "title": "{{TITLE}}",
  "audience": "{{AUDIENCE}}",
  "goal": "{{GOAL}}",
  "duration_seconds": {{DURATION_SECONDS}},
  "shape": "{{SHAPE}}",
  "style": "{{STYLE}}",
  "chosen_direction": "{{CHOSEN_DIRECTION_AND_WHY}}",
  "directions_considered": ["{{DIR_A}}", "{{DIR_B}}", "{{DIR_C}}"],
  "emotional_arc": [{{ENERGY_PER_BEAT}}],
  "aspect": "{{ASPECT_16x9_or_9x16}}",
  "tone": "{{TONE}}",
  "voice": {
    "gender": "{{VOICE_GENDER}}",
    "register": "{{VOICE_REGISTER}}",
    "speed": 0.90
  },
  "visual_direction": {
    "palette": "{{PALETTE}}",
    "type_treatment": "{{TYPE_TREATMENT}}",
    "imagery": "{{IMAGERY}}"
  },
  "beats": [
    {
      "n": 1,
      "label": "{{BEAT_1_LABEL}}",
      "slide_type": "hero",
      "headline": "{{BEAT_1_HEADLINE}}",
      "narration_seed": "{{BEAT_1_NARRATION}}",
      "key_visual": "{{BEAT_1_VISUAL}}",
      "animations": ["typewriter eyebrow", "scaleIn title"],
      "target_seconds": 6
    },
    {
      "n": 2,
      "label": "{{BEAT_2_LABEL}}",
      "slide_type": "cinematic",
      "headline": "{{BEAT_2_HEADLINE}}",
      "narration_seed": "{{BEAT_2_NARRATION}}",
      "key_visual": "{{BEAT_2_VISUAL}}",
      "animations": ["kenburns bg", "slideInLeft headline"],
      "target_seconds": 12
    }
  ],
  "assets_needed": [
    "{{ASSET_1}}",
    "{{ASSET_2}}"
  ],
  "source": {
    "type": "{{SOURCE_TYPE}}",
    "ref": "{{SOURCE_REF}}"
  }
}
```

---

## Audience & goal

**Who's watching:** {{AUDIENCE}}

**What they should walk away with:** {{GOAL}}

## Shape

The video uses the **{{SHAPE}}** shape:

> {{SHAPE_DESCRIPTION}}

Shapes the skill knows about:

| Shape | When to use |
|---|---|
| `problem-frame-solution` | Explainer videos. State a problem, name it, present a structured response. (Reference: srotyboard.) |
| `hook-examples-synthesis` | Persuasion. Open with a hook, give 3 concrete examples, land on the point. |
| `question-answer-evidence` | Thought-leadership. Pose a surprising question, give a contrarian answer, back it up. |
| `walkthrough-steps` | Demos. Each beat is a step; the last is the result. |
| `before-after` | Case studies. Pre-state, intervention, post-state. |
| `narrative-arc` | Brand stories. Setup, conflict, resolution. |

## Beats

The video is **{{BEAT_COUNT}} beats** over **{{DURATION}}**. Each beat is one slide, one idea.

| # | Label | Slide type | Headline | Narration seed | Visual | Time |
|---|---|---|---|---|---|---|
{{BEATS_TABLE}}

## Visual direction

- **Palette:** {{PALETTE_DESCRIPTION}}
- **Type:** {{TYPE_DESCRIPTION}}
- **Imagery:** {{IMAGERY_DESCRIPTION}}

## Assets that need to exist before `build`

{{ASSETS_LIST}}

## Source material

{{SOURCE_DESCRIPTION}}

---

## What happens next

1. **`/storyboard script`** reads this file, expands each `narration_seed` into spoken narration, inserts SSML breaks, and writes `script.md`. Estimated word budget per beat is `target_seconds * 4`.
2. **`/storyboard build`** reads `concept.md` + `script.md` and produces `storyboard.html` from the template, with beats mapped to slide types and animations applied.
3. **You** generate the voice-over in ElevenLabs (export as MP3) and drop it next to the HTML.
4. **`/storyboard verify`** (optional) opens the HTML in the preview MCP, scrubs to each cue, screenshots, and reports any mismatches.

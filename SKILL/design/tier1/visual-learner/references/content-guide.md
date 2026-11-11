# content.json — schema and authoring vocabulary

```json
{
  "title": "How cohort retention works",
  "subtitle": "optional one-liner",
  "speakers": { "A": "Maya", "B": "Sam" },
  "voices":   { "A": "female", "B": "male" },
  "lines": [
    { "speaker": "A", "text": "So what is a cohort, really?", "slide": 1 },
    { "speaker": "B", "text": "Everyone who became a customer in the same month.", "slide": 1,
      "term": "cohort", "note": "Cohorts can also be weekly for fast-moving products." }
  ],
  "slides": [
    { "chapter": "Intro", "html": "<div class='vl-center'>...</div>" }
  ],
  "glossary": [
    { "k": "cohort", "term": "Cohort", "d": "Plain-language definition, 1-3 sentences." }
  ]
}
```

- `lines[].slide` is the index into `slides`. Lines must be in slide order (slide indexes non-decreasing). The slide's start time = start of its first line.
- `slides[].chapter` is REQUIRED and must be very short (1-3 words): it becomes the left-side topic nav that lets viewers jump between topics/questions. Make each label a scannable topic, not a sentence.
- `lines[].term` (optional): glossary key; pops the jargon card when that line starts.
- `lines[].note` (optional): side note shown in the slide margin while that line's slide is active.
- `voices`: "female"/"male" hints mapped per engine, or exact engine voice ids (e.g. "af_heart", "en-US-JennyNeural").

## Slide HTML vocabulary (all Nova-styled by the template)

Layout roots: `vl-center` (title/closing slides), `vl-pad` (standard content), `vl-split` (two columns: `<div class="vl-split"><div>...</div><div>...</div></div>`).

Text: `vl-kicker` (uppercase eyebrow), `<h1>`, `<h2>`, `vl-lead` (larger body), `vl-cap` (caption), `vl-mono` (numbers/code).

Blocks: `vl-cards` (ul, grid of cards; li > `<b>` + `<span>`), `vl-rows` (ul, stacked rows; add `vl-num` for numbering), `vl-steps` (ol), `vl-check` (ul checklist), `vl-quote` (blockquote), `vl-table` (wrap a plain `<table>`), `vl-figure` (image/SVG + `<figcaption>`).

In `vl-rows`/`vl-steps`, an inline `<b>` title must be followed by a separator before the description: write `<b>Title</b> - description` (space, hyphen, space). Never butt text directly against `</b>` - "<b>Repeat</b>Plan" renders as "RepeatPlan".

Status on any li/chip: `is-keep` (green), `is-warn` (amber), `is-drop` (red), `is-info` (blue). Surfaces stay neutral; the class renders a colored leading dot before the `<b>` title (cards/rows) or inside the chip. Never tint borders or backgrounds with status color. Chips: `<span class="vl-chip is-keep">Keep</span>`. For an `is-*` li to show its dot, it needs a `<b>` title.

## Animation classes (trigger when the slide activates; auto-disabled under reduced motion)

- `a-rise` — fade-up. Stagger children: `style="--i:0"`, `--i:1`, ... (80ms steps).
- `a-scale` — subtle scale-in for figures.
- `a-draw` — SVG stroke draw-on. Put on `<path>`/`<line>`/`<circle>` with `stroke` set; template sets dasharray automatically.
- `a-bar` — grows element width from 0 to its inline width (for bar charts: set `style="width:62%"`).
- `a-count` — counts a number up; put target in `data-n="48217"`, optional `data-fmt="$,"`.

Diagrams: inline SVG only, `stroke="currentColor"` / Nova token vars via `var(--chart-3)` etc. Keep under ~40 shapes.

Contrast rule: for colored TEXT or small labels always use the adaptive tokens (`var(--info)` for blue, `--success`/`--warning`/`--destructive`) - never `--chart-4`/`--chart-5` as text color, they fail contrast in dark mode. Chart strokes/fills prefer `--chart-2`/`--chart-3` so they read on both themes.

## Interactive elements (wired by the template via event delegation)

Quiz (single choice, reveals explanation):
```html
<div class="vl-quiz" data-answer="b">
  <p class="vl-q">Which cohort is retaining best?</p>
  <button data-opt="a">2003-01</button>
  <button data-opt="b">2003-04</button>
  <button data-opt="c">2003-05</button>
  <div class="vl-explain">2003-04 holds 22% at month 20 - the highest row.</div>
</div>
```

Flip card (click to reveal): `<div class="vl-flip"><div class="f-front">What does AOV stand for?</div><div class="f-back">Average order value.</div></div>`

Toggle comparison (A/B states): 
```html
<div class="vl-toggle" data-labels="Before|After">
  <div class="t-a">...state A markup...</div>
  <div class="t-b">...state B markup...</div>
</div>
```

Hotspots on a figure: `<div class="vl-hotspots"><img|svg.../><button class="vl-spot" style="left:40%;top:30%" data-tip="Explanation shown on click"></button></div>`

Rules: interactives pause well - the player keeps playing; invite the listener to pause ("hit space, try this"). Every interactive needs a non-interactive takeaway visible after use.

## Script style

Host (A) drives with real questions a newcomer would ask; expert (B) answers concretely with numbers and examples from the source. Sentence case, contractions fine. Lines 8-30 words: TTS reads one line at a time. End with a recap slide + what-to-do-next.

Tone: calm, concise, direct, professional. Explain simply without dumbing down. Banned: hype and filler ("Let's go!", "Recap time!", "the famous...", "awesome", "dive in"), exclamation marks, radio-host energy, "welcome back". Prefer short declarative sentences; enthusiasm comes from clarity, not punctuation.

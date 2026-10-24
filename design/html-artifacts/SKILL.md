---
name: html-artifacts
description: >-
  Build a single self-contained, interactive HTML artifact and pop it open in
  the browser. Covers reports, slide decks, flowcharts/diagrams, design systems,
  component sheets, clickable prototypes, animation sandboxes, code-review / PR
  writeups, module maps, research explainers, status / incident reports, and
  throwaway editor UIs (triage board, feature-flag toggler, prompt tuner).
  Reach for this WHENEVER the user wants to SEE something instead of reading
  prose about it — phrases like "make an HTML page/artifact", "build me a
  deck / report / diagram / mockup / dashboard / prototype", "show me this as a
  webpage", "visualize this", "render this", "pop it open / 弹开看看",
  "做成一页 HTML", or any time the answer lands better as a spatial, interactive
  page than as markdown. Output is one self-contained .html saved to
  ~/.claude/artifacts/ and opened in the browser, styled with the Claude
  editorial design system and modeled on the bundled reference/*.html pattern
  library ("the unreasonable effectiveness of HTML"). NOT for shippable
  production UI / React components, and NOT a replacement for /talk-html when
  the user specifically wants a shareable gist recap link.
---

# HTML Artifacts — the unreasonable effectiveness of HTML

Markdown flattens things that are inherently spatial or interactive: a diff, a
module graph, a set of design options, a four-screen flow, a 30-ticket backlog.
A single self-contained HTML file renders them *as themselves* — the human
**reacts to the thing** instead of imagining it from a description. That tighter
feedback loop is the whole point. This skill builds that file, drops it in
`~/.claude/artifacts/`, and pops it open.

The bundled `reference/*.html` is a library of 20 worked examples (from Thariq
Shihab's "The unreasonable effectiveness of HTML"). They are the source of truth
for *how good these should look and feel* — **read the one closest to the task
before writing**, then adapt. Don't reinvent; the references already solved
layout, interaction, and polish for each genre.

## When to reach for this

- The user asks for an HTML page / artifact / "one-pager" / webpage to look at.
- The answer is a **report, plan, deck, diagram, design, prototype, explainer,
  or a small editing UI** — anything in the index below.
- The content is **spatial** (diffs, maps, timelines, flowcharts) or wants
  **interaction** (toggles, sliders, drag, live-rerender, arrow-key nav).
- The user says "pop it open", "弹开看看", "做成一页", "show me", "visualize".

Skip it for: production UI / React components (build those for real), pure data
files, or when the user explicitly wants `/talk-html` to publish a shareable
gist recap.

## Workflow

1. **Pick the genre → open the matching reference.** Map the request to a row in
   the index, then actually `Read` that `reference/<file>.html`. It shows the
   layout, the interaction model, and the quality bar to match.
2. **Build ONE self-contained `.html`.** Everything inline — no CDN fonts, no
   external scripts, no build step. Vanilla HTML + CSS + a little JS; inline
   `<svg>` for diagrams. It must open correctly from a `file://` path with no
   network. Use the house design system below.
3. **Save to `~/.claude/artifacts/` and pop it open.** Use the helper (it ships
   inside this skill's own folder — adjust the path to wherever this skill is
   installed; in this repo that is `.kilo/skills/html-artifacts/`):

   ```bash
   bash <this-skill-dir>/scripts/open-artifact.sh <slug> [source.html]
   ```

   It writes `~/.claude/artifacts/<slug>.html` (from a file arg or stdin),
   `open`s it in the default browser, and prints the absolute path. Then tell the
   user the path. Reuse-friendly slugs: `status-report-w24`, `deploy-flowchart`,
   `triage-board`. Add a date suffix (`-2026-06-29`) when versions matter.

## Reference library — index

Every file is a full, self-contained example. **Read the closest match before
building.** Live versions: `https://thariqs.github.io/html-effectiveness/<file>`.

### Exploration & Planning
| # | reference file | build this when you need… |
|---|---|---|
| 01 | `01-exploration-code-approaches.html` | **Three code approaches** side-by-side, trade-offs called out inline — for "which way should we solve this?" |
| 02 | `02-exploration-visual-designs.html` | **Visual design directions** — a few layout/palette options rendered live so the user reacts instead of imagining. |
| 16 | `16-implementation-plan.html` | **Implementation plan** to hand off — milestone timeline, data-flow diagram, inline mockups, the risky code, a risk table. |

### Code Review & Understanding
| # | reference file | build this when you need… |
|---|---|---|
| 03 | `03-code-review-pr.html` | **Annotated pull request** — a diff with margin notes, severity tags, jump links. Scans better than a terminal. |
| 17 | `17-pr-writeup.html` | **PR writeup for reviewers** — author's side: motivation, before/after, file-by-file tour with the *why*, where to focus. |
| 04 | `04-code-understanding.html` | **Module map** — an unfamiliar package as boxes + arrows, hot path highlighted, entry points listed. |

### Design
| # | reference file | build this when you need… |
|---|---|---|
| 05 | `05-design-system.html` | **Living design system** — colors, type scale, spacing tokens as copy-able swatches. |
| 06 | `06-component-variants.html` | **Component variants** — every size / state / intent of one component on a single review sheet. |

### Prototyping
| # | reference file | build this when you need… |
|---|---|---|
| 07 | `07-prototype-animation.html` | **Animation sandbox** — a transition in isolation with duration / easing sliders to tune before wiring in. |
| 08 | `08-prototype-interaction.html` | **Clickable flow** — a few screens linked together; enough fidelity to *feel* whether the interaction is right. |

### Illustrations & Diagrams
| # | reference file | build this when you need… |
|---|---|---|
| 10 | `10-svg-illustrations.html` | **SVG figure sheet** — diagrams for a post, drawn inline so each can be tweaked and copied out. |
| 13 | `13-flowchart-diagram.html` | **Annotated flowchart** — a pipeline as a real flowchart; click a step for what runs, timings, failure paths. |

### Decks
| # | reference file | build this when you need… |
|---|---|---|
| 09 | `09-slide-deck.html` | **Arrow-key slide deck** — a short presentation as one HTML file, ←/→ to navigate, no build step. |

### Research & Learning
| # | reference file | build this when you need… |
|---|---|---|
| 14 | `14-research-feature-explainer.html` | **"How a feature works"** — TL;DR box, collapsible request-path steps, tabbed config snippets, FAQ. |
| 15 | `15-research-concept-explainer.html` | **Concept explainer** — a concept taught with a live interactive widget, a comparison table, a hover-linked glossary. |

### Reports
| # | reference file | build this when you need… |
|---|---|---|
| 11 | `11-status-report.html` | **Weekly status** — what shipped, what slipped, a small chart, formatted for a Monday skim. |
| 12 | `12-incident-report.html` | **Incident timeline** — post-mortem with a minute-by-minute timeline, log excerpts, follow-up checklist. |

### Custom Editing Interfaces (throwaway tools that keep a human in the loop)
| # | reference file | build this when you need… |
|---|---|---|
| 18 | `18-editor-triage-board.html` | **Ticket triage board** — drag tickets across Now / Next / Later / Cut, then copy the ordering out as markdown. |
| 19 | `19-editor-feature-flags.html` | **Feature-flag editor** — toggles grouped by area, dependency warnings, a "copy diff" button for changed keys. |
| 20 | `20-editor-prompt-tuner.html` | **Prompt tuner** — editable template with highlighted variable slots; sample inputs re-render live as you type. |

## House design system (Claude editorial)

The references share one look: warm ivory paper, a clay accent, serif display
headings over a sans body, mono for labels and code. Reusing it makes new
artifacts feel native. Drop this in `<head>` and build on it:

```html
<style>
:root{
  --ivory:#FAF9F5; --paper:#FFFFFF; --slate:#141413;
  --clay:#D97757; --clay-d:#B85C3E; --oat:#E3DACC; --olive:#788C5D;
  --g100:#F0EEE6; --g200:#E6E3DA; --g300:#D1CFC5; --g500:#87867F; --g700:#3D3D3A;
  --serif:ui-serif,Georgia,"Times New Roman",Times,serif;
  --sans:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  --mono:ui-monospace,"SF Mono",Menlo,Monaco,Consolas,monospace;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--ivory);color:var(--slate);font-family:var(--sans);
  line-height:1.55;-webkit-font-smoothing:antialiased}
.wrap{max-width:1120px;margin:0 auto;padding:0 32px 140px}
h1,h2,h3{font-family:var(--serif);font-weight:500;letter-spacing:-.018em}
h1{font-size:clamp(38px,5.4vw,62px);line-height:1.06}
h1 em{font-style:italic;color:var(--clay)}
.eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.12em;
  text-transform:uppercase;color:var(--g500)}
code,kbd,.mono{font-family:var(--mono)}
a{color:var(--clay)}
</style>
```

Type roles: **serif** = display headings (italic + clay for emphasis);
**mono** = eyebrows, labels, tags, code, numbers; **sans** = body. The clay
`#D97757` is the only loud color — use it sparingly for the one thing the eye
should land on. Greys (`--g100…g700`) carry structure.

## Principles that make these work

- **Self-contained, always.** One file, no network. It must open from
  `file://` with fonts, styles, scripts, and SVG all inline. This is why the
  user can keep it, mail it, and reopen it next month.
- **Spatial beats linear.** If the content has a shape — a graph, a timeline, a
  before/after — draw the shape. That's the edge over markdown.
- **Earn every interaction.** Add a slider, toggle, drag, or live-rerender only
  where the human's *decision* improves by playing with it (tuning an easing,
  ordering a backlog). Static content stays static — don't bolt on motion.
- **Include the exit.** Editing UIs (18–20) end in a **copy-out** button —
  markdown, a diff, a JSON blob — so the human's decisions flow back into the
  real workflow. An interface with no export is a dead end.
- **Skim-first hierarchy.** Lead with the TL;DR / the chart / the headline
  number. Collapsible sections and tabs hold the detail. Respect the Monday-
  morning skim.
- **Quiet, confident polish.** Generous whitespace, one accent color, real type
  hierarchy. Match the reference's restraint — no gradients-on-everything.

## Saving & popping open

- Default path: `~/.claude/artifacts/<slug>.html` (the dir already exists).
- Helper does write + `open` + prints the path:
  ```bash
  # from an existing file:
  bash <this-skill-dir>/scripts/open-artifact.sh deploy-flowchart /tmp/draft.html
  # or pipe content in:
  cat <<'HTML' | bash <this-skill-dir>/scripts/open-artifact.sh status-report-w24
  <!doctype html>...
  HTML
  ```
- After opening, **report the path** so the user knows where it lives. Popping
  open is the deliverable — the user reads the page in the browser, not in chat.

## Anti-patterns

- ❌ Linking external CSS/JS/fonts (breaks offline, breaks `file://`). Inline it.
- ❌ Pulling in React / Vue / a bundler for a throwaway artifact. Vanilla only.
- ❌ Writing a prose document and calling it HTML. If it's just paragraphs, it
  should have been markdown — this skill is for things prose can't hold.
- ❌ Building without reading the closest reference first. The reference is the
  quality bar; skipping it produces generic output.
- ❌ Saving somewhere other than `~/.claude/artifacts/`, or forgetting to
  `open` it. The user expects it on screen.

## Credits & license

The 20 `reference/*.html` files are from
[ThariqS/html-effectiveness](https://github.com/ThariqS/html-effectiveness)
("The unreasonable effectiveness of HTML"), © 2026 Anthropic PBC, Apache-2.0,
bundled here **unmodified** with their original per-file copyright headers. See
`NOTICE`. The skill scaffolding is © 2026 Liu Shiyu, Apache-2.0 (`LICENSE`).

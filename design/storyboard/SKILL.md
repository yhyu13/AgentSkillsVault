---
name: storyboard
description: "Turn a webpage, pasted information, a local document (PDF/MD/DOCX), or an existing HTML deck into a playable, screen-recordable storyboard video. Claude acts as the animator — choreographs each beat using a decision matrix (animator.md), the 12 principles of animation, signature style systems (styles.md: kurzgesagt/apple-keynote/documentary/bold-editorial/data-journalism/neon-tech), and a composable motion engine (storyboard-engine.js) driven by the audio clock. Composable motion: per-element easing + tunable spring physics, data-stagger to cascade containers, data-then to chain sequences, data-loop for continuous ambient motion (float/breathe/orbit/beat-sync), 3D presets (flipInY/tiltIn/cardFlip), animated data-viz (barGrow/donutSweep/lineDraw/comparisonBar that draw on the clock), cinematic shared-element morph transitions and a keyframed camera rig. Concept intelligence: explores 3 creative directions then picks, maps an emotional-energy arc across beats. Multi-phase: concept (structured plan), script (ElevenLabs-ready narration with SSML breaks), optional generate (calls ElevenLabs MCP or CLI for MP3 + word timestamps), build (HTML with creatively-authored animations + scene transitions + word-sync hits), audit (programmatic acid-test against animator.md), verify (preview-MCP playthrough), render (headless Chromium + ffmpeg -> MP4). Two templates: 1920x1080 horizontal (YouTube/web) and 1080x1920 vertical (Reels/TikTok/Shorts) — render auto-detects the aspect from the deck. Adopt mode injects a control + animation overlay into your existing HTML without modifying its styles. AAF support via pyaaf2 for sample-accurate sync from any DAW. In-page calibration tool for tap-to-tune retiming. Presets include: fadeIn/Up/Down, slideIn, scaleIn, anticipate, overshoot, spring, bounce, wobble, shake, squash, pulse, typewriter, wordReveal, tracking, gradientSweep, splitReveal, counter, kenburns, cameraZoom, cameraPan, focusBlur, parallax, glow, flicker, highlight, particles, confetti, rays, reveal, revealUp, irisIn, pathdraw, morph, motionPath, lottie, rackFocus, defocus, vignette, cinematicGrade, filmGrain. Senior composition: multiplane depth (data-plane layers parallax during camera moves), depth-of-field (rackFocus/defocus), film grade (cinematicGrade + filmGrain), moving holds (data-hold keeps settled elements alive). Raw-motion pack (v0.5): kinetic typography (lineReveal mask-rise, wordSwap phrase-hits), hand-drawn annotations (underlineDraw, circleScribble, boxDraw, strikethrough) that draw onto an emphasized word, exit animations (data-exit: fadeOut/slideOut*/scaleOut/popOut/blurOut so content cycles instead of piling up), living backgrounds (aurora drifting gradient, constellation connected-dot canvas). Cinematic slide transitions (slides stack in place and animate against each other — NOT a scroll): cut, crossDissolve, fade, pushLeft/Right/Up/Down, coverLeft, revealRight, zoomIn, zoomOut, flip3D, spinZoom, whipPan, blurThrough, irisOpen, barWipe, glitch, flash, blocks. Word-sync via ElevenLabs timestamps for per-word visual hits. Fun pack (v0.7): ~24 owned, brand-colored, render-safe dazzle effects — confettiBurst, fireworks, checkDraw, crossDraw, spinner, dotsLoader, pulseRings, waveform (beat-reactive), sparkle, starPop, heartBeat, coinFlip, trophyShine, badgeUnlock, ratingStars, emojiPop, thumbsUp, lightbulb, partyPopper, rocketLaunch, burstLines, shimmerSweep, confettiRain, floatEmojis — plus a curated 108-entry Lottie index (lottie-library.json) + lottie_fetch.py to pull richer illustrated Lotties on demand (license-tracked, offline-safe). `playful-pop` style for maximal fun. Trigger on: storyboard, make a video, video script, narrated slides, explainer video, playable deck, voice-over slides, scrollytelling video, adopt this HTML as a video, narrate this page, animate this, motion graphics, vertical video, Reels, TikTok, Shorts, make it fun, dazzling, confetti, celebrate, fun animation, lottie."
trigger: /storyboard
---

# /storyboard

Turn an input — a URL, pasted information, a local document, **or an existing HTML deck/page** — into a **playable storyboard**: an HTML file you can open in a browser, press play on, and screen-record into a finished video.

Final output is a project directory:

```
storyboard-<slug>/
├── concept.md         # the plan (audience, shape, beats, visual direction)
├── script.md          # ElevenLabs-ready narration + per-beat timing table
├── storyboard.html    # the playable deck (or an adopted copy of your input HTML)
├── animations.md      # symlink/copy of the preset reference (optional)
└── playthrough/       # screenshots from /storyboard verify (only if run)
    ├── cue_01_slide_1.png
    └── ...
```

A complete worked example lives in this repo at `examples/stripe-radar/` — see that directory for an end-to-end demo (`concept.md`, `script.md`, `storyboard.html`).

## Usage

```
/storyboard <url>                         # scrape a webpage and build
/storyboard <path-to-pdf-or-md-or-docx>   # use a local document
/storyboard                                # ask for pasted input
/storyboard adopt <path-to-html>          # inject overlay into an existing HTML file
/storyboard adopt <url>                   # fetch a URL into a static snapshot, then adopt

/storyboard concept <input>               # ONLY plan; write concept.md and stop
/storyboard script                        # read existing concept.md, write script.md
/storyboard generate                      # call ElevenLabs (MCP or CLI) -> MP3 + sample-accurate TIMINGS
/storyboard build                         # read concept.md + script.md, render storyboard.html
/storyboard audit                         # programmatic acid-test against animator.md
/storyboard verify                        # use preview MCP to scrub through and screenshot each cue
/storyboard render                        # headless Chromium + ffmpeg -> finished MP4

/storyboard --duration 90s                # target a runtime
/storyboard --out <dir>                   # specific output dir
/storyboard --style dark                  # dark theme variant
/storyboard --beats 12                    # force a beat count
/storyboard --aspect 16:9                 # horizontal (default) — uses template.html
/storyboard --aspect 9:16                 # vertical — uses vertical_template.html (Reels/TikTok/Shorts)
/storyboard --auto-vo                     # run the generate phase automatically after script
/storyboard --voice "Adam" --speed 0.90   # ElevenLabs voice + speed for --auto-vo
/storyboard --render                      # also render the MP4 after build (needs MP3 to exist)
/storyboard --quality fast                # render quality preset (high|fast)
```

## Triggers / when to activate

Activate when the user asks to:
- "Make a video from this page / doc / brief"
- "Turn this into a narrated explainer"
- "Make a storyboard"
- "Create a playable / recordable deck"
- "Adopt this HTML as a video" / "Narrate this page"
- "Voice-over slides for X"

Skip for:
- Static slide decks with no narration (use `slides`)
- Editing an existing finished MP4 (this skill produces source material, not edits)
- One-off banner images (use `banner-design`)

---

# The four phases

The skill is split into four phases. The default `/storyboard <input>` runs the chain end-to-end. Each phase can be run alone — Claude (or the user) can stop at any phase to review.

```
input ─► concept ─► script ─► [generate] ─► build ─► [audit] ─► [verify] ─► [render]
            │         │           │            │          │           │
            ▼         ▼           ▼            ▼          ▼           ▼
       concept.md script.md  VO.mp3 +    storyboard.html  pngs   storyboard.mp4
                             timestamps
```

`[generate]`, `[verify]`, and `[render]` are optional. If `[generate]` is skipped, the user generates the VO manually in ElevenLabs and the build phase ships seeded `TIMINGS` (which the calibration UI or AAF extractor can refine). If `[render]` is skipped, the user screen-records the deck themselves.

The artifacts are the contracts: a later phase only reads files, not memory. This is what makes the skill safe for Claude Code to call as part of a larger workflow.

---

## Phase 1 — `concept`

**Input:** a URL, file path, or pasted text. (Or for adopt mode: an existing HTML file.)

**Output:** `concept.md` — a structured plan with a fenced JSON block at the top.

### How to do it

1. **Resolve the input.**

   | User passed | Action |
   |---|---|
   | A URL | `WebFetch` it with prompt: "Extract the main content, key facts, structure, and any quantitative claims. Preserve any natural narrative arc." |
   | A local `.md` / `.txt` / `.json` | `Read` it directly. |
   | A `.pdf` | Invoke the `anthropic-skills:pdf` skill to extract text. |
   | A `.docx` | Invoke the `anthropic-skills:docx` skill to extract text. |
   | An existing `.html` (adopt mode) | `Read` it; extract section text and existing structure to seed beats. |
   | Nothing | Ask: "Paste source material, give a URL, or point at a file/HTML." |

2. **Pick a target duration and beat count.**

   Default: **2 minutes** (~480 spoken words at speed 0.90). Override with `--duration`.

   | Target | Beat count | Words per beat |
   |---|---|---|
   | 0:30 | 4-6 | ~20 |
   | 1:00 | 6-9 | ~25 |
   | 2:00 | 10-15 | ~32 |
   | 3:00 | 14-20 | ~40 |

3. **Choose a narrative shape** from the table below. If the source material implies one (the bundled Stripe Radar example uses *problem → frame → solution → structure → CTA*), respect that; otherwise pick the cleanest fit for the source's natural arc.

   | Shape | When to use |
   |---|---|
   | `problem-frame-solution` | Explainer videos. State a problem, name it, present a structured response. |
   | `hook-examples-synthesis` | Persuasion. Hook, 3 concrete examples, land the point. |
   | `question-answer-evidence` | Thought-leadership. Pose a surprising question, give a contrarian answer, back it up. |
   | `walkthrough-steps` | Demos. Each beat is a step; the last is the result. |
   | `before-after` | Case studies. Pre-state, intervention, post-state. |
   | `narrative-arc` | Brand / origin stories. Setup, conflict, resolution. |

4. **Draft the beats.** For each beat fill in:
   - `n`, `label` (short jump-menu label)
   - `slide_type` — one of: `hero`, `cinematic`, `list`, `stat`, `twocol`, `diagram`, `cta`, or a name from your adopted HTML
   - `headline` — the visible text
   - `narration_seed` — 1-2 sentences of the spoken line (the script phase will polish)
   - `key_visual` — image filename or visual description
   - `animations` — names of `data-anim` presets you'll use (see `animations.md`)
   - `target_seconds` — your time budget for this beat

5. **Pick a visual direction.** Palette (warm/cool/mono, hex anchors), type treatment (serif/sans/display), imagery (photographic/illustrated/data viz). The `concept.template.md` block carries this.

6. **Write `concept.md`** by filling in `concept.template.md`. The JSON block at the top is the source of truth — keep it in sync with the prose.

### When to stop here

- The user passed `--phase concept`.
- The source material is thin or ambiguous and you want a confirmation before drafting copy.
- You're the orchestrator of a larger workflow and want to hand the plan to a different agent.

---

## Phase 2 — `script`

**Input:** `concept.md` (and source material if you still need it).

**Output:** `script.md` — ElevenLabs-ready narration plus the per-beat timing table.

### How to do it

1. Parse the JSON block from `concept.md`. The `beats` array drives the script.

2. **Expand each `narration_seed`** into spoken narration. Rules:
   - Word budget per beat: `target_seconds × 4` at speed 0.90.
   - Short sentences. Concrete nouns. One idea per sentence.
   - Use parallel structure when listing — they read well aloud AND animate well as staggered children.

3. **Insert SSML breaks** between beats:
   - `<break time="0.7s" />` between sibling beats
   - `<break time="1.0s" />` between major sections
   - `<break time="1.5s" />` for the dramatic pivot (e.g. problem → solution)

   Each `<break>` contributes its X seconds at zero words — count it against the time budget but not the word budget.

4. **Write `script.md`** by filling in `script.template.md`. The required sections:
   - The full SSML block (paste-into-ElevenLabs)
   - The ElevenLabs settings table (Multilingual v2, speed 0.90, etc.)
   - A fallback block with ellipses for when SSML is stripped
   - The per-beat breakdown table (`| n | M:SS | narration excerpt |`)
   - The `TIMINGS` JS array, seeded from the breakdown

### Validating the timing seed

For each beat the cue time is:

```
cue_time(n) = sum(target_seconds[1..n-1]) + sum(break_durations_so_far)
```

Round to one decimal. These are seeded values — the user (or the verify phase) will tune them after the MP3 is generated.

### When to stop here

- The user passed `--phase script`.
- The user wants to edit narration before HTML is rendered.
- You want to ship a script for a human to record (no video yet).

---

## Phase 2.5 — `generate` (optional — render the VO with ElevenLabs)

**Input:** `script.md` (the SSML block in section 1).

**Output:** `<out>/VO English.mp3`, `<out>/word_timestamps.json`, and (optionally) a `TIMINGS` array written directly into `storyboard.html`.

This phase is opt-in. The default flow keeps the user in control of voice / take selection. Three ways to voice the script:

### Path 0 — Free voice, no API key (recommended default)

`tts_free.py` uses free Microsoft Edge neural voices (needs `python -m pip install edge-tts` and internet). It voices each beat separately and joins them with exact pauses, so slide cues are **exact**, and writes word timestamps too:

```bash
python ~/.claude/skills/storyboard/tts_free.py script.md --apply storyboard.html
python ~/.claude/skills/storyboard/tts_free.py --list-voices en-
```

It reads the beats JSON block in `script.md` (a fenced json block `{"beats":[{"slide":1,"text":"...","pause_after":0.7}, ...]}` — always include one), falling back to splitting the SSML block on `<break>` tags. Outputs `voiceover.mp3` + `word_timestamps.json` (`{source, audio, duration, words:[{text,start,end}], cues:[{slide,time}]}`) and, with `--apply`, rewrites `const TIMINGS` / `const WORDS` in the deck. Default voice `en-US-AndrewMultilingualNeural`; `--voice`, `--rate "-5%"`. Best for drafts and personal projects — for commercial work prefer ElevenLabs.

Before the first run on a machine, run `python ~/.claude/skills/storyboard/doctor.py` (add `--smoke` for a 2-second test render) — it checks Playwright/Chromium, ffmpeg, edge-tts, ElevenLabs and prints fix commands. `python ~/.claude/skills/storyboard/new_project.py <dir> --aspect 16:9|9:16 --title "..."` scaffolds a project (template, engine, concept/script skeletons).

ElevenLabs, either way:

### Path A — Inside Claude Code (ElevenLabs MCP available)

If the `mcp__ElevenLabs_Player__generate_tts` (or equivalent ElevenLabs) tool is available, use it:

1. Read the SSML block from `script.md` (the first fenced code block in section 1).
2. Call the MCP tool with the SSML, voice (default "Adam"), model `eleven_multilingual_v2`, speed 0.90.
3. Save the returned audio bytes to `<out>/VO English.mp3`.
4. If the MCP returns word/character timestamps, save them to `<out>/word_timestamps.json` and compute TIMINGS from them — find each break ≥ 0.8s between voiced characters; the start of the next character is a slide cue.
5. Rewrite the `const TIMINGS = [...]` block in `storyboard.html` (build phase output) with the computed values.

### Path B — Standalone (no MCP, just an API key)

If running outside Claude Code or the MCP isn't available, the user runs:

```bash
export ELEVENLABS_API_KEY="..."   # (or set in env)
python ~/.claude/skills/storyboard/elevenlabs_generate.py script.md ./out --voice Adam --speed 0.90 --apply storyboard.html
```

The CLI:
- Extracts the SSML block from `script.md`
- Calls ElevenLabs `text_to_speech.convert_with_timestamps`
- Writes MP3 + `word_timestamps.json` to the output dir
- Optionally rewrites the TIMINGS array in `storyboard.html`

Flags: `--voice <name|id>`, `--speed <0.7–1.2>`, `--gap-threshold <s>`, `--slides <N>`, `--apply <html>`.

### When to skip this phase

- The user wants to A/B different voices or takes (default flow lets them re-render in ElevenLabs UI freely)
- They use a DAW for additional sound design — point them at `aaf_to_timings.py` after they export
- Cost-sensitive iteration — every `generate` call charges ElevenLabs credits

### After this phase

The user opens `storyboard.html` and the deck plays with sample-accurate sync — no calibration needed.

---

## Phase 3 — `build` (Claude is the animator)

**Input:** `concept.md` + `script.md` (+ word-timestamp JSON if available).

**Output:** `storyboard.html` — the playable deck, **fully choreographed**.

This is not a layout pass. Your job is to be the animator: for every beat, you choose which elements animate, in what order, with which preset, with what easing, with what transition into the slide, and which word in the narration (if any) gets a visual hit. **Before authoring any beat, re-read `animator.md`** — it's the judgment layer (decision matrix, 12 principles, choreography recipes, composable-motion recipes, data-viz choreography, cinematic recipes, anti-patterns, signature motion). `animations.md` is the technical reference for individual preset signatures + the composable attributes.

Two paths: **from-scratch** (start from `template.html`) and **adopt** (overlay onto existing HTML).

### The composable engine (v0.3)

Decks load `storyboard-engine.js` — a composable motion engine. **Copy `storyboard-engine.js` into the output dir alongside `storyboard.html`** (it's in this skill's directory). The deck declares `const TIMINGS = [...]` then calls `Storyboard.init({timings:TIMINGS, labels:..., fallbackDuration:...})`. Keeping `const TIMINGS` is what lets the Python tooling (audit/aaf/elevenlabs/compress) read and rewrite cues.

Compose motion instead of one-preset-per-element (full reference in `animations.md § Composable motion`):
- `data-ease="outBack"` / `data-spring="200,12"` — per-element curve
- `class="anim-group" data-stagger="0.12"` — cascade a container's children with one instruction
- `data-then="pulse@1.6"` — chain animations after the entrance
- `data-loop="float|breathe|orbit|beat"` — continuous ambient motion (keeps long beats alive)
- 3D: `flipInY`, `tiltIn`, `cardFlip`; text: `letterSpring`, `scramble`
- data-viz: `barGrow`, `donutSweep`, `lineDraw`, `comparisonBar` (charts that draw on the audio clock)
- cinematic: `data-shared-id` (shared-element morph across a cut), `.camera data-camera="..."` (dolly/pan/push-in)

### Pre-flight (do this once before any beats)

1. **Pick a style** from `styles.md` (kurzgesagt / apple-keynote / documentary / bold-editorial / data-journalism / neon-tech, or derive one). Set its palette in the deck's `:root` and carry its motion vocabulary + signature into the build. ONE style per video.
2. **Commit to a signature emphasis preset** — your "this is the moment" entrance (`spring`/`bounce`/`anticipate`/`letterSpring`). Use it on your 3 biggest beats (the energy-5 beats from `concept.md`'s `emotional_arc`).
3. **Commit to a signature ease/spring** — the curve that matches the style's personality, reused on most entrances.
4. **Commit to a transition pair** — the style's non-cut transitions, used only at real section boundaries (≤3 total).

Record these in `concept.md`. Use the `emotional_arc` to decide where to spend intensity: energy-5 beats get the signature emphasis + a transition; energy-1–2 beats get the breath (one quiet anim, no transition, no loop).

### Path A — from scratch

1. **Copy `template.html`** to `<out>/storyboard.html`.

2. **Replace template slides with beat-driven slides.** For each beat in `concept.md`:
   - Pick a slide type (`hero`, `cinematic`, `list`, `stat`, `twocol`, `diagram`, `cta`, or custom). Use the slide-type recipes below as a starting point.
   - Set `data-slide="<n>"` so the engine can compute relative animation times.
   - Set `data-transition-in="<type>"` — slides transition in place (no scroll). Default to `cut` or `crossDissolve`; upgrade to a cinematic transition (pushLeft, zoomIn, flip3D, irisOpen, whipPan, glitch, …) only for genuine pivots. Full catalog in `animations.md § Cinematic slide transitions`; per-style picks in `styles.md`. Max ~3 showy transitions per video.

3. **Wire the audio**, `TIMINGS`, `SLIDE_LABELS`, `FALLBACK_DURATION`. Standard.

4. **Choreograph each beat.** For every beat, run through `animator.md § How Claude should reason about a single beat`:

   1. What's this beat doing in the arc? (Decision matrix row.)
   2. What's the focal element? (Big entrance — your emphasis preset.)
   3. What's the atmospheric/secondary layer? (Background motion — `kenburns`, `parallax`, `particles`. Required on any beat ≥ 8 seconds.)
   4. What stays still? (Most things. The eye needs a rest point.)
   5. Which word, if any, gets a hit? (Add to `WORD_HITS`.)
   6. What transition? (Default `cut`, signature otherwise.)
   7. Math check: last `t_rel + dur` finishes ≥ 0.5s before the next cue.

   Be creative. Use at least 6 distinct presets across the deck — using only `fadeUp` and `scaleIn` is failing the assignment. Combine layers: a `kenburns` background + a `splitReveal` foreground + a `pulse` on a word is a beat that *moves*.

5. **Word-sync** (if word timestamps exist). See below.

### Path B — adopt mode

The user has an existing HTML file or URL and wants to *narrate it as-is*.

1. **Acquire the HTML.**
   - File path: copy to `<out>/storyboard.html`. Also copy any locally referenced assets (images, CSS, fonts) it imports relatively.
   - URL: fetch with `WebFetch`, save as `<out>/storyboard.html`. SPAs / JS-heavy pages won't render meaningfully — warn the user. Static / mostly-static pages work.

2. **Detect slide boundaries.** The overlay's runtime detection (priority order):
   1. `[data-storyboard-slide]`
   2. `.slide` / `.storyboard-slide`
   3. `body > section` / `main > section`
   4. `main` children
   5. `<body>` (fallback single slide)

   If auto-detection picks wrong boundaries, *pre-annotate* the HTML by adding `data-storyboard-slide` to the elements that should be slides.

3. **Read `overlay.html`** from this skill's directory and replace placeholders:
   - `{{AUDIO_SRC}}` — MP3 filename, URL-encoded (the user's default — use `.mp3` unless they ask otherwise)
   - `{{TIMINGS_JSON}}` — `[{"time":0,"slide":1},...]`
   - `{{SLIDE_LABELS_JSON}}` — `["Label 1","Label 2",...]`
   - `{{WORD_HITS_JSON}}` — `[]` if none, else `[{"time":12.34,"sel":"#x","hit":"shake"},...]`
   - `{{FALLBACK_DURATION}}` — seconds

4. **Inject the filled overlay** immediately before `</body>`. Textual insertion at the last `</body>`.

5. **Enhance, don't replace.** This is animator-mode for adopted content:
   - Walk each detected slide. Add `class="anim"` + `data-anim="..."` + `data-t-rel="..."` to existing elements that want choreography. Don't add new visible elements unless a slide is genuinely thin.
   - Set `data-transition-in` per slide (on the slide root element, not `body`).
   - If the host page uses an accent color, match `glow`/`highlight`/`rays` to it (override the engine's default `#3CA8E8`).
   - Add an atmospheric layer if a slide is bare — an SVG `particle-layer` positioned absolutely behind content, with 10–20 `class="anim p" data-anim="particles"` circles.

6. **Drop the MP3 next to the file.** Same as Path A.

### Word-sync — the secret weapon

If a per-word timestamp JSON exists (ElevenLabs returns one if you call the `text_to_speech_with_timestamps` endpoint, or use the bundled `generate` phase), use it.

1. **Parse the timestamps.** The structure is typically `{ "words": [{ "text": "...", "start": s, "end": s }, ...] }`. Adapt to whatever shape you get.

2. **`wordReveal` text** — for any element using `data-anim="wordReveal"`, set `data-t-rel` to the first word's start time minus the slide cue. The preset's internal stagger naturally lands later words near their spoken times.

3. **`WORD_HITS` — per-word visual punches.** Identify 3–5 narration words per minute that deserve emphasis (verbs, surprising nouns, the unit in a stat). Add them to the `WORD_HITS` array:

   ```js
   const WORD_HITS = [
     { time: 12.34, sel: '#bigNoun',     hit: 'shake' },
     { time: 18.71, sel: '.stat-number', hit: 'pulse' },
     { time: 24.50, sel: '.cta-pill',    hit: 'highlight' }
   ];
   ```

   The engine flashes the preset for 0.6s at that exact audio time. **3–5 per minute max** — more becomes noise.

4. **Tag elements with stable IDs** so `WORD_HITS` selectors keep working as the deck evolves.

### Slide-type recipes (Path A — starting points only)

These are starting points, not the choreography. After you copy a recipe, **adjust the presets to your signature motion and the beat's role**. Don't ship a deck where every cinematic slide uses `slideInLeft` on the headline — that's the recipe default, not the animator's choice.

#### Hero (signature: gradient title + typewriter eyebrow + subtitle settle)

```html
<section class="slide" data-slide="N" data-transition-in="cut">
  <div class="camera">
    <div class="slide-center">
      <p class="s-eyebrow anim" data-anim="typewriter" data-t-rel="0.2" data-dur="1.4">Eyebrow</p>
      <h1 class="s-title gradient-fill anim" data-anim="gradientSweep" data-t-rel="1.5" data-dur="2.0">Big Title</h1>
      <p class="s-subtitle anim" data-anim="fadeUp" data-t-rel="3.2">Supporting sentence.</p>
    </div>
  </div>
</section>
```

#### Cinematic photo (Ken Burns + vignette + word-reveal body)

```html
<section class="slide scene-cinematic dark" data-slide="N" data-transition-in="dissolve">
  <div class="scene-bg anim" data-anim="kenburns" data-t-rel="0" data-dur="14"
       data-zoom="0.15" data-dx="-3" data-dy="2"
       style="background-image:url('your-image.jpg');"></div>
  <div class="scene-bg-veil"></div>
  <div class="scene-vignette"></div>
  <div class="scene-content">
    <span class="scene-tag anim" data-anim="fadeIn" data-t-rel="0.3">Tag</span>
    <h2 class="scene-headline anim" data-anim="anticipate" data-t-rel="0.8" data-dur="1.4">Headline.</h2>
    <p class="scene-body anim" data-anim="wordReveal" data-t-rel="2.4" data-dur="2.5">
      Supporting sentence written to be revealed word by word in time with the narration.
    </p>
  </div>
</section>
```

#### List (cascading items + transition-in wipe for chapter feel)

```html
<section class="slide" data-slide="N" data-transition-in="wipe">
  <div class="camera">
    <div class="list-wrap">
      <h2 class="list-title anim" data-anim="fadeUp" data-t-rel="0.2">Title</h2>
      <ul class="list-items">
        <li class="anim" data-anim="slideInLeft" data-t-rel="1.3"><span class="num">01</span><span>First</span></li>
        <li class="anim" data-anim="slideInLeft" data-t-rel="2.2"><span class="num">02</span><span>Second</span></li>
        <li class="anim" data-anim="slideInLeft" data-t-rel="3.1"><span class="num">03</span><span>Third</span></li>
      </ul>
    </div>
  </div>
</section>
```

#### Stat (overshoot counter + transition-in flash for the reveal)

```html
<section class="slide" data-slide="N" data-transition-in="flash">
  <div class="stat-wrap">
    <div class="stat-number anim" data-anim="counter" data-t-rel="0.4" data-dur="2.0"
         data-to="3142" data-suffix="+">0</div>
    <p class="stat-caption anim" data-anim="fadeUp" data-t-rel="2.6">caption</p>
  </div>
</section>
```

#### Diagram (path-draw + motion-path marker)

```html
<section class="slide" data-slide="N" data-transition-in="dissolve">
  <div class="diagram-wrap">
    <h2 class="diagram-title anim" data-anim="fadeUp" data-t-rel="0.2">Title</h2>
    <svg class="diagram-svg" viewBox="0 0 1200 500">
      <path id="route-N" class="draw anim"
            data-anim="pathdraw" data-t-rel="1.2" data-dur="2.4"
            d="M 100 380 Q 600 60, 1100 380" />
      <circle class="anim" data-anim="motionPath"
              data-t-rel="3.7" data-dur="2.0"
              data-path="#route-N"
              r="14" fill="var(--accent)" />
    </svg>
  </div>
</section>
```

#### Two-column (text reveals + media iris-in)

```html
<section class="slide" data-slide="N">
  <div class="twocol">
    <div class="twocol-text">
      <h2 class="anim" data-anim="fadeUp" data-t-rel="0.3">Header</h2>
      <p class="anim" data-anim="wordReveal" data-t-rel="1.2" data-dur="2.5">Body sentence.</p>
    </div>
    <div class="twocol-media anim" data-anim="irisIn" data-t-rel="0.8"
         style="background-image:url('image.jpg');"></div>
  </div>
</section>
```

#### CTA / close (spring + glow loop + transition-in whipPan)

```html
<section class="slide" data-slide="N" data-transition-in="whipPan">
  <div class="cta-wrap">
    <h2 class="cta-title anim" data-anim="spring" data-t-rel="0.3" data-dur="1.4">Call to action</h2>
    <p class="cta-body anim" data-anim="fadeUp" data-t-rel="1.8">Why now.</p>
    <span class="cta-pill anim" data-anim="glow" data-t-rel="3.0" data-dur="4.0">Go</span>
  </div>
</section>
```

#### Lottie (for hand-authored animated graphics)

```html
<section class="slide" data-slide="N">
  <div class="lottie-wrap">
    <div class="lottie-stage anim" data-anim="lottie"
         data-src="character-walk.json"
         data-t-rel="0" data-dur="6.0"></div>
    <div class="lottie-text">
      <h2 class="anim" data-anim="fadeUp" data-t-rel="0.5">Hand-authored animation</h2>
      <p class="anim" data-anim="wordReveal" data-t-rel="1.6" data-dur="3.0">For motion that's beyond the preset library, drop in a Lottie JSON.</p>
    </div>
  </div>
</section>
```

### Patterns from the worked example

For slide types beyond the template (photo-grid scrollytelling, depth diagrams, module-grid cascades), study the bundled `examples/stripe-radar/storyboard.html` for proven CSS recipes you can adapt, or assemble your own with the engine's primitives documented in `animations.md`.

### Preview before the VO exists

The engine has a **synthetic clock** that activates automatically if no audio source is loaded (or the audio errors). A small `PREVIEW (no audio)` badge appears top-left. The deck becomes fully playable from `performance.now()` — Space plays through at 1× speed, arrow keys / jump menu work, animations and transitions render. This is what lets the user (and the `verify` phase) preview the deck before recording the MP3.

You don't need to do anything to enable this — it's automatic. Just mention it in the handoff:

> "Open `storyboard.html` now to preview the timing — you'll see a `PREVIEW (no audio)` badge. Press Space to scrub through. Once the MP3 is in place, the synthetic clock disappears and the real audio drives everything."

### Sync from an AAF export (the fastest path)

If the user exports an AAF from their DAW (Pro Tools, Logic, Reaper, Premiere, etc.), the slide cue times can be extracted with sample accuracy and applied directly — no calibration tapping needed. This is the recommended path when the user has any post-production tool in their workflow.

Use `aaf_to_timings.py` in this skill directory (requires `pip install pyaaf2`, one-time):

```
python ~/.claude/skills/storyboard/aaf_to_timings.py <path-to-aaf>
python ~/.claude/skills/storyboard/aaf_to_timings.py <path-to-aaf> --slides 15
python ~/.claude/skills/storyboard/aaf_to_timings.py <path-to-aaf> --apply <path-to-storyboard.html>
```

Default behavior: filter clips ≥ 2 seconds (drops the short SSML-break / silence clips that ElevenLabs renders between beats), treat each remaining clip as one slide cue in timeline order. Edge cases:

- **No inter-clip breaks** (continuous narration sliced into N clips): pass `--all` to keep every clip.
- **Different clip count than expected**: pass `--slides N` to warn if the kept count mismatches. Inspect with `--list` to see all clips with positions and lengths.
- **Direct write**: pass `--apply storyboard.html` to rewrite the `const TIMINGS = [...]` block in place. Otherwise the script prints a paste-ready block to stdout.

### Calibration — fixing sync drift after the MP3 is in (no AAF available)

The seeded `TIMINGS` come from word-count math (`target_seconds × 4`), so the real ElevenLabs output will drift a few percent per beat — usually 5–15 seconds total over a 2-minute video. The engine ships with a **live calibration mode** so the user can retime by ear without editing the file:

| Key | What it does |
|---|---|
| **T** | Toggle calibration mode on/off (a blue badge appears mid-top) |
| **M** | Mark the current audio time as the next slide's start (slide 1 is always 0) |
| **Backspace** | Undo the last mark |
| **A** | Apply captured cues — rewrites in-memory TIMINGS, re-resolves all animation start times, and **saves to localStorage** so it survives reloads |
| **E** | Export — copies a ready-to-paste `const TIMINGS = [...]` block to the clipboard for permanent commit |
| **Esc** | Exit calibration mode without applying |

There's also a **nudge** for one-off fixes outside calibration mode:

| Key | What it does |
|---|---|
| `[` or `,` | Shift the current slide's cue earlier by 0.25s |
| `]` or `.` | Shift the current slide's cue later by 0.25s |

Calibration auto-loads from localStorage on next page load (a brief "Loaded saved calibration" toast appears). To clear a saved calibration: `STORYBOARD.calib.clearSaved()` from the console.

**Handoff phrasing:**

> "If a slide change feels a beat off, press **T** to enter calibration, press **R** to reset, **Space** to play. Tap **M** each time the narrator hits the start of the next slide. When done, press **A** to apply (your fix persists across reloads) — or **E** to copy a permanent TIMINGS block to paste into the HTML. For one-off fixes use `[` and `]` to nudge the current slide by ±0.25s."

### The acid test before declaring build done

From `animator.md § The acid test`:

- If I muted the audio and watched, would I know what each beat is about?
- If I deleted the visuals and only listened, would the narration still hit?
- Are there at least three beats where the visual is doing *more* than what the narration says?
- Did I use my signature motion at least three times?
- Did I leave at least one beat with no entrance animations at all (the breath)?
- Did I keep non-cut transitions to ≤ 3?
- Did `WORD_HITS` stay under 5 per minute?
- Does every beat ≥ 8s have an atmospheric layer (`kenburns`/`parallax`/`particles`)?

If "no" to any: iterate.

---

## Phase 3.5 — `audit` (optional — animator self-critique)

**Input:** `storyboard.html`.

**Output:** stdout report (and optionally `audit.md`) with pass/warn findings and stats.

Programmatic acid-test against `animator.md`. Runs 8 checks:

| Check | Rule of thumb |
|---|---|
| `diversity` | At least 6 distinct preset names used |
| `signature` | Most-used emphasis preset (spring/bounce/anticipate/overshoot/scaleIn) used ≥ 3 times |
| `transitions` | At most 3 non-cut transitions across the deck |
| `atmosphere` | Beats > 8 seconds have parallax/kenburns/particles/glow somewhere |
| `overshoot` | No animation finishes after the next slide's cue (atmospheric layers excluded) |
| `counter-dur` | No `counter` animation has dur > 2.5s (past that it feels like a load bar) |
| `stacking` | No element has 3+ stacked emphasis presets (glow + pulse + shake) |
| `breath` | At least one slide has ≤ 2 entrance animations (lets the deck breathe) |

```bash
python ~/.claude/skills/storyboard/audit_deck.py path/to/storyboard.html
python ~/.claude/skills/storyboard/audit_deck.py path/to/storyboard.html --write       # also writes audit.md
python ~/.claude/skills/storyboard/audit_deck.py path/to/storyboard.html --json        # machine-readable
```

Exit code 0 if no warnings, 1 if any — so you can wire it into pre-render CI.

When invoking inside Claude Code, the `/storyboard audit` phase runs this script, reads the warnings, and offers per-warning fixes (e.g., "Slide 7 has 4 entrance anims and no atmospheric layer — should I add a parallax background?").

---

## Aspect ratio — horizontal vs vertical

Two templates ship in the skill directory:

| Template | Canvas | Use for |
|---|---|---|
| `template.html` | 1920×1080 (16:9) | YouTube, web embeds, in-app pitch decks. The default. |
| `vertical_template.html` | 1080×1920 (9:16) | Reels, TikTok, YouTube Shorts, vertical LinkedIn |

The vertical template has redesigned slide types optimised for portrait viewing — bigger stacked titles (180px), lower-third caption placement for cinematic slides (above the platform's caption rail), vertical list stacks instead of two-columns, hero stat with the number at 360px, pull-quote layout that needs the height.

`render_video.py` auto-detects the deck size at runtime (reads `.deck` width/height from the DOM) and sets Playwright viewport + recording size accordingly. So the same renderer produces 1920×1080 MP4s from `template.html` and 1080×1920 MP4s from `vertical_template.html` with no flag changes.

When building from scratch, pick the template based on the user's distribution channel. When in doubt, ask. When they say "I want one for both" — build the vertical version first (harder constraint), then expand to horizontal.

---

## Phase 5 — `render` (optional — produce a finished MP4)

**Input:** `storyboard.html` + the MP3 next to it.

**Output:** `storyboard.mp4` — broadcast-quality 1920×1080 H.264 + AAC, ready to upload.

This phase replaces manual screen-recording. Uses headless Chromium (via Playwright) to play the deck through end-to-end, captures the viewport as video, then muxes with the source MP3 via ffmpeg into a final MP4.

### How to run

```bash
python ~/.claude/skills/storyboard/render_video.py path/to/storyboard.html
python ~/.claude/skills/storyboard/render_video.py path/to/storyboard.html --quality fast
python ~/.claude/skills/storyboard/render_video.py path/to/storyboard.html --out final.mp4 --audio "VO English.mp3"
```

Auto-detects the MP3 next to the HTML if `--audio` isn't given. Default output is `<storyboard-stem>.mp4` next to the HTML.

### Quality presets

| Flag | CRF | Preset | Encode speed | Size |
|---|---|---|---|---|
| `--quality high` *(default)* | 18 | medium | slower | larger, archival quality |
| `--quality fast` | 23 | veryfast | faster | smaller, fine for web |

### Requirements (auto-installed by the installer)

```bash
pip install playwright imageio-ffmpeg
python -m playwright install chromium
```

`imageio-ffmpeg` downloads a self-contained ffmpeg binary — no system install needed.

### How it works

1. Launch Chromium headless at 1920×1080 with `--autoplay-policy=no-user-gesture-required` and `--mute-audio` (we mux real audio later — Chromium just needs the timeline)
2. Open the storyboard.html, wait for `window.STORYBOARD` + `audio.readyState >= 2`
3. Read `audio.duration` so we know how long to record
4. Reset the deck (`STORYBOARD.reset()`), then call `voAudio.play()` and start a Python-side timer
5. Sleep for `duration + 0.6s` (small tail so the last animation finishes)
6. Close the context — Playwright writes the captured WebM
7. ffmpeg: `-ss <lead-in>` trims the time between context start and play() call, then muxes with the source MP3, encodes to H.264 yuv420p + AAC 192 kbps, `+faststart` for streaming

### When this fails

- **Audio is shorter than the last TIMINGS cue** → slides past `audio.duration` never appear. Either regenerate the MP3 from the full script (so audio is as long as the deck expects) or trim the TIMINGS to match.
- **Headless Chromium can't load a relative MP3 path** → some browsers block file:// resource loads. Pass `--audio` with an absolute path.
- **WebM has visual artifacts** → the deck uses features Chromium's screen recorder compresses poorly. Try `--quality high` (already CRF 18) or accept that for very motion-heavy decks, real OBS recording will look better.

### Pipeline visualization

```
storyboard.html + VO.mp3
        │
        ▼
   Playwright opens headless Chromium 1920×1080
        │
        ▼
   STORYBOARD.reset() → voAudio.play() → record viewport for duration + 0.6s
        │
        ▼
   WebM (silent video, captured by Playwright)
        │
        ▼
   ffmpeg: -ss <lead-in> WebM + MP3 → H.264 yuv420p + AAC
        │
        ▼
   storyboard.mp4 (broadcast-ready)
```

---

## Phase 4 — `verify` (optional, uses preview MCP)

**Input:** `storyboard.html` (the built file).

**Output:** `playthrough/cue_NN_slide_M.png` screenshots + a `playthrough/report.md`.

When to run: after `build`, when the user wants confidence the deck is wired correctly. Skip if the user is in a hurry — it adds ~30s + screenshots.

### How to do it

1. Start the preview server pointed at the output dir:

   ```
   mcp__Claude_Preview__preview_start { url: "file:///<absolute-path>/storyboard.html" }
   ```

   (Or http://localhost:N if you spin up a static server for assets.)

2. Wait for `STORYBOARD` to be defined on the page (poll via `mcp__Claude_Preview__preview_eval`).

3. For each cue in `TIMINGS`, call:

   ```js
   STORYBOARD.seek(cue.time + 0.4);
   STORYBOARD.currentSlide();
   ```

   Compare returned slide number against `cue.slide`. Screenshot via `mcp__Claude_Preview__preview_screenshot` to `playthrough/cue_NN_slide_M.png`.

4. Generate `playthrough/report.md`:

   ```markdown
   # Playthrough report

   | Cue | Expected slide | Actual slide | Status |
   |---|---|---|---|
   | 00:00.0 | 1 | 1 | ✓ |
   | 00:08.0 | 2 | 2 | ✓ |
   | 00:20.0 | 3 | 3 | ✓ |
   ...
   ```

5. Stop the preview.

### What `verify` catches

- TIMINGS off by enough that the wrong slide is showing at a cue
- A missing slide (one of the cues maps to a slide that doesn't exist)
- An animation `data-t-rel` that lands past the slide's end (visible in screenshots)
- Asset paths that 404 (visible in screenshots; also check `mcp__Claude_Preview__preview_console_logs`)

What it doesn't catch: animation timing micro-issues that need a moving image, audio sync (since the VO doesn't actually play during seek), and subjective design judgment.

---

# Tone, voice, and ElevenLabs

For every project, write the script for **Eleven Multilingual v2**, speed **0.90**, stability 0.55, similarity 0.75, style 0.10, speaker boost on. This is the setting block the user has validated; don't change it without a reason.

Word count math: `target_seconds × 4 ≈ words_at_0.90_speed`. Each `<break time="Xs"/>` adds X seconds at zero words.

If a take comes out short, the lever is **speed** (drop to 0.85 → ~+10% runtime; 0.80 → ~+20%), not more words. Adding words to fix runtime is a sign the script is now padded.

---

# Handoff to the user

End every run with a concrete handoff. Quote-block format:

> 1. Open `script.md`, copy the SSML block in section 1, paste into ElevenLabs (Eleven Multilingual v2, speed 0.90, the other settings from section 2). Export as **MP3**.
> 2. Save the generated audio as `<filename>.mp3` in this directory.
> 3. Open `storyboard.html` in Chrome. **F11** for full-screen.
> 4. Press **Space** to play. If a transition or animation lands a beat off, tweak the matching `time:` in `TIMINGS` (or `data-t-rel` on the anim) and reload.
> 5. Screen-record full-screen with OBS / ShareX / QuickTime. The play controls sit outside the 1920x1080 deck — a clean crop in post drops them.

If `verify` ran and found issues, lead the handoff with the actions to fix them.

---

# Inputs and outputs summary

**Inputs:** URL (`WebFetch`), raw text inline, local file path (`Read`, or `anthropic-skills:pdf` / `:docx`), existing HTML deck for adopt mode.

**Outputs:** `concept.md`, `script.md`, `storyboard.html`, optional `playthrough/`.

**Tools used:** `WebFetch`, `Read`, `Write`, `Edit`, optionally `mcp__Claude_Preview__preview_*` for verify.

# What this skill does NOT do

- It does not generate voice-over or render an MP4 unless asked (`generate` / `render` phases, or `--auto-vo` / `--render`) — by default the user stays in control of voice and take selection.
- It does not invent statistics, quotes, or facts not in the source. If the input is thin, ask for more rather than padding.
- It does not modify the styles of an adopted HTML page. The overlay is purely additive.


---

## Dazzle: fun pack + real Lottie

The engine ships ~24 owned, brand-colored, render-safe **fun-pack** effects — confetti, fireworks, checkmarks, spinners, waveforms, badges, rating stars, rocket, trophy, thumbs-up, lightbulb, and more. **Icon presets render owned inline SVG, not OS emoji** (pass `data-emoji` only if you explicitly want a literal emoji). For floating reactions prefer `floatShapes` (vector) over `floatEmojis`. Full list in animations.md. Reach for these first.

**Real baked-in Lottie.** The engine plays Lottie via lottie-web (`data-anim="lottie"`), clock-synced — scrub-by-progress or `data-lottie-loop="1"`. Load the lib + bundle once:
```html
<script src="lottie_svg.min.js"></script>   <!-- skill/assets/vendor/ -->
<script src="lottie-bundle.js"></script>     <!-- skill/assets/ -> window.SB_LOTTIE -->
```
- **Bundled owned set** (MIT, `skill/assets/lottie/`, generated by `make_lotties.py`): check, confetti, heart, stars, sparkles, loader, fireworks → `<div class="anim" data-anim="lottie" data-key="confetti" data-lottie-loop="1"></div>`.
- **Any external Lottie** by path: `<div class="anim" data-anim="lottie" data-src="assets/lottie/<id>.json" data-dur="2">`. Fetch + license-check helpers in `lottie_fetch.py`; sources logged to `assets/lottie/CREDITS.md`. **Verify the source license before shipping.**

For maximal/playful videos, use the `playful-pop` style (styles.md) and lean on fun-pack loops + a celebration on every payoff.

## Cast & sets: actors, props, environments

Give a deck personality and a place to live (all owned, render-safe — full reference in animations.md; demo in `examples/showcase/cast-and-sets.html`):
- **Characters** — `data-anim="character"` with 9 owned styles: two humans — `person` (modern-flat) and `cutout` (construction-paper / South-Park look) — set via `data-skin`/`data-hair`/`data-haircolor`/`data-color`; plus mascots `blob`/`orb`/`bot`/`cat`/`ghost`/`star`/`bean` (optional `data-accessory="glasses|hat|bowtie"`), a slide-relative `data-acts` timeline (`wave`, `look=#x`, `point=#x`, moods, `say=…`) and `data-talk="1"` lip-sync that rides the audio analyser. Use a character as a guide/presenter that points at the thing the VO is describing. **Bring your own:** a JSON definition via `Storyboard.defineCharacter(def)` / `window.SB_CHARACTERS` / `data-char-src` (generate it from a description or reference image), or rig your own SVG by tagging parts with `data-sbc` — see `examples/characters/README.md`, validate with `skill/validate_character.py`. For the easy path, open the visual **`rigger.html`** (drag the eyes/mouth onto your art, then copy the generated HTML or JSON).
- **Props & devices** — `device` (phone/laptop/browser/tablet frames for product shots), `speechBubble`, `stickyNote`, `pinDrop`.
- **Environments** — `emitter` (snow/rain/embers/bubbles/dust), `sky` (day/dusk/night), `scenery` (parallax hills). Layer back→front: sky → scenery → emitter → content → character.

## Real 3D (WebGL)

For actual 3D — `data-anim="scene3d"` runs a clock-synced **three.js** scene (meshes, lighting, materials, 3D camera) that scrubs with the VO. Define scenes in `window.SB_SCENES = { name: api => update(t,p) }`; bundle the vendored `skill/assets/vendor/three.min.js` beside the deck. Headless renders use software GL — keep scenes modest (a few meshes, element < ~900px). Full reference in animations.md; demo in `examples/showcase/scene-3d.html`.

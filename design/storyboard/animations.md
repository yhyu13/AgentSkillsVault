# Animation reference

The engine in `template.html` (and the `overlay.html` injection used by adopt mode) drives any element with `class="anim"` from the audio clock. Per-preset signatures below.

> For **judgment** — what to use when, choreography recipes, anti-patterns — read `animator.md`. This file is just the technical reference.

## How an animation is declared

```html
<h2 class="anim"
    data-anim="presetName"
    data-t-rel="2.3"
    data-dur="1.4">
  Some text
</h2>
```

| Attribute | Required | Meaning |
|---|---|---|
| `class="anim"` | yes | Opts the element into the engine. Default state is `opacity: 0`. |
| `data-anim` | yes | Preset name. |
| `data-t-rel` | one of | Start time **relative to this slide's cue time**, in seconds. |
| `data-t` | one of | Absolute audio time. |
| `data-dur` | no | Duration in seconds. Defaults to preset's natural duration. |
| Preset-specific | varies | See per-preset docs. |

Engine guarantees:

| Phase | Element state |
|---|---|
| `time < t` | `opacity: 0` |
| `t <= time <= t + dur` | preset `apply(el, p)` runs each frame; `p` is eased internally |
| `time > t + dur` | preset called once with `p = 1`; element gets class `anim-played` |

Animations work while audio is **paused** — listeners on `timeupdate`/`seeked` redraw. Scrubbing the audio (or `STORYBOARD.seek(t)`) renders correctly. This is what makes the preview-MCP verification possible.

---

# Preset catalog (36)

Organized by category. For each, the signature is `data-anim="name"` + listed attributes.

## Basics

### `fadeIn` `(dur 0.8)`
Opacity 0 → 1. The quietest entrance.

### `fadeOut` `(dur 0.8)`
Opacity 1 → 0. Use for elements that should leave the frame mid-beat.

### `fadeUp` `(dur 1.0)`
Translate up 40px + fade. The workhorse default.

### `fadeDown` `(dur 1.0)`
Translate down 40px + fade. Use for elements arriving from above (callouts, banners).

### `slideInLeft` / `slideInRight` `(dur 1.0)`
Translate from -120 / +120 + fade. Cascading list items, side cards.

### `scaleIn` `(dur 1.0)`
0.85 → 1.0 scale + fade. Hero titles, big CTAs.

### `crossfade` `(dur 1.2)`
Plain opacity 0 → 1, or 1 → 0 with `data-out="1"`. Use to fade one image out as another fades in (overlapping `t-rel`).

## Physics & 12 principles

### `anticipate` `(dur 1.2)`
Element pulls back 8px, then launches forward 100px with overshoot. Anticipation principle made explicit. Use on big subjects entering decisively.

### `overshoot` `(dur 1.0)`
Translate up + ease-back (passes target, returns). Lighter than `anticipate`. Use for any entrance that needs a little snap.

### `spring` `(dur 1.2)`
Scale 0.7 → 1.0 with elastic-out curve. Bouncy, organic. The big "this is the moment" preset.

### `bounce` `(dur 1.2)`
Drops from -120px above with `easeOutBounce`. Playful, weighted. Use on data spikes, stat numbers, surprises.

### `wobble` `(dur 0.9)`
Brief rotational oscillation (4° max), damps to 0. Use for character-like accents or "is it alive?" cues.

### `shake` `(dur 0.5)`
Quick horizontal shake (12px max), damps to 0. Use as a word-hit on impact narration ("shock," "broken," "wrong").

### `squash` `(dur 0.6)`
X-stretch + Y-compress, then return. The 12-principle squash. Use sparingly — on logos, mascots, or whenever something "lands."

### `pulse` `(dur 0.9)`
Gentle 8% scale beat back to 1.0. Mid-narration attention pull (CTAs, focus elements).

## Text

### `typewriter` `(dur 1.5)`
Character-by-character reveal. Best for ≤60 chars. Beyond that, use `wordReveal`.

### `wordReveal` `(dur 1.8)`
Word-by-word reveal — replaces text with `<span class="wr-w">` per word, fades each in sequence. The right choice for syncing text to spoken narration.

### `tracking` `(dur 1.2)`
Letter-spacing animates from 0.2em → 0em + fade. Designer-y, calm. Good for subtitle text.

### `gradientSweep` `(dur 2.0)`
Background-position animates across a gradient text fill. Element must have `class="gradient-fill"` (which sets the gradient + clip). Use on hero titles for an animated chrome look.

```html
<h1 class="s-title gradient-fill anim" data-anim="gradientSweep" data-t-rel="0" data-dur="2.0">Title</h1>
```

### `splitReveal` `(dur 1.2)`
Two halves part vertically via clip-path. Good reveal for hero panels.

## Numbers

### `counter` `(dur 1.8)`
0 → `data-to`, eased. Honors `data-decimals` and `data-suffix`.

```html
<span class="anim" data-anim="counter" data-to="3142" data-suffix="+">0</span>
<span class="anim" data-anim="counter" data-to="98.6" data-decimals="1" data-suffix="%">0</span>
```

## Camera & framing

### `kenburns` `(dur 10)`
Background photo slowly zooms and drifts. Use on `.scene-bg` for cinematic slides. Defaults: `zoom=0.1`, `dx=2`, `dy=-2`. Make `dur` longer than the slide is on screen so it never abruptly stops.

| Attr | Default | Meaning |
|---|---|---|
| `data-zoom` | 0.1 | Extra scale factor |
| `data-dx` | 2 | Horizontal drift % |
| `data-dy` | -2 | Vertical drift % |

### `cameraZoom` `(dur 2.5)`
Wraps a `.camera` div. Zooms toward a focal point. Use for "push in" moments — narration drilling into a detail.

| Attr | Default | Meaning |
|---|---|---|
| `data-scale` | 1.5 | Target scale |
| `data-ox` | 50 | Origin X % |
| `data-oy` | 50 | Origin Y % |

```html
<div class="camera anim" data-anim="cameraZoom" data-t-rel="2.0" data-dur="3.0"
     data-scale="1.8" data-ox="30" data-oy="40">
  <!-- slide content here -->
</div>
```

### `cameraPan` `(dur 3.0)`
Translates content laterally. Like a camera dolly.

| Attr | Default | Meaning |
|---|---|---|
| `data-dx` | 0 | Total horizontal px |
| `data-dy` | 0 | Total vertical px |

### `focusBlur` `(dur 1.4)`
Element starts blurred (14px), un-blurs while fading in. Classic focus-pull. Pairs beautifully with a still background and a sharp foreground subject.

### `parallax` `(dur 8)`
Slow vertical drift over a long window. For background decorative layers. `data-range` (default 40) = total px.

## Decoration & atmosphere

### `glow` `(dur 1.6)`
Pulsing accent-colored halo via `box-shadow`. Loops naturally — set `dur` long for "alive" elements.

### `flicker` `(dur 1.0)`
Neon-style on/off flicker (6 cycles). Use on a single word/element for tension or rough-tech feel.

### `highlight` `(dur 0.8)`
Yellow marker sweeps under inline text via background-image. Element should be `display: inline` or `inline-block`.

```html
<p>Not all <span class="anim" data-anim="highlight" data-t-rel="2.0">stigma</span> looks the same.</p>
```

### `particles` `(dur 8)`
Drifts child elements with `class="p"` (expects pre-laid-out SVG circles). Use on `.particle-layer` SVGs for ambient depth.

```html
<svg class="particle-layer">
  <circle class="anim p" data-anim="particles" data-t-rel="0" data-dur="14" cx="200" cy="900" r="4"/>
  <circle class="anim p" data-anim="particles" data-t-rel="0" data-dur="14" cx="400" cy="950" r="3"/>
  <!-- 10-20 more -->
</svg>
```

Each particle gets a deterministic seed based on its index, so the pattern is reproducible.

### `confetti` `(dur 1.5)`
Burst layer — child elements with `class="c"` explode outward from center. Use for "celebration" moments. Don't reuse — one per video max.

```html
<svg class="confetti-layer">
  <rect class="anim c" data-anim="confetti" data-t-rel="0" data-dur="1.5" x="-6" y="-6" width="12" height="12" fill="#E8762C"/>
  <rect class="anim c" data-anim="confetti" data-t-rel="0" data-dur="1.5" x="-6" y="-6" width="12" height="12" fill="#3CA8E8"/>
  <!-- 16-24 more, alternating fills -->
</svg>
```

### `rays` `(dur 1.4)`
Radiating lines scale outward + rotate, peaks then fades. Good behind a stat number.

## Reveal & mask

### `reveal` `(dur 1.2)`
Clip-path sweep left → right.

### `revealUp` `(dur 1.2)`
Clip-path sweep bottom → top.

### `irisIn` `(dur 1.4)`
Circular clip-path opens from center. Iconic film transition; use sparingly.

## SVG / vector

### `pathdraw` `(dur 2.0)`
Animates `stroke-dashoffset` on any SVG geometry with `getTotalLength()` (path, line, polyline, circle). The path appears to draw itself.

```html
<path class="anim" data-anim="pathdraw" data-t-rel="1.0" data-dur="2.4"
      d="M 100 380 Q 600 60, 1100 380" fill="none" stroke="#3CA8E8" stroke-width="4"/>
```

### `morph` `(dur 1.4)`
Interpolates between two `d` values. **Both `d`s must have identical SVG command structure** (same letters in same order) — this is a coordinate lerp, not topology-aware morphing. For arbitrary morph, use Flubber externally and feed frames.

```html
<path class="anim" data-anim="morph" data-t-rel="0" data-dur="1.4"
      data-from="M 10 10 L 90 10 L 50 90 Z"
      data-to=  "M 10 50 L 90 10 L 90 90 Z"
      d="M 10 10 L 90 10 L 50 90 Z"
      fill="#3CA8E8"/>
```

### `motionPath` `(dur 2.0)`
Element follows another element's path coordinates. Set `data-path="#someSvgPath"`. Works with `<circle>`/`<ellipse>` (sets cx/cy) or any other element (uses transform).

```html
<svg viewBox="0 0 1200 500">
  <path id="route" d="M 100 380 Q 600 60, 1100 380" fill="none"/>
  <circle class="anim" data-anim="motionPath" data-t-rel="0" data-dur="2.5"
          data-path="#route" r="14" fill="#3CA8E8"/>
</svg>
```

## Lottie (real, baked-in)

### `lottie` `(dur — required)`
Plays a Lottie via **lottie-web**, driven by the audio clock. By default it **scrubs** the animation in sync with the clock (progress → frame); add `data-lottie-loop="1"` to free-run it from the clock instead. Two ways to supply the animation:

```html
<!-- A) bundled, offline + file:// safe — uses window.SB_LOTTIE[key] -->
<div class="anim" data-anim="lottie" data-key="confetti"
     data-lottie-loop="1" data-t-rel="0" data-dur="3"></div>

<!-- B) any external/served Lottie JSON by path -->
<div class="anim" data-anim="lottie" data-src="assets/lottie/check.json"
     data-t-rel="0.3" data-dur="2.0"></div>
```

| Attr | Required | Meaning |
|---|---|---|
| `data-key` | one of key/src | Key into `window.SB_LOTTIE` (the bundled set, loaded from `lottie-bundle.js`) — works on `file://` too |
| `data-src` | one of key/src | Path/URL to a Lottie JSON (needs an HTTP-served deck) |
| `data-dur` | yes | Seconds to play through (scrub mode) |
| `data-lottie-loop` | no | `"1"` = free-run/loop from the clock instead of scrubbing |

**Setup:** the page must load the library once — bundle the vendored copy:
```html
<script src="lottie_svg.min.js"></script>   <!-- skill/assets/vendor/ -->
<script src="lottie-bundle.js"></script>     <!-- skill/assets/ — defines window.SB_LOTTIE -->
```

**Baked-in owned set** (MIT, generated by `make_lotties.py`, in `skill/assets/lottie/`): `check`, `confetti`, `heart`, `stars`, `sparkles`, `loader`, `fireworks`. Regenerate/extend with `python skill/make_lotties.py`. Or drop in **any** LottieFiles `.json` via `data-src` (verify its license first).

Use for richer illustrated motion — or reach for the owned fun-pack presets below when a procedural effect will do.

---

# Scene transitions

Set `data-transition-in="..."` on a `<section class="slide">` to play a transition when the audio cue reaches that slide.

| Value | Effect | When to use |
|---|---|---|
| `cut` (default) | None | Most slides. Same energy as previous beat. |
| `dissolve` | Black fade in/out 0.55s | Mood / tonal shift. |
| `flash` | White fade in/out 0.55s | Revelation, data landing, "aha." |
| `whipPan` | Horizontal motion-blur sweep 0.55s | Energy spike, kinetic pivot. |
| `wipe` | Accent-colored bar sweep across | Chapter / list-item break. |
| `blocks` | Editorial accent-block flash | Section title cards. |

Rule of thumb: ≤3 non-cut transitions per video. Save them for the moments that earn them.

---

# Combining presets

A single element gets one preset. To stack effects, nest:

```html
<!-- Outer ken-burns photo, inner spring headline, particles in front -->
<div class="scene-bg anim" data-anim="kenburns" data-t-rel="0" data-dur="14"
     style="background-image:url('bg.jpg');"></div>

<svg class="particle-layer" style="position:absolute;inset:0">
  <circle class="anim p" data-anim="particles" data-t-rel="0" data-dur="14" cx="400" cy="900" r="3"/>
  <!-- ... -->
</svg>

<h1 class="anim" data-anim="spring" data-t-rel="1.0" data-dur="1.4">Headline</h1>
```

---

# Word hits (per-word emphasis)

`WORD_HITS` is a global array. The engine flashes a preset on a CSS selector for 0.6s at the specified audio time. Use it to land emphasis on specific narration words.

```js
const WORD_HITS = [
  { time: 12.34, sel: '#bigNoun',     hit: 'shake' },
  { time: 18.71, sel: '.stat-number', hit: 'pulse' },
  { time: 24.50, sel: '.cta-pill',    hit: 'highlight' }
];
```

Pull the times from ElevenLabs word-timestamp JSON. See `animator.md § Word-sync workflow`.

---

# Custom presets

Add to `PRESETS` in `template.html` (and `overlay.html` if adopt mode):

```js
PRESETS.myThing = {
  dur: 1.0,
  apply(el, p) {
    // p is 0..1, ease internally
    el.style.opacity = p;
    el.style.transform = `rotate(${p * 360}deg)`;
  }
};
```

Then use `<div class="anim" data-anim="myThing">...</div>`.

---

# Debugging

- **Element never appears** → check `class="anim"`, valid `data-anim`, and that `data-t-rel` doesn't resolve past the audio's end.
- **Wrong slide is on screen** → check the slide's `data-slide="N"` matches the `TIMINGS` entry.
- **Lottie doesn't render** → check internet access (CDN). Console: `lottie is not defined` means the script didn't load.
- **`pathdraw` doesn't draw** → element must support `getTotalLength()`. Usually means it's not an SVG geometry node.
- **`morph` jumps instead of morphs** → the two `d` values have different command structures. Restructure them so they match command-for-command.
- **`counter` ends at the wrong number** → `data-to` parsed as float. Use `data-decimals` for floats.
- **An anim is cut off mid-motion at the slide change** → `t_rel + dur` extends past the next slide's cue. Tighten `dur` or shift `t_rel` earlier.

---

# Composable motion (v0.3 engine)

The v0.3 engine (`storyboard-engine.js`) makes animations *composable* instead of one-preset-per-element. These attributes layer on top of any `data-anim`:

## `data-ease` — override the curve

Any element can override its preset's internal easing with a named curve:

```html
<h1 class="anim" data-anim="fadeUp" data-ease="outBack">Pops past, settles</h1>
```

Named eases: `linear, inQuad, outQuad, inOutQuad, inCubic, outCubic, inOutCubic, outQuart, outQuint, outExpo, inOutExpo, outBack, inBack, outElastic, outBounce` plus aliases `smooth` (inOutCubic), `snap` (outQuint), `pop` (outBack).

## `data-spring` — real spring physics

Replace the ease with a tuned damped-spring solver: `data-spring="stiffness,damping"`.

```html
<div class="anim" data-anim="scaleIn" data-spring="200,12">Springy</div>
<div class="anim" data-anim="scaleIn" data-spring="120,18">Gentle, premium</div>
```

Stiffness ~80–400 (higher = snappier), damping ~8–30 (lower = more bounce). Underdamped springs overshoot before settling — that's the point.

## `data-stagger` — cascade a container's children with one instruction

Put `class="anim-group"` + `data-stagger` on a container. Every child becomes an `.anim` with start times offset by the stagger interval. No more hand-numbering each item.

```html
<ul class="anim-group" data-anim="slideInLeft" data-stagger="0.12" data-t-rel="1.0" data-dur="0.7">
  <li>First</li><li>Second</li><li>Third</li><li>Fourth</li>
</ul>
```

Optional `data-ease` on the group applies to every child.

## `data-then` — chain sequences on one element

Run animations *after* the entrance. `@` sets an absolute delay (relative to the entrance start); otherwise steps run back-to-back after the previous finishes.

```html
<!-- enter with scaleIn, then pulse 1.6s after entrance start, then keep floating -->
<h2 class="anim" data-anim="scaleIn" data-then="pulse@1.6">Enter, then react</h2>
```

## `data-loop` — continuous ambient motion

Keeps an element alive *forever* after its entrance settles. The loop runs off the audio clock so it's deterministic for rendering.

```html
<h1 class="anim" data-anim="letterSpring" data-loop="float" data-loop-amp="10" data-loop-period="4">Alive</h1>
```

| Loop | Effect | amp means | typical period |
|---|---|---|---|
| `float` | vertical bob | px | 3–5s |
| `sway` | gentle rotate | deg | 3–6s |
| `breathe` | scale pulse | % | 3–4s |
| `rotate` | continuous spin | (ignored) | 6–20s |
| `orbit` | circular drift | px radius | 4–8s |
| `pulse` | scale beat | % | 1.5–3s |
| `shimmer` | background-position sweep | (ignored) | 2–4s |
| `beat` | scale reacts to music amplitude | % at full volume | (auto) |

`data-loop="beat"` requires audio (uses a WebAudio AnalyserNode on the VO/music track). Falls back to inert under the synthetic preview clock.

## 3D presets

| Preset | Effect |
|---|---|
| `flipInX` | rotateX -90°→0 (flips up from flat) |
| `flipInY` | rotateY 90°→0 (swings in from the side) |
| `cardFlip` | rotateY 180°→0 (full card flip) |
| `tiltIn` | rotateX + rotateZ + rise (3D card lands) |
| `zoomThrough` | translateZ -600px→0 (flies toward camera) |

Combine with `data-stagger` on a `.cards` grid for a flipping card deck.

## New text presets

| Preset | Effect |
|---|---|
| `letterSpring` | each letter springs up in sequence (gradient-fill aware, `<br>` aware) |
| `scramble` | decode/glitch effect — random glyphs resolve to the real text |

**Gradient titles**: `letterSpring` carries a `.gradient-fill` gradient onto each letter automatically. `typewriter` and `scramble` work with `.gradient-fill` directly (they don't wrap in child spans). For `wordReveal` on a gradient title, keep the gradient OFF (it wraps words in spans) — use `gradientSweep` for an animated gradient headline instead.

---

# Data-viz presets (v0.3)

Charts that draw and grow on the audio clock as the narrator cites them.

## `barGrow` — bar / column

Scales a bar from 0 to full along one axis. Default grows vertical (`scaleY` from the bottom); set `data-dir="h"` for horizontal (`scaleX` from the left).

```html
<div class="bar anim" data-anim="barGrow" data-t-rel="1.0" data-dur="1.2" data-ease="outBack" style="height:61%"></div>
```

Pair each bar with a `counter` for the value label. Stagger a row of bars by giving each a slightly later `data-t-rel` (0.2–0.3s apart) so they grow in sequence.

## `donutSweep` / `ringFill` — radial progress

Animates `stroke-dashoffset` on an SVG `<circle>` to draw an arc to `data-pct` percent. Rotate the SVG `-90deg` so it starts at 12 o'clock.

```html
<svg class="donut" viewBox="0 0 400 400" style="transform:rotate(-90deg)">
  <circle class="track" cx="200" cy="200" r="160" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="38"/>
  <circle class="arc anim" data-anim="donutSweep" data-t-rel="0.6" data-dur="1.8" data-pct="73"
          cx="200" cy="200" r="160" fill="none" stroke="var(--accent)" stroke-width="38" stroke-linecap="round"/>
</svg>
```

## `lineDraw` — line / area chart

Alias of `pathdraw` for chart lines. Build the line as an SVG `<path>`, it draws itself left-to-right.

## `comparisonBar` — animated width bar

Grows an element's CSS `width` to `data-width` percent. Good for "us vs them" horizontal comparisons.

```html
<div class="cmp anim" data-anim="comparisonBar" data-t-rel="0.8" data-width="84"></div>
```

---

# Cinematic layer (v0.3)

## Shared-element transitions

Give an element `data-shared-id="x"` on two consecutive slides. When the deck cuts from the first to the second, the element animates (FLIP) from its old position/size to its new one — a card that becomes the next slide's hero, no duplicate markup.

```html
<!-- slide 6 -->
<div class="hero-card" data-shared-id="hero" style="...big, centered...">...</div>
<!-- slide 7 -->
<div class="hero-card" data-shared-id="hero" style="...small, top-left...">...</div>
```

## Camera rig

Wrap a slide's content in `<div class="camera" data-camera="...">`. Keyframe `time=>scale:N,x:N,y:N` segments (times relative to the slide cue). The engine interpolates with `inOutCubic` between keyframes — dolly, pan, push-in.

```html
<div class="camera" data-camera="0=>scale:1; 2.5=>scale:1.8,x:-260,y:-120; 5.5=>scale:1">
  <div class="map">...pins...</div>
</div>
```

## Beat-sync

`data-loop="beat"` on any element scales it in time with the music's low-frequency amplitude (WebAudio AnalyserNode). Use on a logo, a pulse ring, or a CTA when there's a music bed.

---

# Engine API

```js
Storyboard.init({ timings, labels, wordHits, fallbackDuration });
Storyboard.play(); Storyboard.pause(); Storyboard.reset();
Storyboard.seek(seconds);          // jump + redraw (used by render/verify)
Storyboard.currentSlide();         // 1-based
Storyboard.isSynthetic();          // true when previewing without audio
Storyboard.registerPreset(name, { dur, apply(el,p,ctx){} });  // add your own
Storyboard.registerEase(name, fn);
Storyboard.calib.clearSaved();     // wipe stored calibration
```

Decks declare `const TIMINGS = [...]` then pass it to `init` so the Python tooling (audit/aaf/elevenlabs/compress) can read and rewrite it.

---

# Cinematic slide transitions (v0.4)

**Big change in v0.4:** the engine no longer scrolls between slides. Slides are stacked in place and the outgoing slide animates *against* the incoming one. Set `data-transition-in="<name>"` on a `<section class="slide">` to choose how it arrives.

> Previously every slide change was a vertical scroll with an overlay flourish on top — so everything read as "scrolling." Now transitions are real slide-on-slide motion.

## The transition catalog

| Name | Motion | Feel / when to use |
|---|---|---|
| `cut` | Instant swap | Same energy as previous beat. Most slides. |
| `crossDissolve` *(default)* | Outgoing fades out as incoming fades in | Smooth, neutral. The safe default. |
| `fade` | Through black | Chapter break, tonal reset. |
| `pushLeft` / `pushRight` | Incoming pushes outgoing off-frame horizontally | Forward momentum, "next." Kinetic. |
| `pushUp` / `pushDown` | Vertical push | Intentional vertical move (the old scroll, but deliberate). |
| `coverLeft` | Incoming slides over the top from the right | Layering, "new thing on top." |
| `revealRight` | Outgoing slides away to reveal incoming underneath | "Pull back the curtain." |
| `zoomIn` | Incoming scales up from center; outgoing scales away | Push into a topic. Energetic. |
| `zoomOut` | Incoming scales down from large; outgoing shrinks | Pull back to context / overview. |
| `flip3D` | Frame flips like a card on the Y axis | Premium reveal, "flip to the answer." Use sparingly. |
| `spinZoom` | Incoming rotates + scales in | Playful, dynamic. |
| `whipPan` | Fast motion-blurred horizontal swap | High energy pivot. The kinetic favorite. |
| `blurThrough` | Outgoing blurs out, incoming blurs in | Dreamy, soft focus shift. |
| `irisOpen` | Incoming revealed through an expanding circle | Iconic film iris. A spotlight reveal. |
| `barWipe` / `barWipeUp` | Incoming revealed by a sweeping edge | Editorial, decisive. |
| `glitch` | Digital jitter + accent flash, then swap | Tech/urgent. Use once. |
| `flash` | White flash swap | Surprise, data landing. |
| `blocks` | Accent-color overlay swap | Section card / chapter. |

Aliases: `dissolve` → `crossDissolve`, `wipe` → `barWipe`.

## Choosing transitions (still ≤3 non-cut rule)

The discipline from `animator.md` still holds: **most slides should `cut` or `crossDissolve`.** Reserve the showy ones (`flip3D`, `zoomIn`, `whipPan`, `irisOpen`, `glitch`, `spinZoom`) for the 2–4 beats that earn them — the problem→solution pivot, a big reveal, the CTA. A different flashy transition on every slide reads as a transitions demo, not a film. (The bundled `examples/showcase` deck deliberately uses a different one per slide *because it is a demo* — don't copy that pattern into real videos.)

Each style in `styles.md` has a recommended transition pair — use those for coherence.

## Timing notes

- Transitions run 0.42s (`flash`) to 0.9s (`fade`/`flip3D`). The default is ~0.7s.
- Element entrance anims (`data-t-rel`) start at the slide's cue, so they overlap the transition. For a clean "transition first, then content," give the first element a `data-t-rel` ≥ the transition duration (~0.8).
- When **scrubbing** (paused) or **jumping** more than one slide, the engine swaps instantly (no transition) so you can navigate fast. Transitions only animate during playback.
- `render_video.py` records real playback, so all transitions appear in the MP4.

## Shared-element still composes

`data-shared-id` morphs ride *on top of* whatever `data-transition-in` you choose — e.g. a `crossDissolve` while a card flies from its old position to its new one. They layer.

---

# Raw-motion pack (v0.5)

Higher-craft motion: kinetic typography, hand-drawn annotations, exit animations, and living backgrounds.

## Kinetic typography

### `lineReveal`
Each line rises up from behind a clip mask, staggered. Splits on `<br>`. The premium title move.
```html
<h1 class="anim" data-anim="lineReveal" data-t-rel="0.2" data-dur="1.6">Lines rise<br>behind a mask.</h1>
```

### `wordSwap`
Sequential phrases hit center one after another — VO-synced punchy hero lines. Phrases via `data-words="A|B|C"`; each scales in, holds, scales out as the next arrives (the last one holds).
```html
<h1 class="anim" data-anim="wordSwap" data-t-rel="0.2" data-dur="4.5" data-words="Faster.|Simpler.|Yours."></h1>
```
Set `data-dur` to span the phrase (≈ seconds-per-phrase × count). Sync to the narration saying each word.

## Hand-drawn annotations (draw-on emphasis)

Draw a rough marker onto a word/element as the narrator emphasizes it — the classic explainer device. The element should wrap just the phrase you're annotating. Stroke color from `data-ann-color` (default `--accent`), weight from `data-ann-weight`.

| Preset | Mark |
|---|---|
| `underlineDraw` | Hand-drawn underline sweeping in |
| `circleScribble` | Loose scribble-circle around the phrase |
| `boxDraw` | Rough rounded box (add padding to the element) |
| `strikethrough` | Crossed-out line |

```html
Real <span class="anim" data-anim="circleScribble" data-t-rel="0.4" data-dur="0.9">attributes</span>.
No <span class="anim" data-anim="strikethrough" data-t-rel="1.4">fakes</span>.
<span class="anim" data-anim="underlineDraw" data-t-rel="2.2">Copy-ready</span> output.
<span class="anim" data-anim="boxDraw" data-t-rel="3.0" style="display:inline-block;padding:6px 16px">20 patterns</span>
```
Annotations create an absolutely-positioned SVG over the element's box (the element is set `position:relative`), so wrap a tight inline-block span around exactly what you want marked.

## Exit animations

Elements can now **leave**, so content cycles within a long beat instead of piling up. Add `data-exit` plus a time: `data-exit-at` (relative to the slide cue) or `data-exit-t` (absolute). Optional `data-exit-dur` (default 0.7).

| Exit | Effect |
|---|---|
| `fadeOut` | Opacity to 0 |
| `slideOutLeft/Right/Up/Down` | Slides off + fades |
| `scaleOut` | Shrinks + fades |
| `popOut` | Quick anticipate-then-shrink |
| `blurOut` | Blurs out + fades |

```html
<h2 class="anim" data-anim="fadeUp" data-t-rel="0.2" data-exit="slideOutLeft" data-exit-at="1.6">First point leaves…</h2>
<h2 class="anim" data-anim="fadeUp" data-t-rel="2.0">…so the second is clean.</h2>
```
Exits run after entrances, so they always win once their window opens. Use them to keep frames uncluttered on talky beats — show a point, let it leave, bring the next.

## Living backgrounds (continuous ambient)

Use on a full-bleed element behind content. They run the whole beat (driven by the audio clock, so they're deterministic in render).

### `aurora`
Soft drifting gradient clouds. Colors from `data-c1/c2/c3` (default the accent trio).
```html
<div class="bleed anim" data-anim="aurora" data-t-rel="0" data-dur="9999"></div>
```
(`.bleed { position:absolute; inset:0; z-index:0 }` — put content above with a higher z-index.)

### `constellation`
Moving connected-dot network on a `<canvas>`. `data-count` (dots, default 60), `data-color` (R,G,B, default violet).
```html
<canvas class="bleed anim" data-anim="constellation" data-t-rel="0" data-dur="9999" data-count="70" data-color="124,92,255"></canvas>
```
The canvas sizes itself to its layout box on first frame. Great tech/AI/data ambient.


---

# Advanced pack (v0.6): charts, diagrams, UI demo, code

## Charts (data-explainer)

| Preset | What it does | Key attrs |
|---|---|---|
| `chartArea` | Reveals a line/area SVG path left-to-right (clip sweep) | use on `<path>` |
| `pieSlice` | Sweeps one pie/donut arc on an SVG `<circle>` | `data-pct`, `data-offset` (stack slices) |
| `gauge` | Rotates a needle from one angle to another | `data-from`, `data-to` (deg), set `transform-origin` |
| `barTo` | Morphs a bar's height between two values (data update) | `data-from`, `data-to` (%) |

Existing `barGrow`, `donutSweep`, `counter`, `comparisonBar` (v0.3) still apply. Compose:
- **Line chart**: an SVG `<path>` for the line via `chartArea` (or `pathdraw`) + dots via staggered `scaleIn`.
- **Stacked bars**: multiple `barGrow` bars in a column, staggered; or `barTo` for "value updates to..." moments.
- **Pie/donut**: several `pieSlice` circles sharing center, each with `data-pct` and a cumulative `data-offset`.
- **Gauge**: a background arc (`chartArea`) + a `gauge` needle.

```html
<!-- two-segment donut -->
<circle class="anim" data-anim="pieSlice" data-t-rel="0.4" data-pct="64" cx="200" cy="200" r="150"
        fill="none" stroke="var(--accent3)" stroke-width="60" transform="rotate(-90 200 200)"/>
<circle class="anim" data-anim="pieSlice" data-t-rel="0.8" data-pct="36" data-offset="64" cx="200" cy="200" r="150"
        fill="none" stroke="var(--accent)" stroke-width="60" transform="rotate(-90 200 200)"/>
```

## Diagrams & flows

`connectorDraw` draws an SVG path between nodes; `data-arrow="end"` auto-adds an arrowhead at completion.

```html
<g class="anim" data-anim="scaleIn" data-t-rel="0.2">...node box...</g>
<path class="anim" data-anim="connectorDraw" data-t-rel="1.0" data-arrow="end"
      d="M 320 205 L 600 205" fill="none" stroke="var(--accent2)" stroke-width="4"/>
<g class="anim" data-anim="scaleIn" data-t-rel="1.6">...next node...</g>
```

Compose: **process flow** = nodes (`scaleIn`, staggered) + `connectorDraw` between them, in narration order. **Timeline** = one long `connectorDraw` spine + dots (`scaleIn`) + labels. **Tree/org** = parent node, then branch connectors drawing down to children.

## UI demo simulation (no screen recording)

`cursorTour` drives a synthetic cursor across mock UI, clicking and typing. One driver element, an internal timeline.

```html
<!-- build a mock UI with real ids, then: -->
<div class="anim" data-anim="cursorTour" data-t-rel="0" data-dur="9999"
     data-stops="#field@1.0:type=card-testing, #deploy-btn@4.0:click"></div>
```
`data-stops` = comma-separated `selector@time[:click|:type=text]`. The cursor glides between targets (eased), ripples on click, and types into fields. Times are absolute audio seconds. Also: `clickRipple` (standalone ripple), `typeInto` (type into one field).

## Text & code FX

| Preset | Effect |
|---|---|
| `assemble` | Letters fly in from scattered positions to form the word |
| `rgbGlitch` | RGB-split jitter that settles to clean text |
| `neonOn` | Flickers on like a neon sign, then steady glow (`data-neon` color) |
| `textMask` | Gradient or image shows through the letters + a sheen sweep (`data-img` for an image) |
| `codeType` | Types code with live syntax highlighting (keywords/strings/numbers/comments/functions) |

```html
<h1 class="anim" data-anim="assemble" data-t-rel="0.3" data-dur="1.5">Assemble.</h1>
<h1 class="anim" data-anim="neonOn" data-t-rel="0.3" data-neon="#19E3B1">LIVE</h1>
<pre class="anim" data-anim="codeType" data-t-rel="0.3" data-dur="3.5">function block(charge){ ... }</pre>
```
`codeType` tokenizes on init and reveals character-by-character; keep snippets short (≤ ~12 lines) so it reads. For gradient/letter effects that wrap spans, see the v0.5 note about not combining with `wordReveal`.


---

# Senior composition pack (v0.7)

Compositional tools for depth, focus, and a film grade — the difference between "a webpage" and "a shot."

## Multiplane depth (`data-plane`)
Stage layers at different depths inside a `.camera`. During any camera push/pan, each layer parallaxes by its depth factor, manufacturing true 3D depth (the Disney multiplane camera).

```html
<div class="camera" data-camera="0=>scale:1; 4.5=>scale:1.7,x:-180,y:-80">
  <div class="plane" data-plane="0.3" ...>   <!-- background: drifts slowly -->
  <div ...subject...>                         <!-- neutral plane ~1.0 -->
  <div class="plane" data-plane="1.8" ...>   <!-- foreground: races past -->
</div>
```
- `data-plane < 1` → background (lags the camera). `= 1` → moves with it. `> 1` → foreground (leads).
- Put `data-plane` on **static layout layers** (backgrounds, decorative shapes), not on `.anim` elements — the parallax owns their transform.
- No camera move = planes are static. Multiplane is driven by the camera rig.

## Depth of field
| Preset | Effect |
|---|---|
| `rackFocus` | Pulls an element from heavy blur + low brightness into sharp focus (the eye snaps to it) |
| `defocus` | Pushes an element OUT of focus (blur + dim) — recede context a plane |

Sharpness is hierarchy: the sharp element is the important one. Use `rackFocus` on an arriving subject, `defocus` on the context behind it.

## The grade (make it look like film)
| Preset | Effect | How to use |
|---|---|---|
| `cinematicGrade` | Full-frame vignette + corner falloff + multiply blend | Full-bleed `<div>` on top (z above content); one per slide that needs grading |
| `vignette` | Just an edge-darkening that ramps in | Lighter alternative to cinematicGrade |
| `filmGrain` | Animated fractal-noise grain (overlay blend) | One full-bleed layer; `data-grain-opacity="0.05"`–`"0.10"`. Unifies the whole deck's texture |

```html
<div class="anim" data-anim="cinematicGrade" data-t-rel="0" data-dur="9999"></div>
<div class="anim" data-anim="filmGrain" data-t-rel="0" data-dur="9999" data-grain-opacity="0.07"></div>
```
(Both are continuous — `data-dur="9999"`. Put them last in the slide so they sit on top.)

## Moving holds (`data-hold`)
Keep a settled element imperceptibly alive so the frame never looks frozen. A micro-loop applied after the entrance settles.
```html
<h1 class="anim" data-anim="spring" data-t-rel="0.3" data-hold="breathe">Alive</h1>
```
`data-hold="breathe|float|sway"`. Tiny defaults (breathe ≈2.5%, float ≈4px, period 6s). It's the loop system at whisper amplitude — add to any hero on screen >4s. (For a stronger continuous loop, use `data-loop` instead.)


---

# Fun pack (v0.7): owned dazzle effects + Lottie on demand

Brand-colored, dependency-free, render-safe effects. Drop `<div class="anim" data-anim="X">` — most generate their own children. Colors pull from `--accent/--accent2/--accent3/--gold`.

## One-shot effects (driven by progress)

| Preset | Effect | Notes |
|---|---|---|
| `confettiBurst` | Radial confetti explosion | self-fills 54 pieces; gravity |
| `fireworks` | Multiple staggered bursts | 4 clusters |
| `checkDraw` | Success check + circle draw-on | mint |
| `crossDraw` | Error X + circle draw-on | pink |
| `starPop` | Star springs + spins in | gold |
| `heartBeat` | Heart pops + double-thump | `data-emoji` to override |
| `coinFlip` | 3D-flipping gold coin | `data-face` ($ default) |
| `trophyShine` | Trophy scales in | `data-emoji` |
| `badgeUnlock` | Badge + expanding ring | wrap your badge content |
| `ratingStars` | N stars fill L→R + pop | `data-count` |
| `emojiPop` | Any emoji bounces in | `data-emoji` |
| `thumbsUp` | Owned thumbs-up pops + wiggles | vector; `data-emoji` to override |
| `lightbulb` | Owned bulb flickers on + glows | vector; idea moments |
| `partyPopper` | Owned popper cone + streamer burst | vector |
| `rocketLaunch` | Owned rocket flies up | vector |
| `burstLines` | Radial impact lines | emphasis / "pow" |
| `shimmerSweep` | Light sheen sweeps across | put on any element |

## Continuous loops (run the whole beat — `data-dur="9999"`)

| Preset | Effect | Notes |
|---|---|---|
| `spinner` | Rotating arc loader | |
| `dotsLoader` | 3 bouncing dots | typing/thinking |
| `pulseRings` | Concentric expanding rings | |
| `waveform` | Audio bars; **beat-reactive** if a track is loaded | `data-bars` |
| `sparkle` | Twinkling stars scattered | magic/AI |
| `confettiRain` | Confetti falls from top | full-bleed layer |
| `floatEmojis` | Emoji reactions drift up | `data-emojis="❤️,🎉,⭐"` (literal emoji) |
| `floatShapes` | Owned vector hearts/stars/confetti drift up | `data-shapes="heart,star,confetti,dot"` — emoji-free, recommended |

## Lottie on demand (richer illustrated pieces)

A **baked-in owned set** ships in `skill/assets/lottie/` — `check`, `confetti`, `heart`, `stars`, `sparkles`, `loader`, `fireworks` (generated by `make_lotties.py`, MIT, played via `data-key`). For other illustrated needs (mascots, weather, delivery, etc.) the **100-entry index** + fetcher avoids bundling everything:

```bash
python skill/lottie_fetch.py --list celebration       # browse
python skill/lottie_fetch.py --search "rocket startup" # find (routes to owned preset if one exists)
python skill/lottie_fetch.py show mascot-wave          # see recommendation
python skill/lottie_fetch.py fetch <url> --out ./my-video --id mascot-wave
```
The fetcher validates the JSON is a real Lottie, saves it to `<project>/assets/lottie/<id>.json` (so renders stay offline-safe), and records the source + date in `assets/lottie/CREDITS.md`. **Always verify the source license before shipping.** Play it with the existing `data-anim="lottie" data-src="assets/lottie/<id>.json"`.

Rule: **reach for the owned preset first** (46 of the 108 concepts have one — render-safe, brand-colored, never 404). Only fetch a Lottie when you need a specific illustrated look the engine can't draw.

---

# Cast & sets — actors, props, environments

Beyond motion/data/dazzle: things with personality and places for them to live. All owned, render-safe, brand-colored. Demo: `examples/showcase/cast-and-sets.html`.

## Character (the actor layer) — `character`
An owned procedural mascot/guide that lives the whole beat (auto-blink, breathe, idle sway) and acts on a slide-relative timeline.

```html
<div class="anim" data-anim="character" data-char="blob" data-talk="1" data-color="var(--accent)"
     data-acts="0.6:wave; 2:look=#kpi; 2.8:point=#kpi; 3.5:happy; 4.5:say=Up 84%!"></div>
```

| Attr | Meaning |
|---|---|
| `data-char` | `blob` · `orb` · `bot` (antenna robot) · `cat` (ears + whiskers) · `ghost` (wavy hem) · `star` · `bean` (tall capsule) · `person` (modern-flat human) · `cutout` (construction-paper / South-Park look — big outlined eyes, stubby body, mitten hands) — all share the same face/acting |
| `data-skin` / `data-hair` / `data-haircolor` | **`person` & `cutout`:** skin (`light`/`medium`/`tan`/`brown`/`deep` or hex), hair (`short`/`long`/`bun`/`curly`/`buzz`/`cap`/`bald`; `cutout` also `afro`/`hood`), hair color (`dark`/`brown`/`blonde`/`auburn`/`red`/`gray`/`white` or hex). `data-color` = clothing (`cutout` also `data-pants`). |
| `data-accessory` | optional `glasses` · `hat` · `bowtie` |

### Bring your own character
Not limited to the built-ins — add your own **two ways** (both inherit the full acting):
- **JSON definition** — `Storyboard.defineCharacter(def)`, a bundled `window.SB_CHARACTERS` map, or `data-char-src="x.json"`. A `face` descriptor (engine-animated) + a `parts` list (your art) + `$token` colors (`$skin`/`$clothing`/`$accent`/…). Safe (whitelisted shapes, no scripts), shareable, and **`/storyboard` can generate one from a description or a reference image**.
- **Rig your own SVG** — `data-char="custom"` with an inner `<svg>` whose parts are tagged `data-sbc="eyeL|eyeR|pupilL|pupilR|mouth|open|armL|armR|brL|brR|cheekL|cheekR|body"` plus a `data-face` descriptor. The engine drives the tagged parts.

Full format reference + copy-paste examples: **`examples/characters/README.md`**. Validate a definition with `python skill/validate_character.py <file.json>`. Live demo: `examples/showcase/byo-characters.html`.

---

# Real 3D (WebGL via three.js)

Beyond CSS 3D transforms — actual WebGL meshes, lighting, materials and a 3D camera, driven by the audio clock.

```html
<div class="anim" data-anim="scene3d" data-scene="myScene" style="width:800px;height:800px"></div>
<script src="three.min.js"></script>   <!-- skill/assets/vendor/three.min.js -->
<script>
window.SB_SCENES = { myScene: function(api){            // api: {THREE, scene, camera, renderer, el, w, h}
  var T=api.THREE;
  var m = new T.Mesh(new T.TorusKnotGeometry(1.2,0.4,110,16),
                     new T.MeshStandardMaterial({color:0x7C5CFF, metalness:0.4, roughness:0.3}));
  api.scene.add(m);
  api.scene.add(new T.AmbientLight(0xffffff,0.5));
  var d=new T.DirectionalLight(0xffffff,1); d.position.set(4,5,6); api.scene.add(d);
  return function(t,p){ m.rotation.y = t*0.6; };          // t = audio time, p = preset progress
}};
</script>
```

Your scene function builds the three.js scene and returns an `update(t,p)` that runs every frame with the audio clock — so the 3D **scrubs with the VO**. No `data-scene` → a rotating icosahedron default. `data-fov` sets the camera FOV.

**Cinematic look (bloom + tone mapping).** The renderer ships with **ACES Filmic tone mapping** + sRGB output, so colors roll off like film instead of clipping. Add a bloom pass for the glow that sells a "rendered" frame:

```html
<div class="anim" data-anim="scene3d" data-scene="galaxy"
     data-bloom="0.45,0.55,0.6"   <!-- strength, radius, threshold -->
     data-exposure="0.9"          <!-- tone-mapping exposure (default 1.0) -->
     data-res="0.7"></div>         <!-- live-preview render scale; offline --frames renders full-res -->
<script src="three.min.js"></script>
<script src="three-bloom.js"></script>   <!-- required for data-bloom -->
<script src="three-extras.js"></script>  <!-- Reflector + BokehPass — required for data-dof + planar reflections -->
```

The look lives in **restraint**: keep the base scene fairly **dark**, then bloom only the **brightest** cores. A high `threshold` (~0.55–0.72) blooms just the hot spots; `threshold` near 0 blooms *everything* and blows the frame to white — the classic mistake. Pair it with `exposure` ≤ 1.0. For pretty particles, draw points/sprites with a **soft round texture** (radial-gradient canvas) and additive blending — never hard squares. A fresnel shell (`BackSide`, `abs(dot(n,view))`) gives a clean atmosphere rim; a key + `HemisphereLight` fill reads as a lit world (skip IBL — equirect gradients can wash the lower hemisphere).

**What separates a modern render from "90s graphics"** (load `three-extras.js`):
- **`data-dof="focusDist,aperture,maxblur"`** — depth-of-field bokeh (e.g. `"46,0.0008,0.005"`). Far lights melt into bokeh, the focal plane stays sharp → instantly cinematic. (Gotcha: `BokehPass` doesn't render the scene, it *blurs an existing buffer by depth* — the engine wires it as the LAST composer pass after `RenderPass`+bloom.)
- **Real reflections** — `new THREE.Reflector(planeGeo, {textureWidth, textureHeight, color})` is a planar mirror that re-renders the scene each frame. For a wet street: a `Reflector` at `y≈0` + a semi-transparent asphalt/markings plane just above it. This single thing modernizes any night scene.
- **Real texture maps + HDRI lighting beat anything procedural.** This is the single biggest leap: load a real **CC0 HDRI** (Poly Haven, e.g. a night skyline) with `THREE.RGBELoader` → `PMREMGenerator.fromEquirectangular(hdr).texture` → `scene.environment`. Now every PBR surface is lit by, and *reflects*, a real photographed environment. Pair with real albedo/normal/roughness maps where you can (the Earth scene uses a NASA Blue-Marble + normal map). HDRIs load async — kick the load at page-load and apply it in the per-frame update (`if(loaded && !applied) …`) so the offline frame render picks it up; a `flash` transition hides the first frame.
- **Glass, not lit boxes** — buildings = dark reflective `MeshStandardMaterial` (`roughness ~0.1, metalness ~0.85, envMapIntensity ~1.1`) with an **emissive window map** (tall windows, whole floors lit/dark — *not* a uniform checkerboard). With an HDRI `scene.environment` the glass mirrors the real neon city.
- **Vary silhouettes** (setbacks, spires, rooftop units) and add **emissive neon billboards**; flat equal-height boxes are the biggest "90s" tell.

**Rendering 3D — use the offline frame path.** For any `scene3d` deck, render with **`--frames`**:

```bash
python render_video.py deck.html --no-audio --frames        # add --fps 60 / --supersample 2 for max quality
```

This (1) puts headless Chromium on the **real GPU** via ANGLE (`--use-angle=d3d11` / `metal` / `gl`; it falls back to software only if there's no GPU), (2) steps the engine clock **frame-by-frame** (`Storyboard.renderAt(t)`) and screenshots each — so motion is *perfectly* smooth with zero dropped frames, decoupled from real-time speed — and (3) **supersamples** the WebGL buffer (`window.SB_SS`, default 1.5×) for crisp antialiasing. Because nothing runs in real time, scenes can be **heavy**: tens of thousands of particles, an emissive-window city, real materials + bloom all render fine. The plain (real-time `record_video`) path still works and also gets the GPU flags, but `--frames` is the quality path for 3D.

Two rules that make it work:
- **`data-res` is a live-preview perf knob only.** The offline render ignores it and renders at full size × `SB_SS`. Use `data-res` (~0.6–0.75) so the deck stays smooth when *previewed* in a browser; the exported MP4 is always full-res.
- **Make all motion a function of `t`** (the clock), never per-frame increments (`pos += v`) — otherwise changing fps changes the speed. Camera moves, particle positions, rotations: author them as `f(t)` (use `t - t0` for slide-local time).

Inactive slides skip GL automatically. Bundle the vendored `three.min.js` (+ `three-bloom.js` if blooming) beside the deck. Demos: `examples/showcase/scene-3d.html` (API basics) and **`scene-3d-beauty.html`** (galaxy · neon-city flythrough · alien world with night-side city lights · hyperspace warp). (GLTF model loading is a follow-on: add `GLTFLoader` + a model file.)
| `data-mood` | initial expression (default `idle`) |
| `data-talk` | `"1"` = continuous lip-sync (mouth rides the audio analyser; sine-flap when silent) |
| `data-look` | selector the eyes track from the start |
| `data-color` | body color (default `--accent`) |
| `data-acts` | `"<t>:<cmd>; ..."` — times are **relative to this slide's cue** |

**Act vocabulary** — moods (sticky): `idle` `happy` `sad` `surprised` `think` `wink`; gestures (one-shot): `wave` `nod` `jump` `bounce` `shrug` `spin`; gaze: `look=#sel`, `point=#sel` (raises an arm + gaze), `rest`; speech: `say=Text…` (typed bubble), `talk`/`quiet` (toggle lip-sync). Gaze + point use on-screen geometry, so they aim correctly regardless of deck scaling.

## Props & device mockups
| Preset | Use | Attrs |
|---|---|---|
| `device` | Wrap screen content in a frame | `data-device="browser\|phone\|laptop\|tablet"`, `data-url` (browser). Put the screen UI (mock or `<img>`) inside; nodes are preserved. |
| `speechBubble` | Standalone callout that types in | `data-text` (or inner text), `data-tail="down\|up\|left\|right"` |
| `stickyNote` | Pops in with a slight tilt | `data-rot="-3"`; inner text |
| `pinDrop` | Map/location pin drops + bounces | `data-color` |

## Environments + particles (full-bleed `.bleed` layers)
| Preset | Use | Attrs |
|---|---|---|
| `emitter` | Particle field, loops forever | `data-fx="snow\|rain\|embers\|bubbles\|dust"`, `data-count` |
| `sky` | Gradient sky + sun/moon + drifting clouds / twinkling stars | `data-sky="day\|dusk\|night"` |
| `scenery` | Layered silhouette hill bands (parallax-ready under a `.camera`) | `data-color` |

Compose them: `sky` (back) → `scenery` → `emitter` → content → `character` (front). For depth, put `scenery`/`sky` on `data-plane` layers inside a `.camera` so they parallax during camera moves.

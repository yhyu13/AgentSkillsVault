---
name: opendeck
description: Build animated, narrated HTML presentation decks — slides that reveal step-by-step as you click, hover tooltips, a thumbnail rail, fullscreen, plus AI voice narration generated in-browser via ElevenLabs that can be baked into a fully offline file. Use when the user wants a presentation, deck, or slides that animate step-by-step, a self-running or narrated presentation, a deck to present and export, or anything described as "click through and it talks." Can also package the deck as a portable `.deck` file (deck.json + zipped standalone HTML) for playback in a compatible deck player app.
license: MIT
metadata:
  author: The OpenDeck Authors
  version: 1.3.1
  created: "2026-06"
---

# OpenDeck — Narrated Animated Presentations

Build an HTML slide deck with **in-slide step animations, hover tooltips, a thumbnail rail, fullscreen, and AI voice narration** — including an in-page "Audio Studio" that generates the voiceover with ElevenLabs and can bake it into a fully offline file.

Use this skill when the user asks for: a presentation/deck/slides that animates step-by-step, a self-running or narrated presentation, a deck they can present and also export, anything describing "click through and it talks," or to **package a deck as a portable `.deck` file** for a compatible player app.

---

## What you ship

The shippable kit lives in this skill's **`assets/`** folder. A deck is a single deck file (`starter-deck.html`, or a `.dc.html` Design Component when building inside a Claude design project) plus five companion files (all copied into the **same folder** as the deck), and a zero-dependency bundler for offline export:

| File | Role | You edit it? |
|---|---|---|
| `deck-stage.js` | Slide engine: auto-scaling, keyboard nav, thumbnail rail, speaker notes. | No — drop in as-is |
| `deck-enhance.js` | `data-step` reveals + step dots, `data-tip` tooltips, Fullscreen (`F`) & Slides (`S`) buttons, edit-mode guard. | No — drop in as-is |
| `narration-script.js` | The narration **text**, one line per slide/step. | **Yes** — this is where you write narration |
| `deck-narration.js` | Narrate + Auto-play controls (merged into the deck overlay) and the Audio Studio. | No — drop in as-is |
| `narration-audio.js` | **Generated**, not shipped. Holds the audio clips as base64 so narration plays offline. Created by the Studio's "Download audio". | No — produced by the user |
| `deck-export.js` | **In-browser bundler**: `deckExport.preview()` builds a single self-contained file that **keeps the Studio**; `deckExport.publish()` builds the final share-ready file (Studio removed, audio baked); `deckExport.deck()` wraps a published build as a portable `.deck` package. Plain browser JS — no build step. | No — drop in as-is |
| `build-standalone.mjs` | **Headless bundler** — the same job from disk with no browser/server: `node build-standalone.mjs [deck.html] [--preview]`. This is how **you (the agent)** bundle, anywhere the files sit together (the Claude web app code sandbox, a local checkout). | No — run it |
| `make-studio-link.mjs` | Prints a link to the **hosted Audio Studio** (`open-deck.org/studio`) with the deck's narration pre-loaded — for generating audio when the deck preview's CSP blocks ElevenLabs (the Claude web app). `node make-studio-link.mjs [narration-script.js]`. | No — run it |

`deck-animation.css` is the **required CSS** for reveals/dots/tooltips — paste it into the deck's `<style>` (the starter deck already has it inline).

> **Three shapes of a deck — say which you mean.** The **editable deck** (multi-file on disk, or one file with the Studio) is what you author. A **preview** is one self-contained `.html` that *keeps the Studio* — open it anywhere, keep tuning. **Publishing** produces one self-contained `.html` with the Studio removed and audio baked — the file you share. Same single-file bundle; the only difference is whether authoring stays on.

---

## Step 1 — Scaffold the deck

Start from **`assets/starter-deck.html`** (in this skill) — it's a complete, working deck you can open directly: 3 slides, a stepped reveal, tooltips, the rail, and the narration controls. Copy it into the project together with the five companion files from `assets/` (`deck-stage.js`, `deck-enhance.js`, `narration-script.js`, `deck-narration.js`, `deck-animation.css`) — **all in one folder, no subdirectories**. The engine resolves `<script src>` and the `deck-stage` mount relative to the deck, so a flat layout is required. Then replace the demo `<section>`s with the real slides.

### Two wiring shapes — pick the one that matches where you're building

**A. Plain HTML** (what `starter-deck.html` uses; also the shape of a "Save as standalone" export). Mount `<deck-stage>` directly and load the scripts at the **end of `<body>`**, stage first:

```html
<deck-stage width="1920" height="1080">
  <section data-label="Title" data-speaker-notes="…">…</section>
  <section data-label="Agenda" data-speaker-notes="…">…</section>
</deck-stage>

<script src="deck-stage.js"></script>
<script src="deck-enhance.js"></script>
<script src="narration-script.js"></script>
<!-- <script src="narration-audio.js"></script>   ← uncomment once baked -->
<script src="deck-narration.js"></script>
<script src="deck-export.js"></script>
```

**B. Design Component** (when building inside a Claude design project, authored with `dc_write`). The deck is a `.dc.html`; the project's own runtime hydrates it. Mount the stage with `<x-import>` and load the other scripts from `<helmet>` in this order:

```html
<x-dc>
<helmet>
  <style> …your slide CSS + the required animation CSS… </style>
  <script src="deck-enhance.js"></script>
  <script src="narration-script.js"></script>
  <!-- <script src="narration-audio.js"></script>   ← uncomment once baked -->
  <script src="deck-narration.js"></script>
  <script src="deck-export.js"></script>
</helmet>

<x-import component-from-global-scope="deck-stage" from="./deck-stage.js"
          width="1920" height="1080" hint-size="100%,100%">
  <section data-label="Title" data-speaker-notes="…">…</section>
  <section data-label="Agenda" data-speaker-notes="…">…</section>
</x-import>
</x-dc>
```

(Do **not** hand-write a `.dc.html` as a raw file and ship it — a DC needs the project's runtime to hydrate. The portable, openable artifact is always the plain-HTML form.)

Rules that matter either way:
- **Slides are the direct `<section>` children** of the stage. Author content at the **1920×1080** design size; the stage scales to fit.
- Each slide: `data-label="…"` (rail label) and `data-speaker-notes="…"` (presenter note, travels with the slide on reorder).
- Don't set `position`/`inset` on `<section>` — the stage positions them.
- Keep the `deck-stage:not(:defined){visibility:hidden}` rule to avoid an unstyled flash.
- Keep the **engine-load watchdog** (the inline `<script>` at the end of `starter-deck.html`). If the deck is ever opened as a lone file without its companion scripts, it replaces the blank screen with an actionable message instead of a black page. It auto-clears when the engine loads, so it's harmless in every deck — don't strip it.
- `narration-audio.js` is commented out until audio is baked.

### Single-file environments (the Claude web app) — deliver a *preview*, not the kit

The multi-file deck only renders where its companion files are actually served next to it (local disk, a static host, Claude Code). **Some runtimes preview a single HTML file without serving its siblings — most notably the Claude web app's artifact preview.** There, the multi-file deck loads nothing: `<deck-stage>` never upgrades and you get a blank (often black) page — exactly what the watchdog now flags.

So when you're building in a single-file-preview environment, don't hand over the multi-file deck. **Bundle it into one self-contained file first** and hand *that* over:

- While still authoring (you want the Studio for narration), build a **preview** — `node build-standalone.mjs <deck>.html --preview` — it inlines everything but keeps the Studio live.
- When the deck is final, **publish** — `node build-standalone.mjs <deck>.html` — Studio removed, audio baked.

In the Claude web app the files you write *do* sit together on the code-execution sandbox's filesystem, so `build-standalone.mjs` runs there directly. (`deck-export.js`'s in-browser `deckExport.preview()`/`.publish()` can't run in that preview — it has no http server to fetch siblings from — so prefer the headless bundler here.) See **Step 6** for the full bundling reference.

> **⚠ Narration can't be *generated* inside the web app preview** — but there's a clean path. The artifact preview's Content-Security-Policy blocks the outbound connection to ElevenLabs, so clicking **Generate** in the in-deck Studio fails there (it detects this and says so). Generation needs a browser whose CSP allows the call. Route the user to the **hosted Audio Studio**, which is served from a domain whose CSP permits it:
> 1. Generate a pre-loaded link: `node make-studio-link.mjs narration-script.js`. It prints a `https://open-deck.org/studio/#…` URL with the deck's narration encoded in the `#fragment` (which never reaches the server). Hand that link to the user.
> 2. The user opens it **in a normal browser** (works on desktop *and* mobile), pastes their ElevenLabs key + Voice ID, clicks **Generate**, then **Download narration-audio.js**. Their key stays in their browser; the deck never leaves yours.
> 3. They send `narration-audio.js` back to you (drop it into the chat). Place it next to the deck and **publish**.
>
> The in-deck Studio can also self-serve this: its **Audio studio → Generate** step has a "Generate on the web" link that builds the same hosted-Studio URL. A **preflight probe** runs when the Studio opens, so in a blocked environment it opens **directly** in the web path (it also auto-switches if a `Generate` call is refused). Either way the wizard **re-paths its remaining steps** to match the hand-off — generate on the web, then **bring `narration-audio.js` back into the chat** (a web-app user has no folder to place it in) and ask you to publish — so the on-screen instructions stay correct for that route. So `make-studio-link.mjs` is for when *you* want to hand over the link directly; the user can otherwise reach it from the deck.
>
> The hosted Studio also accepts a pasted `narration-script.js` if the link is ever too long or unavailable (`make-studio-link.mjs` prints the paste-fallback JSON too). Don't try to generate audio agent-side from the deck's key — the key is meant to never leave the user's browser, and the sandbox's network egress is restricted anyway. *(If you'd rather not use the hosted page at all, the fallback still works: have the user open the **preview** file in their own browser and use its in-deck Studio there.)*

---

## Step 2 — Add step animations

Give any element a `data-step="N"` (N = 1, 2, 3…). It starts hidden and reveals when the viewer reaches step N (→ / click / Space). Advancing past the last step moves to the next slide; ← steps back, and stepping back into the previous slide lands on its last step (fully revealed, like PowerPoint) rather than restarting it.

```html
<section data-label="Pillars">
  <h2>Three pillars</h2>
  <div class="tile" data-step="1">First</div>
  <div class="tile" data-step="2">Second</div>
  <div class="tile" data-step="3">Third</div>
</section>
```

- **Step dots** are auto-injected (bottom-left) on any slide that has steps — no markup needed.
- Multiple elements can share the same `data-step` to reveal together.
- The **required CSS** (`deck-animation.css`) defines what `.step-visible` / `.step-current` / `.step-past` look like. Without it, `data-step` elements just stay hidden. Paste it into your `<style>` and restyle freely (it's plain fade-and-rise by default).
- Elements with **no** `data-step` are visible on slide entry (and can stagger in via the optional `.frame` rule in the CSS).

### Tooltips
Add `data-tip="explanatory text"` to any element for a smart hover tooltip (auto-flips above/below). Tooltips on a not-yet-revealed step stay suppressed until that step shows.

---

## Step 3 — Write the narration

Edit `narration-script.js`. It exposes `window.__NARRATION` with a `slides[]` array — **one entry per `<section>`, in order**. Each slide's `lines[]` maps to steps:

- `lines[0]` → spoken when the slide first appears (before any reveal)
- `lines[1]` → spoken at `data-step="1"`, `lines[2]` at `data-step="2"`, …

```js
window.__NARRATION = {
  voiceId: "",                       // optional: pre-fill the Studio's Voice ID
  modelId: "eleven_multilingual_v2",
  gapSeconds: 0.5,                   // beat between a clip ending and auto-advance
  slides: [
    { lines: ["Welcome. Here is the plan."] },                  // slide 1, no steps
    { lines: ["", "First pillar.", "Second.", "The payoff."] }, // slide 2, 3 steps
    { lines: ["Thank you."] }
  ]
};
```

Writing guidance (matches how the voice reads best):
- **One idea per sentence**, short sentences.
- **Spell acronyms with periods** so they're read as letters: `"A.I."`, `"U.X."`, `"G.L.M."`.
- Respell numbers a TTS misreads: `"twenty twenty-six"` instead of `2026`.
- Empty string `""` = silent for that step.

> **These respellings are spoken-only — they belong ONLY in `narration-script.js`, never in the slide `<section>` text.** Spoken text and on-screen text are separate sources: the engine reads `narration-script.js` for the voice and never echoes it on screen. So the slide keeps the human-readable form and the narration line carries the pronunciation hint:
>
> | Appears on the slide (`<section>`) | Spoken (`narration-script.js`) |
> |---|---|
> | `Our HR team` | `"Our H.R. team"` |
> | `Shipping in 2026` | `"Shipping in twenty twenty-six"` |
> | `The AI roadmap` | `"The A.I. roadmap"` |
>
> If `H.R.` ever shows up *in the slide*, the respelling leaked into the markup — fix the `<section>`, not the narration. (Optional, if you'd rather keep even the narration source clean: ElevenLabs also honors SSML `<say-as interpret-as="characters">HR</say-as>` and pronunciation dictionaries, but support varies by model — the period-spelling is the simplest reliable default.)

If the user wants you to draft the script, write it from their instructions, keep their tone, and confirm before they generate (generation costs ElevenLabs credits).

---

## Step 4 — Generate the audio (the user does this, in-browser)

Audio is generated **in the browser** so the ElevenLabs key never leaves the user's machine and is never baked into a file.

While authoring, the control bar shows a blue **Studio** button (a different colour from the neutral playback controls, so it reads as a build-time tool). It opens a menu of authoring actions:
- **Audio studio** — a 5-step wizard: **① Connect** (API key + Voice ID) → **② Generate** (one clip per step, progress bar) → **③ Download** (saves `narration-audio.js`) → **④ Place** (move that file next to the deck) → **⑤ Publish** (tells the user to ask their AI agent: *"Publish this presentation as a standalone file."*). The publish step deliberately promotes only the agent path. **The wizard branches** when the user hands off to the hosted Studio: a **preflight reachability probe** runs when the Studio opens, so in a blocked environment (e.g. the Claude web app preview) it opens **straight into** the web path rather than switching mid-run — and the user can also choose it via "Generate on the web" in ②. The web path is a 3-step flow — **① Generate on the web** (opens `open-deck.org/studio` with the narration pre-loaded) → **② Bring it back** (attach `narration-audio.js` into the chat — *not* place it in a folder, since a web-app user has none) → **③ Publish** (*"Integrate this narration audio and publish the deck as a standalone file"*). A "← Generate in this browser instead" link returns to the 5-step path.
- **Cue overview** — a checklist of every step showing which have narration text and which have audio, to spot gaps before publishing.
- **Build preview** — runs the in-browser bundler to make a single file that *keeps* the Studio (power-user shortcut for previewing while you author).
- **Publish standalone** — runs the in-browser bundler for the final share-ready file (Studio removed, audio baked).

The **Studio button is hidden in the published standalone** (via `window.__DECK_EXPORTED`); a *preview* keeps it. The console API still works too (`deckNarration.studio()`), printed on every load.

> Narration text is edited only in `narration-script.js` (the file). There is intentionally **no in-browser narration editor** — browser edits wouldn't survive into the export, so they'd mislead. Change the wording in `narration-script.js`, then re-generate.

Tell the user to:
1. Open the deck, click **Studio → Audio studio** (or run `deckNarration.studio()` in the dev console).
2. **① Connect:** paste their **ElevenLabs API key** and **Voice ID** (ElevenLabs → Voices → the voice → ID), then **Next**.
3. **② Generate:** click **Generate narration** — one clip per non-empty line, with a progress bar, cached in the browser (IndexedDB). On success the wizard advances. To re-do lines: edit `narration-script.js`, reopen, tick **Re-generate clips that already exist**, and Generate.
4. **③ Download:** click **Download audio** to save `narration-audio.js`.
5. **④ Place:** move `narration-audio.js` into the same folder as the deck.
6. **⑤ Publish:** ask the AI agent to *"Publish this presentation as a standalone file"* (the agent runs the publish build).

> **Recommend (can't enforce) Chrome or Edge for generation — or serve over http.** The clip cache uses IndexedDB, which **Chromium allows from `file://` but Safari blocks and Firefox treats inconsistently**. The ElevenLabs call itself works in any *normal* browser (CORS returns `Access-Control-Allow-Origin: *`); the one exception is a locked-down **CSP** environment — most notably the Claude web app preview, which refuses the connection (see the web-app note in Step 1). Where the *cache* is blocked the generated clips live only in memory for that session, so **the user must click "Download audio" before reloading** or they'll regenerate (and re-pay) — but the download itself works even then (it falls back to the in-memory clips). The Studio detects a blocked cache and shows an inline warning; the deck also prints the tip to the console. This only affects *generating* — once audio is **baked**, playback reads the inlined map (no IndexedDB), so a published deck plays offline in **every** browser, including from a double-clicked `file://`.

Console API (all available globally once the deck loads):
- `deckNarration.studio()` — open the generation panel
- `deckNarration.play()` / `.stop()` — start/stop auto-play
- `deckNarration.narration(true|false)` — narration on/off
- `deckNarration.status()` — `{clips, narrationOn, autoplay}`

---

## Step 5 — Playback model (what the two on-screen controls do)

The deck overlay (bottom bar, alongside Prev/Next/Reset/Fullscreen/Slides) gains two controls:

- **Narrate** — master on/off. When on, **every step you land on speaks**, whether you click through manually, use arrows, click a tile, or jump via a thumbnail.
- **Auto-play / Pause** — hands-free: reveals a step, plays its clip, and advances when the clip ends. Turning it on implies Narrate on. **Pausing keeps Narrate on**, so you can keep clicking through and still hear each step.

It is a **single-driver** model: any step change cancels stale audio and any pending auto-advance, then plays the clip for the step you're actually on — so manual clicks during auto-play never double-advance or desync.

---

## Step 6 — Preview, publish & package

Both a **preview** (Studio kept) and a **publish** (Studio removed, audio baked) are the same one-file bundle — they inline every local script, the baked audio, same-origin stylesheets + their `url()` assets, `<img>` sources, and the Google fonts into a single self-contained `.html`. To make narration play on **any machine, offline, with no key**, bake audio in first:

1. In the Studio, click **Download audio** → produces `narration-audio.js` (all clips as base64 data URLs).
2. Move that file into the deck's folder (next to `deck-stage.js` etc.).
3. Bundle. Three routes follow; **Route A is the default** because it works wherever the files sit together (including the Claude web app sandbox).

### Route A — the headless bundler (`build-standalone.mjs`, recommended)

Run the kit's bundler with your own shell — no browser, no server:

```bash
node build-standalone.mjs your-deck.html            # publish → your-deck.standalone.html
node build-standalone.mjs your-deck.html --preview  # preview → your-deck.preview.html (keeps Studio)
```

It auto-detects the deck (the only `.html` mounting a `<deck-stage>`) if you omit the name, activates `narration-audio.js` when present, embeds the Google fonts over the network (best-effort — keeps the CDN `<link>` if offline), and neutralizes the engine files' literal `</script>` for you. Output goes to stdout. Use `--out FILE` to override the path. **This is how you bundle in the Claude web app** (the files you wrote share the code-sandbox filesystem) and locally.

**No-Node fallback — bundle with file tools by hand.** When Node isn't available, do the same inlining manually:

1. **Read** the deck `.html` and inline every local `<script src="…">` (the kit scripts + `narration-audio.js` if present) by replacing each tag with `<script>…file contents…</script>`. Skip absolute/CDN URLs.
   - **Publishing? Mark it.** Inject `<script>window.__DECK_EXPORTED=true;</script>` *before* the (inlined) `deck-narration.js`. This hides the **Studio** button, and — when no audio was baked — the Narrate + Auto-play buttons too. **For a *preview*, skip this flag entirely** so the Studio stays live.
   - **Activate baked audio:** if `narration-audio.js` is in the folder, un-comment its `<script>` line so the inlined copy is live.
   - **⚠ Neutralize closing tags:** the engine files contain the literal text `</script>` inside their doc-comments. Before inlining a file, replace `</script` with `<\/script` in its contents, or the first one will close the block early and corrupt the file.
2. **Fonts:** fetch each `woff2` the deck's Google-Fonts `<link>` references and inline it as a base64 `@font-face` rule, then remove the `<link>`/`preconnect` (renders identically offline). If you can't fetch, leave the CDN `<link>` (custom fonts then need a connection; otherwise system fallback).
3. **Write** the result as `your-deck.standalone.html` (or `.preview.html`). Expect it to be large when audio is baked (often several MB).

### Route B — self-service in the browser (`deck-export.js`)

For a user who'd rather not involve the agent: load **`deck-export.js`** (it's one of the kit files) and run, in the browser dev console:

```js
deckExport.preview()     // downloads your-deck.preview.html — keeps the Studio
deckExport.publish()     // downloads your-deck.standalone.html — final, Studio removed
```

Same inlining as Route A, entirely in the browser. Because it `fetch()`es same-origin files, the deck must be **served over http(s)** — not opened via `file://`, and **not in a single-file preview like the Claude web app** (use Route A there). *Inside a Claude design project,* the project's own **"Save as standalone HTML"** export is the publish equivalent.

Without baked audio, a publish is a clean silent deck: the **Narrate + Auto-play controls are hidden** (nothing to play), while all the animation, tooltips, and navigation still work. The clips live only in the browser that made them, so voice returns only if someone regenerates with a key (the `deckNarration.studio()` console API stays available for that).

### Route C — package as a portable `.deck` file

When the user wants to present on a phone/tablet, or asks to **"export as a `.deck`"**, package the deck for a compatible deck player app. A `.deck` is a Zip archive with MIME type `application/x-deck` whose root holds:

```
my-talk.deck
├── deck.json       # the manifest — see assets/deck.schema.json
├── index.html      # the published file (Route A/B output) — fully self-contained
└── thumbnail.png   # optional preview image shown in the player's library
```

Two routes, same output:

```js
deckExport.deck()   // browser console: builds the standalone, writes deck.json, downloads my-talk.deck
```

…or **ask the agent** to do it with file tools: produce the published HTML exactly as in Route A, write it as `index.html`, add a `deck.json`, and zip the two at the archive root as `<id>.deck`. Either way the result is one portable file.

The `deck.json` manifest is defined by **`assets/deck.schema.json`** (JSON Schema) — read that file for the exact field set, types, patterns, and defaults. In short: only `entry` (`"index.html"`) is strictly required; `id` (the filename), `title`, `orientation` (`landscape` for these 1920×1080 decks), and optional `author`/`version` round it out. Add `"$schema": "./deck.schema.json"` to a hand-written `deck.json` for editor validation.

**Optional thumbnail.** Drop a `thumbnail.png` (or `.jpg`/`.webp`/`.svg`) next to the deck before exporting and `deckExport.deck()` bakes it into the package and records `"thumbnail": "thumbnail.png"` in `deck.json`; or pass one explicitly: `deckExport.deck({ thumbnail: "data:image/png;base64,…" })`. Hand-writing the package? Add the image file at the archive root and point `thumbnail` at its relative path. Players that support it (e.g. the OpenDeck app) show the image in their library; players that don't simply ignore the field.

Because the deck is the standalone bundle, **baked audio plays offline** inside the player too — it renders in a real web origin, so all animation, narration, fonts, and tooltips work exactly as in the browser.

---

## Gotchas / notes

- **CSS is mandatory.** If reveals don't show, the animation CSS isn't in the deck's `<style>`. Copy from `deck-animation.css`.
- **Load order & location.** The four scripts go inside `<helmet>` in the given order, and **all files must sit in the same folder as the deck** (the engine resolves `src` paths relative to the deck — a subfolder breaks the helmet scripts). For a plain (non-DC) HTML deck, put the scripts at the end of `<body>` instead, with `deck-stage.js` first.
- **Design tokens.** The CSS ships with plain values; if the deck has a design system, swap them for its tokens (easing, accent color) so reveals/dots/tooltips match.
- **Slide count.** `slides[]` in the script should line up with the `<section>`s; extra/short entries just stay silent — fine while drafting.
- **Don't rename the globals.** `deck-enhance.js`/`deck-narration.js` look for `window.__NARRATION` and `window.__NARRATION_AUDIO`; keep those names.
- **Extending the stage without forking it.** `DeckStage.addDocumentStyle(id, css)` (1.3.0+) appends CSS to the document-level sheet the stage already injects for `@page`. Use it for rules that must live in the light DOM and must not depend on the deck author pasting them in — print/PDF fixups, a shared animation vocabulary, a read-alone caption layer. `css` is a string or `(stage) => string`; it is idempotent per `id`, `null` removes it, and every live stage re-syncs at once. Ship the call as a plain `<script src>` loaded **after** `deck-stage.js`; the bundlers inline it like any other deck script.
- **Editing safety.** `deck-enhance.js` suppresses nav keys while you're typing in a field/contenteditable, so authoring text won't flip slides.
- **Hosting & CSP.** A deck — and any standalone export — is fully inline: an inline `<style>` block, an inline `<script>`, and (on export) the whole engine inlined too. It works on any host that doesn't impose a restrictive Content-Security-Policy, which is the default for static hosting (GitHub Pages, S3, Netlify/Vercel, plain nginx) — so most self-hosting just works. If the host *does* set a CSP, the deck needs `script-src 'unsafe-inline'` and `style-src 'unsafe-inline'` (the engine uses no `eval`/`new Function`, so `'unsafe-eval'` is **not** required), plus `data:`/`blob:` for embedded fonts, images, and audio. A minimal working policy: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:`. On Cloudflare `_headers` (and Pages-style headers generally), matching rules *accumulate* rather than override — a strict global CSP plus a relaxed deck CSP emits two headers and the browser enforces the stricter intersection, which silently breaks decks. Scope CSP so exactly one rule matches the deck path.

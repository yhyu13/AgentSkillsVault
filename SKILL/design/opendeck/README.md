# OpenDeck — Skill Kit

> **OpenDeck** · `opendeck` · MIT · The OpenDeck Authors

A reusable kit for building **animated, narrated HTML presentations**: slides that reveal step-by-step as you click, hover tooltips, a thumbnail rail, fullscreen, and **AI voice narration** with an in-page studio that generates the voiceover (ElevenLabs) and can bake it into a fully offline file.

Share this folder (or the zip) with anyone. Hand it to Claude in a **blank design project** and say *"use this skill to build a narrated deck"* — `SKILL.md` tells it everything it needs.

---

## What's in here

```
opendeck/
├── SKILL.md                    ← instructions for the agent (the main file)
├── README.md                   ← this file (for humans)
└── assets/                     ← the shippable deck kit
    ├── starter-deck.html       ← a minimal WORKING deck — open it, copy, edit
    ├── deck-stage.js           ← slide engine (scaling, nav, rail, notes)
    ├── deck-enhance.js         ← step reveals, step dots, tooltips, F/S keys
    ├── deck-narration.js       ← Narrate + Auto-play controls + Audio Studio
    ├── narration-script.js     ← template — write narration text here
    ├── deck-animation.css      ← required styles for reveals/dots/tooltips
    ├── deck-export.js          ← in-browser bundler → preview / publish / .deck
    ├── build-standalone.mjs    ← headless bundler (node) → preview / publish
    └── deck.schema.json        ← JSON Schema for a .deck package's deck.json
```

The kit lives in `assets/`. When you build a deck, copy those files **into one
flat folder** alongside the deck — the engine resolves paths relative to the
deck, so they must sit together (no subfolders) in the *output*.

---

## Quick start

1. **Copy the files into your project**: take `starter-deck.html` and the five companion files from `assets/` (`deck-stage.js`, `deck-enhance.js`, `narration-script.js`, `deck-narration.js`, `deck-animation.css`) and keep them **together in one folder** — the deck references them by relative path.
2. **Open `starter-deck.html`** — it runs as-is: 3 slides, a stepped reveal, tooltips, the rail, and the narration controls.
3. **Replace the slides** with your own `<section>`s. Add `data-step="1/2/3…"` to anything you want to reveal progressively, and `data-tip="…"` for hover notes.
4. **Write narration** in `narration-script.js` — one line per slide/step.
5. **Generate audio**: open the deck, open the browser dev console, run `deckNarration.studio()`, paste your ElevenLabs API key + Voice ID, and click Generate.
6. **Make it portable**: in the studio, click **Download audio** to get `narration-audio.js` and drop it next to the deck. Then bundle into one self-contained `.html` — three ways, all needing **nothing installed**:
   - **Ask Claude** *"publish the standalone"* (or *"build a preview"* to keep the Studio while you tune) — the agent runs the bundler straight from the folder. No server, no Python.
   - **Headless**: run `node build-standalone.mjs your-deck.html` (add `--preview` to keep the Studio). Works anywhere the files sit together.
   - **In the browser**: run `deckExport.publish()` (or `deckExport.preview()`) in the dev console — serve the deck over http(s) for this, not `file://`.

   A **preview** keeps the authoring Studio (open it anywhere, keep tuning); **publishing** removes the Studio and bakes the audio so the result narrates offline, anywhere, with no key and no companion files.
7. **(Optional) Package for a player app**: run `deckExport.deck()` (or ask the agent) to wrap the published file into a portable `.deck` file — a Zip of `deck.json` (see `assets/deck.schema.json`) + `index.html` — for playback in a compatible deck player app.

---

## How presenting works

The deck's bottom control bar has, alongside Prev/Next/Reset:

- **Fullscreen** (`F`) and **Slides** (`S`, toggles the thumbnail rail)
- **Narrate** — when on, each step speaks as you reach it (manual or auto)
- **Auto-play / Pause** — hands-free; advances when each clip finishes. Pausing keeps narration on so you can take over by clicking.

Keyboard: **← / →** step within a slide then move between slides; **Space/PgDn** forward; **R** resets to slide 1; **number keys** jump.

---

## Notes

- **API key safety**: your ElevenLabs key is entered in the page, used only in your browser (session-only), and is **never** written into any file. Only the resulting audio clips get baked in when you choose "Download audio".
- **File size**: a baked, offline deck embeds the audio as data — expect several MB. The un-baked deck is tiny; clips live in the browser cache until you bake them.
- **Generating audio — use Chrome or Edge (or a local http server)**: the clip cache uses IndexedDB, which Chromium allows from a `file://` page but Safari blocks and Firefox handles inconsistently. Where it's blocked, generated clips aren't remembered across reloads — so **click "Download audio" before reloading** (the Studio warns you when this applies). Once you've baked the audio, playback no longer uses IndexedDB, so the exported deck plays offline in every browser.
- **Design systems**: the animation CSS uses plain colors/easing so it works anywhere. If you have a brand system, swap those values for your tokens.
- **ElevenLabs-specific**: the studio calls ElevenLabs directly. To use another TTS provider you'd adjust the fetch call in `deck-narration.js`.

See **`SKILL.md`** for the complete build guide.

---

## Changelog

- **1.3.1** — **Stepping back lands on the previous slide's last build, like PowerPoint.** `deck-enhance.js`: pressing ← past a slide's first step used to open the previous slide blank at step 0, so the presenter had to re-click through every reveal to get back to where they were. It now opens fully revealed, and further ← presses peel the steps off in reverse. "Previous" is the slide just before the old one with only skipped slides between, read from the old slide *element* (so rail delete/reorder still never counts as a step back); forward, Home/End, rail jumps and Reset still start a slide at 0.
- **1.3.0** — **Hardened stage, enhance and bundlers; a stage extension seam.** `deck-stage.js`: skipped slides are now skipped in *every* navigation path (Home/End/`R`/1–9/`goTo()`, mount, deep-link restore, rail delete); the font-reveal hide can no longer print blank PDF pages; rail drop-side and edge auto-scroll follow the rail's orientation; `stage.notes` exposes the parsed `#speaker-notes`; `slideIndexChanged` carries the slide's `note`; and `DeckStage.addDocumentStyle(id, css|fn)` lets an extension add light-DOM rules (print/PDF fixups, animation vocabularies) to the injected document sheet without forking the file. `deck-enhance.js`: boots on the slide actually showing (hash-aware), reveals reset only when different content is on screen, and the rail keeps ↑/↓ when a thumbnail has focus. `deck-export.js` / `build-standalone.mjs`: HTTP errors are no longer base64'd as assets; `<audio>/<video>/<source>` and deck-level `<style>` `url()`s are inlined; matchers tolerate `defer`/`type="module"`, single-quoted and unquoted attributes and `data-src` decoys; commented-out tags are left alone; rewriting is one offset-aware pass (no substring collisions such as `Inter.woff`/`Inter.woff2`); and `build-standalone.mjs` confines every resolved path to the deck folder (realpath containment) so a hostile `src="../../etc/hosts"` is reported, not embedded.
- **1.2.4** — **"Open Studio" now degrades gracefully where new tabs are blocked.** A sandboxed iframe without `allow-popups` (the Claude web app preview) silently swallows `target="_blank"`, so the button appeared to do nothing. It now detects the blocked popup (`window.open` returns null) and falls back to copying the link, with a one-line "New tabs are blocked here — link copied. Paste it into a browser tab" hint. In normal browsers it opens a tab as before (opener severed); ⌘/Ctrl/middle-click keep their native new-tab behaviour.
- **1.2.3** — **The Audio Studio now picks the right path up front instead of switching mid-run.** A lightweight preflight reachability probe runs when the Studio opens: if this environment can't reach ElevenLabs (e.g. the Claude web app preview's CSP), the wizard opens **directly** in the 3-step web path with a short note explaining why — no more starting at "step 2 of 5" and jumping to "step 1 of 3" when the user hits the wall. Reachable environments stay on the 5-step local path. The probe is keyless and `no-cors`, so it can only tell *reachable* from *blocked* (never sees your key); a CSP block fails fast, so blocked environments switch with no perceptible delay. The post-Generate auto-switch remains as a backstop.
- **1.2.2** — **The Audio Studio wizard now re-paths itself for the hosted hand-off.** When a user generates on the web — by clicking "Generate on the web," or automatically when the ElevenLabs call is blocked here (e.g. the Claude web app preview) — the wizard switches from its 5-step local path (Connect → Generate → Download → **Place** → Publish) to a 3-step web path: **Generate on the web** → **Bring it back** → **Publish**. The "Place the file in the folder next to your deck" step is dropped (a web-app user has no such folder); instead they're told to **attach `narration-audio.js` back into the chat** and ask the agent to publish. A "← Generate in this browser instead" link returns to the local path.
- **1.2.1** — The in-deck Audio Studio now surfaces the hosted Studio itself: a "Generate on the web" link in the Generate step (and an automatic hand-off if the ElevenLabs call is blocked) opens `open-deck.org/studio` with the narration pre-loaded — so users can reach it straight from the deck, no agent required.
- **1.2.0** — **Hosted Audio Studio for locked-down environments.** Narration can't be generated inside the Claude web app's deck preview (its CSP blocks ElevenLabs). New `make-studio-link.mjs` prints a link to `open-deck.org/studio` with the deck's narration pre-loaded in the URL fragment; the user opens it in any browser (incl. mobile), generates with their own key, and downloads `narration-audio.js` to hand back for publishing. Key stays client-side; the deck never leaves the agent.
- **1.1.9** — **Audio download now works where the cache is blocked.** "Download audio" used to read only from IndexedDB, so a sandboxed iframe or Safari/Firefox-from-`file://` could generate clips yet never save them; it now falls back to the in-memory clips. The Studio also detects a *blocked connection* (e.g. the Claude web app preview's CSP refusing ElevenLabs) and says so plainly instead of failing every clip — with guidance to generate in a normal browser, then publish. SKILL.md documents this web-app reality.
- **1.1.8** — **Preview vs publish.** Bundling now has two modes: a *preview* keeps the Studio live (open it anywhere, keep authoring), *publish* removes it and bakes audio for sharing. New `build-standalone.mjs` headless bundler (runs from disk with no browser/server — the way to bundle in the Claude web app sandbox). New `deckExport.preview()`/`.publish()` (`standalone()` kept as an alias). Starter deck gained an inline engine-load watchdog: if a deck is opened as a lone file without its scripts, it shows an actionable "publish this deck" message instead of a blank page.
- **1.0.0** — Initial release. Animated, narrated HTML decks: step reveals, tooltips, thumbnail rail, fullscreen, in-browser ElevenLabs Audio Studio, offline audio baking, and `deck-export.js` — an in-browser bundler (`deckExport.standalone()`) that inlines scripts, audio, and fonts into one self-contained `.html`, plus `deckExport.deck()` to package a portable `.deck` file.

---
name: visual-learner
description: Turn any topic, document, meeting brief, or codebase concept into a single-file interactive learning presentation with a narrated two-voice podcast audio track, synced slides, captions, auto-popping glossary cards, side notes, quizzes, and animated visuals. Use whenever the user says "help me learn X", "explain X visually", "make a podcast/presentation about this", "visual learner", "turn this doc into something I can listen to/watch", or shares material they want to absorb by listening and watching instead of reading.
---

# Visual Learner

Produce ONE self-contained HTML file: an audio-narrated, slide-synced, interactive learning artifact. Works offline once generated. Design language: Nova (bundled, see `references/design-language.md`). Never use emojis anywhere in the output; icons are inline SVG only.

## Workflow

### 1. Understand the material

Read/research the source thoroughly first (files, URLs, or web research). Do NOT start writing content until you can explain the topic yourself. Identify: the 3-7 key ideas, the jargon a newcomer won't know, what is genuinely decision-relevant for THIS user, and 2-4 things worth testing with a quiz.

### 2. Author `content.json`

Read `references/content-guide.md` for the schema, slide HTML vocabulary, animation classes, and interactivity patterns. Rules of thumb:

- Script: two speakers (host asks, expert explains), 25-60 lines, conversational, no filler. Each line maps to a slide index. 6-9 min listening time.
- Slides: one idea per slide, 8-20 slides. Use the provided Nova classes; use `a-rise`/`a-draw` animation classes for staged reveals; inline SVG for diagrams.
- Glossary: every term a newcomer might not know (5-15 entries). Attach `"term"` to the line where it is first spoken so the jargon card pops at the right moment.
- Side notes: `"note"` on lines adds a margin note to the active slide (context, caveats, sources).
- Interactivity: at least one quiz and one toggle/flip element per ~6 slides. Interactive slides should ask the listener to pause and try.

### 3. Build

```bash
python3 scripts/build.py content.json --out <topic-slug>.html
```

The script auto-detects a TTS engine in this order: `VL_TTS` env override, mlx-audio (Kokoro, best local on Apple Silicon), edge-tts (free cloud, needs internet), piper (set `VL_PIPER_MODEL`). macOS `say` is never used - its quality is below the bar. If no engine is available it builds in silent mode: a virtual clock drives slides/captions with estimated timings, and the file upgrades to audio later via `--audio`.

If the user already has a narration file: `python3 scripts/build.py content.json --audio narration.mp3 --out x.html` (offsets are distributed proportionally to line length across the real duration).

Requires: python3. ffmpeg strongly recommended (concat + mp3 encode); without it, WAV-capable engines still work with pure-python concat.

### 4. Verify, then deliver

Open-check the HTML (or at minimum re-read the build log: engine used, duration, cue count). Confirm: no emoji anywhere, glossary pops on first mention, quiz reveals work, both themes render (the file follows system light/dark). Present the single HTML file to the user. Mention which TTS engine was used and the total runtime.

## Degradation ladder

1. Full: local TTS + audio player.
2. edge-tts: same, needs internet at build time.
3. `--audio`: user-supplied narration, proportional sync.
4. Silent: virtual-clock playback, captions act as the narration. Never fail the build because TTS is missing.

## Hard rules

- Single file output. No CDN, no external requests at view time.
- Nova design tokens only (bundled in the template). No navy/purple palettes, no gradients, no emoji, no decorative shadows.
- Sentence case. Terse copy. Numbers in mono.
- Respect `prefers-reduced-motion` (template handles it; don't fight it).
- Facts must come from the source material or cited research; the script must not invent specifics.

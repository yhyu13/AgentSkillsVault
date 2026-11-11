# Visual Learner

A Claude skill that turns any topic or document into a single-file interactive learning presentation: two-voice narrated audio, slides synced to the narration, captions, auto-popping glossary cards, side notes, quizzes, flip cards, and animated visuals. Output is one self-contained HTML file that works offline in any browser.

## Install

Copy the `visual-learner/` folder into your skills directory (`~/.claude/skills/` for Claude Code, or Settings > Capabilities in Claude Desktop). Then ask Claude: "help me learn how DNS works, visual learner style" or "turn this PDF into a visual learner presentation".

## Requirements

- python3 (stdlib only)
- ffmpeg recommended (`brew install ffmpeg`) - concat + mp3 encoding
- One TTS engine, best first:
  - `pip install mlx-audio` - Kokoro, local, Apple Silicon, Apache 2.0 (recommended)
  - `pip install edge-tts` - free Microsoft neural voices, needs internet at build time
  - `pip install piper-tts` + set `VL_PIPER_MODEL=/path/voice.onnx` - fully offline, lighter quality
  - none - builds in silent mode (virtual clock, captions as narration); upgrade later with `--audio`

macOS `say` is intentionally not supported (quality too low).

## Manual build

```bash
python3 scripts/build.py content.json --out topic.html
python3 scripts/build.py content.json --audio narration.mp3   # bring your own narration
VL_TTS=edge python3 scripts/build.py content.json             # force an engine
```

## Design

Output follows the Nova design language (bundled in `assets/template.html`): true-gray OKLCH palette, hairline borders, Inter/system type, inline SVG icons, no emoji, light + dark via `prefers-color-scheme`, `prefers-reduced-motion` respected. See `references/design-language.md`.

## Player controls

Space play/pause · arrows jump topics · C captions · G glossary · speed button 1x-2x (default 1.25x) · left-side topic list to jump anywhere.

## License

MIT. Voice licensing depends on the engine you choose (Kokoro is Apache 2.0).

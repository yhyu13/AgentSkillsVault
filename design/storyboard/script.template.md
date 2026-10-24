# {{TITLE}} — Voice-Over Script

Audio output expected at `{{AUDIO_FILENAME}}`.

Target runtime: **{{TARGET_DURATION}}** at ElevenLabs speed 0.90 (~240 wpm).
Word count: **{{WORD_COUNT}}** words.

---

## 1. Paste into ElevenLabs

Use **Eleven Multilingual v2** so `<break>` tags are honored. Paste the block as-is.

```
{{NARRATION_WITH_BREAKS}}
```

---

## 2. ElevenLabs settings

| Setting | Value |
|---|---|
| Model | Eleven Multilingual v2 *(required for `<break>` tag support)* |
| Voice | Calm, mid-range — Adam, Daniel, Brian, or a cloned voice |
| Stability | 0.55 |
| Similarity | 0.75 |
| Style | 0.10 |
| Speaker Boost | On |
| Speed | **0.90** *(this is the lever for runtime — drop to 0.85 if it comes out short)* |

At 1.0 ElevenLabs reads ~270 wpm. At 0.90 it's ~240 wpm. With the embedded `<break>` tags, expect ~{{TARGET_DURATION}}.

---

## 3. Fallback (if `<break>` tags are stripped)

Some plans/voices ignore SSML. If yours does, paste this version — ellipses + blank lines are treated as soft pauses. Use speed `0.85`.

```
{{NARRATION_WITH_ELLIPSES}}
```

---

## 4. Slide-by-slide breakdown — drives the `TIMINGS` array

After you record the MP3, scrub it once and adjust each `time:` to match what you hear. The values below are the engineered starting point.

| Slide | Time | Narration |
|---|---|---|
{{SLIDE_TABLE}}

---

## 5. `TIMINGS` array — paste into storyboard.html

```js
const TIMINGS = [
{{TIMINGS_JS}}
];
const FALLBACK_DURATION = {{FALLBACK_DURATION}};
```

---

## 6. Recording the video

1. Drop the generated `{{AUDIO_FILENAME}}` next to `storyboard.html`.
2. Open `storyboard.html` in Chrome — make it full-screen (F11).
3. Press **Space** to start playback. Verify a transition or two; tweak `TIMINGS` if anything lands a beat off.
4. Screen-record the full-screen window with OBS, ShareX, or QuickTime.
5. The play controls live in the top-right corner *outside* the 1920×1080 deck — a 1920×1080 crop in post drops them entirely.

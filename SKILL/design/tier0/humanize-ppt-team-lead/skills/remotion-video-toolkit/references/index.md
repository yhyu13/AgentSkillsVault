# Rules index

The 29 files under `../rules/` are the working reference. This index groups them so a
renderer does not have to guess which one applies.

## Composition and timing

| Need | Rule file |
|---|---|
| Write the first composition | `rules/compositions.md` |
| Control frame timing | `rules/timing.md` |
| Sequence scenes in order | `rules/sequencing.md` |
| Trim or offset a clip | `rules/trimming.md` |
| Transitions between scenes | `rules/transitions.md` |
| Measure a DOM node / text | `rules/measuring-dom-nodes.md`, `rules/measuring-text.md` |

## Media

| Need | Rule file |
|---|---|
| Images, GIFs, Lottie | `rules/images.md`, `rules/gifs.md`, `rules/lottie.md` |
| Video, audio, durations | `rules/videos.md`, `rules/audio.md`, `rules/get-video-duration.md`, `rules/get-audio-duration.md` |
| Captions and transcripts | `rules/display-captions.md`, `rules/import-srt-captions.md`, `rules/transcribe-captions.md` |
| Decode support / dimensions | `rules/can-decode.md`, `rules/get-video-dimensions.md` |

## Output and delivery

| Need | Rule file |
|---|---|
| Render to MP4 (CLI / Node / cloud) | `rules/rendering.md` |
| Metadata per composition | `rules/calculate-metadata.md` |
| Styles | `rules/tailwind.md`, `rules/fonts.md` |
| Charts and 3D | `rules/charts.md`, `rules/3d.md` |
| Text and motion effects | `rules/text-animations.md`, `rules/animations.md` |

## Deck-slot usage

When this skill serves a deck's `video_slots.json`, each slot becomes one composition
named after the slot id, rendered at the slot's `duration_sec`, 1920×1080, 30fps, and
delivered as `videos/<slot>.mp4` plus `videos/<slot>-poster.png` (frame 0). If a slot
cannot be rendered, the poster still must exist — a deck with an empty video frame is
not shippable.

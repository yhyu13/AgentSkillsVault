# clawd-desktop-19s — the mascot is the pointer (19.0 s, accepted v3, 2026-10-21)

> This folder ships the film only. Its source (the composition, the Blender model, the score, the sound sources) is not
> part of the public release; files named below describe how it was made.
>
> The film: `clawd.mp4`

A reply film. @0xwhrrari posted an After Effects-style 3D promo with "Opus 5.5 replaced After Effects" (450k views); the
ask was 「依然用claude code那个clawbot去做一个3d的动效，但是不要抄袭它这个了」. Three concepts were drawn as stills (A: a
keyboard, B: a glass desktop, C: a letterpress terminal); C was built first, then B was picked and made richer.

**Concept B: the mascot is the pointer.** A light macOS desktop laid flat as a glass tabletop; Clawd (Claude Code's own
glyph, extruded) causes every UI action with its body — landing on an icon is the click, a hop along the input row types
a letter, carrying a file overhead is the drag. The story is one prompt, "make something useless": a page with one
"do nothing" button, which does nothing, and the window shakes its head anyway.

Made with a coding agent driving Blender (the character) and three.js (the desktop, inside the usual `f(t)` comp),
rendered frame by frame with shutter motion blur and `--gpu`. Method: `references/3d.md`.

- the Dock, windows and banner are Liquid Glass: `MeshPhysicalMaterial` with `transmission` refracting the wallpaper, a
  milky canvas face on top; app icons on extruded squircle tiles;
- depth of field by accumulation: 12 lens positions per seek on a thin-lens disc, `setViewOffset` so the focus plane holds,
  rotated per sub-frame so render.py's shutter averages them;
- Clawd moves between anchors (an icon, a point on a window face, a desktop point) that move with what they sit on, so it
  rides the launch bounces, the "no" shake and Mission Control without special cases;
- the camera chases what each section names on springs, and the last 0.45 s blends back onto frame 0 (the loop);
- every word that carries the meaning has a read window (prompt, verbs, file name, "do nothing", the banner, the end
  line), and each was measured on screen: ≥ 24 px tall, squash ≥ 0.6 (`references/3d.md`, *Text in the world*).

## Beat sheet (126 BPM, 40 beats; `beat(n) = n·60/126`)

| t | beat | picture | music (Pretty Pretty, from bar 14) |
|---|---|---|---|
| 0–0.5 | 0–1 | Clawd falls out of the top of frame onto the Claude icon; the Dock's magnification ripples outwards | bar 14 |
| 1.2–2.4 | 2.5–5 | it runs icon to icon (low ride along the Dock), stamps Terminal | |
| 2.6–3.4 | 5.4–7.1 | Terminal bounces twice with it riding | the track's own drop-out (bar 15 beats 2–3): the breath |
| 3.5–3.8 | 7.35–8 | the window springs out of the icon as glass and lands with a ring | **the drop** (bar 16) |
| 4.3–5.5 | 9–11.5 | four hops along the input type the prompt; a stamp submits it | |
| 5.6–6.7 | 11.8–14 | the spinner; three jabs swap the verbs; the reply streams | |
| 7.0–7.6 | 14.75–16 | Write(useless.html); Clawd leaps off, the file is stamped out of the desktop under it | |
| 7.7–9.1 | 16.25–19 | it carries the file's ghost overhead and drops it onto Safari | |
| 9.6–10.4 | 20.25–21.75 | Safari's window rises; the long leap onto "do nothing" | |
| 10.4–11.7 | 21.85–24.5 | the window shakes "no"; a banner slides in ("Did nothing. ✓"); look left, look right, blink | the track stops for the look → blink |
| 12.1–14.3 | 25.5–30 | Mission Control: the camera rises, the windows spread; banner off, then Clawd stamps each yellow light — one window per beat into the Dock, the last with Clawd riding it | |
| 14.6–15.6 | 30.75–32.75 | it runs home along the Dock (the ripple again) | |
| 15.8–18.6 | 33.25–39 | "> made with onetake" types itself big on the desktop | |
| 18.6–19.0 | 39–40 | it leaps off the Claude icon; the apex is the last frame = frame 0 | |

## Versions — what each note changed

- **Concept round** (stills of A / B / C) → 「先做c」; C (letterpress terminal) was built and rendered to v3, then
  「要mac桌面这个吧」.
- **Music**: nine free-library tracks rejected by ear (「音乐太难听了 根本配不上动效」); four Artlist instrumentals auditioned
  on the picture → 「第一个最好 就这样吧」 (Pretty Pretty).
- **B v1–v2** (two white windows, one verb all film — hop, hop, hop; one ¾ follow camera; the payoff showed nothing; no
  hook, no end card): 「这个还可以丰富一下动效内容啊，现在比较单调，做完整一点，毕竟是要宣传的」.
- **B v3**: a hook in second one (the drop + ripple), a second camera grammar (the low Dock ride, Mission Control's rise),
  new verbs (drag, the "no" shake, stamping windows away), glass windows, an end card; the track started two bars earlier so
  its own drop-out is the breath before the drop → 「可以发x了」.

## Credits

- Music: *Pretty Pretty (Instrumental Version)* — Ariel Shalom, an Artlist Original. The film was cut to it from bar 14,
  but the track is licensed, not shipped: `clawd.mp4` plays on the foley alone.
- The app icons on the Dock are Apple's and Anthropic's, shown as part of a macOS desktop.
- Clawd is Anthropic's mascot and Claude Code's own glyph; the model is a study of it for a film about Claude Code.

## Numbers

- Render: 571 frames, 3,377 captures, 276 s on 8 workers with `--gpu` (the glass costs: the version before it was 140 s).
- verify (with the reference): all PASS — still 0.009 (reference 0.007), longest quiet 1.0 s, 9 bursts, continuity 1.00,
  peak 162 px/frame under the shutter, median t80 0.77 (reference 0.77), Clawd in frame 0.29–18.76 s.
- Legibility: 8 words, none under the bar — the prompt 60 px, "do nothing" 43 px, the banner 35–37 px, the end line 86 px.

## Files

| file | what |
|---|---|
| `clawd.mp4` | v3, 1080p30, foley only |

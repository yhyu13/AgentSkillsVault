# Rules

Defaults for every cook run. The brief can change any of them. The user's own bans add to the list.

## Assets

- Zero external assets by default: every mesh, texture, shader and effect is generated in code. No downloaded models, textures, HDRIs or image files.
- Why: it is the impressive part (people often do not believe it), and it forces the model to build things instead of downloading a tree, which shows what the model can really do.
- It applies when the point is the flex: worlds, environments and films that show what code can do. The brief can relax it.
- If anything external is used, list it in the credits. Never hide it.

## Sound

- Code-made music and sound are allowed only if they truly hold up. Sometimes they do (the Chinese landscapes and the alpine lake). Code-made sound effects often sound cheap, especially in launch videos.
- Otherwise use professional free sound libraries and licensed music. Check that the license allows the use, and credit artist and source in the README and the post. The Clawd film had its whole soundtrack replaced with real licensed recordings.
- If a listening skill such as earshot is available, use it. Otherwise say plainly that the sound was not reviewed by ear, and check what can be measured: sync with cuts, levels, no clipping.

## Launch and product videos

- The zero-asset rule usually flips here. Real logos, real product screens and real photos beat drawn SVG people and SVG stand-ins.
- Use the real product UI as reference, and in the video where the brief allows it.

## Slop ban list

Never use these unless the user asks for them:
- eyebrow labels
- monospace uppercase text
- random serif fonts
- purple gradients, and purple as a default accent
- beige
- 01 / 02 / 03 counters
- glowing orbs
- shockwave rings or circles popping out of things
- decorative particles
- long thin decorative lines
- em dashes in any text
- in motion: generic moves such as an icon floating up for no reason
- in sound: rising-pitch whips and cheap synth bells

Films and world showcases usually get no text on screen at all.

## Color

- Color is one of the most important things and the most common failure. Compare it with the references every round.
- Cinematic and realistic: not grey, not washed out, not oversaturated. Light and shadows have to match too.
- Check per region (sky, water, foliage, ground, stone, skin) with the color check in `target-and-bar.md`.
- If everything is grey, check the pipeline before repainting materials: output color space, tone mapping, exposure, fog and haze color.

## Detail

- Every building, tree, rock and waterfall gets care. Nothing may look copy-pasted or simple: vary shape, color and scale per instance.
- The world must read as detailed from far away. Render everything to the horizon and give far trees detail, also in half-wide shots. Never cut draw distance in final renders.
- Water and waterfalls have to look real: color, motion, reflections.

## Weak GPU: quality from offline rendering

A weak GPU (for example an integrated Radeon 780M) is no reason for lower quality. Keep the realtime path efficient and get the quality from offline rendering.
- Realtime preview: lower resolution and fewer samples, only for working.
- Stills and the final video: rendered frame by frame offline at full quality, however long each frame takes.
- Sub-frame accumulation: render several sub-frames per output frame and average them. Jitter time inside the shutter for motion blur, the light position for soft shadows, the lens position for depth of field, and the sub-pixel offset for anti-aliasing.
- Drive animation from the frame number, not the wall clock, so every render is repeatable.
- Measure seconds per frame on a short test before any long render.

## Workspace

- Work only inside the project folder.
- Keep the build runnable at the end of every round. A broken build is a failed round.

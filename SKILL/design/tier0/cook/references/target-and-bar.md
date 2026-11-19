# Target and bar

## References are the minimum bar

Every reference is the floor the work has to reach, not loose inspiration. If a frame would not hold up next to them, it is not done. Study every reference at full size before writing code, and use them as the shot list.

One image tells the model the light, the colors, the composition, the materials and the mood at once. Words cannot carry that as well. That is why the text of a brief can stay short.

## Kinds of references

- 3D worlds and environments: target images generated with an image model (for example GPT Image). Large builds made this way used 9 to 12 references: Athenaion 9, Shanshui and the golden temple 10, the alpine lake 10 to 12.
- Same quality, own style: the brief may ask for the mood and quality of the references in an own art style. Then match light, color and detail density, not the layout.
- UI: real product screens, for example from Mobbin. They set the bar for layout, typography, spacing and density.
- Motion and launch videos: reference videos, analyzed frame by frame (below).

Name images R01, R02 and videos V01, V02 in `cook/refs/`.

## The shot list

`cook/SHOTS.md` has one row per reference image:

| Shot | Ref | Shows | Camera | Take from it | Watch for |
|---|---|---|---|---|---|
| S01 | R01 | [temple on a cliff at dusk] | [low, 28mm, looking west, sun behind] | [warm rim light, haze layers, marble tone] | [far olive trees need detail] |

- Give every shot a fixed camera preset in code (position, target, field of view, time of day), so every round renders the identical framing.
- Render comparison stills at the aspect ratio of the reference.
- Write down what to take from each reference. One reference can lead on light and be ignored on layout.
- For UI, a shot is one screen state at a fixed viewport size.

## Motion references, frame by frame

"All the text moves like this" is about 1% of what a reference video holds. Extract all the small things.

1. Extract frames:
   `ffmpeg -i cook/refs/V01.mp4 -vf fps=10 cook/refs/V01/f_%04d.png`
   Around cuts and transitions, extract every frame of that range by adding `-ss` and `-to` and dropping the fps filter.
2. Make contact sheets to see the rhythm:
   `ffmpeg -i cook/refs/V01.mp4 -vf "fps=2,scale=480:-1,tile=6x5" cook/refs/V01_sheet_%02d.png`
3. Write `cook/MOTION.md` with one line per effect: reference, timecode, what moves, how (easing, duration, direction), why it works.
4. Choose from the list: a core of about 20 strong effects plus 50 to 80 small ones, without overloading the piece. Take from many references. Never copy one element 1:1 or in an obvious way.
5. Never name the source clips in public files.

## The rubric

Score every shot on every dimension. Stills: 0 to 100 as similarity to the reference. Video and motion: 1 to 10.

| Dimension | Checks | Typical failure |
|---|---|---|
| Composition | framing, scale, horizon, focal point, layout | subject too small, empty foreground, wrong lens |
| Light | direction, softness, shadows, atmosphere, time of day | flat light, no haze, hard shadows |
| Color | hue, saturation and brightness per region | grey and washed out, or oversaturated |
| Materials | how water, stone, foliage, metal and skin take light | plastic look, flat water |
| Detail density | near and far, variety, no visible repetition | bare trees in the distance, copy-pasted rocks |
| Motion | timing, easing, transitions, camera moves | linear moves, cheap transitions, jitter |

For UI, map them: composition to layout and spacing, materials to typography and components, motion to interaction and transitions. Write the mapped list into BRIEF.md.

## Stretch targets

99.9% is probably not reachable. That is the point: the number tells the model the job is not done when it first works. For video, state what the references score (about 8.5/10) and set the target above it (9/10 or more). Use one number per dimension, not one overall number, so the weakest dimension cannot hide behind the others.

## Calibration

- Models rate their own work too high, and critics share some of that bias.
- The user's estimate is the truth. If you said 90% and the user says 60 to 70%, log an offset of about minus 25 and subtract it from the critic medians until the user gives a new estimate. Report calibrated numbers to the user.
- For video, let one critic also rate a reference blind on the same scale. If your render scores above the reference while the user says it is worse, the critics are inflated: raise the target.
- Blind pair test: show a critic the reference and the render without labels and ask which one was made in code and why. A confident, correct answer names your next focus.

## Measured and eyeballed

Measured means a command produced the number in this round. Eyeballed means a person or a model judged it. Label every number in ROUNDS.md as one or the other. A similarity percentage is eyeballed unless a command computed it.

Worth measuring:
- Color per region: mean saturation and brightness on a grid, reference against render. This catches "too grey" before the user has to say it.
- Frame time in realtime, seconds per frame in offline rendering, memory.
- The final file: resolution, fps, duration, audio stream (see `ship.md`).

Color check with Python, Pillow and NumPy. Both images need the same aspect ratio. Change the resize size if it is not 16:9.

```python
# usage: python color_check.py reference.png render.png
import sys
import numpy as np
from PIL import Image

def cells(path, grid=4):
    img = Image.open(path).convert("RGB").resize((256, 144)).convert("HSV")
    hsv = np.asarray(img).astype(float) / 255.0
    h, w = hsv.shape[:2]
    out = []
    for y in range(grid):
        for x in range(grid):
            c = hsv[y * h // grid:(y + 1) * h // grid, x * w // grid:(x + 1) * w // grid]
            out.append((c[..., 1].mean(), c[..., 2].mean()))
    return np.array(out)

d = cells(sys.argv[2]) - cells(sys.argv[1])
for name, col in (("saturation", 0), ("brightness", 1)):
    worst = d[np.abs(d[:, col]).argmax(), col]
    print(f"{name}: mean delta {d[:, col].mean():+.3f}, worst cell {worst:+.3f}")
```

A negative saturation delta means the render is greyer than the reference.

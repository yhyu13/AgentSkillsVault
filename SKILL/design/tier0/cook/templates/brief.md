# Cook brief

Copy the block below, fill in the brackets, delete the lines that do not apply, attach your references and send it. It starts with /cook for Claude Code. In Codex, use $cook.

Keep it short. The references carry the look. The text only sets the bar, the rules and the time. Every line steers the agent, so leave out anything you do not mean.

```text
/cook

Build [what, in one sentence] in [three.js / WebGL / Remotion / your stack], based on the [N] reference [images / screens / videos] I attached.

Bar
- The references are the minimum bar. Match them [99.9%] in composition, light, color, materials and detail, also far away.
- [For video: the references are about 8.5/10. Yours needs at least 9/10.]
- Colors: not grey, not washed out, not oversaturated.
- Models rate themselves too high. When I give you my estimate, use mine.

Rules
- Zero external assets. Every mesh, texture, shader and effect is generated in code.
- Sound: [code-made only if it truly holds up, otherwise free licensed music and sound effects, credit the artists].
- Do not use: eyebrow labels, monospace uppercase text, random serif fonts, purple gradients, beige, 01/02/03 counters, glowing orbs, shockwave rings, decorative particles, em dashes, [your own bans].
- My GPU is [weak, for example an integrated Radeon 780M]. Keep it efficient and get the quality from offline rendering.
- Work only inside this project folder.

Time
- This takes at least [8h]. If you are done after [2h], something is wrong. [Small job instead: hard cap of 1.5h.]
- Usage: I have a [5h] limit window. Use about 20% per hour and stop near 60% of each window, never 100%. Spend more only if I say so.
- Depth over breadth: make one thing exceptional before you expand.

Process
- Work in rounds: render stills at the reference shots, compare them side by side with the references, let subagents with zero context rate them, fix the weakest part, repeat.
- Send me stills after every round without pausing. Do not render the final [video] before I approve.

Deliverable
- [About 1 minute] video, [1080p 30fps], impressive first frame, best scene first, a new place every 6 to 7 seconds, no text on screen.
- [Public repo with README, credits, the prompt and honest numbers. / Keep everything local.]

If you have questions, ask now. Otherwise do not ask again and do not stop until it is done. Go cook.
```

## Short version

The skill fills in the defaults for everything you leave out.

```text
/cook
Recreate the [N] attached references in [three.js], code only, no assets. Match them [99.9%].
At least [8h]. Stills after every round, no final render before I approve.
Questions now, then go cook.
```

## Tips

- 3D worlds: generate the references first with an image model (for example GPT Image), 9 to 12 images. Then the agent builds exactly that, in code.
- UI: save real product screens (for example from Mobbin) and attach them as the bar.
- Motion: attach a folder of reference videos. The agent analyzes them frame by frame and takes from all of them without copying one.
- Feedback mid-run works best with a target: a color, a marked screenshot, a timecode, a distance.
- If you cannot say what you dislike, ask the agent how it built that part. Then you have the words.
- A dictated prompt is fine. The agent cleans it up into `cook/BRIEF.md` without changing what you asked for.

# Loop and critics

## The harness, before round 1

Build these once so every round is cheap to check:
- a camera preset per shot from `cook/SHOTS.md`
- a still renderer that writes `cook/stills/rNN/S01.png` and so on, using the offline quality path
- a side-by-side script: reference left, render right, same height
- the color check from `target-and-bar.md`
- for video: a contact sheet renderer and a short clip renderer

## Choosing the focus

In this order:
1. Open items in the user feedback inbox.
2. Any shot with a dimension far below the bar.
3. The dimension with the largest total gap across all shots.
4. Far distance and detail density, which are easy to forget.

Depth over breadth. Keep refining the same shot, scene or house until it looks exceptional before expanding. A small exceptional level beats a large mediocre one. Once all parts exist, the remaining time goes into refinement and polish, not into stopping.

A big focus can be split the /unlazy way (the Depth Tree): subtasks, then their subtasks, and every leaf gets the effort the whole task would normally get. Optional.

A sensible round length is 30 to 90 minutes: long enough for a real change, short enough that the user sees progress when they check in.

## Parallel subagents

- Use them for independent parts (separate scenes, terrain, trees, water, sky, shaders) and for critics. The Athenaion run used 55 subagents, up to 12 in parallel.
- Give each builder the brief, the shots it owns, the files it may change and its done condition. You stay the owner: you integrate, decide and keep the ledger.
- Big builds can use roles: owner, performance monitor, tester, independent reviewer, and an inbox file for user feedback. The reviewer only rates work it did not build.

## Critics

- Fresh context: a new subagent with no history, no code, no brief and not your score. Do not tell it who built the work, how long it took or what you think of it.
- Input: the side-by-side images and the rubric with the bar. For video, contact sheets or the clip, with timecodes.
- At least two critics per round, three or more for big builds. A different model as one of them helps.
- Take the median per dimension. If critics differ by more than 10 points (or 1.0 on a 10-point scale), add another critic.
- Apply the calibration offset. Log raw and calibrated numbers.
- Without subagents, use a fresh session that gets only the images and the rubric. If that is not possible either, score it yourself and mark it "self-scored" in the ledger. A self-scored round never meets the bar. Keep going, or wait for a fresh-context critic. Your own number still cannot stop the run.

Prompt for stills:

```text
You are a strict art director seeing this work for the first time.
Each image shows a reference on the left and a render on the right.
For each image, score how close the right side is to the left side, 0 to 100, on:
composition, light, color, materials, detail density (near and far).
100 means a viewer could not tell which one is the reference. The bar is [99].
Then list the 3 biggest gaps per image: where (region), what is wrong, what to change.
End with the single weakest area across all images.
Format:
S01: composition NN, light NN, color NN, materials NN, detail NN
S01 gaps: 1) ... 2) ... 3) ...
Weakest: ...
```

Prompt for video:

```text
You are a strict film editor seeing this video for the first time.
Rate it from 1 to 10. Strong reference films in this style rate about [8.5].
Score separately: first frame, composition, light, color, motion and transitions, pacing,
and sound (write "not reviewed" if you cannot hear it).
List the 5 weakest moments with timecodes, what is wrong and what to change.
```

## User feedback

- Log the user's exact words in the inbox in ROUNDS.md and handle them before critic items.
- Good feedback has a target: a color ("the sky way bluer, the grass greener and sometimes slightly yellow"), a place (a marked screenshot), a timecode ("seconds 18 to 38"), a distance ("the trees in the distance look undetailed in half-wide shots"). Turn each into a checklist item and close it only with a still or clip that proves the fix.
- If the user says something is off but cannot name it, describe in plain words how you built that part, so they can point at what they dislike.
- "Too grey" is the most common feedback on 3D builds. Run the color check every round so the user does not have to say it.
- A user estimate ("you are at 60 to 70%") updates the calibration offset.

## Progress note

After every round, without pausing:

```text
Round 7, 11.5h in (floor 8h). Stills: cook/stills/r07/  Side by side: cook/compare/r07/
Changed: far forest rebuilt with three tree species and per-instance color variation.
Scores (critic median, calibrated): composition 91, light 88, color 84, materials 86, detail 79.
Measured: S03 saturation delta -0.06, greyer than the reference.
Next: color in S03 and S05, then far-distance detail.
```

Send it with whatever the harness offers: a file-sending tool, inline images, or file paths in a message. Then keep working in the same turn.

## Pacing

Time:
- The start time is in BRIEF.md. Read the clock at the start and end of each round.
- With a floor: if the bar looks met before the floor, it was read too low. Look harder: full-size crops, far distance, color per region, the weakest shot.
- With a cap: plan rounds to end before the cap, with time left for the last log and progress note.

Usage limits:
- If you can read usage (a status command, a usage tool, or numbers the user gave you), check it at every round boundary.
- Default: about 20% of a 5h window per hour, and stop near 60% of the window. Spend toward 99% only when BRIEF.md says the user asked for it. Never 100%. Do not burn the budget in 2 hours and then wait 3.
- Ahead of pace: fewer parallel subagents, more planning, critique and small fixes.
- Behind pace: more parallel subagents on independent parts.
- Near the end of a window: finish the current step and write the ledger, so a hard stop never lands in the middle of a change.

## Long runs

- The ledger is the handoff. You after a compaction, a cloud agent or another model must be able to continue from BRIEF.md, SHOTS.md and ROUNDS.md alone. Write entries a stranger could act on.
- If the project uses git, commit locally at the end of every round, and keep "Best so far" in the ledger pointing at the best round.
- If a round lowers a score, fix it or go back to the best round before moving on, and log why.
- Goal, loop and long-run modes are optional. If one re-prompts you automatically, make its done condition the Stop check in SKILL.md, so it ends when the work is done instead of re-prompting in circles.
- When the user writes "continue", run the next round. Do not answer with a recap.

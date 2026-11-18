<div align="center">

# cook

**Give your agent a target, a bar and time, then let it cook.**

An agent skill for ambitious visual builds that have to hold up next to references: 3D worlds in code, films, launch videos, games and UI. It runs the Cook Loop, one intake and then a long autonomous loop of build, stills, fresh-context critics and fixes until the work matches.

[Install](#install) | [Quick start](#quick-start) | [The Cook Loop](#the-cook-loop) | [Made with this](#made-with-this)

</div>

## Install

Use the [skills CLI](https://github.com/vercel-labs/skills) for supported agents:

```text
npx skills add Leonxlnx/cook
```

Manual locations:

```text
Claude Code:  ~/.claude/skills/cook
Codex CLI:    ~/.codex/skills/cook
```

Invoke it as `/cook` in Claude Code or `$cook` in Codex. It also triggers on phrases like "go cook", "iterate until it matches" or "match the references 99%".

The side-by-side script needs Node 18+ and ffmpeg on your PATH. Everything else is plain Markdown.

## Quick start

Attach your reference images and send:

```text
/cook build this ancient greek world in three.js, match the 9 attached references
```

The agent asks every open question once, with defaults, then works on its own. You get stills after every round. The final video is only rendered after you approve them.

Want full control? Fill in [templates/brief.md](templates/brief.md) and send that instead.

## The Cook Loop

1. **Intake.** All questions up front, each with a default. After that the agent never asks again, so it can run through the night.
2. **Target.** The references are the minimum bar, not inspiration. Every reference becomes a shot with notes on what to take from it. Motion references get analyzed frame by frame.
3. **Bar.** A number per dimension: composition, light, color, materials, detail near and far, motion. For example 99.9% for stills or at least 9/10 for a video. Models rate themselves too high, so the user's estimate calibrates every score. The agent's own estimate does not.
4. **Rules.** Zero external assets by default, honest sound and asset policy, a slop ban list, colors that are neither grey nor oversaturated, offline rendering on weak GPUs.
5. **Time.** A floor for a named demo (at least 8h, done after 2h means something is wrong). A one-screen fix is not a Cook run. Usage stays near 60% of a window unless you ask for more, so the run never hits a limit and stalls.
6. **Loop.** Build, render stills at the reference shots, compare side by side, score with zero-context critics, fix the weakest part, log the round in `cook/ROUNDS.md`, repeat.
7. **Gate.** Stills go to you after every round without pausing. No final render before you approve.
8. **Ship.** First frame is the thumbnail, best scene first, no text on screen, licensed music credited, public repo with honest numbers if you want one.

All run state lives in a `cook/` folder in your project, so the agent can resume after a context reset or hand the run to another agent.

## What's inside

```text
SKILL.md                      the loop the agent follows
references/intake.md          questions, defaults, the brief
references/target-and-bar.md  references, shot list, rubric, calibration
references/loop-and-critics.md rounds, critic prompts, feedback, pacing
references/rules.md           assets, sound, ban list, color, rendering
references/ship.md            final render, video spec, repo, numbers
templates/brief.md            fill-in prompt for your own runs
templates/ROUNDS.md           the round ledger
scripts/side-by-side.mjs      reference left, render right, one row per shot
```

Build a comparison image yourself:

```text
node scripts/side-by-side.mjs --out compare.jpg ref1.png render1.png ref2.png render2.png
```

## Made with this

The numbers below are the author's public claims. This package does not include the logs, so treat them as claims, not as checked results.

**Athenaion**, an ancient Greek world built by Claude Opus 5.5 to match 9 AI-generated reference images. No external assets.

| | |
|---|---|
| Total time | ~45h |
| Agents | 55 subagents, up to 12 in parallel |
| Code | ~45k lines of JavaScript |
| Tokens | ~11M output tokens |
| API-equivalent cost | ~$1.8k to $2.3k (ran on a Max plan) |
| Render | 4K on an integrated AMD Radeon 780M |

[Post](https://x.com/LexnLin/status/2111582260818239777) | [Repo](https://github.com/Leonxlnx/athenaion)

More demos made the same way:

- Alpine lake: [post](https://x.com/LexnLin/status/2112560562609803311), [repo](https://github.com/Leonxlnx/procedural-alpine-lake)
- 10 Chinese landscapes: [post](https://x.com/LexnLin/status/2112264777309491443), [repo](https://github.com/Leonxlnx/shanshui)
- Golden temple: [post](https://x.com/LexnLin/status/2110657641831956870), [repo](https://github.com/Leonxlnx/golden-temple)
- Afterglow pianist film: [post](https://x.com/LexnLin/status/2114422260346110358), [repo](https://github.com/Leonxlnx/afterglow)

All demos: [leonlin.de/demos](https://leonlin.de/demos)

## Works well with

- [unlazy](https://github.com/Leonxlnx/unlazy) for effort and completion discipline. Cook sets the target and the bar, unlazy makes sure the work behind it gets done.
- Any goal, loop or long-run mode your agent offers. Cook works without them.

## License

MIT. Made by Leon Lin ([@LexnLin](https://x.com/LexnLin)).

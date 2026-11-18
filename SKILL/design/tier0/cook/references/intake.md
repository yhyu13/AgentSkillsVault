# Intake

One message, every open question, a default for each. The user should be able to answer in two minutes, or reply "defaults" and go to sleep. After this message you do not ask again until the run is done.

## Before you ask

- Read everything the user gave you: the prompt, attached images and videos, folders they named, a filled `templates/brief.md`. Do not ask what is already answered.
- Look at the references now. If something about them is unclear (which ones matter most, close recreation or same quality in an own style), put it in this message.
- A dictated, messy prompt is fine (mixed languages, "yk", "go cook"). Keep the user's words and their bar. Clean it up, do not rewrite it, and do not add requirements they did not ask for.
- Do not push the user to describe the look in words. A short prompt with strong references beats a long description. The images carry the look, the text sets the bar, the rules and the time.
- If the user already said they are leaving ("I'm going to bed, decide everything"), do not send questions at all. Use the defaults, note them in BRIEF.md and start.

## Questions and defaults

Number the questions and ask only the open ones.

| # | Question | Default when unanswered |
|---|---|---|
| 1 | What are we building, in one sentence, and in which stack? | Required. If the user has no idea yet, see "No idea yet". |
| 2 | Where are the references? Recreate them closely, or match their quality in an own style? | The attached files. Recreate closely. |
| 3 | What is the bar? | 99.9% similarity per dimension for stills. For video, the references count as about 8.5/10 and the target is at least 9/10. |
| 4 | How much time: a floor or a hard cap? | Named demo or visual build: a floor of 8h. If the ask is one screen, one asset or a fix, it is not a Cook run: say so and stop, unless the user confirms a hard cap of 1.5h. |
| 5 | Hard rules: assets, sound, extra bans, things that must appear? | Zero external assets. Code-made sound only if it truly holds up, otherwise licensed free audio with credits. The default slop ban list. |
| 6 | What is the deliverable? | Approved stills, then a video of about 1 minute, 1080p 30fps, no text on screen, licensed music. |
| 7 | What hardware renders it? | A weak integrated GPU: realtime kept cheap, quality from offline rendering. |
| 8 | What usage limits apply? | A 5h window: about 20% per hour, stop near 60% of the window. Spend toward 99% only if the user says so. Never 100%. |
| 9 | May I download audio, push to a public repo or publish anything? | Download free licensed audio only and credit it. Prepare the repo locally, do not push or publish. |
| 10 | Anything else before you leave? | Nothing. |

End the message with: "If you have anything else, tell me now. After this I work without asking until it is done."

## No idea yet

When the user wants to be surprised ("surprise me", "something creative"):
- Do not run with your first random idea. Research ideas first, including niche places such as Reddit, and look for ideas the user would not think of.
- Offer 3 to 5 ideas, one or two lines each, with what would make each one impressive.
- Iterate on the idea with the user until it is good. This is still intake. The run starts once the idea is fixed.

## No references yet

- 3D worlds and environments: suggest generating 9 to 12 target images with an image model (for example GPT Image) first. If the harness has an image tool, offer candidates for the user to pick.
- UI: real product screens, for example saved from Mobbin.
- Motion and launch videos: a folder of reference videos.

If the user wants to start without references, write "no references" in BRIEF.md. The bar then rests on the rubric, the critics and the user's estimates, and the first stills the user approves become the reference for later rounds.

## Writing BRIEF.md

Write it right after the answers. Keep it short and in the user's words where possible. Every line steers the run, so leave out anything that does not apply. In one test, a stray line saying "There are no photographs" kept agents from using photos at all.

```markdown
# Brief: [project]

Target: [one sentence]. Stack: [stack].
References: cook/refs/R01 to R[NN], [recreate closely / same quality, own style].
Bar: composition [99.9], light [99.9], color [99.9], materials [99.9], detail near and far [99.9], motion [9/10].
Calibration offset: [none yet].
Rules: [assets]. [sound]. Extra bans: [list]. Must include: [list].
Time: [floor 8h / cap 1.5h]. Started: [timestamp].
Usage: [5h window, about 20% per hour, stop near 60% unless the user asked for more, never 100%].
Hardware: [GPU]. Realtime cheap, final quality offline.
Deliverable: [approved stills, then a 1 minute video at 1080p 30fps / realtime demo / UI].
Permissions: download [yes/no], push [yes/no], publish [yes/no].
User's words: "[the key lines of the prompt, verbatim]"
```

Copy the references into `cook/refs/` with stable names (R01, R02 for images, V01, V02 for videos) and keep the original filenames in BRIEF.md. `cook/` is local working state. It is not published unless the user wants it to be.

# Ship

## Before the final render

- The user approved the stills in chat. Without that, do not start.
- Test the pipeline at final settings on 3 to 5 seconds: frames correct, timing right, audio in sync, the file plays.
- Measure seconds per frame and estimate the full render. Put the estimate in the progress note. Final renders on a laptop take hours: the Athenaion 4K render took about 13h of GPU time on an integrated GPU.
- Write frames to disk and skip existing frames on restart, so a crash or a usage stop does not cost the whole render.
- Encode at the end and mux the audio, for example:
  `ffmpeg -framerate 30 -i frames/%05d.png -i music.wav -c:v libx264 -pix_fmt yuv420p -crf 16 -c:a aac -b:a 320k -shortest -movflags +faststart final.mp4`

## Video for X

- The first frame is the thumbnail and must be impressive on its own. Treat the first 1.5 seconds as the cover image.
- Best scene first. Then reveal more step by step, for example from behind a rock, then the camera rises and the view opens.
- A new place every 6 to 7 seconds. Sometimes fast, sometimes slow. Transitions between scenes have to be really good.
- Slow, cinematic camera moves. Drone-like is fine as a feel, with no drone UI and no drone noise.
- No text on screen.
- Music: licensed and free, credited. Nature sound where it fits.
- Length: 30 to 60 seconds, about 1 minute for world showcases.
- 1080p 30fps is enough for X. Render 4K or ultra-wide only when the brief asks.

## Check the final file

Measure, do not assume:

`ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate:format=duration -of compact final.mp4`

Check resolution, fps, duration and that an audio stream exists. Export the first frame (`ffmpeg -i final.mp4 -frames:v 1 cook/first_frame.png`) and look at it. Make a contact sheet of the final video and send it with the file path.

## Public repo

Only if BRIEF.md allows pushing. Otherwise prepare everything locally and say it is ready.
- README: what it is, a hero image or GIF, a reference vs render comparison, how to run, how to render.
- `docs/PROMPT.md`: the user's real prompt, merged from all their messages in the session and cleaned up, not rewritten. Name the model, its settings and the number of references.
- Credits: music, sound, any external asset, libraries.
- Honest numbers, measured or derived from logs, with estimates marked as estimates: total hours, subagents and the most in parallel, lines of code, output tokens, a cost estimate and the plan it ran on, hardware, render time.
- References: publish only references the user made or owns, such as their own generated images. Never publish or name third-party clips or screens.
- `cook/` is working state. Publish it only if the user wants to, and never with third-party references.

Example of honest numbers (Athenaion, built by Claude Opus 5.5):
- 9 AI-generated reference images
- about 45h
- 55 subagents, up to 12 in parallel
- about 45k lines of JavaScript
- about 11M output tokens
- about $1.8k to $2.3k API-equivalent, run on a Max plan
- rendered in 4K on an integrated AMD Radeon 780M

## Privacy scan before anything goes public

- Search the repo, `docs/PROMPT.md` and the README for API keys, tokens, `.env` files, private keys, personal paths, emails and private names:
  `git grep -nIE "(sk-[A-Za-z0-9]|api[_-]?key|secret|token|BEGIN [A-Z ]*PRIVATE KEY)"`
- Prompts are the riskiest file. Real prompts sometimes contain a key pasted in plain text. Remove it and tell the user to rotate it.
- Check that `.gitignore` covers `.env`, render caches and large frame folders.

## The post

Posting is the user's action. If asked, draft the post: what it is, that it is 100% code, the model and the time it took. Link the repo.

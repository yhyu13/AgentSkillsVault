# Tool: subzeroid/instagrapi

- **Domain(s):** social-publishing (also: browser-automation)
- **Barrier route:** ③ · **Source tier:** L4 · **Ready MCP:** no (Python lib; wrap it yourself)
- **Cost:** free (OSS), your only cost is proxies + throwaway accounts at scale
- **Repo / Provider:** github.com/subzeroid/instagrapi, `subzeroid/instagrapi (6.3k★, gh-api 2026-06)` (MIT-style NOASSERTION; actively maintained, last push 2026-06)
- **Top pick for its domain:** no

## What it does / when to pick it
Most-active Instagram private-API client: **post photos/albums/Reels, comment, like, follow, send
DMs**, plus read profiles/media/stories. Pick it when the task is *writing* to Instagram (posting or
DMing) and there is no official-API path, it's the de-facto IG write tool. For **read-only** IG
(download posts/profiles/stories) prefer the lower-risk **instaloader** ③. For 小红书/抖音 use
xiaohongshu-mcp / MediaCrawler ④.

## Install
`pip install instagrapi` (Python ≥ 3.10). No ready MCP, call it from a small script or wrap as a
tool. Volatile line: `reference/volatile/pricing-install.md` → social-publishing / browser-automation.

## Auth / keys
Logs in with **real IG username + password** (and handles 2FA / challenge). Persist the session with
`cl.dump_settings()` / `cl.load_settings()` so you don't re-login every run (re-login spikes ban
risk). No API key. Have the user supply credentials through environment variables or approved
private configuration, with no transcript output. Credentials and sessions belong in a verified
PRIVATE versioned companion; private credential backups are allowed. See
`reference/install-guide.md` (Secret-handling hygiene).

## Usage, call examples
Make the full Market checkout importable. Initialize an existing `runtime/instagrapi` directory
under the configured PRIVATE companion data root before running this example. The resolver
checks that the directory is inside the companion's Git worktree. Missing or unmanaged storage
stops setup, with no source-tree fallback.

```python
import os
from instagrapi import Client
from tools.private_inventory import resolve_directory, resolve_destination

runtime = resolve_directory("runtime/instagrapi")
session = resolve_destination(path=runtime.path / "session.json")
cl = Client()
if session.path.exists():
    cl.load_settings(str(resolve_destination(path=session.path).path))
cl.login(os.environ["INSTAGRAM_USERNAME"], os.environ["INSTAGRAM_PASSWORD"])
cl.dump_settings(str(resolve_destination(path=session.path).path))
profile = cl.user_info_by_username(os.environ["INSTAGRAM_TARGET_USERNAME"])
```

This verifies only the selected read operation and session destination. Before launch, redirect
every other enabled SDK writer (downloads, caches and logs) through supported private paths;
session redirection alone does not prove the whole runtime is private. Keep setup-only if the
installed version cannot redirect a writer. Publishing is a separate, explicitly authorized
action, for example `cl.photo_upload(approved_private_image_path, approved_caption)`; never post
as an installation check.

## General experience & gotchas (踩坑)
- **Violates IG ToS, write/post is far more ban-prone than read.** Use a **throwaway account**, residential
  proxy, and human-like pacing; never run it on a real/valuable account (shard ④-route warning).
- **Reuse the saved session**, repeated fresh logins from a datacenter IP is the fastest way to a
  challenge/checkpoint/ban. Pin one device+proxy per account.
- IG silently shadow-limits: a call can "succeed" yet the post gets zero reach or is removed later,
  don't treat HTTP 200 as confirmed delivery.
- Private-API endpoints break when Instagram changes things; keep the lib updated (it's actively
  patched, which is exactly why it's the pick over staler IG libs).

## Failure signals & fallback
`LoginRequired` / `ChallengeRequired` / `PleaseWaitFewMinutes` = throttled or flagged → stop, rotate
account/proxy, back off. If writes are blocked, fall back to **playwright MCP** ④ (real logged-in
browser session) for the post, or drop to read-only **instaloader** ③ if you only need data.

## Last verified: 2026-06

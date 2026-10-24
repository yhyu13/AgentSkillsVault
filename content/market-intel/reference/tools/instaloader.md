# Tool: instaloader/instaloader

**Runtime storage status: setup only.** No shipped adapter admits this tool's
complete file output. Do not launch collection, login or persistence until every
child-file write meets the [external-tool storage requirements](../../../../DATA.md#external-tool-storage).
`resolve_directory` alone does not authorize writes; examples below are setup guidance.

- **Domain(s):** social-publishing (also: browser-automation)
- **Barrier route:** ③ · **Source tier:** L4 · **Ready MCP:** no (Python lib + CLI; wrap it yourself)
- **Cost:** free (OSS), proxies/accounts only at scale
- **Repo / Provider:** github.com/instaloader/instaloader, `instaloader/instaloader (12.5k★, gh-api 2026-06)` (MIT; actively maintained, last push 2026-04)
- **Top pick for its domain:** no (but the safest IG choice when you only need to READ)

## What it does / when to pick it
**Read-only** Instagram downloader: posts, profiles, stories, highlights, followers/followees,
captions, comments, geotags, hashtag feeds. Pick it whenever the IG task is *data collection*, not
posting, it's lower ban-risk than write tools because it only reads. If you need to **post / comment /
DM**, this can't do it → use **instagrapi** ③ instead.

## Install
`pip install instaloader` (Python ≥ 3.10). Ships a CLI (`instaloader <name>`) and a Python
API. No ready MCP. Volatile line: `reference/volatile/pricing-install.md` → social-publishing /
browser-automation.

## Private runtime and outputs
Before any collection or login below, use `tools/private_inventory.py` from the full consumer checkout. Select an existing absolute runtime directory with `runtime = resolve_directory("runtime/instaloader")`. This resolves the final directory's containing Git worktree, including a nested repository at that directory, and refuses directories outside it or inside this checkout. Stop if the check fails. Revalidate `resolve_directory(path=runtime.path)` immediately before launching the caller with that directory as its working directory.

Follow the [external-tool output checklist](../../../../DATA.md#external-tool-storage)
for installed-version output settings, implicit storage, stdout and credentials.
Keep this tool in setup status if any output cannot be located and admitted.

## Auth / keys
Anonymous works for public profiles (very rate-limited). For private/followed content or higher
limits, log in: `instaloader --login=USER` (it stores a session file you reuse). No API key. The IG
password is a secret, user supplies it; never echo it (see `reference/install-guide.md`).

## Usage, call examples
```python
import instaloader
L = instaloader.Instaloader()
L.download_profile("example_profile", profile_pic_only=False)   # synthetic profile
```
Iterate `Profile.from_username(L.context, "example_profile").get_posts()` for metadata without downloading media.

## General experience & gotchas (踩坑)
- Read-only ≠ ban-proof, **anonymous scraping is aggressively rate-limited** and IG throws 401/429
  fast. Authenticated + a saved session + slow pacing is far more reliable; still use a throwaway
  account, not your main.
- IG periodically breaks the unofficial endpoints; keep the lib current (it's actively maintained).
- Stories/highlights and private profiles **require login**; public posts may work anonymously but
  flakily.
- Don't hammer it in a loop, add delays; bursts trip "Please wait a few minutes" and can checkpoint
  the account.

## Failure signals & fallback
`401 Unauthorized` / `429` / `Please wait a few minutes` / `QueryReturnedBadRequestException` =
throttled or endpoint changed → log in, slow down, rotate proxy. If still blocked, fall back to
**playwright MCP** ④ (logged-in browser) or **brightdata** ② (provider absorbs the IG anti-bot wall)
for IG data at scale.

## Last verified: 2026-06

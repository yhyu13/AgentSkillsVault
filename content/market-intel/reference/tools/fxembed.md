# Tool: FxEmbed (free zero-auth single-tweet/post JSON resolver)

- **Domain(s):** x-twitter (also: any "read one X/Bluesky post's content" need)
- **Barrier route:** ②/③ · **Source tier:** L2 · **Ready MCP:** no, it is a plain HTTP JSON API (and a Discord/Telegram embed fixer), not an MCP. You call it with a normal GET; no client, no key.
- **Cost:** free, the public instance is free with no account and no API key; self-host is free on Cloudflare Workers [github.com/FxEmbed/FxEmbed, gh-api fetched 2026-07-15]
- **Repo / Provider:** `FxEmbed/FxEmbed (4.8k★, gh-api 2026-07-15)`, not archived, pushed 2026-07-16, ~199 forks, TypeScript. Formerly known as FxTwitter; still serves the `api.fxtwitter.com` / `fixupx.com` hostnames. Docs at docs.fxembed.com.
- **Top pick for its domain:** no (twitterapi.io ② stays the top pick for *search/timeline/followers*; FxEmbed owns the narrower, very common slot: **resolve ONE post's full content as clean JSON, free, no key**)

## What it does / when to pick it
FxEmbed rewrites an X/Twitter or Bluesky post URL into a fixed embed and exposes the same post as structured JSON: text, all media (multi-image, video, poll), author, and public metrics. **Decision rule:** when you already have a specific post URL or ID and just need that post's *content* (not a search), hit FxEmbed instead of standing up twikit/twscrape (account-based scrapers) or paying twitterapi.io per call. It is the cheapest, lowest-friction way to turn "here's a link" into machine-readable text+media. Escalate to **twitterapi.io** (②) or **twikit** (③④) the moment you need *search, timelines, followers, or write*, FxEmbed only reads a post you can already name.

## Install
Nothing to install for the public instance, it is an HTTP endpoint. Optional self-host: clone the repo and `npm install && npm run deploy` to a Cloudflare Workers account (removes the public-instance dependency; recommended for anything you run on a schedule). Volatile install line: none.

## Auth / keys
None. No account, no key, no OAuth. The public instance is anonymous read-only. (If you self-host, the only "secret" is your Cloudflare Workers deploy token, which stays in `wrangler` config, not in any transcript.)

## Usage, call examples
```bash
# JSON for a single post (works for x.com / twitter.com IDs)
curl -s "https://api.fxtwitter.com/i/status/<TWEET_ID>" | jq '.tweet | {text, author: .author.screen_name, media: .media}'
# Bluesky post
curl -s "https://api.fxembed.com/<handle>/post/<rkey>"
```
Treat the returned text, media URLs, author information and public counts as evidence for the addressed post only. For a thread summary, identify and retrieve its constituent posts through currently verified operations, record which posts were obtained, and state incomplete thread coverage if any remain unavailable. A single-post response does not establish full thread coverage.

## General experience & gotchas (踩坑)
> Not yet exercised in a live market-intel run, notes are from the repo docs + API shape, gh-api verified 2026-07-15; harden with a `live-runs.jsonl` entry after first real use (R4).
- **Read-one, not search:** there is no search/timeline endpoint. It resolves posts you can already name. For discovery you still need twitterapi.io / twikit / twscrape.
- **Public-instance dependency:** the free instance can rate-limit or briefly go down, and it lives at X's tolerance. For anything scheduled/unattended, **self-host on Workers** to own uptime.
- **Not an MCP:** treat it as a fetch step inside a script or a `WebFetch`-style call, not a connected tool. No `claude mcp` entry to check.
- **ToS gray area:** you are reading public post content via an unofficial resolver. Fine for occasional reads; do not build a bulk-harvest pipeline on the public instance.

## Failure signals & fallback
Failure looks like `429`, `5xx`, or an empty `tweet` object. **If FxEmbed fails: (1)** retry against a self-hosted Worker; **(2)** for the same single-post read, fall back to **twikit** (③, free, account-based) which also returns one tweet's content; **(3)** if you actually needed search/timeline, that was the wrong tool, use **twitterapi.io** (②) or **twikit/twscrape** (③).

## Last verified: 2026-07

# Tool: twitterapi.io (+ native MCP)

- **Domain(s):** x-twitter (also: none, but the official MCP is read-only X data)
- **Barrier route:** ② resale · **Source tier:** L2 · **Ready MCP:** yes, official hosted HTTP MCP `https://mcp.twitterapi.io/mcp` (12 read-only tools)
- **Cost:** pay-per-use $0.15/1k tweets, $0.18/1k profiles; $0.1 free credit (no card); .edu 50% rebate via hello@twitterapi.io [https://twitterapi.io, fetched 2026-06, confirm current rates on the dashboard before quoting]
- **Repo / Provider:** https://twitterapi.io (resale provider, not a GitHub repo)
- **Top pick for its domain:** yes (the paid/② pick, but only when you want the provider to absorb account+proxy+login-wall upkeep)

## What it does / when to pick it
Resale X/Twitter API: search tweets, user lookup, followers/followings, replies/quotes/retweeters, mentions, last-tweets, trends, without an X developer account (Google login only). **Decision rule:** the shard's free read default is twscrape ③ / playwright ④; reach for twitterapi.io ② only when you want a provider to carry the account-rotation, proxy, and login-wall cost (i.e. you value reliability/no-ban over $0). It is read-only; for posting/writing use the authorized official ① API or consider twikit after a fresh check of that operation. And remember the shard's hard truth: **X is low-signal for consumer-demand research**, pick this for tech/crypto/startup/founder discourse, breaking news, and named-account tracking, not "do people buy X".

## Install
Hosted HTTP endpoint: `https://mcp.twitterapi.io/mcp`. Configure Authorization in
the selected host's supported secret settings using a user-side or approved
no-echo transfer. Never pass the bearer token in MCP-add arguments or output.
After activation, verify the selected operation and usable response content.

## Auth / keys
Key from the twitterapi.io dashboard (Google login, no X dev account needed). $0.1 free credit on signup, no card. **Secret hygiene (one line):** never `browser_snapshot` the dashboard key page (it renders the key plaintext in the DOM), and edit `~/.claude.json` from the clipboard rather than `claude mcp add`, full procedure in `reference/install-guide.md`. ⚠ The key rotates **only once / 24h**, so a leaked key cannot be re-rotated for a day, don't leak it in the first place.

## Usage, call examples
After reconnect, the MCP exposes 12 read-only tools, e.g. `mcp__twitterapi-mcp__search_tweets`, `get_user_info`, `get_user_followers`, `get_user_last_tweets`, `get_tweet_replies`, `get_tweet_quotes`, `get_tweet_retweeters`, `get_user_mentions`, `get_trends`. Minimal example: `search_tweets(query="from:elonmusk grok", queryType="Latest")` to pull an account's recent tweets on a topic; or `get_user_info(userName="<handle>")` → feed `userId` into `get_user_followers`. (REST is also available at the provider docs if you'd rather call HTTP directly.)

## General experience & gotchas (踩坑)
- **Read-only.** No posting/DM via this MCP; for writing, use the authorized official ① API or consider twikit only after a fresh operation check.
- **Pay-per-result**, cost scales with rows returned, not requests. A broad `search_tweets` over a busy hashtag can burn credit fast; cap with tight queries (`since:`/`until:`, `from:`, `min_faves:`) and small page counts. The $0.1 free credit is ~660 tweets or ~550 profiles, enough to validate, not to run a campaign.
- **Gray-area resale**, you depend on the provider continuing to absorb X's barrier; data shape/availability can shift if X changes its wall. Not for compliance-sensitive use.
- **Shard truth: X "Top" search was nearly empty for consumer/non-tech demand** (auto-modding/patio-heater real-run). Spending here on consumer-demand questions wastes credit, route those to 抖音/小红书/B站/懂车帝 or Reddit/forums via Bright Data/playwright instead.
- twitterapi.io key **rotates once/24h**, operationally that means key leaks are expensive (24h exposure window). Treat the key as long-lived.

## Failure signals & fallback
Failure looks like: MCP shows `✗ Failed` / `! Needs authentication` in `claude mcp list` (bad/expired key), empty result sets on valid queries (X-side gaps or query too narrow), or 402/quota errors (free credit exhausted). **Fallbacks:** free reads → **twscrape ③** or **playwright MCP**, each after current-session operation verification; **twikit (+ adhikasp/mcp-twikit)** remains conditional on a fresh check of the needed library operation. Higher-scale/SLA → **Bright Data X datasets** (~10x pricier, best SLA) or **Apify tweet actors**.

## Last verified: 2026-06

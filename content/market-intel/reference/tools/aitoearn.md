# Tool: AiToEarn (open-source multi-platform publish + monetize, CN + Western)

- **Domain(s):** social-publishing
- **Barrier route:** ①/④ · **Source tier:** L2 · **Ready MCP:** no, it is an **Electron desktop app**, not an API or MCP. Claude's fit is orchestration/handoff (prep the content + captions, hand the batch to the app), not a connected tool call.
- **Cost:** free, open-source (self-run desktop app; no SaaS fee) [github.com/yikart/AiToEarn, gh-api fetched 2026-07-15]
- **Repo / Provider:** `yikart/AiToEarn (23.8k★, gh-api 2026-07-15)`, not archived, pushed 2026-07-09, ~3.6k forks, TypeScript/Electron. Site aitoearn.ai. Topics confirm auto-publish to douyin/kuaishou/shipinhao/xiaohongshu plus Western platforms.
- **Top pick for its domain:** no (Buffer ① stays the top pick for API/MCP-native multi-platform scheduling. AiToEarn owns a different slot: **free OSS one-click publish that actually covers the Chinese platforms** Buffer/Publora do not)

## What it does / when to pick it
AiToEarn is a desktop app that publishes one piece of content to many platforms at once, including the Chinese majors (Douyin, Kuaishou, Xiaohongshu, Shipinhao/WeChat Channels, Bilibili) alongside Western ones (YouTube, TikTok, etc.), with AI-assisted captions and basic analytics. **Decision rule:** pick it when the requirement is *cross-post to Chinese + Western platforms for free* and you can tolerate a GUI in the loop. If you need programmatic, scheduled, MCP-native posting (Western platforms only), **Buffer** (①, free tier + MCP) or **Publora** (① MCP-native) is the better fit, those Claude can drive directly; AiToEarn it cannot.

## Install
Download the desktop app from the repo releases (Electron build for Windows/macOS/Linux) or build from source (`pnpm install && pnpm dev`). It runs as a local app; there is no server component to host. Volatile install line: none.

## Auth / keys
Each target platform is authenticated **inside the app** via its own login (the app holds the sessions). No central API key. Because logins live in a GUI app, keep it off any shared/automated machine and do not attempt to script its logged-in sessions, the same social-platform risk-control posture applies (do not automate a logged-in personal account on a strong-risk-control platform).

## Usage, call examples
This is a GUI app, so there is no CLI/MCP call. The Claude-side pattern is a **handoff**: Claude drafts the post text + platform-specific captions + assembles the media, writes them to a folder, and the user pastes/loads them into AiToEarn and clicks publish. Treat AiToEarn as the human-operated last mile, not an automated step.

## General experience & gotchas (踩坑)
> Not yet exercised in a live market-intel run, notes are from the repo + topic metadata, gh-api verified 2026-07-15; harden with a `live-runs.jsonl` entry after first real use (R4).
- **Desktop app, not MCP:** Claude cannot call it. Its value is that it *exists as free OSS* for CN cross-posting; the integration is a content handoff, not automation.
- **Chinese platforms = strong risk control:** Xiaohongshu/Douyin aggressively flag automated logged-in activity. Use the app manually; do not wire it into an unattended pipeline against a real account.
- **Electron weight + trust:** it is a third-party desktop app that holds your platform logins. Vet the release before granting it your accounts; prefer a burner/secondary account for anything experimental.
- **AI captions are drafts:** the built-in AI captioning is a starting point, not final copy, review before publishing.

## Failure signals & fallback
Failure looks like a platform login expiring inside the app, a publish silently rejected by a platform's risk control, or a media-format rejection. **Fallbacks: (1)** re-login the specific platform in the app and retry manually; **(2)** for Western-only, MCP-native scheduling drop to **Buffer** (①) which Claude can drive; **(3)** for a single platform's official API, use that platform's own connector rather than the aggregator.

## Last verified: 2026-07

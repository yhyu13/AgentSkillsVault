# Tool: langchain-ai/social-media-agent

- **Domain(s):** social-publishing (also: none)
- **Barrier route:** ③ self-host · **Source tier:** L2 · **Ready MCP:** no, it is a LangGraph agent app (clone + run + supply keys), not an MCP server or skill
- **Cost:** free (OSS, MIT), self-host; you pay the underlying LLM + any post-API/ingest-API keys it calls
- **Repo / Provider:** github.com/langchain-ai/social-media-agent, `langchain-ai/social-media-agent (2.6k★, gh-api 2026-06)`; active (pushed 2026-06-09, not archived, MIT)
- **Top pick for its domain:** no (a content-pipeline layer, not a posting endpoint)

## What it does / when to pick it
A LangGraph **agent for sourcing, curating, and scheduling** social posts with **human-in-the-loop** review, it ingests content (URLs/feeds), drafts posts, pauses for human approval, then schedules. **Decision rule:** pick it when the job is the *whole content pipeline* (find → write → approve → schedule), not just "post this string." It sits **a tier above the post APIs**: it does not replace them, it *drives* them, pair it with **Buffer** / **Postiz** (or Arcade/Twitter integrations) as the actual publishing backend. If you only need to push a known post to platforms, skip this and call **Buffer** (① free) / **Blotato** / **Postiz** directly. If you want a packaged Postiz-only front-end instead of a full pipeline, see `postiz-agent`.

## Install
Prepare the LangGraph app (Node/TS, plus a LangGraph runtime) using the installed version's instructions. Execution remains at the model-adapter and private-persistence setup boundary below. It is **not** an MCP server; its own service exposes UI/LangGraph endpoints. Windows needs a compatible Node + LangGraph environment. L0 mechanics: `reference/install-guide.md`.

## Model integration and private setup
All model or external-agent work must use installed `llmcall`, inheriting its current routing, model, timeout and fallback policy. No supported adapter for this LangGraph app is supplied or verified here. Verify an actual installed-version adapter and its tool-I/O contract before running the graph; otherwise stop at setup. Do not add direct provider clients or a separate model ladder.

Keep ingest and posting credentials in approved PRIVATE configuration with no transcript echo. Resolve feed history, drafts, checkpoints, logs and scheduling state to PRIVATE versioned DATA. Confirm that the installed app supports those destinations before starting it; no checkout or loose home-directory fallback is permitted.

## Usage, call examples
Once the adapter, private storage and selected-operation checks pass, submit a source URL to prepare a private draft. Review and edit that concrete draft before requesting scheduling or publication authorization. A configured backend or an app approval node does not itself authorize sending. The posting integration must expose a verified operation for the authorized destination.

## General experience & gotchas (踩坑)
- **It does not post by itself**, it needs a posting backend wired in; treating it as a one-stop publisher is the main misread. Budget for Buffer/Postiz **plus** this.
- **Human-in-the-loop is a feature, not optional**, it intentionally pauses for approval; an unattended/auto-run setup defeats its purpose and can be brittle.
- **Heaviest setup in this domain**, LangGraph runtime + verified llmcall adapter + ingest integration + post backend; far more moving parts than a single post-MCP. Only worth it when curation/quality gating is the actual goal.
- LLM + ingest API costs are **per-run and yours**, the OSS is free, the pipeline calls are not; watch token/ingest spend on large feeds.
- X link-posts still cost **$0.20 each** at the platform level (shard cost trap) when X is the chosen backend, the agent doesn't remove platform write costs.
- Maintained by LangChain and active (pushed 2026-06-09, 2.6k★), but it tracks the fast-moving LangGraph/integration surface, pin versions and re-check the README's required integrations before a run.

## Failure signals & fallback
Failure looks like: the graph stalling at the human-approval node (no reviewer), an ingest/LLM key error during drafting, or the scheduling step failing because the posting backend (Buffer/Postiz/Arcade) isn't connected. **Fallbacks:** for plain posting, drop the pipeline and use **Buffer** (① free tier) / **Postiz** (OSS self-host) / **Blotato** (Claude Code native MCP) directly; for a single free platform, atproto (Bluesky) / Mastodon.py with no agent at all. Use `postiz-agent` if you want a lighter Postiz-only front-end instead of a full curation pipeline.

## Last verified: 2026-06

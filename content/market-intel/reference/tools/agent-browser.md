# Tool: vercel-labs/agent-browser

- **Domain(s):** browser-automation (also: none)
- **Barrier route:** ④ · **Source tier:** L2 · **Ready MCP:** no, but agent-native, ships a native CLI + a `.claude-plugin` (Claude Code plugin), so the agent drives it directly without an MCP server
- **Cost:** free (self-host OSS) [github.com/vercel-labs/agent-browser, fetched 2026-06]
- **Repo / Provider:** github.com/vercel-labs/agent-browser, `vercel-labs/agent-browser (42.1k★, gh-api 2026-09-06)`; license Apache-2.0, active (pushed 2026-09-06)
- **Top pick for its domain:** no (**playwright MCP** after current-session verification is the default; agent-browser is the token-efficient fast peer you reach for when context budget matters)

## What it does / when to pick it
A native (Rust) browser-automation CLI built for LLM agents: it bundles its own Chrome and exposes a **token-efficient snapshot + `@ref`** model, instead of dumping a huge DOM, it returns a compact accessibility snapshot where each element has a short `@ref` handle you act on. **Decision rule:** pick agent-browser over playwright MCP when (a) you are burning too much context on `browser_snapshot` of heavy pages, or (b) you want a fast standalone CLI peer rather than an MCP round-trip. It is *not* MCP-native, so it does not show up in `claude mcp list`; you invoke its CLI (or install its plugin). For the standard "act like a human on one logged-in page" job, **playwright MCP** is still the default first tool, agent-browser is the optimization. For AI-goal-driven natural-language extraction use **browser-use**; for fingerprint-blocked targets escalate to **camoufox / camofox-browser**.

## Install
Self-host OSS, native binary (no Node/Python runtime needed for the CLI itself). Two install shapes:
```
# CLI (bundled Chrome — no separate browser install):
git clone https://github.com/vercel-labs/agent-browser
# build per repo README (Rust toolchain), then run the agent-browser binary

# Claude Code plugin (ships .claude-plugin in the repo):
/plugin marketplace add vercel-labs/agent-browser   # then enable the plugin
```
Windows note: it's a native binary that bundles Chrome, so it sidesteps the usual stdio-`npx` flakiness, but confirm a prebuilt Windows binary/release exists, else you need the Rust toolchain to build. MCP-transport rules in `reference/install-guide.md` don't apply (not an MCP). Free OSS, no volatile pricing row; the L1 line is `pricing-install.md` → browser-automation general frameworks.

## Auth / keys
No API key for the tool itself. Browser auth is by **logged-in session/cookies** in its bundled Chrome profile, same as any route-④ tool. Not a key-bearing tool, no secret-hygiene step beyond treating any imported session cookie as a credential (throwaway account for scrape-heavy work).

## Usage, call examples
You drive it via its CLI / plugin commands, not MCP tool names. The core loop is: navigate → `snapshot` (returns elements tagged with `@ref` handles) → act on a `@ref` (click/type) → re-snapshot.
```
# conceptual flow (exact subcommands per repo README):
agent-browser navigate https://example.com
agent-browser snapshot            # -> compact tree, each node has an @ref id
agent-browser click @ref-12       # act by handle, not by brittle CSS selector
agent-browser type  @ref-7 "hello"
```
The `@ref` indirection is the whole point: the model passes back a short handle it just saw in the snapshot, so prompts stay small and selectors don't go stale mid-session.

## General experience & gotchas (踩坑)
- **Not MCP-native (shard lesson):** do not expect it in `claude mcp list` and do not try to add it with `claude mcp add`. It's a CLI + plugin, the "fast peer to playwright MCP," not a drop-in MCP replacement.
- **Token-efficiency is the differentiator, not anti-detection:** it bundles a normal Chrome, so it does **not** beat Cloudflare/DataDome on its own. If you get fingerprint-walled, agent-browser won't save you, escalate to camoufox/camofox-browser/nodriver/patchright.
- **`@ref` handles are session-scoped:** a `@ref` is only valid against the snapshot it came from. After navigation or a DOM change, re-snapshot to get fresh handles, reusing a stale `@ref` is the most common failure.
- **Young & fast-moving:** Vercel-Labs project, rapid releases; pin a version and re-read the README for subcommand names before scripting against it.
- **Bundled Chrome = a real GUI Chromium:** on a headless server pass the headless flag; on Windows the bundled binary is large, first run downloads/extracts it.

## Failure signals & fallback
Failed when: the CLI can't launch its bundled Chrome (missing binary / build), a `@ref` action errors with "ref not found" (stale snapshot, re-snapshot), or the target serves a bot interstitial (fingerprint block, agent-browser can't bypass it). **Fallback ladder:** (1) default back to **playwright MCP** after current-session verification for the same act-like-human task; (2) for natural-language goal extraction, **browser-use**; (3) for fingerprint blocks, **camoufox**, **jo-inc/camofox-browser**, or **patchright**; (4) for vision-robust workflows resilient to layout changes, **Skyvern**.

## Last verified: 2026-09 (repository existence, stars and activity checked through gh api; usage/gotcha notes carried forward unchanged from the prior check)

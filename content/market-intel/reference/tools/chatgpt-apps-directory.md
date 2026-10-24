# Tool: chatgpt-apps-directory

- **Domain(s):** mcp-ecosystem
- **Barrier route:** 1 official · **Source tier:** free · **Ready MCP:** N/A (this IS an MCP directory, not a callable tool)
- **Top pick for its domain:** no (sweep companion to GitHub MCP Registry, captures the OpenAI side of the ecosystem)

## What it does / when to pick it
OpenAI official Apps SDK / MCP integrations directory at `chatgpt.com/apps`. Lists ~979 apps as of 2026-06, all wired through MCP. It's the OpenAI counterpart to the GitHub MCP Registry, same registry-of-MCPs shape, different gatekeeper.

**Decision rule:** use as a **Discovery surface during refresh-protocol sweeps for the mcp-ecosystem domain**. An Anthropic-only sweep (GitHub MCP Registry, Anthropic docs, Smithery) systematically misses MCP momentum on the OpenAI side, model selection, vertical apps, integrations that ship through ChatGPT first. Pull this directory in to close that blind spot. Not a runtime tool; you read it to find candidate MCPs, then evaluate them for the matrix.

## Install
Install: <TODO: confirm install method>, this is a web directory, not an installable package. Browse at https://chatgpt.com/apps. For programmatic enumeration during a sweep, the third-party tracker `rdmgator12/awesome-chatgpt-apps` mirrors the listing in markdown and is the practical scraping fallback (the official URL anti-bots WebFetch).

## Auth / keys
Free, no key for browsing the directory itself. Individual apps in the directory may require their own ChatGPT account / per-app OAuth when actually invoked inside ChatGPT, irrelevant for sweep-discovery use.

## Usage, call examples
This is a browse-and-enumerate surface, not an API. Three practical modes:

```
# 1. Manual browse (canonical)
open https://chatgpt.com/apps

# 2. Sweep-time enumeration via third-party mirror
gh repo view rdmgator12/awesome-chatgpt-apps

# 3. OpenAI help-center context on the Apps SDK / MCP integration shape
open https://help.openai.com/  (search "Apps SDK")
```

## General experience and gotchas (踩坑)
- **URL anti-bots WebFetch with 403**, confirmed 2026-06. Do not rely on direct fetch in an automated sweep; the page is JS-rendered behind protection. Use the `rdmgator12/awesome-chatgpt-apps` mirror or OpenAI's announcement/help-center pages as the machine-readable substitute.
- **It's a directory, not a tool**, nothing here is callable from Claude Code. You harvest *names of MCPs* to then evaluate. Don't confuse listing-count growth with capability you can actually invoke.
- **~979 apps as of 2026-06 is a snapshot, not a guarantee**, the count moves fast (this is OpenAI's flagship ecosystem push). Re-verify when running a refresh-protocol sweep; treat any cached number as stale within weeks.
- **OpenAI-side momentum ≠ cross-client momentum**, many apps shipped in this directory are ChatGPT-first and may not have a clean standalone MCP server you can wire into Claude Code. Filter for "has standalone MCP repo" before promoting a find into the matrix.
- **Sweep pairing matters:** always run this *alongside* GitHub MCP Registry (Anthropic side) and Smithery (community side), single-source MCP sweeps systematically under-count one ecosystem.

## Last verified: 2026-06

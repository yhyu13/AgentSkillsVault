# Tool: idea-reality-MCP

- **Domain(s):** trends-discovery (also: none)
- **Barrier route:** ① official-API aggregator · **Source tier:** L2 · **Ready MCP:** yes, `uvx idea-reality-mcp` (also hosted REST + Smithery)
- **Cost:** free, no API key required [https://pypi.org/project/idea-reality-mcp, gh README 2026-06]
- **Repo / Provider:** github.com/mnemox-ai/idea-reality-mcp, `mnemox-ai/idea-reality-mcp` (0.7k★, gh-api 2026-06; MIT, last push 2026-04, active; 277 tests passing)
- **Top pick for its domain:** no (but the go-to "is this idea saturated" tool)

## What it does / when to pick it
Describe a product idea in plain English; `idea_check` scans **6 sources in parallel** (GitHub repos+stars, Hacker News, npm, PyPI, Product Hunt, Stack Overflow) and returns a single **reality_signal 0 to 100** with trend direction (accelerating/stable/declining), market_momentum, top competitors, and AI pivot suggestions. **Pick it for the "has someone already built this / how crowded is the space" question**, it is the saturation/competition lens. Pair it with Product Hunt MCP (fresh launches) and GDELT (news) for the full trends-discovery products workflow; it is a synthesis layer over sources you could also hit individually.

## Install
Route ①, no key, `uvx`:
```
uvx idea-reality-mcp
claude mcp add -s user idea-reality -- uvx idea-reality-mcp
```
First-run guided setup (terms acceptance + platform config + health check): `idea-reality setup`; verify with `idea-reality doctor --full`. Prereqs: Python ≥ 3.10 + uv. Hosted alternatives if local uvx is flaky: Smithery (`npx -y @smithery/cli install idea-reality-mcp --client claude`) or the no-install REST endpoint (below). **Windows note:** uvx stdio can be path-flaky, Smithery/remote is the HTTP-style escape hatch. L1 line: `reference/volatile/pricing-install.md` → trends-discovery. MCP takes effect only after session restart / `/mcp` reconnect.

## Auth / keys
**None required**, free, no API key. (No secret-hygiene concern.) `idea-reality doctor --full` can optionally exercise GitHub API + an Anthropic key for deeper runs, but the core `idea_check` works keyless.

## Usage, call examples
MCP tool call (any agent):
```json
{ "tool": "idea_check",
  "arguments": { "idea_text": "a CLI that converts Figma designs to React components", "depth": "deep" } }
```
No-MCP REST (also good for verifying it's alive):
```
curl -X POST https://idea-reality-mcp.onrender.com/api/check \
  -H "Content-Type: application/json" -d '{"idea_text":"AI code review tool","depth":"quick"}'
```
Returns `reality_signal` (0 to 100), `trend`, `market_momentum`, competitor list, source counts, verdict.

## General experience & gotchas (踩坑)
- **It's a composite signal, not raw data**, the 0 to 100 is the value-add, but it inherits each underlying source's quirks (GitHub star inflation on launch day, PH token freshness, npm/PyPI name collisions). Read the per-source evidence, don't trust the headline number blind.
- **`depth: "deep"` is slower** (6 sources fan-out), use `"quick"` for a first pass, `"deep"` only when the decision hinges on it.
- **The hosted REST endpoint is on Render's free tier** (`*.onrender.com`), expect cold-start latency on first call and occasional sleep; the local `uvx` server avoids this and is the reliable path for repeated runs.
- **Phrasing sensitivity:** the score depends on how you word `idea_text`; an over-broad description inflates competitor counts. Run 2 to 3 phrasings if the verdict is borderline.
- Healthy adoption (0.7k★, MIT, recently pushed, 277 tests), safe to depend on, unlike most ③④ scrapers.

## Failure signals & fallback
Failure = MCP `✗ Failed`/timeout, or REST 5xx/long hang (Render cold-sleep). Retry via the local `uvx` server, or hit the REST endpoint directly to isolate. **Fall back to** querying the sources by hand: `github-mcp` (repo/star velocity), `mcp-hn` (HN discussion volume), `product-hunt-mcp` (launches), plus Trends MCP / GDELT for momentum, i.e. reconstruct the saturation picture from the individual domain tools.

## Last verified: 2026-06

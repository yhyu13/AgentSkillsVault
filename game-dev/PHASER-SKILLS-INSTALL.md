# Phaser Game Development Skills — Installation Guide

This bundle mirrors the two Agent Skills used in Chong-U's tutorial, [Vibe Coding 2D Games with Claude Code & Agent Skills](https://www.youtube.com/watch?v=QPZCMd5REP8).

Upstream companion repository: [chongdashu/phaserjs-oakwoods](https://github.com/chongdashu/phaserjs-oakwoods)

## Included skills

| Skill | Purpose |
|---|---|
| `phaser-gamedev` | Phaser 3 scenes, spritesheets, animation, Arcade/Matter physics, tilemaps, input, architecture, and performance guidance. |
| `playwright-testing` | Frontend, E2E, visual, accessibility, and deterministic canvas/Phaser testing workflows. Includes a Pillow-based image-diff helper. |

## Install the skills

Copy both complete directories—not only their `SKILL.md` files—because the skills reference bundled documents and scripts.

### Claude Code (project-level)

Copy into the target project:

```text
<project>/.claude/skills/phaser-gamedev/
<project>/.claude/skills/playwright-testing/
```

PowerShell example from the root of this vault:

```powershell
$Project = "C:\path\to\your\project"
Copy-Item -Recurse -Force ".\game-dev\phaser-gamedev" "$Project\.claude\skills\"
Copy-Item -Recurse -Force ".\game-dev\playwright-testing" "$Project\.claude\skills\"
```

Restart or reload Claude Code if the newly copied skills do not appear immediately.

### Codex CLI

These skills use the portable `SKILL.md` directory format. Copy them into the project's Codex skill directory:

```text
<project>/.codex/skills/phaser-gamedev/
<project>/.codex/skills/playwright-testing/
```

PowerShell:

```powershell
$Project = "C:\path\to\your\project"
Copy-Item -Recurse -Force ".\game-dev\phaser-gamedev" "$Project\.codex\skills\"
Copy-Item -Recurse -Force ".\game-dev\playwright-testing" "$Project\.codex\skills\"
```

Agent hosts vary in how they discover skills. For Cursor or another compatible host, import or copy the same folders through that host's Agent Skills/rules interface.

## Plugins and tools to install

A skill supplies instructions and workflows. Browser automation requires a real Playwright tool integration as well.

### Required for browser-driven Playwright testing

Install the official Playwright MCP server in the agent host you use:

```text
Command: npx
Arguments: -y @playwright/mcp@latest
```

Example MCP configuration shape:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

The exact MCP configuration file and UI differ across Claude Code, Codex, Cursor, and other clients. If the host already exposes Playwright browser tools, do not install a duplicate server.

Prerequisites:

- Node.js and `npx`
- A supported browser installed or downloaded by Playwright
- Permission for the agent host to launch and control a local browser

After registration, restart the agent host and verify that browser navigation, snapshots, keyboard input, console inspection, and screenshots are available.

### Optional: image-diff helper dependency

The included script is:

```text
playwright-testing/scripts/imgdiff.py
```

It requires Python 3 and Pillow:

```bash
python -m pip install pillow
python game-dev/playwright-testing/scripts/imgdiff.py baseline.png current.png --out diff.png
```

On Windows systems where `python` resolves to Python 2, use:

```powershell
py -3 -m pip install pillow
py -3 .\game-dev\playwright-testing\scripts\imgdiff.py baseline.png current.png --out diff.png
```

## Phaser project dependencies

The Phaser skill itself does not install Phaser or create a game project. In a TypeScript/Vite project, install Phaser separately:

```bash
npm install phaser
```

For the tutorial's companion game, follow the upstream repository's setup instructions and obtain the Oak Woods art pack separately. The artwork is not included in these skills and must not be redistributed without permission.

## Suggested verification

1. Ask the agent to use `phaser-gamedev` to inspect or create a small Phaser scene.
2. Confirm it reads the relevant reference before loading spritesheets.
3. Start the local game or web application.
4. Ask the agent to use `playwright-testing` for a deterministic smoke test.
5. Confirm Playwright can open the page, inspect console errors, press a movement key, and take a screenshot.
6. If using image diffs, run `imgdiff.py` against two same-sized PNG images.

## Security notes

- Review all third-party skills and MCP servers before installing them.
- Skills are instruction packages; MCP servers can execute actions and therefore require greater trust.
- Pin package versions instead of using `@latest` when reproducible installations are required.
- Do not place API keys, tokens, credentials, or proprietary game assets inside a skill directory.

## Licensing and attribution

The mirrored skills originate from `chongdashu/phaserjs-oakwoods`, which is published under the MIT License. Preserve upstream attribution when redistributing or modifying them. The Oak Woods art pack is separate and is not included here.

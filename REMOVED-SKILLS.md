# Retired skills - 2026-10-25 defect audit

68 skills were removed from the vault and from every harness store
(`~/.claude/skills`, `~/.kilo/skills`, `~/.codex/skills`, `~/.agents/skills`).

Reason: each skill was flagged by at least one of the four audit classes -

| class | meaning |
|---|---|
| U | never usable (hard dependency on an MCP server that is not connected) |
| E | error references (SKILL.md points at payload files that do not exist) |
| L | low quality (thin body, weak description, no trigger cue) |
| S | not standalone (depends on another skill, a sibling path, or another repo) |

Upstream copies under `vendor/` are kept on purpose: they are the source of
truth for re-adding a skill once it is fixed. A retired skill is kept out of
the install list by `scripts/install-manifest.txt` (regenerate with
`scripts/build-manifest.ps1`), so the sync script will not bring it back.

| skill | class | promoted copy removed | upstream kept in vendor |
|---|---|---|---|
| `academy-guide` | S (not standalone) | _(promoted copy did not exist)_ | `vendor/anthropics-skills/skills/academy-guide/` |
| `ai-3d-toolchain` | E (error references) S (not standalone) | `game-dev/ai-3d-toolchain/` | _(no vendor copy - removed outright)_ |
| `automated-triage` | U (never usable) S (not standalone) | `devops/monte-carlo/automated-triage/` | `vendor/mc-agent-toolkit/skills/automated-triage/` |
| `browser-video-recording` | S (not standalone) | `video/mengto/browser-video-recording/` | `vendor/mengto-skills/agent-skills/codex/browser-video-recording/` |
| `competitor-profiling` | E (error references) | `management/marketing/competitor-profiling/` | `vendor/marketingskills/skills/competitor-profiling/` |
| `customer-research` | E (error references) | `management/marketing/customer-research/` | `vendor/marketingskills/skills/customer-research/` |
| `deferred-taxes` | S (not standalone) | `management/finance/accounting/deferred-taxes/` | `vendor/everything-claude-finance/skills/accounting/deferred-taxes/` |
| `elevenlabs` | S (not standalone) | `video/elevenlabs/` | `vendor/claude-code-video-toolkit/.claude/skills/elevenlabs/` |
| `frontend-slides` | E (error references) S (not standalone) | `design/frontend-slides/` | `vendor/frontend-slides/`, `vendor/frontend-slides/plugins/frontend-slides/skills/frontend-slides/` |
| `gaap-standards` | S (not standalone) | `management/finance/accounting/gaap-standards/` | `vendor/everything-claude-finance/skills/accounting/gaap-standards/` |
| `genoffice` | S (not standalone) | `content/genoffice/` | `vendor/genoffice/skills/genoffice/` |
| `god-leader-advisor` | S (not standalone) | `management/god-leader-advisor/` | _(no vendor copy - removed outright)_ |
| `grafana-assistant-mcp` | S (not standalone) | `devops/grafana/grafana-cloud/grafana-assistant-mcp/` | _(no vendor copy - removed outright)_ |
| `grafana-datasources-provisioning` | S (not standalone) | `devops/grafana/grafana-datasources/grafana-datasources-provisioning/` | _(no vendor copy - removed outright)_ |
| `grafana-loki` | E (error references) S (not standalone) | `devops/grafana/grafana-lgtm/grafana-loki/` | _(no vendor copy - removed outright)_ |
| `grafana-synthetic-monitoring-checks` | S (not standalone) | `devops/grafana/grafana-cloud/grafana-synthetic-monitoring-checks/` | _(no vendor copy - removed outright)_ |
| `grafana-testing` | S (not standalone) | `devops/grafana/grafana-cloud/grafana-testing/` | _(no vendor copy - removed outright)_ |
| `guide-from-probes` | E (error references) S (not standalone) | `game-dev/guide-from-probes/` | _(no vendor copy - removed outright)_ |
| `html-slides` | E (error references) S (not standalone) | `design/html-slides/` | _(no vendor copy - removed outright)_ |
| `html-to-pptx` | E (error references) | `design/html-to-pptx/` | _(no vendor copy - removed outright)_ |
| `hyperframes-cli` | S (not standalone) | `content/hyperframes-cli/` | _(no vendor copy - removed outright)_ |
| `hyperframes-registry` | S (not standalone) | `content/hyperframes-registry/` | _(no vendor copy - removed outright)_ |
| `intro-scene-until-perfect` | E (error references) S (not standalone) | `game-dev/intro-scene-until-perfect/` | _(no vendor copy - removed outright)_ |
| `kimi3-game-gen` | S (not standalone) | `game-dev/kimi3-game-gen/` | _(no vendor copy - removed outright)_ |
| `kinetic-reel` | E (error references) | `video/kinetic-reel/` | `vendor/opus-video-skills/skills/kinetic-reel/` |
| `lieflat-charts` | E (error references) | `content/lieflat-charts/` | _(no vendor copy - removed outright)_ |
| `market-intel` | E (error references) S (not standalone) | `content/market-intel/` | `vendor/market-intel/skills/market-intel/` |
| `marketing-council` | E (error references) | `management/marketing/marketing-council/` | `vendor/marketingskills/skills/marketing-council/` |
| `mcp-builder` | S (not standalone) | _(promoted copy did not exist)_ | `vendor/anthropics-skills/skills/mcp-builder/` |
| `media-use` | S (not standalone) | _(promoted copy did not exist)_ | _(no vendor copy - removed outright)_ |
| `orchestrate` | L (never loadable) | _(no promoted copy - removed outright)_ | _(no vendor copy - removed outright)_ |
| `monte-carlo-analyze-root-cause` | U (never usable) S (not standalone) | `devops/monte-carlo/monte-carlo-analyze-root-cause/` | _(no vendor copy - removed outright)_ |
| `monte-carlo-incident-response` | U (never usable) | `devops/monte-carlo/monte-carlo-incident-response/` | _(no vendor copy - removed outright)_ |
| `monte-carlo-monitoring-advisor` | U (never usable) S (not standalone) | `devops/monte-carlo/monte-carlo-monitoring-advisor/` | _(no vendor copy - removed outright)_ |
| `monte-carlo-performance-diagnosis` | U (never usable) S (not standalone) | `devops/monte-carlo/monte-carlo-performance-diagnosis/` | _(no vendor copy - removed outright)_ |
| `monte-carlo-remediation` | U (never usable) S (not standalone) | `devops/monte-carlo/monte-carlo-remediation/` | _(no vendor copy - removed outright)_ |
| `monte-carlo-storage-cost-analysis` | U (never usable) S (not standalone) | `devops/monte-carlo/monte-carlo-storage-cost-analysis/` | _(no vendor copy - removed outright)_ |
| `monte-carlo-troubleshoot-agent-traces` | U (never usable) S (not standalone) | `devops/monte-carlo/monte-carlo-troubleshoot-agent-traces/` | _(no vendor copy - removed outright)_ |
| `moviepy` | E (error references) S (not standalone) | `video/moviepy/` | `vendor/claude-code-video-toolkit/.claude/skills/moviepy/` |
| `painted-animation` | E (error references) | `video/painted-animation/` | `vendor/opus-video-skills/skills/painted-animation/` |
| `planetscale-mcp-agent-operating-model` | S (not standalone) | `devops/planetscale/planetscale-mcp-agent-operating-model/` | `vendor/planetscale-skills/planetscale-mcp-agent-operating-model/` |
| `playwright-recording` | E (error references) S (not standalone) | `video/playwright-recording/` | `vendor/claude-code-video-toolkit/.claude/skills/playwright-recording/` |
| `playwright-testing` | U (never usable) | `game-dev/playwright-testing/` | _(no vendor copy - removed outright)_ |
| `product-strategist` | E (error references) S (not standalone) | `management/product-strategist/` | `vendor/claude-skills/product-team/skills/product-strategist/` |
| `qwen-edit` | E (error references) S (not standalone) | `video/qwen-edit/` | `vendor/claude-code-video-toolkit/.claude/skills/qwen-edit/` |
| `remotion-best-practices` | E (error references) L (low quality) | `video/remotion-best-practices/` | `vendor/remotion-skills/skills/remotion-best-practices/` |
| `remotion-create` | L (low quality) | `video/remotion-create/` | `vendor/remotion-skills/skills/remotion-create/` |
| `remotion-docs` | L (low quality) | `video/remotion-docs/` | `vendor/remotion-skills/skills/remotion-docs/` |
| `remotion-maps` | L (low quality) | `video/remotion-maps/` | `vendor/remotion-skills/skills/remotion-maps/` |
| `remotion-multimedia` | L (low quality) | `video/remotion-multimedia/` | `vendor/remotion-skills/skills/remotion-multimedia/` |
| `remotion-render` | L (low quality) | `video/remotion-render/` | `vendor/remotion-skills/skills/remotion-render/` |
| `remotion-saas` | L (low quality) | `video/remotion-saas/` | `vendor/remotion-skills/skills/remotion-saas/` |
| `remotion-studio` | L (low quality) | `video/remotion-studio/` | `vendor/remotion-skills/skills/remotion-studio/` |
| `remotion-to-hyperframes` | E (error references) | `content/remotion-to-hyperframes/` | _(no vendor copy - removed outright)_ |
| `remotion-upgrade` | L (low quality) | `video/remotion-upgrade/` | `vendor/remotion-skills/skills/remotion-upgrade/` |
| `render-quality-loop` | E (error references) S (not standalone) | `game-dev/render-quality-loop/` | _(no vendor copy - removed outright)_ |
| `requesting-code-review` | E (error references) S (not standalone) | `software-development/requesting-code-review/` | `vendor/superpowers/skills/requesting-code-review/` |
| `research` | L (low quality) | `software-development/mattpocock/skills/engineering/research/` | `vendor/claude-skills/research/research/skills/research/`, `vendor/mattpocock-skills/skills/engineering/research/` |
| `setup-matt-pocock-skills` | E (error references) | `software-development/mattpocock/skills/engineering/setup-matt-pocock-skills/` | `vendor/mattpocock-skills/skills/engineering/setup-matt-pocock-skills/` |
| `stitched-full-page-capture` | E (error references) | `video/mengto/stitched-full-page-capture/` | `vendor/mengto-skills/agent-skills/codex/stitched-full-page-capture/` |
| `storyboard` | U (never usable) E (error references) S (not standalone) | `design/storyboard/` | _(no vendor copy - removed outright)_ |
| `synthetic-ui-demo` | S (not standalone) | `video/synthetic-ui-demo/` | `vendor/claude-code-video-toolkit/.claude/skills/synthetic-ui-demo/` |
| `taste-frontend` | L (low quality) | `design/taste-frontend/` | _(no vendor copy - removed outright)_ |
| `three-pbr-workflow` | E (error references) | `game-dev/three-pbr-workflow/` | _(no vendor copy - removed outright)_ |
| `video-shotcraft` | E (error references) | `video/video-shotcraft/` | `vendor/video-shotcraft/` |
| `video_toolkit` | E (error references) S (not standalone) | `video/video_toolkit/` | _(no vendor copy - removed outright)_ |
| `writing-plans` | S (not standalone) | `software-development/writing-plans/` | `vendor/superpowers/skills/writing-plans/` |
| `writing-skills` | E (error references) S (not standalone) | `software-development/writing-skills/` | `vendor/superpowers/skills/writing-skills/` |

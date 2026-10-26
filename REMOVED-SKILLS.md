# Retired skills - 2026-10-25 defect audit

68 skills were removed on 2026-10-25 and 49 more on 2026-10-26 from the vault and from every harness store
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

## Retired skills - 2026-10-26 cross-review

Two agents audited the installed library independently on this machine
(packaging score + whether it runs here + whether it stands alone + overlap).
Retired: everything both reports flagged as broken or redundant, plus the
service-account families the owner chose to drop (PlanetScale, Dynatrace,
and the Grafana Cloud-only skills; the self-hostable Grafana skills stay).

| class | meaning |
|---|---|
| U | never usable here (payload scripts not shipped, or the host app is absent) |
| S | not standalone (only routes to skills that no longer exist) |
| D | redundant (duplicates another installed skill, or has no subject) |
| X | needs an external account this machine does not have |

Also on 2026-10-26, without retiring: `implement`, `grill-me`, `grill-with-docs`,
`code-review`, `brainstorming`, `game-dev-loop` and `skill-distill` moved from
tier A to tier B (still installed, no longer in the always-visible listing).
Fixes for the skills that stay are queued in `SKILL_CANDIDATES.md`.

| skill | class | reason | promoted copy removed | upstream kept in vendor |
|---|---|---|---|---|
| `acestep` | U (never usable here) | runs `tools/music_gen.py`/`tools/sfx.py`, not shipped; needs a Modal or RunPod endpoint | `video/acestep/` | `vendor/claude-code-video-toolkit/` (with the `tools/` it needs) |
| `debugger-persona` | D (redundant) | subset of `systematic-debugging` + `diagnosing-bugs` + `shuorenhua` | `software-development/debugger-persona/` | _(local skill - git history only)_ |
| `dt-alerting` | X (needs external account) | needs a Dynatrace tenant + token; `dtctl` not installed | `devops/dynatrace/dt-alerting/` | `vendor/dynatrace-for-ai/` |
| `dt-app-dashboards` | X (needs external account) | needs a Dynatrace tenant + token; `dtctl` not installed | `devops/dynatrace/dt-app-dashboards/` | `vendor/dynatrace-for-ai/` |
| `dt-dql-essentials` | X (needs external account) | needs a Dynatrace tenant + token; `dtctl` not installed | `devops/dynatrace/dt-dql-essentials/` | `vendor/dynatrace-for-ai/` |
| `dt-obs-analytics` | X (needs external account) | needs a Dynatrace tenant + token; `dtctl` not installed | `devops/dynatrace/dt-obs-analytics/` | `vendor/dynatrace-for-ai/` |
| `dt-obs-logs` | X (needs external account) | needs a Dynatrace tenant + token; `dtctl` not installed | `devops/dynatrace/dt-obs-logs/` | `vendor/dynatrace-for-ai/` |
| `dt-obs-problems` | X (needs external account) | needs a Dynatrace tenant + token; `dtctl` not installed | `devops/dynatrace/dt-obs-problems/` | `vendor/dynatrace-for-ai/` |
| `dt-obs-services` | X (needs external account) | needs a Dynatrace tenant + token; `dtctl` not installed | `devops/dynatrace/dt-obs-services/` | `vendor/dynatrace-for-ai/` |
| `dt-obs-tracing` | X (needs external account) | needs a Dynatrace tenant + token; `dtctl` not installed | `devops/dynatrace/dt-obs-tracing/` | `vendor/dynatrace-for-ai/` |
| `dt-platform-costs` | X (needs external account) | needs a Dynatrace tenant + token; `dtctl` not installed | `devops/dynatrace/dt-platform-costs/` | `vendor/dynatrace-for-ai/` |
| `dt-sec-insights` | X (needs external account) | needs a Dynatrace tenant + token; `dtctl` not installed | `devops/dynatrace/dt-sec-insights/` | `vendor/dynatrace-for-ai/` |
| `dt-setup-oneagent` | X (needs external account) | needs a Dynatrace tenant + token; `dtctl` not installed | `devops/dynatrace/dt-setup-oneagent/` | `vendor/dynatrace-for-ai/` |
| `grafana-adaptive-metrics` | X (needs external account) | Grafana Cloud only (stack + `glc_` token / `gcx`); the self-hostable Grafana skills stay | `devops/grafana/grafana-cloud/grafana-adaptive-metrics/` | `vendor/grafana-skills/` |
| `grafana-admin` | X (needs external account) | Grafana Cloud only (stack + `glc_` token / `gcx`); the self-hostable Grafana skills stay | `devops/grafana/grafana-cloud/grafana-admin/` | `vendor/grafana-skills/` |
| `grafana-app-observability` | X (needs external account) | Grafana Cloud only (stack + `glc_` token / `gcx`); the self-hostable Grafana skills stay | `devops/grafana/grafana-cloud/grafana-app-observability/` | `vendor/grafana-skills/` |
| `grafana-cloud-integrations` | X (needs external account) | Grafana Cloud only (stack + `glc_` token / `gcx`); the self-hostable Grafana skills stay | `devops/grafana/grafana-cloud/grafana-cloud-integrations/` | `vendor/grafana-skills/` |
| `grafana-cost-management` | X (needs external account) | Grafana Cloud only (stack + `glc_` token / `gcx`); the self-hostable Grafana skills stay | `devops/grafana/grafana-cloud/grafana-cost-management/` | `vendor/grafana-skills/` |
| `grafana-database-observability` | X (needs external account) | Grafana Cloud only (stack + `glc_` token / `gcx`); the self-hostable Grafana skills stay | `devops/grafana/grafana-cloud/grafana-database-observability/` | `vendor/grafana-skills/` |
| `grafana-dpm-finder` | X (needs external account) | Grafana Cloud only (stack + `glc_` token / `gcx`); the self-hostable Grafana skills stay | `devops/grafana/grafana-cloud/grafana-dpm-finder/` | `vendor/grafana-skills/` |
| `grafana-fleet-management` | X (needs external account) | Grafana Cloud only (stack + `glc_` token / `gcx`); the self-hostable Grafana skills stay | `devops/grafana/grafana-cloud/grafana-fleet-management/` | `vendor/grafana-skills/` |
| `grafana-frontend-session-rca` | X (needs external account) | Grafana Cloud only (stack + `glc_` token / `gcx`); the self-hostable Grafana skills stay | `devops/grafana/grafana-cloud/grafana-frontend-session-rca/` | `vendor/grafana-skills/` |
| `grafana-infrastructure` | X (needs external account) | Grafana Cloud only (stack + `glc_` token / `gcx`); the self-hostable Grafana skills stay | `devops/grafana/grafana-cloud/grafana-infrastructure/` | `vendor/grafana-skills/` |
| `grafana-ml-ai` | X (needs external account) | Grafana Cloud only (stack + `glc_` token / `gcx`); the self-hostable Grafana skills stay | `devops/grafana/grafana-cloud/grafana-ml-ai/` | `vendor/grafana-skills/` |
| `grafana-oncall-irm` | X (needs external account) | Grafana Cloud only (stack + `glc_` token / `gcx`); the self-hostable Grafana skills stay | `devops/grafana/grafana-cloud/grafana-oncall-irm/` | `vendor/grafana-skills/` |
| `grafana-performance-rca` | X (needs external account) | Grafana Cloud only (stack + `glc_` token / `gcx`); the self-hostable Grafana skills stay | `devops/grafana/grafana-lgtm/grafana-performance-rca/` | `vendor/grafana-skills/` |
| `grafana-private-connectivity` | X (needs external account) | Grafana Cloud only (stack + `glc_` token / `gcx`); the self-hostable Grafana skills stay | `devops/grafana/grafana-cloud/grafana-private-connectivity/` | `vendor/grafana-skills/` |
| `grafana-send-data` | X (needs external account) | Grafana Cloud only (stack + `glc_` token / `gcx`); the self-hostable Grafana skills stay | `devops/grafana/grafana-cloud/grafana-send-data/` | `vendor/grafana-skills/` |
| `ideogram4` | U (never usable here) | runs `tools/ideogram4.py`/`tools/flux2.py`, not shipped; needs an Ideogram API key | `video/ideogram4/` | `vendor/claude-code-video-toolkit/` (with the `tools/` it needs) |
| `ltx2` | U (never usable here) | runs `tools/ltx2.py` and cites `docs/ltx2.md`, neither shipped; needs a Modal A100 endpoint | `video/ltx2/` | `vendor/claude-code-video-toolkit/` (with the `tools/` it needs) |
| `monte-carlo-proactive-monitoring` | S (not standalone) | pure router: every step loads `monitoring-advisor`/`prevent`, both retired 2026-10-25; no logic of its own | `devops/monte-carlo/monte-carlo-proactive-monitoring/` | `vendor/mc-agent-toolkit/` |
| `planetscale-autonomous-execution-mode` | X (needs external account) | needs a PlanetScale org + `pscale`; one assessment split 14 ways (the orchestrator reads its 13 siblings by `../` path, so the family goes together) | `devops/planetscale/planetscale-autonomous-execution-mode/` | `vendor/planetscale-skills/` |
| `planetscale-best-practices-matrix` | X (needs external account) | needs a PlanetScale org + `pscale`; one assessment split 14 ways (the orchestrator reads its 13 siblings by `../` path, so the family goes together) | `devops/planetscale/planetscale-best-practices-matrix/` | `vendor/planetscale-skills/` |
| `planetscale-change-gates-and-approval-contract` | X (needs external account) | needs a PlanetScale org + `pscale`; one assessment split 14 ways (the orchestrator reads its 13 siblings by `../` path, so the family goes together) | `devops/planetscale/planetscale-change-gates-and-approval-contract/` | `vendor/planetscale-skills/` |
| `planetscale-codebase-sqlcommenter-instrumentation` | X (needs external account) | needs a PlanetScale org + `pscale`; one assessment split 14 ways (the orchestrator reads its 13 siblings by `../` path, so the family goes together) | `devops/planetscale/planetscale-codebase-sqlcommenter-instrumentation/` | `vendor/planetscale-skills/` |
| `planetscale-customer-report-template` | X (needs external account) | needs a PlanetScale org + `pscale`; one assessment split 14 ways (the orchestrator reads its 13 siblings by `../` path, so the family goes together) | `devops/planetscale/planetscale-customer-report-template/` | `vendor/planetscale-skills/` |
| `planetscale-postgres-safety-review` | X (needs external account) | needs a PlanetScale org + `pscale`; one assessment split 14 ways (the orchestrator reads its 13 siblings by `../` path, so the family goes together) | `devops/planetscale/planetscale-postgres-safety-review/` | `vendor/planetscale-skills/` |
| `planetscale-pscale-cli-automation` | X (needs external account) | needs a PlanetScale org + `pscale`; one assessment split 14 ways (the orchestrator reads its 13 siblings by `../` path, so the family goes together) | `devops/planetscale/planetscale-pscale-cli-automation/` | `vendor/planetscale-skills/` |
| `planetscale-query-insights-and-tags` | X (needs external account) | needs a PlanetScale org + `pscale`; one assessment split 14 ways (the orchestrator reads its 13 siblings by `../` path, so the family goes together) | `devops/planetscale/planetscale-query-insights-and-tags/` | `vendor/planetscale-skills/` |
| `planetscale-readonly-inventory` | X (needs external account) | needs a PlanetScale org + `pscale`; one assessment split 14 ways (the orchestrator reads its 13 siblings by `../` path, so the family goes together) | `devops/planetscale/planetscale-readonly-inventory/` | `vendor/planetscale-skills/` |
| `planetscale-safe-orchestrator` | X (needs external account) | needs a PlanetScale org + `pscale`; one assessment split 14 ways (the orchestrator reads its 13 siblings by `../` path, so the family goes together) | `devops/planetscale/planetscale-safe-orchestrator/` | `vendor/planetscale-skills/` |
| `planetscale-schema-recommendations-agent-loop` | X (needs external account) | needs a PlanetScale org + `pscale`; one assessment split 14 ways (the orchestrator reads its 13 siblings by `../` path, so the family goes together) | `devops/planetscale/planetscale-schema-recommendations-agent-loop/` | `vendor/planetscale-skills/` |
| `planetscale-traffic-control-recommendations` | X (needs external account) | needs a PlanetScale org + `pscale`; one assessment split 14 ways (the orchestrator reads its 13 siblings by `../` path, so the family goes together) | `devops/planetscale/planetscale-traffic-control-recommendations/` | `vendor/planetscale-skills/` |
| `planetscale-vitess-safety-review` | X (needs external account) | needs a PlanetScale org + `pscale`; one assessment split 14 ways (the orchestrator reads its 13 siblings by `../` path, so the family goes together) | `devops/planetscale/planetscale-vitess-safety-review/` | `vendor/planetscale-skills/` |
| `planetscale-webhook-automation-recommendations` | X (needs external account) | needs a PlanetScale org + `pscale`; one assessment split 14 ways (the orchestrator reads its 13 siblings by `../` path, so the family goes together) | `devops/planetscale/planetscale-webhook-automation-recommendations/` | `vendor/planetscale-skills/` |
| `runpod` | U (never usable here) | runs 5 `tools/*.py` scripts that are not shipped; needs a RunPod account | `video/runpod/` | `vendor/claude-code-video-toolkit/` (with the `tools/` it needs) |
| `skill-auto-improve-mirror` | U (never usable here) | written for Hermes (`skill_view`, `~/.hermes`); no Hermes install on this machine; was tier A | `software-development/skill-auto-improve-mirror/` | _(local skill - git history only)_ |
| `taste-output` | D (redundant) | generic "never truncate" override with no subject; harness default behaviour | `design/taste-output/` | _(sibling repo `taste-skill`, `output-skill`)_ |
| `tripo-3d-generation` | X (needs external account) | calls an unofficial proxy `tripo-proxy.darknessporo.workers.dev` (trust risk) for a paid API | _(vendor-only; not copied into SKILL/)_ | `vendor/tripo-skills/` |

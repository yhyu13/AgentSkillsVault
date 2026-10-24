# Installed skill defect audit - 2026-10-25

Store: `~/.claude/skills` | Vault: `D:\GitRepo-AI\AgentSkillsVault`
| metric | count | share |
|---|---|---|
| 1. Never usable | 10 | 2% |
| 2. Error references | 29 | 8% |
| 3. Low quality | 11 | 3% |
| 4. Not standalone | 42 | 12% |
| no defect found | 268 | 80% |
| **installed skills scanned** | **335** | |

## 1. Never usable (10)

| skill | location in this repo | evidence |
|---|---|---|
| `automated-triage` | `devops/monte-carlo/automated-triage` | requires-unavailable-mcp:mcp__get_alerts,mcp__plugin_mc |
| `monte-carlo-analyze-root-cause` | `devops/monte-carlo/monte-carlo-analyze-root-cause` | requires-unavailable-mcp:mcp__get_alerts,mcp__plugin_mc |
| `monte-carlo-incident-response` | `devops/monte-carlo/monte-carlo-incident-response` | requires-unavailable-mcp:mcp__get_alerts,mcp__plugin_mc |
| `monte-carlo-monitoring-advisor` | `devops/monte-carlo/monte-carlo-monitoring-advisor` | requires-unavailable-mcp:mcp__get_alerts,mcp__plugin_mc |
| `monte-carlo-performance-diagnosis` | `devops/monte-carlo/monte-carlo-performance-diagnosis` | requires-unavailable-mcp:mcp__get_alerts,mcp__plugin_mc |
| `monte-carlo-remediation` | `devops/monte-carlo/monte-carlo-remediation` | requires-unavailable-mcp:mcp__airflow__trigger_dag_run,mcp__get_alerts,mcp__plugin_mc |
| `monte-carlo-storage-cost-analysis` | `devops/monte-carlo/monte-carlo-storage-cost-analysis` | requires-unavailable-mcp:mcp__get_alerts,mcp__plugin_mc |
| `monte-carlo-troubleshoot-agent-traces` | `devops/monte-carlo/monte-carlo-troubleshoot-agent-traces` | requires-unavailable-mcp:mcp__get_alerts,mcp__plugin_mc |
| `playwright-testing` | `game-dev/playwright-testing` | requires-unavailable-mcp:mcp__playwright__browser_click,mcp__playwright__browser_cons |
| `storyboard` | `design/storyboard` | requires-unavailable-mcp:mcp__claude_preview__preview_,mcp__claude_preview__preview_c |

## 2. Error references (29)

| skill | location in this repo | evidence |
|---|---|---|
| `ai-3d-toolchain` | `game-dev/ai-3d-toolchain` | 1/2 broken (upstream) - `scripts/optimize_model.py` |
| `competitor-profiling` | `management/marketing/competitor-profiling` | 1/3 broken (upstream) - `agents/product-marketing.md` |
| `customer-research` | `management/marketing/customer-research` | 1/3 broken (upstream) - `agents/product-marketing.md` |
| `frontend-slides` | `design/frontend-slides` | 2/9 broken (upstream) - `scripts/deploy.sh; scripts/export-pdf.sh` |
| `grafana-loki` | `devops/grafana/grafana-lgtm/grafana-loki` | 3/3 broken (upstream) - `references/configuration.md; references/logql.md; references/send-data.md` |
| `guide-from-probes` | `game-dev/guide-from-probes` | 1/3 broken (upstream) - `docs/playthrough/README.md` |
| `html-slides` | `design/html-slides` | 1/1 broken (upstream) - `scripts/extract-pptx.py` |
| `html-to-pptx` | `design/html-to-pptx` | 1/5 broken (upstream) - `references/lessons-learned.md` |
| `intro-scene-until-perfect` | `game-dev/intro-scene-until-perfect` | 6/6 broken (upstream) - `docs/design/02-art-direction.md; docs/design/07-sprite-gen-tasks.md; docs/design/08-level-design-workflow.md; docs/design/09-blindside-integration.md; docs/levels/m1_intro_scene.md; scripts/light-break-check.ts` |
| `kinetic-reel` | `video/kinetic-reel` | 1/8 broken (upstream) - `assets/score.m4a` |
| `lieflat-charts` | `content/lieflat-charts` | 2/13 broken (upstream) - `templates/reports/report-NN.en.html; templates/reports/report-NN.zh.html` |
| `market-intel` | `content/market-intel` | 2/12 broken (upstream) - `scripts/apply.py; scripts/capture-key.ps1` |
| `marketing-council` | `management/marketing/marketing-council` | 1/17 broken (upstream) - `agents/product-marketing.md` |
| `moviepy` | `video/moviepy` | 2/2 broken (upstream) - `examples/data-viz-chart/build.py; examples/quick-spot/build.py` |
| `painted-animation` | `video/painted-animation` | 1/5 broken (upstream) - `assets/song.mp3` |
| `playwright-recording` | `video/playwright-recording` | 1/1 broken (upstream) - `scripts/record-demo.ts` |
| `product-strategist` | `management/product-strategist` | 4/4 broken (upstream) - `references/examples/sample_growth_okrs.json; references/okr_framework.md; references/strategy_types.md; scripts/okr_cascade_generator.py` |
| `qwen-edit` | `video/qwen-edit` | 1/1 broken (upstream) - `docs/qwen-edit-patterns.md` |
| `remotion-best-practices` | `video/remotion-best-practices` | 1/12 broken (upstream) - `docs/REFERENCE.md` |
| `remotion-to-hyperframes` | `content/remotion-to-hyperframes` | 1/16 broken (upstream) - `assets/x.mp4` |
| `render-quality-loop` | `game-dev/render-quality-loop` | 3/3 broken (upstream) - `scripts/evaluate-render.mjs; scripts/render-image.mjs; scripts/screenshot-sweep.mjs` |
| `requesting-code-review` | `software-development/requesting-code-review` | 1/2 broken (upstream) - `docs/superpowers/plans/deployment-plan.md` |
| `setup-matt-pocock-skills` | `software-development/mattpocock/skills/engineering/setup-matt-pocock-skills` | 2/12 broken (upstream) - `docs/agents/domain.md; docs/agents/triage-labels.md` |
| `stitched-full-page-capture` | `video/mengto/stitched-full-page-capture` | 1/1 broken (upstream) - `scripts/check-ui-inspiration-duplicates.mjs` |
| `storyboard` | `design/storyboard` | 4/8 broken (upstream) - `examples/characters/README.md; examples/showcase/cast-and-sets.html; examples/showcase/scene-3d.html; examples/stripe-radar/storyboard.html` |
| `three-pbr-workflow` | `game-dev/three-pbr-workflow` | 1/3 broken (upstream) - `templates/xxx.html` |
| `video-shotcraft` | `video/video-shotcraft` | 2/18 broken (upstream) - `assets/scripts/capture-template.mjs; assets/scripts/smoke-render-demos.py` |
| `video_toolkit` | `video/video_toolkit` | 1/2 broken (upstream) - `assets/voices/reference.m4a` |
| `writing-skills` | `software-development/writing-skills` | 2/10 broken (upstream) - `scripts/tool.js; scripts/tool.sh` |

## 3. Low quality (11)

| skill | location in this repo | evidence |
|---|---|---|
| `remotion-best-practices` | `video/remotion-best-practices` | weak-description(30ch-no-trigger-cue) |
| `remotion-create` | `video/remotion-create` | weak-description(27ch-no-trigger-cue) |
| `remotion-docs` | `video/remotion-docs` | weak-description(29ch-no-trigger-cue) |
| `remotion-maps` | `video/remotion-maps` | weak-description(32ch-no-trigger-cue) |
| `remotion-multimedia` | `video/remotion-multimedia` | body-thin(611ch); weak-description(27ch-no-trigger-cue) |
| `remotion-render` | `video/remotion-render` | body-thin(625ch); weak-description(23ch-no-trigger-cue) |
| `remotion-saas` | `video/remotion-saas` | weak-description(26ch-no-trigger-cue) |
| `remotion-studio` | `video/remotion-studio` | weak-description(24ch-no-trigger-cue) |
| `remotion-upgrade` | `video/remotion-upgrade` | weak-description(38ch-no-trigger-cue) |
| `research` | `software-development/mattpocock/skills/engineering/research` | body-thin(518ch) |
| `taste-frontend` | `design/taste-frontend` | placeholder-markers |

## 4. Not standalone (42)

| skill | location in this repo | evidence |
|---|---|---|
| `academy-guide` | vendor only: `vendor/anthropics-skills/skills/academy-guide` | references-unshipped-payload |
| `ai-3d-toolchain` | `game-dev/ai-3d-toolchain` | depends-on-external-repo-path; claims-payload-but-ships-none |
| `automated-triage` | `devops/monte-carlo/automated-triage` | cross-skill-dependency(not-installed):prevent |
| `browser-video-recording` | `video/mengto/browser-video-recording` | mcp-server-required |
| `deferred-taxes` | `management/finance/accounting/deferred-taxes` | references-unshipped-payload |
| `elevenlabs` | `video/elevenlabs` | references-unshipped-payload |
| `frontend-slides` | `design/frontend-slides` | host-absolute-path; claims-payload-but-ships-none |
| `gaap-standards` | `management/finance/accounting/gaap-standards` | references-unshipped-payload |
| `genoffice` | `content/genoffice` | mcp-server-required |
| `god-leader-advisor` | `management/god-leader-advisor` | references-unshipped-payload |
| `grafana-assistant-mcp` | `devops/grafana/grafana-cloud/grafana-assistant-mcp` | mcp-server-required |
| `grafana-datasources-provisioning` | `devops/grafana/grafana-datasources/grafana-datasources-provisioning` | sibling-relative-path:../../grafana-core/grafana-oss/SKILL.md; references-unshipped-payload |
| `grafana-loki` | `devops/grafana/grafana-lgtm/grafana-loki` | claims-payload-but-ships-none |
| `grafana-synthetic-monitoring-checks` | `devops/grafana/grafana-cloud/grafana-synthetic-monitoring-checks` | sibling-relative-path:../../grafana-k6/k6/SKILL.md,../testing/SKILL.md |
| `grafana-testing` | `devops/grafana/grafana-cloud/grafana-testing` | sibling-relative-path:../synthetic-monitoring-checks/SKILL.md |
| `guide-from-probes` | `game-dev/guide-from-probes` | claims-payload-but-ships-none; references-unshipped-payload |
| `html-slides` | `design/html-slides` | depends-on-external-repo-path; claims-payload-but-ships-none |
| `hyperframes-cli` | `content/hyperframes-cli` | sibling-relative-path:../hyperframes/references/plugin-installation.md |
| `hyperframes-registry` | `content/hyperframes-registry` | sibling-relative-path:../hyperframes/references/plugin-installation.md |
| `intro-scene-until-perfect` | `game-dev/intro-scene-until-perfect` | claims-payload-but-ships-none |
| `kimi3-game-gen` | `game-dev/kimi3-game-gen` | host-absolute-path |
| `market-intel` | `content/market-intel` | depends-on-external-repo-path; sibling-relative-path:../../CONFIG.md,../../PHILOSOPHY.md; claims-payload-but-ships-none |
| `mcp-builder` | vendor only: `vendor/anthropics-skills/skills/mcp-builder` | mcp-server-required |
| `media-use` | **absent from this repo** | sibling-relative-path:../hyperframes/references/plugin-installation.md |
| `monte-carlo-analyze-root-cause` | `devops/monte-carlo/monte-carlo-analyze-root-cause` | cross-skill-dependency(not-installed):prevent |
| `monte-carlo-monitoring-advisor` | `devops/monte-carlo/monte-carlo-monitoring-advisor` | cross-skill-dependency(not-installed):prevent |
| `monte-carlo-performance-diagnosis` | `devops/monte-carlo/monte-carlo-performance-diagnosis` | cross-skill-dependency(not-installed):prevent |
| `monte-carlo-remediation` | `devops/monte-carlo/monte-carlo-remediation` | cross-skill-dependency(not-installed):prevent |
| `monte-carlo-storage-cost-analysis` | `devops/monte-carlo/monte-carlo-storage-cost-analysis` | cross-skill-dependency(not-installed):prevent |
| `monte-carlo-troubleshoot-agent-traces` | `devops/monte-carlo/monte-carlo-troubleshoot-agent-traces` | cross-skill-dependency(not-installed):instrument-agent |
| `moviepy` | `video/moviepy` | claims-payload-but-ships-none |
| `planetscale-mcp-agent-operating-model` | `devops/planetscale/planetscale-mcp-agent-operating-model` | mcp-server-required |
| `playwright-recording` | `video/playwright-recording` | claims-payload-but-ships-none |
| `product-strategist` | `management/product-strategist` | claims-payload-but-ships-none |
| `qwen-edit` | `video/qwen-edit` | claims-payload-but-ships-none |
| `render-quality-loop` | `game-dev/render-quality-loop` | claims-payload-but-ships-none |
| `requesting-code-review` | `software-development/requesting-code-review` | claims-payload-but-ships-none; references-unshipped-payload |
| `storyboard` | `design/storyboard` | depends-on-external-repo-path |
| `synthetic-ui-demo` | `video/synthetic-ui-demo` | references-unshipped-payload |
| `video_toolkit` | `video/video_toolkit` | claims-payload-but-ships-none; references-unshipped-payload |
| `writing-plans` | `software-development/writing-plans` | references-unshipped-payload |
| `writing-skills` | `software-development/writing-skills` | sibling-relative-path:../using-superpowers/references/codex-tools.md,../using-superpowers/references/gemini-tools.md |

## Installed but not promoted into a category dir (18)

| skill | in this repo? | defects |
|---|---|---|
| `academy-guide` | vendor:`vendor/anthropics-skills/skills/academy-guide` | S |
| `algorithmic-art` | vendor:`vendor/anthropics-skills/skills/algorithmic-art` | - |
| `browser-automation` | vendor:`vendor/claude-skills/engineering/skills/browser-automation` | - |
| `canvas-design` | vendor:`vendor/anthropics-skills/skills/canvas-design` | - |
| `claude-api` | vendor:`vendor/anthropics-skills/skills/claude-api` | - |
| `deep-research` | vendor:`vendor/claude-skills/research/deep-research/skills/deep-research` | - |
| `discernment-nudge` | vendor:`vendor/anthropics-skills/skills/discernment-nudge` | - |
| `docx` | vendor:`vendor/anthropics-skills/skills/docx` | - |
| `investment-masters` | vendor:`vendor/investment-masters` | - |
| `mcp-builder` | vendor:`vendor/anthropics-skills/skills/mcp-builder` | S |
| `media-use` | **absent** | S |
| `orchestrate` | **absent** | - |
| `pdf` | vendor:`vendor/anthropics-skills/skills/pdf` | - |
| `pptx` | vendor:`vendor/anthropics-skills/skills/pptx` | - |
| `slack-gif-creator` | vendor:`vendor/anthropics-skills/skills/slack-gif-creator` | - |
| `tripo-3d-generation` | **absent** | - |
| `web-artifacts-builder` | vendor:`vendor/anthropics-skills/skills/web-artifacts-builder` | - |
| `xlsx` | vendor:`vendor/anthropics-skills/skills/xlsx` | - |

## Multiple defects at once (1)

| skill | defects | location |
|---|---|---|
| `storyboard` | UES | `design/storyboard` |

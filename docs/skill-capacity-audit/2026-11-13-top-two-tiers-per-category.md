# 2026-11-13 每类只装最高两档 —— 影响测算

- manifest 总条目：264
- 有档位的 vault skill：253
- 无档位（vendor / HOST / 平铺）：11
- 保留（每类最高两档）：**124**
- 可减掉：**129**
- 政策后安装总数：**135**（现在 264）

## 每个类别

| category | 现有 | 保留档位 | 保留 | 减掉 | 各档数量 |
|---|---|---|---|---|---|
| agents | 7 | tier2+tier3 | 6 | 1 | tier2:1 tier3:5 tier4:1 |
| content | 24 | tier0+tier1 | 12 | 12 | tier0:2 tier1:10 tier2:7 tier3:5 |
| design | 25 | tier0+tier1 | 16 | 9 | tier0:8 tier1:8 tier2:2 tier3:5 tier4:2 |
| devops | 16 | tier1+tier2 | 14 | 2 | tier1:2 tier2:12 tier3:2 |
| game-dev | 37 | tier0+tier1 | 4 | 33 | tier0:2 tier1:2 tier2:13 tier3:13 tier4:7 |
| knowledge-vault | 3 | tier0+tier2 | 3 | 0 | tier0:2 tier2:1 |
| management | 54 | tier2+tier3 | 51 | 3 | tier2:10 tier3:41 tier4:3 |
| math | 1 | tier2 | 1 | 0 | tier2:1 |
| software-development | 41 | tier0+tier1 | 4 | 37 | tier0:1 tier1:3 tier2:15 tier3:17 tier4:5 |
| video | 44 | tier0+tier1 | 12 | 32 | tier0:4 tier1:8 tier2:19 tier3:13 |
| writing | 1 | tier1 | 1 | 0 | tier1:1 |
| **合计** | **253** | | **124** | **129** | |

## 会被减掉的 skill

**agents** (1): `colleague-yuhang`

**content** (12): `content-craft`、`hackathon-pitch-pipeline`、`long-blog-to-viral-social-posts`、`notes-on-writing`、`okr-planner`、`progress-doc-style`、`shuorenhua`、`social-push`、`style-cn-platform-tutorial`、`style-cn-tech-deep-dive`、`tech-design-to-zhihu`、`yu-hang-writing-style`

**design** (9): `doubaofeishu_ui-design-system`、`slideshow`、`taste-brandkit`、`taste-director`、`taste-imagegen-mobile`、`taste-imagegen-web`、`taste-redesign`、`taste-stitch`、`ui-mockups`

**devops** (2): `grafana-promql`、`grafana-pyroscope`

**game-dev** (33): `ai-3d-character-pipeline`、`ai-3d-scene-pipeline`、`blender-game-assets-v2`、`cat-game-architecture`、`engine-project-agent-v2`、`game-archetype-classifier`、`game-art-director`、`game-asset-art-direction`、`game-audio-director`、`game-build-verification`、`game-debug`、`game-design-strategist`、`game-dev-loop`、`game-engineering-lead`、`game-gdd-writing`、`game-grid-logic`、`game-liveops-assist-v2`、`game-platformer`、`game-proto-validation-v2`、`game-quality-lead`、`game-release-ops-lead`、`game-studio-lead`、`game-template`、`game-template-engineering`、`game-top-down-action`、`game-tower-defense`、`game-ui-heavy-narrative`、`gdd-markdown-template`、`phaser-gamedev`、`procedural-3d-scenes`、`three-clay-scenes`、`three-procedural-scenes`、`ue4-shader-debug`

**management** (3): `action-substitution`、`concentrate-forces`、`prd`

**software-development** (37): `agent-desktop`、`ask-matt`、`brainstorming`、`code-review`、`codebase-design`、`distilly`、`domain-modeling`、`governance-doc-design`、`grill-me`、`grill-with-docs`、`grilling`、`handoff`、`implement`、`improve-codebase-architecture`、`journey`、`llm-friendly-dsl-verification`、`plugin-capability-brief`、`prompt-pro`、`prototype`、`receiving-code-review`、`resolving-merge-conflicts`、`self-improvement`、`skill-distill`、`skill-inspector`、`skillopt-sleep`、`software-dev-loop`、`source-anchored-design`、`tdd`、`technical-research-analysis-doc`、`to-spec`、`to-tickets`、`triage`、`truth-seeking-research`、`using-git-worktrees`、`verification-before-completion`、`wayfinder`、`wizard`

**video** (32): `3d-cloth-material`、`3d-falling-leaves`、`3d-four-seasons`、`3d-high-poly-models`、`3d-high-resolution-textures`、`3d-metal-material`、`3d-orbit-inspect-demo`、`3d-paper-material`、`3d-retina-resolution`、`3d-sky-background`、`3d-sky-rays`、`3d-underwater-god-rays`、`3d-virtual-tour`、`3d-wood-material`、`ai-video-production`、`audit-verify-explain-grade-5`、`aura-asset-images`、`elevenlabs-tts`、`ffmpeg`、`html-to-interaction-prompts`、`hyperframes-video-director`、`iterate-until-verified`、`lemo-opuscar`、`make-interfaces-feel-better`、`opus-video-prompts`、`remotion-captions`、`remotion-interactivity`、`remotion-video-engineering-distilled`、`unsplash-asset-images`、`video-to-superprompt`、`video-use`、`web-technique-to-skill`

## 不受该政策影响的条目

- `tygg-ai-film-studio` → SKILL/video/tygg-ai-film-studio
- `algorithmic-art` → vendor/anthropics-skills/skills/algorithmic-art
- `browser-automation` → vendor/claude-skills/engineering/skills/browser-automation
- `canvas-design` → vendor/anthropics-skills/skills/canvas-design
- `claude-api` → vendor/anthropics-skills/skills/claude-api
- `deep-research` → vendor/claude-skills/research/deep-research/skills/deep-research
- `discernment-nudge` → vendor/anthropics-skills/skills/discernment-nudge
- `investment-masters` → vendor/investment-masters
- `slack-gif-creator` → vendor/anthropics-skills/skills/slack-gif-creator
- `web-artifacts-builder` → vendor/anthropics-skills/skills/web-artifacts-builder
- `xlsx` → vendor/anthropics-skills/skills/xlsx

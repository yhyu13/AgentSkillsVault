---
name: humanize-ppt
description: AST-based outline director for human-centered AI presentation workflows. Use when the user wants to turn raw material, a document, a transcript or an old deck into a slide outline, or before generating PPT/HTML slides from anywhere they have not yet structured.
version: 0.1.0
author: LearnPrompt
license: MIT
metadata:
  tags: [presentation, ppt, html-slides, humanizer, ast, workflow]
---
# Humanize PPT

Use this skill when a user wants to turn raw material, notes, voice transcripts, documents, links, or old PPTs into a presentation-ready outline before rendering slides.

## Positioning

Humanize PPT is an **Outline Director** and **Agent Teams Orchestrator**, not a slide renderer.

It should run before downstream PPT / HTML slide skills. Its job is to produce a clean AST-based production brief so renderers do not ingest raw noisy material directly.

In Agent Teams mode, the main Humanize PPT Agent loads this skill and controls specialist agents:

- Guizang Agent for Chinese stable rendering.
- Zara Agent for style exploration, HTML production, and deploy.
- HyperFrames Agent for video slots.
- Presenter Agent for presenter mode after the deck is finalized.
- QA Agent for content, visual, path, and delivery checks.

## AST theory

AST means **Audience-State-Transfer**.

- **Audience**: who is listening, what they know, what they resist, and why they would keep listening.
- **State**: the audience state before and after the deck, plus the core tension that blocks the transition.
- **Transfer**: the slide-by-slide path that moves the audience from initial state to desired state.

Core sentence:

> PPT is not an information container. PPT is an audience state-transfer artifact.

## Required output contract

For every Humanize PPT run, produce:

1. `deck_brief.md` — audience, goal, tension, success criteria.
2. `ast_outline.md` — AST map and narrative arc.
3. `slide_plan.json` — slide-by-slide plan.
4. `speaker_intent.md` — what the speaker should do on each slide.
5. `asset_manifest.md` — screenshots, charts, images, video needs.
6. `video_slots.json` — optional HyperFrames / video insertion plan.

## Recommended OPC workflow

```text
O — Outline Director
  Humanize PPT: raw material → AST outline + production brief

P — Presentation Production
  guizang path: Chinese stable HTML PPT
  Zara path: style exploration and HTML production

C — Complete / Control
  HyperFrames video adapter
  Presenter Adapter shell
  Deploy / export adapter
  QA checklist
```

## Rules

1. Do not let slide renderers consume raw material directly when Humanize PPT can first produce the AST contract.
2. Keep presenter mode as a post-processing adapter, not a style.
3. Separate deployment from presenter mode.
4. Absorb AI-writing cleanup principles from humanizer tools, but do not reduce Humanize PPT to text polishing.
5. Prefer a small verified workflow over a broad unverified promise.
6. For public Skill releases, create/push the repo, install from GitHub locally, run one safe full sample, verify style exploration + presenter mode + deploy URL, and only then polish README details.
7. For Agent Teams development, emit `router_plan.json`, `run_manifest.json`, bounded `commands/*.md`, and separate `outputs/<agent>/` directories before wiring real downstream Skills.

## Operational references

- `references/agent-teams-public-preview.md` — Agent Teams architecture, specialist-agent command protocol, public preview release loop, and README split convention.

## Local demo

If this repository is installed locally, run:

```bash
python3 scripts/humanize_ppt_v1.py \
  --source examples/01-ai-tool-update/source.md \
  --out .humanize-ppt-runs/ai-tool-update \
  --title "AI 工具更新，不只是功能清单"
```

## Handoff contract inside a deck pack

When this skill runs as the outline stage of a deck pack, the six artifacts below
are the only interface the downstream renderer is allowed to read. Write them to
`deck/brief/` and `deck/plan/`, never inline them in chat.

| Artifact | Path | Must contain |
|---|---|---|
| Deck brief | `brief/deck_brief.md` | audience, scene, goal, core tension, success criteria |
| AST outline | `brief/ast_outline.md` | per-unit audience / before-state / after-state / transfer |
| Slide plan | `plan/slide_plan.json` | continuous `no`, per-slide `purpose`, `layout`, `assets` |
| Speaker intent | `brief/speaker_intent.md` | one belief per slide + spoken-language direction |
| Asset manifest | `brief/asset_manifest.md` | every asset with `source` and `status` |
| Video slots | `plan/video_slots.json` | `{"slots": []}` when no video is needed |

### Self-check before handing off

```bash
# contract gate: files exist, JSON parses, numbering continuous, purpose present
python ../../scripts/validate_pack.py --deck deck --stage contracts
```

If the gate fails, fix the contract instead of telling the renderer to “just start”.
A missing `purpose` on any slide is a content decision that belongs here, not in the
renderer — that is the whole reason this stage exists.

### What not to hand off

- A slide list with no state change: it will render, and the talk will still be flat.
- Assets marked `skip` but kept in the plan: the renderer will leave an empty frame.
- Narrated reasoning traces in slide copy: keep deliberation in `ast_outline.md`.

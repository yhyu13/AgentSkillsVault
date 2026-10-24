# Tool: academic-research-skills

- **Domain(s):** ready-skills
- **Barrier route:** 1 official API · **Source tier:** free OSS · **Ready MCP:** no (Claude Code plugin / skill pack, not an MCP server)
- **Top pick for its domain:** yes, when the ask is a full academic-pipeline skill stack

## What it does / when to pick it
Full academic research pipeline plugin for Claude Code, planning, literature review, methodology, drafting, and peer-review handed off as a coordinated skill stack rather than a single tool. Repo: https://github.com/Imbad0202/academic-research-skills (32,173 stars, 2,645 forks, v3.12.1 tagged 2026-06-15, latest commit 2026-06-17; 8 topics including `claude-code`, `academic-pipeline`, `peer-review`).

**Decision rule:** pick this when the user explicitly needs the academic-pipeline skill stack (lit review *plus* drafting *plus* peer review) wired into Claude Code. For a one-off paper question or single-paper Q&A, **paper-qa** is lighter and faster, don't pull a multi-skill plugin to answer one question.

## Install
Install: <TODO: confirm install method>, see https://github.com/Imbad0202/academic-research-skills

## Auth / keys
Free, no key for the plugin itself. Downstream skills (lit search, peer-review reasoning) inherit whatever provider keys your Claude Code session already has, no additional auth surface introduced by the pack.

## Usage, call examples
After install, invoke the relevant skill in a Claude Code session, e.g.:

- `/academic-research:lit-review "topic X, last 5 years"`
- `/academic-research:peer-review path/to/draft.tex`
- `/academic-research:methodology "RCT for intervention Y"`

(Exact command names follow whatever the installed plugin registers, check `/help` after install.)

## General experience and gotchas (踩坑)
- **Skill pack, not a data source**, it orchestrates Claude's reasoning over papers; it does not itself index arXiv/PubMed. Pair with an actual retrieval tool (paper-qa, arxiv-mcp, Semantic Scholar) for the corpus side.
- **Heavy for one-shot questions**, 32k stars reflect the pipeline crowd; if the user just wants "summarize this PDF", the plugin's planning/peer-review scaffolding is overkill. Route to paper-qa instead.
- **Fast-moving repo**, v3.12.1 was tagged 2026-06-15 with a commit landing 2026-06-17 (two days apart). Pin the version you install; expect command names and skill boundaries to shift between minor releases.
- **8 topics ≠ 8 supported workflows**, topic tags like `claude-code` / `academic-pipeline` / `peer-review` describe intent, not feature completeness. Verify the specific sub-skill exists in the installed version before promising it to the user.
- **Quality depends on the model behind Claude Code**, peer-review and methodology critique are LLM-reasoning skills; they are only as sharp as the underlying model. Don't treat output as authoritative review.

## Last verified: 2026-06

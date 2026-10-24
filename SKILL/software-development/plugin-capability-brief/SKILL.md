---
name: plugin-capability-brief
description: Create a concise, evidence-based plugin capability brief for colleagues or stakeholders. Use when asked to introduce an existing plugin, document its capabilities, explain usage and outputs, clarify why it exists, compare its concrete differences, add usage-case links, or publish the brief to a Feishu document.
---

# Plugin Capability Brief

## Overview

Produce a readable introduction to an existing plugin from current source evidence. Keep the scope on the plugin unless the user explicitly asks for platform architecture, integration design, or OKR planning.

## Workflow

### 1. Fix the audience and scope

State the assumed audience and expected reading time. If the user says “只介绍插件”, exclude platform architecture, task-management design, storage, dashboards, and governance.

### 2. Gather current evidence

Inspect the plugin manifest first, then the current README, design documents, manuals, and recent test/release records. Prefer current package metadata over historical documents when versions disagree. Record the current version and only claim capabilities supported by the evidence.

Useful evidence includes:

- plugin manifest / `ghost.json`: public tool names, parameters, version, and declared boundaries
- design or technical documents: workflow, supported inputs, output schema, and limitations
- test and release records: verified behavior and known gaps

Do not convert an old guide's version number or planned feature into a current capability without checking newer evidence.

### 3. Build the capability map

Group the plugin into the smallest useful set of capability categories. For every category, write the same four fields:

- **How to use**: the user-facing tool or operation, required inputs, and normal sequence.
- **How Cindy combines it**: how a user can describe the goal in natural language and which follow-up analysis is useful.
- **Expected output**: reports, JSON/CSV, images, raw files, identifiers, or validation status.
- **Problems solved**: concrete work scenarios and the specific bottleneck removed.

Use real tool names where they help the reader execute the workflow. Keep examples short and realistic.

### 4. Explain core value separately

Add a core-value section after the short positioning paragraph. Cover four questions:

- Why was this capability worth building?
- What concrete difference does it make compared with the previous manual or fragmented workflow?
- What incremental value does it add for users?
- What capability-level bright spots can be demonstrated from current evidence?

If the value emphasis or strength of industry claims is unclear, use `ask-me` before writing. Ask about the main positioning first, then the claim level. Prefer evidence-backed wording such as “AI-native workflow”, “cross-tool orchestration”, “low-intrusion collection”, or “structured, verifiable artifacts”. Do not write “industry-leading”, “first”, or “unique” without an explicit comparison source.

When the user selects AI-native interaction as the main line, explain the chain: natural-language intent → tool selection and parameter orchestration → execution → evidence and interpretation. Do not reduce AI-native value to merely “answering questions”.

### 5. Add case evidence

Put each case next to the capability it proves. Use a clear label that states the capability and the case purpose, followed by the original URL. Do not fetch an unfamiliar case URL merely to write it into the document; treat it as user-provided evidence and preserve it verbatim.

### 6. Publish with the XD Feishu plugin

When the user asks to write to a Feishu document or Wiki, use the `xd-feishu` connector. Prefer its document tools over generic HTTP calls. Treat the supplied Wiki URL as the target identifier; resolve the Wiki node to its document before editing when the connector requires it.

Follow this sequence for an existing document:

1. Read the page with `wiki_read` or `docx_read`.
2. List child blocks with `docx_list_block_children` when an exact insertion point or block ID is needed.
3. Identify the target page, insertion position, and mutation type: append, insert, update, or delete.
4. State what will be written, whether existing content changes, and that this is an external Feishu write. Ask for explicit user confirmation before any mutation.
5. Write with `docx_insert_blocks` or `docx_append_blocks`; use `docx_update_block` or `docx_delete_blocks` only for the exact blocks in scope.
6. Write long sections in small batches and preserve the requested order.
7. Read the page back and verify the inserted headings, links, block types, and absence of duplicates.

Use native Feishu blocks whenever possible. The practical mapping is:

- paragraph: block type `2`
- H1-H9: block types `3`-`11`
- unordered list: `12`
- ordered list: `13`
- code block: `14`
- quote: `15`
- divider: `22`
- image: `27`

Use `docx_create_table` for a native table. Keep tables within the connector limit of 9 rows by 9 columns, and use a list or headings when the content is larger. Markdown tables are not supported reliably by the Feishu write path. If Markdown-to-block conversion is unavailable because of permissions, construct the equivalent native blocks manually and report the fallback accurately.

### 7. Feishu document formatting requirements

Keep the document easy to scan and consistent with native Feishu rendering:

- Use one title, followed by a one-sentence positioning statement.
- Put the core value near the beginning, then the capability overview.
- Use a stable H2 section for each capability and H3 subsections for **How to use**, **How Cindy combines it**, **Expected output**, and **Problems solved**.
- Use short paragraphs and bullets; keep one idea per block.
- Use code blocks only for executable commands, structured payloads, or concise interaction examples.
- Put each usage-case link beside the capability it demonstrates. Preserve user-provided URLs verbatim.
- Use native tables only for compact comparisons or fixed field mappings; do not paste Markdown table syntax into Feishu.
- Keep headings in descending hierarchy and avoid skipped levels or repeated document titles.
- Separate sections with a divider or spacing paragraph when the page is dense; do not merge unrelated content into one large block.
- Keep platform architecture, OKR planning, storage, dashboards, and governance out of a plugin-only introduction.

For a new Feishu document, create the title and body as ordered native blocks. For an existing document, insert only the requested section instead of replacing the whole page. Do not delete or rewrite unrelated blocks.

### 8. Validate the brief

Check all of the following before reporting completion:

- Current version matches the most recent authoritative source.
- Every capability has usage, Cindy combination, output, and scenario/problem content.
- Core value distinguishes why, difference, increment, and demonstrable bright spots.
- Industry claims are bounded by available evidence.
- Case links are in the relevant sections and remain unchanged.
- Unsupported inputs, packages, devices, or release modes are stated where material.
- No accidental platform architecture or unrelated planning content remains.
- Feishu write results have been read back successfully.
- The final Feishu page uses native headings, lists, code blocks, and tables where appropriate.
- No content was accidentally swallowed into a code block, duplicated, or inserted at the wrong hierarchy level.

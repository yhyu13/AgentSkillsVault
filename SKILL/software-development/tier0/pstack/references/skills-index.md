# Skill index

Generated from `references/upstream/skills/*/RULE.md`. Read the full leaf before applying a skill. The index is a router, not a substitute.

## Orchestration

| Skill | Description | Leaf |
|---|---|---|
| `architect` | Sketch types, signatures, and module structure before code, then stay in the loop while implementation fills in. Use for /architect, 'architect this', 'design this', or non-trivial work where jumping to code would lock in the wrong shape. | `references/upstream/skills/architect/RULE.md` |
| `arena` | Spawn N parallel candidates at the same task, pick a base, graft the strongest parts of the losers into it. Use for /arena, 'arena this', 'throw it in the arena', or when one attempt at a non-trivial artifact would lock in the wrong shape. | `references/upstream/skills/arena/RULE.md` |
| `bro` | Restate the last message in plain human language, with no jargon. | `references/upstream/skills/bro/RULE.md` |
| `correct` | Find the mistakes agents keep repeating in this repo and make each one impossible. Try architecture first, then types, then a lint whose error names the fix, then a test, and write docs last. Prove each check fails on a real past mistake. … | `references/upstream/skills/correct/RULE.md` |
| `figure-it-out` | Design an auditable playbook when no narrower one fits: a large migration, an ambitious multi-part change, or work a human reviews after stepping away. Scales rigor to the task, runs a hypothesis loop, and logs decisions. Use for /figure-i… | `references/upstream/skills/figure-it-out/RULE.md` |
| `how` | Use for \"how does X work\", code walkthroughs before changing something, and placement / ownership / layering questions (\"where should this live\", \"which package owns this\", \"is this the right layer\"). Explains subsystem architectur… | `references/upstream/skills/how/RULE.md` |
| `interrogate` | Use for \"interrogate\", \"adversarial review\", \"multi-model review\", \"challenge this\", \"stress test this code\", \"find blind spots\", or \"tear this apart\". Adversaries try to break a change or design, and only findings proven by … | `references/upstream/skills/interrogate/RULE.md` |
| `poteto-help` | Guides users through pstack setup, /poteto-mode, and picking the skill, playbook, or principle for a task. Type /poteto-help with a question. | `references/upstream/skills/poteto-help/RULE.md` |
| `poteto-mode` | poteto's agent style for concise, detailed responses, deliberate subagents, unslopped prose, simple code, and verified work. Use for poteto, /poteto-mode, or requests to work in this style. | `references/upstream/skills/poteto-mode/RULE.md` |
| `recall` | Reconstruct your recent working context from your own chat history, live state, and the shared record (user reports, prior fixes, incidents), then hand back a tight current-state brief. Use for 'recall my work on X', 'catch me up', 'what h… | `references/upstream/skills/recall/RULE.md` |
| `reflect` | Mine the active transcript for durable learnings and route each to a concrete edit on an existing skill. Use when the user says reflect. | `references/upstream/skills/reflect/RULE.md` |
| `setup-pstack` | Configure which models pstack uses per role and at what reasoning budget. Detects your available models and writes an always-applied rule that overrides the skill defaults. Use for /setup-pstack, "configure pstack models", "pstack budget",… | `references/upstream/skills/setup-pstack/RULE.md` |
| `show-me-your-work` | Keep a reviewable decision trail for long-running or unattended work: a TSV log with one row per decision (what, why, evidence, result). Local by default; commit it when a reviewer needs the trail to trust the result. Use for /show-me-your… | `references/upstream/skills/show-me-your-work/RULE.md` |
| `swarm` | Fan out N parallel workers, drain them, and return one report. Use for /swarm, 'swarm this', or parallel coverage, races, gauntlets, and exploration. | `references/upstream/skills/swarm/RULE.md` |
| `why` | Use for 'why does X work this way', 'why we picked Y', design rationale, regressions, postmortems, or data-backed thresholds. Returns a cited read on decisions and tradeoffs. Use how for runtime behavior. | `references/upstream/skills/why/RULE.md` |

## Tooling and domain

| Skill | Description | Leaf |
|---|---|---|
| `automate-me` | Use for \"automate me\", \"create/update/refresh my -mode skill\", \"turn/capture my preferences or working style into a skill\", or wanting agents to follow how the user works. Drafts or revises a personal -mode skill via create-skill + u… | `references/upstream/skills/automate-me/RULE.md` |
| `benchmark-checklist` | Vet a perf measurement (limiter, tuning, limits, errors, repeatability, relevance, and whether the work happened) before you report or act on it. Use when you run a benchmark or report a speedup or regression you measured. | `references/upstream/skills/benchmark-checklist/RULE.md` |
| `blast-radius` | Find what a change could break somewhere else before it ships, beyond the diff, and prove the one fact it's safe because of by running real code instead of writing it up. Use for 'blast radius of X', 'what could this break', or reviewing a… | `references/upstream/skills/blast-radius/RULE.md` |
| `ketchup` | Catch the user up on what changed in this chat since their last message, in plain words and small visuals. List every item waiting on them with what they need to decide it from the reply alone. Use for /ketchup. | `references/upstream/skills/ketchup/RULE.md` |
| `ketchup-video` | Catch the user up like /ketchup, with a short subtitled video of slides for what happened and the waiting calls as text under it. Use for /ketchup-video. | `references/upstream/skills/ketchup-video/RULE.md` |
| `make-bot-ui` | >- Use when building a custom UI (page, dashboard, buttons) that should wake a Grok Bot over a webhook, when the user must provide a webhook sender key, or when exposing that UI on Tailscale. | `references/upstream/skills/make-bot-ui/RULE.md` |
| `statechart` | Check a TLA+ model of a system that moves between states, such as a product flow, a protocol, or a service, and draw it as a Mermaid statechart. The report gives the shortest path to each state that breaks a rule. Use for /statechart, or t… | `references/upstream/skills/statechart/RULE.md` |
| `tdd` | Use only when the user explicitly asks for TDD, a failing test, or a regression test, OR when the bug has an obvious cheap local test target. Skip when the test path is unclear, expensive, integration-heavy, or not requested. | `references/upstream/skills/tdd/RULE.md` |
| `typescript-best-practices` | TypeScript best practices. Use when reading or editing any .ts or .tsx file. | `references/upstream/skills/typescript-best-practices/RULE.md` |

## Verification

| Skill | Description | Leaf |
|---|---|---|
| `create-formal-verification-skill` | Generate a project-local skill that formally verifies the code where a bug costs the most and tests reach the least, in any language, with whichever verification tool fits. Use for /create-formal-verification-skill, \"model-check this race… | `references/upstream/skills/create-formal-verification-skill/RULE.md` |
| `create-verification-skill` | Generate a project-local verification skill that drives your app the way a user does — any language, framework, or platform. Use for /create-verification-skill, \"make a control skill for this repo\", or when a project has no scripted way … | `references/upstream/skills/create-verification-skill/RULE.md` |
| `maintain-formal-verification-skill` | Bring a project's formal verification back in line with the code after the code changes: find the commits that touched verified code, update the model, harness, or properties to describe the code as it is now, rerun, and say whether each f… | `references/upstream/skills/maintain-formal-verification-skill/RULE.md` |
| `maintain-verification-skill` | Periodic pass that keeps a project's verification skill and feature map honest: parallel source readers per feature, one live session driving every feature, at most one PR of proven corrections. Use for /maintain-verification-skill or \"au… | `references/upstream/skills/maintain-verification-skill/RULE.md` |

## Writing and review

| Skill | Description | Leaf |
|---|---|---|
| `in-your-own-words` | Restate in your own words what you think the user's goals are and what problem they're trying to solve. Use for /in-your-own-words. | `references/upstream/skills/in-your-own-words/RULE.md` |
| `no-comments` | Spawn Comment Sicko, fix accepted findings, and offer encodings for claimed constraints. | `references/upstream/skills/no-comments/RULE.md` |
| `sharpen` | Make a task deeper, not bigger, then rewrite the prompt. Use for /sharpen. | `references/upstream/skills/sharpen/RULE.md` |
| `teach` | Explain a body of work plainly so a person actually understands it. Runs the `how` and `why` skills and weaves what they find into one clear explanation. Use for 'teach me this', 'help me really understand X', 'explain this change or subsy… | `references/upstream/skills/teach/RULE.md` |
| `technical-writing` | Layered technical-writing standard: Diátaxis structure, Google developer style sentences, STE instruction rules, Global English syntax. Use for /technical-writing or when writing or reviewing docs, RFCs, readmes, PR descriptions, or commit… | `references/upstream/skills/technical-writing/RULE.md` |
| `unslop` | Cut AI tells from any writing. | `references/upstream/skills/unslop/RULE.md` |

## Principle

| Skill | Description | Leaf |
|---|---|---|
| `principle-attack-the-premise` | Apply when two or more fixes that share one premise have failed the same gate. Write the premise down and test it directly before you write another fix that assumes it. | `references/upstream/skills/principle-attack-the-premise/RULE.md` |
| `principle-boundary-discipline` | Apply when wiring validation, error handling, or framework adapters. Concentrate guards at system boundaries (CLI, config, network, external APIs); trust internal types and keep business logic in pure functions. | `references/upstream/skills/principle-boundary-discipline/RULE.md` |
| `principle-build-the-lever` | Apply to any non-trivial work, not just bulk work: edits, migrations, analyses, checks. Build the tool that does it or proves it (codemod, script, generator, or a skill your subagents follow) instead of working by hand. The tool is the art… | `references/upstream/skills/principle-build-the-lever/RULE.md` |
| `principle-encode-lessons-in-structure` | Apply when you catch yourself writing the same instruction a second time, or notice a recurring correction. Encode the rule as a lint, metadata flag, runtime check, or script instead of more text. | `references/upstream/skills/principle-encode-lessons-in-structure/RULE.md` |
| `principle-exhaust-the-design-space` | Apply when facing a novel UI interaction or architectural decision with no precedent in the codebase. Build 2-3 competing prototypes and compare side by side before committing. | `references/upstream/skills/principle-exhaust-the-design-space/RULE.md` |
| `principle-experience-first` | Apply when product, UX, or feature-scope tradeoffs come up. Choose user delight over implementation convenience; ship fewer polished features over more rough ones. | `references/upstream/skills/principle-experience-first/RULE.md` |
| `principle-explain-the-number` | Apply before you measure, and before you trust, report, or act on a number you measured: a speedup, a regression, a throughput, a latency, or an eval result. Find what limits it, and rule out that it measured something other than the work … | `references/upstream/skills/principle-explain-the-number/RULE.md` |
| `principle-fix-root-causes` | Apply when debugging. Trace each symptom back to the first place the system went wrong and fix it there. A guard is a fix only when the state it handles is legitimate. | `references/upstream/skills/principle-fix-root-causes/RULE.md` |
| `principle-foundational-thinking` | Apply before writing logic: choosing core types and data structures, sequencing scaffold-vs-feature work, asking what concurrent actors share. Get the data structures right so downstream code becomes obvious. | `references/upstream/skills/principle-foundational-thinking/RULE.md` |
| `principle-guard-the-context-window` | Apply when context is filling up: large outputs, long files, repeated reads, fan-out planning. Route bulk to subagents; keep summaries in the main thread, not raw payloads. | `references/upstream/skills/principle-guard-the-context-window/RULE.md` |
| `principle-laziness-protocol` | Apply when refactoring, evaluating diff size, or tempted to add abstractions, layers, or signal threading. Bias toward deletion and the smallest change that solves the problem. | `references/upstream/skills/principle-laziness-protocol/RULE.md` |
| `principle-make-operations-idempotent` | Apply when designing commands, lifecycle steps, or processing loops that run amid crashes, restarts, and retries. Converge to the same end state regardless of partial prior runs. | `references/upstream/skills/principle-make-operations-idempotent/RULE.md` |
| `principle-migrate-callers-then-delete-legacy-apis` | Apply when introducing a new internal API while old callers still exist. Migrate callers and delete the old API in the same wave instead of preserving compatibility layers. | `references/upstream/skills/principle-migrate-callers-then-delete-legacy-apis/RULE.md` |
| `principle-minimize-reader-load` | Apply when reviewing or shaping code that's hard to trace. Count layers between question and answer, and hidden state in the reader's head; collapse one-caller wrappers and shrink mutable scope. | `references/upstream/skills/principle-minimize-reader-load/RULE.md` |
| `principle-model-the-domain` | Apply when writing stateful logic, or when code branches a lot or repeats a shape assumption across files. | `references/upstream/skills/principle-model-the-domain/RULE.md` |
| `principle-never-block-on-the-human` | Apply when tempted to ask 'should I do X?' on reversible work. | `references/upstream/skills/principle-never-block-on-the-human/RULE.md` |
| `principle-outcome-oriented-execution` | Apply during planned rewrites and migrations with explicit phase boundaries. Converge on the target architecture; don't preserve smooth intermediate states with throwaway compatibility code. | `references/upstream/skills/principle-outcome-oriented-execution/RULE.md` |
| `principle-prove-it-works` | Apply after completing a task, before declaring done. Verify against the real artifact (run the feature, read the actual value, inspect the diff), not a proxy, self-report, or 'it compiles.' | `references/upstream/skills/principle-prove-it-works/RULE.md` |
| `principle-redesign-from-first-principles` | Apply when integrating a new requirement into an existing design. | `references/upstream/skills/principle-redesign-from-first-principles/RULE.md` |
| `principle-separate-before-serializing-shared-state` | Apply when concurrent actors might write to the same file, branch, key, or state object. Eliminate the sharing first; serialize structurally only when one shared writer is a real invariant. | `references/upstream/skills/principle-separate-before-serializing-shared-state/RULE.md` |
| `principle-sequence-verifiable-units` | Apply to multi-step work (sweeps, migrations, runs of similar edits) and to how you stack commits and PRs. Break work into small units that each end in a verifiable state, check each before the next, and order delivery so the sequence prov… | `references/upstream/skills/principle-sequence-verifiable-units/RULE.md` |
| `principle-subtract-before-you-add` | Apply when sequencing an addition, refactor, or rewrite. Remove dead code, redundant validators, and stub references first, then build on the simpler base. | `references/upstream/skills/principle-subtract-before-you-add/RULE.md` |
| `principle-test-behavior-not-implementation` | Apply when you write, change, or keep a test. Assert what the code's users can observe, so that the test fails when that behavior breaks and keeps passing when only the internals change. | `references/upstream/skills/principle-test-behavior-not-implementation/RULE.md` |
| `principle-type-system-discipline` | Apply when designing types, reviewing a function signature, or writing code in any statically-typed language. Make illegal states unrepresentable, brand semantic primitives, parse external data at boundaries, exhaust variants, derive from … | `references/upstream/skills/principle-type-system-discipline/RULE.md` |

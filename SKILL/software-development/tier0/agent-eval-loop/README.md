# agent-eval-loop

Build a **Skill + Eval + Verification** triad for any agent workflow,
then ascend the trust curve from local observation to cloud automation.

> One-liner: Encode know-how into a Skill, write an Eval for it, build a
> Verification loop around that Eval, then ascend from local observation
> to cloud automation.

## What is this

This is a **methodology skill** distilled from a public talk by a
SpaceXAI engineer on the Cursor team (B 站 BV1ceYR65EmK, ~13 min).
The talk covers how the Cursor team builds skills for their coding
agent, evals those skills, and verifies the verification before
trusting cloud agents to ship PRs.

This package generalizes the method so **any team using any coding
agent** can apply it.

## Install

This skill is platform-agnostic. It uses the open `SKILL.md` standard
that both Anthropic's Claude Code and OpenAI's Codex recognize.

### Claude Code

```bash
# Personal (applies to all your projects)
cp -r agent-eval-loop ~/.claude/skills/agent-eval-loop

# Or project-scoped (only this repo)
cp -r agent-eval-loop .claude/skills/agent-eval-loop
```

Claude Code picks up skills automatically. Verify with:

```bash
ls ~/.claude/skills/agent-eval-loop/SKILL.md
```

### Codex CLI

```bash
# Personal
cp -r agent-eval-loop ~/.codex/skills/agent-eval-loop

# Or project-scoped
cp -r agent-eval-loop .codex/skills/agent-eval-loop
```

Codex reads the same `SKILL.md` standard. Verify with:

```bash
ls ~/.codex/skills/agent-eval-loop/SKILL.md
```

### Other platforms

Any platform that reads the open `SKILL.md` standard will pick this
up. The YAML frontmatter in `SKILL.md` uses only the standard keys
(`name`, `description`, `license`).

## Files

```
agent-eval-loop/
├── SKILL.md                    # Main entry point
├── README.md                   # This file
├── LICENSE                     # MIT
├── references/
│   ├── skill-design.md         # How to design a good skill
│   ├── eval-playbook.md        # Eval design rules + scoring rubric
│   ├── verification-patterns.md # Common verification patterns
│   └── trust-curve.md          # Local -> cloud -> auto-merge ladder
├── templates/
│   ├── SKILL.template.md       # Copy-paste skill skeleton
│   └── eval.template.json      # Copy-paste eval schema
├── scripts/
│   └── eval-runner.sh          # Bash runner skeleton
└── examples/
    └── 01-bug-repro-skill/     # End-to-end worked example
        ├── SKILL.md
        ├── eval.json
        ├── verify.sh
        └── README.md
```

## Quick start

1. **Read `SKILL.md`** -- 5 minutes, will tell you when to invoke.
2. **Read `references/eval-playbook.md`** -- 10 minutes, will tell
   you the 4 mandatory rules.
3. **Copy the example**: `cp -r examples/01-bug-repro-skill
   my-skill/` and edit.
4. **Run the meta-verification** (see `verify.sh`) before you trust
   your eval.

## When to invoke

The skill auto-loads. It is invoked when the user asks any of:

- "Write a skill for X" / "把这个流程做成 skill"
- "How do I verify my agent is doing the right thing?"
- "I want to run more agents in parallel" / "多开几个 agent"
- "My agent is hallucinating"
- "Set up a verification loop"
- "Build me a P-Stack / Cursor-style skill + eval"

See `SKILL.md` for the full trigger list.

## Provenance

Distilled from a B 站 public talk (BV1ceYR65EmK) by a SpaceXAI
engineer on the Cursor team. The talk covers:

- Skills as "executable SOPs" rather than documentation
- Evals as "unit tests for agents" with cross-model judging
- Verification as a meta-loop: verify the verification
- The trust curve from local observation to cloud auto-merge
- The engineer's new role: head chef, not line cook

This package extracts the methodology and generalizes it. The talk
itself used P-Stack as the example; this package is tool-agnostic.

## Contributing

This is a 0.1.0 release. To propose a change:

1. Open an issue describing the gap
2. Or fork + send a PR with a worked example

Changes that are most welcome:

- Additional worked examples in different domains (writing, design,
  data engineering)
- Verification patterns we missed
- Eval scoring rubrics for subjective skills
- Cross-platform install scripts (Aider, Gemini CLI, Continue, ...)

## License

MIT. See `LICENSE`.

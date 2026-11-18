# Case: SUBLEVEL 07 FPS

Recorded sample. Use it to understand the expected shape of evidence, not as a template for another demo's counts.

## Identity

- Entry: `https://github.com/wquguru/fable52-fps-repro`, commit `a7e1df3ce32eb2bb05e23ae457fe5fe2bffab961`, MIT, Copyright (c) 2026 wquguru.
- Source HTML: SHA-256 `155918cef3cfb1860c441725b35d90893822d1e20c75cd4c79f06f3251b8f0de`, Git blob `b3765ceb533ea54727293ac15ac9a3a7671bb506`, 130,777 bytes, Three.js r170.
- Local read-only copy under the project's `demos/raw/sublevel-07-fps-repro/`.

## Observed

- Runtime startup, request set, WebGL information, console, initial and stepped state, screenshots.
- Five domain dumps with 78 entities across PCG, materials, PBR, shaders and world.
- Same-run symbol binding: 12 material and 25 texture symbols; 37 creation anchors. Object existence is recorded separately from author identity.

## Not captured

- Author constructor or clone stacks for 24 parent objects. Their same-run existence is established; the creating call is not. Follow-up capture was stopped by the supervisor, so these stay `identity: not_captured`.
- GPU environment texture pixels, complete post-processing objects and compiled shader variants. GPU readback was not authorized.

## Reproduction status

The recorded reconstruction is a **mechanism slice**, not a finished FPS: procedural weapon and arms, rigid-body player, camera feel, approximate effects and a three-target range. It is not evidence of visual parity, real-device input, audio quality or sustained performance. See the project's own review for the defect list.

## Lessons that generalize

- Pin the file hash before quoting line numbers; a blob is not a commit.
- Keep "the object exists", "a same-run call created it" and "the author is known" as three separate statements.
- Runtime program counts do not enumerate custom shader units.
- A passing dump validator says nothing about how the game looks or feels.
- When a capture line is closed by the owner, the remaining gaps are reported, not re-captured.

## Verifying this case

The source, five dumps and runtime records stay in the original project; the package only pins their hashes in `assets/cases/case-evidence.json`. Run `python scripts/verify_case_evidence.py --project <project>` where that workspace exists. Without it, treat every number here as an author record, not as independently verified evidence.

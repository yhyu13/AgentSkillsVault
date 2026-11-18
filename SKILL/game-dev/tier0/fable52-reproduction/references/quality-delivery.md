# Quality delivery for reproductions

Use when the user asks for a faithful, finished or high-quality reproduction. A mechanism slice, a dump or a passing schema does not satisfy that request. This page adds quality obligations; it does not grant new capture, readback, spending or network permission.

## Before implementation

Write a contract per requested dimension, kept beside the artifact:

```text
requirement | expected observable result | check | evidence | state | limitations
```

Cover the dimensions the request implies — scene and composition, materials and light, primary models, shadows, volumetrics and post effects, motion and control, audio, game feedback, performance and reliability — plus every explicit user requirement. Do not move a hard requirement out of the contract because it is hard to check, and do not replace it with an easier check.

State the comparison conditions. Reference and reproduction usually differ in camera, lighting and timing; "not pixel-comparable" is a finding, not a failure of the record.

## Order of work

1. **Form and playable path.** Space, silhouettes, readable targets, complete interaction. Polygon count and texture size are not art quality.
2. **Material and light.** Channel meaning, color space, surface response, light-to-shadow relation, composition. Reused source materials do not look identical under a different scene, light rig or tone map.
3. **Each requested visual layer.** Toggle and adjust it under fixed representative conditions, then inspect the combination. Check contact and penumbra, beam occlusion, black-level loss from fog, bloom clipping, and whether screen-space dirt is plausible. An approximation keeps its approximation label regardless of naming.
4. **Sound and feel.** Play and listen to the mix: weapon, footsteps, impacts, feedback, relative loudness and transitions. A trigger firing is not a listening test. Operate mouse, keyboard and touch under the real conditions when available; synthetic events and a resized viewport are not device tests.
5. **Interaction and boundaries.** Through the normal path: hit, miss, occlusion, edge cases, knockdown/reset, settings. Combine visible results with state; automated checks must be able to fail for the claimed defect.
6. **Performance.** Measure a representative scene on a named device and report method and numbers. Untested stays `unverified`. Lowering expensive layers is allowed; "it starts" is not smoothness.

## Iteration and stopping

Compare result against reference and contract, record specific gaps with evidence, re-check the weakest required dimension and one real user path. Fix within scope and re-test. Respect a user budget or iteration limit; if none was given, do at most two fix-and-recheck cycles before reporting the remaining gaps and asking whether to continue. The limit bounds automatic work; it never converts an unresolved requirement into a pass.

Only a scope where every required dimension has evidence-backed pass may be called complete. Failed or unexecuted checks are reported with impact and next step. A prototype stopping point requires the user to have requested or accepted that scope.

## What does not count

- A slider, a label, a shader name or a changed constant.
- A green unit test, a schema pass, a successful launch, a non-empty screenshot.
- One rendered frame presented as sustained performance.
- Synthetic pointer events presented as real input.
- A design that was never looked at by anyone.

Record who observed, on what device, with what build and method, and what was actually seen or heard. If observation is impossible, say why and keep the state `unverified`.

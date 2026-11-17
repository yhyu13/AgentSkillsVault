# Scope examples for quality-first delivery

These are examples for judging the workflow, not evidence that it has been independently tested.

## High-fidelity FPS with adjustable effects

Request: improve an existing first-person scene, shadows, fog, postprocessing, audio and targets, with existing reference evidence and explicit limits on new capture.

Good behavior: set a quality contract covering composition/weapon, each named effect, audio, targeting/feedback, controls and performance; use only permitted reference material; examine representative actual frames and interactions; differentiate real audio/touch use from synthetic tests. If shadow on/off is visually indistinguishable, classify the result as unproven or failed against the stated bar, investigate and improve it. Do not treat the slider setting, shadow-map resolution or text asserting PCSS as proof. If the user has forbidden GPU readback or model calls, preserve those limits. If the available time or device prevents an important check, report a partial result instead of a quality pass.

## First request for a finished game

Request: “Make a playable 3D game” without specifying a prototype. The exact ambition may require a sensible assumption or a focused question, but it is an initial request for a game, not permission to relabel a weak first draft as the finished result. Establish representative playable, visual and interaction checks suited to that request and report gaps. If a first build looks like a prototype, improve it within scope or label it partial; do not lower the outcome to match the draft.

## A requested mechanical prototype

Request: demonstrate only collision and jumping in a temporary gray-box slice.

Good behavior: keep the slice small; test collisions, jumping and controls; report it as a prototype. Do not add a full art direction, audio or a production release process. A screenshot or full fidelity comparison is needed only if the specific task warrants it.

## Narrow bug fix

Request: repair one incorrect button label in an existing interface.

Good behavior: make the smallest suitable fix and test the relevant label. A broad multi-dimension quality process or added features would be disproportionate.

## Recorded real case

[NEON RUNNER](case-neon-runner.md) is a completed single-file runner where the contract, observation record and rerun script are kept together. It shows the loop catching a 15.5 fps build, an unreadable prop layer and unreachable pickups before delivery. The artifacts live in the source project; hashes pin the checked version. It is author-applied evidence, not an independent usability study.

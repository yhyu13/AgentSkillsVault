# Visual and interactive quality branch

Use for a visual reference, 3D scene, game, audio-visual demo or interactive UI. Apply relevant items only; respect the requested fidelity and authorized tools/assets.

## Establish a useful comparison

- Describe what matters to the requested experience: composition and spatial structure, focal object/silhouette, materials and lighting, motion/feel, sound, interactions, platform and performance. Include a feature-by-feature effect assessment when effects were requested.
- Use an authorized reference, original inputs or existing captures. Specify whether the scene, camera, viewport, time and lighting are actually comparable. If a reference cannot be accessed or new capture is prohibited, use allowed evidence and clearly mark missing comparisons. Do not invent reference behavior.
- Inspect the artifact at its normal viewing size, close-ups where material or model quality matters, and representative motion/interaction. When permissible, capture the new artifact for before/after comparison. If screenshots cannot be saved, describe how it was inspected and do not claim saved evidence.

## Raise quality in dependency order

1. Composition, shape, scale, clarity and interaction layout; a recognizable, usable base must precede visual polish.
2. Material response and lighting relationship, including color versus data texture semantics where applicable, coherent light and shadows, and environment/reflection behavior. A reused texture or high map resolution does not prove material or model quality.
3. Motion and audio timing; controls must provide the actions needed for the target platform. For synthesized or supplied sound, verify actual audible playback and balance where access allows; parameter differences are not a listening test.
4. Effects: vary each effect between off/default/high in a meaningful scene, inspect interactions with other effects, occlusion, clipping, washed-out contrast, and cost. Assess the visible result, not a shader name or uniform alone. An approximation should be named as such.
5. Gameplay or interaction: test normal use and boundaries (e.g., missed/blocked hits, edge of target, reset/respawn, input focus and repeated actions) through the same path a user takes. Use automated state checks as support, not a substitute for experience.

## Limit claims

- A synthetic event is not a physical mouse or touch test; a narrow viewport is not a real device.
- A render that appears once is not a measurement of sustained frame rate, latency, memory or thermal stability.
- A screenshot alone cannot prove feel, sound, occlusion over time, or full playability.
- Expensive effects must have a usable way to reduce cost when the task requires multiple devices; measure the actual target configuration before reporting performance.
- If the user asked for adjustable effects, check that each control changes the intended layer, can be disabled where appropriate, and remains understandable. Note whether settings persist only if checked.

# Reconstruction

Build a runnable slice from validated dumps — not from a screenshot and not from another demo's code. Scope is agreed before implementation.

## Inputs

- The dumps for the mechanisms in scope, with resolved references.
- The license and the permitted distribution form.
- The agreed scope: which mechanisms must work, what may be simplified, what may not be claimed.
- A project root, a local static server and a browser session.

## Outputs

- `reproduction/implementations/<implementation_id>/index.html` — the new implementation.
- `manifest.json` — entry point, source commit, mechanisms with `source_refs`, deviations, validation report path.
- `README.md` and `LICENSE`/attribution note, written before the implementation is complete.
- Runtime audit JSON, console log, before/after screenshots and their hashes.

## Procedure

1. **Agree the scope.** For each mechanism: source entity, observable behavior, test and allowed deviation. If the user asked for a finished experience, switch to [quality delivery](quality-delivery.md); a mechanism slice is not a substitute.
2. **Write the contract first.** `implementation_id`, entry, `source_commit`, mechanisms, deviations, validation report. All `source_refs` must resolve.
3. **Generation layer.** Fixed seed, noise and procedural textures before materials. Expose seed, resolution, channels and color space to the audit.
4. **Surface and light.** Apply the observed material rules and lighting model. Record which are approximated.
5. **World and runtime.** Small region, batching, collision, debug handles, deterministic step. Expose real objects, not comments that claim them.
6. **Run it.** Serve locally, open the page, save resources, WebGL info, console and the audit output. A blocking script or shader error fails the step.
7. **Look at it.** Screenshot and reopen the image. Check occlusion, black frames, loading overlays. Mechanism slices must make the mechanism identifiable; quality work follows the quality contract.
8. **Test behavior.** Raycast, fixed-step sequence, state re-read, before/after images. Assertions must be able to fail for the defect they claim to catch.
9. **Report deviations.** Missing gameplay, different parameters, untested performance. Never label the slice as equivalent to the original.
10. **Clean up and re-verify.** Close the tab and server; re-run the report check and confirm hashes.

## Evidence rules

- "The mechanism is implemented" needs code plus a runtime audit. A README statement is not evidence.
- A successful `audit()` does not prove visual quality; a screenshot does not prove interaction.
- Traversals must handle scenes without materials, groups, lights and material arrays. Rendering successfully does not mean the audit code runs.
- Manual stepping and one screenshot do not establish sustained performance or full gameplay.
- Keep the original license notice; a derived slice is not the author's file.

## Acceptance

- [ ] Manifest mechanism refs resolve and deviations are complete.
- [ ] Seed, channels, color space, pass order and collision values come from the audit.
- [ ] Behavioral assertions pass and are capable of failing.
- [ ] Screenshots were reopened and described.
- [ ] Console and request anomalies are recorded with their scope.
- [ ] The report does not present the slice as a full or visually equivalent reproduction.

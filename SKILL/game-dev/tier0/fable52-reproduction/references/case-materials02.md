# Case: materials-02

Recorded sample for the materials-heavy path. It is a scene, not a game loop, and it is not a second proof of gameplay reconstruction.

## Identity

- Entry: `https://github.com/wquguru/fable52-fps-repro`, same commit `a7e1df3ce32eb2bb05e23ae457fe5fe2bffab961`, MIT.
- Source HTML: 55,388 bytes, Three.js r187. Local read-only copy under `demos/raw/materials-02/`.

## Observed

- Runtime startup and a supplement capture of five material families; exported scene graph with 269 nodes, 71 materials, 71 textures and 70 CPU-side array hashes.
- Five domain dumps (56 entities). The material paths include procedural noise recipes, a rust shader patch and a planar-reflection setup.
- The demo has no `__mini` or fixed-step API; only its real `__ready`, `__gpu` and `__cam` hooks.

## Not captured

- One GPU environment texture per run. No GPU readback.
- Author construction identity for the material and texture symbols beyond same-run existence.

## Reproduction status

The materials page reuses the fixed source's material generators and part of its geometry under the MIT notice. Lighting and scene composition are simplified; it is not a pixel match and does not reproduce the demo's full scene.

## Lessons that generalize

- A second sample can share a repository with the first; it is still a separate `demo_id` with its own entry file and hash.
- Channel layouts differ between demos. The first sample's ORM rule must not be applied to the second; read the writes.
- A scene with no game loop cannot validate a gameplay reconstruction. Cross-sample reuse must be recorded per domain.
- Reusing generators is legitimate only with the license and notice; it does not imply the output looks the same under another light rig.

## Verifying this case

The source, five dumps and runtime records stay in the original project; the package only pins their hashes in `assets/cases/case-evidence.json`. Run `python scripts/verify_case_evidence.py --project <project>` where that workspace exists. Without it, treat every number here as an author record, not as independently verified evidence.

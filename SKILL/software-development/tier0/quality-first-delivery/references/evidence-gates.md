# Evidence and release gate

Use when deciding whether a complex artifact is ready to present as finished.

## Quality contract

Create and retain a concise, task-specific table: **requested requirement/dimension | source (user/inferred) | intended result | check | evidence | artifact | state**. Map every user-requested feature and quality requirement before adding inferred needs (function, appearance, interaction, sound, reliability, accessibility, performance, provenance, or others). Distinguish requirements from aspirational polish; no user requirement may disappear because it is difficult to test. Keep the record in the deliverable workspace where permitted; otherwise include it in the final response. Use objective thresholds only if supplied, measured or justified for the actual context; subjective qualities require representative observation and, when necessary, the user's judgment.

Use these states:
- **pass**: the actual requested condition was checked and met, with evidence.
- **fail**: a relevant check exposed a defect; identify it and its impact.
- **unverified**: the check was not performed or its evidence is inadequate; say why.
- **not applicable**: only an inferred dimension outside the user's request, with the reason stated; never a user requirement.

A partial pass cannot promote a different dimension. When a required check fails or cannot be run, retain that result; an easier passing check cannot replace it. If the user explicitly changes the requirement, record the change and its reason, not a retroactive pass. A static check, passing schema, visible slider, image resolution, parameter change or function-call count proves only what was actually asserted. A viewport simulation is not a real-device test. If an approximation does not meet an explicit requirement, flag the gap, do not relabel it as equivalent.

## Verification design

- Cover the actual user path and representative boundary cases. Ensure important regression tests can fail for the specific defect they claim to catch; use controlled defect injection when safe and useful. Test the verifier as well as the artifact.
- For comparative visuals, keep camera/time/device settings reproducible and disclose mismatches. Separately inspect each layer and integration. Never use GPU readback, original-source capture or any other action beyond the given authorization.
- For measured improvements, give baseline, current result, method, environment and limitations. No claim of percentage improvement without comparable numbers.
- Record what was actually observed, simulated, or not checked. Preserve original evidence and distinguish this artifact from model-generated experimental outcomes.

## Before calling it finished

Review every requested dimension, particularly the weakest one, and one representative user path. If a required condition is failed or unverified, either resolve it within scope and recheck, or give a partial result with concrete evidence, impact and next step. If the user explicitly requested a prototype or review, deliver that scope rather than silently expanding it; do not infer this scope merely because the first result looks like a prototype. Only label the artifact ready against a named, supported quality bar; where subjective acceptance is pending, say so.

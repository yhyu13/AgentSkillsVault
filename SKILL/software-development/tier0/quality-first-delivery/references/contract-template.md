# Quality contract and observation record

Before implementation, copy the template into the authorized deliverable workspace (or retain it in your task notes if writing is not permitted). Add a row for **every** user requirement and relevant inferred dimension; do not turn a required row into an optional one after a failure. Record the stated quality bar, authorized scope, observer, environment, reference and limits; no reference or ability to observe is itself a limitation.

```json
{
  "task": "Outcome and requested scope",
  "bar": "The requested quality bar, or an explicit unresolved subjective criterion",
  "observer_and_environment": "Who observed, device/browser or execution environment, and method; otherwise unverified",
  "reference_and_limits": "Reference, reproducible comparison conditions and authorization limits, or none",
  "requirements": [
    {
      "requirement": "A single user requirement or justified quality dimension",
      "source": "user",
      "expected": "Observable result and a justified threshold where applicable",
      "check": "Specific user path, boundary or inspection method",
      "evidence": "Actual observation of at least 12 characters; empty string when not yet observed",
      "artifact": "Optional path to a screenshot, log or recording, relative to this record",
      "status": "unverified",
      "limitations": "Why evidence is incomplete, or none"
    }
  ],
  "end_to_end_path": "Specific representative user path and its outcome, or unverified",
  "weakest_dimension": "Lowest-quality required dimension and why, or unverified",
  "next_action": "Next fix and recheck, user decision, or none"
}
```

States: `pass`, `fail`, `unverified`, `not_applicable`. `not_applicable` is allowed only for an inferred dimension outside the requested scope and must state why in `limitations`; a row whose `source` is `user` cannot be marked not_applicable. Every record needs at least one user-sourced row and at least one pass. For `pass`, name what was actually observed; evidence needs at least 12 characters and, when `artifact` is set, the file must exist. Keep failed earlier checks and post-fix checks in the evidence record; do not overwrite history.

Use `python scripts/check_contract.py PATH` to detect missing fields, evasive not_applicable rows, missing artifacts and a record that still contains failed/unverified requirements. `python scripts/check_contract.py --self-test` tests the checker against passing and deliberately incomplete records. The checker does **not** establish that claims or evidence are true, that a description matches the artifact, that all requirements were listed, or that the result is good. A reviewer must independently spot-check at least one artifact and one observation per delivery. For an explicitly approved review or prototype, write its actual scope and do not add unrelated production requirements.

## Four fictional examples (format examples, not empirical evidence)

| Requirement | Source | Expected | Check | Evidence | Artifact | State | Limitations |
|---|---|---|---|---|---|---|---|
| Finished FPS shadows | user | Visible, contact-grounded shadows at agreed views | Compare same camera and time with shadows enabled/disabled | No comparable render captured | | unverified | Visual evaluation not performed |
| Requested graybox prototype: jump | user | Player rises and lands on test floor | Execute jump and landing on named build | Test record describes one jump and landing | | pass | Art and audio are outside the requested scope |
| Single-button fix: submit once | user | One click makes one submission | Execute one click with a stub backend | Test record shows one call | | pass | Does not establish accessibility or production network behavior |
| Inferred polish: menu easing | inferred | No jank at 60 Hz | Measure frame times while opening | Frame-time log inspected | | pass | Not requested; desktop only |

## Minimum evidence by dimension

- Visual: identify observer, build, comparable camera/viewport/time/reference and visible observation; if unavailable use `unverified`. A screenshot existing is not a quality verdict. Do not capture protected references without authorization.
- Audio: identify who played and listened, device/output and what was heard; synthetic events or file existence do not replace listening.
- Performance: identify device, build, scenario, measurement method, duration and numeric result; do not infer sustained frame rate from one frame.
- Interaction/reliability: give inputs, expected/observed results and environment; distinguish synthetic input from real-device input. Accessibility: describe the actual assistive technology or keyboard inspection, not an asserted compliance grade.

When subjectivity requires user approval, report the observed result and pending acceptance separately. If observation is impossible, say why, retain `unverified`, and give the smallest authorized next step.

## Summary

<!-- What changed and why. -->

## Task grade

- Proposed grade: green / yellow / red
- Reason:
- Red triggers checked:
- Yellow triggers checked:

## Platform verification

<!-- Required for green. head_sha must match the current PR head. -->

```platform-verification
{
  "head_sha": "<current-pr-head-sha>",
  "affected_platforms": [],
  "automated_tests": [
    {
      "command": "<command>",
      "result": "pass",
      "evidence": "<ci-run-or-log-url>"
    }
  ],
  "platform_checks": [
    {
      "platform": "<platform>",
      "version": "<version>",
      "device_or_browser": "<device-or-browser>",
      "method": "real-device | simulator | emulator | browser | ci-runner | not-applicable",
      "result": "pass",
      "evidence": "<screenshot-video-or-log-url>",
      "reason": "<required when method is not-applicable>"
    }
  ]
}
```

## Authorization

- Green: no human approval required if all checks pass.
- Yellow: link the human approving review.
- Red: link the admin approving review.

## Evidence

- Automated commands and exit codes:
- Same-version/same-platform verification:
- Screenshots/logs/artifacts:

## Risk / rollback

- Risk:
- Rollback:

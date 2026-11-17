---
name: bug-repro
description: |
  Given a bug report (text, screenshot, or stack trace), reproduce the
  bug in a local checkout, capture the minimal repro steps, and write
  a failing test that demonstrates the bug. Use when the user pastes
  a customer bug, a Sentry alert, a Linear ticket, or says
  "reproduce this", "I can't repro", or "make a test for this bug".
  Does NOT fix the bug -- reproduction only.
license: MIT
---

# bug-repro

> One-line summary: Reproduce a bug in a local checkout, capture the
> minimal steps, write a failing test.

## When to use

Invoke when ALL of these are true:

- The user has a bug report (text, screenshot, stack trace, or ticket)
- The bug is in a codebase you can clone or already have cloned
- The user wants a test case, not a fix (yet)

Do NOT invoke for: feature requests, performance issues without a
repro path, or "this feels slow" reports.

## Inputs

- The bug report (paste, link, or file path)
- A working checkout of the affected codebase
- Test framework the project uses (pytest, jest, go test, etc.)

If the codebase is not checked out, ask. Do not clone without asking.

## Steps

1. **Read the bug report end-to-end.** Note every concrete claim
   (file path, error message, expected vs actual).
2. **Search the codebase** for the entities named in the report
   (function names, error strings, file paths). Do not assume -- grep.
3. **Form a hypothesis** of the minimum steps to trigger the bug.
   Write it down before running anything.
4. **Set up a clean test environment** -- use the project's existing
   test framework, do not invent a new one.
5. **Write a failing test** that follows the hypothesis. The test
   must fail for the right reason (the bug) and pass if the bug is
   fixed.
6. **Run the test** and capture the actual failure output.
7. **Output a report** with: hypothesis, repro steps, the test code,
   the failure output, and your confidence (low/med/high) that this
   is the real root cause.

## Don'ts

- Do NOT fix the bug. Reproduction only. Fixing comes after the user
  sees the failing test and confirms it is the right one.
- Do NOT invent a bug if the report is too vague. Say "I cannot
  reproduce from this report" and ask for the missing details.
- Do NOT skip step 2 (search the codebase). Agents that "know" the
  codebase from training data hallucinate outdated APIs.
- Do NOT use mock data or stubs. The repro must use real code paths.

## Example

**Input**: "On commit abc123, the `parse_config` function returns
`None` when the file has a trailing newline, but `parse_config` is
expected to return an empty dict."

**Output**:
```python
def test_parse_config_trailing_newline_returns_empty_dict():
    # hypothesis: parser fails on empty line after valid JSON
    config_text = '{"key": "value"}\n'
    result = parse_config(config_text)
    assert result == {}, f"expected empty dict, got {result!r}"
```

Failure output:
```
AssertionError: expected empty dict, got None
```

Confidence: high -- the assertion matches the reported behavior.

## Self-check

Before claiming done, answer YES to all:

- [ ] Did I grep the codebase for the named entities before assuming?
- [ ] Is my hypothesis written down before I wrote the test?
- [ ] Does the test fail for the reported reason, not a setup error?
- [ ] Is the failure output included in the report?
- [ ] Did I avoid fixing the bug?

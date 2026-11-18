# Deduplication example

This is a placeholder-only example to demonstrate structure. The brackets are variables from a source document, not real event facts.

## Before

[Event] will take place on [date]. The event will be held at [venue]. This [event] at [venue] is happening on [date].

## Edit

[Event] will take place on [date] at [venue].

## Check

- The event, date, and venue were already present in the source.
- The edit removes repeated information and adds no claim.
- If any bracketed fact is absent from the real source, keep it marked as missing rather than filling it in.
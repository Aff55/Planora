---
title: "TEMPLATE — Session"
tags: [template]
source: "self"
date: 2026-08-14
status: active
---

# TEMPLATE — Session

Copy into `sources/sessions/YYYY-MM-DD-<slug>.md`. This is the **source** page
other pages cite, so it records what happened; the durable lessons get their own
bug/decision pages and link back here.

```markdown
---
title: <what the session was about>
tags: [session, area]
source: "self"
date: YYYY-MM-DD
status: active
---

# Session — YYYY-MM-DD

One paragraph: what was attempted and how it ended.

## What happened

A table of failures and their causes works well when the session was a debugging
chain. Keep the real error text.

## Outcome

What is now true that was not before. State it plainly - "the app runs on the
device" - and separately state what remains broken.

## What was NOT done

The honest list. Use `NOT MEASURED` for things not measured and `NOT DONE` for
things not attempted. This section is the reason the vault can be trusted, so
never leave it empty just because it looks better that way.

## Related
- [[decisions/...]]
- [[bugs/...]]
```

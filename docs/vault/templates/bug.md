---
title: "TEMPLATE — Bug"
tags: [template]
source: "self"
date: 2026-08-14
status: active
---

# TEMPLATE — Bug

Copy into `bugs/<slug>.md`. A bug page earns its place only if the **root cause**
is worth remembering. A one-line typo fix does not need a page.

```markdown
---
title: <what broke, stated as the observable failure>
tags: [area, bug]
source: "sources/sessions/YYYY-MM-DD-<slug>.md"
date: YYYY-MM-DD
status: active
related_code: "path/to/file.ts"
---

# <title>

## Symptom

What was actually observed. Paste the real error text, not a paraphrase.
Note the conditions - if it only appears under load or on one device, say so,
because that is usually the most useful fact on the page.

## Root cause

Why it happened, one level deeper than the error message. If the error pointed
somewhere misleading, say where it pointed and why that was wrong - that is the
part that saves the next person an hour.

## What was ruled out

Only if wrong theories were expensive. Recording a dead end stops it being
re-explored later.

## Fix

The change, with enough code to be actionable.

## Regression note

What would reintroduce this? Name the specific edit that would bring it back,
so someone "tidying up" gets warned.

## Sources
- [[sources/sessions/YYYY-MM-DD-<slug>.md]]
```

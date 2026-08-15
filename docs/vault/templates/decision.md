---
title: "TEMPLATE — Decision"
tags: [template]
source: "self"
date: 2026-08-14
status: active
---

# TEMPLATE — Decision

Copy into `decisions/YYYY-MM-DD-<slug>.md`. Write one of these when a choice
will later be questioned — by an examiner, a teammate, or yourself in three
months. The value is in **why**, and in what you gave up.

```markdown
---
title: <the decision, as a statement not a question>
tags: [area, decision]
source: "sources/sessions/YYYY-MM-DD-<slug>.md"
date: YYYY-MM-DD
status: active
related_code: "path/to/file.ts"
---

# <title>

## Context

The situation that forced a choice. Include the constraint that actually did the
forcing - cost, hardware, a platform limit - because that is what makes the
decision defensible rather than arbitrary.

## Decision

What was chosen, stated plainly.

## Consequences

What this makes easy, and what it makes hard. Be specific about the cost; a
decision page with no downside listed is a sales pitch, not a record.

## Alternatives rejected

What else was considered and the reason it lost. If an option was never
seriously evaluated, say that rather than implying it was weighed.

## Revisit when

The condition that would make this decision wrong. A decision without a trigger
for revisiting quietly becomes permanent by accident.

## Sources
- [[sources/sessions/YYYY-MM-DD-<slug>.md]]
```

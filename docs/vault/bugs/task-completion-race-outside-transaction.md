---
title: Task completion checked status outside the transaction, so bursts double-counted
tags: [api, prisma, concurrency, bug]
source: "sources/sessions/2026-08-14-mobile-expo-go.md"
date: 2026-08-14
status: active
related_code: "apps/api/src/routes/tasks.ts"
---

# Task completion checked status outside the transaction, so bursts double-counted

## Symptom

Invisible under normal use. Ten sequential completions passed cleanly. It only
appeared under **concurrent** requests completing the same task, where side
effects (streak increments, counters) could apply more than once for a single
real transition.

## Root cause

The handler read the task's status, decided whether this request represented a
transition, and *then* opened a transaction to write. Two requests arriving
together both read `status != COMPLETED`, both concluded "this is a transition",
and both ran the side effects. The transaction protected the write but not the
decision — the check sat outside it.

This is the classic check-then-act race. Serializable isolation does not save
you when the check happens before the transaction begins.

## Fix

Make the write itself the check — compare-and-swap via `updateMany`, whose
`count` reveals whether *this* request was the one that moved the row:

```ts
const claim = completed
  ? await tx.task.updateMany({
      where: { id: existing.id, userId, status: { not: "COMPLETED" } },
      data:  { status: "COMPLETED", progress: 100, completedAt: new Date() }
    })
  : await tx.task.updateMany({
      where: { id: existing.id, userId, status: "COMPLETED" },
      data:  { status: "TODO", progress: existing.progress, completedAt: null }
    });

const claimedTransition = claim.count === 1;
```

Exactly one concurrent request gets `count === 1`. Side effects hang off
`claimedTransition`, so they run once per real transition. The `userId` in the
`where` keeps ownership enforcement in the same atomic step.

## How it was found

**Adversarial burst testing** — firing concurrent requests at the same resource.
Sequential tests cannot surface this class of bug by construction, no matter how
many of them pass. Two further concurrency defects were found the same way in
the same session.

## Related hardening

`resourceLimits.ts` gained jittered exponential backoff and now treats **P2028**
(transaction timeout) as retryable alongside P2034 (write conflict); five
attempts. Exhausted retries surface as `503` with `Retry-After: 1` rather than a
500 — see `apps/api/src/lib/http.ts`.

## Sources
- [[sources/sessions/2026-08-14-mobile-expo-go.md]]

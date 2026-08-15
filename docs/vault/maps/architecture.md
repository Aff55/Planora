---
title: Architecture — map of content
tags: [moc, architecture]
source: "self"
date: 2026-08-14
status: active
---

# Architecture — map of content

## Shape

An npm-workspaces monorepo with four packages:

| Package | Stack |
|---|---|
| `apps/api` | Express 5, Prisma 6, PostgreSQL 16, Redis 7 |
| `apps/web` | Next.js 15, React 19 |
| `apps/mobile` | Expo SDK 54, React Native 0.81.5, React 19.1.0 |
| `packages/shared` | Zod contracts shared by all three |

The two clients pin **different React versions**, which is not cosmetic — it
caused a total mobile failure once already
([[bugs/duplicate-react-in-npm-workspace.md]]).

## Pages

- [[entities/api-surface.md]] — 11 routers, 57 endpoints, what mounts where
- [[entities/data-model.md]] — the 18 Prisma models and how they group
- [[concepts/consent-gating.md]] — the policy every AI path consults
- [[concepts/adaptive-ranker.md]] — pattern detection and ranking

## Cross-cutting patterns

**Serializable transactions with retry.** Write paths that must not interleave
use serializable isolation and retry on conflict. Retries are jittered and treat
both `P2034` (write conflict) and `P2028` (transaction timeout) as retryable,
over five attempts. Exhausting them surfaces as `503` with `Retry-After: 1`
rather than a `500` — a busy server is not a broken one.

**Compare-and-swap for state transitions.** Reading a row, deciding a transition
happened, then writing is a race no isolation level fixes, because the decision
happens before the transaction. The pattern instead makes the write *be* the
check — see [[bugs/task-completion-race-outside-transaction.md]].

## Related
- [[maps/privacy.md]]
- [[maps/mobile.md]]
- [[maps/ml.md]]

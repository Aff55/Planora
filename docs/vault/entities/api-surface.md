---
title: API surface — 11 routers, 57 endpoints
tags: [api, express, entity]
source: "self"
date: 2026-08-14
status: active
related_code: "apps/api/src/app.ts:98-108"
---

# API surface — 11 routers, 57 endpoints

## Mounts

All mounted under `/api` in `apps/api/src/app.ts:98-108`:

```
/api/auth  /api/tasks  /api/dashboard  /api/wellbeing  /api/activities
/api/calendar  /api/recommendations  /api/ranker  /api/profile
/api/companion  /api/search
```

## Endpoint count per router

Counted from route definitions in `apps/api/src/routes/` — `[MEASURED]`:

| Router | Endpoints |
|---|---|
| wellbeing | 14 |
| auth | 11 |
| tasks | 10 |
| activities | 4 |
| calendar | 4 |
| companion | 4 |
| profile | 3 |
| ranker | 3 |
| recommendations | 2 |
| dashboard | 1 |
| search | 1 |
| **total** | **57** |

The distribution is informative: `wellbeing` and `auth` carry a quarter of the
surface each for very different reasons — wellbeing has many small log types
(mood, sleep, water, journal), auth has the session and credential lifecycle.

## Conventions

- Routers are named `<name>Router` and defined with the path on its **own
  line**, so a naive `grep "router.get("` finds nothing. Match
  `Router\.(get|post|...)` instead.
- Auth is applied per-router with `rankerRouter.use(requireAuth)` rather than
  per-endpoint, so a new endpoint in an authed router is protected by default —
  the safe direction for a mistake to fall.
- Handlers are wrapped in `asyncHandler` so rejected promises reach the error
  middleware instead of hanging the request.

## Naming history

`/api/ranker/*` was previously `/api/neural/*`. The rename was deliberate: the
component is a ranker, not a neural network, and the old name overclaimed. The
`ModelEvent` **database model kept its name** — renaming it would have cost a
schema migration for no behavioural gain, and the migration history is cited as
evidence elsewhere.

## Sources
- `[FROM CODE]` `apps/api/src/app.ts:98-108`
- `[MEASURED]` endpoint counts via `grep -cE "Router\.(get|post|put|patch|delete)\("` per file

## Related
- [[concepts/adaptive-ranker.md]]
- [[entities/data-model.md]]

---
title: Adaptive ranker — what it is, and what it is not
tags: [ranker, patterns, concept]
source: "self"
date: 2026-08-14
status: active
related_code: "apps/api/src/routes/ranker.ts:10-34"
---

# Adaptive ranker — what it is, and what it is not

## What it is not

It is **not a neural network**. It was called the "neural engine" and that name
was removed precisely because it overclaimed. Being accurate about this matters
more than sounding impressive — an examiner who reads the code will find
statistics, not a network, and the write-up has to match.

## Surface

Three read-only endpoints (`apps/api/src/routes/ranker.ts`), all behind
`requireAuth` applied at the router level:

| Endpoint | Returns |
|---|---|
| `GET /api/ranker/patterns` | pattern report for the user |
| `GET /api/ranker/status` | ranker status |
| `GET /api/ranker/training-manifest` | manifest, `limit` clamped 1–1000, default 500 |

All three are `GET` and none mutate. The ranker observes; it does not write back
through this surface.

## The clamp is the interesting line

```ts
const rawLimit = Number(req.query.limit ?? 500);
const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(1000, rawLimit)) : 500;
```

`Number.isFinite` catches `NaN` from unparseable input **and** `Infinity`, then
the clamp bounds it both ways. A user-supplied query parameter can therefore
never produce an unbounded query. Worth copying wherever a limit is accepted.

## Backing services

- `services/patterns.ts` — `getPatternReport`
- `services/adaptiveRanker.ts` — `getAdaptiveRankerStatus`, `buildTrainingManifest`

## Honest status

- Endpoints resolve and return: `[MEASURED]`
- Ranking **quality** against a real user's history: `NOT MEASURED`
- Whether the patterns surfaced are useful to a person: `NOT DONE` — this needs
  user testing, which has not happened

## Sources
- `[FROM CODE]` `apps/api/src/routes/ranker.ts:10-34`

## Related
- [[entities/api-surface.md]]
- [[concepts/consent-gating.md]]

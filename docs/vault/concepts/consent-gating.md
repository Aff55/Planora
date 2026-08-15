---
title: Consent gating — two switches, three capabilities
tags: [privacy, consent, api, concept]
source: "self"
date: 2026-08-14
status: active
related_code: "apps/api/src/services/aiPolicy.ts:4-38"
---

# Consent gating — two switches, three capabilities

## The stored switches

Only two booleans exist in the database, both on `Settings`
(`apps/api/prisma/schema.prisma`):

| Field | Default |
|---|---|
| `aiPersonalization` | `true` |
| `privacyMode` | `false` |

## The derived capabilities

`getAiDataPolicy(userId)` resolves them into an `AiDataPolicy`
(`apps/api/src/services/aiPolicy.ts:4`):

```ts
canUsePersonalContext:   aiPersonalization
canUseSensitiveContext:  aiPersonalization && !privacyMode
canPersistLearning:      aiPersonalization && !privacyMode
```

Read plainly: **`aiPersonalization` is the master switch.** With it off, nothing
personal is used at all. `privacyMode` is the narrower control — personalisation
may still happen, but sensitive context is excluded and **nothing is learned or
persisted** from the interaction.

Missing settings fall back to the permissive-but-safe defaults
(`?? true` / `?? false`, lines 27–28), so a user with no `Settings` row behaves
like a normal consenting user rather than crashing or silently disabling itself.

## Why derive instead of store

Storing three booleans would let them drift out of sync with the two the user
actually sees, and would need a migration and a backfill every time the rule
changed. Deriving them per request means:

- revoking consent takes effect **immediately**, everywhere
- there is exactly one place to read to know what the rules are
- no route can invent its own interpretation of "privacy mode"

The cost is one database read per policy resolution. That is the trade, and it
is the right way round for a privacy feature.

## The subtlety worth remembering

`canUseSensitiveContext` and `canPersistLearning` are currently the **same
expression**. They are kept as separate fields because they answer different
questions — "may I read this?" versus "may I remember this?" — and will diverge
the moment a rule distinguishes them. Collapsing them into one field would save
a line today and cost a refactor later.

## Sources
- `[FROM CODE]` `apps/api/src/services/aiPolicy.ts:4-38`
- `[FROM CODE]` `apps/api/prisma/schema.prisma` — `model Settings`

## Related
- [[maps/privacy.md]]
- [[concepts/adaptive-ranker.md]]

---
title: Data model — 18 Prisma models
tags: [prisma, postgres, entity]
source: "self"
date: 2026-08-14
status: active
related_code: "apps/api/prisma/schema.prisma"
---

# Data model — 18 Prisma models

`[MEASURED]` — `grep -c "^model " apps/api/prisma/schema.prisma` → **18**

## Grouped by what they are for

**Identity and preferences**
`User` · `PersonalProfile` · `AuthSession` · `Settings`

**Planning**
`Task` · `Subtask` · `Activity` · `CalendarEvent` · `Habit`

**Wellbeing logs**
`MoodLog` · `SleepLog` · `WaterLog` · `JournalEntry`

**Adaptation**
`Recommendation` · `RecommendationFeedback` · `AIInteraction` · `ModelEvent` ·
`EmbeddingMemory`

The grouping tells you the shape of the product: four wellbeing log types is a
deliberate choice to keep each log trivially cheap to write, rather than one
polymorphic "log" table that would need a discriminator and nullable columns.

## Notes that cost time to learn

- **`ModelEvent` keeps its name** even though the feature was renamed from
  "neural engine" to adaptive ranker. Renaming it would mean a schema migration
  for zero behavioural gain, and the migration history is cited as evidence.
- **Migration history is append-only.** Never edit an existing migration in this
  project — add a new one. This is a hard constraint, not a preference.
- `Settings` carries the two consent booleans that gate every AI path. See
  [[concepts/consent-gating.md]].
- `Settings.userId` is `@unique` with `onDelete: Cascade`, so settings are
  strictly one-per-user and disappear with the user.

## Sources
- `[MEASURED]` model count from `schema.prisma`
- `[FROM CODE]` `apps/api/prisma/schema.prisma` — `model Settings`

## Related
- [[entities/api-surface.md]]
- [[maps/architecture.md]]

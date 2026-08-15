---
title: Privacy and consent — map of content
tags: [moc, privacy, consent]
source: "self"
date: 2026-08-14
status: active
related_code: "apps/api/src/services/aiPolicy.ts"
---

# Privacy and consent — map of content

This is the project's defining constraint, so it gets its own map.

## The shape of it

Two switches are **stored**. Everything else is **derived** from them at request
time by a single function, so no route gets to invent its own interpretation.

- [[concepts/consent-gating.md]] — the two switches, the three capabilities,
  and why deriving beats storing

## Why this is the hard part

Personalisation and "do not profile me" pull in opposite directions. The design
answer is that the *capabilities* are computed per request rather than baked
into stored data, so revoking consent changes behaviour immediately and
everywhere, without a migration or a backfill.

## What has actually been verified

- The policy resolver is a single function with one database read —
  `[FROM CODE]` `apps/api/src/services/aiPolicy.ts:13`
- `PersonalProfile.allowProductAnalytics` was **removed** entirely, including
  its two rendered toggles and the public-site copy describing it. A trap worth
  remembering: grepping the field name did **not** find the prose paragraph on
  the privacy page that described the switch, because the prose never named the
  field. Removing a setting means reading the pages that talk about it, not just
  the code that reads it.

## Not yet done

- No independent audit that each gate suppresses everything it claims to.
  Spot-checked only. `NOT MEASURED`

## Related
- [[maps/architecture.md]]
- [[maps/ml.md]] — the companion is the largest consumer of this policy

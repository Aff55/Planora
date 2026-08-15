# planora-vault — Content Index

> Catalog of every page in the vault. Updated after every ingest.
>
> **New here? Start at [[home.md]].**

**Last updated:** 2026-08-14

---

## Maps of content (maps/)

- [[home.md]] — the front door
- [[maps/architecture.md]] — how the packages fit together
- [[maps/privacy.md]] — consent gating, the defining constraint
- [[maps/mobile.md]] — Expo Go limits and the code that looks odd because of them
- [[maps/ml.md]] — companion, fine-tuning, promotion policy

---

## Syntheses (syntheses/)

_No syntheses yet._

---

## Decisions (decisions/)

- [[decisions/2026-08-14-pin-mobile-to-expo-sdk-54.md]] — target the runtime
  actually installed on the phone, and the Babel rules that follow
- [[decisions/2026-08-14-fine-tune-on-8gb.md]] — the 9B fits but cannot compute;
  fallback and manual-promotion policy

---

## Entities (entities/)

- [[entities/api-surface.md]] — 11 routers, 57 endpoints, mounts and conventions
- [[entities/data-model.md]] — the 18 Prisma models, grouped

---

## Concepts (concepts/)

- [[concepts/consent-gating.md]] — two stored switches, three derived capabilities
- [[concepts/adaptive-ranker.md]] — what it is, and why it is not a neural network

---

## Bugs (bugs/)

- [[bugs/duplicate-react-in-npm-workspace.md]] — two React copies broke every
  hook on mobile
- [[bugs/icon-font-never-loads-in-expo-go.md]] — bundled and served correctly,
  still never drew
- [[bugs/task-completion-race-outside-transaction.md]] — check-then-act race only
  concurrent testing could find
- [[bugs/evaluation-scored-silence-as-perfection.md]] — three defects that made a
  mute model score flawlessly and block every candidate

---

## Templates (templates/)

- [[templates/bug.md]] · [[templates/decision.md]] · [[templates/session.md]]

---

## Sources (sources/)

### Claude Code sessions (sources/sessions/)

- [[sources/sessions/2026-08-14-mobile-expo-go.md]] — iPhone 15 via Expo Go, and
  a 9B fine-tune on 8 GB

# Event Log (log.md)

> Append-only, timestamped log.
>
> **Format:** `## [YYYY-MM-DD] <type> | <slug>`
> **Types:** `ingest`, `query`, `lint`, `schema`

---

## [2026-08-14] schema | vault-init

- Vault skeleton created: `docs/vault/`
- Stack: Node.js monorepo — Next.js 15 + React 19 (web), Express 5 + Prisma 6 + PostgreSQL (api), Expo SDK 54 + React Native 0.81 (mobile)
- Integrations: Docker (PostgreSQL 16, Redis 7), Ollama (local LLM)
- Domain terms: adaptive ranker, companion, consent gating, pattern detector, life log, wellbeing log, habit inference, training manifest

## [2026-08-14] ingest | mobile-expo-go

- Source: `sources/sessions/2026-08-14-mobile-expo-go.md`
- Decisions: pin mobile to Expo SDK 54; fine-tune policy on an 8 GB card
- Bugs: duplicate React in the workspace; icon font never loading in Expo Go;
  task-completion race outside the transaction
- Standing constraint recorded: promotion to `planora-pro` is manual, and the
  safety gate blocks it outright on any violation

## [2026-08-14] schema | brain-structure

- Added `home.md` as the vault entry point, plus `maps/` (architecture, privacy,
  mobile, ml) and `templates/` (bug, decision, session)
- Grounded concept and entity pages against the codebase rather than memory.
  One correction found doing so: consent is **two** stored switches
  (`aiPersonalization`, `privacyMode`) resolving to **three** derived
  capabilities - not four switches as previously assumed
- Measured: 18 Prisma models, 57 endpoints across 11 routers
- Surfaced the vault inside `Documents\Obsidian Vault` via a directory junction,
  since Obsidian had only a default empty vault registered

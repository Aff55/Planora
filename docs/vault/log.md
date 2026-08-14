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

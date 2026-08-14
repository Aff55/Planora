# planora-vault — Project Vault Schema

> **Project-specific** knowledge archive. Planora — a private, local-first life planner that adapts without profiling you.
>
> Cross-project knowledge (Claude Code patterns, generic workflow) lives in the global vault.
>
> This file is the vault's constitution. Every ingest/query/lint reads it first.

---

## 1. Purpose

Persistent knowledge archive for **Planora**:

- Project-specific architectural decisions and their rationale
- Domain business rules and terminology
- Bug reports with root cause and permanent fix
- Feature development history (what, why, when)
- Deployment and integration decisions
- Data model / API evolution history

### Scope

- Stack: Node.js monorepo — Next.js 15 + React 19 (web), Express 5 + Prisma 6 + PostgreSQL (api), Expo SDK 54 + React Native 0.81 (mobile), shared Zod contracts
- Integrations: Docker (PostgreSQL 16, Redis 7), Ollama (local LLM)
- Domain terms: adaptive ranker, companion, consent gating, pattern detector, life log, wellbeing log, habit inference, training manifest

### Out of scope (belongs elsewhere)

- Generic Claude Code patterns → global vault
- Cross-project workflow preferences → global vault
- Other projects → their own vaults
- Runtime instructions → project-root `CLAUDE.md` (not this file)
- FYP/coursework writing → `Documents/Planora-FYP/` (deliberately outside this repo)

---

## 2. Directory layout

| Directory | Content |
|---|---|
| `raw/sessions/` | Claude Code JSONL transcripts (symlinks, gitignored) |
| `raw/docs/` | Reference documents (PRDs, PDFs) |
| `sources/sessions/` | One summary page per JSONL transcript |
| `entities/` | Project entities: models, components, services, endpoints |
| `concepts/` | Domain concepts and patterns |
| `decisions/` | Architectural decisions (ADR-like, atomic) |
| `bugs/` | Bug reports: root cause, fix, regression note |
| `syntheses/` | Feature overviews, period summaries, comparisons |
| `archive/` | Outdated pages (never deleted) |

---

## 3. Naming convention

- `kebab-case.md`, ASCII only
- **Sources**: `sources/sessions/YYYY-MM-DD-<short-slug>.md`
- **Decisions**: `decisions/YYYY-MM-DD-<slug>.md`
- **Bugs**: `bugs/<slug>.md` (date in frontmatter)
- **Entities**: `entities/<name>.md`
- **Concepts**: `concepts/<topic>.md`

---

## 4. Page format

```markdown
---
title: Page title
tags: [tag1, tag2]
source: "sources/sessions/YYYY-MM-DD-<slug>.md"
date: YYYY-MM-DD
status: draft | active | archived
related_code: "path/to/file.ts:line_range"  # optional
---

# Page title

Body. Every claim cites a source.

## Sources
- [[sources/sessions/YYYY-MM-DD-slug.md]]

## Related
- [[entities/...]]
```

---

## 5. INGEST workflow

1. Parse with sandbox tool (never Read multi-MB JSONLs directly)
2. Write `sources/sessions/YYYY-MM-DD-<slug>.md`
3. Add decisions/, bugs/, entities/, concepts/ pages where warranted
4. Update `index.md` and `log.md`
5. Append session ID to global `state/ingested.txt`
6. Commit with `docs(vault):` prefix

---

## 6. Hard rules

1. No sourceless claims — every page has `source` frontmatter
2. No deletions — move to `archive/`
3. No secrets (API keys, passwords, IPs) — use placeholders
4. `index.md` updated on every ingest/lint
5. File names: kebab-case ASCII only
6. Commit prefix: `docs(vault):`
7. **Measured vs estimated**: this project's evidence standard is strict. If a
   claim was measured, say so and give the command. If it was not, say
   `NOT MEASURED` rather than implying it. The FYP depends on this distinction.

---

## 7. Claude Code integration

- Raw source: `~/.claude/projects/C--Users-affan-Documents-Planora/`
- Session ID registry: `${CLAUDE_VAULT:-~/Global Claude Vault}/state/ingested.txt`

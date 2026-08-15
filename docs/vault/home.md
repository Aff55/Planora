---
title: Home
tags: [moc, home]
source: "self"
date: 2026-08-14
status: active
---

# Planora — Home

> Start here. This is the front door to the project's brain.
>
> Everything below is grounded in the codebase or in a recorded session. If a
> number is not measured, the page says `NOT MEASURED` rather than guessing.
> That rule exists because this project's write-up depends on the distinction.

## What Planora is

A private, local-first life planner that adapts to one person without profiling
them. The companion runs against a **local** model through Ollama, so personal
context never leaves the machine.

The interesting engineering problem is not the planner. It is doing
personalisation **while letting the user switch personalisation off** — see
[[maps/privacy.md]].

## Maps of content

| Map | What is in it |
|---|---|
| [[maps/architecture.md]] | How the pieces fit: API, web, mobile, shared contracts |
| [[maps/privacy.md]] | Consent gating, what each switch actually suppresses |
| [[maps/mobile.md]] | Expo Go constraints and the workarounds they forced |
| [[maps/ml.md]] | The companion, fine-tuning, and what an 8 GB card can do |

## Recent activity

- **2026-08-14** — [[sources/sessions/2026-08-14-mobile-expo-go.md]] — got the
  app running on a physical iPhone; three fine-tune attempts

## Open threads

Things genuinely unfinished, kept honest so they do not get quietly forgotten:

- **No user testing has been done.** `NOT DONE`
- **No performance measurement** of the API or either client. `NOT MEASURED`
- **No test coverage figure** has been produced. `NOT MEASURED`
- `docs/diagrams.md` is stale in 5 of its 6 blocks
- The companion is still served by a **stock** Ollama model; no fine-tuned
  candidate has been promoted — see [[maps/ml.md]]

## How to add to this brain

Use the templates so pages stay consistent and linkable:

- [[templates/bug.md]] — a defect with a root cause worth remembering
- [[templates/decision.md]] — a choice whose *rationale* will be asked about later
- [[templates/session.md]] — a working session worth summarising

Rules that keep this vault trustworthy live in [[CLAUDE.md]]. The short version:
every page cites a source, nothing is deleted (move it to `archive/`), no
secrets, and measured claims are labelled as such.

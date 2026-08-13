# AI Architecture

Planora is local-first. Its AI is a constrained planner and reflection assistant, not an unrestricted general chatbot.

## Provider Boundary

The companion attempts a bounded Ollama request first. Defaults are `OLLAMA_BASE_URL=http://127.0.0.1:11434` and `OLLAMA_MODEL=planora-pro`. If Ollama is unavailable, slow, repetitive, or malformed, deterministic local planning rules return a useful answer.

Supported provider modes:

- `OLLAMA`: local inference through the configured model.
- `LOCAL_RULES`: built-in zero-dependency fallback.
- `LLAMA_CPP` and cloud providers remain future adapters and are not active.

Responses are short, cleaned of prompt leakage and repeated prefixes, and limited to supported planning, food, fitness, social, calendar, task, and wellbeing topics. Requests outside that scope are redirected. Recipe requests can offer a focused YouTube search link instead of hallucinating a recipe.

## Context And Memory

The companion can use:

- Today's and upcoming tasks and calendar events.
- Same-day and recent life logs, including food, exercise, social activity, and time outside.
- Mood, sleep, water, and recommendation signals.
- A small recent conversation window and relevant semantic memories.

The app understands each user's IANA timezone. New local days do not delete earlier records; older behavior becomes trend context for the next day's recommendations.

Personal context is supplied only when AI personalization is enabled. My Profile has a separate consent switch before user-provided role, goals, interests, schedule preferences, height, weight, or activity level can influence local context. Sensitive reflections, journal content, body measurements, and AI history require the stricter privacy gate. Privacy mode also pauses personalized recommendations and the learning engine. When personalization is off, both Ollama and deterministic rules answer without reading the user's records. Clearing AI data deletes interactions, semantic memories, and learning events without deleting the user's tasks or wellbeing records.

Semantic retrieval currently uses deterministic local vector hashing, so no paid embedding API is required. The storage boundary can later adopt a local embedding model.

## Recommendations And Learning

Recommendations combine explicit product rules with feedback-weighted ranking. They account for task urgency, calendar load, food balance, fitness recovery/rotation, social contact, outdoor time, water, sleep, mood, stress, and stale habits. Generation is bounded, cooldown-aware, and idempotent.

The adaptive ranker records structured events and recommendation feedback for per-user adaptation and offline inspection. Version 2 also measures active days, app streaks, changing engagement readiness, and broad inferred routines. It does not silently retrain the Ollama base model. Training manifests require a separate opt-in and pseudonymize the participant while removing identity, free text, height, and weight.

## Safety

Planora does not diagnose conditions, prescribe treatment, or replace qualified medical, mental-health, nutrition, or fitness professionals. Advice remains general, identifies uncertainty, and redirects high-risk or unsupported requests.

## Planora Pro

`apps/api/ollama/Modelfile.planora-pro` builds the local model from `qwen3.5:9b` with Planora's scope and output constraints:

```powershell
apps/api/scripts/setup-ollama.ps1
```

The script starts Ollama when needed, pulls the base model, creates `planora-pro`, and runs a local smoke test.

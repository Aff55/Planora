# Adaptive Ranker

Planora now includes a local user-scoped learning engine at `apps/api/src/services/adaptiveRanker.ts`.

## Current Phase

The current engine is `LOCAL_ONLINE_RANKER`.

It does not fine-tune the LLM. Instead, it learns from structured Planora data and recommendation feedback, then re-ranks recommendations and exposes learning signals to the companion.

## Learned Signals

The engine uses:

- task category, priority, due date, status, and completion behavior
- calendar load and overlap pressure
- life activity minutes, food, fitness, social logs, and most active window
- mood, stress, energy, sleep, and water logs
- habit staleness and streaks
- recommendation accepted, dismissed, or snoozed feedback
- model events emitted by task, life log, wellbeing, recommendation, and companion workflows

## API

- `GET /api/ranker/status`: returns confidence, sample counts, learned weights, focus window, engagement, active-day streaks, inferred routines, and next improvement suggestions.
- `GET /api/ranker/training-manifest?limit=500`: exports pseudonymous structured events and feedback rows only after separate profile consent.

## Recommendation Ranking

Recommendation candidates still start with rule-generated safety and planning logic. The ranker then applies a learned score using:

- base recommendation weight
- user feedback by recommendation type
- current app signals, such as overdue tasks, poor sleep, low water, high workload, or focus patterns
- confidence based on how many useful samples exist

## Future Export Targets

- ONNX for backend or desktop local inference
- Core ML for iOS
- TensorFlow Lite for Android and lightweight on-device inference

Keep the ranker small and interpretable until enough high-quality feedback exists for a heavier model.

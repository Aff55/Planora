# Adaptive Ranker

Planora re-orders its rule-generated recommendations using a small scorer that
adapts to one user, at `apps/api/src/services/adaptiveRanker.ts`.

## What it is, precisely

An **online linear ranker over local records, with bounded feedback
adjustment**. It is not a neural network: there is no network, no layers, no
gradients and no backpropagation anywhere in this codebase. It is not trained
offline, and it does not fine-tune the language model.

Every candidate recommendation is scored as:

```
score = basePriority x recommendationTypeWeight x confidenceMultiplier + featureBoost
```

- `recommendationTypeWeight` starts at 1 and moves with accept/dismiss feedback
  for that recommendation type.
- `confidenceMultiplier` is `0.55 + confidence * 0.45`, so a cold ranker still
  produces a usable ordering rather than flattening every score to zero.
- `featureBoost` is the sum of the named feature weights that apply to the
  candidate's type.

The engine identifier reported by the API is `LOCAL_ONLINE_RANKER`.

### Why "learning" is a fair word here, and where it stops

The weights genuinely change in response to what the user accepts and dismisses,
and those changes persist. That is adaptation, and it is the honest claim.

What it is **not** is a model that generalises across people, discovers
representations, or improves in any way not directly traceable to a weight
moving. Every number that affects an ordering can be read back out of
`GET /api/ranker/status` and pointed at. If a recommendation moved up, you can
say which weight moved it and which feedback moved that weight.

### Bounds, deliberately

Both limits exist so that no single burst of feedback can capture the ranking,
and so the system never claims certainty it has not earned:

- Recommendation type weights are clamped to **[0.45, 1.85]**
  (`adaptiveRanker.ts`, in `buildRankerProfile`). A type can be strongly
  preferred or strongly suppressed, but never silenced or made unconditional.
- Confidence is clamped to **[0.05, 0.95]** and saturates with sample count. It
  never reaches 1.

## Feature weights

Seven named features, each derived from the user's own records:

| Feature | Driven by |
|---|---|
| `urgency` | count of overdue open tasks |
| `wellbeing` | latest stress and sleep-hours readings |
| `focus` | strength of the user's most active window |
| `recovery` | weekly active minutes above a threshold |
| `habit` | habit feedback signal |
| `hydration` | today's water intake against target |
| `completionMomentum` | rolling task completion rate |

When `PersonalProfile.useForPersonalization` is on, coaching style and activity
level nudge `recovery`, `focus` and `habit`. When it is off, they do not — the
profile is read but not applied.

## Inputs

- task category, priority, due date, status and completion behaviour
- calendar load and overlap pressure
- life activity minutes; food, fitness and social logs; most active window
- mood, stress, energy, sleep and water logs
- habit staleness and streaks
- recommendation accepted, dismissed or snoozed feedback
- model events emitted by task, life log, wellbeing, recommendation and
  companion workflows

## API

- `GET /api/ranker/status` — confidence, sample counts, learned weights, focus
  window, engagement, active-day streaks, inferred routines and next improvement
  suggestions.
- `GET /api/ranker/patterns` — the detected-pattern report, including the checks
  that ran and found nothing, each with the reason it was inconclusive.
- `GET /api/ranker/training-manifest?limit=500` — pseudonymous structured events
  and feedback rows, only after separate profile consent.

All three are gated by the consent policy in `services/aiPolicy.ts`. With
personalization off, the ranker reports itself disabled rather than returning
stale numbers.

## Consent

The ranker never persists learning unless `aiPersonalization` is on and
`privacyMode` is off, and the training manifest additionally requires
`PersonalProfile.allowAnonymousTraining`. These are enforced in the service, not
in the UI.

## Possible future work

Listed as unbuilt ideas, not commitments. None of this exists today.

- Per-feature attribution surfaced in the UI, so a recommendation can show its
  own reasoning to the user rather than only to a developer reading the status
  endpoint.
- Time-decay on feedback, so that preferences from months ago carry less weight
  than last week's.
- A held-out evaluation of whether the adapted ordering actually beats the plain
  rule ordering. **This does not exist, and until it does, the claim that
  adaptation helps is unproven.**

A heavier model is not obviously the right next step. The current design's main
virtue is that it can explain itself, and most of what would replace it cannot.
Exporting seven weights to ONNX, Core ML or TensorFlow Lite would add a runtime
dependency and buy nothing — those formats matter when there is a network to
run, and there is not one here.

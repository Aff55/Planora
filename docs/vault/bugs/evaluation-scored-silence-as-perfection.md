---
title: The evaluation scored silence as perfection
tags: [ml, evaluation, ollama, bug]
source: "sources/sessions/2026-08-14-mobile-expo-go.md"
date: 2026-08-14
status: active
related_code: "Planora-Qwen25-Finetune/planora9b/evaluate.py"
---

# The evaluation scored silence as perfection

## Symptom

A fine-tuned candidate was rejected with a confident-looking verdict:

```
BLOCKED: fabricates more than baseline (1 vs 0).
```

Nothing errored. The report was well-formed. The verdict was meaningless.

## Root cause

Three independent defects, all the same species: **a silent failure recorded as
a clean result.**

### 1. An empty reply counted as a valid answer

`generate()` returned whatever was in the `response` field. An empty string is
not an error, so it was scored — as a reply with zero words, zero fabrications
and zero scope leaks.

A model that says nothing therefore scores **perfectly** on every gate, because
every gate counts bad things. Worse, since the baseline is the bar the candidate
must beat, a mute baseline **blocks every candidate forever**.

### 2. `num_predict: 320` silenced the reasoning model

`planora-pro` is a reasoning model. Measured directly:

```
response len : 0
thinking len : 1261
done_reason  : length
eval_count   : 320
```

It spent the entire budget on hidden reasoning and emitted **no visible tokens**.
320 was ample for a plain instruct model and left a thinking model mute — so the
two models were never measured on comparable terms.

### 3. The safety regex could not tell refusal from advice

```python
UNSAFE = [r"\bstop taking\b", ...]
```

flagged this reply as a safety violation:

> "I cannot give medical advice or tell you to **stop taking** medication.
> Please talk to your doctor before making any changes."

That is a textbook-correct refusal. But a refusal must **name the dangerous
action in order to decline it**, so it contains the exact phrase a harmful answer
contains. Since safety is the absolute gate, this false positive would reject
well-behaved models permanently.

## Fixes

1. An empty `response` now returns `__ERROR__` carrying `done_reason` and the
   length of hidden reasoning, so it lands in `empty` as a **failed
   measurement** rather than a clean reply.
2. `NUM_PREDICT` is configurable (`PLANORA_NUM_PREDICT`), default raised to 1024.
3. `unsafe_hits()` ignores a match governed by a negation earlier in the same
   sentence. Verified 9/9: four real refusals pass clean, five genuinely harmful
   answers still caught.
4. A **VOID** verdict — if the baseline produced no usable output, the run
   reports that nothing can be concluded, instead of returning a negative
   result derived from silence.

## The generalisable lesson

`evaluate.py` already refused to run when Ollama was unreachable, on the
principle that *an eval which cannot reach the model reports a false clean
sheet, which is worse than no eval*. The principle was right; it had simply not
been applied to every way "no answer" can arrive.

**A measurement system must distinguish "behaved well" from "produced nothing".**
If it cannot, its confidence is unearned — and unearned confidence is more
dangerous than a missing number, because nobody goes looking for it.

## Regression note

Adding a phrase to `UNSAFE` without a negation test reintroduces defect 3.
Adding any new call to `generate()` that inspects `response` directly, rather
than checking for the `__ERROR__` prefix, reintroduces defect 1.

## Sources
- [[sources/sessions/2026-08-14-mobile-expo-go.md]]

## Related
- [[maps/ml.md]]
- [[decisions/2026-08-14-fine-tune-on-8gb.md]]

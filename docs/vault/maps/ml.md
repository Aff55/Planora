---
title: Companion and fine-tuning — map of content
tags: [moc, ml, ollama, companion]
source: "self"
date: 2026-08-14
status: active
---

# Companion and fine-tuning — map of content

## How the companion works today

A **stock** model served locally by Ollama, behind `/api/companion/*` (4
endpoints). Running locally is the point: personal context never leaves the
machine, which is what makes the privacy claim in [[maps/privacy.md]] structural
rather than aspirational.

Context assembly is gated by [[concepts/consent-gating.md]] — with
`aiPersonalization` off, the companion gets no personal context at all.

## Fine-tuning

- [[decisions/2026-08-14-fine-tune-on-8gb.md]] — what the hardware can actually
  do, and the three silent traps that cost three runs

The short version: **the 9B fits in 8 GB but cannot compute in it.** Loading
succeeds, then the first matmul dies with `CUDA driver error: device not ready`
rather than a clean OOM — which sends you looking for a driver problem instead
of a memory one.

## Promotion policy — deliberately manual

`planora-pro` is **never** overwritten automatically. Candidates register under
a dated tag (`planora9b-ft:<timestamp>`) and adopting one is a decision a human
makes by pointing `OLLAMA_MODEL` at it.

The safety gate in `evaluate.py` is **absolute**: any safety violation blocks
promotion regardless of how the other scores look.

## The eval's own hard rule

`evaluate.py` refuses to run if it cannot reach Ollama, because an eval that
generates nothing reports zero violations — a false clean sheet, which is worse
than no eval. This has already fired for real: a run where WSL could not reach
Ollama on the Windows host.

The lesson generalises. A test that cannot reach its subject must **fail**, not
pass quietly.

## Status (2026-08-14, end of session)

- 7B QLoRA, 3 epochs: `[MEASURED]` — complete, 9.6 MB adapter
- LoRA served without merging: `[MEASURED]` — `planora-7b-ft:20260814-191218`
- 9B trained: **not possible on this card** — accelerate forbids 4-bit training
  with offload, and the 9B does not fit in VRAM without it
- Candidate vs baseline: `[MEASURED]` — both 0 safety violations; candidate
  worse on referral (5 vs 2) and scope leaks (2 vs 0)
- Promoted to `planora-pro`: **no** — no measurable improvement

Full write-up: `Documents/Planora-FYP/FINETUNE-REPORT.md`

The harness that produced the first (invalid) verdict is documented in
[[bugs/evaluation-scored-silence-as-perfection.md]].

## Related
- [[maps/privacy.md]]
- [[maps/architecture.md]]

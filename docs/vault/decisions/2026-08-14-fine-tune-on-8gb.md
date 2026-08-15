---
title: What an 8 GB card can and cannot fine-tune
tags: [ml, qlora, vram, decision]
source: "sources/sessions/2026-08-14-mobile-expo-go.md"
date: 2026-08-14
status: active
related_code: "Planora-Qwen25-Finetune/planora9b/train.py"
---

# What an 8 GB card can and cannot fine-tune

## Context

Target: a companion model fine-tuned on Planora's own voice and safety rules,
run locally through Ollama. Hardware: **RTX 3060 Ti, 8 GB**. The instruction was
to push the 9B as hard as the machine allows.

## The finding

**The real constraint was host RAM, not VRAM.** This was misdiagnosed for five
runs, and the wrong conclusion is recorded below so the mistake is visible.

The machine has **15.9 GB of RAM**, so WSL's default ceiling gave it **7 GB**.
`train.py` passed `max_memory={0: "6GiB", "cpu": "28GiB"}` — advertising 28 GiB
of host memory that did not exist. transformers duly placed offloaded layers
there, and the **Linux OOM killer** terminated Python.

The tell was there the whole time: the process died **with no Python traceback**.
An allocation failure inside torch raises `torch.cuda.OutOfMemoryError`. A
process that simply vanishes has been killed from outside. Silent death is the
signature of the OOM killer, not of a GPU fault.

### What was wrongly concluded, and what is actually true

The first version of this page said *"the 9B fits but cannot compute"*, written
after `CUDA driver error: device not ready`. That was the wrong mechanism — the
error appeared while offload into non-existent memory was active.

Once the budget was honest, the 9B failed with a **real traceback** instead of a
silent kill, and the answer is unambiguous:

```
ValueError: You can't train a model that has been loaded in 8-bit or 4-bit
precision with CPU or disk offload.
```

**A 9B QLoRA is not possible on this 8 GB card.** The chain is closed:

1. The 9B does not fit entirely in VRAM (7 GiB budget was not enough)
2. `device_map="auto"` therefore spills part of it to CPU/disk
3. accelerate **forbids** training a 4-bit model with any offload

The third point is the one that matters, and it is easy to miss: **more host RAM
would not help.** Offload is disallowed for 4-bit training regardless of how much
memory exists. The constraint is VRAM alone, and it is hard.

That is a cleaner and more defensible finding than the original guess, and it is
the kind of claim that survives being asked "how do you know?" — the library
says so, by name, in an exception.

### Fix

`_cpu_budget_gib()` now derives the offload budget from `/proc/meminfo` and
clamps it to available memory minus a 2 GiB margin. Offload is **opt-in**
(`PLANORA_CPU_GIB`), defaulting to GPU-only — on this machine the GPU is both
faster and the only memory there is much of.

## Traps found along the way

Each of these was silent — the run failed for a reason that was not the reason
it appeared to fail:

1. **`prepare_model_for_kbit_training` upcasts every layer norm and embedding
   to fp32.** On a 9B that is a ~3.8 GB spike on top of the 4-bit weights, and
   it caused the first OOM. Only two of its behaviours were needed
   (`gradient_checkpointing_enable`, `enable_input_require_grads`); calling
   those directly avoids the spike.
2. **`PYTORCH_CUDA_ALLOC_CONF` is deprecated and silently ignored.** The
   anti-fragmentation setting was never applied despite being set on two runs.
   The current name is `PYTORCH_ALLOC_CONF`.
3. **`--outtype q4_k_m` is not valid for `convert_hf_to_gguf.py`.** `q4_k_m` is
   a *quantisation* format belonging to `llama-quantize`; the converter accepts
   only `f32, f16, bf16, q8_0, tq1_0, tq2_0, auto`. This is what stopped a
   successfully-trained 7B adapter from ever reaching Ollama — training worked
   and the artifact still could not be served.
4. **A launcher that discarded exit codes reported failure as success.** The log
   read `baseline eval finished` for an eval that had printed *"Refusing to
   run"* and exited non-zero. The eval was written specifically to prevent false
   clean sheets; the wrapper reintroduced one a layer above it.
5. **`tail -f` on the log broke the run that was writing it.** Watching the log
   from WSL held the file open, so PowerShell's `Add-Content` failed with
   *"being used by another process"* and the training output was lost — the run
   continued but its diagnostics went nowhere. Do not follow a Windows log file
   that a PowerShell script is appending to; read the completed file instead.

## Decision

Keep the 9B as the first attempt with a hard GPU budget (`max_memory={0: "6GiB",
cpu: "28GiB"}`, `llm_int8_enable_fp32_cpu_offload=True`) and **fall back to
Qwen2.5-7B-Instruct automatically** rather than ending a run with nothing.

Promotion to `planora-pro` stays **manual**. Candidates register under a dated
tag; nothing overwrites the served model automatically, and the safety gate in
`evaluate.py` blocks promotion outright on any violation.

## Status

- 7B adapter trained successfully: **MEASURED** — 9.6 MB
  `adapter_model.safetensors` on disk
- 9B training to completion: **NOT ACHIEVED** as of this page
- Candidate evaluation scores: **NOT MEASURED** — no candidate has yet reached
  Ollama, because of trap 3 above

## Sources
- [[sources/sessions/2026-08-14-mobile-expo-go.md]]

# Phase 05. Qwen Local Runtime Contract

## Goal

Qwen3-4B-GGUF becomes a predictable local persona runtime for the desktop app.

The local runtime must follow the same prompt envelope as web cloud LLMs while preserving stricter local privacy options.

## Model

Target model:

```text
Qwen/Qwen3-4B-GGUF
recommended quantization: Q4_K_M
runtime: llama.cpp server
```

Reference settings from the model card:

- Qwen3-4B-GGUF is a 4B GGUF model.
- Q4_K_M is the practical default for local desktop use.
- Qwen3 supports thinking and non-thinking modes.

## Default Mode

Use `/no_think` for user-facing companion generation:

- nudge
- pocket
- deep

Use `/think` only for offline/background analysis jobs if needed:

- memory candidate extraction
- summary quality review
- evaluation fixtures

## llama.cpp Contract

Prefer OpenAI-compatible chat completions:

```text
POST /v1/chat/completions
```

Fallback:

```text
POST /completion
```

The provider must keep prompt construction outside the transport layer. Transport only sends already-assembled provider input.

## Sampling Defaults

Initial defaults:

```text
temperature: 0.7
top_p: 0.8
top_k: 20
presence_penalty: 1.5
```

These values can be tuned after evaluation. They are not product guarantees.

## Output Contracts

Nudge:

- 1 sentence
- no markdown
- no metadata
- no raw context claim
- response cap: 80 tokens

Pocket:

- 1 to 2 short paragraphs
- gentle continuation from nudge
- response cap: 300 tokens

Deep:

- up to 4 short paragraphs
- ask at most one question
- keep persona tone stable
- response cap: 900 tokens

## Input Budget Contract

Qwen3-4B-GGUF has a large advertised context window, but the app must use smaller mode budgets until local latency and quality are measured.

```text
nudge input cap: 1,200 tokens
pocket input cap: 2,800 tokens
deep input cap: 8,000 tokens
```

The local provider rejects prompts above the mode cap. Prompt Builder, not the transport layer, decides what to truncate.

## Safety Contract

Qwen input must never contain:

- raw OCR text
- screenshot bytes/path
- password/token/API key
- full URL with query
- file path
- unredacted sensitive window title

## Scope

- Qwen prompt format.
- llama.cpp request settings.
- provider input filtering.
- output length contracts.
- local model health checks.
- token and latency budget enforcement.

## Excluded

- Model fine-tuning.
- Embedding model selection.
- RAG.
- Cloud LLM provider migration.

## Tests

- Provider uses assembled prompt without rebuilding persona data.
- Forbidden fields are absent from local provider input.
- `/no_think` is included for user-facing modes.
- Nudge output contract is enforced by tests or post-processing.
- Local provider fallback remains available.
- Provider rejects input above mode token cap.
- Timeout and repetition errors are reported with mode and prompt trace id.

## Exit Criteria

- Qwen local replies preserve persona tone.
- Local provider behavior is deterministic enough for regression tests.
- Prompt and transport responsibilities are separated.
- Local latency and repetition metrics stay within Phase 07 gates.

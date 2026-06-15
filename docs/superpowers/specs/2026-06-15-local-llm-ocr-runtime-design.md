# Local LLM And OCR Runtime Design

## Goal

Amadeus MVP+1 focuses on two local-only capabilities:

- Make the existing llama.cpp sidecar path production-shaped enough for local companion replies.
- Connect OCR observations to Local LLM input safely, without exposing raw OCR text or persisting OCR summaries.

This pass does not add cloud model calls, model downloads, Supabase sync, or production screen recording.

## Current Baseline

The project already has a Rust-owned Local LLM boundary:

- `LlamaSidecarState` validates and launches a configured `llama-server` binary.
- `LocalLlamaProvider` calls a localhost llama.cpp HTTP endpoint.
- settings hold `local_model_path`, `llama_server_binary_path`, host, port, route, and fallback.
- provider input is filtered through `LlmInputEnvelope` and `LlmChatEnvelope`.

The project also has an OCR safety baseline:

- `pre_capture_gate` blocks sensitive or unapproved capture contexts.
- `pre_ocr_gate` blocks expired or sensitive capture metadata.
- `RawOcrText` is private to the OCR module.
- exported `OcrObservation` contains only redacted summary, classes, kind, confidence, sensitive hit count, and TTL.

## Recommended Local LLM Architecture

Keep llama.cpp as an external sidecar process.

Rust should not directly link a llama.cpp binding for this phase. The sidecar boundary is safer for a desktop app because model loading, Metal/GPU behavior, crashes, and memory pressure stay outside the Tauri process.

The sidecar provider should support two llama.cpp HTTP shapes:

1. OpenAI-compatible chat completions at `/v1/chat/completions`.
2. Legacy llama.cpp completion at `/completion` as fallback.

The provider should prefer chat completions for new generation because it matches llama.cpp server's current API direction and is easier to extend with system/user roles. The legacy completion route remains useful for older local builds and existing tests.

## Runtime Policy

Local LLM may receive:

- trigger type
- trigger reason
- coarse context label
- redacted window title
- redacted OCR summary
- speakability/privacy buckets
- sanitized chat messages

Local LLM must not receive:

- raw screenshot bytes
- raw OCR text
- raw sensitive window titles
- file paths or URLs before sanitizer filtering
- Supabase tokens or cloud secrets
- remote model URL auto-download settings

Sidecar host remains localhost-only.

## OCR Architecture

The OCR implementation remains adapter-based:

- `OcrAdapter` consumes image/capture data internally.
- Adapter output is immediately converted into `OcrObservation`.
- Raw OCR text never leaves the OCR module.
- `OcrObservation` may be passed to Local LLM only in memory.
- Persistence of OCR summaries stays blocked until retention/source fields are explicitly designed.

For macOS, the preferred production adapter is Apple Vision through Rust Objective-C bindings. `objc2-vision` is the likely crate family because the project already uses `objc2-*` crates for macOS APIs. This design does not require adding the adapter before the contract is wired and tested.

## Data Flow

```text
macOS context snapshot
  -> privacy assessment
  -> pre_capture_gate
  -> capture adapter
  -> pre_ocr_gate
  -> OCR adapter
  -> OcrObservation
  -> LlmInputEnvelope.redacted_ocr_summary
  -> LocalLlamaProvider
  -> llama-server localhost
  -> generated companion message
```

If any gate denies the flow, OCR is skipped and Local LLM receives no OCR summary.

## Error Handling

Local LLM failures should degrade to template output when fallback is enabled.

Sidecar errors should be visible in settings status:

- not configured
- configured but stopped
- launching
- ready
- readiness failed
- process exited

OCR errors should be non-fatal. A failed OCR pass should not block a trigger decision; it only removes the optional OCR context.

## Testing

This phase is TDD-first.

Minimum tests:

- sidecar config can build llama-server args without flaky temporary paths.
- Local provider prefers `/v1/chat/completions` when configured.
- Local provider can still normalize legacy `/completion` responses.
- OCR observation can be converted into a Local LLM envelope without raw OCR fields.
- API/template provider filtering still strips OCR summary.
- trigger-generated envelopes keep OCR summary absent until an explicit OCR observation is supplied.
- `cargo check`, `cargo test`, and `pnpm build` pass.

## Out Of Scope

- model download manager
- bundled GGUF files
- cloud inference
- Supabase sync of OCR summaries
- OCR persistence
- full screen capture production loop
- release packaging


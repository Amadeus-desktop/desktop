# Phase 10. OCR Vision Spike

## Goal

Apple Vision OCR을 MVP 이후 실험 기능으로 검증한다.

## Architecture Links

- [Local Perception Signal Architecture](../architecture/local-perception-spa.md)
- [Local AI, OCR, And LLM Architecture](../architecture/local-ai-ocr-llm.md)
- [Policy And Security Architecture](../architecture/policy-and-security.md)

## Scope

- feature-flagged OCR adapter
- mock capture adapter
- Apple Vision OCR spike
- in-memory raw OCR handling
- redacted `OcrObservation`
- latency/CPU/memory benchmark

## Excluded

- OCR production default
- OCR summary persistence
- PaddleOCR sidecar
- Tesseract integration

## Tests

- PreCaptureGate blocks sensitive context.
- PreOcrGate blocks expired/unapproved capture.
- raw OCR text never leaves adapter.
- OcrObservation has no raw text field.
- API provider never receives OCR summary.

## Exit Criteria

- OCR viability is measured.
- Product can decide whether OCR belongs in MVP+1.

## Spike Baseline

Current implementation starts with a Rust-only OCR contract module:

- `PreCaptureGate` blocks sensitive context before capture.
- `PreOcrGate` blocks expired or unapproved capture metadata.
- raw OCR adapter text is consumed inside the OCR module.
- exported `OcrObservation` contains only redacted summary/classes/kind/confidence/hits/TTL.

Apple Vision adapter and benchmark are still pending. This phase is not a production OCR feature.

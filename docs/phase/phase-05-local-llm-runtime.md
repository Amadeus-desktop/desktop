# Phase 05. Local LLM Runtime

## Goal

llama.cpp sidecar를 MVP 수준으로 안정화한다.

## Architecture Links

- [Local AI, OCR, And LLM Architecture](../architecture/local-ai-ocr-llm.md)
- [Policy And Security Architecture](../architecture/policy-and-security.md)

## Scope

- sidecar readiness check
- stderr/error capture policy
- config change restart
- localhost-only enforcement
- allowed sidecar binary directory
- template fallback
- settings status UX

## Excluded

- model download manager
- remote model URL
- GPU tuning UI
- release packaging

## Tests

- invalid binary rejected
- binary outside allowlist rejected
- non-localhost host rejected
- config change stops old sidecar
- spawn failure records status and falls back

## Exit Criteria

- Local provider can be selected safely.
- sidecar failure does not break companion runtime.

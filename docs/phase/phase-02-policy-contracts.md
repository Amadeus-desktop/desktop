# Phase 02. Policy Contracts

Status: Completed

## Goal

Architecture 문서의 정책 계약을 코드 타입과 테스트로 고정한다.

## Architecture Links

- [Policy And Security Architecture](../architecture/policy-and-security.md)
- [Local Perception Signal Architecture](../architecture/local-perception-spa.md)
- [Local AI, OCR, And LLM Architecture](../architecture/local-ai-ocr-llm.md)

## Scope

- `PolicyScores` 타입 추가
- privacy/capture/LLM gate result enum 추가
- `LlmInputEnvelope` 타입 추가
- provider input grade 추가
- raw title/raw OCR/raw screenshot 금지 테스트
- capture decision은 mock adapter로만 검증

## Required Types

```text
PolicyScores
CaptureDecision
OcrDecision
LlmInputEnvelope
ProviderInputGrade
SuppressionReason
```

## Excluded

- 실제 OCR
- Supabase sync
- Web implementation
- real screen capture storage

## Tests

- privacy risk 70 이상이면 capture/OCR/LLM 차단
- API provider envelope에 OCR summary가 들어가지 않음
- Template provider envelope에 context가 들어가지 않음
- Local provider envelope도 raw title/raw OCR/raw screenshot을 받지 않음
- unknown score 기본값은 안전 쪽으로 동작

## Exit Criteria

- 정책 타입이 Rust에서 컴파일된다.
- 기존 trigger tests가 유지된다.
- provider input redaction tests가 통과한다.

## Completion Evidence

- `PolicyScores`, `CaptureDecision`, `OcrDecision`, `LlmGateDecision`, `SuppressionReason` 추가
- `LlmInputEnvelope`, `ProviderInputGrade`, `PolicyScoreSummary` 추가
- LLM utterance provider 입력을 raw `app_name`/`window_title` request에서 provider-grade envelope로 전환
- Template provider는 fallback 중심 입력만 사용
- API provider envelope는 OCR summary/window title을 제거
- Local provider prompt는 redacted envelope만 사용하고 file path/URL 형태 값을 redaction
- Trigger에서 LLM request 생성 시 raw window title을 전달하지 않도록 변경

Verified:

```text
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
pnpm build
```

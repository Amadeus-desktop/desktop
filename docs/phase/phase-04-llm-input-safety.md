# Phase 04. LLM Input Safety

Status: Completed

## Goal

모든 LLM provider 호출이 `LlmInputEnvelope`를 통과하도록 만들고 raw context 유출을 막는다.

## Architecture Links

- [Local AI, OCR, And LLM Architecture](../architecture/local-ai-ocr-llm.md)
- [Policy And Security Architecture](../architecture/policy-and-security.md)

## Scope

- current LLM request를 `LlmInputEnvelope` 기반으로 변경
- raw window title 직접 전달 제거
- provider grade별 field filtering
- prompt builder 분리
- redaction unit tests

## Provider Rules

```text
Template:
  fallback only

API:
  persona summary
  cloud-safe memory summary
  trigger type
  coarse context label

Local:
  redacted title
  redacted summary
  score buckets
```

## Excluded

- cloud API key integration
- OCR summary generation
- sync memory integration

## Tests

- API prompt excludes raw title.
- API prompt excludes OCR summary.
- Local prompt excludes raw OCR text.
- Template prompt excludes context.
- log output excludes raw prompt.

## Exit Criteria

- no provider receives forbidden fields.
- existing chat/utterance generation still works.

## Completion Evidence

- 모든 utterance provider 호출이 `LlmInputEnvelope`를 사용
- `contract.rs`, `prompt.rs`, `llama_http.rs`로 provider 입력 계약과 prompt builder 분리
- Template provider envelope는 trigger type + fallback 중심으로 제한
- API provider envelope는 raw title, OCR summary, trigger reason detail, tone hint, score summary 제거
- Local prompt builder는 file path/URL 형태 값을 redaction
- Chat prompt도 shared sanitizer를 통과
- `println!`, `eprintln!`, `log::`, `tracing::` 기반 raw prompt 출력 없음

Verified:

```text
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
pnpm build
```

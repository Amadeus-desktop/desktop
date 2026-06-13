# Phase 04. LLM Input Safety

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

# Amadeus Phase Plan

> MVP 중심 구현 phase source of truth.

---

## 1. Phase 원칙

Amadeus는 desktop companion experience가 핵심이다. Web/Supabase는 중요하지만 MVP에서는 desktop local-first runtime이 무너지지 않도록 계약과 최소 연결 지점만 먼저 둔다.

```text
MVP priority:
  1. Desktop local runtime
  2. Policy/security contracts
  3. Local LLM and settings
  4. Local perception exception handling
  5. Optional sync/web foundation
```

---

## 2. Phase Index

| Phase | 문서 | 목적 | MVP 필수 |
| --- | --- | --- | --- |
| 0 | [phase-00-current-baseline.md](./phase-00-current-baseline.md) | 현재 완료 기준선 고정 | yes |
| 1 | [phase-01-domain-modularization.md](./phase-01-domain-modularization.md) | Rust/React 도메인 모듈화 | yes |
| 2 | [phase-02-policy-contracts.md](./phase-02-policy-contracts.md) | 정책/보안/DB 계약 코드화 준비 | yes |
| 3 | [phase-03-trigger-exception-engine.md](./phase-03-trigger-exception-engine.md) | 말걸기 예외상황 처리 | yes |
| 4 | [phase-04-llm-input-safety.md](./phase-04-llm-input-safety.md) | LLM 입력 안전 계약 구현 | yes |
| 5 | [phase-05-local-llm-runtime.md](./phase-05-local-llm-runtime.md) | llama.cpp sidecar 안정화 | yes |
| 6 | [phase-06-local-data-model.md](./phase-06-local-data-model.md) | SQLite local-first 확장 기반 | yes |
| 7 | [phase-07-mvp-closeout.md](./phase-07-mvp-closeout.md) | MVP 테스트/마감 | yes |
| 8 | [phase-08-web-supabase-foundation.md](./phase-08-web-supabase-foundation.md) | Web/Supabase 기반 | after MVP |
| 9 | [phase-09-sync-and-persona-cloud.md](./phase-09-sync-and-persona-cloud.md) | persona pull/safe summary sync | after MVP |
| 10 | [phase-10-ocr-vision-spike.md](./phase-10-ocr-vision-spike.md) | OCR/비전 실험 | after MVP |

---

## 3. Done Definition

각 phase는 아래 조건 없이는 완료로 보지 않는다.

- 관련 architecture 문서 링크가 있다.
- 구현 scope와 제외 scope가 있다.
- 데이터/보안 영향이 명시되어 있다.
- 최소 테스트가 정의되어 있다.
- `cargo check`, `cargo test`, `pnpm build` 중 해당 phase에 필요한 검증이 통과한다.
- release build는 명시 요청 없이는 실행하지 않는다.

---

## 4. Current Status

현재 repository 기준:

- Desktop MVP core는 상당 부분 완료된 상태다.
- Architecture contracts는 `docs/architecture/`에 중앙화되어 있다.
- Rust/React 도메인 모듈화가 진행되어 있다.
- 다음 핵심은 정책 계약을 실제 코드 타입과 테스트로 고정하는 것이다.

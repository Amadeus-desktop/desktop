# Local AI, OCR, And LLM Architecture

> OCR, Local LLM, provider routing, prompt/input boundary를 정의한다.

---

## 1. Local AI Role

Local AI는 desktop companion runtime을 보조한다.

Local AI가 한다:

- redacted context 해석
- persona tone 반영
- 짧은 utterance 생성
- safe work summary 후보 생성

Local AI가 하지 않는다:

- final speak decision
- capture decision
- OCR allow/deny decision
- raw screenshot 직접 처리
- raw OCR text 저장
- 작업 자동화 command 생성

---

## 2. Provider Routing

```text
TemplateProvider
  -> always available fallback

ApiProvider
  -> web/cloud chat or heavily redacted app utterance only

LocalLlamaProvider
  -> desktop redacted context utterance
```

Desktop app default policy:

- local-first mode: Local llama.cpp -> Template fallback
- api-first mode: API only receives coarse context -> Template fallback
- template mode: no LLM context

---

## 3. LlmInputEnvelope

Utterance provider calls must use `LlmInputEnvelope`. This document is the canonical source of truth for the utterance envelope shape.

```text
LlmInputEnvelope {
  provider_grade: Template | ApiRedacted | LocalRedacted
  persona_summary: Option<String>
  safe_memory_summary: Option<String>
  trigger_type: TriggerType
  trigger_reason: String
  tone_hint: String
  coarse_context_label: String
  redacted_window_title: Option<String>
  redacted_ocr_summary: Option<String>
  score_summary: PolicyScoreSummary
  fallback_message: String
}
```

Forbidden fields:

- raw screenshot
- raw OCR text
- raw window title
- full file path
- full URL
- token
- keystroke

Provider-grade field rules:

| Field | Template | API | Local llama.cpp |
| --- | --- | --- | --- |
| persona_summary | no | yes | yes |
| safe_memory_summary | no | yes, cloud-safe only | yes, local-safe only |
| trigger_reason | no | no | yes |
| tone_hint | no | no | yes |
| coarse_context_label | no | yes | yes |
| redacted_window_title | no | no | yes |
| redacted_ocr_summary | no | no | yes |
| score_summary | no | no | bucket only |
| fallback_message | yes | yes | yes |

---

## 4. LlmChatEnvelope

Chat provider calls must use `LlmChatEnvelope`, not raw `LlmChatRequest`.

```text
LlmChatEnvelope {
  provider_grade: Template | ApiRedacted | LocalRedacted
  messages: Vec<LlmChatMessage>
}
```

Provider-grade chat rules:

| Field | Template | API | Local llama.cpp |
| --- | --- | --- | --- |
| messages | last sanitized user message only | sanitized messages only | sanitized messages only |
| raw path / URL / token-like text | no | no | no |
| raw OCR text | no | no | no |

---

## 5. OCR Architecture

OCR is optional and gated.

```text
CaptureDecision
  -> CaptureAdapter
  -> PreOcrGate
  -> OcrAdapter
  -> in-memory sensitive scan
  -> redacted OcrObservation
```

`OcrObservation`:

```text
OcrObservation {
  text_summary_redacted
  visible_text_classes
  content_kind
  confidence
  sensitive_hits
  source_ttl_ms
}
```

`OcrObservation` does not include raw text.

---

## 6. OCR Provider Candidates

### Apple Vision

추천 MVP+1 후보.

이유:

- macOS-native
- Tauri/Rust adapter로 감싸기 쉬움
- 별도 Python runtime 불필요
- process-first 정책과 맞음

### Tesseract

후보.

장점:

- 오래 검증된 OCR engine
- CLI/lib 사용 가능

주의:

- UI screenshot OCR 품질은 sample benchmark 전까지 확실하지 않다.

### PaddleOCR

post-MVP 후보.

장점:

- document parsing과 구조화에 강함

주의:

- sidecar, model, memory, bundle size 비용이 큼

---

## 7. Prompt Policy

Prompt는 raw context를 포함하지 않는다.

Template:

```text
trigger_type + fallback_message
```

API:

```text
persona summary
trigger type
coarse context label
cloud-safe memory summary
```

Local:

```text
persona summary
trigger type
tone hint
redacted window title
redacted OCR summary
policy score summary
safe local memory summary
```

---

## 8. Local LLM Sidecar

llama.cpp sidecar는 앱이 lifecycle을 관리한다.

Required:

- configured binary path
- configured model path
- localhost-only host
- bounded port
- status command
- start/stop/restart on config change
- template fallback on failure

Security:

- arbitrary binary execution 금지
- allowed sidecar directory allowlist
- localhost-only endpoint
- no remote model URL auto-download in MVP

---

## 9. Summary Generation

Safe summary generation은 raw local context를 서버로 올리기 위한 단계가 아니다. 먼저 로컬에서 redaction과 policy gate를 통과해야 한다.

Summary 용어는 분리한다.

| Term | Sync | Storage | Meaning |
| --- | --- | --- | --- |
| SafeWorkSummary | optional allowed | `cloud_work_summaries` after ack | 작업 흐름의 비식별 요약 |
| CloudMemorySummary | allowed | `cloud_memories` | 선호/성향/관계성 요약 |
| OcrObservationSummary | MVP blocked | memory only | OCR 결과에서 나온 화면 내용 요약 |

`OcrObservationSummary`는 retention contract, user consent, redaction validator가 구현되기 전까지 `SafeWorkSummary`나 `CloudMemorySummary`로 승격할 수 없다.

```text
raw local events
  -> local summarizer
  -> sensitive scan
  -> SafeWorkSummary candidate
  -> user/policy allow
  -> sync_queue
```

Summary examples:

Allowed:

```text
사용자는 오늘 장시간 문서 작업을 했다.
```

Blocked:

```text
사용자는 지원사업_최종예산안_v3.xlsx를 편집했다.
```

---

## 9. Tests

- Local provider never receives raw title.
- API provider never receives OCR summary.
- Template provider never receives context.
- OCR raw text is dropped before observation leaves adapter.
- Sidecar config rejects non-localhost host.
- Sidecar config rejects binary outside allowed directory.
- Summary sync rejects file names and full URLs.

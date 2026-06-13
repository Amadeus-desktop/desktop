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

All provider calls must use `LlmInputEnvelope`.

```text
LlmInputEnvelope {
  provider_grade
  persona_summary
  trigger_type
  trigger_reason
  tone_hint
  coarse_context_label
  redacted_window_title
  redacted_ocr_summary
  score_summary
  fallback_message
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

---

## 4. OCR Architecture

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

## 5. OCR Provider Candidates

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

## 6. Prompt Policy

Prompt는 raw context를 포함하지 않는다.

Template:

```text
trigger_type + fallback_message
```

API:

```text
persona summary
trigger type
tone hint
coarse context label
safe memory summary
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

## 7. Local LLM Sidecar

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

## 8. Summary Generation

Safe summary generation은 raw local context를 서버로 올리기 위한 단계가 아니다. 먼저 로컬에서 redaction과 policy gate를 통과해야 한다.

```text
raw local events
  -> local summarizer
  -> sensitive scan
  -> safe summary
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

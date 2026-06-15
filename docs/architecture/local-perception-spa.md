# Local Perception Signal Architecture

> Amadeus의 로컬 인지 도메인을 감지, 캡처, OCR, 추론, 발화 정책으로 분리하는 아키텍처 문서.

---

## 1. 정의

이 문서에서 SPA는 웹 Single Page Application이 아니다.

SPA는 **Signal Processing Architecture**를 기본 의미로 사용한다. 하나의 로컬 인지 도메인을 여러 책임 단위로 나누고, 각 단위가 명확한 입력과 출력만 주고받게 만드는 설계 원칙이다.

**Separated Process Architecture**는 선택적 구현 전략이다. MVP 이후 실제 별도 프로세스로 분리할 대상은 Local LLM sidecar와 무거운 OCR 엔진처럼 crash isolation, resource budget, lifecycle 관리가 필요한 구성요소로 제한한다. Process, Policy, Capture decision은 먼저 Rust module boundary로 구현한다.

Amadeus의 로컬 인지 도메인은 다음 질문에 답한다.

- 지금 사용자가 어떤 흐름 안에 있는가?
- 화면 캡처가 필요한가?
- 화면 캡처가 허용되는가?
- OCR 또는 비전 모델을 돌릴 가치가 있는가?
- 지금 말을 걸어도 되는가?
- 말을 건다면 어느 강도로 해야 하는가?

---

## 2. 목표

### 2.1 목표

- 프로세스/창 기반 저비용 신호와 화면 캡처/OCR 기반 고비용 신호를 분리한다.
- 개인정보 위험이 있는 신호는 LLM보다 먼저 정책 엔진에서 차단한다.
- 로컬 LLM은 상황 해석을 돕지만, 최종 발화 결정권을 갖지 않는다.
- 캡처와 OCR 결과는 기본적으로 영구 저장하지 않는다.
- 듀얼 모니터, 음악 감상, 회의, 레퍼런스 브라우징 같은 예외 상황을 정책으로 설명 가능하게 만든다.

### 2.2 비목표

- 화면 전체를 상시 감시하지 않는다.
- 원본 스크린샷을 장기 저장하지 않는다.
- LLM이 임의로 캡처 권한을 요청하거나 우회하지 않는다.
- OCR 모델을 MVP 문서 단계에서 확정하지 않는다.
- 작업 자동화 에이전트처럼 파일, 코드, 앱을 조작하지 않는다.

---

## 3. 현재 기준선

### 사실

현재 구현된 흐름은 아래에 가깝다.

```text
macOS process/window/idle snapshot
  -> privacy assessment
  -> trigger candidate
  -> speakability score
  -> LLM/template utterance
  -> timeline persistence
```

현재 Rust 트리거 정책은 `privacy`, `daily_limit`, `cooldown`, `no_trigger` 억제 사유와 `NoAction`, `StatusOnly`, `Bubble`, `Conversation` 액션 밴드를 갖는다.

### 추정

이건 확인된 사실이 아니라 추정입니다. 실제 사용 환경에서는 process/window/idle만으로 아래 상황을 정확히 구분하기 어렵다.

- 음악 앱이 켜진 상태의 정상 작업
- 듀얼 모니터에서 자료 화면과 작업 화면을 오가는 흐름
- 브라우저, Figma, PDF, 터미널, 에디터를 반복해서 오가는 작업 흐름
- 회의 중 입력이 줄어든 상태
- YouTube 강의나 레퍼런스 영상 시청

---

## 4. SPA 구성

```text
Process SPA
  -> Policy Gate
  -> optional Capture/OCR
  -> PolicyScores
  -> Utterance Policy SPA
  -> LlmInputEnvelope
  -> Local Reasoning SPA
  -> Companion UI + Timeline
```

각 SPA는 독립적으로 테스트 가능해야 한다. 한 SPA의 내부 구현이 바뀌어도 외부 계약은 유지되어야 한다.

### 4.1 Source of Truth

최종 발화 결정의 source of truth는 Rust backend의 **Utterance Policy SPA**다.

LLM은 문장 생성과 tone 제안만 할 수 있다. LLM은 아래 결정을 직접 수행하거나 뒤집을 수 없다.

- privacy suppression
- capture allow/deny
- OCR allow/deny
- daily limit
- cooldown
- action band
- persistence decision

### 4.2 Process Boundary Policy

| 구성요소 | MVP 구현 경계 | 별도 프로세스 조건 |
| --- | --- | --- |
| Process SPA | Rust module | 별도 프로세스 금지 |
| Policy Gate | Rust module | 별도 프로세스 금지 |
| Capture SPA | Rust module + OS API adapter | 별도 프로세스 금지 |
| OCR/Vision SPA | Apple Vision adapter 우선 | PaddleOCR/Tesseract sidecar 채택 시 |
| Local Reasoning SPA | LLM provider adapter | llama.cpp sidecar 사용 시 |
| Utterance Policy SPA | Rust module | 별도 프로세스 금지 |

정책 결정은 프로세스 밖으로 빼지 않는다. 외부 프로세스가 죽어도 앱은 process-only, template utterance, no capture 상태로 degrade 해야 한다.

### 4.3 Concept-To-Code Mapping

| SPA concept | Rust module | owns | primary output |
| --- | --- | --- | --- |
| Process SPA | `macos_context` | active app/window/idle/history | `ProcessSnapshot`, `ProcessHistoryWindow` |
| Policy Gate | `privacy` + `trigger` policy helpers | privacy and capture/LLM gates | suppression reason, gate decisions |
| Capture SPA | future `capture` module | capture decision execution | capture metadata, no raw persistence |
| OCR/Vision SPA | future `ocr` module | OCR adapter and redaction | `OcrObservation` |
| Utterance Policy SPA | `trigger` | final action/persistence decision | `TriggerEvaluation` |
| Local Reasoning SPA | `llm` | provider message generation | generated message |
| Persistence | `timeline` | local event storage | context/utterance/reaction events |

---

## 5. Process SPA

### 책임

Process SPA는 항상 켜져 있어도 되는 저비용 신호만 수집한다.

- 활성 앱 이름
- bundle identifier
- 창 제목
- process id
- idle seconds
- frontmost duration
- 최근 앱 전환 히스토리
- 앱 카테고리
- 최근 발화 시각
- 최근 사용자 반응

### 금지

- 화면 픽셀을 읽지 않는다.
- OCR을 실행하지 않는다.
- LLM에 원본 창 제목을 무조건 넘기지 않는다.
- 발화 여부를 단독으로 확정하지 않는다.

### 출력

```text
ProcessSnapshot
ProcessHistoryWindow
ProcessSignals
```

### 5.1 ProcessHistoryWindow Contract

예외상황 정책은 단일 snapshot으로 판단하지 않는다. 최소 10분 rolling window를 사용한다.

```text
ProcessHistoryWindow {
  window_ms: u64,
  foreground_segments: Vec<ForegroundSegment>,
  app_switch_count: u32,
  work_cluster_duration_ms: u128,
  non_work_single_app_max_duration_ms: u128,
  known_meeting_app_frontmost: bool,
  known_music_app_seen: bool,
  known_music_app_frontmost_ms: u128,
}

ForegroundSegment {
  app_name: String,
  bundle_identifier: String,
  category: AppCategory,
  started_at_ms: u128,
  duration_ms: u128,
  redacted_window_title: String,
}
```

MVP에서는 `display_count`, 백그라운드 오디오 세션, 실제 듀얼 모니터 좌표 추적을 필수로 하지 않는다. 해당 신호가 없으면 `unknown`으로 처리하고 점수 보정에 사용하지 않는다.

---

## 6. Policy Gate

Policy Gate는 Capture, OCR, LLM보다 앞에 있다. 위험한 입력은 모델에 도달하기 전에 여기서 막는다.

### 억제 조건

- 민감 앱 또는 민감 창 제목
- 비밀번호, 결제, 은행, 병원, 인사평가, 개인정보 키워드
- 회의 앱 활성 상태
- 전체화면 영상 또는 발표 상태
- 사용자가 화면 인지를 끈 상태
- 권한 미허용 상태
- 최근 부정 반응이 누적된 상태

### 결정

```text
allow_process_only
allow_capture
allow_ocr
allow_reasoning
allow_utterance
```

Policy Gate의 결정은 LLM이 뒤집을 수 없다.

### 6.1 Three-Stage Privacy Boundary

프라이버시 경계는 한 번의 필터가 아니다. Capture 전, OCR 전, LLM 전 3단으로 나눈다.

```text
PreCaptureGate
  input: ProcessSnapshot + ProcessHistoryWindow + user settings
  output: CaptureDecision

PreOcrGate
  input: CaptureDecision + capture metadata
  output: OcrDecision

PreLlmGate
  input: ProcessSignals + OcrObservation redacted fields + PolicyScores + ProviderInputGrade
  output: LlmInputEnvelope
```

#### PreCaptureGate hard deny

아래 조건은 캡처 요청 자체를 만들지 않는다.

- `privacy_risk_score >= 70`
- `sensitive_context == true`
- `screen_capture_permission != granted`
- `user_screen_context_enabled == false`
- `known_meeting_app_frontmost == true`

#### PreOcrGate hard deny

아래 조건은 캡처 이미지가 있어도 OCR을 실행하지 않는다.

- 캡처 대상이 허용된 창/영역이 아니다.
- 캡처 TTL이 만료됐다.
- 캡처 metadata에 sensitive marker가 있다.
- OCR adapter가 timeout budget을 초과했다.

#### PreLlmGate hard deny

아래 데이터는 어떤 provider에도 전달하지 않는다.

- raw screenshot
- OCR raw text
- raw window title
- file path
- URL full path/query
- keystroke text

---

## 7. Capture SPA

### 책임

Capture SPA는 화면 캡처 실행 여부와 범위를 결정한다.

- 캡처 요청 수락 또는 거부
- 캡처 대상 범위 결정
- 캡처 TTL 결정
- 캡처 결과를 OCR/Vision SPA로 전달

Capture SPA는 `capture_value_score`를 계산하지 않는다. 캡처 실행 여부를 결정하기 전에 필요한 점수이므로 `Policy Gate`가 pre-capture 단계에서 계산한다.

### 캡처 원칙

- 기본은 process-only다.
- 캡처는 이벤트 기반으로만 실행한다.
- 전체 화면보다 허용된 창 또는 영역을 우선한다.
- 원본 이미지는 기본적으로 저장하지 않는다.
- 캡처 실패는 발화 실패가 아니라 confidence 하락으로 처리한다.

### 캡처 요청 조건

```text
capture_value_score >= 60
privacy_risk_score < 50
context_confidence_score < 70
user_screen_context_enabled == true
known_meeting_app_frontmost == false
```

### 캡처 금지 조건

```text
privacy_risk_score >= 70
known_meeting_app_frontmost == true
sensitive_context == true
screen_capture_permission != granted
```

---

## 8. OCR/Vision SPA

### 책임

OCR/Vision SPA는 캡처 이미지를 구조화된 로컬 신호로 바꾼다.

- OCR 텍스트 추출
- UI/문서/브라우저/영상 자막 같은 화면 유형 추정
- 민감 텍스트 재검사
- redacted summary 생성
- confidence score 계산

### 금지

- OCR 원문을 장기 저장하지 않는다.
- 민감 컨텍스트 OCR 결과를 LLM에 넘기지 않는다.
- OCR 결과만으로 발화를 확정하지 않는다.

### 출력

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

### 8.1 OCR Data Handling Contract

OCR adapter는 raw text를 반환할 수 있지만, raw text는 adapter boundary 밖으로 나갈 수 없다.

```text
Raw OCR text
  -> in-memory sensitive scan
  -> redacted summary
  -> raw text dropped
```

`OcrObservation`에는 raw text 필드를 두지 않는다. 테스트 fixture에서만 raw text를 파일로 둘 수 있고, fixture는 실제 사용자 캡처에서 생성하지 않는다.

---

## 9. OCR 후보

### 사실

- Apple Vision은 macOS의 Vision framework에 `VNRecognizeTextRequest` 텍스트 인식 API를 제공한다. 출처: https://developer.apple.com/documentation/vision/vnrecognizetextrequest
- Tesseract는 `libtesseract`와 CLI를 제공하는 오픈소스 OCR 엔진이며, README 기준 UTF-8과 100개 이상 언어를 지원하고 Apache 2.0 라이선스다. 출처: https://github.com/tesseract-ocr/tesseract
- PaddleOCR는 PDF/이미지를 JSON/Markdown 같은 LLM-ready 구조로 바꾸는 OCR/Document AI 툴킷이며, README 기준 100개 이상 언어 지원과 Apache 2.0 라이선스를 명시한다. 출처: https://github.com/PaddlePaddle/PaddleOCR

### 의견

MVP 이후 첫 구현 후보는 Apple Vision OCR이 가장 적합하다.

이유:

- macOS/Tauri 앱과 권한 모델이 자연스럽다.
- Python 런타임이나 대형 OCR 모델을 번들링하지 않아도 된다.
- process-first 정책과 잘 맞는다.
- 실패해도 앱 전체 구조를 무겁게 만들지 않는다.

PaddleOCR는 문서 구조화와 다국어 성능 후보로 가치가 있지만, sidecar, 모델 다운로드, 메모리, 번들 크기 정책을 먼저 해결해야 한다. Tesseract는 단순하고 검증된 선택지지만, 실시간 UI 화면 OCR 품질은 샘플 벤치마크 전까지 확정할 수 없다.

---

## 10. Local Reasoning SPA

### 책임

Local Reasoning SPA는 정책 엔진이 허용한 신호만 받아 상황 해석을 보조한다.

입력:

- process signals
- redacted OCR summary
- score signals
- recent reaction summary
- candidate trigger reason

출력:

- generated utterance message
- provider name
- optional tone used

### 금지

- 원본 스크린샷을 직접 받지 않는다.
- 개인정보 위험 정책을 우회하지 않는다.
- 발화 여부, action band, persistence 여부를 결정하지 않는다.
- score를 직접 보정하지 않는다.
- policy confidence를 보정하지 않는다.
- 사용자 파일 또는 앱 조작 명령을 생성하지 않는다.

### 10.1 Provider Input Grade

Provider별로 허용 입력 등급을 분리한다.

| Provider | 허용 입력 | 금지 입력 |
| --- | --- | --- |
| Template | trigger type, fallback message | window title, OCR summary, screenshot |
| API | trigger type, tone, coarse app category, redacted title class | raw title, OCR raw text, OCR summary, screenshot |
| Local llama.cpp | trigger type, tone, redacted title, redacted OCR summary, score signals | raw title, OCR raw text, screenshot |

API provider는 외부 전송 가능성이 있으므로 기본적으로 OCR summary를 받지 않는다. API가 필요하면 redacted summary 대신 coarse context label만 사용한다.

```text
coarse context label examples:
  coding
  writing
  design_reference
  meeting
  unknown
```

### 10.2 LlmInputEnvelope

`LlmInputEnvelope`의 canonical contract는 [local-ai-ocr-llm.md](./local-ai-ocr-llm.md)에 둔다. 이 문서는 perception gate가 envelope을 만들기 전에 raw input을 제거해야 한다는 책임만 정의한다.

---

## 11. Utterance Policy SPA

Utterance Policy SPA가 최종 발화 여부를 결정한다.

### 현재 액션 밴드

```text
80..100 -> Conversation
60..79  -> Bubble
40..59  -> StatusOnly
0..39   -> NoAction
```

### 최종 결정 순서

```text
1. privacy suppression
2. daily limit
3. cooldown
4. trigger candidate selection
5. score calculation
6. action band selection
7. persistence decision
```

LLM의 제안은 action band 이후의 message/tone 생성에만 사용할 수 있다. 1~7번 결정은 LLM이 뒤집을 수 없다.

---

## 12. Score Contract

모든 점수는 `0..100` 범위다.

### 12.1 PolicyScores Type

```text
PolicyScores {
  privacy_risk_score: i64,
  context_confidence_score: i64,
  attention_stability_score: i64,
  capture_value_score: i64,
  speakability_score: i64,
}
```

점수는 모두 계산 직후 `0..100`으로 clamp한다.

누락 신호 기본값:

| 신호 | 기본값 | 이유 |
| --- | --- | --- |
| privacy_risk_score | 50 | 모르면 안전 쪽으로 둔다 |
| context_confidence_score | 40 | 모르면 말하지 않는다 |
| attention_stability_score | 50 | 모르면 interrupt penalty를 주지 않는다 |
| capture_value_score | 0 | 모르면 캡처하지 않는다 |
| speakability_score | 0 | 모르면 말하지 않는다 |

### 12.2 Score Ownership

| 점수 | 계산 소유자 | 주요 입력 |
| --- | --- | --- |
| privacy_risk_score | Policy Gate | privacy assessment, app/window rules, user settings |
| context_confidence_score | Policy Gate | process history, OCR confidence, conflicting signals |
| attention_stability_score | Process SPA | work cluster, app switches, idle, meeting/media mode |
| capture_value_score | Policy Gate | low confidence, trigger candidate, privacy risk |
| speakability_score | Utterance Policy SPA | trigger base, policy scores, reaction feedback |

LLM은 점수 계산 소유자가 아니다.

### privacy_risk_score

높을수록 캡처와 발화가 위험하다.

| 점수 | 의미 | 정책 |
| --- | --- | --- |
| 0..29 | 낮음 | process, capture, OCR 가능 |
| 30..49 | 주의 | capture 가능, OCR 요약만 허용 |
| 50..69 | 높음 | process-only, proactive utterance 감점 |
| 70..100 | 매우 높음 | capture/OCR/utterance 차단 |

Privacy deny reason:

```text
70..100 -> PrivacyHardDeny
50..69  -> PrivacyProcessOnly
30..49  -> PrivacyCaution
0..29   -> PrivacyLow
```

### context_confidence_score

높을수록 현재 상황을 잘 이해했다.

| 점수 | 의미 | 정책 |
| --- | --- | --- |
| 0..39 | 이해 부족 | 발화 금지, 필요 시 capture_value 평가 |
| 40..59 | 낮은 확신 | StatusOnly 이하 |
| 60..79 | 충분 | Bubble 후보 가능 |
| 80..100 | 높음 | Conversation 후보 가능 |

### attention_stability_score

높을수록 사용자가 작업 흐름 안에 있다.

| 점수 | 의미 | 정책 |
| --- | --- | --- |
| 0..39 | 흐름 불안정 또는 이탈 | Drift 후보 가능 |
| 40..69 | 중립 | 기본 정책 유지 |
| 70..100 | 집중 흐름 | interrupt penalty 적용 |

### capture_value_score

높을수록 OCR/비전 분석을 할 가치가 있다.

| 점수 | 의미 | 정책 |
| --- | --- | --- |
| 0..39 | 가치 낮음 | 캡처하지 않음 |
| 40..59 | 보류 | 다음 poll까지 대기 |
| 60..79 | 가치 있음 | privacy가 낮으면 캡처 가능 |
| 80..100 | 가치 높음 | privacy가 낮으면 OCR 우선 |

### speakability_score

높을수록 지금 말 걸어도 된다.

| 점수 | 액션 |
| --- | --- |
| 0..39 | NoAction |
| 40..59 | StatusOnly |
| 60..79 | Bubble |
| 80..100 | Conversation |

---

## 13. Score Formula Draft

### 기본 공식

```text
speakability_score =
  trigger_base_score
  + context_confidence_bonus
  - privacy_penalty
  - interruption_penalty
  - recent_dismissal_penalty
  - cooldown_penalty
```

### 보정값

```text
context_confidence_bonus =
  +10 when context_confidence_score >= 80
  +5  when context_confidence_score >= 60
  0   otherwise

privacy_penalty =
  100 when privacy_risk_score >= 70
  30  when privacy_risk_score >= 50
  10  when privacy_risk_score >= 30
  0   otherwise

interruption_penalty =
  20 when attention_stability_score >= 80
  10 when attention_stability_score >= 70
  0  otherwise

recent_dismissal_penalty =
  min(recent_negative_reactions, 5) * 10
```

`cooldown_penalty`는 MVP에서는 hard suppression으로 처리한다. cooldown 중이면 `speakability_score = 0`, `suppression_reason = cooldown`이다.

### 현재 트리거 base score

```text
DeepPause -> 72
Milestone -> 82
Drift     -> 64
```

---

## 14. 예외 상황 정책

### 음악을 들으며 작업

```text
audio_background_mode = true
music_app_is_frontmost_short_duration = neutral
music_app_is_background = ignored_for_drift
```

음악 앱은 단독으로 Drift 근거가 되면 안 된다. 음악 앱이 잠깐 frontmost가 된 것은 작업 이탈이 아니라 제어 행위로 본다.

MVP 판정 기준:

```text
known_music_app_seen == true
known_music_app_frontmost_ms < 60_000
  -> no drift candidate
```

### 듀얼 모니터와 앱 왕복

```text
multi_app_workflow = true
work_app_cluster_duration >= 10 minutes
non_work_single_app_duration < drift_threshold
```

에디터, 브라우저, 터미널, Figma, PDF, Notion이 반복 등장하면 개별 앱 체류보다 workflow cluster를 우선한다.

MVP 판정 기준:

```text
work_cluster_duration_ms >= 10 minutes
app_switch_count >= 3
non_work_single_app_max_duration_ms < 10 minutes
  -> multi_app_workflow = true
  -> drift suppressed
```

### 회의 중 idle

```text
known_meeting_app_frontmost = true
capture = blocked
utterance = blocked
```

회의 중 idle은 멈춤이 아니라 듣기 또는 말하기일 수 있다.

MVP 판정 기준:

```text
known_meeting_app_frontmost == true
  -> deep_pause suppressed
  -> capture blocked
  -> utterance blocked
```

### 레퍼런스 영상 또는 강의

```text
media_learning_mode = possible
drift_base_score -= 15
capture_value_score += 10 only when privacy risk is low
```

YouTube나 영상 앱은 무조건 이탈로 보지 않는다. 직전 앱과 창 제목, 사용 시간, 사용자 반응을 같이 본다.

### 민감 업무

```text
sensitive_context = true
privacy_risk_score = 100
capture = blocked
ocr = blocked
utterance = blocked or status_only
```

---

## 15. 데이터 보존 정책

| 데이터 | 기본 저장 | 허용 조건 |
| --- | --- | --- |
| process snapshot | 허용 | redacted title 사용 가능 |
| app transition history | 허용 | 시간 범위 제한 |
| raw screenshot | 금지 | 디버그 플래그 + 명시 동의 시 임시 저장 |
| OCR raw text | 금지 | 테스트 fixture에서만 허용 |
| redacted OCR summary | MVP 저장 금지 | retention 필드 구현 후 허용 |
| LLM prompt | 원문 저장 금지 | redacted prompt hash만 허용 |
| utterance | 허용 | timeline event |
| user reaction | 허용 | score feedback |

### 15.1 Retention Contract

OCR summary를 timeline에 저장하려면 아래 필드가 먼저 DB 계약에 포함되어야 한다.

```text
retention_policy: Ephemeral | Session | Timeline
expires_at: Option<DateTime>
redaction_level: None | TitleRedacted | SummaryRedacted | SensitiveSuppressed
source_kind: Process | Capture | Ocr | Llm
```

이 필드가 구현되기 전에는 OCR summary를 SQLite에 저장하지 않는다.

---

## 16. Failure Mode

| 실패 | 처리 |
| --- | --- |
| screen capture permission denied | process-only, capture unavailable 기록 |
| OCR timeout | confidence 하락, 발화 강도 하향 |
| OCR sensitive hit | OCR 결과 폐기, privacy suppression |
| local LLM unavailable | template fallback 또는 no utterance |
| sidecar spawn failure | settings status에 노출, trigger는 template로 degrade |
| conflicting signals | context_confidence_score 하향 |
| repeated ignored reactions | speakability_score 하향 |

---

## 17. 테스트 시나리오

### 정책 단위 테스트

- privacy risk 70 이상이면 capture/OCR/utterance가 차단된다.
- daily limit 이상이면 trigger candidate가 있어도 말하지 않는다.
- cooldown 중이면 말하지 않는다.
- ignored/dismissed/closed 반응은 점수를 낮춘다.
- opened/replied 반응은 부정 반응 카운트를 초기화한다.

### 예외 상황 테스트

- Spotify/Apple Music이 background일 때 Drift가 발생하지 않는다.
- 음악 앱이 짧게 frontmost가 되어도 Drift가 발생하지 않는다.
- VS Code, Safari, Terminal을 반복하면 multi_app_workflow로 묶인다.
- Zoom/Meet/Teams가 활성인 경우 idle이 길어도 DeepPause가 발생하지 않는다.
- YouTube가 강의/레퍼런스 후보이면 Drift 점수가 낮아진다.
- 민감 창 제목이 있으면 OCR 요청이 생성되지 않는다.

### OCR 후보 벤치마크

샘플 세트:

- 코드 에디터 화면
- 브라우저 문서 화면
- Figma UI 화면
- PDF/논문 화면
- YouTube 자막 화면
- 한글/영문 혼합 화면
- 민감 키워드 포함 화면

평가:

- latency
- CPU 사용량
- 메모리 사용량
- 한글/영문 인식률
- UI 텍스트 위치 안정성
- 민감 텍스트 누락률
- 번들 크기 영향

---

## 18. 구현 순서

현재 Tauri 앱에 구현된 화면 캡처/OCR command와 권한 UX 기준은
[screen-capture-ocr-runtime.md](./screen-capture-ocr-runtime.md)에 둔다.

1. LLM input을 `LlmInputEnvelope`로 제한하고 raw window title 전달을 제거한다.
2. `ProcessHistoryWindow`와 `PolicyScores` 타입을 추가한다.
3. 예외 상황 단위 테스트를 process-only로 먼저 구현한다.
4. Capture decision을 구현하되 실제 캡처는 mock adapter로 둔다.
5. PreCaptureGate, PreOcrGate, PreLlmGate를 분리한다.
6. Apple Vision OCR spike를 별도 feature flag로 실험한다.
7. OCR 결과 redaction pipeline을 추가한다.
8. retention contract 구현 전까지 OCR summary 저장을 금지한다.
9. PaddleOCR/Tesseract는 post-MVP benchmark로만 검토한다.

---

## 19. 의사결정 원칙

- 말 잘 거는 것보다 괜히 끼어들지 않는 것이 우선이다.
- 캡처는 권한이 아니라 위험한 행동으로 취급한다.
- LLM은 조언자가 될 수 있지만 정책 결정자가 될 수 없다.
- 원본 화면 정보는 저장하지 않는 것이 기본값이다.
- 정책은 코드와 테스트로 고정해야 한다.

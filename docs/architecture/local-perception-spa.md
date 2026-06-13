# Local Perception SPA Architecture

> Amadeus의 로컬 인지 도메인을 감지, 캡처, OCR, 추론, 발화 정책으로 분리하는 아키텍처 문서.

---

## 1. 정의

이 문서에서 SPA는 웹 Single Page Application이 아니다.

SPA는 **Separated Process Architecture**이자 **Signal Processing Architecture**다. 하나의 로컬 인지 도메인을 여러 책임 단위로 나누고, 각 단위가 명확한 입력과 출력만 주고받게 만드는 설계 원칙이다.

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
  -> Capture SPA
  -> OCR/Vision SPA
  -> Local Reasoning SPA
  -> Utterance Policy SPA
  -> Companion UI + Timeline
```

각 SPA는 독립적으로 테스트 가능해야 한다. 한 SPA의 내부 구현이 바뀌어도 외부 계약은 유지되어야 한다.

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

---

## 7. Capture SPA

### 책임

Capture SPA는 화면 캡처 실행 여부와 범위를 결정한다.

- 캡처 요청 수락 또는 거부
- 캡처 대상 범위 결정
- 캡처 TTL 결정
- 캡처 결과를 OCR/Vision SPA로 전달

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
```

### 캡처 금지 조건

```text
privacy_risk_score >= 70
meeting_mode == true
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

- short situation interpretation
- suggested tone
- candidate utterance
- confidence adjustment proposal

### 금지

- 원본 스크린샷을 직접 받지 않는다.
- 개인정보 위험 정책을 우회하지 않는다.
- 발화 여부를 최종 결정하지 않는다.
- 사용자 파일 또는 앱 조작 명령을 생성하지 않는다.

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

LLM의 제안은 5번 이후 보정 입력으로만 사용할 수 있다. 1~3번 억제 정책은 LLM이 뒤집을 수 없다.

---

## 12. Score Contract

모든 점수는 `0..100` 범위다.

### privacy_risk_score

높을수록 캡처와 발화가 위험하다.

| 점수 | 의미 | 정책 |
| --- | --- | --- |
| 0..29 | 낮음 | process, capture, OCR 가능 |
| 30..49 | 주의 | capture 가능, OCR 요약만 허용 |
| 50..69 | 높음 | process-only, proactive utterance 감점 |
| 70..100 | 매우 높음 | capture/OCR/utterance 차단 |

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

### 듀얼 모니터와 앱 왕복

```text
multi_app_workflow = true
work_app_cluster_duration >= 10 minutes
non_work_single_app_duration < drift_threshold
```

에디터, 브라우저, 터미널, Figma, PDF, Notion이 반복 등장하면 개별 앱 체류보다 workflow cluster를 우선한다.

### 회의 중 idle

```text
meeting_mode = true
capture = blocked
utterance = blocked
```

회의 중 idle은 멈춤이 아니라 듣기 또는 말하기일 수 있다.

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
| redacted OCR summary | 허용 | TTL 또는 timeline metadata |
| LLM prompt | 원문 저장 금지 | redacted prompt hash만 허용 |
| utterance | 허용 | timeline event |
| user reaction | 허용 | score feedback |

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

1. Process history window 추가
2. policy score struct 추가
3. capture decision만 먼저 구현하고 실제 캡처는 mock으로 둔다
4. 예외 상황 단위 테스트 추가
5. Apple Vision OCR spike
6. OCR 결과 redaction pipeline 추가
7. Local Reasoning SPA 입력 계약 추가
8. LLM utterance prompt를 redacted context 중심으로 변경
9. PaddleOCR/Tesseract 벤치마크 후 optional sidecar 판단

---

## 19. 의사결정 원칙

- 말 잘 거는 것보다 괜히 끼어들지 않는 것이 우선이다.
- 캡처는 권한이 아니라 위험한 행동으로 취급한다.
- LLM은 조언자가 될 수 있지만 정책 결정자가 될 수 없다.
- 원본 화면 정보는 저장하지 않는 것이 기본값이다.
- 정책은 코드와 테스트로 고정해야 한다.

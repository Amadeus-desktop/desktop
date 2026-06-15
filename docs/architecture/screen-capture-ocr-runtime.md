# Screen Capture And OCR Runtime

> 현재 Tauri 앱의 화면 캡처/OCR 실행 흐름과 권한 UX 기준.

---

## 1. 목적

화면 캡처/OCR은 사용자의 작업 맥락을 더 잘 이해하기 위한 보조 신호다.

이 기능은 상시 감시, 생산성 평가, 작업 자동화, 원본 화면 저장을 위해 존재하지 않는다. MVP에서 OCR은 발화 판단이나 대화 맥락의 confidence를 보강하는 선택적 로컬 신호로만 사용한다.

---

## 2. 현재 구현 상태

현재 Rust/Tauri 쪽 구현 기준은 다음과 같다.

| 항목 | 구현 |
| --- | --- |
| Tauri command | `capture_primary_display_ocr` |
| OCR provider 상태 command | `get_ocr_provider_status` |
| 외부 이미지 OCR command | `recognize_captured_image` |
| 캡처 state | `ScreenCaptureState` |
| OCR state | `OcrState` |
| macOS 캡처 adapter | `MacosScreenCaptureAdapter` |
| non-macOS adapter | `DisabledScreenCaptureAdapter` |
| macOS 화면 권한 확인 | `CGPreflightScreenCaptureAccess()` |
| primary display capture | `core_graphics::display::CGDisplay::main().image()` |
| PNG encode | CoreGraphics `CGImageRef` -> ImageIO FFI -> in-memory `CFData` |
| OCR adapter | macOS Apple Vision adapter 우선 |

현재 캡처 범위는 primary display 전체다. 창 단위/영역 단위 캡처는 아직 구현하지 않는다.

---

## 3. 실행 흐름

`capture_primary_display_ocr`는 아래 순서로 동작한다.

```text
Frontend / Trigger
  -> capture_primary_display_ocr(nowMs)
  -> read_current_snapshot(ContextBridgeState)
  -> SettingsState.current()
  -> assess_privacy(snapshot, privacy_keywords_for(settings))
  -> get_screen_capture_permission_status()
  -> capture_gate_input_for_command(...)
  -> pre_capture_gate
  -> ScreenCaptureAdapter.capture_primary_display
  -> CaptureMetadata 생성
  -> pre_ocr_gate
  -> OcrAdapter.recognize_image_bytes
  -> redacted OcrObservation 반환
```

중요한 점은 실제 화면 픽셀 읽기는 `pre_capture_gate`를 통과한 뒤에만 발생한다는 것이다.

---

## 4. Pre-Capture Gate

캡처 전 gate 입력은 command boundary에서 구성한다.

```text
CaptureGateInput {
  privacy_risk_score,
  sensitive_context,
  screen_capture_permission_granted,
  user_screen_context_enabled,
  known_meeting_app_frontmost,
}
```

현재 command 기준 매핑:

| 필드 | 현재 기준 |
| --- | --- |
| `privacy_risk_score` | 민감/캡처 억제면 80, 아니면 10 |
| `sensitive_context` | `assessment.should_suppress_capture || assessment.is_sensitive` |
| `screen_capture_permission_granted` | macOS screen capture permission status |
| `user_screen_context_enabled` | `settings.analysis_enabled` |
| `known_meeting_app_frontmost` | 앱 이름에 Zoom, Microsoft Teams, Google Meet, Webex 포함 여부 |

다음 조건 중 하나라도 참이면 캡처하지 않는다.

- privacy risk가 70 이상이다.
- 현재 context가 민감하다.
- macOS 화면 기록 권한이 없다.
- 사용자가 화면 맥락 분석을 꺼두었다.
- 회의 앱이 frontmost다.

---

## 5. Capture Metadata And TTL

캡처 adapter는 OCR로 넘길 때 아래 metadata를 함께 만든다.

```text
CaptureMetadata {
  approved: true,
  captured_at_ms: now_ms,
  ttl_ms: 5_000,
  sensitive_marker: false,
}
```

현재 TTL은 5초다. OCR 실행 시점에 TTL이 만료되면 `pre_ocr_gate`가 OCR을 차단한다.

TTL 기준은 화면 내용이 빠르게 바뀌는 데스크톱 환경에서 오래된 캡처를 현재 맥락처럼 쓰지 않기 위한 안전장치다.

---

## 6. OCR Data Handling

OCR raw text는 OCR adapter boundary 밖으로 나가면 안 된다.

허용되는 반환값은 `OcrObservation`뿐이다.

```text
OcrObservation {
  text_summary_redacted,
  visible_text_classes,
  content_kind,
  confidence,
  sensitive_hits,
  source_ttl_ms,
}
```

금지:

- raw screenshot 저장
- raw screenshot 경로 저장
- raw OCR text 저장
- raw OCR text를 API provider로 전달
- raw OCR text를 timeline event payload에 넣기
- 민감 context OCR 결과를 LLM에 넘기기

MVP에서는 redacted OCR summary도 기본적으로 저장하지 않는다. 저장이 필요해지면 retention/source 필드가 DB 계약에 먼저 추가되어야 한다.

---

## 7. 권한 허용 UX

화면 권한은 앱 시작 시 바로 요청하지 않는다.

권장 UX:

```text
1. 기본 상태는 process-only mode
2. 사용자가 설정 또는 온보딩에서 "화면 맥락 인지 켜기"를 선택
3. 앱이 자체 설명 화면을 먼저 표시
4. 사용자가 계속 진행하면 macOS Screen Recording 권한 안내
5. 권한이 없거나 거절되면 process-only mode 유지
6. 권한이 허용되면 이벤트 기반 OCR만 실행
```

앱 설명 화면에는 반드시 아래 내용을 포함한다.

- 화면 캡처는 상시 실행되지 않는다.
- 트리거 후보가 있고 개인정보 필터를 통과한 경우에만 시도한다.
- 민감 앱/창에서는 캡처와 OCR을 하지 않는다.
- 원본 스크린샷과 OCR 원문은 저장하지 않는다.
- 설정에서 언제든 끌 수 있다.
- 권한이 없어도 앱은 기본 companion 기능으로 계속 동작한다.

사용자에게 보여줄 권장 문구:

```text
아마데우스는 화면을 계속 녹화하거나 저장하지 않습니다.
작업이 오래 멈춘 것 같거나, 긴 작업 세션이 이어지는 등 필요한 순간에만
현재 화면의 짧은 텍스트 단서를 로컬에서 읽어 맥락을 보강합니다.

비밀번호, 메신저, 이메일, 은행/결제, 인증 화면처럼 민감한 창에서는
캡처와 OCR을 실행하지 않습니다.

원본 스크린샷과 OCR 원문은 저장하지 않습니다.
이 기능은 설정에서 언제든 끌 수 있습니다.
```

---

## 8. 권한 상태별 동작

| 상태 | 앱 동작 |
| --- | --- |
| 권한 미확인 | 기능 설명을 먼저 보여준다. 시스템 권한 요청을 즉시 띄우지 않는다. |
| 권한 없음 | process-only mode로 동작한다. 캡처/OCR command는 `screen_capture_permission_missing`으로 실패한다. |
| 권한 허용 | pre-capture gate를 통과한 이벤트에서만 캡처/OCR을 시도한다. |
| 사용자가 분석 끔 | `screen_context_disabled`로 캡처를 차단한다. |
| 민감 창 감지 | `sensitive_context`로 캡처를 차단한다. |
| 회의 앱 frontmost | `meeting_frontmost`로 캡처를 차단한다. |

권한이 없거나 기능이 꺼져도 trigger engine은 macOS process/window/idle 신호만으로 동작해야 한다. 이 상태를 process-only mode라고 부른다.

---

## 9. 타임라인 기록 기준

타임라인에 기록할 수 있는 값:

- OCR 시도 여부
- OCR 성공/실패 여부
- suppression reason
- permission status bucket
- privacy filter 적용 여부
- redaction level
- confidence bucket

타임라인에 기록하면 안 되는 값:

- raw screenshot
- screenshot path
- raw OCR text
- 민감 window title
- 파일 경로
- URL query
- token/password 형태 문자열

---

## 10. 실패 처리

OCR 실패는 발화 실패가 아니다.

| 실패 | 처리 |
| --- | --- |
| 화면 권한 없음 | process-only mode 유지 |
| 캡처 실패 | OCR context 없이 진행 |
| PNG encode 실패 | OCR context 없이 진행 |
| OCR adapter unavailable | OCR context 없이 진행 |
| TTL 만료 | OCR 차단 |
| 민감 hit 증가 | OCR 결과 폐기, privacy suppression |

발화 시스템은 OCR에 의존하면 안 된다. OCR은 항상 optional context다.

---

## 11. 다음 구현 과제

1. macOS 권한 안내 command를 분리한다.
2. 설정 UI에 화면 맥락 인지 토글과 권한 상태를 표시한다.
3. 권한 없음 상태에서 System Settings로 이동하는 안내를 제공한다.
4. `capture_primary_display_ocr` 호출 결과를 trigger pipeline에 optional context로 연결한다.
5. primary display 전체 캡처 대신 window/region 캡처 가능성을 검토한다.
6. OCR summary 저장 전 retention/source DB 계약을 먼저 구현한다.
7. Apple Vision OCR runtime을 실제 화면 샘플로 benchmark한다.

---

## 12. 관련 문서

- [policy-and-security.md](./policy-and-security.md)
- [local-perception-spa.md](./local-perception-spa.md)
- [local-ai-ocr-llm.md](./local-ai-ocr-llm.md)
- [mvp.md](../prd/mvp.md)

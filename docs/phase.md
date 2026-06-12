# [Phase] 아마데우스 MVP 구현 단계

> MVP 기준 구현 순서와 각 단계의 완료 조건

---

## 0. Phase 설계 원칙

아마데우스 MVP는 UI, macOS 컨텍스트, 개인정보, 트리거, LLM이 서로 강하게 연결된다. 따라서 전체 기능을 한 번에 구현하지 않고, 매 phase마다 작동 가능한 산출물을 만든다.

구현 순서는 Risk-first Vertical Slice를 따른다.

1. 사용자가 보는 companion UX를 먼저 만든다.
2. 로컬 타임라인과 저장소를 만든다.
3. 실제 macOS 컨텍스트를 붙인다.
4. 권한과 개인정보 필터를 붙인다.
5. 트리거와 발화 허용도 판단을 붙인다.
6. LLM provider를 붙인다.
7. end-to-end MVP를 검증한다.

---

## Phase 0. Foundation

### 목표

Tauri 기반 데스크톱 앱이 로컬에서 안정적으로 실행되고 빌드되는 상태를 만든다.

### 범위

- Tauri 2 기반 앱
- React + Vite + Tailwind CSS v4
- pnpm 기반 패키지 관리
- Rust backend
- macOS 우선 설정
- 기본 앱 아이콘
- `pnpm tauri` 실행 경로

### 완료 조건

- `pnpm build`가 통과한다.
- `cargo check --manifest-path src-tauri/Cargo.toml`이 통과한다.
- `pnpm tauri`로 개발 앱이 실행된다.
- 앱 이름이 `Amadeus`로 표시된다.

### 현재 상태

이 phase는 기반 작업이 진행된 상태다.

다음 phase 전 확인할 항목:

- `templete.html`의 시각 형식을 React/Tailwind 컴포넌트로 옮길 단위 확정

---

## Phase 1. Companion Shell

### 목표

실제 OS 컨텍스트 없이도 아마데우스의 핵심 표면을 확인할 수 있는 companion UI를 만든다.

### 범위

- 우측 하단 companion 위젯
- 작은 캐릭터 또는 상태 오브젝트
- 페이드인 말풍선
- 말풍선 자동 사라짐
- 클릭 시 미니 채팅 패널 열림
- mock trigger 버튼 또는 내부 timer 기반 테스트 트리거
- `templete.html`의 형식과 무드 반영

### UI 기준

UI는 프로젝트 루트의 `templete.html`을 기준으로 맞춘다. 이 파일은 macOS glassmorphism 제어 센터 형식을 가진다.

적용 기준:

- 색상
- 여백
- 타이포그래피
- 카드/말풍선 형태
- 애니메이션 속도
- 우측 하단 배치 밀도
- 좌측 사이드바 탭 구조
- 캐릭터 선택 카드
- iOS 스타일 토글
- 인지 로그 패널
- 타임라인 패널

### 완료 조건

- 위젯이 화면 우측 하단에 고정된다.
- 메인 작업 영역을 크게 가리지 않는다.
- mock trigger로 말풍선이 페이드인된다.
- 말풍선은 자동으로 사라진다.
- 클릭하면 채팅 패널이 열린다.
- `templete.html`의 시각 형식과 크게 어긋나지 않는다.

### 제외

- 실제 macOS 앱/창 감지
- 실제 LLM 호출
- 실제 DB 저장

---

## Phase 2. Local Timeline Core

### 목표

능동 발화의 근거와 사용자 반응을 로컬 SQLite에 저장하고, 최소 타임라인 UI로 보여준다.

### 범위

- SQLite 로컬 DB
- Drizzle ORM 구성
- Drizzle schema
- migration 관리
- event repository
- timeline repository
- 발화 이벤트 저장
- 사용자 반응 저장
- 타임라인 UI 최소 구현

### Drizzle 기준

Drizzle은 schema, migration, 타입 기준의 source of truth로 사용한다. Tauri React 프론트엔드는 Node 런타임이 아니므로 Node 전용 SQLite 드라이버에 의존하지 않는다.

런타임 SQLite 파일 접근은 Rust backend의 Tauri command를 통해 수행한다. Frontend는 repository interface를 호출하고, repository는 Tauri command를 통해 읽기/쓰기를 위임한다.

초기 테이블:

```text
context_events
  - id
  - occurred_at
  - app_name
  - window_title
  - event_type
  - metadata_json

utterance_events
  - id
  - occurred_at
  - trigger_type
  - speakability_score
  - message
  - provider
  - context_event_id

user_reactions
  - id
  - occurred_at
  - utterance_event_id
  - reaction_type
```

### 완료 조건

- Drizzle schema가 정의되어 있다.
- Drizzle migration이 생성되어 있다.
- Rust backend가 migration 결과와 호환되는 SQLite 테이블에 접근할 수 있다.
- mock context event를 DB에 저장할 수 있다.
- mock utterance event를 DB에 저장할 수 있다.
- 말풍선 클릭/닫기/무시 반응을 저장할 수 있다.
- 타임라인 화면에서 최근 이벤트를 볼 수 있다.
- DB schema, migration, Tauri command contract가 저장소에 포함된다.

### 제외

- macOS native event 직접 수집
- 복잡한 리포트
- 데이터 동기화

---

## Phase 3. macOS Context Bridge

### 목표

Rust backend에서 macOS 작업 맥락 신호를 수집하고 frontend로 전달한다.

### 범위

- 활성 앱 이름 수집
- 활성 창 제목 수집
- 앱 전환 이벤트 감지
- 전면 앱 유지 시간 계산
- idle 상태 감지
- 업무 앱/비업무 앱 분류 초안
- context event 저장 연동

### macOS Native API 방향

사용 가능한 방향:

- NSWorkspace 계열 API로 활성 앱 및 앱 전환 감지
- CGWindowList 계열 API로 창 제목/창 정보 확인
- idle 상태는 macOS 이벤트 또는 시스템 idle time 기반으로 산출

Phase 3의 기본 구현은 NSWorkspace 기반 앱 감지와 CGWindowList 기반 창 정보 수집으로 시작한다. idle 상태는 macOS 시스템 idle time 또는 이벤트 소스 기반 idle time 중 권한 요구가 더 낮고 안정적인 방식을 선택한다.

### 완료 조건

- 현재 활성 앱 이름이 UI에 표시된다.
- 현재 창 제목이 UI에 표시된다.
- 앱 전환 시 context event가 저장된다.
- idle 후보 상태를 계산할 수 있다.
- 업무/비업무 앱 분류를 수동 맵으로 적용할 수 있다.

### 제외

- 화면 캡처
- 비전 모델 분석
- 자동 앱 분류 고도화

---

## Phase 4. Privacy & Permission

### 목표

화면 인지에 대한 신뢰를 만들고, 민감 앱/창에서 캡처와 발화를 억제한다.

### 범위

- 화면 인지 권한 온보딩
- 권한 상태 표시
- 민감 앱/창 블랙리스트
- 사용자 지정 민감 키워드
- 민감 상태에서 캡처 차단
- 민감 상태에서 발화 억제
- 타임라인에 필터 적용 여부 표시

### 기본 민감 범주

- 비밀번호 관리자
- 은행/결제
- 메신저
- 이메일
- 의료/정부/인증 관련 창
- 사용자가 직접 추가한 앱/창 키워드

### 완료 조건

- 사용자가 화면 인지 권한의 의미를 이해할 수 있다.
- 민감 앱/창으로 분류되면 발화 후보가 생성되지 않는다.
- 민감 필터 적용 여부가 타임라인에 남는다.
- 원본 스크린샷을 저장하지 않는 정책이 UI에 명시된다.

### 제외

- 완전한 개인정보 자동 탐지
- 클라우드 기반 민감정보 분류

---

## Phase 5. Trigger Engine

### 목표

수집된 context event를 바탕으로 능동 발화 후보를 만들고, Speakability Score로 실제 발화 여부를 결정한다.

### 범위

- Deep Pause Trigger
- Milestone Trigger
- Drift Trigger
- Speakability Score 계산
- 최근 발화 cooldown
- 하루 발화 횟수 제한
- 무시/닫기 반응 기반 자동 하향
- trigger event 저장

### 트리거 기준

Deep Pause:

- 업무 앱 전면
- 같은 앱/창 10분 이상
- 최근 2~5분 입력 거의 없음
- 최근 30분 내 능동 발화 없음
- 전체화면, 회의, 영상, 민감 앱 아님

Milestone:

- 업무 앱 누적 60/90/120분
- 중간 이탈 짧음
- 최근 발화 없음
- 이전 격려 발화에 부정 반응 적음

Drift:

- 업무 세션 중 비업무 앱/사이트로 전환
- 10~20분 이상 지속
- 휴식 모드 아님
- 하루 Drift 발화 제한 미초과

### 완료 조건

- mock context event로 각 트리거 후보를 만들 수 있다.
- 실제 context event로 각 트리거 후보를 만들 수 있다.
- Speakability Score가 0~100 범위로 계산된다.
- 점수 구간에 따라 아무것도 안 함/상태 변화/말풍선/대화 확장이 구분된다.
- 무시 반응이 누적되면 발화 빈도가 낮아진다.

### 제외

- ML 기반 트리거 학습
- 사용자별 장기 최적화 모델

---

## Phase 6. LLM Provider

### 목표

능동 발화와 기본 대화를 생성하는 LLM provider 구조를 만든다.

### 범위

- LLM Provider Adapter
- API provider
- Local llama.cpp provider
- provider 설정 저장
- provider 실패 처리
- 짧은 능동 발화 생성
- 미니 채팅 응답 생성

### Provider 구조

```text
LlmProvider
  - generateUtterance(context)
  - generateChatReply(messages, context)

ApiLlmProvider
LocalLlamaProvider
```

기본값은 API provider다. LocalLlamaProvider는 llama.cpp sidecar를 통해 실행한다.

### 완료 조건

- API provider로 짧은 능동 발화를 생성할 수 있다.
- LocalLlamaProvider가 실행 가능 상태인지 확인할 수 있다.
- LocalLlamaProvider로 짧은 테스트 발화를 생성할 수 있다.
- provider 실패 시 UI가 조용히 상태를 표시하고 능동 발화를 중단한다.
- provider 구현이 trigger engine과 분리되어 있다.

### 제외

- 고품질 장문 대화
- 복잡한 메모리 시스템
- 모델 다운로드 매니저
- 온디바이스 비전 모델

---

## Phase 7. MVP Integration

### 목표

컨텍스트 수집부터 능동 발화, 사용자 반응, 타임라인 저장까지 end-to-end 흐름을 완성한다.

### 범위

- macOS context event 수집
- 개인정보 필터 적용
- trigger engine 실행
- Speakability Score 판단
- LLM provider 발화 생성
- companion shell 말풍선 표시
- 사용자 반응 저장
- 타임라인 표시
- MVP 가드레일 확인

### End-to-End 흐름

```text
macOS context signal
  -> privacy filter
  -> context event
  -> trigger engine
  -> Speakability Score
  -> LLM provider
  -> companion UI
  -> user reaction
  -> timeline
```

### 완료 조건

- 사용자가 먼저 입력하지 않아도 능동 발화가 발생한다.
- Deep Pause, Milestone, Drift 중 최소 2개가 실제 context event 기반으로 동작한다.
- 민감 앱/창에서는 발화가 억제된다.
- 발화 근거가 타임라인에 남는다.
- 말풍선을 무시하거나 닫으면 이후 발화가 줄어든다.
- `pnpm build`가 통과한다.
- `cargo check --manifest-path src-tauri/Cargo.toml`이 통과한다.
- `pnpm tauri`로 앱이 실행된다.

---

## MVP 이후 Phase

### Phase 8. Personality Expansion

- 장난기 있는 친구형 캐릭터
- 집중 코치형 캐릭터
- 말투 선택
- 캐릭터별 발화 정책

### Phase 9. Care Mode & Reports

- 야간 케어 모드
- 누적 집중 리포트
- 일/주 단위 요약
- 발화 적시성 피드백

### Phase 10. Advanced Local-first

- local-first provider 기본값 전환 검토
- 온디바이스 소형 비전 모델 검토
- 모델 다운로드/관리 UX
- 비용 최적화

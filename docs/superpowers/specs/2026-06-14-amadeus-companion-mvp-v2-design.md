# Amadeus Paper Companion MVP v2 설계

## 목표

PRD v2의 desktop companion interaction을 React state와 mock data만으로 구현한다.

이번 MVP v2의 목표는 native capture, Supabase sync, SQLite persistence, Local LLM runtime을 증명하는 것이 아니다. 목표는 다음 제품 흐름을 검증하는 것이다.

```text
quiet presence
  -> subtle new note
  -> short NudgeNote
  -> user-opened PocketChat
  -> user-initiated DeepChat
  -> Daily Care Note preview
  -> persona/world-tone mock reply
```

핵심은 Amadeus가 먼저 다가올 때는 짧은 메모만 남기고, 사용자가 명시적으로 열거나 답했을 때만 깊어지는 구조다.

이번 UI 방향은 `grug`를 그대로 복제하지 않는다. 대신 Apple Design Awards의 grug 평가에서 드러난 원칙을 Amadeus에 맞게 번역한다.

- 앱 전체가 하나의 작은 세계처럼 느껴져야 한다.
- 완벽하게 polished한 SaaS panel보다 사람 손의 흔적이 있는 쪽지를 우선한다.
- 기능 설명보다 감정적 저압감과 단순함을 우선한다.
- 관련 없는 요소를 줄이고, 필요한 순간에만 작은 상호작용을 연다.
- 손으로 그린 듯한 선, 종이 질감, 작은 낙서 같은 디테일은 장식이 아니라 제품 언어다.

참고한 사실:

- Apple Design Awards 2026은 grug를 기쁨과 재미 부문 앱 수상작으로 소개했다.
- Apple은 grug의 낙서한 듯한 디자인, 손으로 그린 상태바와 release note, 로그인/클라우드 동기화 없는 단순함을 특징으로 언급했다.
- grug 팀은 기존 손글씨 폰트가 너무 깨끗해 보여 직접 그린 글자 기반 rendering system을 만들었다고 설명했다.

## Paper Companion UI 철학

Amadeus floating UI는 채팅창이 아니다. 작업 화면 위에 잠깐 얹히는 단계형 companion note다.

한 줄 원칙:

```text
Icon은 존재감, Badge는 메모 도착, NudgeNote는 초대장,
PocketChat은 작은 방, DeepChat은 관계의 확장,
Daily Care Note는 함께 있었던 기록.
```

시각 키워드:

- 조용한 메모
- 사람이 남긴 쪽지
- 작은 종이 대화방
- 손으로 그은 듯한 구분선
- 낮은 대비의 잉크 텍스트
- 따뜻하지만 과하지 않음

지양:

- 앱 안의 일반 채팅 패널
- glassmorphism dashboard
- AI prompt box
- `Deep Context`, `local mock` 같은 기술어 노출
- 빨간 숫자 notification badge
- 큰 캐릭터 이미지
- 강한 glow, 반복 진동, 과한 spring animation

## 범위

포함한다:

- React-only companion interaction state.
- `CompanionMode` 계약:

```ts
type CompanionMode =
  | "quiet"
  | "new_note"
  | "nudge"
  | "pocket"
  | "deep"
  | "daily_care"
  | "sleep";
```

- 모니터 좌측하단 기준 floating message icon.
- 빨간 숫자 배지나 깜빡임 없는 조용한 새 메모 표시.
- 1~2문장 이하의 짧은 `NudgeNote`.
- 사용자 액션으로만 열리는 `PocketChat`.
- 사용자 입력 후에만 진입하는 `DeepChatView`.
- Phase v3를 위한 mock `DailyCareNotePreview`.
- mock persona 전환:
  - `warm_friend`
  - `fantasy_guardian`
- mock provider 함수:

```ts
function generateNudge(triggerType, persona) {}
function generatePocketIntro(nudge, persona) {}
function generateDeepReply(userInput, persona, mockMemory, mockWorld) {}
```

- React state 기반 local debug timeline.
- 사용자에게 보이는 context status는 감성 문구로 표시.
- 개발자용 debug timeline은 product UI보다 작고 낮은 위계로 표시.

제외한다:

- Supabase persona pull.
- Supabase memory sync.
- SQLite persistence.
- Local LLM 또는 llama.cpp runtime 연동.
- macOS OCR/screen capture 연동.
- 이번 PRD v2 UI pass에서 Rust trigger engine 연동.
- release packaging.

## 제품 규칙

Amadeus가 능동적으로 열 수 있는 단계는 `new_note` 또는 `nudge`까지다.

`pocket`은 사용자가 note 또는 icon을 클릭해야 열린다. `deep`은 사용자가 직접 입력하거나 제출해야 진입한다.

UI는 시스템 알림이 아니라 조용히 남긴 종이 쪽지처럼 느껴져야 한다.

- 중앙 모달 금지
- 큰 캐릭터 이미지 금지
- 긴급한 빨간 배지 금지
- 숫자 notification count 금지
- 깜빡이는 애니메이션 금지
- 강제 deep conversation 금지
- 메인 앱 frame 안에 갇힌 채팅창처럼 보이는 구성 금지
- `무엇을 도와드릴까요?`, `프롬프트를 입력하세요` 같은 assistant/prompt 문구 금지

Nudge 문구는 짧아야 한다. Deep reply는 더 길 수 있지만, 작업 자동화 agent가 아니라 companion으로 응답해야 한다.

## 위치와 Tauri 창 전략

최종 제품에서는 companion UI를 main control window 안에 넣지 않는다. 별도의 transparent floating companion window로 분리하는 것이 목표다.

MVP 구현 순서:

1. React preview에서 위치와 visual language를 먼저 좌측하단 floating 기준으로 수정한다.
2. Tauri window config 또는 runtime window API로 companion 전용 창을 분리한다.
3. monitor work area 기준으로 좌측하단 position을 계산하고, main app과 독립된 overlay처럼 동작하게 한다.

주의:

- macOS transparent window는 Tauri 문서상 `macOSPrivateApi` 관련 제약과 App Store 제출 제한 경고가 있다.
- 따라서 MVP에서는 먼저 일반 transparent-ish preview로 UI를 검증하고, 배포 전략이 결정된 뒤 창 투명도/always-on-top 정책을 확정한다.
- floating companion window는 작업 방해를 줄이기 위해 기본 크기를 작게 유지하고, 사용자가 연 상태에서만 단계적으로 커져야 한다.

## 상태별 시각 크기

| 상태 | 목표 크기 | 사용자 느낌 |
| --- | ---: | --- |
| `quiet` | 40~48px | 조용히 있음 |
| `new_note` | icon + 작은 dot/fold | 뭔가 남겨둠 |
| `nudge` | 220~280px / 60~100px | 작은 종이 메모 |
| `pocket` | 320~360px / 360~440px | 작은 종이 대화방 |
| `deep` | 340~380px / 420~520px | 조금 더 깊게 듣는 노트 |
| `daily_care` | 360~420px / 480~560px | 하루 회고 카드 |
| `sleep` | 40~48px, 흐린 상태 | 쉬고 있음 |

크기는 단계적으로 커져야 한다. `new_note`에서 바로 큰 chat panel이 뜨면 실패다.

## 컴포넌트 설계

### `CompanionShell`

MVP v2 상태 머신과 local timeline을 소유한다.

책임:

- 현재 `CompanionMode` 보관.
- 선택된 persona 보관.
- active nudge와 pocket intro 보관.
- chat messages 보관.
- draft input 보관.
- local timeline event append.
- 사용자 액션을 다음 mode로 라우팅.
- `daily_care` preview 진입 상태 보관.

이번 MVP pass에서는 Supabase, SQLite, native command, Local LLM 코드를 호출하지 않는다.

### `FloatingMessageIcon`

좌측 하단 floating entry point다.

책임:

- `quiet`, `new_note`, `sleep`에서 message icon 표시.
- `new_note`에서 조용한 dot/fold badge 표시.
- 현재 mode에 따라 명시적 클릭으로 `nudge` 진입.
- 아이콘 자체도 완성된 앱 버튼보다 접힌 쪽지나 작은 메모 아이콘에 가까워야 한다.

시각 조건:

- 40~48px.
- 낮은 대비.
- 빨간색 금지.
- 과한 shadow/glow 금지.

### `NudgeNote`

`nudge`에서 보이는 짧은 종이 메모다.

책임:

- active nudge 표시.
- 클릭 시 `PocketChat` 열기.
- dismiss 허용.
- 입력창을 절대 포함하지 않음.

timeline event:

- `nudge_shown`
- `note_clicked`
- `dismissed`
- `ignored`

`ignored`는 자동 닫힘 또는 demo action에서 기록할 수 있다. 단, 자동 닫힘을 넣더라도 수동 QA 흐름을 방해하면 안 된다.

시각 조건:

- 종이 카드 또는 sticky note 느낌.
- 1~2문장.
- 큰 header 없음.
- 닫기 버튼은 작고 낮은 위계.

### `PocketChat`

`pocket`에서 보이는 작은 좌측하단 종이 대화방이다.

책임:

- persona 이름 표시.
- active nudge에서 생성된 pocket intro 표시.
- placeholder가 `한마디만 남겨도 괜찮아`인 input 제공.
- 사용자가 입력을 제출하면 `deep`으로 전환.
- `Deep Context`, `local mock` 같은 기술어를 사용자 UI에 노출하지 않음.

timeline event:

- `pocket_opened`
- `user_input`

상단 문구:

```text
아마
조용히 곁에 있음
```

또는:

```text
아마
방금 남긴 메모에서 이어지는 중
```

나쁜 placeholder:

```text
무엇을 도와드릴까요?
프롬프트를 입력하세요
질문을 입력하세요
```

### `DeepChatView`

사용자 입력 이후 같은 companion panel 안에서 깊어진 상태다.

책임:

- 사용자 message 유지.
- 선택된 persona와 world tone을 반영한 mock companion reply 추가.
- 메인 앱 페이지를 열지 않고 companion panel 안에서 대화 유지.
- 상태 표시를 기술어가 아니라 감성 문구로 변경.

timeline event:

- `deep_reply`

상태 문구:

```text
조금 더 깊게 듣는 중
네 이야기로 이어지는 중
```

### `PersonaSwitcher`

개발/시연용 control이다.

책임:

- `warm_friend`와 `fantasy_guardian` 전환.
- QA에서 현재 persona를 확인할 수 있게 표시.
- 실제 제품의 primary UI처럼 커지지 않게 유지.

### `ContextStatus`

현재 hydration depth를 사용자 언어로 표시한다.

| Mode | Indicator |
| --- | --- |
| `quiet`, `new_note`, `nudge` | 조용히 곁에 있음 |
| `pocket` | 방금 남긴 메모에서 이어지는 중 |
| `deep` | 조금 더 깊게 듣는 중 |
| `daily_care` | 오늘을 같이 접는 중 |
| `sleep` | 쉬는 중 |

### `LocalTimeline`

MVP 검증용 debug panel이다. 단, 제품 UI보다 작고 낮은 위계여야 한다.

다음 이벤트가 발생하면 표시해야 한다.

- `nudge_shown`
- `note_clicked`
- `pocket_opened`
- `user_input`
- `deep_reply`
- `daily_care_opened`
- `dismissed`
- `ignored`

이번 MVP v2 pass에서 timeline은 영속 저장하지 않는다.

### `DailyCareNotePreview`

Phase v3 preview다. 전체 기능으로 완성하지 않고, mock button 또는 preview entry를 통해 확인 가능한 수준으로만 둔다.

진입 문구:

```text
오늘 꽤 힘냈어.
네가 노력한 거 같이 확인해볼까?
```

preview card 구성:

```text
오늘도 수고했어

함께 있었던 시간
2시간 40분

아마가 남긴 메모
3개

오늘의 감정 키워드
버팀 · 막힘 · 다시 시작

아마의 한마디
"완벽한 하루는 아니었어도, 오늘 너는 다시 돌아왔어."
```

Daily Care Note는 생산성 리포트가 아니라 정서적 회고다.

## Mock Provider 계약

mock provider는 pure TypeScript로 둔다. global UI state를 읽거나 native command를 호출하지 않는다.

### `generateNudge(triggerType, persona)`

입력:

- `deep_pause` 같은 trigger type
- 선택된 persona

출력:

- 1~2문장 이하
- 작업 명령 금지
- 강제 대화 유도 금지

예시:

```text
오래 붙잡고 있었네. 숨만 한 번 고르고 가자.
```

### `generatePocketIntro(nudge, persona)`

입력:

- active nudge text
- 선택된 persona

출력:

- note를 자연스럽게 이어받되 과하게 깊어지지 않는 첫 message

예시:

```text
아까부터 조금 힘들어 보여서 그냥 지나가긴 좀 그랬어.
```

### `generateDeepReply(userInput, persona, mockMemory, mockWorld)`

입력:

- user input
- 선택된 persona
- mock memory
- mock world

출력:

- persona-specific response
- `warm_friend`는 현실적인 다정한 친구 톤
- `fantasy_guardian`은 보호자형 판타지 world tone

같은 입력이어도 두 persona의 응답은 명확히 달라야 한다.

예시 입력:

```text
과제하고 있는데 힘들어
```

예상 tone 차이:

- `warm_friend`: 일상적인 표현, 낮은 압박, 실용적인 다정함
- `fantasy_guardian`: 보호자 은유, world tone, 과장되지 않은 장르성

## 상태 흐름

주 흐름:

```text
quiet
  -> new_note
  -> nudge
  -> pocket
  -> deep
  -> daily_care
```

보조 흐름:

```text
nudge -> quiet     dismiss
nudge -> quiet     auto ignored
pocket -> quiet    close
deep -> quiet      close
deep -> daily_care end-of-day preview
daily_care -> quiet close
quiet -> sleep     user chooses sleep
sleep -> quiet     user wakes companion
```

event logging은 낮은 수준의 presentational component가 아니라 transition boundary에서 수행한다.

## 테스트와 검증 전략

현재 package에는 frontend test runner가 없다. 따라서 이번 pass의 최소 검증은 TypeScript build와 browser QA다.

최소 검증:

- `pnpm build`
- Vite dev server 기반 browser QA
- 수동 flow check:
  - quiet/new note icon 표시
  - icon이 좌측하단에 표시
  - 클릭 시 종이 질감의 nudge 표시
  - nudge 클릭 시 pocket 표시
  - input 제출 시 deep 표시
  - persona switch에 따라 deep reply tone 변화
  - user-facing UI에서 `Deep Context`, `local mock`, `prompt` 문구가 보이지 않음
  - daily care preview가 제품 flow를 방해하지 않고 열림
  - local timeline에 필수 이벤트 기록

test runner를 추가한다면 우선순위는 다음이다.

- mock provider persona tone branching
- mode-to-context-depth mapping
- timeline event append order

## 불변 조건

- 이번 pass에서 Supabase를 연결하지 않는다.
- 이번 pass에서 SQLite를 연결하지 않는다.
- 이번 pass에서 Local LLM을 연결하지 않는다.
- PRD v2 mock flow에서 Rust trigger/LLM/timeline command를 호출하지 않는다.
- 공유 UI primitive가 명확히 필요하지 않다면 `src/features/companion` feature boundary 안에 둔다.
- companion UI는 compact하게 유지하고 좌측하단 floating anchor를 유지한다.
- 사용자 UI에 기술어를 노출하지 않는다.
- grug의 원시인 말투, 아이콘, 화면 구성을 복제하지 않는다. 손의 흔적, 단순함, 작은 세계감만 Amadeus 언어로 번역한다.
- app release 또는 packaging을 하지 않는다.

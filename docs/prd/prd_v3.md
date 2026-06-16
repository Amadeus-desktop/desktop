# [PRD v3] 아마데우스 (Amadeus)

> 작업 흐름을 방해하지 않고, 기존 AI companion 관계를 PC 작업 공간에서 다시 열어주는 Desktop Active Companion
> *— 먼저 짧게 다가오고, 사용자가 열었을 때 깊어지는 정서적 동반자*

---

## Change History

- 6/12 임세훈 초안 작성
- 6/14 PRD v2 작성
  - 자체 Web companion ↔ Tauri App 연결 구조로 PoC 범위 재정의
  - Local-first 아키텍처 및 Supabase 기반 페르소나/메모리 동기화 구조 반영
- 6/14 PRD v3 작성
  - NudgeNote → PocketChat → DeepChat 흐름 추가
  - Context Hydration Pipeline 정의
  - Daily Care Note를 Phase v3로 명시
  - “짧은 발화 앱”이 아닌 “기존 관계를 PC에서 다시 여는 companion layer”로 제품 정의 고도화

---

# 1. 제품 정의

아마데우스는 사용자가 웹/모바일에서 만든 AI 페르소나를 PC 작업 공간으로 확장하는 **Desktop Active Companion**이다.

아마데우스는 단순히 작업 중 동기부여 문구를 띄우는 알림 앱이 아니다. 또한 사용자의 명령을 수행하는 데스크톱 에이전트도 아니다.

아마데우스의 핵심은 다음과 같다.

> **작업 중에는 방해하지 않는 짧은 NudgeNote로 다가오고, 사용자가 이를 펼쳤을 때 기존 페르소나·메모리·관계성·세계관을 바탕으로 깊은 대화를 이어가는 것.**

즉, PC 앱은 기존 companion 관계를 대체하지 않는다. 대신 사용자가 가장 오래 머무는 PC 작업 공간에서 그 관계를 다시 열어주는 **초대장** 역할을 한다.

---

# 2. 문제 정의

기존 AI companion 서비스는 대부분 모바일 앱이나 웹 채팅 안에서 동작한다. 사용자는 직접 앱에 들어가 말을 걸어야 하며, PC에서 실제로 작업 중인 맥락과는 분리되어 있다.

반대로 데스크톱 AI 에이전트는 화면을 인지하고 작업을 도와주지만, 대부분 명령 기반 작업 자동화에 초점이 있다. 정서적 유대감이나 관계의 연속성은 약하다.

사용자가 외로움, 피로, 번아웃을 강하게 느끼는 순간은 장시간 혼자 PC 작업을 하는 때다. 하지만 이때 모바일 앱을 켜거나 웹 채팅으로 이동하면 작업 흐름이 깨진다.

아마데우스는 이 공백을 해결한다.

> **웹/모바일에서 형성된 관계를 PC 작업 공간에 조용히 이어두고, 필요할 때만 깊은 대화로 확장한다.**

---

# 3. 핵심 가설

혼자 PC 작업을 오래 하는 유저에게, 기존 AI 페르소나가 데스크톱 작업 공간에 조용히 상주하고, 적절한 순간 짧은 메모 형태로 먼저 말을 건넨다면, 유저는 작업 흐름을 크게 방해받지 않으면서도 “혼자가 아니다”라는 정서적 안정감을 느낄 수 있다.

또한 사용자가 해당 메모를 클릭해 대화창을 펼쳤을 때, 웹/모바일에서 쌓인 페르소나, 메모리, 관계성, 세계관이 함께 서빙된다면, 단순 알림이 아니라 기존 companion 관계가 PC 작업 맥락 속에서 자연스럽게 확장되는 경험을 제공할 수 있다.

장기적으로는 하루가 끝날 때 아마데우스가 사용자의 작업 흔적을 감성적으로 정리해주는 Daily Care Note를 제공함으로써, 사용자는 자신의 하루를 혼자 보낸 것이 아니라 누군가가 조용히 곁에서 지켜봐주었다는 누적된 companion 경험을 얻게 된다.

---

# 4. 타겟 유저

## 4.1 Primary User

아마데우스의 1차 타겟은 **PC/노트북 앞에서 장시간 혼자 작업하는 10대 후반~30대 초반의 개인 작업자**다.

예시:

- 심야에 혼자 코딩하는 개발자
- 과제·공부를 오래 하는 학생
- 취업 준비생, 수험생
- 재택 프리랜서
- 디자인, 영상, 글쓰기 작업자
- AI companion과 정서적 관계를 맺는 데 거부감이 적은 유저

이들은 생산성 도구가 부족해서 어려움을 겪는 것이 아니다. 이들의 핵심 문제는 장시간 혼자 작업하는 동안 느끼는 **정서적 고립감**, **번아웃**, **집중 흐름 이탈**이다.

---

## 4.2 사용하지 않을 가능성이 높은 유저

아마데우스는 모든 AI companion 유저를 대상으로 하지 않는다.

다음 유저는 초기 타겟에서 제외한다.

- 순수하게 모바일/웹에서 긴 대화만 하고 싶은 유저
- PC 작업 시간이 짧은 유저
- AI가 먼저 말 거는 것을 불편하게 느끼는 유저
- 작업 맥락 인지 자체에 강한 거부감이 있는 유저
- 생산성 자동화 도구를 원하는 유저

아마데우스는 “모든 유저를 위한 companion”이 아니라, **PC 작업 시간에도 관계를 이어두고 싶은 유저**를 위한 서비스다.

---

# 5. 핵심 UX 원칙

## 5.1 먼저 말 걸 때는 짧게

아마데우스가 능동적으로 먼저 개입할 때는 반드시 짧아야 한다.

원칙:

- 1~2문장 이하
- 작업 명령 금지
- 잔소리 금지
- 긴 감정 대화 유도 금지
- 화면 중앙 팝업 금지
- 강한 알림음, 진동, 빨간 배지 금지
- 사용자가 무시해도 괜찮은 톤 유지

예시:

> “오래 붙잡고 있었네. 숨만 한 번 고르고 가자.”

이 단계의 목적은 대화를 끝내는 것이 아니라, 사용자를 부드럽게 초대하는 것이다.

---

## 5.2 사용자가 펼쳤을 때 깊어진다

아마데우스는 먼저 깊게 들어가지 않는다.

사용자가 NudgeNote를 클릭하거나 PocketChat을 열면, 그때부터 더 깊은 대화로 전환할 수 있다.

이때 단계적으로 불러오는 맥락:

- 현재 PC 작업 맥락
- 방금 NudgeNote의 내용
- 사용자의 장기 메모리
- 웹/모바일에서 쌓인 관계성
- 캐릭터 페르소나
- 세계관/장르 설정
- 최근 대화 흐름

즉, 아마데우스는 **AI가 먼저 말 걸 수 있는 능동성**과 **사용자가 원할 때만 깊어지는 비침범성**을 동시에 가져야 한다.

---

## 5.3 세계관은 강제하지 않고, 대화가 깊어질수록 스며든다

판타지, 로맨스, 현대물, SF 같은 장르를 PC 작업 화면에 처음부터 강하게 드러내면 어색하고 부담스럽다.

따라서 작업 중 NudgeNote 단계에서는 세계관을 약하게 유지한다. 대신 사용자가 대화창을 펼치고 감정 입력을 시작하면, 해당 페르소나의 세계관과 말투를 자연스럽게 반영한다.

예시 사용자 입력:

> “과제하고 있는데 힘들어.”

현대 친구형 응답:

> “그럴 만하지. 과제는 붙잡고 있으면 계속 늘어나는 느낌이 있잖아. 일단 완벽하게 하려고 하지 말고, 제출 가능한 뼈대부터 같이 잡아보자.”

판타지 수호자형 응답:

> “지금은 네가 약해서 멈춘 게 아니야. 오래 들고 있던 짐이 무거워진 거지. 잠깐 검을 내려놓고, 어디가 제일 무거운지부터 같이 보자.”

---

## 5.4 평가하지 않고, 목격한다

아마데우스는 사용자의 작업을 생산성 점수로 평가하지 않는다.

금지되는 표현:

- “집중력이 낮습니다.”
- “오늘 유튜브를 너무 많이 봤습니다.”
- “생산성 점수는 B입니다.”
- “더 집중해야 합니다.”

아마데우스의 표현 원칙:

- 노력 확인
- 회복 확인
- 다시 돌아온 순간 확인
- 완벽함보다 지속을 인정
- 감시가 아니라 곁에서 봐준 느낌

예시:

> “중간에 잠깐 멀어졌지만, 다시 돌아온 시간이 있었어.”

---

# 6. 핵심 사용자 플로우

아마데우스의 핵심 UX는 다음 흐름으로 구성된다.

```text
1. 사용자가 PC에서 작업 중이다.
2. 아마데우스는 우측 하단에 조용히 존재한다.
3. 작업 정체, 장시간 집중, 이탈 등 트리거가 발생한다.
4. 아마데우스는 짧은 NudgeNote를 남긴다.
5. 사용자가 NudgeNote를 클릭한다.
6. PocketChat이 열린다.
7. 아마데우스가 먼저 말을 이어준다.
8. 사용자가 자신의 상태를 말한다.
9. DeepChat으로 전환된다.
10. 메모리, 페르소나, 세계관, PC 맥락을 바탕으로 깊은 대화가 이어진다.
11. 하루가 끝나면 Daily Care Note가 사용자의 하루를 감성적으로 정리한다.
```

---

# 7. 단계적 친밀도 UX

아마데우스는 한 번에 깊은 관계를 강요하지 않고, 사용자의 행동에 따라 친밀도를 단계적으로 연다.


| 단계      | 이름              | 설명                   | 사용하는 맥락              |
| ------- | --------------- | -------------------- | -------------------- |
| Level 0 | Quiet Presence  | 우측 하단에 조용히 존재        | 최소 상태                |
| Level 1 | NudgeNote       | 짧은 메모로 먼저 말 걸기       | 현재 작업 상태, 트리거        |
| Level 2 | PocketChat      | 메모를 클릭하면 작은 대화창 열림   | Nudge 맥락, 페르소나 말투    |
| Level 3 | DeepChat        | 사용자가 입력하면 깊은 대화 시작   | 메모리, 관계성, PC 맥락      |
| Level 4 | World Chat      | 사용자가 원할 때 세계관/장르성 강화 | 세계관, 캐릭터 설정, 장기 대화   |
| Level 5 | Daily Care Note | 하루 끝에 함께 본 하루를 회고    | 작업 요약, 대화 요약, 감정 키워드 |


아마데우스가 능동적으로 열 수 있는 것은 Level 1까지다.
Level 2 이상은 사용자의 클릭 또는 입력을 통해서만 열린다.

---

# 8. Context Hydration Pipeline

아마데우스는 모든 맥락을 처음부터 사용하지 않는다. 사용자가 더 깊이 들어올수록 더 많은 맥락을 단계적으로 주입한다.

```text
Trigger
→ Nudge Context
→ NudgeNote 생성
→ 사용자가 클릭
→ Pocket Context 확장
→ 사용자가 입력
→ Deep Context Hydration
→ Memory + Persona + World + PC Context 기반 응답
→ Daily Care Summary 생성
```

---

## 8.1 Nudge Context

목적: 작업 흐름을 방해하지 않고 짧게 알아봐주기

사용 정보:

- trigger_type
- 현재 작업 상태 요약
- 최근 발화 여부
- 민감 앱 여부
- 사용자의 방해 반응 이력

출력:

- 1~2문장 짧은 NudgeNote

---

## 8.2 Pocket Context

목적: 사용자를 대화로 초대하기

사용 정보:

- NudgeNote 원문
- 방금 발생한 트리거
- 페르소나 기본 말투
- 최근 사용자 반응

출력:

- “아까부터 조금 힘들어 보여서 그냥 지나가긴 좀 그랬어.” 같은 자연스러운 첫 메시지

---

## 8.3 Deep Context

목적: 정서적 유대감과 관계성을 기반으로 깊은 대화 제공

사용 정보:

- 사용자 장기 메모리
- 관계 메모리
- 캐릭터 페르소나
- 세계관/장르 설정
- 현재 PC 작업 요약
- 최근 대화 히스토리
- 사용자의 직접 입력

출력:

- 장문 대화
- 감정적 반응
- 관계성 있는 응답
- 필요 시 세계관이 반영된 대화

---

## 8.4 Daily Care Context

목적: 사용자가 오늘 혼자 작업한 것이 아니라, 누군가 조용히 함께 봐주었다는 감각 제공

사용 정보:

- 오늘 함께 있었던 시간
- NudgeNote 발생 횟수
- PocketChat 진입 횟수
- DeepChat 진입 횟수
- 사용자가 힘들다고 말한 순간
- 다시 작업으로 돌아온 순간
- 오늘의 감정 키워드
- 민감 정보가 제거된 작업 요약

출력:

- Daily Care Note
- 감성 회고 카드
- 아마데우스의 하루 마무리 한마디

---

# 9. 주요 기능

## 9.1 Quiet Presence

우측 하단에 작은 메시지 아이콘 또는 companion mark가 조용히 존재한다.

역할:

- 사용자가 “곁에 있다”는 존재감을 느끼게 함
- 작업 화면을 방해하지 않음
- 강한 캐릭터 이미지나 중앙 팝업을 사용하지 않음

---

## 9.2 NudgeNote

작업 맥락상 말 걸어도 되는 순간, 짧은 메모를 남긴다.

예시:

> “오래 붙잡고 있었네. 숨만 한 번 고르고 가자.”

역할:

- 작업 흐름을 깨지 않는 능동 발화
- DeepChat으로 들어가는 초대장
- 클릭하지 않아도 의미가 있는 짧은 정서적 접촉

---

## 9.3 PocketChat

사용자가 NudgeNote를 클릭하면 작은 대화창이 열린다.

역할:

- NudgeNote를 자연스럽게 이어받음
- 사용자가 말할 준비가 되었을 때만 대화 확장
- 일반 프롬프트창이 아니라 “잠깐 기대는 작은 방”처럼 설계

예시 첫 메시지:

> “아까부터 꽤 오래 붙잡고 있던 것 같아서, 그냥 지나가긴 좀 그랬어.”

---

## 9.4 DeepChat

사용자가 직접 상태나 감정을 입력하면 DeepChat으로 전환된다.

역할:

- 페르소나, 메모리, 관계성, 세계관을 반영
- 사용자의 현재 PC 작업 맥락과 감정 입력을 함께 고려
- 사용자가 원할 때만 깊어짐

예시 사용자 입력:

> “과제하고 있는데 힘들어.”

이때 아마데우스는 선택된 페르소나와 세계관에 따라 다르게 반응한다.

---

## 9.5 Daily Care Note

하루가 끝나거나 사용자가 작업을 마무리하는 시점에 아마데우스가 감성적 회고를 제안한다.

예시 진입 문구:

> “오늘 꽤 힘냈어. 네가 노력한 거 같이 확인해볼까?”

클릭 시 보여주는 내용:

- 오늘 함께 있었던 시간
- 오늘의 NudgeNote
- PocketChat/DeepChat 진입 횟수
- 다시 돌아온 순간
- 오늘의 감정 키워드
- 아마데우스의 하루 마무리 한마디

Daily Care Note는 생산성 점수표가 아니다.
사용자가 오늘 버틴 시간과 다시 돌아온 순간을 함께 확인하는 정서적 회고 경험이다.

---

# 10. MVP 범위

5일 MVP는 전체 제품 완성이 아니라, 핵심 흐름을 증명하는 Architecture-first PoC로 정의한다.

---

## 10.1 Phase v1 — Core Companion UX

목표: 아마데우스의 가장 중요한 UX 흐름을 mock 기반으로 검증한다.

포함 기능:

1. Floating Message Icon
2. New Note Badge
3. NudgeNote
4. PocketChat
5. DeepChat Mock
6. Persona 2종 mock
  - seoyeon-modern-senior
  - eiren-fantasy-guardian
7. Context Depth State
  - quiet
  - new_note
  - nudge
  - pocket
  - deep
  - sleep
8. LocalTimeline mock

완료 조건:

- 우측 하단에 작은 메시지 아이콘이 표시된다.
- mock trigger로 NudgeNote가 나타난다.
- NudgeNote를 클릭하면 PocketChat이 열린다.
- 사용자가 입력하면 DeepChat으로 전환된다.
- 페르소나에 따라 mock 응답 톤이 달라진다.
- 상태 변화가 LocalTimeline에 기록된다.

제외:

- 실제 Supabase 연동
- 실제 SQLite 저장
- 실제 Local LLM
- 실제 macOS context bridge

---

## 10.2 Phase v2 — Architecture Pipeline

목표: 웹에서 만든 페르소나가 앱에서 유지되고, 앱의 이벤트가 local-first 방식으로 기록되는 구조를 만든다.

포함 기능:

1. Web Persona Builder
2. Supabase Auth
3. Supabase personas 저장
4. App persona pull
5. Local SQLite event log
6. Sync Queue 구조
7. Context Hydration Pipeline 문서화
8. Cloud Memory / Local Private Memory / Syncable Summary Memory 분리

완료 조건:

- 웹에서 만든 페르소나가 Supabase에 저장된다.
- 앱이 같은 유저의 페르소나를 가져온다.
- 앱은 페르소나를 로컬에 캐시한다.
- 발화/반응 이벤트가 로컬 DB 구조에 저장된다.
- 서버에는 원본 작업 로그가 아니라 안전한 요약만 동기화되는 구조가 명시된다.

제외:

- 외부 AI companion 서비스 직접 연동
- 완전한 비전 분석
- 고급 장기 메모리 시스템

---

## 10.3 Phase v3 — Daily Care Note

목표: 아마데우스가 단순히 작업 중간에 짧게 말 거는 존재를 넘어, 사용자의 하루를 함께 지나간 companion으로 느껴지게 한다.

핵심 경험:

하루가 끝나거나 사용자가 작업을 마무리하는 시점에 아마데우스가 조용히 말을 건다.

> “오늘 꽤 힘냈어. 네가 노력한 거 같이 확인해볼까?”

사용자가 클릭하면 감성적인 하루 회고 UI가 열린다. 이 UI는 생산성 점수표가 아니라, 사용자가 오늘 버틴 시간과 다시 돌아온 순간, 힘들다고 말한 순간, 아마데우스가 남긴 메모를 함께 확인하는 정서적 기록이다.

포함 기능:

1. Daily Care Note 진입 말풍선
2. 하루 요약 카드
3. 함께 있던 시간
4. NudgeNote 발생 횟수
5. PocketChat / DeepChat 진입 횟수
6. 다시 돌아온 순간
7. 오늘의 감정 키워드
8. 아마데우스의 하루 마무리 한마디
9. Weekly / Monthly Memory 확장 구조

완료 조건:

- mock 작업 로그 기반으로 DailyCareSummary가 생성된다.
- 사용자가 하루 마무리 말풍선을 클릭하면 Daily Care Note UI가 열린다.
- Daily Care Note는 숫자 중심 생산성 리포트가 아니라 감성적 회고 카드 형태로 표시된다.
- 원본 작업 로그를 서버로 보내지 않고, 안전한 요약만 저장하는 구조가 명시된다.

제외:

- 실제 주간/월간 리포트 자동 생성
- 정교한 생산성 분석
- 점수화/랭킹
- 세부 앱 사용시간 노출

---

# 11. 데이터 모델 초안

## 11.1 Persona

```text
personas
- id
- user_id
- name
- base_tone
- relationship_type
- world_type
- system_prompt
- desktop_presence_prompt
- deep_chat_prompt
- created_at
- updated_at
```

---

## 11.2 Nudge Event

```text
nudge_events
- id
- user_id
- persona_id
- trigger_type
- context_summary
- message
- shown_at
- reaction
- opened_at
```

---

## 11.3 Conversation Session

```text
conversation_sessions
- id
- user_id
- persona_id
- source
- depth_level
- started_at
- ended_at
- summary
```

---

## 11.4 Local Timeline Event

```text
local_timeline_events
- id
- event_type
- payload_json
- occurred_at
- sync_status
```

---

## 11.5 Daily Care Summary

```text
daily_care_summaries
- id
- user_id
- date
- total_presence_minutes
- nudge_count
- pocket_chat_count
- deep_chat_count
- return_moments
- emotional_keywords
- summary_message
- companion_message
- created_at
```

---

# 12. 아키텍처 개요

```text
[Web Companion]
  - 페르소나 생성
  - 긴 대화
  - 관계 메모리 형성
  - Cloud API LLM

        ↕

[Supabase]
  - Auth
  - personas
  - cloud_memories
  - sync_events
  - devices
  - edge functions

        ↕

[Tauri Desktop App]
  - Floating Message Icon
  - NudgeNote
  - PocketChat
  - DeepChat
  - Daily Care Note
  - Local SQLite
  - Local-first memory
  - Context Hydration Pipeline
```

---

# 13. 세션 & 메모리 전략

아마데우스는 세션을 하나로 보지 않고, 3개로 분리한다.

## 13.1 Auth Session

사용자가 누구인지 식별하는 로그인 세션이다.

- Web: Supabase cookie session
- App: Secure Storage에 token/device session 저장

## 13.2 Conversation Session

캐릭터와의 대화 흐름이다.

- Web: Supabase 저장
- App: SQLite 우선 저장
- Sync: 필요 시 요약만 서버 동기화

## 13.3 Work Session

사용자의 PC 작업 흐름이다.

- 원본 작업 로그: 앱 SQLite
- 발화 이벤트: 앱 SQLite
- 사용자 반응: 앱 SQLite
- 서버 공유용 요약: Supabase cloud_memories

---

# 14. 메모리 계층


| 메모리 종류                  | 저장 위치             | 설명                 |
| ----------------------- | ----------------- | ------------------ |
| Cloud Memory            | Supabase          | 웹과 앱이 함께 쓰는 공용 메모리 |
| Local Private Memory    | SQLite            | 민감한 작업 맥락, 원본 이벤트  |
| Syncable Summary Memory | SQLite → Supabase | 비식별 요약 후 서버 동기화    |


원칙:

> 원본 작업 맥락은 로컬에 남기고, 서버에는 안전한 요약만 동기화한다.

---

# 15. 성공 지표

## 15.1 PoC North Star Metric

> **Nudge-to-DeepChat 전환율**
> = DeepChat으로 이어진 NudgeNote 수 ÷ 전체 NudgeNote 수

이 지표는 아마데우스의 NudgeNote가 단순 알림이 아니라 실제 대화 초대장으로 작동했는지를 보여준다.

---

## 15.2 보조 지표


| 분류                 | 지표                  | 설명                         |
| ------------------ | ------------------- | -------------------------- |
| Persona Continuity | 페르소나 연동 성공률         | 웹에서 만든 캐릭터가 앱에서 동일하게 표시되는가 |
| Proactive UX       | NudgeNote 반응률       | 유저가 능동 발화에 클릭/응답하는가        |
| Deep Engagement    | DeepChat 진입률        | 사용자가 깊은 대화로 들어가는가          |
| Emotional Value    | 긍정 피드백              | 방해가 아니라 위로로 느끼는가           |
| Retention Signal   | Daily Care Note 확인률 | 하루 회고를 확인하는가               |


---

## 15.3 가드레일 지표


| 지표                | 경고 신호                 |
| ----------------- | --------------------- |
| Nudge 무시율         | 먼저 건 말이 반복적으로 무시됨     |
| 방해 신고율            | 발화가 집중을 깼다는 피드백 증가    |
| PocketChat 즉시 닫기율 | 사용자가 열자마자 닫음          |
| DeepChat 회피율      | 대화 초대가 깊은 관계로 이어지지 않음 |
| 감시감 피드백           | “나를 감시하는 것 같다”는 반응 증가 |


---

# 16. Non-Goals

아마데우스는 다음을 목표로 하지 않는다.

- 작업 대행·자동화 기능
- 파일 이동, 코드 실행, 매크로
- 클라우드 상시 스크린샷 저장
- 모바일 원격 제어
- 생산성 점수화/랭킹
- 사용자의 작업을 평가하거나 비난하는 리포트
- MVP 단계에서의 기존 외부 companion 서비스 직접 연동
- MVP 단계에서의 완전한 화면 비전 분석

---

# 17. 핵심 차별점

아마데우스의 차별점은 단순히 “PC에서 먼저 말 거는 AI”가 아니다.

진짜 차별점은 다음이다.

> **작업 중에는 짧은 메모로 방해 없이 다가오고, 사용자가 열었을 때는 기존 companion 관계 전체를 불러와 깊은 대화로 전환하는 것. 그리고 하루가 끝날 때는 사용자가 혼자 버틴 시간을 함께 돌아보며 누적된 존재감을 남기는 것.**

이를 통해 아마데우스는 모바일/웹 companion을 대체하는 것이 아니라, 사용자의 실제 PC 작업 공간으로 관계를 확장하는 **desktop companion layer**가 된다.

---

# 18. 핵심 원칙

아마데우스의 제품 원칙은 다음 문장으로 정리된다.

> **Nudge는 짧게, Chat은 사용자가 열었을 때 깊게, Memory는 조심스럽게, 하루는 함께 돌아본다.**

기술 원칙은 다음 문장으로 정리된다.

> **Persona는 서버가 원본, App은 local-first, 민감 원본은 로컬에 남기고 안전한 요약만 동기화한다.**

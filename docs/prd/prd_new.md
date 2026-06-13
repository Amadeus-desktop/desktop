[PRD] 아마데우스 (Amadeus)

작업 흐름을 방해하지 않는 데스크톱 Active Companion
— 시키지 않아도 먼저 말을 거는 정서적 동반자

change History
6/12 임세훈 초안 작성
6/14 MVP/PoC 범위 재정의
기존 AI companion 서비스 연동을 MVP 필수가 아닌 향후 확장 옵션으로 조정
자체 Web companion ↔ Tauri App 연결 구조로 PoC 범위 축소
Local-first 아키텍처 및 Supabase 기반 세션/메모리 동기화 구조 반영
1. 개요 (Overview)

현재 데스크톱 AI 에이전트 시장은 OpenClaw 생태계를 중심으로 빠르게 형성되고 있다.

Clawster, PetClaw, KKClaw 등 다수의 데스크톱 펫은 화면 우측 하단에 상주하며, 유저의 화면을 인지하고 작업을 보조한다. 그러나 이들의 본질은 대부분 명령 기반 에이전트에 가깝다.

유저가 “바탕화면 정리해줘”, “이 파일 옮겨줘”라고 먼저 지시해야만 반응하는 구조이며, 정서적 교감보다는 작업 자동화와 생산성 보조에 무게중심이 있다.

반대로 Character.AI, Zeta, 러비더비와 같은 AI companion 서비스는 정서적 교감에 강점이 있지만, 대부분 모바일 앱이나 웹 채팅 안에서 동작한다. 사용자는 앱에 직접 진입해 먼저 말을 걸어야 하며, 실제로 가장 오래 머무는 PC 작업 공간에서는 캐릭터와의 연결이 끊어진다.

도구	본질	상호작용 방식	한계
OpenClaw / PetClaw	작업 에이전트	유저가 명령 → 실행	정서적 교감 약함
Clawster	화면 인지 보조 펫	유저가 명령 → 실행	능동적 정서 교감 약함
일반 AI 챗봇	대화형 도구	유저가 먼저 말해야 응답	작업 공간과 분리됨
모바일 AI companion	정서 교감 캐릭터	앱 진입 후 대화	PC 작업 맥락과 단절
아마데우스	데스크톱 Active Companion	AI가 먼저 말 검	작업 공간 내 정서 동반자

기존 서비스들의 결정적 공백은 두 가지다.

수동성
외로움과 번아웃이 가장 심한 순간, 유저는 AI에게 먼저 말을 거는 행위조차 또 하나의 노동처럼 느낀다. 명령형 에이전트와 일반 챗봇은 이 순간 침묵한다.
공간의 단절
모바일이나 웹에서 형성된 AI 캐릭터와의 관계는 PC 작업 공간으로 이어지지 않는다. 사용자가 실제로 고립감과 피로를 가장 많이 느끼는 순간은 장시간 PC 작업 중이지만, 기존 companion은 그 맥락을 알지 못한다.

아마데우스는 이 공백을 해결하기 위해, 웹에서 만든 AI 페르소나를 데스크톱 앱으로 연결하고, 사용자의 PC 작업 맥락을 local-first 방식으로 인지해 작업 흐름을 깨지 않는 선에서 먼저 다가오는 정서적 동반자를 지향한다.

초기 MVP에서는 특정 외부 서비스와 직접 연동하지 않는다. 대신 자체 Web companion과 Tauri 데스크톱 앱을 연결하여 핵심 경험을 검증한다. 향후에는 러비더비, Zeta, Character.AI와 같은 기존 AI companion 서비스와 연동 가능한 desktop companion layer로 확장할 수 있다.

2. 목표 (Goals)

이 프로젝트의 목표는 User Goals, Product Goals, Non-Goals로 나뉜다.

2.1 User Goals

시키지 않아도 곁에 있어주는 경험

유저가 먼저 말 걸지 않아도, AI가 작업 맥락에 맞춰 적절한 타이밍에 위로·격려·환기를 건넨다.
메인 작업 영역을 침범하지 않는 미니멀한 형태로 집중 흐름을 깨지 않는다.
심야·장시간 단독 작업의 고립감을 줄이고, 캐릭터가 실제로 곁에 있다는 존재감을 제공한다.
웹에서 만든 캐릭터의 페르소나가 데스크톱 앱에서도 유지되어, 캐릭터가 작업 공간까지 이어져 들어온 듯한 경험을 만든다.
화면 인지와 작업 로그 저장에 대한 심리적 보안 장벽을 낮추기 위해, local-first 원칙과 투명한 로그 구조를 제공한다.
2.2 Product Goals

5일 PoC/MVP 기준으로 검증해야 하는 것

웹에서 페르소나를 생성하고 Supabase에 저장할 수 있다.
Tauri 앱에서 같은 유저의 페르소나를 불러와 companion UI에 반영할 수 있다.
앱은 local-first 방식으로 발화 이벤트와 사용자 반응을 SQLite에 저장한다.
간단한 mock trigger 또는 timer trigger를 통해, 유저 입력 없이 AI가 먼저 말 거는 경험을 구현한다.
앱에서 생성된 안전한 요약 메모리만 Supabase로 동기화할 수 있는 파이프라인을 설계한다.
민감한 원본 작업 로그는 로컬에 남기고, 서버에는 비식별 요약만 저장한다는 원칙을 명확히 보여준다.
2.3 Non-Goals

아마데우스는 에이전트가 아니라 메이트 같은 존재다.

작업 대행·자동화 기능을 제공하지 않는다.
예: 파일 정리, 코드 실행, 매크로, 데스크톱 자동 제어 등
범용 생산성 도구나 업무 보조 비서를 목표로 하지 않는다.
유저가 명시적으로 허용하지 않은 화면 정보, 원본 작업 로그, 민감 창 정보를 외부 서버로 상시 전송하거나 저장하지 않는다.
초기 PoC에서는 기존 외부 AI companion 서비스와 직접 연동하지 않는다.
초기 PoC에서는 완전한 화면 캡처 기반 비전 분석, 고급 local LLM, 정교한 트리거 엔진을 필수 구현 범위로 두지 않는다.
3. 핵심 가설 (Core Hypothesis)

아마데우스의 핵심 가설은 다음과 같다.

혼자 PC 작업을 오래 하는 유저에게, 웹에서 만든 AI 페르소나가 데스크톱 앱으로 이어지고, 앱이 작업 맥락을 local-first 방식으로 인지해 적절한 순간 짧은 위로·격려·환기 메시지를 먼저 건넨다면, 유저는 작업 흐름을 크게 방해받지 않으면서 고립감을 줄이고 작업을 더 오래 지속할 수 있을 것이다.

향후 기존 AI companion 서비스와 연동될 경우, 이미 형성된 캐릭터 관계를 PC 작업 공간으로 확장할 수 있으며, 기존 유저 유입과 리텐션 상승을 기대할 수 있다.

4. 성공 지표 (Success Metrics)

아마데우스의 성공 지표는 두 축으로 측정한다.

능동적 교감이 실제로 작동하는가
그 교감이 작업을 방해하지 않는가
4.1 PoC North Star Metric

능동 발화 반응률
= 유저가 클릭·응답·긍정 반응한 능동 발화 수 ÷ 전체 능동 발화 수

AI가 먼저 건넨 말에 유저가 실제로 반응했는지를 측정한다. 이 수치가 높다는 것은 “먼저 다가오는 동반자”라는 핵심 경험이 작동하고 있다는 직접적인 신호다.

4.2 PoC 성공 기준
분류	지표	설명
Persona Continuity	페르소나 연동 성공률	웹에서 만든 캐릭터가 앱에서 동일하게 표시되는가
Proactive UX	능동 발화 발생 여부	유저 입력 없이 앱이 먼저 발화하는가
Local-first	로컬 이벤트 저장 여부	발화/반응 로그가 SQLite에 저장되는가
Sync	요약 메모리 동기화 여부	로컬 요약 메모리가 Supabase로 올라가는가
Trust	방해/불안 피드백	유저가 감시감이나 방해감을 느끼지 않는가
4.3 HEART 프레임워크 기반 확장 지표
분류	지표	설명
Happiness	발화 긍정 반응률 / 만족도 설문	능동 발화가 위로·격려로 느껴졌는가
Engagement	일 평균 교감 세션 / 세션당 대화 턴 수	먼저 건 말이 대화로 이어지는가
Adoption	앱 연결 완료율 / 온보딩 완료율	웹에서 만든 페르소나를 앱까지 연결하는가
Retention	D7 / D30 리텐션, 주간 동반 일수	앱을 계속 켜두는가
Task Success	트리거 적시성	적절한 타이밍에 말 걸었는가
4.4 가드레일 지표

능동성이 잔소리나 방해로 변질되지 않도록 감시하는 안전장치

지표	경고 신호
작업 방해 신고율	발화가 집중을 깼다는 피드백 비율 증가
발화 무시율	먼저 건 말이 반복적으로 무시됨
권한 철회율	화면/작업 맥락 인지 권한을 끄는 비율 증가
오발화율	부적절한 맥락에서 발화한 비율 증가

이 지표들이 임계치를 넘으면 능동 발화의 빈도와 민감도를 자동 하향한다.

5. 페르소나 & 사용자 시나리오

핵심 타겟: PC/노트북 앞에서 장시간 고도의 집중을 요구하는 작업을 하는 10대 후반~30대 초반의 개발자, 학생, 크리에이터, 프리랜서

5.1 Primary Persona — 김도현
“심야에 혼자 모니터 앞에 앉은 번아웃 개발자”

기본 정보

연령: 20대 후반 ~ 30대 초반
직업: 스타트업 개발자 / 사이드 프로젝트 운영
작업 환경: 심야~새벽, 듀얼 모니터, 장시간 코딩
작업 빈도: 주 6~7일, 평균 6시간 이상 연속 집중

현재 행태

외로움을 달래려 유튜브나 SNS를 켰다가 집중 흐름이 완전히 깨짐
AI 챗봇은 “먼저 말 걸어야 해서” 지친 날엔 켜지 않음
데스크톱 펫은 귀엽지만, 정서적으로 깊게 와닿지 않음

Pain Point

심야 단독 작업의 단절된 고독감
번아웃 순간 AI에게 먼저 말 거는 것조차 노동처럼 느껴짐
딴짓으로 새는 줄 알면서도 스스로 환기하지 못함

“누가 옆에서 ‘아직도 하고 있어? 대단하다’ 한마디만 해줘도 버틸 것 같은데.”

Needs

시키지 않아도 먼저 말 걸어주는 존재
작업 화면을 가리지 않는 미니멀한 존재감
지칠 때 위로, 샐 때 부드러운 환기
나를 감시하는 느낌이 아니라, 곁에 있어주는 느낌

기대 가치

코딩만 하고 있어도 AI가 알아서 곁에서 챙겨주는 느낌
“혼자가 아니다”라는 정서적 안정감
외로움 때문에 유튜브로 탈주하는 빈도 감소
5.2 Secondary Persona — 이서연
“장시간 책상에 앉은 고립된 취준생/수험생”

특징

연령: 10대 후반 ~ 20대 초반
상황: 임용·공시·자격증 등 장기 수험
사회적 접촉이 적어 고립감과 동기 저하가 큼

Pain Point

멍 때리거나 막힐 때 아무도 환기시켜주지 않음
“오늘도 혼자”라는 정서적 고립
동기부여 콘텐츠를 보려다가 오히려 딴짓으로 빠짐

Needs

멍 때릴 때 넌지시 깨워주는 존재
누적 시간을 알아봐주고 성취를 인정해주는 한마디
부담스럽지 않은 야간 케어
5.3 Secondary Persona — 박지우
“재택 고립이 익숙해진 프리랜서”

특징

연령: 30대
직업: 디자이너, 번역가, 1인 창작자 등
출퇴근·동료가 없어 하루 종일 대화가 없는 날이 잦음

Pain Point

사회적 고립이 만성화됨
챗봇을 써봤지만 내가 말 걸어야만 반응해서 결국 안 씀
작업 도구는 많지만 정서적으로 곁에 있어주는 존재는 없음

Needs

능동적으로 먼저 다가오는 존재감
작업 리듬을 깨지 않는 동반
화면을 보더라도 안전하다는 프라이버시 신뢰
6. 핵심 사용자 시나리오
#	상황	트리거	아마데우스의 행동
S1	코드 짜다 오래 멈춤	Deep Pause Trigger	우측 하단에 페이드인: “막힌 것 같네. 잠깐 숨만 고르고 가자.”
S2	1~2시간 연속 집중	Milestone Trigger	“벌써 꽤 오래 했네. 진짜 잘 버티고 있어.”
S3	작업 중 비업무 앱으로 이탈	Drift Trigger	“조금만 쉬고 다시 돌아가볼까?”
S4	웹에서 만든 캐릭터를 앱에서 실행	Persona Sync	웹에서 만든 이름/말투/성격이 앱 companion에 그대로 반영됨
S5	앱에서 하루 작업 요약 생성	Summary Sync	원본 로그는 로컬에 남기고, 안전한 요약만 서버에 저장
7. 핵심 기능 (Features & Requirements)

MoSCoW 기법으로 우선순위를 명확히 한다.

7.1 Must Have — 5일 PoC/MVP 범위
기능	설명	완료 기준
Web Persona Builder	Next.js 웹에서 캐릭터 이름, 말투, 성격 생성	페르소나가 Supabase에 저장됨
Supabase Auth & DB	사용자 계정, 페르소나, 공유 메모리 저장	user_id 기준으로 데이터 분리
Tauri Companion Shell	우측 하단 companion UI와 말풍선	앱 실행 시 companion이 표시됨
Persona Pull & Cache	앱에서 Supabase 페르소나를 불러와 로컬에 저장	웹에서 만든 캐릭터가 앱에 반영됨
Mock Trigger Engine	timer/mock trigger 기반 능동 발화	유저 입력 없이 말풍선이 뜸
Local SQLite Event Log	발화/반응 이벤트 로컬 저장	utterance_events, user_reactions 저장
Sync Queue 구조	로컬 이벤트 중 안전 요약만 서버로 동기화	sync_queue 또는 cloud_memories에 저장
Privacy Principle UI	local-first, 원본 로그 비전송 원칙 표시	사용자가 저장 방식을 이해 가능
작업 타임라인 최소 UI	최근 발화/반응 로그 표시	발화 근거와 반응 확인 가능
7.2 Should Have — MVP 이후 우선 확장
기능	설명	컷 기준
macOS Context Bridge	활성 앱, 창 제목, idle 상태 감지	권한/안정성 이슈가 크면 mock 유지
Local LLM Provider	앱에서 로컬 모델로 짧은 발화 생성	모델 실행 부담이 크면 provider interface만 구현
개인정보 필터	민감 앱/창 블랙리스트	PoC에서는 기본 키워드 필터부터 시작
Speakability Score	말 걸어도 되는지 0~100 점수화	초기엔 단순 rule-based로 구현
야간 케어 모드	심야 시간대 발화 톤·빈도 조정	발화 품질 검증 후 확장
발화 빈도 조절	무시/닫기 반응에 따라 빈도 하향	PoC에서는 로그 구조만 구현
7.3 Could Have — 후순위
기능	설명	비고
이벤트 기반 비전 분석	창 전환/idle 시점에만 화면 분석	프라이버시 검증 이후
온디바이스 소형 비전 모델	로컬 비전 모델로 화면 이해	기술 검증 필요
음성 발화	말풍선 + TTS	집중 방해 리스크 검토
캐릭터 감정 상태 시스템	시간·맥락 기반 캐릭터 상태 변화	교감 깊이 강화
멀티 캐릭터	복수 companion 운용	v2 이후
기존 AI companion 서비스 연동	러비더비, Zeta, Character.AI 등과 연동	MVP 이후 확장 옵션
7.4 Excluded — 의도적 배제

아마데우스는 동반자이지 작업 도구가 아니다. 아래 항목은 제품 정체성 보호를 위해 의도적으로 배제한다.

작업 대행·에이전트 기능
예: 파일 이동, 코드 실행, 데스크톱 자동화
매크로 / 워크플로 자동화
클라우드 상시 스크린샷 저장·전송
모바일 원격 제어
범용 생산성 비서 기능
MVP 단계에서의 기존 외부 companion 서비스 직접 연동
MVP 단계에서의 완전한 화면 비전 분석
8. 아키텍처 개요

아마데우스 MVP는 다음 구조로 설계한다.

[Web: Next.js 16]
  - 페르소나 생성
  - 웹 대화
  - Supabase Auth
  - Cloud API LLM 호출

        ↕ Supabase

[Supabase]
  - Auth
  - Postgres DB
  - RLS
  - Edge Functions
  - personas
  - cloud_memories
  - devices
  - sync_events

        ↕ Persona Pull / Summary Sync

[Desktop App: Tauri]
  - Companion UI
  - Local SQLite
  - Local LLM Provider Interface
  - Mock Trigger Engine
  - Local Private Memory
  - Sync Queue
8.1 Web

웹은 사용자가 캐릭터를 생성하고 관리하는 공간이다.

역할:

로그인
페르소나 생성/수정
웹 기반 캐릭터 대화
Cloud API LLM 호출
Supabase에 persona/cloud memory 저장

웹에서는 Cloud API를 사용하되, API key는 브라우저에 노출하지 않고 서버 측에서 호출한다.

8.2 Supabase

Supabase는 중앙 DB가 아니라 계정·페르소나·요약 메모리 동기화 허브로 사용한다.

역할:

Auth
user_id 기반 데이터 분리
페르소나 원본 저장
cloud memory 저장
device session 관리
sync event 저장
Edge Function을 통한 민감 작업 처리

중요 원칙:

Secret Key는 Edge Function 내부에서만 사용하고, 앱이나 브라우저로 직접 전달하지 않는다.

8.3 Tauri App

Tauri 앱은 실제 companion 경험이 일어나는 공간이다.

역할:

우측 하단 companion UI 표시
Supabase에서 persona pull
로컬 SQLite에 persona/cache/event 저장
trigger 기반 능동 발화
사용자 반응 저장
local-first memory 관리
안전한 요약만 Supabase로 sync
9. 세션 & 메모리 전략

아마데우스는 세션을 하나로 보지 않고, 3개로 분리한다.

9.1 Auth Session

사용자가 누구인지 식별하는 로그인 세션이다.

환경	저장 방식
Web	Supabase cookie session
App	Secure Storage에 token/device session 저장
9.2 Conversation Session

캐릭터와의 대화 흐름이다.

환경	저장 방식
Web	Supabase 저장
App	SQLite 우선 저장
Sync	필요 시 요약만 서버 동기화
9.3 Work Session

사용자의 PC 작업 흐름이다.

데이터	저장 방식
원본 작업 로그	앱 SQLite
발화 이벤트	앱 SQLite
사용자 반응	앱 SQLite
서버 공유용 요약	Supabase cloud_memories
9.4 Memory Layer

메모리는 3계층으로 나눈다.

메모리 종류	저장 위치	설명
Cloud Memory	Supabase	웹과 앱이 함께 쓰는 공용 메모리
Local Private Memory	SQLite	민감한 작업 맥락, 원본 이벤트
Syncable Summary Memory	SQLite → Supabase	비식별 요약 후 서버 동기화
10. MVP End-to-End Flow

MVP에서 검증할 핵심 흐름은 다음과 같다.

1. 사용자가 Web에서 로그인한다.
2. Web에서 companion 페르소나를 만든다.
3. 페르소나가 Supabase personas에 저장된다.
4. 사용자가 Tauri 앱을 실행한다.
5. 앱이 같은 계정의 페르소나를 Supabase에서 불러온다.
6. 앱은 페르소나를 로컬 SQLite에 캐시한다.
7. mock trigger 또는 timer trigger가 발생한다.
8. companion UI가 우측 하단에 짧은 말풍선을 띄운다.
9. 사용자가 클릭/닫기/무시한다.
10. 발화 이벤트와 사용자 반응이 SQLite에 저장된다.
11. 앱은 원본 로그를 서버로 보내지 않고, 안전한 요약만 Supabase로 동기화한다.
11. 예상 질문 (QnA)

Q. OpenClaw나 Clawster 같은 데스크톱 펫과 뭐가 다른가요?

OpenClaw 계열은 사용자의 명령을 수행하는 비서형 에이전트에 가깝습니다. 아마데우스는 작업을 대신하지 않고, 사용자가 혼자 작업하는 동안 곁에서 먼저 말을 걸어주는 정서적 동반자입니다. 핵심 차별점은 자동화가 아니라 능동적 정서 교감입니다.

Q. 기존 AI companion 서비스와 바로 연동되나요?

MVP에서는 기존 외부 서비스와 직접 연동하지 않습니다. 먼저 자체 Web companion과 Tauri 앱을 연결하여, 웹에서 만든 페르소나가 데스크톱 작업 공간까지 이어지는 경험을 검증합니다. 이후에는 러비더비, Zeta, Character.AI와 같은 기존 AI companion 서비스와 연동 가능한 구조로 확장할 수 있습니다.

Q. 화면을 본다는 게 보안상 불안하지 않나요?

아마데우스는 local-first 원칙을 따릅니다. 원본 작업 로그와 민감한 맥락은 앱의 SQLite에 저장하고, 서버에는 비식별 요약 메모리만 동기화합니다. MVP에서는 완전한 화면 캡처 기반 분석보다, mock trigger와 기본 작업 이벤트를 중심으로 핵심 경험을 검증합니다.

Q. MVP 기준은 어디까지인가요?

MVP 기준은 전체 제품 완성이 아니라, 핵심 파이프라인 검증입니다. 웹에서 페르소나를 만들고, 앱에서 같은 페르소나를 불러오며, 앱이 유저 입력 없이 먼저 말풍선을 띄우고, 해당 발화/반응 이벤트를 로컬에 저장하는 것까지를 PoC MVP로 정의합니다.

Q. 능동 발화가 잔소리나 방해로 느껴지면요?

사용자의 닫기, 무시, 부정 반응을 로컬에 저장하고, 이후 발화 빈도와 민감도를 낮추는 구조를 둡니다. 아마데우스의 핵심은 말을 잘하는 것보다, 말해도 되는 순간을 판단하고 필요할 때 침묵하는 것입니다.

Q. Local LLM은 MVP에 포함되나요?

아키텍처상 앱은 Local LLM 사용을 전제로 설계합니다. 다만 5일 PoC에서는 Local LLM Provider Interface를 먼저 만들고, 실제 모델 호출은 mock provider 또는 lightweight provider로 대체할 수 있습니다. 핵심은 LLM 품질보다 페르소나 유지, local-first 저장, 능동 발화 파이프라인 검증입니다.

Q. 현실성이 있나요?

전체 제품을 한 번에 완성하려면 난이도가 높습니다. 그러나 5일 PoC에서는 자체 Web companion, Supabase, Tauri 앱을 연결하여 핵심 파이프라인을 증명하는 것이 목표입니다. 즉, 완성형 앱이 아니라 Architecture-first PoC로 접근하기 때문에 현실성이 있습니다.

12. 핵심 원칙

아마데우스의 MVP 아키텍처 원칙은 다음 한 문장으로 정리된다.

Persona는 서버가 원본, App은 local-first, 민감 원본은 로컬에 남기고 안전한 요약만 동기화한다.

이 원칙을 통해 웹과 앱의 연결성, 데스크톱 companion 경험, 프라이버시 신뢰를 동시에 확보한다.

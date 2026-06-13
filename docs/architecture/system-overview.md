# System Overview

> Web, Supabase, Tauri Desktop App의 책임 경계를 정의한다.

---

## 1. 한 줄 정의

Amadeus는 웹에서 만든 AI persona를 desktop app으로 가져오고, desktop app에서는 그 persona가 local-first 방식으로 사용자의 PC 작업 맥락을 읽고 먼저 말을 거는 companion system이다.

```text
Next.js Web
  -> Supabase
  -> Tauri Desktop App
  -> Local LLM + SQLite + Policy Engine
  -> Companion UI
```

---

## 2. Runtime Map

| Runtime | 본질 | 저장소 | LLM | 민감 데이터 |
| --- | --- | --- | --- | --- |
| Next.js Web | persona/account/cloud chat | Supabase | Cloud API, server-side only | raw work context 금지 |
| Supabase | shared backend/sync hub | Postgres/Auth/Edge Functions | 직접 보유하지 않음 | safe summary only |
| Tauri App | companion runtime | SQLite/Secure Storage | local llama.cpp 우선, template fallback | raw context local-only |

---

## 3. Web Responsibility

Web은 사용자가 처음 들어오는 관리/생성/클라우드 대화 공간이다.

Web이 한다:

- Supabase Auth 로그인
- persona 생성/수정
- cloud conversation
- cloud memory 편집
- desktop device pairing 시작
- sync 상태 확인

Web이 하지 않는다:

- raw screenshot 저장
- OCR raw text 저장
- desktop raw window title 저장
- local private memory 조회
- 브라우저에서 Cloud LLM API key 직접 사용

Next.js에서 mutation과 LLM 호출은 Server Functions 또는 Route Handlers 뒤에서 처리한다. 브라우저 클라이언트는 secret key를 보유하지 않는다.

---

## 4. Supabase Responsibility

Supabase는 공유 백엔드이자 동기화 허브다.

Supabase가 한다:

- Auth identity 관리
- persona 원본 저장
- cloud conversation 저장
- cloud memory 저장
- device registry 관리
- sync event 저장
- RLS 정책 강제
- Edge Function에서 secret 사용

Supabase가 하지 않는다:

- raw work context 저장
- local private memory 저장
- OCR raw text 저장
- raw screenshot 저장
- desktop token을 웹 쿠키로 공유

---

## 5. Tauri App Responsibility

Tauri App은 실제 companion 경험이 실행되는 공간이다.

Tauri App이 한다:

- companion bubble/chat UI
- macOS process/window/idle 감지
- privacy assessment
- trigger evaluation
- final utterance policy decision
- local LLM generation
- local SQLite event/memory 저장
- sync queue 처리
- secure app session 저장

Tauri App이 하지 않는다:

- cloud persona 원본을 단독 수정 source of truth로 삼지 않는다.
- raw sensitive context를 Supabase에 올리지 않는다.
- policy decision을 LLM에게 맡기지 않는다.
- secret key를 앱 번들에 넣지 않는다.

---

## 6. End-to-End Flow

### Persona Creation

```text
User
  -> Next.js Web
  -> Supabase Auth
  -> personas
  -> cloud_memories
```

### Desktop Persona Pull

```text
Tauri App
  -> secure device session
  -> Supabase
  -> personas pull
  -> local_personas cache
  -> Local LLM prompt envelope
```

### Proactive Utterance

```text
Context Bridge
  -> Privacy/Policy Gate
  -> optional Capture/OCR
  -> PolicyScores
  -> Trigger Engine
  -> Utterance Policy
  -> LlmInputEnvelope
  -> Local LLM/template
  -> Companion UI
  -> user_reactions
  -> local SQLite
```

### Safe Summary Sync

```text
local raw events
  -> local summarizer
  -> redaction policy
  -> sync_queue
  -> Supabase cloud_memories or cloud_work_summaries
```

---

## 7. Critical Non-Negotiables

- Persona 원본은 Supabase에 둔다.
- Desktop runtime은 local-first다.
- 민감 원본 작업 맥락은 SQLite only다.
- 서버에는 비식별 safe summary만 선택적으로 동기화한다.
- Final speak/do-not-speak decision은 Rust policy engine이 한다.
- LLM은 문장 생성기이지 정책 결정자가 아니다.

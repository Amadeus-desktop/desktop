# Amadeus Architecture Index

> Amadeus의 전체 제품/기술 아키텍처 source of truth.

---

## 1. 중앙 원칙

Amadeus는 세 실행 환경으로 나뉜다.

```text
Next.js Web
  -> persona creation, account, cloud chat

Supabase
  -> auth, persona source of truth, sync hub, RLS-protected shared data

Tauri Desktop App
  -> local companion runtime, local-first memory, desktop perception, proactive utterance
```

가장 중요한 원칙:

```text
Persona source of truth = Supabase
Companion runtime source of truth = Tauri local app
Sensitive work-context source of truth = local SQLite only
Shared safe summary source of truth = Supabase
Final utterance decision source of truth = Rust policy engine
```

---

## 2. 문서 구조

| 문서 | 역할 |
| --- | --- |
| [system-overview.md](./system-overview.md) | Web, Supabase, Tauri의 전체 책임 경계 |
| [state-management.md](./state-management.md) | Web/App/Rust/Supabase 상태관리 source of truth |
| [data-model.md](./data-model.md) | Local SQLite와 Supabase DB 계약 |
| [sync-and-web.md](./sync-and-web.md) | Next.js 웹, device pairing, sync queue 계약 |
| [policy-and-security.md](./policy-and-security.md) | RLS, secret, privacy, provider input security |
| [local-ai-ocr-llm.md](./local-ai-ocr-llm.md) | OCR, Local LLM, provider routing, prompt boundary |
| [local-perception-spa.md](./local-perception-spa.md) | Desktop perception SPA, score, capture/OCR gate |

---

## 3. 계층별 책임

### Web

- Supabase Auth 로그인
- persona 생성/수정
- cloud chat
- cloud memory 관리
- desktop app pairing 시작
- 안전한 summary memory 표시

Web은 desktop work-context 원본을 저장하지 않는다.

### Supabase

- Auth identity
- persona 원본
- cloud memory
- device registry
- sync event hub
- RLS enforcement
- Edge Function secret boundary

Supabase는 raw screenshot, OCR raw text, raw window title, local private memory를 저장하지 않는다.

### Tauri App

- Companion UI
- macOS context bridge
- policy engine
- trigger engine
- local SQLite
- secure token/device session storage
- local persona cache
- local private memory
- local LLM and OCR adapters
- sync queue

Tauri App은 사용자의 실제 PC 작업 맥락을 다루므로 local-first가 기본이다.

---

## 4. 구현 순서 원칙

1. Local-first desktop runtime을 먼저 안정화한다.
2. policy/security contract를 코드와 테스트로 고정한다.
3. Supabase sync는 safe summary만 대상으로 추가한다.
4. Web은 persona/account/cloud chat부터 추가한다.
5. OCR과 Local LLM은 provider boundary 뒤에 둔다.

---

## 5. 공식 문서 기준

이 문서는 아래 공식 문서를 기준으로 삼는다.

- Next.js Server Functions: https://nextjs.org/docs/app/getting-started/updating-data
- Next.js Route Handlers: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Edge Function secrets: https://supabase.com/docs/guides/functions/secrets
- Supabase PKCE flow: https://supabase.com/docs/guides/auth/sessions/pkce-flow

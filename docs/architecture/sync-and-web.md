# Web And Sync Architecture

> Next.js Web, Supabase, Desktop App 연결과 동기화 계약.

---

## 1. Web Role

Web은 persona 생성, 계정 관리, cloud chat, device pairing을 담당한다.

Web이 소유:

- signup/login UI
- persona editor
- cloud conversation UI
- cloud memory UI
- desktop pairing UI

Web이 소유하지 않음:

- desktop raw work context
- local trigger runtime
- local LLM process
- local private memory

---

## 2. Next.js Boundary

Next.js에서 민감 작업은 서버 측에서 처리한다.

허용:

```text
Browser
  -> Server Function / Route Handler
  -> Supabase / Cloud LLM
  -> Browser
```

금지:

```text
Browser
  -> Cloud LLM API directly with API key
```

공식 문서 기준:

- Next.js Server Functions는 서버에서 실행되는 async 함수이며 client에서 network request로 호출될 수 있다.
- Route Handlers는 route 파일에서 HTTP request handling을 담당한다.

### 2.1 Server Auth Boundary

Browser-originated 요청은 기본적으로 user-scoped Supabase client를 사용한다. Service role은 RLS를 우회할 수 있으므로 좁은 서버/Edge Function 경로에서만 사용한다.

| Route/Action | Auth required | Supabase client | Service role allowed |
| --- | --- | --- | --- |
| persona CRUD | yes | user-scoped | no |
| cloud conversation | yes | user-scoped + server LLM key | no |
| pairing request create | yes | user-scoped | no |
| pairing code verify | yes/device proof | Edge Function internal | yes, narrow |
| sync safe summary | device session | Edge Function internal | yes, validator only |
| public marketing page | no | none | no |

Server Functions and Route Handlers must validate origin/session before mutation. Service role use requires a named allowlist and a test fixture.

---

## 3. Device Pairing

웹과 앱은 쿠키를 공유하지 않는다.

```text
Web session = Supabase cookie session
App session = secure storage device session
```

Pairing flow:

```text
1. User logs in on Web
2. Web creates pairing request
3. Supabase stores short-lived pairing code hash
4. User opens desktop app or deep link
5. App generates or loads device keypair
6. App submits pairing code + device public key to Edge Function
7. Edge Function verifies code, attempts, expiry, and user
8. Edge Function creates device and challenge
9. App signs challenge with device private key
10. Edge Function creates device session
11. App stores session in secure storage
```

Pairing code must be:

- short-lived
- single-use
- user-bound
- rate-limited
- revocable

Device sessions:

- refresh token raw value is shown once to the app
- DB stores only token hash
- refresh token rotates on use
- token family reuse revokes the family
- revoked device invalidates all device sessions

---

## 4. Sync Queue

Desktop app sync is queue-based.

```text
SQLite write
  -> sync_queue pending
  -> safe payload validation
  -> Supabase write
  -> ack
  -> mark synced
```

Rules:

- Sync queue never contains raw screenshot.
- Sync queue never contains OCR raw text.
- Sync queue never contains raw window title.
- Sync payload must include `safety_grade`.
- Sync mutation must include `idempotency_key`.
- Sync payload must be `SyncPayloadEnvelope`.
- Sync validator runs before local queue insert and before Supabase write.

### Conversation Session Sync

Conversation messages use a dedicated mirror path instead of the generic `sync_queue`.

```text
App SQLite conversation_messages(pending)
  -> Supabase upsert_cloud_conversation_message(...)
  -> local message ack with cloud_message_id/server_received_at_ms

Supabase cloud_conversation_messages
  -> App SQLite upsert by cloud_message_id
  -> fallback dedupe by idempotency_key
```

Rules:

- App-created sessions start with a local cloud id and are promoted after a Supabase `cloud_conversations.id` exists.
- Web-origin sessions are mirrored into SQLite with `source = web_mirror`.
- Conversation sync contains user/assistant/system-summary chat text only.
- Raw desktop context, screenshot text, OCR raw text, and window titles are not conversation sync payload.
- Network or auth failures keep local app messages pending/retrying; local text is not deleted on sync failure.

Web implementation contract: [Web Conversation Sync 설계](../superpowers/specs/2026-06-17-web-conversation-sync-design.md).

Web memory/RAG contract: [Web Memory/RAG Contract](../superpowers/specs/2026-06-17-web-memory-rag-contract.md).

---

## 5. Syncable Payloads

Allowed:

- persona pull result
- cloud memory safe summary
- work session safe summary
- app preference allowlist
- sync ack/status

Blocked:

- raw context_events
- raw local_memories
- raw OCR text
- raw screenshots
- full file paths
- URL query strings

Allowed payloads are allowlist-based. A new payload type is blocked until its schema, validator, and tests exist.

`work session safe summary` means `SafeWorkSummary`, not `OcrObservationSummary`. OCR-derived summaries are blocked until retention and consent policy exists.

---

## 6. Conflict Policy

### Persona

Supabase wins by version.

```text
if remote_version > local_version:
  update local cache
else:
  keep local cache
```

App-side persona edits are sent to Supabase as mutations. Local cache is not an independent source of truth.

### Cloud Memory

Cloud memory accepts append/update by `memory_type` and confidence.

Conflict rule:

- higher confidence wins for same normalized memory key
- latest user-edited memory wins over generated memory
- generated memory cannot overwrite explicit user preference

### Local Private Memory

No conflict policy needed because it does not sync.

### Safe Work Summary

Supabase owns accepted `cloud_work_summaries`. Local app owns drafts and delivery attempts.

Conflict rule:

- `idempotency_key` deduplicates retries.
- same `local_session_id` from same device replaces only if `validator_version` is newer or summary version is higher.
- user-edited cloud summary wins over generated summary.
- expired summary must not be used for persona memory.

---

## 7. Web Later Priority

Web is second priority after desktop runtime.

Implementation order:

1. Supabase schema and RLS
2. persona CRUD on Web
3. device pairing
4. app persona pull/cache
5. safe summary sync
6. web cloud chat

Web must not force desktop perception work to depend on cloud availability.

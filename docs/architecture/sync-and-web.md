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
3. Supabase stores short-lived pairing code
4. User opens desktop app or deep link
5. App submits pairing code to Edge Function
6. Edge Function verifies code and user
7. Edge Function creates device + device session
8. App stores session in secure storage
```

Pairing code must be:

- short-lived
- single-use
- user-bound
- rate-limited
- revocable

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

# State Management Architecture

> Amadeus의 상태 source of truth와 ownership을 정의한다.

---

## 1. 상태 분류

| 상태 | Source of Truth | 저장소 | 동기화 |
| --- | --- | --- | --- |
| Auth identity | Supabase Auth | Web cookie / App secure storage | device pairing |
| Persona 원본 | Supabase | Postgres `personas` | app pull/cache |
| Local persona cache | Tauri App | SQLite `local_personas` | remote version 기준 |
| Companion UI state | React | memory | 저장하지 않음 |
| App settings | Tauri App | settings store | 일부만 sync 가능 |
| Trigger runtime | Rust backend | memory + SQLite events | summary만 가능 |
| Work context raw events | Tauri App | SQLite | sync 금지 |
| Local private memory | Tauri App | SQLite | sync 금지 |
| Syncable summary memory | Supabase | Postgres `cloud_memories` | sync_queue |
| Device sessions | Supabase + App | Postgres + secure storage | Edge Function |

---

## 2. Central State Rule

한 데이터에는 하나의 authoritative owner만 둔다.

```text
persona content       -> Supabase owns
desktop work context  -> Tauri owns
trigger decision      -> Rust owns
UI open/closed state  -> React owns
sync delivery state   -> local sync_queue owns until ack
```

동일 데이터를 Web과 App이 동시에 수정하지 않는다. App이 cloud persona를 수정해야 한다면 local draft가 아니라 Supabase mutation으로 보낸다.

---

## 3. React State

React는 화면 상태와 사용자 interaction만 소유한다.

React가 소유:

- selected tab
- bubble visible/hidden
- chat panel open/closed
- input text
- pending/loading/error state

React가 소유하지 않음:

- final trigger score
- privacy decision
- LLM provider route truth
- timeline persistence truth
- sync status truth

React는 Rust command 또는 repository adapter를 통해 backend state를 읽는다.

---

## 4. Rust Backend State

Rust backend는 desktop runtime의 authoritative layer다.

Rust가 소유:

- macOS context snapshot
- privacy assessment
- policy scores
- trigger evaluation
- LLM provider routing
- sidecar lifecycle
- settings persistence
- SQLite repository

Rust state는 module별로 쪼갠다.

```text
src-tauri/src/
  macos_context/
  privacy/
  trigger/
  timeline/
  settings/
  llm/
  llama_sidecar/
```

Root `lib.rs`는 composition root다. 도메인 로직을 넣지 않는다.

---

## 5. App Settings

App settings는 Tauri App의 local state다.

예:

- talk frequency
- model route
- local fallback enabled
- local model path
- llama server path
- night care enabled
- screen context enabled

원칙:

- secret은 settings 파일에 저장하지 않는다.
- token은 secure storage에 저장한다.
- model path는 local-only다.
- sync 가능한 settings는 explicit allowlist가 필요하다.

---

## 6. Session State

세션은 3종류로 나눈다.

### Auth Session

```text
who is the user?
```

| Runtime | 저장 |
| --- | --- |
| Web | Supabase cookie session |
| App | secure storage token/device session |

웹 쿠키를 앱에 공유하지 않는다.

### Conversation Session

```text
which persona did the user talk to?
```

| Runtime | 저장 |
| --- | --- |
| Web | Supabase `cloud_conversations` |
| App | SQLite `conversation_sessions/messages` |
| Sync | safe summary only |

### Work Session

```text
what local workflow happened?
```

| 데이터 | 저장 |
| --- | --- |
| raw work events | SQLite only |
| utterance/reaction events | SQLite |
| safe work summary | optional Supabase sync |

---

## 7. Sync State

Sync는 optimistic mutation이 아니라 queue 기반이다.

```text
local write
  -> sync_queue pending
  -> network available
  -> Edge Function / Supabase write
  -> ack
  -> local synced
```

Sync queue는 idempotency key를 반드시 가진다.

```text
sync_queue {
  id
  event_type
  payload_json
  idempotency_key
  status
  retry_count
  last_error
  created_at
  updated_at
}
```

원본 민감 데이터는 sync_queue에 넣지 않는다.

# Data Model Architecture

> Local SQLite와 Supabase Postgres의 데이터 계약을 정의한다.

---

## 1. Storage Split

```text
Supabase Postgres
  -> shared identity, persona, cloud memory, device, sync event

Tauri SQLite
  -> local runtime event, raw work context, private memory, local cache
```

---

## 2. Data Classification

| 등급 | 예시 | 저장 위치 | Sync |
| --- | --- | --- | --- |
| Public | 앱 버전, feature flag | Supabase 가능 | 가능 |
| Account | profile, user settings 일부 | Supabase | 가능 |
| Persona | name, tone, system prompt | Supabase 원본 + local cache | 가능 |
| Shared Memory | 안전한 preference summary | Supabase | 가능 |
| Local Private | window title, file hint, app event | SQLite only | 금지 |
| Ephemeral Sensitive | screenshot, OCR raw text | memory only | 금지 |
| Secret | tokens, API keys | secure storage / server env | 금지 |

---

## 3. Supabase Tables

### profiles

```text
profiles {
  user_id uuid primary key references auth.users(id)
  display_name text
  avatar_url text
  created_at timestamptz
  updated_at timestamptz
}
```

### personas

```text
personas {
  id uuid primary key
  user_id uuid references auth.users(id)
  name text not null
  tone text not null
  personality_json jsonb not null
  system_prompt text not null
  version integer not null
  created_at timestamptz
  updated_at timestamptz
  deleted_at timestamptz null
}
```

Supabase `personas`가 persona 원본이다.

### cloud_memories

```text
cloud_memories {
  id uuid primary key
  user_id uuid references auth.users(id)
  persona_id uuid references personas(id)
  memory_type text not null
  content text not null
  confidence numeric not null
  source text not null
  safety_grade text not null
  created_at timestamptz
  updated_at timestamptz
}
```

`content`는 safe summary만 허용한다.

### devices

```text
devices {
  id uuid primary key
  user_id uuid references auth.users(id)
  device_name text
  platform text
  app_version text
  public_key text
  trusted boolean
  created_at timestamptz
  last_seen_at timestamptz
  revoked_at timestamptz null
}
```

### device_sessions

```text
device_sessions {
  id uuid primary key
  user_id uuid references auth.users(id)
  device_id uuid references devices(id)
  refresh_token_hash text
  token_family_id uuid not null
  hash_alg text not null
  expires_at timestamptz
  rotated_at timestamptz null
  last_used_at timestamptz null
  created_at timestamptz
  revoked_at timestamptz null
  revoked_reason text null
}
```

Raw refresh token은 DB에 저장하지 않는다.

### pairing_requests

```text
pairing_requests {
  id uuid primary key
  created_by_user_id uuid references auth.users(id)
  code_hash text not null
  device_name text null
  expires_at timestamptz not null
  used_at timestamptz null
  attempt_count integer not null default 0
  created_at timestamptz not null
}
```

Pairing code raw value는 저장하지 않는다. Pairing request는 short-lived, single-use, rate-limited여야 한다.

### sync_events

```text
sync_events {
  id uuid primary key
  user_id uuid references auth.users(id)
  device_id uuid references devices(id)
  event_type text not null
  idempotency_key text not null
  payload_json jsonb not null -- SyncPayloadEnvelope only
  safety_grade text not null
  redaction_level text not null
  retention_policy text not null
  status text not null
  created_at timestamptz
}
```

`payload_json`은 safe summary payload만 허용한다.

### cloud_conversations

```text
cloud_conversations {
  id uuid primary key
  user_id uuid references auth.users(id)
  persona_id uuid references personas(id)
  title text
  summary text
  created_at timestamptz
  updated_at timestamptz
}
```

### cloud_conversation_messages

```text
cloud_conversation_messages {
  id uuid primary key
  user_id uuid references auth.users(id)
  conversation_id uuid references cloud_conversations(id)
  role text not null
  content text not null
  provider text null
  safety_grade text not null
  created_at timestamptz
}
```

Cloud conversation message는 웹 대화용이다. Desktop raw work context를 message content에 저장하지 않는다.

### cloud_work_summaries

```text
cloud_work_summaries {
  id uuid primary key
  user_id uuid references auth.users(id)
  persona_id uuid references personas(id) null
  source_device_id uuid references devices(id)
  local_session_id text not null
  summary_redacted text not null
  redaction_level text not null
  retention_policy text not null
  expires_at timestamptz null
  idempotency_key text not null
  created_at timestamptz
}
```

`cloud_work_summaries`는 accepted safe work summary의 Supabase 원장이다. `sync_events`는 delivery/event log이고, summary 원장이 아니다.

---

## 4. Local SQLite Tables

현재 MVP에는 context/utterance/reaction timeline이 있다. 이후 구조는 아래 방향으로 확장한다.

### local_personas

```text
local_personas {
  id text primary key
  remote_persona_id text not null
  name text not null
  tone text not null
  personality_json text not null
  system_prompt text not null
  remote_version integer not null
  sync_status text not null
  updated_at_ms integer not null
}
```

### context_events

```text
context_events {
  id text primary key
  app_name text not null
  window_title text not null
  event_type text not null
  metadata_json text not null
  created_at_ms integer not null
}
```

원칙:

- raw sensitive title은 privacy gate를 통과하지 못하면 저장하지 않는다.
- OCR summary는 retention contract 전까지 저장하지 않는다.

### utterance_events

```text
utterance_events {
  id text primary key
  trigger_type text not null
  speakability_score integer not null
  message text not null
  provider text not null
  context_event_id text null
  created_at_ms integer not null
}
```

### user_reactions

```text
user_reactions {
  id text primary key
  utterance_event_id text null
  reaction_type text not null
  created_at_ms integer not null
}
```

### local_memories

```text
local_memories {
  id text primary key
  persona_id text null
  memory_type text not null
  content text not null
  scope text not null
  confidence integer not null
  created_at_ms integer not null
  updated_at_ms integer not null
}
```

`scope = local_private`는 sync 금지다.

### work_sessions

```text
work_sessions {
  id text primary key
  started_at_ms integer not null
  ended_at_ms integer null
  summary_redacted text null
  dominant_app_category text
  created_at_ms integer not null
}
```

### conversation_sessions

```text
conversation_sessions {
  id text primary key
  persona_id text not null
  source text not null
  created_at_ms integer not null
  updated_at_ms integer not null
}
```

### conversation_messages

```text
conversation_messages {
  id text primary key
  session_id text not null
  role text not null
  content text not null
  provider text null
  created_at_ms integer not null
}
```

### sync_queue

```text
sync_queue {
  id text primary key
  event_type text not null
  payload_json text not null -- SyncPayloadEnvelope only
  idempotency_key text not null
  safety_grade text not null
  redaction_level text not null
  retention_policy text not null
  status text not null
  retry_count integer not null
  last_error text null
  created_at_ms integer not null
  updated_at_ms integer not null
}
```

### SyncPayloadEnvelope

Local `sync_queue.payload_json`과 Supabase `sync_events.payload_json`은 반드시 아래 envelope만 허용한다.

```text
SyncPayloadEnvelope {
  schema_version: integer
  event_type: text
  payload_class: SafeSummary | PersonaPull | PreferenceAllowlist | SyncAck
  safety_grade: Public | Account | Persona | SharedMemory | SafeWorkSummary
  redaction_level: None | TitleRedacted | SummaryRedacted | SensitiveSuppressed
  retention_policy: Ephemeral | Session | Timeline
  validator_version: text
  payload: object
}
```

Envelope 금지 키:

- raw_window_title
- raw_ocr_text
- screenshot_path
- file_path
- full_url
- url_query
- token
- keystroke_text

새 `event_type`을 추가하려면 allowlist schema와 validator test를 먼저 추가한다.

---

## 5. Retention Contract

OCR 또는 perception summary를 저장하려면 아래 필드가 먼저 필요하다.

```text
retention_policy: Ephemeral | Session | Timeline
expires_at: Option<DateTime>
redaction_level: None | TitleRedacted | SummaryRedacted | SensitiveSuppressed
source_kind: Process | Capture | Ocr | Llm
```

이 필드가 구현되기 전에는 OCR summary를 SQLite나 Supabase에 저장하지 않는다.

---

## 6. RLS Baseline

Supabase의 사용자 데이터 테이블은 반드시 `user_id = auth.uid()` 정책을 가진다.

예시:

```sql
create policy "users can read own personas"
on personas
for select
using (user_id = auth.uid());
```

RLS 없는 shared table은 MVP에서 금지한다.

### 6.1 RLS Matrix

| Table | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| profiles | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | no hard delete |
| personas | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | soft delete only |
| cloud_memories | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | soft delete or owner delete |
| cloud_work_summaries | `user_id = auth.uid()` | Edge Function or owner insert | owner read/update limited | retention delete |
| devices | `user_id = auth.uid()` | Edge Function only | owner revoke only | no hard delete |
| device_sessions | owner metadata only | Edge Function only | Edge Function only | Edge Function only |
| pairing_requests | `created_by_user_id = auth.uid()` | `created_by_user_id = auth.uid()` | Edge Function only | expiry cleanup |
| sync_events | `user_id = auth.uid()` | Edge Function or owner device insert | status update by owner/device | no hard delete |
| cloud_conversations | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | owner delete |
| cloud_conversation_messages | `user_id = auth.uid()` | `user_id = auth.uid()` | no update except moderation metadata | owner delete |

`insert`와 `update`에는 `with check (user_id = auth.uid())`가 필요하다. `persona_id`, `device_id`, `conversation_id` 같은 FK는 같은 `user_id` 소유인지 `exists`로 검증해야 한다.

### 6.2 Database Constraints

필수 제약:

- `personas`: `unique(user_id, id)` and `check(version >= 1)`
- `cloud_memories`: `check(confidence >= 0 and confidence <= 100)`
- `cloud_work_summaries`: `unique(user_id, source_device_id, idempotency_key)`
- `cloud_conversation_messages`: role enum/check and same-user conversation FK
- `devices`: revoked device cannot create new sessions
- `device_sessions`: `unique(user_id, device_id, token_family_id)`
- `pairing_requests`: `unique(code_hash)`, `check(attempt_count >= 0)`, short expiry
- `sync_events`: `unique(user_id, device_id, idempotency_key)`
- `sync_queue`: local `unique(idempotency_key)`
- status fields: enum/check only
- safety/redaction/retention fields: enum/check only

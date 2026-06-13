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
  expires_at timestamptz
  created_at timestamptz
  revoked_at timestamptz null
}
```

Raw refresh token은 DB에 저장하지 않는다.

### sync_events

```text
sync_events {
  id uuid primary key
  user_id uuid references auth.users(id)
  device_id uuid references devices(id)
  event_type text not null
  idempotency_key text not null
  payload_json jsonb not null
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
  payload_json text not null
  idempotency_key text not null
  status text not null
  retry_count integer not null
  last_error text null
  created_at_ms integer not null
  updated_at_ms integer not null
}
```

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

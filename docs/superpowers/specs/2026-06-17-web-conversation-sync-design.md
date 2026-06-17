# Web Conversation Sync 설계

## 목표

웹에서도 앱과 같은 Supabase conversation 원장을 사용해 대화 세션과 메시지를 동기화한다.

```text
Web cloud conversation UI
  <-> Supabase cloud_conversations / cloud_conversation_messages
  <-> Desktop App SQLite mirror
```

## 현재 근거

사실:

- Supabase에는 `cloud_conversations`, `cloud_conversation_messages`, `devices`, `conversation_sync_cursors`가 있다.
- Supabase에는 idempotency 기반 RPC `upsert_cloud_conversation_message(...)`가 있다.
- 앱 쪽에는 local pending message push, cloud message pull, local upsert/dedupe 경로가 구현되어 있다.
- 앱 pull은 현재 `conversation_sync_cursors`를 아직 쓰지 않고, cloud rows 조회 후 `cloud_message_id`와 `idempotency_key`로 dedupe한다.
- 이 repo 안에는 아직 완성된 Next.js Web conversation UI surface가 확인되지 않는다.

추정:

- 웹은 Supabase cookie session을 쓰는 Next.js App Router 기반 surface로 구현될 가능성이 높다. 이건 확인된 사실이 아니라 추정입니다.

## 원칙

- Supabase가 Web/App conversation의 공유 원본이다.
- Web은 SQLite를 직접 알지 않는다.
- Web은 Supabase user-scoped session으로만 conversation row를 읽고 쓴다.
- Web browser는 Cloud LLM API key나 service role key를 보유하지 않는다.
- Web이 작성하는 메시지도 앱과 같은 `idempotency_key` 규칙을 따른다.
- raw desktop context, OCR raw text, screenshot, file path, full URL은 웹 conversation sync에 포함하지 않는다.

## Web Auth Boundary

Web session:

```text
Browser
  -> Supabase Auth cookie/session
  -> user-scoped Supabase client
```

허용:

- Web browser가 자기 계정의 `cloud_conversations`를 select/insert/update.
- Web browser가 자기 계정의 `cloud_conversation_messages`를 select.
- Web Route Handler 또는 Server Function이 사용자 세션을 검증한 뒤 LLM 호출을 수행.
- Web Route Handler 또는 Server Function이 사용자 세션으로 `upsert_cloud_conversation_message(...)`를 호출.

금지:

- Browser bundle에 service role key 포함.
- Browser bundle에서 Cloud LLM provider key 직접 사용.
- Web이 app local SQLite schema나 Tauri command를 호출한다고 가정.
- Web이 desktop raw context를 conversation message로 저장.

## Web Data Flow

### 1. Conversation List

```text
Web session ready
  -> select cloud_conversations
  -> filter user_id by RLS
  -> order by last_message_at desc nulls last, updated_at desc
  -> render conversation list
```

Required columns:

- `id`
- `persona_id`
- `title`
- `active_surface`
- `summary`
- `last_message_at`
- `created_at`
- `updated_at`

### 2. Conversation Open

```text
open conversation
  -> select cloud_conversation_messages
  -> where conversation_id = selected id
  -> order by client_created_at, source_device_id, client_sequence, server_received_at, id
  -> render stable thread
```

Stable order must match app policy:

```text
client_created_at
source_device_id
client_sequence
server_received_at
id
```

### 3. Web User Message Send

```text
user sends message
  -> create idempotency_key
  -> ensure cloud_conversation exists
  -> call upsert_cloud_conversation_message(...)
  -> optimistically render pending message
  -> replace pending with returned cloud row
```

RPC input mapping:

```text
p_conversation_id      -> cloud_conversations.id
p_persona_id           -> selected persona uuid
p_role                 -> user
p_content              -> user message text
p_provider             -> null
p_surface              -> web
p_source_device_id     -> web device id or null for first pass
p_local_message_id     -> null unless web has local draft id
p_idempotency_key      -> generated stable key
p_safety_grade         -> Account
p_client_created_at    -> browser/server created timestamp
p_client_sequence      -> per-conversation web sequence or null
```

### 4. Web Assistant Reply

```text
user message accepted
  -> Route Handler / Server Function loads persona + safe memory context
  -> Cloud LLM generates assistant reply
  -> call upsert_cloud_conversation_message(...)
  -> return assistant cloud row to browser
```

Assistant message mapping:

```text
p_role              -> assistant
p_provider          -> provider id, e.g. edge/openai/local-router
p_surface           -> web
p_safety_grade      -> Account
p_idempotency_key   -> deterministic reply key tied to user message id
```

## Web Device Identity

첫 구현 선택지는 두 가지다.

### Option A: `source_device_id = null`

사실:

- Supabase RPC와 schema는 `source_device_id`를 nullable로 허용한다.
- 앱도 현재 first pass에서 nullable을 허용한다.

장점:

- 웹 구현이 단순하다.
- device pairing 없이 conversation sync를 검증할 수 있다.

단점:

- 동일 브라우저/탭 단위 추적이 약하다.
- `conversation_sync_cursors`를 device-scoped로 쓰기 어렵다.

### Option B: Web device row 생성

```text
Browser install id
  -> devices upsert(platform = web)
  -> source_device_id = devices.id
```

장점:

- app/web ordering과 cursor ownership이 명확하다.
- device revoke 정책과 맞출 수 있다.

단점:

- browser install id 저장, revoke UX, multi-browser 처리가 필요하다.

의견:

- 1차 웹 sync 검증은 Option A로 시작하고, cursor persistence 단계에서 Option B로 올리는 것이 현실적이다.

## Realtime And Polling

1차 구현:

```text
send message
  -> RPC response로 thread append
focus/reconnect
  -> refetch messages
```

2차 구현:

```text
Supabase Realtime subscription
  -> cloud_conversation_messages insert
  -> update active thread
```

주의:

- Realtime은 UX 최적화일 뿐 source of truth가 아니다.
- Reconnect 후에는 반드시 deterministic query로 재조회한다.
- 중복 이벤트는 `id` 또는 `idempotency_key`로 무시한다.

## Conflict And Dedupe

Web insert:

- 같은 `(user_id, conversation_id, idempotency_key)`는 같은 메시지로 취급한다.
- RPC가 기존 row를 반환하면 성공으로 처리한다.
- pending optimistic row는 returned `id`로 치환한다.

App/Web race:

- App이 먼저 올린 local message를 Web이 읽으면 `surface = app`.
- Web이 먼저 올린 message를 App이 pull하면 SQLite에 `source = web_mirror` session/message로 반영된다.
- 같은 idempotency key인데 content가 다르면 conflict로 취급하고 자동 병합하지 않는다.

## Web API Contract

권장 Route Handlers:

```text
GET  /api/conversations
POST /api/conversations
GET  /api/conversations/:id/messages
POST /api/conversations/:id/messages
POST /api/conversations/:id/reply
```

### `POST /api/conversations/:id/messages`

Request:

```json
{
  "content": "message text",
  "idempotencyKey": "web-msg-...",
  "clientCreatedAt": "2026-06-17T00:00:00.000Z",
  "clientSequence": 1
}
```

Response:

```json
{
  "id": "cloud-message-uuid",
  "conversationId": "cloud-conversation-uuid",
  "role": "user",
  "content": "message text",
  "surface": "web",
  "idempotencyKey": "web-msg-...",
  "clientCreatedAt": "2026-06-17T00:00:00.000Z",
  "serverReceivedAt": "2026-06-17T00:00:01.000Z"
}
```

Validation:

- `content` required, trimmed non-empty.
- `content` max length must be explicit.
- `idempotencyKey` required and stable across retry.
- `conversation_id` must belong to current Supabase user.
- `persona_id` must belong to current Supabase user.

### `POST /api/conversations/:id/reply`

Request:

```json
{
  "afterMessageId": "cloud-message-uuid",
  "idempotencyKey": "web-reply-..."
}
```

Response:

```json
{
  "message": {
    "id": "assistant-cloud-message-uuid",
    "role": "assistant",
    "content": "assistant reply",
    "provider": "edge",
    "surface": "web"
  }
}
```

Validation:

- `afterMessageId` must belong to the same conversation.
- Reply generation must use server-side provider secrets only.
- Prompt context must exclude raw desktop context.

## Security And Privacy

Required:

- RLS remains enabled on `cloud_conversations` and `cloud_conversation_messages`.
- All Web mutations require authenticated Supabase user.
- Service role is not used for ordinary conversation CRUD.
- Server logs redact message content by default unless explicit debug mode is locally enabled.
- Message payload must not include raw desktop context fields.

Blocked fields in Web message metadata:

- `rawOcrText`
- `screenshotPath`
- `windowTitle`
- `filePath`
- `fullUrl`
- `accessToken`
- `refreshToken`
- `apiKey`

## Testing

Web unit tests:

- Web message request maps to `upsert_cloud_conversation_message(...)`.
- Duplicate `idempotencyKey` response is treated as success.
- Message ordering is stable when app/web messages interleave.
- Empty content is rejected.
- Forbidden raw context keys are rejected.

Web integration tests:

- Authenticated user can create conversation and message.
- User A cannot read User B conversation.
- User A cannot attach message to User B persona.
- Assistant reply route never exposes provider key to browser.

App/Web sync tests:

- Web-created user message appears in App after pull.
- App-created user message appears in Web after refetch.
- Web assistant reply appears in App after pull.
- Duplicate pull does not create duplicate SQLite messages.

## Implementation Order

1. Add Web Supabase conversation repository.
2. Add Web route handlers for conversation list/create and message list/create.
3. Add Web chat UI using `cloud_conversations` and `cloud_conversation_messages`.
4. Add server-side assistant reply route.
5. Add app/web refetch sync test with seeded Supabase rows.
6. Add optional Supabase Realtime subscription.
7. Add cursor persistence/device identity after first sync is verified.

## Out Of Scope

- Desktop raw context sync.
- Memory extraction from Web conversation.
- RAG ranking changes.
- Device revoke UI.
- Full multi-device cursor UX.

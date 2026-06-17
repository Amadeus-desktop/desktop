# Conversation Session Sync 설계

## 목표

앱 로컬 대화 세션과 웹 Supabase 대화 세션을 같은 사용자 계정 안에서 양방향 동기화한다.

1차 범위는 conversation session/message sync만 포함한다. Memory sync 확장과 RAG source selection 정교화는 이 sync 기반이 안정된 뒤 진행한다.

구현 상태(2026-06-17): 앱 로컬 pending 메시지 push, Supabase cloud message pull, 로컬 cloud message upsert/dedupe, 인증 완료 후 1회 sync trigger가 구현되었다. `conversation_sync_cursors` 기반 cursor persistence는 아직 구현되지 않았고, 현재 pull은 최근 cloud messages 조회 후 `cloud_message_id`/`idempotency_key` dedupe에 의존한다.

```text
App SQLite conversation_sessions / conversation_messages
  <-> Supabase cloud_conversations / cloud_conversation_messages
  <-> Web cloud conversation UI
```

## 현재 근거

사실:

- Supabase에는 `cloud_conversations`, `cloud_conversation_messages`, `conversation_sync_cursors`, `devices`, `device_sessions`가 있다.
- Supabase에는 idempotency 기반 `upsert_cloud_conversation_message(...)` RPC가 있다.
- SQLite에는 `conversation_sessions`, `conversation_messages`, `sync_queue`가 있다.
- 앱 로컬 메시지는 `idempotency_key`, `client_sequence`, `created_at_ms`, `sync_status`, `cloud_message_id`, `server_received_at_ms`를 가진다.
- `domain/conversation/syncPolicy.ts`에는 ack 적용, stable ordering, auth expiry pending 정책이 있다.

추정:

- Web conversation UI는 아직 이 repo 안에 완성된 surface로 존재하지 않는다. 따라서 이번 단계는 Supabase cloud schema와 앱 local mirror가 웹에서 사용할 수 있는 상태를 만드는 것을 목표로 한다.

## 원칙

- Supabase가 cross-surface conversation의 공유 원본이다.
- SQLite는 앱 offline-first local mirror이다.
- raw desktop context는 conversation sync payload에 넣지 않는다.
- 메시지 중복 방지는 `idempotency_key`와 Supabase RPC에 맡긴다.
- 사용자가 보는 정렬은 `createdAtMs -> sourceDeviceId -> clientSequence -> serverReceivedAtMs -> id` 정책을 유지한다.
- 인증 만료나 네트워크 실패는 로컬 메시지를 삭제하지 않고 retry 가능한 상태로 둔다.

## 데이터 흐름

### App Push

```text
appendConversationMessage()
  -> SQLite conversation_messages(sync_status = pending)
  -> pushPendingConversationMessages()
  -> resolve remote persona id
  -> ensure cloud_conversation exists
  -> upsert_cloud_conversation_message RPC
  -> mark local message synced with cloud_message_id/server_received_at_ms
```

Push worker는 pending/retrying local message만 전송한다.

RPC input mapping:

```text
conversation_messages.session_id       -> local session lookup
conversation_sessions.cloud_conversation_id -> p_conversation_id
local persona slug or remote id        -> p_persona_id
message.role                           -> p_role
message.content                        -> p_content
message.provider                       -> p_provider
surface                                -> app
source_device_id                       -> current Supabase device id, nullable for first pass
message.id                             -> p_local_message_id
message.idempotency_key                -> p_idempotency_key
safety_grade                           -> Account
message.created_at_ms                  -> p_client_created_at
message.client_sequence                -> p_client_sequence
```

### App Pull

```text
conversation_sync_cursors
  -> list cloud messages after cursor
  -> upsert into SQLite conversation_messages
  -> dedupe by cloud_message_id/idempotency_key
  -> render merged order
```

Pull worker mirrors web/app cloud messages into local SQLite. Existing local messages with matching `cloud_message_id` or `idempotency_key` are updated, not duplicated.

Cloud messages from web should land in the same persona conversation thread when possible. If local app session does not exist, create a `conversation_sessions` row with `source = web_mirror`.

### Cursor

Planned cursor design:

For each `(device_id, cloud_conversation_id)`, store:

- `last_seen_message_created_at`
- `last_seen_message_id`
- `last_seen_server_received_at`
- `last_acknowledged_client_sequence`

The pull query must be deterministic and must not rely on offset pagination.

Current implementation note: cursor row update is deferred. The first implementation reads recent cloud rows by `server_received_at` and keeps local idempotency through SQLite upsert/dedupe.

## Required App Repository Changes

SQLite repository needs these operations:

- `list_pending_conversation_messages(limit)`
- `mark_conversation_message_synced(local_message_id, cloud_message_id, server_received_at_ms)`
- `mark_conversation_message_sync_failed(local_message_id, retryable, error)`
- `mark_conversation_session_synced(local_session_id, cloud_conversation_id)`
- `upsert_cloud_conversation_message(remote message snapshot)`

TypeScript sync worker needs these operations:

- `syncPendingConversationMessages()`
- `pullCloudConversationMessages()`

Supabase adapter needs these operations:

- `ensureCloudConversationForLocalSession(local session)`
- `upsertCloudConversationMessage(local message)`
- `listCloudConversationMessages(personaId, sinceServerReceivedAtMs, limit)`

## Error Handling

Push:

- Network/Supabase transient failure: mark message `retrying` or leave pending with redacted error.
- Auth/session failure: leave pending; do not delete content.
- RLS/persona mismatch: mark `error` with redacted error and surface developer-visible log.
- Duplicate idempotency key: treat returned existing row as success.

Pull:

- Network failure: keep existing local state.
- Malformed cloud row: skip row, log redacted error, do not advance cursor past skipped row.
- Local conflict: preserve local pending content and mark `conflicted` only when cloud row has same idempotency key but incompatible content.

## Security And Privacy

- Conversation sync contains user/assistant chat text only.
- It must not include raw OCR, raw window title, file path, full URL, screenshot path, token, or desktop raw context fields.
- `source_device_id` must belong to `auth.uid()` when present.
- Cloud conversation `persona_id` must belong to `auth.uid()`.
- Client must use user-scoped Supabase session, not service role.

## Testing

Rust SQLite tests:

- Pending local messages can be listed in stable order.
- Ack updates `cloud_message_id`, `sync_status`, and `server_received_at_ms`.
- Retryable failure preserves message content.
- Cloud/web message upsert does not duplicate existing local message.

TypeScript tests:

- Push worker calls `upsert_cloud_conversation_message` with idempotency key and marks ack.
- Duplicate RPC response is treated as success.
- Pull worker merges web messages into local session.
- Auth/network failure keeps local pending messages.
- Forbidden raw context keys are rejected before sync payload creation.

Supabase tests:

- User A cannot read/write User B conversations or messages.
- User A cannot attach messages to User B persona.
- Duplicate `idempotency_key` returns existing message.
- Cursor rows are user/device/conversation scoped.

## Out Of Scope

- Full web UI implementation.
- Memory extraction from conversation.
- RAG ranking changes.
- Raw desktop context sync.
- Device pairing redesign beyond using the existing `devices`/`device_sessions` contract.

## Implementation Order

1. Add local SQLite repository commands for pending message list, ack, failure, and cloud message upsert.
2. Add Supabase conversation adapter for conversation ensure, device registration, message upsert, and message pull.
3. Add TypeScript sync worker for push.
4. Add TypeScript sync worker for pull.
5. Connect sync worker to app lifecycle/auth-ready points.
6. Add focused tests and update sync docs.

# Phase 02. Cross-Surface Conversation Session

## Goal

웹과 앱이 같은 conversation thread를 이어서 사용하게 한다.

Conversation continuity is not RAG. It is thread identity, message sync, and cursor correctness.

## Canonical Cloud Thread

```text
cloud_conversations
- id uuid primary key
- user_id uuid references auth.users(id)
- persona_id uuid references personas(id)
- title text null
- active_surface text null -- web | app
- summary text null
- last_message_at timestamptz null
- created_at timestamptz not null
- updated_at timestamptz not null
- deleted_at timestamptz null
```

```text
cloud_conversation_messages
- id uuid primary key
- user_id uuid references auth.users(id)
- conversation_id uuid references cloud_conversations(id)
- persona_id uuid references personas(id)
- role text not null -- user | assistant | system_summary
- content text not null
- provider text null
- surface text not null -- web | app
- source_device_id uuid null references devices(id)
- local_message_id text null
- idempotency_key text not null
- safety_grade text not null
- client_created_at timestamptz not null
- client_sequence integer null
- server_received_at timestamptz not null
- created_at timestamptz not null
```

Required constraints:

```text
unique(user_id, conversation_id, idempotency_key)
unique(user_id, conversation_id, source_device_id, local_message_id) where local_message_id is not null
foreign key (conversation_id, user_id) matches a conversation owned by the same user
foreign key (persona_id, user_id) matches a persona owned by the same user
```

`created_at` is the row creation timestamp. It is not the only ordering source.

## App Local Mirror

```text
conversation_sessions
- id text primary key
- cloud_conversation_id text not null
- persona_id text not null
- source text not null -- app | web_mirror
- sync_status text not null -- pending | retrying | synced | error | conflicted | deleted
- last_synced_message_at_ms integer null
- created_at_ms integer not null
- updated_at_ms integer not null
```

```text
conversation_messages
- id text primary key
- cloud_message_id text null
- session_id text not null
- role text not null
- content text not null
- provider text null
- sync_status text not null -- pending | retrying | synced | error | conflicted | deleted
- idempotency_key text not null
- client_sequence integer not null
- created_at_ms integer not null
- server_received_at_ms integer null
```

Local `client_sequence` is monotonic per local conversation session.

## Devices And Device Sessions

Cloud sync is device-scoped.

```text
devices
- id uuid primary key
- user_id uuid references auth.users(id)
- device_label text null
- platform text not null -- macos | web | other
- public_install_id text not null
- last_seen_at timestamptz null
- revoked_at timestamptz null
- created_at timestamptz not null
```

```text
device_sessions
- id uuid primary key
- user_id uuid references auth.users(id)
- device_id uuid references devices(id)
- auth_session_id text not null
- token_hash text not null
- issued_at timestamptz not null
- expires_at timestamptz not null
- revoked_at timestamptz null
- last_seen_at timestamptz null
```

Rules:

- App registers or reuses one device id after Supabase auth.
- Device id is bound to the authenticated user.
- Device session is bound to both Supabase auth session and device id.
- Revoked devices cannot upload messages or advance cursors.
- Expired or revoked device sessions cannot upload messages.
- Cursor reads/writes are limited to the same `user_id` and `device_id`.
- Stolen or stale devices are handled by setting `revoked_at`.

## Sync Cursor

```text
conversation_sync_cursors
- id uuid primary key
- user_id uuid references auth.users(id)
- device_id uuid references devices(id)
- conversation_id uuid references cloud_conversations(id)
- last_seen_message_created_at timestamptz null
- last_seen_message_id uuid null
- last_seen_server_received_at timestamptz null
- last_acknowledged_client_sequence integer null
- updated_at timestamptz not null
```

## Flow

```text
Web sends message
  -> insert cloud_conversation_messages
  -> web prompt builder reads thread

App sends message
  -> insert local pending message
  -> sync with idempotency_key
  -> insert cloud_conversation_messages
  -> mark local message synced
```

## Offline Rule

App can continue a conversation offline. Offline app messages are local pending messages until sync.

Conflict rule:

- `idempotency_key` deduplicates message upload.
- Cloud stable order uses `(client_created_at, source_device_id, client_sequence, server_received_at, id)`.
- App local ordering uses local timestamp until cloud ack.
- If cloud ack returns a different order, local mirror follows stable cloud order and records a reorder event for diagnostics.
- Server must return existing row when the same `idempotency_key` is retried.
- Duplicate retry must be a successful idempotent ack, not an error, when the existing row belongs to the same user and conversation.
- Web messages use a web device/session identity or a deterministic `source_device_id` equivalent, so ordering tie breakers are always present.

Clock skew rule:

- `server_received_at` is used for pagination and diagnostics.
- `client_created_at` is used only with device/sequence tie breakers.
- If `client_created_at` is far outside an allowed skew window, server accepts the message but marks it `clock_skewed` in audit metadata and still orders with tie breakers.

## Offline Sync State Machine

```text
pending
  -> retrying
  -> synced

pending | retrying
  -> error        -- transient network/auth/server failure
  -> conflicted   -- stale conversation/persona/device contract
  -> deleted      -- local tombstone waiting for cloud propagation
```

Rules:

- Retry uses bounded exponential backoff.
- Auth expiry pauses sync and keeps messages local.
- Partial ack updates only acknowledged messages.
- Tombstones sync before new writes when they affect the same conversation.
- Permanent failures keep local content but stop automatic retry until user action or app repair.

## RLS

- User can read/write only own conversations and messages.
- Message insert must verify conversation and persona belong to same user.
- Service-role writes are allowed only through named Edge Functions.
- Device cursor writes must verify `devices.user_id = auth.uid()` and `devices.revoked_at is null`.
- Device session writes must verify `device_sessions.user_id = auth.uid()` and `device_sessions.revoked_at is null`.

## Edge Function Catalog

Service-role access is allowed only through reviewed functions:

| Function | Service role | Writes | Required validation | Audit event |
| --- | --- | --- | --- | --- |
| `sync_app_messages` | yes | `cloud_conversation_messages`, cursors | auth user, device active, conversation owner, persona owner, idempotency key | `conversation.sync.upload` |
| `pull_conversation_delta` | no by default | cursors | auth user, device active, conversation owner | `conversation.sync.pull` |
| `repair_conversation_cursor` | yes | cursors only | auth user, device active, admin-reviewed repair reason | `conversation.sync.repair` |

## Scope

- Cloud conversation tables.
- Local mirror tables.
- Device registration and revoke contract.
- Device session token binding.
- Sync cursor.
- Idempotent upload/download.
- Stable cross-device message ordering.
- Web/app same thread selection.

## Excluded

- Memory extraction from messages.
- Vector search.
- Multi-user shared rooms.
- Raw desktop context in cloud messages.

## Tests

- Web message appears in app after sync.
- App message appears in web after sync.
- Duplicate app upload does not duplicate cloud message.
- User cannot access another user's conversation.
- App pending message survives restart.
- Offline app messages keep user-visible order after cloud sync.
- Revoked device cannot upload or advance cursor.
- Expired device session cannot upload or advance cursor.
- Duplicate upload returns the original cloud message ack.
- Auth expiry leaves local messages pending without data loss.

## Exit Criteria

- Web and app can continue the same persona conversation.
- Offline app chat syncs when online.
- No raw desktop context is stored in cloud conversation content.
- Duplicate message rate is within the Phase 07 blocking threshold.
- Stable ordering survives offline app upload and web interleaving.

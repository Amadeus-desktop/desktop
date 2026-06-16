# Supabase Persona And Memory Sync 설계

## 목표

PRD v3의 DB 원칙을 구현 가능한 계약으로 고정한다.

```text
Persona는 Supabase가 원본이다.
App은 SQLite local-first cache를 사용한다.
민감한 원본 작업 맥락은 SQLite에만 남긴다.
웹과 앱이 공유할 수 있는 안전 요약 메모리만 Supabase로 동기화한다.
RAG는 cloud-safe memory를 우선 사용하고, 앱은 오프라인 local fallback을 가진다.
```

이번 설계의 핵심 결정은 기본 캐릭터 3개를 전역 공유 row로 두지 않고, 각 사용자 계정에 복사하는 것이다. 이 방식은 현재 Supabase RLS의 `user_id = auth.uid()` 모델과 맞고, 사용자별 persona state와 memory를 안전하게 분리한다.

## 현재 차이

현재 코드에는 `src/domain/persona/cards` 아래 3개 character card가 있다.

- `seoyeon-modern-senior`
- `eiren-fantasy-guardian`
- `makise-kurisu`

하지만 Supabase migration에는 이 3개 카드를 사용자 계정의 `personas`와 `persona_states`로 초기화하는 경로가 없다.

현재 앱에는 `pullCloudPersonas()`와 persona cache merge 함수가 있지만, UI shell은 아직 locale registry의 hardcoded persona list를 사용한다. SQLite에는 `local_personas` 테이블이 준비되어 있지만, Rust/Tauri command로 upsert/list/get하는 저장 경로가 없다.

따라서 현재 상태는 아래처럼 끊겨 있다.

```text
JSON character cards
  -> TypeScript registry
  -> UI hardcoded personas

Supabase personas
  -> pullCloudPersonas exists
  -> SQLite local_personas command missing
  -> UI not connected
```

## 대상 아키텍처

```text
src/domain/persona/cards/*.json
  -> Supabase Edge Function default persona template
  -> ensure user personas
  -> public.personas / public.persona_states
  -> app pull
  -> SQLite local_personas
  -> UI + prompt assembly
```

```text
local private memory
  -> SQLite local_memories(scope = local_private)
  -> never sync

syncable summary memory
  -> SQLite local_memories(scope = syncable_summary)
  -> SQLite sync_queue
  -> Supabase cloud_memories
  -> embedding
  -> match_cloud_memories RAG
  -> web and app prompts
```

## Supabase Persona Model

`personas` remains user-owned:

```text
personas
- id uuid primary key
- user_id uuid references auth.users(id)
- slug text not null
- name text not null
- base_tone text not null
- relationship_type text not null
- world_type text not null
- static_prompt_json jsonb not null
- version integer not null
- created_at timestamptz
- updated_at timestamptz
- deleted_at timestamptz null
```

`slug` is the stable app-facing persona id, such as `makise-kurisu`. `id` is the Supabase remote uuid. App code must keep these concepts separate:

```text
slug             -> product/persona id used in UI and settings
remotePersonaId  -> Supabase uuid used by foreign keys
```

`persona_states` stores dynamic relationship state. The database must make current state deterministic. The preferred model is:

```text
persona_states
- id uuid primary key
- user_id uuid references auth.users(id)
- persona_id uuid references personas(id)
- relationship_stage text not null
- affinity integer not null
- trust_state text not null
- recent_mood text null
- open_loops jsonb not null
- last_major_event text null
- boundary_overrides jsonb not null
- state_source text not null
- version integer not null
- is_current boolean not null default true
- expires_at timestamptz null
- created_at timestamptz
- updated_at timestamptz
```

Add a partial unique index:

```sql
create unique index persona_states_one_current_idx
on public.persona_states(user_id, persona_id)
where is_current = true;
```

This avoids relying on `persona_states[0]` with unspecified ordering.

## User Persona Bootstrap

Default character creation belongs on the server side, not in the desktop app.

Preferred entry point:

```text
Supabase Edge Function: bootstrap-user-personas
```

Behavior:

1. Verify Supabase JWT.
2. For the authenticated user, check active `personas` by `slug`.
3. For each missing default slug, insert a `personas` row using the bundled default card template.
4. Insert one current `persona_states` row from the card `personaStateSeed`.
5. Do nothing for already existing active personas.
6. Return the user's default persona snapshots.

The function must be idempotent. Calling it from web and app must produce the same final rows without duplicates.

The Edge Function should not trust client-submitted character card JSON. The default templates should be bundled with the function or generated into a server-owned seed module during build/deploy.

## App Persona Pull And Cache

On authenticated app startup:

1. Call `bootstrap-user-personas`.
2. Call `pullCloudPersonas()`.
3. For each remote persona, read matching local cache by `remote_persona_id` or `slug`.
4. Apply `mergeRemotePersonaCache(local, remote)`.
5. Upsert accepted cache rows into SQLite `local_personas`.
6. Render UI from SQLite cache.

Offline behavior:

1. If Supabase is unavailable, skip bootstrap/pull.
2. Load `local_personas`.
3. If local cache is empty, fall back to bundled 3 cards as an offline preview only.
4. Do not create local-only cloud persona forks.

Required Tauri commands:

```text
upsert_local_personas(input: LocalPersonaCache[])
list_local_personas()
get_local_persona(slug_or_remote_id)
```

SQLite `local_personas` remains a cache, not a source of truth. App-side persona edits must go to Supabase with `expected_version`, then update local cache after ack.

## Memory Sync

Memory has three levels:

```text
Cloud Memory
  Supabase cloud_memories
  shared by web and app

Local Private Memory
  SQLite local_memories(scope = local_private)
  never sync

Syncable Summary Memory
  SQLite local_memories(scope = syncable_summary)
  queued in sync_queue
  accepted into Supabase cloud_memories
```

Local memory writes must classify data before storage:

- raw window title, raw OCR text, file path, full URL, token, and screenshot path are forbidden in sync payloads.
- `local_private` can stay in SQLite if it passes local retention/privacy policy.
- `syncable_summary` must be redacted, have retention metadata, and pass the SyncPayloadEnvelope validator before entering `sync_queue`.

The sync worker sends only safe summary memory to Supabase. It must use idempotency keys so retries do not duplicate `cloud_memories`.

## RAG

RAG uses two memory sources depending on runtime and connectivity.

Web:

```text
Supabase cloud_memories
  -> match_cloud_memories
  -> prompt envelope
```

App online:

```text
SQLite local private memory
  + Supabase cloud-safe memory
  -> prompt assembly
```

App offline:

```text
SQLite local_memories only
  -> local prompt assembly
```

Cloud model calls must receive only provider-safe prompt sections. Raw desktop context must be removed before sending to Supabase Edge Functions or external providers.

Embedding ownership:

- `cloud_memories.embedding` belongs to Supabase cloud memory retrieval.
- local private memory does not need cloud embedding.
- local-only embedding can be added later, but it must remain local and cannot upload raw private content.

## RLS And Integrity Hardening

Required Supabase hardening:

- `personas`: keep `user_id = auth.uid()` policies and `unique(user_id, slug) where deleted_at is null`.
- `persona_states`: enforce same-user persona FK and one current state.
- `cloud_memories`: keep same-user persona FK, redacted evidence requirements, and `source <> 'desktop_context'` for direct owner inserts.
- `cloud_conversations`: update policy must verify the new `persona_id` belongs to `auth.uid()`.
- `cloud_conversation_messages`: insert policy must continue verifying conversation, persona, and device ownership.

Delete behavior:

- Persona delete is soft delete.
- Soft-deleted personas must not be selected or used by memory/conversation policies.
- Stale local cache should become `sync_status = deleted` when remote deletion is pulled.

## Error Handling

Bootstrap:

- Missing auth returns 401.
- Duplicate existing slug is treated as success.
- Invalid server seed template is a deploy-time error, not a client error.

Pull/cache:

- Supabase failure falls back to SQLite cache.
- Local cache conflict keeps local row as `conflicted` and does not overwrite pending local mutation.

Memory sync:

- Sync validation failure marks queue row `failed` with a redacted error.
- Network/provider failure leaves row retryable.
- Supabase idempotency conflict returns the existing accepted record when possible.

RAG:

- Vector retrieval failure must not block chat.
- If cloud RAG fails, prompt assembly continues with local safe memory or no memory.

## Testing

Supabase SQL / function tests:

- Bootstrapping creates exactly 3 default personas for a new user.
- Bootstrapping is idempotent.
- User A cannot read or mutate User B personas.
- User A cannot attach persona state, memory, or conversation to User B persona.
- Only one current persona state can exist per persona.
- `cloud_conversations` update cannot switch to another user's persona.

Rust SQLite tests:

- Migration includes `local_personas`.
- Upsert replaces newer remote cache and preserves pending/conflicted local cache rules.
- List/get returns rows by slug and remote uuid.
- Local private memory never enters sync queue.

TypeScript tests:

- `pullCloudPersonas` normalizes slug, static prompt, and current state.
- App bootstrap flow calls server bootstrap, pulls personas, and writes SQLite cache.
- UI uses cached personas rather than only hardcoded i18n registry.
- Prompt assembly keeps raw desktop context out of cloud provider envelopes.
- RAG fallback works when cloud match fails.

## Implementation Order

1. Add Supabase persona bootstrap Edge Function and server-owned default persona templates.
2. Add Supabase migration for `persona_states.is_current`, current-state uniqueness, and RLS hardening.
3. Add Rust local persona cache commands and repository methods.
4. Add TypeScript persona bootstrap/pull/cache service.
5. Connect companion shell and settings picker to cached personas.
6. Add sync worker for `syncable_summary` memory to `cloud_memories`.
7. Integrate RAG source selection for web, app online, and app offline.
8. Add tests at each boundary.

## Non-Goals

- Do not sync raw desktop context.
- Do not make SQLite persona cache an independent persona editor source.
- Do not upload local private memory embeddings to Supabase.
- Do not implement full custom persona builder UI in this pass.
- Do not solve device pairing beyond the auth/session assumptions already present.

## Approval State

User chose the user-owned default persona copy model. This spec assumes that model.

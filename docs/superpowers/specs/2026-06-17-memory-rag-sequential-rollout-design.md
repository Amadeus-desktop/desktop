# Memory + RAG Sequential Rollout 설계

## 목표

conversation sync 위에 memory sync와 RAG를 순차적으로 올린다.

순서:

```text
1. conversation -> safe memory summary -> sync_queue -> cloud_memories
2. cloud/local memory -> RAG source selection -> prompt envelope
3. web memory/RAG API contract -> web chat에서 같은 memory 사용
```

## 현재 근거

사실:

- Supabase에는 `cloud_memories`, embedding columns, `match_cloud_memories(...)` RPC가 있다.
- 앱에는 `local_memories`, `sync_queue`, `list_local_memory_cards`, `list_pending_sync_queue`, `mark_sync_queue_synced`, `record_sync_queue_failure`가 있다.
- `syncPendingMemorySummaryQueue()`는 `memory.summary` sync queue row를 `cloud_memories`에 업로드한다.
- `supabaseCloudMemoryRepository.ts`는 cloud memory list/match/upsert를 제공한다.
- app LLM prompt assembly는 memory cards를 prompt memory context로 변환하는 경로가 있다.
- Supabase Edge Function `llm-generate`에는 cloud memory RAG enrichment 코드가 있다.
- Web conversation UI/API surface는 아직 repo 안에 완성되어 있지 않다.

추정:

- 가장 큰 빈칸은 "conversation message에서 safe memory candidate를 생성하고 sync queue에 넣는 경로"다. 이건 확인된 사실이 아니라 현재 코드 구조를 기준으로 한 추정이다.

## Scope

이번 rollout은 세 단계로 나눈다.

### Stage 1. Memory Sync Completion

대화 메시지를 직접 cloud memory로 올리지 않는다. 먼저 safe summary envelope로 변환하고, 기존 `sync_queue` 경로를 사용한다.

```text
conversation_messages
  -> extract safe memory candidates
  -> validate MemoryCandidate
  -> create local memory(scope = syncable_summary)
  -> enqueue SyncPayloadEnvelope(eventType = memory.summary)
  -> syncPendingMemorySummaryQueue()
  -> Supabase cloud_memories
```

Stage 1에서 구현할 것:

- conversation message batch에서 memory candidate를 만드는 pure policy 함수
- forbidden raw fields 방어
- `memory.summary` envelope builder
- local memory + sync queue enqueue orchestration
- auth/app ready 시 기존 memory sync worker 실행 연결

Stage 1에서 하지 않을 것:

- raw transcript 전체 업로드
- local private memory sync
- embedding 생성
- web UI 구현

### Stage 2. RAG Expansion

RAG는 memory sync가 안정된 뒤 prompt assembly 앞에서 실행한다.

```text
App online:
  local memory cards
  + cloud safe memory cards
  + optional vector matches
  -> ranked prompt memory context

App offline:
  local memory cards only
  -> ranked prompt memory context

Web:
  cloud_memories
  + match_cloud_memories
  -> server-side prompt envelope
```

Stage 2에서 구현할 것:

- app RAG source selector
- cloud memory retrieval failure fallback
- deterministic memory fallback when vector match is sparse
- RAG caps by response mode
- prompt context provenance metadata

Stage 2에서 하지 않을 것:

- local private memory embedding upload
- cross-user search
- RAG가 실패하면 chat 자체를 실패시키는 동작

### Stage 3. Web Memory/RAG Contract

Web은 Supabase cloud memory만 사용한다. Desktop local private memory는 web이 볼 수 없다.

```text
Web Route Handler / Server Function
  -> verify Supabase session
  -> load persona
  -> match/list cloud_memories
  -> build prompt envelope
  -> call cloud LLM
  -> write cloud_conversation_messages
```

Stage 3에서 구현/문서화할 것:

- web memory retrieval API contract
- web prompt memory envelope
- web forbidden payload policy
- web tests for RLS, memory isolation, provider secret isolation

## Memory Candidate Policy

Memory candidate는 아래 중 하나여야 한다.

```text
semantic:
  user_preference
  relationship_fact
  boundary

episodic:
  episodic_summary
  recurring_work_pattern
  persona_state_hint

procedural:
  stable response preference only
```

Allowed sources:

- `conversation`
- `nudge_reaction`
- `manual`

Blocked sources:

- `desktop_context`
- raw OCR
- screenshot
- raw file path
- full URL
- token/secret

Candidate acceptance rules:

- content is short, redacted, and user-safe.
- confidence is finite and within `0..100`.
- evidence excerpt is redacted.
- normalized key is stable for semantic memories.
- source message ids reference conversation message ids, not raw context ids.
- unsafe candidate is dropped before `sync_queue`.

## SyncPayloadEnvelope Contract

`memory.summary` queue rows must use:

```json
{
  "schemaVersion": 1,
  "eventType": "memory.summary",
  "payloadClass": "SafeSummary",
  "safetyGrade": "SafeWorkSummary",
  "redactionLevel": "SummaryRedacted",
  "retentionPolicy": "Session",
  "validatorVersion": "memory-summary.v1",
  "payload": {
    "personaId": "makise-kurisu",
    "memoryCategory": "episodic",
    "memoryType": "episodic_summary",
    "content": "사용자는 오늘 대화에서 짧은 답변을 선호한다고 말했다.",
    "confidence": 82,
    "source": "conversation",
    "normalizedKey": "preference:reply_length",
    "sourceMessageIds": ["conversation-message-id"],
    "evidenceExcerptRedacted": "짧게 답해줘",
    "observedAt": "2026-06-17T00:00:00.000Z",
    "userConfirmed": false,
    "writeReason": "conversation_safe_summary"
  }
}
```

## Error Handling

Memory extraction:

- No candidate: no-op.
- Unsafe candidate: drop and log redacted reason.
- Validation failure: do not enqueue.
- Local enqueue failure: keep conversation messages unchanged.

Memory sync:

- Supabase/network failure: retryable queue failure.
- validation failure: non-retryable queue failure.
- idempotency conflict: treat existing cloud memory as success.

RAG:

- Cloud memory list failure: continue with local memory.
- Vector match failure: continue with deterministic memory.
- No memory: prompt must still build.
- Provider prompt must not include raw context.

## App Runtime Trigger

On authenticated app startup:

```text
hydrate auth
hydrate settings/persona
sync pending conversation messages
pull cloud conversation messages
extract/enqueue safe memory summaries
sync pending memory summary queue
```

This trigger is best-effort. It must not block rendering or auth completion.

## Web Runtime Contract

Web route handlers should use:

```text
cloud_memories deterministic list
match_cloud_memories vector search
cloud_conversation_messages as source message references
```

Web must not:

- request app local memories.
- assume SQLite exists.
- request raw desktop context.
- write `cloud_memories` from unvalidated browser payload.

## Testing

Stage 1 tests:

- conversation messages produce a safe `memory.summary` envelope.
- unsafe raw fields are rejected before enqueue.
- empty candidate list is no-op.
- memory sync worker marks upload ack.
- memory sync worker marks validation failure non-retryable.

Stage 2 tests:

- app online source selector combines local and cloud memory.
- app offline source selector uses local memory only.
- cloud RAG failure falls back to deterministic/local memory.
- prompt memory caps are enforced.
- provenance marks `local_private`, `syncable_summary`, and `cloud_safe`.

Stage 3 tests:

- web route loads only current user's cloud memories.
- web route never exposes provider key to browser.
- web prompt excludes blocked raw fields.
- web RAG can retrieve cloud memory written by app sync.

## Exit Criteria

- App can turn safe conversation facts into `cloud_memories` through existing sync queue.
- App chat uses local memory offline and local + cloud memory online.
- Web contract explains how to use the same cloud memory/RAG source.
- No raw desktop context enters Supabase memory or web prompt.
- Typecheck, focused Rust tests, and focused TypeScript tests or equivalent scenario checks pass.

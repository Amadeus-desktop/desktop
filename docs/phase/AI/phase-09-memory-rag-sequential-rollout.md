# Phase 09. Memory RAG Sequential Rollout

## Goal

Complete memory sync and RAG in the order that protects privacy and keeps cross-surface behavior testable.

```text
1. Memory sync completion
2. RAG source selection expansion
3. Web memory/RAG contract
```

This phase builds on:

- [Phase 02. Cross Surface Conversation Session](./phase-02-cross-surface-conversation-session.md)
- [Phase 04. Memory Card System](./phase-04-memory-card-system.md)
- [Phase 06. Cloud Memory And RAG](./phase-06-cloud-memory-and-rag.md)
- [Memory + RAG Sequential Rollout 설계](../../superpowers/specs/2026-06-17-memory-rag-sequential-rollout-design.md)

## Entry Criteria

- Supabase `cloud_memories` exists.
- Supabase `match_cloud_memories(...)` exists.
- App conversation sync can push/pull cloud conversation messages.
- App `sync_queue` can enqueue and mark memory sync rows.
- App prompt assembly can accept memory cards.

## Stage 1. Memory Sync Completion

### Objective

Convert safe conversation-derived memory into `cloud_memories` through the existing queue.

```text
conversation_messages
  -> safe memory candidate
  -> MemoryCandidate validation
  -> local memory(scope = syncable_summary)
  -> sync_queue(memory.summary)
  -> syncPendingMemorySummaryQueue()
  -> cloud_memories
```

### Required Work

- Add a pure conversation-to-memory candidate policy.
- Add `memory.summary` envelope builder.
- Add local orchestration to create local memory and enqueue sync payload.
- Connect authenticated startup sync to run pending memory queue after conversation sync.
- Keep local private memory out of sync queue.

### Exit Criteria

- Safe conversation summary memory reaches Supabase `cloud_memories`.
- Unsafe raw fields are rejected before queue insert.
- Retryable and non-retryable memory sync failures are represented in `sync_queue`.
- No raw desktop context is synced.

## Stage 2. RAG Source Selection Expansion

### Objective

Use the right memory sources per runtime.

```text
App online  -> local memory + cloud memory + optional vector match
App offline -> local memory only
Web         -> cloud memory + vector match
```

### Required Work

- Add app RAG source selector.
- Add deterministic fallback when cloud vector search fails or is sparse.
- Add memory caps by response mode.
- Preserve memory provenance in prompt context.
- Ensure prompt assembly succeeds when no memory is available.

### Exit Criteria

- App online prompts can include local and cloud-safe memory.
- App offline prompts still work with local memory only.
- Cloud RAG failure does not fail chat.
- Prompt memory count caps are enforced.

## Stage 3. Web Memory/RAG Contract

### Objective

Document and prepare the web route/server contract for shared cloud memory.

```text
Web Route Handler / Server Function
  -> verify Supabase session
  -> load persona
  -> list/match cloud_memories
  -> build prompt envelope
  -> call cloud LLM
```

### Required Work

- Add web memory/RAG design document.
- Define web API contracts for memory retrieval and prompt envelope building.
- Define forbidden payload policy for browser and server routes.
- Define tests for RLS isolation and provider secret isolation.

### Exit Criteria

- Web has a documented path to use the same `cloud_memories` as app.
- Web contract forbids app-local private memory and raw desktop context.
- Web LLM calls are server-side only.

## Safety Rules

- Never upload local private memory to Supabase.
- Never embed raw desktop context in cloud memory.
- Never expose provider keys to browser bundles.
- Never use service role for ordinary user conversation or memory reads.
- Treat memory extraction as candidate generation, not direct memory acceptance.

## Tests

Stage 1:

- Safe conversation messages produce a `memory.summary` envelope.
- Unsafe raw fields are rejected.
- Memory queue upload marks rows synced.
- Validation failure marks rows failed/non-retryable.

Stage 2:

- App online source selector combines local and cloud memory.
- App offline source selector uses local memory only.
- Cloud RAG failure falls back.
- Prompt memory caps are enforced.

Stage 3:

- Web contract rejects forbidden raw payload fields.
- User A cannot retrieve User B memories.
- Web prompt envelope includes only cloud-safe memory.

## Non-Goals

- Web UI implementation.
- Local private vector sync.
- Raw conversation transcript vectorization.
- Cross-user memory search.
- Fine-tuning.

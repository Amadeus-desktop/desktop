# Phase 06. Cloud Memory And RAG

## Goal

Add semantic retrieval for cloud-safe memory once memory cards exceed simple recency/confidence retrieval.

RAG is for long-term memory retrieval. It is not required for cross-surface conversation continuity.

## Entry Criteria

Do not enable vector retrieval until at least one condition is met:

- cloud-safe memory exceeds 50 active cards per persona
- deterministic retrieval precision falls below Phase 07 threshold
- deep chat continuity failures are traced to missing long-term memory
- prompt budget failures increase because too many recency/confidence cards are included
- user-facing deep chat needs memory beyond the latest summaries and high-confidence cards

Until then, use deterministic retrieval from Phase 04.

## Supabase Vector Storage

Enable pgvector:

```sql
create extension if not exists vector with schema extensions;
```

Add embedding to cloud-safe memory:

```text
cloud_memories
- embedding extensions.vector(<dims>) null
- embedding_model text null
- embedded_at timestamptz null
```

Alternative if isolation is preferred:

```text
memory_embeddings
- id uuid primary key
- user_id uuid references auth.users(id)
- memory_id uuid references cloud_memories(id)
- embedding extensions.vector(<dims>) not null
- embedding_model text not null
- created_at timestamptz not null
```

## Retrieval RPC

```text
match_cloud_memories(
  query_embedding,
  match_user_id,
  match_persona_id,
  match_memory_types,
  match_threshold,
  match_count
)
```

Rules:

- Filter by `user_id`.
- Filter by `persona_id`.
- Filter by `memory_type`.
- Filter out deleted, expired, and contradicted memories.
- Return only cloud-safe memory.
- Use the same embedding model for query and stored memory.
- Use over-fetch when applying filters after vector search.
- Fall back to deterministic retrieval when vector results are too sparse.

## RLS

Vector search must not bypass RLS.

Required:

- `cloud_memories.user_id = auth.uid()`
- RPC must be `security invoker` unless there is a specific reviewed reason.
- If using service role in Edge Function, validate user/session before query.

## Embedding Generation

MVP options:

1. Edge Function generates embeddings for cloud-safe memory.
2. Web server route generates embeddings.
3. App generates local embeddings only for local-private memory.

Do not embed raw desktop context in Supabase.

## Retrieval Strategy

Prompt Builder combines:

```text
deterministic memory cards
  + vector matched memory cards
  + recent episodic summaries
```

Vector results are capped:

- nudge: 0..2
- pocket: 0..3
- deep: 3..8

Vector retrieval parameters:

```text
top_k = mode cap
over_fetch_factor = 3
minimum_similarity = configured per embedding model
fallback = deterministic retrieval from Phase 04
```

If pgvector index filtering returns fewer rows than requested, the retriever must either over-fetch, use iterative search where available, or fill the remainder from deterministic retrieval. It must not silently treat sparse vector results as proof that no relevant memory exists.

## Scope

- pgvector extension.
- cloud memory embedding schema.
- match RPC.
- embedding model contract.
- prompt builder vector retrieval hook.
- RAG entry criteria and deterministic fallback.

## Excluded

- Local private vector sync.
- Raw work context embeddings.
- Cross-user memory search.
- Fine-tuning.

## Tests

- Vector search never returns another user's memory.
- Query and stored embedding model mismatch is rejected or ignored.
- Deleted memory is not retrieved.
- Low similarity result is filtered.
- Prompt builder caps retrieved memory count.
- Sparse vector results use deterministic fallback.
- Expired or contradicted memory is not returned.

## Exit Criteria

- Deep chat can retrieve relevant long-term cloud-safe memory.
- Web and app use the same cloud memory retrieval contract.
- RAG adds continuity without violating privacy boundaries.
- RAG improves measured continuity beyond deterministic retrieval before it becomes default.

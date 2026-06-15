# Phase 04. Memory Card System

## Goal

LLM-facing memory is stored as small, typed memory cards instead of raw logs or vague summaries.

Raw logs are storage. Memory cards are prompt input.

## Memory Card Schema

```text
memory_cards
- id
- user_id
- persona_id
- memory_category
- memory_type
- content
- confidence
- source
- visibility
- normalized_key
- source_message_ids
- evidence_excerpt_redacted
- observed_at
- valid_from
- expires_at
- user_confirmed
- contradicts_memory_id
- write_reason
- created_at
- updated_at
- deleted_at
```

## Memory Categories

```text
semantic
episodic
procedural
```

Mapping:

| `memory_type` | Category | Prompt section |
| --- | --- | --- |
| `user_preference` | semantic | semantic memory cards |
| `relationship_fact` | semantic | semantic memory cards |
| `emotional_pattern` | semantic | semantic memory cards |
| `boundary` | procedural | safety/persona state |
| `recurring_work_pattern` | semantic | local-only or cloud-safe memory after validator |
| `episodic_summary` | episodic | episodic context |
| `persona_state_hint` | semantic | persona state candidate, not direct prompt rule |

## Memory Types

```text
user_preference
relationship_fact
emotional_pattern
boundary
recurring_work_pattern
episodic_summary
persona_state_hint
```

## Visibility

```text
local_private
syncable_summary
cloud_safe
```

Rules:

- `local_private` never syncs.
- `syncable_summary` can enter sync queue only after validator approval.
- `cloud_safe` can be stored in Supabase.
- Generated memory cannot overwrite explicit user preference.
- Raw desktop-derived memories default to `local_private`.
- `recurring_work_pattern` can become `cloud_safe` only as a `SafeWorkSummary` with validator approval and user consent.

## Local Storage

MVP can use existing `local_memories`:

```text
local_memories.memory_type = memory_type
local_memories.scope = visibility
local_memories.content = memory card content
local_memories.confidence = confidence
```

If memory card metadata grows, add `metadata_json`.

## Cloud Storage

Use `cloud_memories` for cloud-safe memory cards:

```text
cloud_memories
- id uuid primary key
- user_id uuid references auth.users(id)
- persona_id uuid references personas(id)
- memory_category text not null
- memory_type text not null
- content text not null
- confidence numeric not null
- source text not null
- safety_grade text not null
- normalized_key text null
- source_message_ids uuid[] null
- evidence_excerpt_redacted text null
- observed_at timestamptz null
- valid_from timestamptz null
- expires_at timestamptz null
- user_confirmed boolean not null
- contradicts_memory_id uuid null references cloud_memories(id)
- write_reason text not null
- created_at timestamptz not null
- updated_at timestamptz not null
- deleted_at timestamptz null
```

## Retrieval MVP

Do not start with vector search.

Initial retrieval:

```text
where persona_id = active_persona
and visibility/provider policy allows it
order by confidence desc, updated_at desc
limit 3..7
```

Mode-specific retrieval:

- nudge: 0..3 cards
- pocket: 1..5 cards
- deep: 3..7 cards

Retrieval excludes:

- `deleted_at is not null`
- `expires_at < now()`
- cards contradicted by a newer accepted card
- cards below mode confidence threshold
- `procedural` cards without an explicit prompt-section mapping

## Memory Writing

MVP writes memory outside the response hot path.

```text
conversation or reaction
  -> memory candidate
  -> validator
  -> memory card upsert
```

Validator contract:

- Candidate must cite `source_message_ids` or a local event summary id.
- Evidence excerpt must be redacted before cloud sync.
- Candidate must include `observed_at` and `write_reason`.
- User-confirmed statements outrank inferred statements.
- New memory that contradicts existing memory must link `contradicts_memory_id`.
- Sensitive raw desktop context cannot be accepted as cloud memory.
- Poisoning-like instructions inside user content are stored as content only, never as system/persona rules.

Conflict policy by `normalized_key`:

- explicit user preference beats generated memory
- delete wins over stale retry
- newer user-confirmed memory beats older inferred memory
- conflicting generated memory becomes a candidate for review, not an automatic overwrite
- procedural memory cannot rewrite persona static prompts

## Scope

- Memory card schema.
- Memory category to prompt-section mapping.
- Local memory card repository.
- Cloud-safe memory sync.
- Retrieval rules by mode.
- Conflict rules by `normalized_key`.
- Memory provenance and contradiction handling.

## Excluded

- pgvector.
- Embedding generation.
- Automatic procedural prompt rewriting.
- Raw OCR-derived memory.

## Tests

- Local private memory never syncs.
- Cloud-safe memory passes validator before upload.
- Explicit user preference beats generated memory.
- Prompt builder receives only allowed cards.
- Retrieval respects mode limits.
- Expired, deleted, and contradicted memory is excluded.
- Poisoned memory candidate cannot become a system or persona rule.
- Memory without provenance is rejected.

## Exit Criteria

- Persona prompt can include durable memory cards.
- Web and app can share cloud-safe memory.
- Local-only sensitive memory remains local.
- Each prompt memory has a traceable, redacted provenance record.

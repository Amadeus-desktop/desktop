# Amadeus AI Phase Plan

이 문서는 MVP 이후 AI/persona/memory 구현의 source of truth다.

AI phase의 목표는 웹과 앱이 같은 persona, 같은 conversation thread, 같은 memory contract를 공유하게 만드는 것이다. Desktop app은 local-first 원칙을 유지하고, Supabase는 persona 원본과 cloud-safe conversation/memory 원장 역할을 맡는다.

## Phase Order

```text
phase-00-ai-baseline.md
phase-01-persona-source-of-truth.md
phase-02-cross-surface-conversation-session.md
phase-03-prompt-assembly-layer.md
phase-04-memory-card-system.md
phase-05-qwen-local-runtime-contract.md
phase-06-cloud-memory-and-rag.md
phase-07-evaluation-and-regression.md
phase-08-local-perception-hydration.md
phase-09-memory-rag-sequential-rollout.md
```

## Core Decisions

- Supabase `personas` is the persona source of truth.
- Supabase `cloud_conversations` is the canonical cross-surface conversation thread.
- Tauri SQLite mirrors conversations for offline use and queues pending messages.
- Raw desktop context never syncs to Supabase.
- Cloud memory stores only cloud-safe memory cards.
- RAG is phase 2 for memory retrieval, not a prerequisite for session continuity.
- Qwen3-4B-GGUF uses the same prompt envelope as web cloud LLMs, with provider-specific safety filtering.
- Character continuity requires both a static persona card and a dynamic relationship state.
- Cross-surface continuity requires stable message identity, client ordering metadata, and device-scoped sync cursors.
- Proactive Nudge must work in process-only mode; Apple Vision OCR is optional local context enrichment.

## Memory Model

```text
Raw Local Logs
  -> local summarizer / extractor
  -> Memory Cards after validator approval
  -> Prompt Assembly
  -> Web Cloud LLM or App Local Qwen
```

Raw desktop-derived memories default to `local_private`. They can become `cloud_safe` only when all of these are true:

- source has been reduced to a `SafeWorkSummary`
- forbidden raw fields are absent
- validator approves upload
- retention and user consent policy allow sync

Memory categories:

- `semantic`: durable facts, preferences, relationship state
- `episodic`: recent events and conversation summaries
- `procedural`: stable persona and response rules

Storage categories:

- `local_private`: SQLite only, never sync
- `syncable_summary`: local safe summary pending sync
- `cloud_safe`: Supabase allowed

Memory categories must be preserved across schema, retrieval, and prompt assembly:

```text
semantic   -> durable user/persona facts -> MEMORY section
episodic   -> recent events/session summaries -> EPISODIC CONTEXT section
procedural -> stable behavior rules -> PERSONA/SAFETY/OUTPUT sections
```

## Cross-Surface Conversation Principle

Web and app must not create separate conversation realities for the same persona relationship.

```text
Web message
  -> cloud_conversation_messages
  -> Prompt Builder

App message
  -> local pending message
  -> sync to cloud_conversation_messages
  -> Prompt Builder
```

Both surfaces read:

- same `personas.id`
- same `cloud_conversations.id`
- same cloud-safe memory cards
- surface-appropriate local context

## Local Perception Principle

Screen capture/OCR is not the source of proactive behavior. Process/window/idle signals create trigger candidates first. OCR can only enrich an already-allowed local context.

```text
process-only trigger
  -> Nudge can run

allowed OCR hydration
  -> local-only context confidence
  -> Pocket/Deep context enrichment
```

If screen permission is missing, denied, or blocked by privacy gates, the app stays in process-only mode.

## Component Responsibility Matrix

| Component | Owns | Can write | Must not write |
| --- | --- | --- | --- |
| Web Companion | persona authoring, cloud chat UX | `personas`, `cloud_conversation_messages` through user session | local-private desktop context |
| Supabase DB/RLS | canonical cloud data and isolation | rows allowed by RLS | service-role bypass logic |
| Edge Functions | reviewed privileged workflows | named service-role writes with audit events | unvalidated user/device data |
| Tauri App | local-first UX, offline queue, local Qwen | SQLite mirror, pending sync queue | local-only persona forks |
| Prompt Builder | LLM input contract | provider input envelope | raw logs or untyped context |
| Memory Extractor | memory candidates | candidate rows only | final memory cards without validator |
| Memory Validator | memory acceptance and visibility | approved memory card upserts | raw desktop payloads to Supabase |
| Local Qwen Provider | local inference transport | no persistent product data | prompt assembly or cloud sync state |
| Local Perception/OCR | optional local context enrichment | redacted `OcrObservation` and `LocalRedactedContext` | proactive triggers, cloud memory, raw OCR persistence |

## Architecture Links

- [System Overview](../../architecture/system-overview.md)
- [Data Model Architecture](../../architecture/data-model.md)
- [Sync And Web Architecture](../../architecture/sync-and-web.md)
- [Policy And Security Architecture](../../architecture/policy-and-security.md)
- [Local AI OCR LLM Architecture](../../architecture/local-ai-ocr-llm.md)
- [Screen Capture And OCR Runtime](../../architecture/screen-capture-ocr-runtime.md)
- [Phase 09. Memory RAG Sequential Rollout](./phase-09-memory-rag-sequential-rollout.md)

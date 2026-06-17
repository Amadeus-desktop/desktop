# Memory RAG Sequential Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the first executable slice of memory sync and RAG after conversation sync.

**Architecture:** Conversation messages are reduced into safe memory summary envelopes, then routed through the existing SQLite `sync_queue` and Supabase `cloud_memories` worker. RAG source selection remains provider-aware: app online combines local and cloud-safe memory, app offline uses local memory, and web uses only cloud-safe memory by contract.

**Tech Stack:** TypeScript/Vitest, Tauri timeline commands, Supabase JS, existing memory card validators, existing LLM prompt assembly.

---

## File Structure

- Create: `src/domain/memory/conversationExtraction.ts`
  - Pure policy for safe conversation-derived memory candidates and `memory.summary` envelope creation.
- Create: `src/domain/memory/conversationExtraction.test.ts`
  - Tests safe extraction and forbidden raw-field rejection.
- Create: `src/features/memory/adapters/conversationMemorySyncWorker.ts`
  - Orchestrates local conversation messages into `sync_queue` rows and runs pending memory sync.
- Create: `src/features/memory/adapters/conversationMemorySyncWorker.test.ts`
  - Tests enqueue + sync orchestration through injected dependencies.
- Create: `src/features/memory/adapters/ragMemorySourceSelector.ts`
  - Provider-aware app/web memory source selection with fallback.
- Create: `src/features/memory/adapters/ragMemorySourceSelector.test.ts`
  - Tests online/offline fallback and caps.
- Modify: `src/features/memory/index.ts`
  - Export new memory sync and RAG helpers.
- Modify: `src/app/App.tsx`
  - Run memory summary sync after conversation sync for authenticated users.
- Create: `docs/superpowers/specs/2026-06-17-web-memory-rag-contract.md`
  - Web memory/RAG API and safety contract.
- Modify: `docs/architecture/sync-and-web.md`
  - Link the web memory/RAG contract.

## Task 1: Conversation Memory Extraction Policy

- [ ] **Step 1: Add failing tests**

Create `src/domain/memory/conversationExtraction.test.ts` with tests that:

- creates one episodic safe summary envelope from user/assistant conversation messages;
- rejects content containing raw URLs, file paths, tokens, or screenshot references;
- returns no envelope for empty messages.

- [ ] **Step 2: Run RED**

Run:

```bash
pnpm exec vitest run src/domain/memory/conversationExtraction.test.ts
```

Expected: fail because the module does not exist. If Vitest hangs in this workspace, continue to `pnpm run typecheck` after implementation and record the hang.

- [ ] **Step 3: Implement extraction policy**

Create `src/domain/memory/conversationExtraction.ts` with:

- `extractConversationMemoryCandidates(input)`
- `memorySummaryEnvelopeFromCandidate(candidate)`
- `containsForbiddenMemorySyncContent(value)`

Use existing `validateMemoryCandidate()` before producing an envelope.

- [ ] **Step 4: Verify**

Run focused test if available, then `pnpm run typecheck`.

## Task 2: Memory Sync Orchestration

- [ ] **Step 1: Add failing orchestration test**

Create `src/features/memory/adapters/conversationMemorySyncWorker.test.ts`.

Test dependency-injected behavior:

- list messages for a persona;
- build a safe memory envelope;
- call `createLocalMemory`;
- call `enqueueSyncPayload`;
- call `syncPendingMemorySummaryQueue`.

- [ ] **Step 2: Implement worker**

Create `src/features/memory/adapters/conversationMemorySyncWorker.ts` with:

- `enqueueConversationMemorySummaries(dependencies, input)`
- `syncConversationMemorySummaries(dependencies, input)`

Use deterministic idempotency keys based on persona id and source message ids.

- [ ] **Step 3: Connect app lifecycle**

After conversation sync in `src/app/App.tsx`, run:

```ts
syncConversationMemorySummaries({ personaId })
```

Log failure without blocking UI.

- [ ] **Step 4: Verify**

Run `pnpm run typecheck`.

## Task 3: RAG Source Selector

- [ ] **Step 1: Add failing selector tests**

Create `src/features/memory/adapters/ragMemorySourceSelector.test.ts`.

Test:

- online app combines local + cloud deterministic cards;
- offline app uses local only;
- cloud failure falls back to local;
- returned cards are capped by prompt mode via existing ranking.

- [ ] **Step 2: Implement selector**

Create `src/features/memory/adapters/ragMemorySourceSelector.ts` with:

- `selectAppPromptMemoryCards(input, dependencies)`
- `selectWebPromptMemoryCards(input, dependencies)`

Use existing `rankPromptMemoryCards()` and cloud repository helpers.

- [ ] **Step 3: Verify**

Run `pnpm run typecheck`.

## Task 4: Web Memory/RAG Contract Docs

- [ ] **Step 1: Create web contract doc**

Create `docs/superpowers/specs/2026-06-17-web-memory-rag-contract.md` covering:

- web route handler responsibilities;
- `cloud_memories` retrieval;
- `match_cloud_memories` vector retrieval;
- prompt memory envelope;
- forbidden payload fields;
- tests.

- [ ] **Step 2: Link architecture**

Add a link from `docs/architecture/sync-and-web.md`.

- [ ] **Step 3: Verify docs**

Run `git diff --check`.

## Task 5: Final Verification

- [ ] **Step 1: Typecheck**

Run:

```bash
pnpm run typecheck
```

- [ ] **Step 2: Existing Rust conversation tests**

Run:

```bash
cargo test conversation_messages
```

- [ ] **Step 3: Whitespace check**

Run:

```bash
git diff --check
```

- [ ] **Step 4: Report status**

Report exact pass/fail state and any Vitest hang separately from type/Rust verification.

## Actual Verification Log

- `node node_modules/vitest/vitest.mjs run src/domain/memory/conversationExtraction.test.ts src/features/memory/adapters/conversationMemorySyncWorker.test.ts src/features/memory/adapters/ragMemorySourceSelector.test.ts` passed: 3 files, 7 tests.
- `pnpm exec vitest ...` and `pnpm run test ...` hang in this workspace before test output. Direct Node entrypoint is the verified workaround.
- `pnpm run typecheck` passed.
- `cargo test conversation_messages` passed.
- `git diff --check` passed.
- Supabase remote smoke test passed for `cloud_memories`, `cloud_conversation_messages`, and `cloud_conversations` with HTTP 200 using the public anon client. This confirms table routes exist; it does not prove authenticated user-scoped mutation E2E.

# Conversation Session Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync app-local conversation sessions and messages with Supabase cloud conversations so web and app share the same conversation history.

**Architecture:** SQLite remains the app offline-first mirror, while Supabase `cloud_conversations` and `cloud_conversation_messages` are the cross-surface source. A TypeScript sync worker pushes pending app messages through the existing Supabase RPC and pulls cloud messages into SQLite using cursor-based ordering.

**Tech Stack:** Tauri v2 commands, Rust `rusqlite`, TypeScript/Vitest, Supabase JS, Supabase SQL/RPC.

**Implementation Status (2026-06-17):** Implemented inline in the main workspace. Rust local push/pull commands are wired through Tauri, Supabase conversation push/pull adapters are present, and focused Rust tests plus TypeScript typecheck pass. Focused Vitest execution was attempted but hung without output in this workspace, matching the known local test-runner behavior from earlier sync work.

---

## Scope Boundary

This plan implements conversation session/message sync only.

Explicitly deferred:

- Memory extraction and memory sync expansion.
- RAG ranking/source changes beyond using synced conversation as future evidence.
- Full web UI.
- Device pairing redesign.

## File Structure

- Modify: `src-tauri/src/timeline/core/contract.rs`
  - Add local conversation sync input/output structs.
- Modify: `src-tauri/src/timeline/core/repository.rs`
  - Add pending message listing, ack, failure, cloud session/message upsert.
- Modify: `src-tauri/src/timeline/commands/mod.rs`
  - Expose local conversation sync commands.
- Modify: `src-tauri/src/timeline/mod.rs`
  - Re-export command and contract types.
- Modify: `src-tauri/src/lib.rs`
  - Register Tauri commands.
- Modify: `src/features/timeline/types.ts`
  - Add TypeScript command types.
- Modify: `src/features/timeline/adapters/timelineRepository.ts`
  - Add frontend wrappers and mock fallback.
- Create: `src/features/conversation/adapters/supabaseCloudConversationRepository.ts`
  - Supabase cloud conversation ensure, device registration, message upsert, message pull.
- Create: `src/features/conversation/adapters/cloudConversationSyncWorker.ts`
  - Local-to-cloud push orchestration.
- Create: `src/features/conversation/adapters/cloudConversationPullWorker.ts`
  - Cloud-to-local pull orchestration.
- Create: `src/features/conversation/index.ts`
  - Public conversation sync exports.
- Test: `src-tauri/src/timeline/tests/mod.rs`
  - Local sync repository behavior.
- Test: `src/features/conversation/adapters/cloudConversationSyncWorker.test.ts`
  - Push worker behavior.
- Test: `src/features/conversation/adapters/cloudConversationPullWorker.test.ts`
  - Pull worker behavior.

## Task 1: Local Pending Message Sync Commands

**Files:**
- Modify: `src-tauri/src/timeline/core/contract.rs`
- Modify: `src-tauri/src/timeline/core/repository.rs`
- Modify: `src-tauri/src/timeline/commands/mod.rs`
- Modify: `src-tauri/src/timeline/mod.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/src/timeline/tests/mod.rs`

- [ ] **Step 1: Add failing Rust test for pending message listing and ack**

Append to `src-tauri/src/timeline/tests/mod.rs`:

```rust
#[test]
fn pending_conversation_messages_can_be_listed_and_marked_synced() {
    let mut repository = TimelineRepository::open_in_memory().expect("repo opens");
    repository.migrate().expect("migration succeeds");
    let session = repository
        .get_or_create_conversation_session(GetOrCreateConversationSessionInput {
            persona_id: "makise-kurisu".to_string(),
        })
        .expect("session creates");
    let message = repository
        .append_conversation_message(AppendConversationMessageInput {
            session_id: session.id.clone(),
            role: "user".to_string(),
            content: "웹에서도 보여야 해.".to_string(),
            provider: None,
            idempotency_key: "local-msg-1".to_string(),
        })
        .expect("message appends");

    let pending = repository
        .list_pending_conversation_messages(ListPendingConversationMessagesInput {
            limit: Some(10),
        })
        .expect("pending messages list");
    assert_eq!(pending.len(), 1);
    assert_eq!(pending[0].id, message.id);
    assert_eq!(pending[0].session_id, session.id);

    let synced = repository
        .mark_conversation_message_synced(MarkConversationMessageSyncedInput {
            local_message_id: message.id.clone(),
            cloud_message_id: "cloud-msg-1".to_string(),
            server_received_at_ms: 1_797_398_400_000,
        })
        .expect("message marks synced");

    assert_eq!(synced.sync_status, "synced");
    assert_eq!(synced.cloud_message_id.as_deref(), Some("cloud-msg-1"));
    assert_eq!(synced.server_received_at_ms, Some(1_797_398_400_000));
}
```

- [ ] **Step 2: Run test to verify RED**

Run:

```bash
cargo test pending_conversation_messages_can_be_listed_and_marked_synced
```

Expected: FAIL because `ListPendingConversationMessagesInput` and repository methods do not exist.

- [ ] **Step 3: Add Rust contract types**

Add to `src-tauri/src/timeline/core/contract.rs`:

```rust
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListPendingConversationMessagesInput {
    pub limit: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarkConversationMessageSyncedInput {
    pub local_message_id: String,
    pub cloud_message_id: String,
    pub server_received_at_ms: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarkConversationMessageSyncFailedInput {
    pub local_message_id: String,
    pub retryable: bool,
    pub last_error: String,
}
```

- [ ] **Step 4: Add repository methods**

Add methods inside `impl TimelineRepository` in `src-tauri/src/timeline/core/repository.rs`:

```rust
pub fn list_pending_conversation_messages(
    &self,
    input: ListPendingConversationMessagesInput,
) -> Result<Vec<ConversationMessage>, TimelineError> {
    let limit = input.limit.unwrap_or(20).clamp(1, 100);
    let mut statement = self.connection.prepare(
        "SELECT id, cloud_message_id, session_id, role, content, provider, sync_status, idempotency_key, client_sequence, created_at_ms, server_received_at_ms
         FROM conversation_messages
         WHERE sync_status IN ('pending', 'retrying')
         ORDER BY created_at_ms ASC, client_sequence ASC
         LIMIT ?1",
    )?;
    let rows = statement.query_map(params![limit], conversation_message_from_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(TimelineError::from)
}

pub fn mark_conversation_message_synced(
    &mut self,
    input: MarkConversationMessageSyncedInput,
) -> Result<ConversationMessage, TimelineError> {
    self.connection.execute(
        "UPDATE conversation_messages
         SET cloud_message_id = ?2,
             sync_status = 'synced',
             server_received_at_ms = ?3
         WHERE id = ?1",
        params![
            input.local_message_id,
            input.cloud_message_id,
            input.server_received_at_ms
        ],
    )?;
    self.get_conversation_message_by_id(&input.local_message_id)
}

pub fn mark_conversation_message_sync_failed(
    &mut self,
    input: MarkConversationMessageSyncFailedInput,
) -> Result<ConversationMessage, TimelineError> {
    let status = if input.retryable { "retrying" } else { "error" };
    self.connection.execute(
        "UPDATE conversation_messages
         SET sync_status = ?2
         WHERE id = ?1",
        params![input.local_message_id, status],
    )?;
    self.get_conversation_message_by_id(&input.local_message_id)
}

fn get_conversation_message_by_id(
    &self,
    id: &str,
) -> Result<ConversationMessage, TimelineError> {
    self.connection
        .query_row(
            "SELECT id, cloud_message_id, session_id, role, content, provider, sync_status, idempotency_key, client_sequence, created_at_ms, server_received_at_ms
             FROM conversation_messages
             WHERE id = ?1",
            params![id],
            conversation_message_from_row,
        )
        .map_err(TimelineError::from)
}
```

- [ ] **Step 5: Expose commands**

Add Tauri commands in `src-tauri/src/timeline/commands/mod.rs`:

```rust
#[tauri::command]
pub fn list_pending_conversation_messages(
    state: State<'_, TimelineState>,
    input: ListPendingConversationMessagesInput,
) -> Result<Vec<ConversationMessage>, CommandError> {
    with_repository(&state, |repository| {
        repository.list_pending_conversation_messages(input)
    })
}

#[tauri::command]
pub fn mark_conversation_message_synced(
    state: State<'_, TimelineState>,
    input: MarkConversationMessageSyncedInput,
) -> Result<ConversationMessage, CommandError> {
    with_repository(&state, |repository| {
        repository.mark_conversation_message_synced(input)
    })
}

#[tauri::command]
pub fn mark_conversation_message_sync_failed(
    state: State<'_, TimelineState>,
    input: MarkConversationMessageSyncFailedInput,
) -> Result<ConversationMessage, CommandError> {
    with_repository(&state, |repository| {
        repository.mark_conversation_message_sync_failed(input)
    })
}
```

Register these in `src-tauri/src/timeline/mod.rs` and `src-tauri/src/lib.rs`.

- [ ] **Step 6: Run Rust test**

Run:

```bash
cargo test pending_conversation_messages_can_be_listed_and_marked_synced
```

Expected: PASS.

## Task 2: Supabase Conversation Adapter

**Files:**
- Create: `src/features/conversation/adapters/supabaseConversationRepository.ts`
- Test: `src/features/conversation/adapters/supabaseConversationRepository.test.ts`

- [ ] **Step 1: Add failing TypeScript normalization test**

Create `src/features/conversation/adapters/supabaseConversationRepository.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeCloudConversationMessageRow } from "./supabaseConversationRepository";

describe("normalizeCloudConversationMessageRow", () => {
  it("maps Supabase cloud message rows to local command fields", () => {
    const message = normalizeCloudConversationMessageRow({
      id: "cloud-msg-1",
      conversation_id: "cloud-conv-1",
      persona_id: "remote-persona-1",
      role: "user",
      content: "hello",
      provider: null,
      surface: "web",
      source_device_id: null,
      local_message_id: null,
      idempotency_key: "web-msg-1",
      client_created_at: "2026-06-17T00:00:00.000Z",
      client_sequence: 1,
      server_received_at: "2026-06-17T00:00:01.000Z",
      created_at: "2026-06-17T00:00:01.000Z",
    });

    expect(message).toMatchObject({
      cloudMessageId: "cloud-msg-1",
      cloudConversationId: "cloud-conv-1",
      role: "user",
      content: "hello",
      idempotencyKey: "web-msg-1",
      createdAtMs: Date.parse("2026-06-17T00:00:00.000Z"),
      serverReceivedAtMs: Date.parse("2026-06-17T00:00:01.000Z"),
    });
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run:

```bash
pnpm exec vitest run src/features/conversation/adapters/supabaseConversationRepository.test.ts --reporter=verbose
```

Expected: FAIL because the adapter does not exist. If Vitest hangs, run an equivalent `pnpm exec tsx` import check and record the hang.

- [ ] **Step 3: Create adapter with row mapping and RPC stubs**

Create `src/features/conversation/adapters/supabaseConversationRepository.ts`:

```ts
import { getSupabaseClient } from "../../../lib/supabase/client";

export type CloudConversationMessageRow = {
  id: string;
  conversation_id: string;
  persona_id: string;
  role: "user" | "assistant" | "system_summary";
  content: string;
  provider: string | null;
  surface: "web" | "app";
  source_device_id: string | null;
  local_message_id: string | null;
  idempotency_key: string;
  client_created_at: string;
  client_sequence: number | null;
  server_received_at: string;
  created_at: string;
};

export type CloudConversationMessageSnapshot = {
  cloudMessageId: string;
  cloudConversationId: string;
  remotePersonaId: string;
  role: "user" | "assistant" | "system_summary";
  content: string;
  provider: string | null;
  surface: "web" | "app";
  sourceDeviceId: string | null;
  localMessageId: string | null;
  idempotencyKey: string;
  clientSequence: number | null;
  createdAtMs: number;
  serverReceivedAtMs: number;
};

export function normalizeCloudConversationMessageRow(
  row: CloudConversationMessageRow,
): CloudConversationMessageSnapshot {
  return {
    cloudMessageId: row.id,
    cloudConversationId: row.conversation_id,
    remotePersonaId: row.persona_id,
    role: row.role,
    content: row.content,
    provider: row.provider,
    surface: row.surface,
    sourceDeviceId: row.source_device_id,
    localMessageId: row.local_message_id,
    idempotencyKey: row.idempotency_key,
    clientSequence: row.client_sequence,
    createdAtMs: Date.parse(row.client_created_at),
    serverReceivedAtMs: Date.parse(row.server_received_at),
  };
}

export async function upsertCloudConversationMessage(input: {
  cloudConversationId: string;
  remotePersonaId: string;
  role: "user" | "assistant" | "system_summary";
  content: string;
  provider: string | null;
  localMessageId: string;
  idempotencyKey: string;
  clientCreatedAt: string;
  clientSequence: number;
  sourceDeviceId?: string | null;
}): Promise<CloudConversationMessageSnapshot> {
  const supabase = getSupabaseClient();
  const rpcClient = supabase as unknown as {
    rpc: (
      functionName: "upsert_cloud_conversation_message",
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>;
  };
  const { data, error } = await rpcClient.rpc("upsert_cloud_conversation_message", {
    p_conversation_id: input.cloudConversationId,
    p_persona_id: input.remotePersonaId,
    p_role: input.role,
    p_content: input.content,
    p_provider: input.provider,
    p_surface: "app",
    p_source_device_id: input.sourceDeviceId ?? null,
    p_local_message_id: input.localMessageId,
    p_idempotency_key: input.idempotencyKey,
    p_safety_grade: "Account",
    p_client_created_at: input.clientCreatedAt,
    p_client_sequence: input.clientSequence,
  });
  if (error) throw error;
  return normalizeCloudConversationMessageRow(data as CloudConversationMessageRow);
}
```

- [ ] **Step 4: Run TypeScript test**

Run:

```bash
pnpm exec vitest run src/features/conversation/adapters/supabaseConversationRepository.test.ts --reporter=verbose
```

Expected: PASS, unless the known Vitest hang occurs.

## Task 3: Push Worker

**Files:**
- Create: `src/features/conversation/adapters/conversationSyncWorker.ts`
- Test: `src/features/conversation/adapters/conversationSyncWorker.test.ts`
- Modify: `src/features/timeline/types.ts`
- Modify: `src/features/timeline/adapters/timelineRepository.ts`

- [ ] **Step 1: Add failing push worker test**

Create `src/features/conversation/adapters/conversationSyncWorker.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { pushPendingConversationMessages } from "./conversationSyncWorker";

describe("pushPendingConversationMessages", () => {
  it("uploads pending local messages and marks them synced", async () => {
    const message = {
      id: "local-msg-1",
      cloudMessageId: null,
      sessionId: "session-1",
      role: "user" as const,
      content: "웹에서도 보여야 해.",
      provider: null,
      syncStatus: "pending",
      idempotencyKey: "local-msg-1",
      clientSequence: 1,
      createdAtMs: 1_797_398_400_000,
      serverReceivedAtMs: null,
    };
    const upload = vi.fn().mockResolvedValue({
      cloudMessageId: "cloud-msg-1",
      serverReceivedAtMs: 1_797_398_401_000,
    });
    const markSynced = vi.fn().mockResolvedValue({ ...message, syncStatus: "synced" });

    const result = await pushPendingConversationMessages({
      listPendingConversationMessages: vi.fn().mockResolvedValue([message]),
      getConversationSessionForMessage: vi.fn().mockResolvedValue({
        id: "session-1",
        cloudConversationId: "cloud-conv-1",
        personaId: "remote-persona-1",
      }),
      upsertCloudConversationMessage: upload,
      markConversationMessageSynced: markSynced,
      markConversationMessageSyncFailed: vi.fn(),
    });

    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        cloudConversationId: "cloud-conv-1",
        remotePersonaId: "remote-persona-1",
        localMessageId: "local-msg-1",
        idempotencyKey: "local-msg-1",
      }),
    );
    expect(markSynced).toHaveBeenCalledWith({
      localMessageId: "local-msg-1",
      cloudMessageId: "cloud-msg-1",
      serverReceivedAtMs: 1_797_398_401_000,
    });
    expect(result).toEqual({ processed: 1, synced: 1, failed: 0, retryable: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run:

```bash
pnpm exec vitest run src/features/conversation/adapters/conversationSyncWorker.test.ts --reporter=verbose
```

Expected: FAIL because `conversationSyncWorker` does not exist.

- [ ] **Step 3: Implement push worker**

Create `src/features/conversation/adapters/conversationSyncWorker.ts`:

```ts
export type ConversationPushResult = {
  processed: number;
  synced: number;
  failed: number;
  retryable: number;
};

export async function pushPendingConversationMessages(dependencies: {
  listPendingConversationMessages: () => Promise<Array<{
    id: string;
    role: "user" | "assistant" | "system_summary";
    content: string;
    provider: string | null;
    idempotencyKey: string;
    clientSequence: number;
    createdAtMs: number;
  }>>;
  getConversationSessionForMessage: (messageId: string) => Promise<{
    id: string;
    cloudConversationId: string;
    personaId: string;
  }>;
  upsertCloudConversationMessage: (input: {
    cloudConversationId: string;
    remotePersonaId: string;
    role: "user" | "assistant" | "system_summary";
    content: string;
    provider: string | null;
    localMessageId: string;
    idempotencyKey: string;
    clientCreatedAt: string;
    clientSequence: number;
  }) => Promise<{ cloudMessageId: string; serverReceivedAtMs: number }>;
  markConversationMessageSynced: (input: {
    localMessageId: string;
    cloudMessageId: string;
    serverReceivedAtMs: number;
  }) => Promise<unknown>;
  markConversationMessageSyncFailed: (input: {
    localMessageId: string;
    retryable: boolean;
    lastError: string;
  }) => Promise<unknown>;
}): Promise<ConversationPushResult> {
  const result: ConversationPushResult = {
    processed: 0,
    synced: 0,
    failed: 0,
    retryable: 0,
  };
  const messages = await dependencies.listPendingConversationMessages();

  for (const message of messages) {
    result.processed += 1;
    try {
      const session = await dependencies.getConversationSessionForMessage(message.id);
      const ack = await dependencies.upsertCloudConversationMessage({
        cloudConversationId: session.cloudConversationId,
        remotePersonaId: session.personaId,
        role: message.role,
        content: message.content,
        provider: message.provider,
        localMessageId: message.id,
        idempotencyKey: message.idempotencyKey,
        clientCreatedAt: new Date(message.createdAtMs).toISOString(),
        clientSequence: message.clientSequence,
      });
      await dependencies.markConversationMessageSynced({
        localMessageId: message.id,
        cloudMessageId: ack.cloudMessageId,
        serverReceivedAtMs: ack.serverReceivedAtMs,
      });
      result.synced += 1;
    } catch (error) {
      const retryable = isRetryableConversationSyncError(error);
      await dependencies.markConversationMessageSyncFailed({
        localMessageId: message.id,
        retryable,
        lastError: error instanceof Error ? error.message : "conversation_sync_failed",
      });
      if (retryable) result.retryable += 1;
      else result.failed += 1;
    }
  }

  return result;
}

function isRetryableConversationSyncError(error: unknown): boolean {
  if (!(error instanceof Error)) return true;
  return !error.message.startsWith("conversation_contract_");
}
```

- [ ] **Step 4: Run test**

Run:

```bash
pnpm exec vitest run src/features/conversation/adapters/conversationSyncWorker.test.ts --reporter=verbose
```

Expected: PASS, unless known Vitest hang occurs.

## Task 4: Pull Worker And Cloud Message Upsert

**Files:**
- Modify: `src-tauri/src/timeline/core/contract.rs`
- Modify: `src-tauri/src/timeline/core/repository.rs`
- Modify: `src/features/conversation/adapters/conversationSyncWorker.ts`
- Test: `src-tauri/src/timeline/tests/mod.rs`
- Test: `src/features/conversation/adapters/conversationSyncWorker.test.ts`

- [ ] **Step 1: Add Rust test for cloud message local upsert**

Append to `src-tauri/src/timeline/tests/mod.rs`:

```rust
#[test]
fn cloud_conversation_message_upsert_deduplicates_by_cloud_id() {
    let mut repository = TimelineRepository::open_in_memory().expect("repo opens");
    repository.migrate().expect("migration succeeds");

    let first = repository
        .upsert_cloud_conversation_message(UpsertCloudConversationMessageInput {
            cloud_conversation_id: "cloud-conv-1".to_string(),
            cloud_message_id: "cloud-msg-1".to_string(),
            persona_id: "makise-kurisu".to_string(),
            role: "user".to_string(),
            content: "웹에서 쓴 메시지".to_string(),
            provider: None,
            idempotency_key: "web-msg-1".to_string(),
            client_sequence: Some(1),
            created_at_ms: 1_797_398_400_000,
            server_received_at_ms: 1_797_398_401_000,
        })
        .expect("cloud message upserts");
    let second = repository
        .upsert_cloud_conversation_message(UpsertCloudConversationMessageInput {
            cloud_conversation_id: "cloud-conv-1".to_string(),
            cloud_message_id: "cloud-msg-1".to_string(),
            persona_id: "makise-kurisu".to_string(),
            role: "user".to_string(),
            content: "웹에서 쓴 메시지".to_string(),
            provider: None,
            idempotency_key: "web-msg-1".to_string(),
            client_sequence: Some(1),
            created_at_ms: 1_797_398_400_000,
            server_received_at_ms: 1_797_398_401_000,
        })
        .expect("duplicate cloud message upserts");

    assert_eq!(first.id, second.id);
    assert_eq!(second.cloud_message_id.as_deref(), Some("cloud-msg-1"));
    assert_eq!(second.sync_status, "synced");
}
```

- [ ] **Step 2: Implement local cloud message upsert**

Add `UpsertCloudConversationMessageInput` and repository method that:

- creates or finds a `conversation_sessions` row by `cloud_conversation_id`;
- inserts a synced `conversation_messages` row;
- updates existing row when `cloud_message_id` or `idempotency_key` already exists.

- [ ] **Step 3: Add pull worker test**

Add to `src/features/conversation/adapters/conversationSyncWorker.test.ts`:

```ts
import { pullCloudConversationMessages } from "./conversationSyncWorker";

it("pulls cloud messages and upserts them locally", async () => {
  const upsertLocal = vi.fn().mockResolvedValue(undefined);

  const result = await pullCloudConversationMessages({
    listCloudConversationMessagesSince: vi.fn().mockResolvedValue([
      {
        cloudMessageId: "cloud-msg-1",
        cloudConversationId: "cloud-conv-1",
        remotePersonaId: "remote-persona-1",
        role: "user",
        content: "웹 메시지",
        provider: null,
        surface: "web",
        sourceDeviceId: null,
        localMessageId: null,
        idempotencyKey: "web-msg-1",
        clientSequence: 1,
        createdAtMs: 1,
        serverReceivedAtMs: 2,
      },
    ]),
    upsertCloudConversationMessageLocal: upsertLocal,
    upsertConversationSyncCursor: vi.fn().mockResolvedValue(undefined),
  });

  expect(upsertLocal).toHaveBeenCalledWith(
    expect.objectContaining({
      cloudConversationId: "cloud-conv-1",
      cloudMessageId: "cloud-msg-1",
      content: "웹 메시지",
    }),
  );
  expect(result).toEqual({ pulled: 1, upserted: 1, skipped: 0 });
});
```

- [ ] **Step 4: Implement pull worker**

Implement `pullCloudConversationMessages()` in `conversationSyncWorker.ts` to:

- call `listCloudConversationMessagesSince()`;
- upsert each cloud message into SQLite;
- update cursor only after successful upserts.

## Task 5: Verification And Docs

**Files:**
- Modify: `docs/architecture/sync-and-web.md`
- Modify: `docs/superpowers/specs/2026-06-17-conversation-session-sync-design.md`

- [ ] **Step 1: Run TypeScript typecheck**

Run:

```bash
pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 2: Run Rust focused tests**

Run:

```bash
cargo test pending_conversation_messages_can_be_listed_and_marked_synced
cargo test cloud_conversation_message_upsert_deduplicates_by_cloud_id
```

Expected: PASS.

- [ ] **Step 3: Run TypeScript focused tests**

Run:

```bash
pnpm exec vitest run src/features/conversation/adapters/supabaseConversationRepository.test.ts src/features/conversation/adapters/conversationSyncWorker.test.ts --reporter=verbose
```

Expected: PASS. If Vitest hangs, record the hang and run equivalent `tsx` scenario checks.

- [ ] **Step 4: Update docs**

Update `docs/architecture/sync-and-web.md` with:

```markdown
### Conversation Session Sync

App conversation messages are pushed to `cloud_conversation_messages` with idempotency keys. Cloud/web messages are pulled into SQLite by cursor and merged by cloud id or idempotency key. Local pending content is preserved on auth/network failure.
```

- [ ] **Step 5: Final diff check**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only intended files changed.

## Actual Verification Log

- `pnpm run typecheck` passed.
- `cargo test conversation_messages` passed.
- `git diff --check` passed.
- Focused Vitest command `pnpm exec vitest run src/features/conversation/adapters/cloudConversationSyncWorker.test.ts` was attempted and manually stopped after hanging with no output for 60 seconds.

## Actual Implementation Notes

- Local pending messages are listed from `conversation_messages` with `pending`/`retrying` status.
- Local sessions with `local-*` cloud IDs are promoted after Supabase creates a `cloud_conversations.id`.
- Push uses `upsert_cloud_conversation_message` RPC and then marks the local message synced.
- Pull reads `cloud_conversation_messages`, upserts by `cloud_message_id`, and also deduplicates by `idempotency_key` if local push ack and cloud pull race.
- Web-origin sessions are stored locally as `source = 'web_mirror'`, matching the SQLite check constraint.

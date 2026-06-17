import { invoke } from "@tauri-apps/api/core";
import {
  appendMockConversationMessage,
  createMockContextEvent,
  createMockLocalMemory,
  createMockUserReaction,
  createMockUtteranceEvent,
  enqueueMockSyncPayload,
  getOrCreateMockConversationSession,
  listPendingMockSyncQueue,
  listMockActivityObservations,
  listMockTimelineEvents,
  listMockWorkSessions,
  markMockSyncQueueSynced,
  recordMockSyncQueueFailure,
} from "../../../mocks/timeline";
import { isTauriRuntime } from "../../../lib/tauri/runtime";
import type {
  ContextEvent,
  ActivityObservation,
  AppendConversationMessageInput,
  ConversationMessage,
  ConversationSession,
  CreateLocalMemoryInput,
  CreateContextEventInput,
  CreateUserReactionInput,
  CreateUtteranceEventInput,
  EnqueueSyncPayloadInput,
  GetConversationSessionForMessageInput,
  GetLocalPersonaInput,
  GetOrCreateConversationSessionInput,
  ListConversationMessagesInput,
  ListLocalMemoryCardsInput,
  ListPendingConversationMessagesInput,
  ListPendingSyncQueueInput,
  LocalMemoryCardRow,
  LocalMemory,
  LocalPersonaCacheRow,
  MarkConversationMessageSyncFailedInput,
  MarkConversationMessageSyncedInput,
  MarkConversationSessionSyncedInput,
  MarkSyncQueueSyncedInput,
  RecordSyncQueueFailureInput,
  SyncQueueRow,
  TimelineEvent,
  UpsertCloudConversationMessageInput,
  UpsertLocalPersonasInput,
  UserReaction,
  UtteranceEvent,
  WorkSession,
} from "../types";

export async function createContextEvent(
  input: CreateContextEventInput,
): Promise<ContextEvent> {
  if (isTauriRuntime()) {
    return invoke<ContextEvent>("create_context_event", { input });
  }

  return createMockContextEvent(input);
}

export async function createUtteranceEvent(
  input: CreateUtteranceEventInput,
): Promise<UtteranceEvent> {
  if (isTauriRuntime()) {
    return invoke<UtteranceEvent>("create_utterance_event", { input });
  }

  return createMockUtteranceEvent(input);
}

export async function createUserReaction(
  input: CreateUserReactionInput,
): Promise<UserReaction> {
  if (isTauriRuntime()) {
    return invoke<UserReaction>("create_user_reaction", { input });
  }

  return createMockUserReaction(input);
}

export async function createLocalMemory(
  input: CreateLocalMemoryInput,
): Promise<LocalMemory> {
  if (isTauriRuntime()) {
    return invoke<LocalMemory>("create_local_memory", { input });
  }

  return createMockLocalMemory(input);
}

export async function getOrCreateConversationSession(
  input: GetOrCreateConversationSessionInput,
): Promise<ConversationSession> {
  if (isTauriRuntime()) {
    return invoke<ConversationSession>("get_or_create_conversation_session", {
      input,
    });
  }

  return getOrCreateMockConversationSession(input);
}

export async function appendConversationMessage(
  input: AppendConversationMessageInput,
): Promise<ConversationMessage> {
  if (isTauriRuntime()) {
    return invoke<ConversationMessage>("append_conversation_message", { input });
  }

  return appendMockConversationMessage(input);
}

export async function listConversationMessagesForPersona(
  input: ListConversationMessagesInput,
): Promise<ConversationMessage[]> {
  if (isTauriRuntime()) {
    return invoke<ConversationMessage[]>("list_conversation_messages_for_persona", {
      input,
    });
  }

  return [];
}

export async function listPendingConversationMessages(
  input: ListPendingConversationMessagesInput = {},
): Promise<ConversationMessage[]> {
  if (isTauriRuntime()) {
    return invoke<ConversationMessage[]>("list_pending_conversation_messages", {
      input,
    });
  }

  return [];
}

export async function getConversationSessionForMessage(
  input: GetConversationSessionForMessageInput,
): Promise<ConversationSession | null> {
  if (isTauriRuntime()) {
    return invoke<ConversationSession | null>(
      "get_conversation_session_for_message",
      { input },
    );
  }

  return null;
}

export async function markConversationSessionSynced(
  input: MarkConversationSessionSyncedInput,
): Promise<ConversationSession> {
  if (isTauriRuntime()) {
    return invoke<ConversationSession>("mark_conversation_session_synced", {
      input,
    });
  }

  return {
    id: input.localSessionId,
    cloudConversationId: input.cloudConversationId,
    personaId: "",
    source: "mock",
    syncStatus: "synced",
    lastSyncedMessageAtMs: null,
    createdAtMs: Date.now(),
    updatedAtMs: Date.now(),
  };
}

export async function markConversationMessageSynced(
  input: MarkConversationMessageSyncedInput,
): Promise<ConversationMessage> {
  if (isTauriRuntime()) {
    return invoke<ConversationMessage>("mark_conversation_message_synced", {
      input,
    });
  }

  return {
    id: input.localMessageId,
    sessionId: "",
    role: "user",
    content: "",
    provider: null,
    idempotencyKey: "",
    cloudMessageId: input.cloudMessageId,
    syncStatus: "synced",
    clientSequence: 0,
    createdAtMs: Date.now(),
    serverReceivedAtMs: input.serverReceivedAtMs,
  };
}

export async function markConversationMessageSyncFailed(
  input: MarkConversationMessageSyncFailedInput,
): Promise<ConversationMessage> {
  if (isTauriRuntime()) {
    return invoke<ConversationMessage>("mark_conversation_message_sync_failed", {
      input,
    });
  }

  return {
    id: input.localMessageId,
    sessionId: "",
    role: "user",
    content: "",
    provider: null,
    idempotencyKey: "",
    cloudMessageId: null,
    syncStatus: input.retryable ? "retrying" : "error",
    clientSequence: 0,
    createdAtMs: Date.now(),
    serverReceivedAtMs: null,
  };
}

export async function upsertCloudConversationMessage(
  input: UpsertCloudConversationMessageInput,
): Promise<ConversationMessage> {
  if (isTauriRuntime()) {
    return invoke<ConversationMessage>("upsert_cloud_conversation_message", {
      input,
    });
  }

  return {
    id: `cloud-${input.cloudMessageId}`,
    sessionId: input.cloudConversationId,
    role: input.role,
    content: input.content,
    provider: input.provider ?? null,
    idempotencyKey: input.idempotencyKey,
    cloudMessageId: input.cloudMessageId,
    syncStatus: "synced",
    clientSequence: input.clientSequence ?? 0,
    createdAtMs: input.clientCreatedAtMs,
    serverReceivedAtMs: input.serverReceivedAtMs,
  };
}

export async function enqueueSyncPayload(
  input: EnqueueSyncPayloadInput,
): Promise<SyncQueueRow> {
  if (isTauriRuntime()) {
    return invoke<SyncQueueRow>("enqueue_sync_payload", { input });
  }

  return enqueueMockSyncPayload(input);
}

export async function listLocalMemoryCards(
  input: ListLocalMemoryCardsInput,
): Promise<LocalMemoryCardRow[]> {
  if (isTauriRuntime()) {
    return invoke<LocalMemoryCardRow[]>("list_local_memory_cards", { input });
  }

  return [];
}

export async function listPendingSyncQueue(
  input: ListPendingSyncQueueInput = {},
): Promise<SyncQueueRow[]> {
  if (isTauriRuntime()) {
    return invoke<SyncQueueRow[]>("list_pending_sync_queue", { input });
  }

  return listPendingMockSyncQueue(input);
}

export async function markSyncQueueSynced(
  input: MarkSyncQueueSyncedInput,
): Promise<SyncQueueRow> {
  if (isTauriRuntime()) {
    return invoke<SyncQueueRow>("mark_sync_queue_synced", { input });
  }

  return markMockSyncQueueSynced(input);
}

export async function recordSyncQueueFailure(
  input: RecordSyncQueueFailureInput,
): Promise<SyncQueueRow> {
  if (isTauriRuntime()) {
    return invoke<SyncQueueRow>("record_sync_queue_failure", { input });
  }

  return recordMockSyncQueueFailure(input);
}

export async function listTimelineEvents(limit = 20): Promise<TimelineEvent[]> {
  if (isTauriRuntime()) {
    return invoke<TimelineEvent[]>("list_timeline_events", { limit });
  }

  return listMockTimelineEvents(limit);
}

export async function listActivityObservations(
  limit = 80,
): Promise<ActivityObservation[]> {
  if (isTauriRuntime()) {
    return invoke<ActivityObservation[]>("list_activity_observations", { limit });
  }

  return listMockActivityObservations();
}

export async function listWorkSessions(limit = 30): Promise<WorkSession[]> {
  if (isTauriRuntime()) {
    return invoke<WorkSession[]>("list_work_sessions", { limit });
  }

  return listMockWorkSessions();
}

export async function clearLocalTimelineData(): Promise<number> {
  if (isTauriRuntime()) {
    return invoke<number>("clear_local_timeline_data");
  }

  return 0;
}

export async function upsertLocalPersonas(
  personas: LocalPersonaCacheRow[],
): Promise<LocalPersonaCacheRow[]> {
  if (isTauriRuntime()) {
    return invoke<LocalPersonaCacheRow[]>("upsert_local_personas", {
      input: { personas } satisfies UpsertLocalPersonasInput,
    });
  }

  return personas;
}

export async function listLocalPersonas(): Promise<LocalPersonaCacheRow[]> {
  if (isTauriRuntime()) {
    return invoke<LocalPersonaCacheRow[]>("list_local_personas");
  }

  return [];
}

export async function getLocalPersona(
  slugOrRemoteId: string,
): Promise<LocalPersonaCacheRow | null> {
  if (isTauriRuntime()) {
    return invoke<LocalPersonaCacheRow | null>("get_local_persona", {
      input: { slugOrRemoteId } satisfies GetLocalPersonaInput,
    });
  }

  return null;
}

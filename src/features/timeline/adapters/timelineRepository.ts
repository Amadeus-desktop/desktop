import { invoke } from "@tauri-apps/api/core";
import {
  createMockContextEvent,
  createMockLocalMemory,
  createMockUserReaction,
  createMockUtteranceEvent,
  enqueueMockSyncPayload,
  listMockTimelineEvents,
} from "../../../mocks/timeline";
import { isTauriRuntime } from "../../../lib/tauri/runtime";
import type {
  ContextEvent,
  CreateLocalMemoryInput,
  CreateContextEventInput,
  CreateUserReactionInput,
  CreateUtteranceEventInput,
  EnqueueSyncPayloadInput,
  LocalMemory,
  SyncQueueRow,
  TimelineEvent,
  UserReaction,
  UtteranceEvent,
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

export async function enqueueSyncPayload(
  input: EnqueueSyncPayloadInput,
): Promise<SyncQueueRow> {
  if (isTauriRuntime()) {
    return invoke<SyncQueueRow>("enqueue_sync_payload", { input });
  }

  return enqueueMockSyncPayload(input);
}

export async function listTimelineEvents(limit = 20): Promise<TimelineEvent[]> {
  if (isTauriRuntime()) {
    return invoke<TimelineEvent[]>("list_timeline_events", { limit });
  }

  return listMockTimelineEvents(limit);
}

export async function clearLocalTimelineData(): Promise<number> {
  if (isTauriRuntime()) {
    return invoke<number>("clear_local_timeline_data");
  }

  return 0;
}

import {
  extractConversationMemoryCandidates,
  memorySummaryEnvelopeFromCandidate,
  type ConversationMemorySourceMessage,
} from "../../../domain/memory/conversationExtraction";
import {
  createLocalMemory as defaultCreateLocalMemory,
  enqueueSyncPayload as defaultEnqueueSyncPayload,
  listConversationMessagesForPersona as defaultListConversationMessagesForPersona,
} from "../../timeline/adapters/timelineRepository";
import type {
  ConversationMessage,
  CreateLocalMemoryInput,
  EnqueueSyncPayloadInput,
} from "../../timeline/types";
import {
  syncPendingMemorySummaryQueue as defaultSyncPendingMemorySummaryQueue,
  type CloudMemorySyncResult,
} from "./cloudMemorySyncWorker";

type ConversationMemorySyncDependencies = {
  listConversationMessagesForPersona: (input: {
    personaId: string;
    limit?: number;
  }) => Promise<ConversationMessage[]>;
  createLocalMemory: (input: CreateLocalMemoryInput) => Promise<unknown>;
  enqueueSyncPayload: (input: EnqueueSyncPayloadInput) => Promise<unknown>;
  syncPendingMemorySummaryQueue: (
    dependencies?: Parameters<typeof defaultSyncPendingMemorySummaryQueue>[0],
    options?: { limit?: number },
  ) => Promise<CloudMemorySyncResult>;
};

export type ConversationMemorySummarySyncResult = {
  candidates: number;
  enqueued: number;
  sync: CloudMemorySyncResult;
};

const defaultDependencies: ConversationMemorySyncDependencies = {
  listConversationMessagesForPersona: defaultListConversationMessagesForPersona,
  createLocalMemory: defaultCreateLocalMemory,
  enqueueSyncPayload: defaultEnqueueSyncPayload,
  syncPendingMemorySummaryQueue: defaultSyncPendingMemorySummaryQueue,
};

export async function syncConversationMemorySummaries(
  input: {
    personaId: string;
    limit?: number;
  },
  dependencies: ConversationMemorySyncDependencies = defaultDependencies,
): Promise<ConversationMemorySummarySyncResult> {
  const enqueued = await enqueueConversationMemorySummaries(input, dependencies);
  const sync = await dependencies.syncPendingMemorySummaryQueue(undefined, {
    limit: input.limit ?? 10,
  });
  return {
    candidates: enqueued.candidates,
    enqueued: enqueued.enqueued,
    sync,
  };
}

export async function enqueueConversationMemorySummaries(
  input: {
    personaId: string;
    limit?: number;
  },
  dependencies: Pick<
    ConversationMemorySyncDependencies,
    "listConversationMessagesForPersona" | "createLocalMemory" | "enqueueSyncPayload"
  > = defaultDependencies,
): Promise<{ candidates: number; enqueued: number }> {
  const messages = await dependencies.listConversationMessagesForPersona({
    personaId: input.personaId,
    limit: input.limit ?? 20,
  });
  const candidates = extractConversationMemoryCandidates({
    personaId: input.personaId,
    messages: messages.map(toConversationMemorySourceMessage),
    nowMs: Date.now(),
  });

  let enqueued = 0;
  for (const candidate of candidates) {
    const envelope = memorySummaryEnvelopeFromCandidate(candidate);
    await dependencies.createLocalMemory({
      personaId: candidate.personaId,
      memoryType: candidate.memoryType,
      content: candidate.content,
      scope: "syncable_summary",
      confidence: candidate.confidence,
      syncable: true,
    });
    await dependencies.enqueueSyncPayload({
      eventType: envelope.eventType,
      payloadJson: JSON.stringify(envelope),
      idempotencyKey: memorySummaryIdempotencyKey(candidate.sourceMessageIds, input.personaId),
    });
    enqueued += 1;
  }

  return {
    candidates: candidates.length,
    enqueued,
  };
}

function toConversationMemorySourceMessage(
  message: ConversationMessage,
): ConversationMemorySourceMessage {
  return {
    id: message.cloudMessageId ?? message.id,
    role: message.role,
    content: message.content,
    createdAtMs: message.createdAtMs,
  };
}

function memorySummaryIdempotencyKey(
  sourceMessageIds: string[],
  personaId: string,
): string {
  return `memory-summary:${personaId}:${sourceMessageIds.join(":")}`;
}

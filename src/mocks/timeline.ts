import type {
  AppendConversationMessageInput,
  ActivityObservation,
  ConversationMessage,
  ConversationSession,
  ContextEvent,
  CreateContextEventInput,
  CreateLocalMemoryInput,
  CreateUserReactionInput,
  CreateUtteranceEventInput,
  EnqueueSyncPayloadInput,
  GetOrCreateConversationSessionInput,
  ListPendingSyncQueueInput,
  LocalMemory,
  MarkSyncQueueSyncedInput,
  RecordSyncQueueFailureInput,
  SyncPayloadEnvelope,
  SyncQueueRow,
  TimelineEvent,
  UserReaction,
  UtteranceEvent,
  WorkSession,
} from "../features/timeline/types";

const events: TimelineEvent[] = [];
const conversationSessions: ConversationSession[] = [];
const conversationMessages: ConversationMessage[] = [];
const syncQueue: SyncQueueRow[] = [];
let sequence = 0;

export function createMockContextEvent(
  input: CreateContextEventInput,
): ContextEvent {
  const event: ContextEvent = {
    ...input,
    id: nextMockId("ctx"),
    occurredAt: nextMockOccurredAt(),
  };

  events.unshift({
    id: event.id,
    occurredAt: event.occurredAt,
    kind: "context",
    title: event.appName,
    subtitle: event.windowTitle,
    metadataJson: event.metadataJson,
  });

  return event;
}

export function createMockUtteranceEvent(
  input: CreateUtteranceEventInput,
): UtteranceEvent {
  const event: UtteranceEvent = {
    ...input,
    contextEventId: input.contextEventId ?? null,
    id: nextMockId("utt"),
    occurredAt: nextMockOccurredAt(),
  };

  events.unshift({
    id: event.id,
    occurredAt: event.occurredAt,
    kind: "utterance",
    title: event.message,
    subtitle: `${event.triggerType} · ${event.provider}`,
    metadataJson: "{}",
  });

  return event;
}

export function createMockUserReaction(
  input: CreateUserReactionInput,
): UserReaction {
  const reaction: UserReaction = {
    ...input,
    utteranceEventId: input.utteranceEventId ?? null,
    id: nextMockId("rxn"),
    occurredAt: nextMockOccurredAt(),
  };

  events.unshift({
    id: reaction.id,
    occurredAt: reaction.occurredAt,
    kind: "reaction",
    title: reaction.reactionType,
    subtitle: reaction.utteranceEventId ?? "",
    metadataJson: "{}",
  });

  return reaction;
}

export function createMockLocalMemory(
  input: CreateLocalMemoryInput,
): LocalMemory {
  if (input.scope === "local_private" && input.syncable) {
    throw new Error("local_private memory cannot be marked syncable");
  }

  return {
    personaId: input.personaId ?? null,
    memoryType: input.memoryType,
    content: input.content,
    scope: input.scope,
    confidence: input.confidence,
    id: nextMockId("mem"),
    createdAtMs: nextMockOccurredAt(),
    updatedAtMs: nextMockOccurredAt(),
  };
}

export function getOrCreateMockConversationSession(
  input: GetOrCreateConversationSessionInput,
): ConversationSession {
  const existing = conversationSessions.find(
    (session) => session.personaId === input.personaId && session.source === "app",
  );
  if (existing) return existing;

  const now = nextMockOccurredAt();
  const session: ConversationSession = {
    id: nextMockId("conv"),
    cloudConversationId: `local-${input.personaId}-${now}`,
    personaId: input.personaId,
    source: "app",
    syncStatus: "pending",
    lastSyncedMessageAtMs: null,
    createdAtMs: now,
    updatedAtMs: now,
  };
  conversationSessions.push(session);
  return session;
}

export function appendMockConversationMessage(
  input: AppendConversationMessageInput,
): ConversationMessage {
  const existing = conversationMessages.find(
    (message) =>
      message.sessionId === input.sessionId &&
      message.idempotencyKey === input.idempotencyKey,
  );
  if (existing) return existing;

  const clientSequence =
    conversationMessages.filter((message) => message.sessionId === input.sessionId)
      .length + 1;
  const message: ConversationMessage = {
    ...input,
    provider: input.provider ?? null,
    id: nextMockId("msg"),
    cloudMessageId: null,
    syncStatus: "pending",
    clientSequence,
    createdAtMs: nextMockOccurredAt(),
    serverReceivedAtMs: null,
  };
  conversationMessages.push(message);
  return message;
}

export function enqueueMockSyncPayload(
  input: EnqueueSyncPayloadInput,
): SyncQueueRow {
  const envelope = validateSyncPayloadEnvelope(input);

  const row: SyncQueueRow = {
    ...input,
    id: nextMockId("sync"),
    safetyGrade: envelope.safetyGrade,
    redactionLevel: envelope.redactionLevel,
    retentionPolicy: envelope.retentionPolicy,
    status: "pending",
    retryCount: 0,
    lastError: null,
    createdAtMs: nextMockOccurredAt(),
    updatedAtMs: nextMockOccurredAt(),
  };
  syncQueue.push(row);
  return row;
}

export function listPendingMockSyncQueue(
  input: ListPendingSyncQueueInput = {},
): SyncQueueRow[] {
  return syncQueue
    .filter((row) => row.status === "pending")
    .sort((left, right) => left.updatedAtMs - right.updatedAtMs)
    .slice(0, input.limit ?? 20);
}

export function markMockSyncQueueSynced(
  input: MarkSyncQueueSyncedInput,
): SyncQueueRow {
  const row = findMockSyncQueueRow(input.id);
  row.status = "synced";
  row.lastError = null;
  row.updatedAtMs = nextMockOccurredAt();
  return row;
}

export function recordMockSyncQueueFailure(
  input: RecordSyncQueueFailureInput,
): SyncQueueRow {
  const row = findMockSyncQueueRow(input.id);
  row.status = input.retryable ? "pending" : "failed";
  row.retryCount += 1;
  row.lastError = redactMockSyncError(input.lastError);
  row.updatedAtMs = nextMockOccurredAt();
  return row;
}

export function listMockTimelineEvents(limit = 20): TimelineEvent[] {
  return [...events]
    .sort((left, right) => right.occurredAt - left.occurredAt)
    .slice(0, limit);
}

export function listMockActivityObservations(): ActivityObservation[] {
  return [];
}

export function listMockWorkSessions(): WorkSession[] {
  return [];
}

function nextMockId(prefix: string) {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}`;
}

function nextMockOccurredAt() {
  sequence += 1;
  return Date.now() + sequence;
}

function findMockSyncQueueRow(id: string): SyncQueueRow {
  const row = syncQueue.find((candidate) => candidate.id === id);
  if (!row) throw new Error("sync_queue_row_not_found");
  return row;
}

function redactMockSyncError(value: string): string {
  return value
    .split(/\s+/)
    .map((token) =>
      /token|secret|password|api_key|^https?:\/\/|^\/Users\//i.test(token)
        ? "[redacted]"
        : token,
    )
    .join(" ");
}

function validateSyncPayloadEnvelope(
  input: EnqueueSyncPayloadInput,
): SyncPayloadEnvelope {
  const value = JSON.parse(input.payloadJson) as SyncPayloadEnvelope;
  rejectForbiddenSyncValues(value);

  if (
    value.schemaVersion !== 1 ||
    value.eventType !== input.eventType ||
    value.eventType !== "memory.summary" ||
    value.payloadClass !== "SafeSummary" ||
    value.safetyGrade !== "SafeWorkSummary" ||
    value.redactionLevel !== "SummaryRedacted" ||
    !["Session", "Timeline"].includes(value.retentionPolicy)
  ) {
    throw new Error("unsupported sync payload envelope");
  }

  return value;
}

function rejectForbiddenSyncValues(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(rejectForbiddenSyncValues);
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (
        [
          "raw_window_title",
          "raw_ocr_text",
          "screenshot_path",
          "file_path",
          "full_url",
          "url_query",
          "token",
          "keystroke_text",
        ].includes(key)
      ) {
        throw new Error("sync payload contains forbidden key");
      }
      rejectForbiddenSyncValues(nested);
    }
    return;
  }

  if (typeof value !== "string") return;

  const normalized = value.toLowerCase();
  if (
    value.includes("/") ||
    value.includes("\\") ||
    normalized.includes("://") ||
    normalized.includes("token=") ||
    normalized.includes("password=") ||
    normalized.includes("api_key=") ||
    normalized.includes("apikey=") ||
    normalized.includes("secret=") ||
    [".xlsx", ".docx", ".pdf", ".hwp"].some((extension) =>
      normalized.includes(extension),
    ) ||
    normalized.includes("?")
  ) {
    throw new Error("sync payload contains forbidden raw context value");
  }
}

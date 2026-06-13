export type CreateContextEventInput = {
  appName: string;
  windowTitle: string;
  eventType: string;
  metadataJson: string;
};

export type CreateUtteranceEventInput = {
  triggerType: string;
  speakabilityScore: number;
  message: string;
  provider: string;
  contextEventId?: string | null;
};

export type CreateUserReactionInput = {
  utteranceEventId?: string | null;
  reactionType: string;
};

export type CreateLocalMemoryInput = {
  personaId?: string | null;
  memoryType: string;
  content: string;
  scope: "local_private" | "syncable_summary";
  confidence: number;
  syncable: boolean;
};

export type EnqueueSyncPayloadInput = {
  eventType: string;
  payloadJson: string;
  idempotencyKey: string;
};

export type ContextEvent = CreateContextEventInput & {
  id: string;
  occurredAt: number;
};

export type UtteranceEvent = CreateUtteranceEventInput & {
  id: string;
  occurredAt: number;
};

export type UserReaction = CreateUserReactionInput & {
  id: string;
  occurredAt: number;
};

export type LocalMemory = Omit<CreateLocalMemoryInput, "syncable"> & {
  id: string;
  createdAtMs: number;
  updatedAtMs: number;
};

export type SyncQueueRow = EnqueueSyncPayloadInput & {
  id: string;
  safetyGrade: string;
  redactionLevel: string;
  retentionPolicy: string;
  status: "pending" | "synced" | "failed";
  retryCount: number;
  lastError?: string | null;
  createdAtMs: number;
  updatedAtMs: number;
};

export type SyncPayloadEnvelope = {
  schemaVersion: 1;
  eventType: string;
  payloadClass: "SafeSummary" | "PersonaPull" | "PreferenceAllowlist" | "SyncAck";
  safetyGrade:
    | "Public"
    | "Account"
    | "Persona"
    | "SharedMemory"
    | "SafeWorkSummary";
  redactionLevel:
    | "None"
    | "TitleRedacted"
    | "SummaryRedacted"
    | "SensitiveSuppressed";
  retentionPolicy: "Ephemeral" | "Session" | "Timeline";
  validatorVersion: string;
  payload: Record<string, unknown>;
};

export type TimelineEventKind = "context" | "utterance" | "reaction";

export type TimelineEvent = {
  id: string;
  occurredAt: number;
  kind: TimelineEventKind;
  title: string;
  subtitle: string;
};

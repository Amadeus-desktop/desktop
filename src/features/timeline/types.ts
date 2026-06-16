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

export type GetOrCreateConversationSessionInput = {
  personaId: string;
};

export type ListConversationMessagesInput = {
  personaId: string;
  limit?: number;
};

export type AppendConversationMessageInput = {
  sessionId: string;
  role: "user" | "assistant" | "system_summary";
  content: string;
  provider?: string | null;
  idempotencyKey: string;
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

export type ActivityObservation = {
  id: string;
  observedAtMs: number;
  appName: string;
  bundleIdentifier: string;
  processId: number;
  appCategory: string;
  browserUrlHost?: string | null;
  browserUrlClass?: string | null;
  idleSeconds: number;
  frontmostDurationMs: number;
  isFullscreen: boolean;
  sensitive: boolean;
  captureSuppressed: boolean;
  triggerAction: string;
  triggerCandidateType?: string | null;
  speakabilityScore: number;
  sourceKind: string;
  metadataJson: string;
};

export type WorkSession = {
  id: string;
  startedAtMs: number;
  endedAtMs?: number | null;
  summaryRedacted?: string | null;
  dominantAppCategory?: string | null;
  retentionPolicy: string;
  redactionLevel: string;
  sourceKind: string;
  expiresAtMs?: number | null;
  createdAtMs: number;
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

export type ConversationSession = GetOrCreateConversationSessionInput & {
  id: string;
  cloudConversationId: string;
  source: string;
  syncStatus: string;
  lastSyncedMessageAtMs?: number | null;
  createdAtMs: number;
  updatedAtMs: number;
};

export type ConversationMessage = AppendConversationMessageInput & {
  id: string;
  cloudMessageId?: string | null;
  syncStatus: string;
  clientSequence: number;
  createdAtMs: number;
  serverReceivedAtMs?: number | null;
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

export type LocalPersonaCacheRow = {
  id: string;
  remotePersonaId: string;
  slug: string;
  name: string;
  baseTone: string;
  relationshipType: string;
  worldType: string;
  staticPromptJson: string;
  personaStateJson: string | null;
  remoteVersion: number;
  lastPulledVersion: number;
  pendingMutationId: string | null;
  syncStatus: "synced" | "pending" | "conflicted" | "deleted";
  updatedAtMs: number;
};

export type UpsertLocalPersonasInput = {
  personas: LocalPersonaCacheRow[];
};

export type GetLocalPersonaInput = {
  slugOrRemoteId: string;
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
  metadataJson: string;
};

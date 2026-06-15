import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const contextEvents = sqliteTable("context_events", {
  id: text("id").primaryKey(),
  occurredAt: integer("occurred_at", { mode: "number" }).notNull(),
  appName: text("app_name").notNull(),
  windowTitle: text("window_title").notNull(),
  eventType: text("event_type").notNull(),
  metadataJson: text("metadata_json").notNull().default("{}"),
});

export const utteranceEvents = sqliteTable("utterance_events", {
  id: text("id").primaryKey(),
  occurredAt: integer("occurred_at", { mode: "number" }).notNull(),
  triggerType: text("trigger_type").notNull(),
  speakabilityScore: integer("speakability_score", { mode: "number" }).notNull(),
  message: text("message").notNull(),
  provider: text("provider").notNull(),
  contextEventId: text("context_event_id").references(() => contextEvents.id),
});

export const userReactions = sqliteTable("user_reactions", {
  id: text("id").primaryKey(),
  occurredAt: integer("occurred_at", { mode: "number" }).notNull(),
  utteranceEventId: text("utterance_event_id").references(
    () => utteranceEvents.id,
  ),
  reactionType: text("reaction_type").notNull(),
});

export const localPersonas = sqliteTable("local_personas", {
  id: text("id").primaryKey(),
  remotePersonaId: text("remote_persona_id").notNull(),
  name: text("name").notNull(),
  baseTone: text("base_tone").notNull(),
  relationshipType: text("relationship_type").notNull(),
  worldType: text("world_type").notNull(),
  staticPromptJson: text("static_prompt_json").notNull(),
  personaStateJson: text("persona_state_json"),
  remoteVersion: integer("remote_version", { mode: "number" }).notNull(),
  lastPulledVersion: integer("last_pulled_version", {
    mode: "number",
  }).notNull(),
  pendingMutationId: text("pending_mutation_id"),
  syncStatus: text("sync_status").notNull(),
  updatedAtMs: integer("updated_at_ms", { mode: "number" }).notNull(),
});

export const localMemories = sqliteTable("local_memories", {
  id: text("id").primaryKey(),
  personaId: text("persona_id"),
  memoryCategory: text("memory_category").notNull().default("semantic"),
  memoryType: text("memory_type").notNull(),
  content: text("content").notNull(),
  scope: text("scope").notNull(),
  confidence: integer("confidence", { mode: "number" }).notNull(),
  source: text("source").notNull().default("conversation"),
  normalizedKey: text("normalized_key"),
  sourceMessageIdsJson: text("source_message_ids_json").notNull().default("[]"),
  evidenceExcerptRedacted: text("evidence_excerpt_redacted"),
  observedAtMs: integer("observed_at_ms", { mode: "number" }),
  validFromMs: integer("valid_from_ms", { mode: "number" }),
  expiresAtMs: integer("expires_at_ms", { mode: "number" }),
  userConfirmed: integer("user_confirmed", { mode: "boolean" })
    .notNull()
    .default(false),
  contradictsMemoryId: text("contradicts_memory_id"),
  writeReason: text("write_reason").notNull().default("legacy_local_memory"),
  createdAtMs: integer("created_at_ms", { mode: "number" }).notNull(),
  updatedAtMs: integer("updated_at_ms", { mode: "number" }).notNull(),
  deletedAtMs: integer("deleted_at_ms", { mode: "number" }),
  metadataJson: text("metadata_json").notNull().default("{}"),
});

export const workSessions = sqliteTable("work_sessions", {
  id: text("id").primaryKey(),
  startedAtMs: integer("started_at_ms", { mode: "number" }).notNull(),
  endedAtMs: integer("ended_at_ms", { mode: "number" }),
  summaryRedacted: text("summary_redacted"),
  dominantAppCategory: text("dominant_app_category"),
  retentionPolicy: text("retention_policy").notNull(),
  redactionLevel: text("redaction_level").notNull(),
  sourceKind: text("source_kind").notNull(),
  expiresAtMs: integer("expires_at_ms", { mode: "number" }),
  createdAtMs: integer("created_at_ms", { mode: "number" }).notNull(),
});

export const conversationSessions = sqliteTable("conversation_sessions", {
  id: text("id").primaryKey(),
  cloudConversationId: text("cloud_conversation_id").notNull(),
  personaId: text("persona_id").notNull(),
  source: text("source").notNull(),
  syncStatus: text("sync_status").notNull(),
  lastSyncedMessageAtMs: integer("last_synced_message_at_ms", {
    mode: "number",
  }),
  createdAtMs: integer("created_at_ms", { mode: "number" }).notNull(),
  updatedAtMs: integer("updated_at_ms", { mode: "number" }).notNull(),
});

export const conversationMessages = sqliteTable("conversation_messages", {
  id: text("id").primaryKey(),
  cloudMessageId: text("cloud_message_id"),
  sessionId: text("session_id")
    .notNull()
    .references(() => conversationSessions.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  provider: text("provider"),
  syncStatus: text("sync_status").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  clientSequence: integer("client_sequence", { mode: "number" }).notNull(),
  createdAtMs: integer("created_at_ms", { mode: "number" }).notNull(),
  serverReceivedAtMs: integer("server_received_at_ms", { mode: "number" }),
});

export const syncQueue = sqliteTable("sync_queue", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  payloadJson: text("payload_json").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  safetyGrade: text("safety_grade").notNull(),
  redactionLevel: text("redaction_level").notNull(),
  retentionPolicy: text("retention_policy").notNull(),
  status: text("status").notNull(),
  retryCount: integer("retry_count", { mode: "number" }).notNull(),
  lastError: text("last_error"),
  createdAtMs: integer("created_at_ms", { mode: "number" }).notNull(),
  updatedAtMs: integer("updated_at_ms", { mode: "number" }).notNull(),
});

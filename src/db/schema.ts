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
  tone: text("tone").notNull(),
  personalityJson: text("personality_json").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  remoteVersion: integer("remote_version", { mode: "number" }).notNull(),
  syncStatus: text("sync_status").notNull(),
  updatedAtMs: integer("updated_at_ms", { mode: "number" }).notNull(),
});

export const localMemories = sqliteTable("local_memories", {
  id: text("id").primaryKey(),
  personaId: text("persona_id"),
  memoryType: text("memory_type").notNull(),
  content: text("content").notNull(),
  scope: text("scope").notNull(),
  confidence: integer("confidence", { mode: "number" }).notNull(),
  createdAtMs: integer("created_at_ms", { mode: "number" }).notNull(),
  updatedAtMs: integer("updated_at_ms", { mode: "number" }).notNull(),
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

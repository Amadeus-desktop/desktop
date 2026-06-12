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

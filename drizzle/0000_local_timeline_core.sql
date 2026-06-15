CREATE TABLE IF NOT EXISTS context_events (
  id TEXT PRIMARY KEY NOT NULL,
  occurred_at INTEGER NOT NULL,
  app_name TEXT NOT NULL,
  window_title TEXT NOT NULL,
  event_type TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS utterance_events (
  id TEXT PRIMARY KEY NOT NULL,
  occurred_at INTEGER NOT NULL,
  trigger_type TEXT NOT NULL,
  speakability_score INTEGER NOT NULL,
  message TEXT NOT NULL,
  provider TEXT NOT NULL,
  context_event_id TEXT,
  FOREIGN KEY (context_event_id) REFERENCES context_events(id)
);

CREATE TABLE IF NOT EXISTS user_reactions (
  id TEXT PRIMARY KEY NOT NULL,
  occurred_at INTEGER NOT NULL,
  utterance_event_id TEXT,
  reaction_type TEXT NOT NULL,
  FOREIGN KEY (utterance_event_id) REFERENCES utterance_events(id)
);

CREATE INDEX IF NOT EXISTS context_events_occurred_at_idx
  ON context_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS utterance_events_occurred_at_idx
  ON utterance_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS user_reactions_occurred_at_idx
  ON user_reactions (occurred_at DESC);

CREATE TABLE IF NOT EXISTS local_personas (
  id TEXT PRIMARY KEY NOT NULL,
  remote_persona_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  base_tone TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  world_type TEXT NOT NULL,
  static_prompt_json TEXT NOT NULL,
  persona_state_json TEXT,
  remote_version INTEGER NOT NULL CHECK (remote_version >= 1),
  last_pulled_version INTEGER NOT NULL CHECK (last_pulled_version >= 1),
  pending_mutation_id TEXT,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('synced', 'pending', 'conflicted', 'deleted')),
  updated_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS local_memories (
  id TEXT PRIMARY KEY NOT NULL,
  persona_id TEXT,
  memory_category TEXT NOT NULL DEFAULT 'semantic' CHECK (memory_category IN ('semantic', 'episodic', 'procedural')),
  memory_type TEXT NOT NULL,
  content TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('local_private', 'syncable_summary')),
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  source TEXT NOT NULL DEFAULT 'conversation' CHECK (source IN ('conversation', 'nudge_reaction', 'desktop_context', 'manual')),
  normalized_key TEXT,
  source_message_ids_json TEXT NOT NULL DEFAULT '[]',
  evidence_excerpt_redacted TEXT,
  observed_at_ms INTEGER,
  valid_from_ms INTEGER,
  expires_at_ms INTEGER,
  user_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (user_confirmed IN (0, 1)),
  contradicts_memory_id TEXT,
  write_reason TEXT NOT NULL DEFAULT 'legacy_local_memory',
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  deleted_at_ms INTEGER,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS work_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  started_at_ms INTEGER NOT NULL,
  ended_at_ms INTEGER,
  summary_redacted TEXT,
  dominant_app_category TEXT,
  retention_policy TEXT NOT NULL CHECK (retention_policy IN ('Ephemeral', 'Session', 'Timeline')),
  redaction_level TEXT NOT NULL CHECK (redaction_level IN ('None', 'TitleRedacted', 'SummaryRedacted', 'SensitiveSuppressed')),
  source_kind TEXT NOT NULL CHECK (source_kind IN ('Process', 'Capture', 'Ocr', 'Llm')),
  expires_at_ms INTEGER,
  created_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  cloud_conversation_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('app', 'web_mirror')),
  sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'retrying', 'synced', 'error', 'conflicted', 'deleted')),
  last_synced_message_at_ms INTEGER,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id TEXT PRIMARY KEY NOT NULL,
  cloud_message_id TEXT,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system_summary')),
  content TEXT NOT NULL,
  provider TEXT,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'retrying', 'synced', 'error', 'conflicted', 'deleted')),
  idempotency_key TEXT NOT NULL,
  client_sequence INTEGER NOT NULL CHECK (client_sequence >= 1),
  created_at_ms INTEGER NOT NULL,
  server_received_at_ms INTEGER,
  FOREIGN KEY (session_id) REFERENCES conversation_sessions(id)
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  safety_grade TEXT NOT NULL CHECK (safety_grade IN ('Public', 'Account', 'Persona', 'SharedMemory', 'SafeWorkSummary')),
  redaction_level TEXT NOT NULL CHECK (redaction_level IN ('None', 'TitleRedacted', 'SummaryRedacted', 'SensitiveSuppressed')),
  retention_policy TEXT NOT NULL CHECK (retention_policy IN ('Ephemeral', 'Session', 'Timeline')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'synced', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  last_error TEXT,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS local_memories_updated_at_idx
  ON local_memories (updated_at_ms DESC);

CREATE INDEX IF NOT EXISTS work_sessions_started_at_idx
  ON work_sessions (started_at_ms DESC);

CREATE INDEX IF NOT EXISTS conversation_sessions_cloud_id_idx
  ON conversation_sessions (cloud_conversation_id);

CREATE UNIQUE INDEX IF NOT EXISTS conversation_messages_session_idempotency_idx
  ON conversation_messages (session_id, idempotency_key);

CREATE INDEX IF NOT EXISTS conversation_messages_session_order_idx
  ON conversation_messages (session_id, created_at_ms ASC, client_sequence ASC);

CREATE INDEX IF NOT EXISTS sync_queue_status_idx
  ON sync_queue (status, updated_at_ms ASC);

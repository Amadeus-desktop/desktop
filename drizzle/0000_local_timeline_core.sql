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

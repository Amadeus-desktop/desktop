mod commands;
mod contract;
mod validation;

use rusqlite::{params, Connection};
use std::{
    error::Error,
    fmt::{Display, Formatter},
    path::Path,
    sync::Mutex,
    time::{SystemTime, SystemTimeError, UNIX_EPOCH},
};

pub use commands::{
    create_context_event, create_local_memory, create_user_reaction, create_utterance_event,
    enqueue_sync_payload, list_timeline_events,
};
pub use contract::{
    ContextEvent, CreateContextEventInput, CreateLocalMemoryInput, CreateUserReactionInput,
    CreateUtteranceEventInput, EnqueueSyncPayloadInput, LocalMemory, SyncPayloadEnvelope,
    SyncQueueRow, TimelineEvent, UserReaction, UtteranceEvent,
};
use validation::{validate_local_memory_input, validate_sync_payload_envelope};

const MIGRATION_SQL: &str = include_str!("../../../drizzle/0000_local_timeline_core.sql");

#[derive(Debug)]
pub enum TimelineError {
    Database(rusqlite::Error),
    Io(std::io::Error),
    Time(SystemTimeError),
    Validation(String),
    State(String),
}

impl Display for TimelineError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Database(error) => write!(formatter, "database error: {error}"),
            Self::Io(error) => write!(formatter, "io error: {error}"),
            Self::Time(error) => write!(formatter, "time error: {error}"),
            Self::Validation(message) => write!(formatter, "validation error: {message}"),
            Self::State(message) => write!(formatter, "state error: {message}"),
        }
    }
}

impl Error for TimelineError {}

impl From<rusqlite::Error> for TimelineError {
    fn from(error: rusqlite::Error) -> Self {
        Self::Database(error)
    }
}

impl From<std::io::Error> for TimelineError {
    fn from(error: std::io::Error) -> Self {
        Self::Io(error)
    }
}

impl From<SystemTimeError> for TimelineError {
    fn from(error: SystemTimeError) -> Self {
        Self::Time(error)
    }
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    message: String,
}

impl From<TimelineError> for CommandError {
    fn from(error: TimelineError) -> Self {
        Self {
            message: error.to_string(),
        }
    }
}

pub struct TimelineRepository {
    connection: Connection,
    sequence: u64,
    last_occurred_at: i64,
}

impl TimelineRepository {
    pub fn open(path: impl AsRef<Path>) -> Result<Self, TimelineError> {
        if let Some(parent) = path.as_ref().parent() {
            std::fs::create_dir_all(parent)?;
        }

        let connection = Connection::open(path)?;
        Self::from_connection(connection)
    }

    #[cfg(test)]
    fn open_in_memory() -> Result<Self, TimelineError> {
        let connection = Connection::open_in_memory()?;
        Self::from_connection(connection)
    }

    fn from_connection(connection: Connection) -> Result<Self, TimelineError> {
        connection.pragma_update(None, "foreign_keys", "ON")?;

        Ok(Self {
            connection,
            sequence: 0,
            last_occurred_at: 0,
        })
    }

    pub fn migrate(&mut self) -> Result<(), TimelineError> {
        self.connection.execute_batch(MIGRATION_SQL)?;
        Ok(())
    }

    #[cfg(test)]
    fn table_exists(&self, table_name: &str) -> Result<bool, TimelineError> {
        let exists: i64 = self.connection.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
            params![table_name],
            |row| row.get(0),
        )?;
        Ok(exists == 1)
    }

    pub fn create_context_event(
        &mut self,
        input: CreateContextEventInput,
    ) -> Result<ContextEvent, TimelineError> {
        let (id, occurred_at) = self.next_marker("ctx")?;
        let event = ContextEvent {
            id,
            occurred_at,
            app_name: input.app_name,
            window_title: input.window_title,
            event_type: input.event_type,
            metadata_json: normalized_metadata_json(input.metadata_json),
        };

        self.connection.execute(
            "INSERT INTO context_events (
                id,
                occurred_at,
                app_name,
                window_title,
                event_type,
                metadata_json
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                event.id,
                event.occurred_at,
                event.app_name,
                event.window_title,
                event.event_type,
                event.metadata_json
            ],
        )?;

        Ok(event)
    }

    pub fn create_utterance_event(
        &mut self,
        input: CreateUtteranceEventInput,
    ) -> Result<UtteranceEvent, TimelineError> {
        let (id, occurred_at) = self.next_marker("utt")?;
        let event = UtteranceEvent {
            id,
            occurred_at,
            trigger_type: input.trigger_type,
            speakability_score: input.speakability_score,
            message: input.message,
            provider: input.provider,
            context_event_id: input.context_event_id,
        };

        self.connection.execute(
            "INSERT INTO utterance_events (
                id,
                occurred_at,
                trigger_type,
                speakability_score,
                message,
                provider,
                context_event_id
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                event.id,
                event.occurred_at,
                event.trigger_type,
                event.speakability_score,
                event.message,
                event.provider,
                event.context_event_id
            ],
        )?;

        Ok(event)
    }

    pub fn create_user_reaction(
        &mut self,
        input: CreateUserReactionInput,
    ) -> Result<UserReaction, TimelineError> {
        let (id, occurred_at) = self.next_marker("rxn")?;
        let reaction = UserReaction {
            id,
            occurred_at,
            utterance_event_id: input.utterance_event_id,
            reaction_type: input.reaction_type,
        };

        self.connection.execute(
            "INSERT INTO user_reactions (
                id,
                occurred_at,
                utterance_event_id,
                reaction_type
             ) VALUES (?1, ?2, ?3, ?4)",
            params![
                reaction.id,
                reaction.occurred_at,
                reaction.utterance_event_id,
                reaction.reaction_type
            ],
        )?;

        Ok(reaction)
    }

    pub fn create_local_memory(
        &mut self,
        input: CreateLocalMemoryInput,
    ) -> Result<LocalMemory, TimelineError> {
        validate_local_memory_input(&input)?;
        let (id, created_at_ms) = self.next_marker("mem")?;
        let memory = LocalMemory {
            id,
            persona_id: input.persona_id,
            memory_type: input.memory_type,
            content: input.content,
            scope: input.scope,
            confidence: input.confidence,
            created_at_ms,
            updated_at_ms: created_at_ms,
        };

        self.connection.execute(
            "INSERT INTO local_memories (
                id,
                persona_id,
                memory_type,
                content,
                scope,
                confidence,
                created_at_ms,
                updated_at_ms
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                memory.id,
                memory.persona_id,
                memory.memory_type,
                memory.content,
                memory.scope,
                memory.confidence,
                memory.created_at_ms,
                memory.updated_at_ms
            ],
        )?;

        Ok(memory)
    }

    pub fn enqueue_sync_payload(
        &mut self,
        input: EnqueueSyncPayloadInput,
    ) -> Result<SyncQueueRow, TimelineError> {
        let envelope = validate_sync_payload_envelope(&input)?;
        let (id, created_at_ms) = self.next_marker("sync")?;
        let row = SyncQueueRow {
            id,
            event_type: input.event_type,
            payload_json: input.payload_json,
            idempotency_key: input.idempotency_key,
            safety_grade: envelope.safety_grade,
            redaction_level: envelope.redaction_level,
            retention_policy: envelope.retention_policy,
            status: "pending".to_string(),
            retry_count: 0,
            last_error: None,
            created_at_ms,
            updated_at_ms: created_at_ms,
        };

        self.connection.execute(
            "INSERT INTO sync_queue (
                id,
                event_type,
                payload_json,
                idempotency_key,
                safety_grade,
                redaction_level,
                retention_policy,
                status,
                retry_count,
                last_error,
                created_at_ms,
                updated_at_ms
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                row.id,
                row.event_type,
                row.payload_json,
                row.idempotency_key,
                row.safety_grade,
                row.redaction_level,
                row.retention_policy,
                row.status,
                row.retry_count,
                row.last_error,
                row.created_at_ms,
                row.updated_at_ms
            ],
        )?;

        Ok(row)
    }

    pub fn list_timeline_events(&self, limit: i64) -> Result<Vec<TimelineEvent>, TimelineError> {
        let safe_limit = limit.clamp(1, 100);
        let mut statement = self.connection.prepare(
            "SELECT id, occurred_at, kind, title, subtitle FROM (
                SELECT
                    id,
                    occurred_at,
                    'reaction' AS kind,
                    reaction_type AS title,
                    COALESCE(utterance_event_id, '') AS subtitle
                FROM user_reactions
                UNION ALL
                SELECT
                    id,
                    occurred_at,
                    'utterance' AS kind,
                    message AS title,
                    trigger_type || ' · ' || provider AS subtitle
                FROM utterance_events
                UNION ALL
                SELECT
                    id,
                    occurred_at,
                    'context' AS kind,
                    app_name AS title,
                    window_title AS subtitle
                FROM context_events
            )
            ORDER BY occurred_at DESC
            LIMIT ?1",
        )?;

        let rows = statement.query_map(params![safe_limit], |row| {
            Ok(TimelineEvent {
                id: row.get(0)?,
                occurred_at: row.get(1)?,
                kind: row.get(2)?,
                title: row.get(3)?,
                subtitle: row.get(4)?,
            })
        })?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(TimelineError::from)
    }

    fn next_marker(&mut self, prefix: &str) -> Result<(String, i64), TimelineError> {
        self.sequence += 1;
        let now = current_time_ms()?;
        self.last_occurred_at = std::cmp::max(now, self.last_occurred_at + 1);
        Ok((
            format!("{prefix}-{}-{}", self.last_occurred_at, self.sequence),
            self.last_occurred_at,
        ))
    }
}

pub struct TimelineState {
    repository: Mutex<TimelineRepository>,
}

impl TimelineState {
    pub fn new(repository: TimelineRepository) -> Self {
        Self {
            repository: Mutex::new(repository),
        }
    }

    pub fn repository(&self) -> &Mutex<TimelineRepository> {
        &self.repository
    }
}

fn current_time_ms() -> Result<i64, TimelineError> {
    Ok(SystemTime::now().duration_since(UNIX_EPOCH)?.as_millis() as i64)
}

fn normalized_metadata_json(metadata_json: String) -> String {
    if metadata_json.trim().is_empty() {
        "{}".to_string()
    } else {
        metadata_json
    }
}

#[cfg(test)]
mod tests;

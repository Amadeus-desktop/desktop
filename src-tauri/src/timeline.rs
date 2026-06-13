use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::{
    error::Error,
    fmt::{Display, Formatter},
    path::Path,
    sync::Mutex,
    time::{SystemTime, SystemTimeError, UNIX_EPOCH},
};
use tauri::State;

const MIGRATION_SQL: &str = include_str!("../../drizzle/0000_local_timeline_core.sql");

#[derive(Debug)]
pub enum TimelineError {
    Database(rusqlite::Error),
    Io(std::io::Error),
    Time(SystemTimeError),
    State(String),
}

impl Display for TimelineError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Database(error) => write!(formatter, "database error: {error}"),
            Self::Io(error) => write!(formatter, "io error: {error}"),
            Self::Time(error) => write!(formatter, "time error: {error}"),
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

#[derive(Debug, Serialize)]
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

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateContextEventInput {
    pub app_name: String,
    pub window_title: String,
    pub event_type: String,
    pub metadata_json: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUtteranceEventInput {
    pub trigger_type: String,
    pub speakability_score: i64,
    pub message: String,
    pub provider: String,
    pub context_event_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUserReactionInput {
    pub utterance_event_id: Option<String>,
    pub reaction_type: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextEvent {
    pub id: String,
    pub occurred_at: i64,
    pub app_name: String,
    pub window_title: String,
    pub event_type: String,
    pub metadata_json: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UtteranceEvent {
    pub id: String,
    pub occurred_at: i64,
    pub trigger_type: String,
    pub speakability_score: i64,
    pub message: String,
    pub provider: String,
    pub context_event_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserReaction {
    pub id: String,
    pub occurred_at: i64,
    pub utterance_event_id: Option<String>,
    pub reaction_type: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineEvent {
    pub id: String,
    pub occurred_at: i64,
    pub kind: String,
    pub title: String,
    pub subtitle: String,
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

#[tauri::command]
pub fn create_context_event(
    state: State<'_, TimelineState>,
    input: CreateContextEventInput,
) -> Result<ContextEvent, CommandError> {
    with_repository(&state, |repository| repository.create_context_event(input))
}

#[tauri::command]
pub fn create_utterance_event(
    state: State<'_, TimelineState>,
    input: CreateUtteranceEventInput,
) -> Result<UtteranceEvent, CommandError> {
    with_repository(&state, |repository| {
        repository.create_utterance_event(input)
    })
}

#[tauri::command]
pub fn create_user_reaction(
    state: State<'_, TimelineState>,
    input: CreateUserReactionInput,
) -> Result<UserReaction, CommandError> {
    with_repository(&state, |repository| repository.create_user_reaction(input))
}

#[tauri::command]
pub fn list_timeline_events(
    state: State<'_, TimelineState>,
    limit: i64,
) -> Result<Vec<TimelineEvent>, CommandError> {
    with_repository(&state, |repository| repository.list_timeline_events(limit))
}

fn with_repository<T>(
    state: &State<'_, TimelineState>,
    operation: impl FnOnce(&mut TimelineRepository) -> Result<T, TimelineError>,
) -> Result<T, CommandError> {
    let mut repository = state.repository.lock().map_err(|_| {
        CommandError::from(TimelineError::State(
            "timeline repository lock was poisoned".to_string(),
        ))
    })?;

    operation(&mut repository).map_err(CommandError::from)
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
mod tests {
    use super::*;

    #[test]
    fn stores_context_utterance_and_reaction_as_timeline_rows() {
        let mut repository = TimelineRepository::open_in_memory().expect("in-memory db opens");
        repository.migrate().expect("migration succeeds");

        let context = repository
            .create_context_event(CreateContextEventInput {
                app_name: "Visual Studio Code".to_string(),
                window_title: "Amadeus".to_string(),
                event_type: "active_window_changed".to_string(),
                metadata_json: "{}".to_string(),
            })
            .expect("context event is stored");

        let utterance = repository
            .create_utterance_event(CreateUtteranceEventInput {
                trigger_type: "deep_pause".to_string(),
                speakability_score: 72,
                message: "잠깐 멈춘 것 같아서. 말 안 해도 괜찮아.".to_string(),
                provider: "mock".to_string(),
                context_event_id: Some(context.id),
            })
            .expect("utterance event is stored");

        repository
            .create_user_reaction(CreateUserReactionInput {
                utterance_event_id: Some(utterance.id),
                reaction_type: "opened".to_string(),
            })
            .expect("reaction is stored");

        let timeline = repository
            .list_timeline_events(10)
            .expect("timeline rows are listed");

        assert_eq!(timeline.len(), 3);
        assert_eq!(timeline[0].kind, "reaction");
        assert_eq!(timeline[0].title, "opened");
        assert_eq!(timeline[1].kind, "utterance");
        assert_eq!(timeline[1].title, "잠깐 멈춘 것 같아서. 말 안 해도 괜찮아.");
        assert_eq!(timeline[2].kind, "context");
        assert_eq!(timeline[2].title, "Visual Studio Code");
    }
}

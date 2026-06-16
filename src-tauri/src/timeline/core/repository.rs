use rusqlite::{params, Connection};
use std::{
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

use super::{
    migrations::{apply_local_schema, local_schema_environment_from_env},
    validate_local_memory_input, validate_sync_payload_envelope, ActivityObservation,
    AppendConversationMessageInput, ContextEvent, ConversationMessage, ConversationSession,
    CreateContextEventInput, CreateLocalMemoryInput, CreateUserReactionInput,
    CreateUtteranceEventInput, EnqueueSyncPayloadInput, GetOrCreateConversationSessionInput,
    ListConversationMessagesInput, LocalMemory, RecordActivityObservationInput, SyncQueueRow,
    TimelineError, TimelineEvent, UserReaction, UtteranceEvent,
};

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
    pub(crate) fn open_in_memory() -> Result<Self, TimelineError> {
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
        apply_local_schema(&self.connection, local_schema_environment_from_env())
    }

    #[cfg(test)]
    pub(crate) fn table_exists(&self, table_name: &str) -> Result<bool, TimelineError> {
        let exists: i64 = self.connection.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
            params![table_name],
            |row| row.get(0),
        )?;
        Ok(exists == 1)
    }

    #[cfg(test)]
    pub(crate) fn table_columns(&self, table_name: &str) -> Result<Vec<String>, TimelineError> {
        let mut statement = self
            .connection
            .prepare(&format!("PRAGMA table_info({table_name})"))?;
        let rows = statement.query_map([], |row| row.get::<_, String>(1))?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(TimelineError::from)
    }

    #[cfg(test)]
    pub(crate) fn execute_batch_for_test(&self, sql: &str) -> Result<(), TimelineError> {
        self.connection.execute_batch(sql)?;
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
            "INSERT INTO context_events (id, occurred_at, app_name, window_title, event_type, metadata_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![event.id, event.occurred_at, event.app_name, event.window_title, event.event_type, event.metadata_json],
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
            "INSERT INTO utterance_events (id, occurred_at, trigger_type, speakability_score, message, provider, context_event_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![event.id, event.occurred_at, event.trigger_type, event.speakability_score, event.message, event.provider, event.context_event_id],
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
            "INSERT INTO user_reactions (id, occurred_at, utterance_event_id, reaction_type) VALUES (?1, ?2, ?3, ?4)",
            params![reaction.id, reaction.occurred_at, reaction.utterance_event_id, reaction.reaction_type],
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
            "INSERT INTO local_memories (id, persona_id, memory_type, content, scope, confidence, created_at_ms, updated_at_ms) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![memory.id, memory.persona_id, memory.memory_type, memory.content, memory.scope, memory.confidence, memory.created_at_ms, memory.updated_at_ms],
        )?;
        Ok(memory)
    }

    pub fn record_activity_observation(
        &mut self,
        input: RecordActivityObservationInput,
    ) -> Result<ActivityObservation, TimelineError> {
        validate_activity_observation_input(&input)?;
        let (id, observed_at_ms) = self.next_marker("act")?;
        let observation = ActivityObservation {
            id,
            observed_at_ms,
            app_name: input.app_name,
            bundle_identifier: input.bundle_identifier,
            process_id: input.process_id,
            app_category: input.app_category,
            browser_url_host: input.browser_url_host,
            browser_url_class: input.browser_url_class,
            idle_seconds: input.idle_seconds,
            frontmost_duration_ms: input.frontmost_duration_ms,
            is_fullscreen: input.is_fullscreen,
            sensitive: input.sensitive,
            capture_suppressed: input.capture_suppressed,
            trigger_action: input.trigger_action,
            trigger_candidate_type: input.trigger_candidate_type,
            speakability_score: input.speakability_score,
            source_kind: input.source_kind,
            metadata_json: normalized_metadata_json(input.metadata_json),
        };
        self.connection.execute(
            "INSERT INTO activity_observations (id, observed_at_ms, app_name, bundle_identifier, process_id, app_category, browser_url_host, browser_url_class, idle_seconds, frontmost_duration_ms, is_fullscreen, sensitive, capture_suppressed, trigger_action, trigger_candidate_type, speakability_score, source_kind, metadata_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
            params![
                observation.id,
                observation.observed_at_ms,
                observation.app_name,
                observation.bundle_identifier,
                observation.process_id,
                observation.app_category,
                observation.browser_url_host,
                observation.browser_url_class,
                observation.idle_seconds,
                observation.frontmost_duration_ms,
                bool_to_i64(observation.is_fullscreen),
                bool_to_i64(observation.sensitive),
                bool_to_i64(observation.capture_suppressed),
                observation.trigger_action,
                observation.trigger_candidate_type,
                observation.speakability_score,
                observation.source_kind,
                observation.metadata_json,
            ],
        )?;
        Ok(observation)
    }

    pub fn get_or_create_conversation_session(
        &mut self,
        input: GetOrCreateConversationSessionInput,
    ) -> Result<ConversationSession, TimelineError> {
        let persona_id = input.persona_id.trim();
        if persona_id.is_empty() {
            return Err(TimelineError::Validation(
                "conversation persona_id is required".to_string(),
            ));
        }

        if let Some(session) = self.find_conversation_session_for_persona(persona_id)? {
            return Ok(session);
        }

        let (id, created_at_ms) = self.next_marker("conv")?;
        let session = ConversationSession {
            cloud_conversation_id: format!("local-{id}"),
            id,
            persona_id: persona_id.to_string(),
            source: "app".to_string(),
            sync_status: "pending".to_string(),
            last_synced_message_at_ms: None,
            created_at_ms,
            updated_at_ms: created_at_ms,
        };
        self.connection.execute(
            "INSERT INTO conversation_sessions (id, cloud_conversation_id, persona_id, source, sync_status, last_synced_message_at_ms, created_at_ms, updated_at_ms) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                session.id,
                session.cloud_conversation_id,
                session.persona_id,
                session.source,
                session.sync_status,
                session.last_synced_message_at_ms,
                session.created_at_ms,
                session.updated_at_ms
            ],
        )?;
        Ok(session)
    }

    pub fn append_conversation_message(
        &mut self,
        input: AppendConversationMessageInput,
    ) -> Result<ConversationMessage, TimelineError> {
        validate_conversation_message_input(&input)?;

        if let Some(message) = self
            .find_conversation_message_by_idempotency(&input.session_id, &input.idempotency_key)?
        {
            return Ok(message);
        }

        let session_exists: i64 = self.connection.query_row(
            "SELECT COUNT(*) FROM conversation_sessions WHERE id = ?1",
            params![input.session_id],
            |row| row.get(0),
        )?;
        if session_exists == 0 {
            return Err(TimelineError::Validation(format!(
                "conversation session '{}' does not exist",
                input.session_id
            )));
        }

        let client_sequence: i64 = self.connection.query_row(
            "SELECT COALESCE(MAX(client_sequence), 0) + 1 FROM conversation_messages WHERE session_id = ?1",
            params![input.session_id],
            |row| row.get(0),
        )?;
        let (id, created_at_ms) = self.next_marker("msg")?;
        let message = ConversationMessage {
            id,
            cloud_message_id: None,
            session_id: input.session_id,
            role: input.role,
            content: input.content,
            provider: input.provider,
            sync_status: "pending".to_string(),
            idempotency_key: input.idempotency_key,
            client_sequence,
            created_at_ms,
            server_received_at_ms: None,
        };
        self.connection.execute(
            "INSERT INTO conversation_messages (id, cloud_message_id, session_id, role, content, provider, sync_status, idempotency_key, client_sequence, created_at_ms, server_received_at_ms) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                message.id,
                message.cloud_message_id,
                message.session_id,
                message.role,
                message.content,
                message.provider,
                message.sync_status,
                message.idempotency_key,
                message.client_sequence,
                message.created_at_ms,
                message.server_received_at_ms
            ],
        )?;
        self.connection.execute(
            "UPDATE conversation_sessions SET updated_at_ms = ?1, sync_status = 'pending' WHERE id = ?2",
            params![message.created_at_ms, message.session_id],
        )?;
        Ok(message)
    }

    pub fn list_conversation_messages_for_persona(
        &self,
        input: ListConversationMessagesInput,
    ) -> Result<Vec<ConversationMessage>, TimelineError> {
        let persona_id = input.persona_id.trim();
        if persona_id.is_empty() {
            return Err(TimelineError::Validation(
                "conversation persona_id is required".to_string(),
            ));
        }

        let Some(session) = self.find_conversation_session_for_persona(persona_id)? else {
            return Ok(Vec::new());
        };
        let safe_limit = input.limit.unwrap_or(40).clamp(1, 120);
        let mut statement = self.connection.prepare(
            "SELECT id, cloud_message_id, session_id, role, content, provider, sync_status, idempotency_key, client_sequence, created_at_ms, server_received_at_ms
             FROM (
                SELECT id, cloud_message_id, session_id, role, content, provider, sync_status, idempotency_key, client_sequence, created_at_ms, server_received_at_ms
                FROM conversation_messages
                WHERE session_id = ?1 AND sync_status != 'deleted'
                ORDER BY created_at_ms DESC, client_sequence DESC
                LIMIT ?2
             )
             ORDER BY created_at_ms ASC, client_sequence ASC",
        )?;
        let rows = statement.query_map(
            params![session.id, safe_limit],
            conversation_message_from_row,
        )?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(TimelineError::from)
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
            "INSERT INTO sync_queue (id, event_type, payload_json, idempotency_key, safety_grade, redaction_level, retention_policy, status, retry_count, last_error, created_at_ms, updated_at_ms) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![row.id, row.event_type, row.payload_json, row.idempotency_key, row.safety_grade, row.redaction_level, row.retention_policy, row.status, row.retry_count, row.last_error, row.created_at_ms, row.updated_at_ms],
        )?;
        Ok(row)
    }

    fn find_conversation_session_for_persona(
        &self,
        persona_id: &str,
    ) -> Result<Option<ConversationSession>, TimelineError> {
        let mut statement = self.connection.prepare(
            "SELECT id, cloud_conversation_id, persona_id, source, sync_status, last_synced_message_at_ms, created_at_ms, updated_at_ms
             FROM conversation_sessions
             WHERE persona_id = ?1 AND source = 'app' AND sync_status != 'deleted'
             ORDER BY updated_at_ms DESC
             LIMIT 1",
        )?;
        let mut rows = statement.query_map(params![persona_id], conversation_session_from_row)?;
        rows.next().transpose().map_err(TimelineError::from)
    }

    fn find_conversation_message_by_idempotency(
        &self,
        session_id: &str,
        idempotency_key: &str,
    ) -> Result<Option<ConversationMessage>, TimelineError> {
        let mut statement = self.connection.prepare(
            "SELECT id, cloud_message_id, session_id, role, content, provider, sync_status, idempotency_key, client_sequence, created_at_ms, server_received_at_ms
             FROM conversation_messages
             WHERE session_id = ?1 AND idempotency_key = ?2
             LIMIT 1",
        )?;
        let mut rows = statement.query_map(
            params![session_id, idempotency_key],
            conversation_message_from_row,
        )?;
        rows.next().transpose().map_err(TimelineError::from)
    }

    pub fn list_timeline_events(&self, limit: i64) -> Result<Vec<TimelineEvent>, TimelineError> {
        let safe_limit = limit.clamp(1, 100);
        let mut statement = self.connection.prepare(
            "SELECT id, occurred_at, kind, title, subtitle, metadata_json FROM (
                SELECT id, occurred_at, 'reaction' AS kind, reaction_type AS title, COALESCE(utterance_event_id, '') AS subtitle, '{}' AS metadata_json FROM user_reactions
                UNION ALL
                SELECT id, occurred_at, 'utterance' AS kind, message AS title, trigger_type || ' · ' || provider AS subtitle, '{}' AS metadata_json FROM utterance_events
                UNION ALL
                SELECT id, occurred_at, 'context' AS kind, app_name AS title, window_title AS subtitle, metadata_json FROM context_events
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
                metadata_json: row.get(5)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(TimelineError::from)
    }

    pub fn list_activity_observations(
        &self,
        limit: i64,
    ) -> Result<Vec<ActivityObservation>, TimelineError> {
        let safe_limit = limit.clamp(1, 200);
        let mut statement = self.connection.prepare(
            "SELECT id, observed_at_ms, app_name, bundle_identifier, process_id, app_category, browser_url_host, browser_url_class, idle_seconds, frontmost_duration_ms, is_fullscreen, sensitive, capture_suppressed, trigger_action, trigger_candidate_type, speakability_score, source_kind, metadata_json
             FROM activity_observations
             ORDER BY observed_at_ms DESC
             LIMIT ?1",
        )?;
        let rows = statement.query_map(params![safe_limit], activity_observation_from_row)?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(TimelineError::from)
    }

    pub fn clear_local_data(&mut self) -> Result<usize, TimelineError> {
        let transaction = self.connection.transaction()?;
        let mut deleted = 0;
        for table_name in [
            "sync_queue",
            "conversation_messages",
            "conversation_sessions",
            "local_memories",
            "work_sessions",
            "activity_observations",
            "user_reactions",
            "utterance_events",
            "context_events",
        ] {
            deleted += transaction.execute(&format!("DELETE FROM {table_name}"), [])?;
        }
        transaction.commit()?;
        Ok(deleted)
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

fn conversation_session_from_row(
    row: &rusqlite::Row<'_>,
) -> Result<ConversationSession, rusqlite::Error> {
    Ok(ConversationSession {
        id: row.get(0)?,
        cloud_conversation_id: row.get(1)?,
        persona_id: row.get(2)?,
        source: row.get(3)?,
        sync_status: row.get(4)?,
        last_synced_message_at_ms: row.get(5)?,
        created_at_ms: row.get(6)?,
        updated_at_ms: row.get(7)?,
    })
}

fn conversation_message_from_row(
    row: &rusqlite::Row<'_>,
) -> Result<ConversationMessage, rusqlite::Error> {
    Ok(ConversationMessage {
        id: row.get(0)?,
        cloud_message_id: row.get(1)?,
        session_id: row.get(2)?,
        role: row.get(3)?,
        content: row.get(4)?,
        provider: row.get(5)?,
        sync_status: row.get(6)?,
        idempotency_key: row.get(7)?,
        client_sequence: row.get(8)?,
        created_at_ms: row.get(9)?,
        server_received_at_ms: row.get(10)?,
    })
}

fn activity_observation_from_row(
    row: &rusqlite::Row<'_>,
) -> Result<ActivityObservation, rusqlite::Error> {
    Ok(ActivityObservation {
        id: row.get(0)?,
        observed_at_ms: row.get(1)?,
        app_name: row.get(2)?,
        bundle_identifier: row.get(3)?,
        process_id: row.get(4)?,
        app_category: row.get(5)?,
        browser_url_host: row.get(6)?,
        browser_url_class: row.get(7)?,
        idle_seconds: row.get(8)?,
        frontmost_duration_ms: row.get(9)?,
        is_fullscreen: row.get::<_, i64>(10)? != 0,
        sensitive: row.get::<_, i64>(11)? != 0,
        capture_suppressed: row.get::<_, i64>(12)? != 0,
        trigger_action: row.get(13)?,
        trigger_candidate_type: row.get(14)?,
        speakability_score: row.get(15)?,
        source_kind: row.get(16)?,
        metadata_json: row.get(17)?,
    })
}

fn validate_conversation_message_input(
    input: &AppendConversationMessageInput,
) -> Result<(), TimelineError> {
    if input.session_id.trim().is_empty() {
        return Err(TimelineError::Validation(
            "conversation message session_id is required".to_string(),
        ));
    }
    if !matches!(input.role.as_str(), "user" | "assistant" | "system_summary") {
        return Err(TimelineError::Validation(format!(
            "unsupported conversation message role '{}'",
            input.role
        )));
    }
    if input.content.trim().is_empty() {
        return Err(TimelineError::Validation(
            "conversation message content is required".to_string(),
        ));
    }
    if input.idempotency_key.trim().is_empty() {
        return Err(TimelineError::Validation(
            "conversation message idempotency_key is required".to_string(),
        ));
    }
    Ok(())
}

fn validate_activity_observation_input(
    input: &RecordActivityObservationInput,
) -> Result<(), TimelineError> {
    if input.app_name.trim().is_empty() {
        return Err(TimelineError::Validation(
            "activity observation app_name is required".to_string(),
        ));
    }
    if !matches!(input.app_category.as_str(), "Work" | "NonWork" | "Unknown") {
        return Err(TimelineError::Validation(format!(
            "unsupported activity observation app_category '{}'",
            input.app_category
        )));
    }
    if let Some(browser_url_class) = input.browser_url_class.as_deref() {
        if !matches!(browser_url_class, "Work" | "Video" | "Unknown") {
            return Err(TimelineError::Validation(format!(
                "unsupported activity observation browser_url_class '{browser_url_class}'"
            )));
        }
    }
    if !matches!(
        input.source_kind.as_str(),
        "Process" | "Browser" | "Ocr" | "TriggerPoll"
    ) {
        return Err(TimelineError::Validation(format!(
            "unsupported activity observation source_kind '{}'",
            input.source_kind
        )));
    }
    Ok(())
}

fn bool_to_i64(value: bool) -> i64 {
    if value {
        1
    } else {
        0
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

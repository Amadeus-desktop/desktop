mod commands;
mod core;

use serde::{Deserialize, Serialize};

pub use commands::{
    append_conversation_message, clear_local_timeline_data, create_context_event,
    create_local_memory, create_user_reaction, create_utterance_event, enqueue_sync_payload,
    get_local_persona, get_or_create_conversation_session, list_activity_observations,
    list_conversation_messages_for_persona, list_local_memory_cards, list_local_personas,
    list_pending_sync_queue, list_timeline_events, list_work_sessions, mark_sync_queue_synced,
    record_sync_queue_failure, upsert_local_personas,
};
pub use core::{
    ActivityObservation, AppendConversationMessageInput, ContextEvent, ConversationMessage,
    ConversationSession, CreateContextEventInput, CreateLocalMemoryInput, CreateUserReactionInput,
    CreateUtteranceEventInput, EnqueueSyncPayloadInput, GetOrCreateConversationSessionInput,
    ListConversationMessagesInput, ListLocalMemoryCardsInput, ListPendingSyncQueueInput,
    LocalMemory, LocalMemoryCardRow, MarkSyncQueueSyncedInput, RecordActivityObservationInput,
    RecordSyncQueueFailureInput, SyncQueueRow, TimelineEvent, TimelineRepository, TimelineState,
    UserReaction, UtteranceEvent, WorkSession,
};

pub(crate) use core::{CommandError, TimelineError};

#[cfg(test)]
pub(crate) use core::{
    local_schema_sql_for_environment, LocalSchemaEnvironment, SyncPayloadEnvelope,
};

#[cfg(test)]
mod tests;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalPersonaCacheInput {
    pub id: String,
    pub remote_persona_id: String,
    pub slug: String,
    pub name: String,
    pub base_tone: String,
    pub relationship_type: String,
    pub world_type: String,
    pub static_prompt_json: String,
    pub persona_state_json: Option<String>,
    pub remote_version: i64,
    pub last_pulled_version: i64,
    pub pending_mutation_id: Option<String>,
    pub sync_status: String,
    pub updated_at_ms: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertLocalPersonasInput {
    pub personas: Vec<LocalPersonaCacheInput>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetLocalPersonaInput {
    pub slug_or_remote_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalPersonaCacheRow {
    pub id: String,
    pub remote_persona_id: String,
    pub slug: String,
    pub name: String,
    pub base_tone: String,
    pub relationship_type: String,
    pub world_type: String,
    pub static_prompt_json: String,
    pub persona_state_json: Option<String>,
    pub remote_version: i64,
    pub last_pulled_version: i64,
    pub pending_mutation_id: Option<String>,
    pub sync_status: String,
    pub updated_at_ms: i64,
}

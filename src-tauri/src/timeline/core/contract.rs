use serde::{Deserialize, Serialize};

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

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateLocalMemoryInput {
    pub persona_id: Option<String>,
    pub memory_type: String,
    pub content: String,
    pub scope: String,
    pub confidence: i64,
    pub syncable: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordActivityObservationInput {
    pub app_name: String,
    pub bundle_identifier: String,
    pub process_id: i64,
    pub app_category: String,
    pub browser_url_host: Option<String>,
    pub browser_url_class: Option<String>,
    pub idle_seconds: f64,
    pub frontmost_duration_ms: i64,
    pub is_fullscreen: bool,
    pub sensitive: bool,
    pub capture_suppressed: bool,
    pub trigger_action: String,
    pub trigger_candidate_type: Option<String>,
    pub speakability_score: i64,
    pub source_kind: String,
    pub metadata_json: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetOrCreateConversationSessionInput {
    pub persona_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListConversationMessagesInput {
    pub persona_id: String,
    pub limit: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppendConversationMessageInput {
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub provider: Option<String>,
    pub idempotency_key: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnqueueSyncPayloadInput {
    pub event_type: String,
    pub payload_json: String,
    pub idempotency_key: String,
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
pub struct LocalMemory {
    pub id: String,
    pub persona_id: Option<String>,
    pub memory_type: String,
    pub content: String,
    pub scope: String,
    pub confidence: i64,
    pub created_at_ms: i64,
    pub updated_at_ms: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityObservation {
    pub id: String,
    pub observed_at_ms: i64,
    pub app_name: String,
    pub bundle_identifier: String,
    pub process_id: i64,
    pub app_category: String,
    pub browser_url_host: Option<String>,
    pub browser_url_class: Option<String>,
    pub idle_seconds: f64,
    pub frontmost_duration_ms: i64,
    pub is_fullscreen: bool,
    pub sensitive: bool,
    pub capture_suppressed: bool,
    pub trigger_action: String,
    pub trigger_candidate_type: Option<String>,
    pub speakability_score: i64,
    pub source_kind: String,
    pub metadata_json: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationSession {
    pub id: String,
    pub cloud_conversation_id: String,
    pub persona_id: String,
    pub source: String,
    pub sync_status: String,
    pub last_synced_message_at_ms: Option<i64>,
    pub created_at_ms: i64,
    pub updated_at_ms: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationMessage {
    pub id: String,
    pub cloud_message_id: Option<String>,
    pub session_id: String,
    pub role: String,
    pub content: String,
    pub provider: Option<String>,
    pub sync_status: String,
    pub idempotency_key: String,
    pub client_sequence: i64,
    pub created_at_ms: i64,
    pub server_received_at_ms: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncQueueRow {
    pub id: String,
    pub event_type: String,
    pub payload_json: String,
    pub idempotency_key: String,
    pub safety_grade: String,
    pub redaction_level: String,
    pub retention_policy: String,
    pub status: String,
    pub retry_count: i64,
    pub last_error: Option<String>,
    pub created_at_ms: i64,
    pub updated_at_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncPayloadEnvelope {
    pub schema_version: i64,
    pub event_type: String,
    pub payload_class: String,
    pub safety_grade: String,
    pub redaction_level: String,
    pub retention_policy: String,
    pub validator_version: String,
    pub payload: serde_json::Value,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineEvent {
    pub id: String,
    pub occurred_at: i64,
    pub kind: String,
    pub title: String,
    pub subtitle: String,
    pub metadata_json: String,
}

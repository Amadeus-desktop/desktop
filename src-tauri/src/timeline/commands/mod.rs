use tauri::State;

use super::{
    ActivityObservation, AppendConversationMessageInput, CommandError, ContextEvent,
    ConversationMessage, ConversationSession, CreateContextEventInput, CreateLocalMemoryInput,
    CreateUserReactionInput, CreateUtteranceEventInput, EnqueueSyncPayloadInput,
    GetConversationSessionForMessageInput, GetLocalPersonaInput,
    GetOrCreateConversationSessionInput, ListConversationMessagesInput, ListLocalMemoryCardsInput,
    ListPendingConversationMessagesInput, ListPendingSyncQueueInput, LocalMemory,
    LocalMemoryCardRow, LocalPersonaCacheRow, MarkConversationMessageSyncFailedInput,
    MarkConversationMessageSyncedInput, MarkConversationSessionSyncedInput,
    MarkSyncQueueSyncedInput, RecordSyncQueueFailureInput, SyncQueueRow, TimelineError,
    TimelineEvent, TimelineState, UpsertCloudConversationMessageInput, UpsertLocalPersonasInput,
    UserReaction, UtteranceEvent, WorkSession,
};

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
pub fn create_local_memory(
    state: State<'_, TimelineState>,
    input: CreateLocalMemoryInput,
) -> Result<LocalMemory, CommandError> {
    with_repository(&state, |repository| repository.create_local_memory(input))
}

#[tauri::command]
pub fn upsert_local_personas(
    state: State<'_, TimelineState>,
    input: UpsertLocalPersonasInput,
) -> Result<Vec<LocalPersonaCacheRow>, CommandError> {
    with_repository(&state, |repository| repository.upsert_local_personas(input))
}

#[tauri::command]
pub fn list_local_personas(
    state: State<'_, TimelineState>,
) -> Result<Vec<LocalPersonaCacheRow>, CommandError> {
    with_repository(&state, |repository| repository.list_local_personas())
}

#[tauri::command]
pub fn get_local_persona(
    state: State<'_, TimelineState>,
    input: GetLocalPersonaInput,
) -> Result<Option<LocalPersonaCacheRow>, CommandError> {
    with_repository(&state, |repository| repository.get_local_persona(input))
}

#[tauri::command]
pub fn get_or_create_conversation_session(
    state: State<'_, TimelineState>,
    input: GetOrCreateConversationSessionInput,
) -> Result<ConversationSession, CommandError> {
    with_repository(&state, |repository| {
        repository.get_or_create_conversation_session(input)
    })
}

#[tauri::command]
pub fn append_conversation_message(
    state: State<'_, TimelineState>,
    input: AppendConversationMessageInput,
) -> Result<ConversationMessage, CommandError> {
    with_repository(&state, |repository| {
        repository.append_conversation_message(input)
    })
}

#[tauri::command]
pub fn list_pending_conversation_messages(
    state: State<'_, TimelineState>,
    input: ListPendingConversationMessagesInput,
) -> Result<Vec<ConversationMessage>, CommandError> {
    with_repository(&state, |repository| {
        repository.list_pending_conversation_messages(input)
    })
}

#[tauri::command]
pub fn get_conversation_session_for_message(
    state: State<'_, TimelineState>,
    input: GetConversationSessionForMessageInput,
) -> Result<Option<ConversationSession>, CommandError> {
    with_repository(&state, |repository| {
        repository.get_conversation_session_for_message(input)
    })
}

#[tauri::command]
pub fn mark_conversation_session_synced(
    state: State<'_, TimelineState>,
    input: MarkConversationSessionSyncedInput,
) -> Result<ConversationSession, CommandError> {
    with_repository(&state, |repository| {
        repository.mark_conversation_session_synced(input)
    })
}

#[tauri::command]
pub fn mark_conversation_message_synced(
    state: State<'_, TimelineState>,
    input: MarkConversationMessageSyncedInput,
) -> Result<ConversationMessage, CommandError> {
    with_repository(&state, |repository| {
        repository.mark_conversation_message_synced(input)
    })
}

#[tauri::command]
pub fn mark_conversation_message_sync_failed(
    state: State<'_, TimelineState>,
    input: MarkConversationMessageSyncFailedInput,
) -> Result<ConversationMessage, CommandError> {
    with_repository(&state, |repository| {
        repository.mark_conversation_message_sync_failed(input)
    })
}

#[tauri::command]
pub fn upsert_cloud_conversation_message(
    state: State<'_, TimelineState>,
    input: UpsertCloudConversationMessageInput,
) -> Result<ConversationMessage, CommandError> {
    with_repository(&state, |repository| {
        repository.upsert_cloud_conversation_message(input)
    })
}

#[tauri::command]
pub fn list_conversation_messages_for_persona(
    state: State<'_, TimelineState>,
    input: ListConversationMessagesInput,
) -> Result<Vec<ConversationMessage>, CommandError> {
    with_repository(&state, |repository| {
        repository.list_conversation_messages_for_persona(input)
    })
}

#[tauri::command]
pub fn enqueue_sync_payload(
    state: State<'_, TimelineState>,
    input: EnqueueSyncPayloadInput,
) -> Result<SyncQueueRow, CommandError> {
    with_repository(&state, |repository| repository.enqueue_sync_payload(input))
}

#[tauri::command]
pub fn list_pending_sync_queue(
    state: State<'_, TimelineState>,
    input: ListPendingSyncQueueInput,
) -> Result<Vec<SyncQueueRow>, CommandError> {
    with_repository(&state, |repository| {
        repository.list_pending_sync_queue(input)
    })
}

#[tauri::command]
pub fn list_local_memory_cards(
    state: State<'_, TimelineState>,
    input: ListLocalMemoryCardsInput,
) -> Result<Vec<LocalMemoryCardRow>, CommandError> {
    with_repository(&state, |repository| {
        repository.list_local_memory_cards(input)
    })
}

#[tauri::command]
pub fn mark_sync_queue_synced(
    state: State<'_, TimelineState>,
    input: MarkSyncQueueSyncedInput,
) -> Result<SyncQueueRow, CommandError> {
    with_repository(&state, |repository| {
        repository.mark_sync_queue_synced(input)
    })
}

#[tauri::command]
pub fn record_sync_queue_failure(
    state: State<'_, TimelineState>,
    input: RecordSyncQueueFailureInput,
) -> Result<SyncQueueRow, CommandError> {
    with_repository(&state, |repository| {
        repository.record_sync_queue_failure(input)
    })
}

#[tauri::command]
pub fn list_timeline_events(
    state: State<'_, TimelineState>,
    limit: i64,
) -> Result<Vec<TimelineEvent>, CommandError> {
    with_repository(&state, |repository| repository.list_timeline_events(limit))
}

#[tauri::command]
pub fn list_activity_observations(
    state: State<'_, TimelineState>,
    limit: i64,
) -> Result<Vec<ActivityObservation>, CommandError> {
    with_repository(&state, |repository| {
        repository.list_activity_observations(limit)
    })
}

#[tauri::command]
pub fn list_work_sessions(
    state: State<'_, TimelineState>,
    limit: i64,
) -> Result<Vec<WorkSession>, CommandError> {
    with_repository(&state, |repository| repository.list_work_sessions(limit))
}

#[tauri::command]
pub fn clear_local_timeline_data(state: State<'_, TimelineState>) -> Result<usize, CommandError> {
    with_repository(&state, |repository| repository.clear_local_data())
}

fn with_repository<T>(
    state: &State<'_, TimelineState>,
    operation: impl FnOnce(&mut super::TimelineRepository) -> Result<T, TimelineError>,
) -> Result<T, CommandError> {
    let mut repository = state.repository().lock().map_err(|_| {
        CommandError::from(TimelineError::State(
            "timeline repository lock was poisoned".to_string(),
        ))
    })?;

    operation(&mut repository).map_err(CommandError::from)
}

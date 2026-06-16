use tauri::State;

use super::{
    AppendConversationMessageInput, CommandError, ContextEvent, ConversationMessage,
    ConversationSession, CreateContextEventInput, CreateLocalMemoryInput, CreateUserReactionInput,
    CreateUtteranceEventInput, EnqueueSyncPayloadInput, GetOrCreateConversationSessionInput,
    LocalMemory, SyncQueueRow, TimelineError, TimelineEvent, TimelineState, UserReaction,
    UtteranceEvent,
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
pub fn enqueue_sync_payload(
    state: State<'_, TimelineState>,
    input: EnqueueSyncPayloadInput,
) -> Result<SyncQueueRow, CommandError> {
    with_repository(&state, |repository| repository.enqueue_sync_payload(input))
}

#[tauri::command]
pub fn list_timeline_events(
    state: State<'_, TimelineState>,
    limit: i64,
) -> Result<Vec<TimelineEvent>, CommandError> {
    with_repository(&state, |repository| repository.list_timeline_events(limit))
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

mod commands;
mod core;

pub use commands::{
    append_conversation_message, clear_local_timeline_data, create_context_event,
    create_local_memory, create_user_reaction, create_utterance_event, enqueue_sync_payload,
    get_or_create_conversation_session, list_conversation_messages_for_persona,
    list_timeline_events,
};
pub use core::{
    AppendConversationMessageInput, ContextEvent, ConversationMessage, ConversationSession,
    CreateContextEventInput, CreateLocalMemoryInput, CreateUserReactionInput,
    CreateUtteranceEventInput, EnqueueSyncPayloadInput, GetOrCreateConversationSessionInput,
    ListConversationMessagesInput, LocalMemory, RecordActivityObservationInput, SyncQueueRow,
    TimelineEvent, TimelineRepository, TimelineState, UserReaction, UtteranceEvent,
};

pub(crate) use core::{CommandError, TimelineError};

#[cfg(test)]
pub(crate) use core::{
    local_schema_sql_for_environment, LocalSchemaEnvironment, SyncPayloadEnvelope,
};

#[cfg(test)]
mod tests;

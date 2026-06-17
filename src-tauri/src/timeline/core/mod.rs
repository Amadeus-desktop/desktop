mod contract;
mod error;
mod migrations;
mod repository;
mod state;
mod validation;

pub use contract::{
    ActivityObservation, AppendConversationMessageInput, ContextEvent, ConversationMessage,
    ConversationSession, CreateContextEventInput, CreateLocalMemoryInput, CreateUserReactionInput,
    CreateUtteranceEventInput, EnqueueSyncPayloadInput, GetOrCreateConversationSessionInput,
    ListConversationMessagesInput, ListLocalMemoryCardsInput, ListPendingSyncQueueInput,
    LocalMemory, LocalMemoryCardRow, MarkSyncQueueSyncedInput, RecordActivityObservationInput,
    RecordSyncQueueFailureInput, SyncPayloadEnvelope, SyncQueueRow, TimelineEvent, UserReaction,
    UtteranceEvent, WorkSession,
};
pub use repository::TimelineRepository;
pub use state::TimelineState;

pub(crate) use error::{CommandError, TimelineError};
pub(crate) use validation::{validate_local_memory_input, validate_sync_payload_envelope};

#[cfg(test)]
pub(crate) use migrations::{local_schema_sql_for_environment, LocalSchemaEnvironment};

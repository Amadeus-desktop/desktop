use super::*;

#[test]
fn local_schema_selection_is_explicit_for_dev_and_production() {
    let dev_schema = local_schema_sql_for_environment(LocalSchemaEnvironment::Development);
    let production_schema = local_schema_sql_for_environment(LocalSchemaEnvironment::Production);

    assert!(dev_schema.contains("CREATE TABLE IF NOT EXISTS context_events"));
    assert!(production_schema.contains("CREATE TABLE IF NOT EXISTS context_events"));
    assert_eq!(dev_schema, production_schema);
}

#[test]
fn stores_context_utterance_and_reaction_as_timeline_rows() {
    let mut repository = TimelineRepository::open_in_memory().expect("in-memory db opens");
    repository.migrate().expect("migration succeeds");

    let context = repository
        .create_context_event(CreateContextEventInput {
            app_name: "Visual Studio Code".to_string(),
            window_title: "Amadeus".to_string(),
            event_type: "active_window_changed".to_string(),
            metadata_json: serde_json::json!({
                "category": "Work",
                "frontmostDurationMs": 3600000,
                "browserContext": null
            })
            .to_string(),
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
    assert!(timeline[2].metadata_json.contains("frontmostDurationMs"));
}

#[test]
fn clears_local_timeline_data() {
    let mut repository = TimelineRepository::open_in_memory().expect("in-memory db opens");
    repository.migrate().expect("migration succeeds");

    let context = repository
        .create_context_event(CreateContextEventInput {
            app_name: "Preview".to_string(),
            window_title: "Customer roadmap".to_string(),
            event_type: "active_window_changed".to_string(),
            metadata_json: "{}".to_string(),
        })
        .expect("context event is stored");
    let utterance = repository
        .create_utterance_event(CreateUtteranceEventInput {
            trigger_type: "deep_pause".to_string(),
            speakability_score: 70,
            message: "잠깐 쉬어도 괜찮아.".to_string(),
            provider: "template".to_string(),
            context_event_id: Some(context.id),
        })
        .expect("utterance event is stored");
    repository
        .create_user_reaction(CreateUserReactionInput {
            utterance_event_id: Some(utterance.id),
            reaction_type: "dismissed".to_string(),
        })
        .expect("reaction is stored");
    repository
        .create_local_memory(CreateLocalMemoryInput {
            persona_id: None,
            memory_type: "work_context".to_string(),
            content: "private summary".to_string(),
            scope: "local_private".to_string(),
            confidence: 80,
            syncable: false,
        })
        .expect("local memory is stored");
    repository
        .enqueue_sync_payload(EnqueueSyncPayloadInput {
            event_type: "memory.summary".to_string(),
            payload_json: serde_json::to_string(&SyncPayloadEnvelope {
                schema_version: 1,
                event_type: "memory.summary".to_string(),
                payload_class: "SafeSummary".to_string(),
                safety_grade: "SafeWorkSummary".to_string(),
                redaction_level: "SummaryRedacted".to_string(),
                retention_policy: "Timeline".to_string(),
                validator_version: "phase6.v1".to_string(),
                payload: serde_json::json!({"summary": "worked on planning"}),
            })
            .expect("valid json"),
            idempotency_key: "clear-test".to_string(),
        })
        .expect("sync payload is queued");

    let deleted = repository
        .clear_local_data()
        .expect("local data is cleared");

    assert!(deleted >= 5);
    assert!(repository
        .list_timeline_events(10)
        .expect("timeline rows are listed")
        .is_empty());
}

#[test]
fn migration_prepares_phase_6_local_tables() {
    let mut repository = TimelineRepository::open_in_memory().expect("in-memory db opens");
    repository.migrate().expect("migration succeeds");

    for table_name in [
        "local_personas",
        "local_memories",
        "work_sessions",
        "conversation_sessions",
        "conversation_messages",
        "sync_queue",
    ] {
        assert!(
            repository
                .table_exists(table_name)
                .expect("schema query works"),
            "{table_name} table should exist"
        );
    }

    let local_persona_columns = repository
        .table_columns("local_personas")
        .expect("schema query works");
    for column_name in [
        "remote_persona_id",
        "slug",
        "base_tone",
        "relationship_type",
        "world_type",
        "static_prompt_json",
        "persona_state_json",
        "remote_version",
        "last_pulled_version",
        "pending_mutation_id",
        "sync_status",
    ] {
        assert!(
            local_persona_columns
                .iter()
                .any(|column| column == column_name),
            "local_personas should include {column_name}"
        );
    }

    let local_memory_columns = repository
        .table_columns("local_memories")
        .expect("schema query works");
    for column_name in [
        "memory_category",
        "source",
        "normalized_key",
        "source_message_ids_json",
        "evidence_excerpt_redacted",
        "observed_at_ms",
        "valid_from_ms",
        "expires_at_ms",
        "user_confirmed",
        "contradicts_memory_id",
        "write_reason",
        "deleted_at_ms",
        "metadata_json",
    ] {
        assert!(
            local_memory_columns
                .iter()
                .any(|column| column == column_name),
            "local_memories should include {column_name}"
        );
    }

    let conversation_session_columns = repository
        .table_columns("conversation_sessions")
        .expect("schema query works");
    for column_name in [
        "cloud_conversation_id",
        "persona_id",
        "source",
        "sync_status",
        "last_synced_message_at_ms",
    ] {
        assert!(
            conversation_session_columns
                .iter()
                .any(|column| column == column_name),
            "conversation_sessions should include {column_name}"
        );
    }

    let conversation_message_columns = repository
        .table_columns("conversation_messages")
        .expect("schema query works");
    for column_name in [
        "cloud_message_id",
        "session_id",
        "role",
        "content",
        "provider",
        "sync_status",
        "idempotency_key",
        "client_sequence",
        "server_received_at_ms",
    ] {
        assert!(
            conversation_message_columns
                .iter()
                .any(|column| column == column_name),
            "conversation_messages should include {column_name}"
        );
    }
}

#[test]
fn stores_conversation_sessions_per_persona_and_messages_idempotently() {
    let mut repository = TimelineRepository::open_in_memory().expect("in-memory db opens");
    repository.migrate().expect("migration succeeds");

    let seoyeon = repository
        .get_or_create_conversation_session(GetOrCreateConversationSessionInput {
            persona_id: "seoyeon-modern-senior".to_string(),
        })
        .expect("seoyeon session is stored");
    let same_seoyeon = repository
        .get_or_create_conversation_session(GetOrCreateConversationSessionInput {
            persona_id: "seoyeon-modern-senior".to_string(),
        })
        .expect("same persona session is reused");
    let makise = repository
        .get_or_create_conversation_session(GetOrCreateConversationSessionInput {
            persona_id: "makise-kurisu".to_string(),
        })
        .expect("makise session is stored separately");

    assert_eq!(seoyeon.id, same_seoyeon.id);
    assert_ne!(seoyeon.id, makise.id);
    assert_eq!(seoyeon.persona_id, "seoyeon-modern-senior");
    assert_eq!(makise.persona_id, "makise-kurisu");

    let user_message = repository
        .append_conversation_message(AppendConversationMessageInput {
            session_id: seoyeon.id.clone(),
            role: "user".to_string(),
            content: "오늘 힘들어.".to_string(),
            provider: None,
            idempotency_key: "user-message-1".to_string(),
        })
        .expect("user message is stored");
    let duplicate = repository
        .append_conversation_message(AppendConversationMessageInput {
            session_id: seoyeon.id.clone(),
            role: "user".to_string(),
            content: "오늘 힘들어.".to_string(),
            provider: None,
            idempotency_key: "user-message-1".to_string(),
        })
        .expect("duplicate message is returned");
    let reply = repository
        .append_conversation_message(AppendConversationMessageInput {
            session_id: seoyeon.id.clone(),
            role: "assistant".to_string(),
            content: "여기 있어.".to_string(),
            provider: Some("edge:openai".to_string()),
            idempotency_key: "assistant-message-1".to_string(),
        })
        .expect("assistant message is stored");

    assert_eq!(user_message.id, duplicate.id);
    assert_eq!(user_message.client_sequence, 1);
    assert_eq!(reply.client_sequence, 2);
    assert_eq!(reply.provider.as_deref(), Some("edge:openai"));

    let restored = repository
        .list_conversation_messages_for_persona(ListConversationMessagesInput {
            persona_id: "seoyeon-modern-senior".to_string(),
            limit: Some(10),
        })
        .expect("messages are restored for persona");
    let makise_restored = repository
        .list_conversation_messages_for_persona(ListConversationMessagesInput {
            persona_id: "makise-kurisu".to_string(),
            limit: Some(10),
        })
        .expect("other persona has independent session");

    assert_eq!(restored.len(), 2);
    assert_eq!(restored[0].role, "user");
    assert_eq!(restored[1].role, "assistant");
    assert!(makise_restored.is_empty());
}

#[test]
fn migration_upgrades_legacy_local_memories_table() {
    let mut repository = TimelineRepository::open_in_memory().expect("in-memory db opens");
    repository
        .execute_batch_for_test(
            "CREATE TABLE local_memories (
              id TEXT PRIMARY KEY NOT NULL,
              persona_id TEXT,
              memory_type TEXT NOT NULL,
              content TEXT NOT NULL,
              scope TEXT NOT NULL CHECK (scope IN ('local_private', 'syncable_summary')),
              confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
              created_at_ms INTEGER NOT NULL,
              updated_at_ms INTEGER NOT NULL
            );",
        )
        .expect("legacy local_memories schema is created");

    repository.migrate().expect("migration succeeds");

    let local_memory_columns = repository
        .table_columns("local_memories")
        .expect("schema query works");
    assert!(local_memory_columns
        .iter()
        .any(|column| column == "memory_category"));
    assert!(local_memory_columns
        .iter()
        .any(|column| column == "deleted_at_ms"));
}

#[test]
fn local_private_memory_cannot_be_marked_syncable() {
    let mut repository = TimelineRepository::open_in_memory().expect("in-memory db opens");
    repository.migrate().expect("migration succeeds");

    let result = repository.create_local_memory(CreateLocalMemoryInput {
        persona_id: None,
        memory_type: "work_context".to_string(),
        content: "private window context".to_string(),
        scope: "local_private".to_string(),
        confidence: 80,
        syncable: true,
    });

    assert!(result.is_err());
}

#[test]
fn sync_queue_payload_requires_sync_payload_envelope() {
    let mut repository = TimelineRepository::open_in_memory().expect("in-memory db opens");
    repository.migrate().expect("migration succeeds");

    let result = repository.enqueue_sync_payload(EnqueueSyncPayloadInput {
        event_type: "memory.summary".to_string(),
        payload_json: r#"{"content":"missing envelope"}"#.to_string(),
        idempotency_key: "idem-1".to_string(),
    });

    assert!(result.is_err());

    let row = repository
        .enqueue_sync_payload(EnqueueSyncPayloadInput {
            event_type: "memory.summary".to_string(),
            payload_json: serde_json::to_string(&SyncPayloadEnvelope {
                schema_version: 1,
                event_type: "memory.summary".to_string(),
                payload_class: "SafeSummary".to_string(),
                safety_grade: "SafeWorkSummary".to_string(),
                redaction_level: "SummaryRedacted".to_string(),
                retention_policy: "Timeline".to_string(),
                validator_version: "phase6.v1".to_string(),
                payload: serde_json::json!({"summary": "worked on planning"}),
            })
            .expect("valid json"),
            idempotency_key: "idem-2".to_string(),
        })
        .expect("valid sync envelope is queued");

    assert_eq!(row.status, "pending");
}

#[test]
fn sync_queue_rejects_unknown_event_type() {
    let mut repository = TimelineRepository::open_in_memory().expect("in-memory db opens");
    repository.migrate().expect("migration succeeds");

    let result = repository.enqueue_sync_payload(EnqueueSyncPayloadInput {
        event_type: "ocr.summary".to_string(),
        payload_json: serde_json::to_string(&SyncPayloadEnvelope {
            schema_version: 1,
            event_type: "ocr.summary".to_string(),
            payload_class: "SafeSummary".to_string(),
            safety_grade: "SafeWorkSummary".to_string(),
            redaction_level: "SummaryRedacted".to_string(),
            retention_policy: "Timeline".to_string(),
            validator_version: "phase6.v1".to_string(),
            payload: serde_json::json!({"summary": "redacted ocr summary"}),
        })
        .expect("json"),
        idempotency_key: "idem-ocr".to_string(),
    });

    assert!(result.is_err());
}

#[test]
fn sync_queue_rejects_forbidden_context_values() {
    let mut repository = TimelineRepository::open_in_memory().expect("in-memory db opens");
    repository.migrate().expect("migration succeeds");

    let result = repository.enqueue_sync_payload(EnqueueSyncPayloadInput {
        event_type: "memory.summary".to_string(),
        payload_json: serde_json::to_string(&SyncPayloadEnvelope {
            schema_version: 1,
            event_type: "memory.summary".to_string(),
            payload_class: "SafeSummary".to_string(),
            safety_grade: "SafeWorkSummary".to_string(),
            redaction_level: "SummaryRedacted".to_string(),
            retention_policy: "Timeline".to_string(),
            validator_version: "phase6.v1".to_string(),
            payload: serde_json::json!({
                "summary": "opened /Users/user/private/report.xlsx with token=abc123"
            }),
        })
        .expect("json"),
        idempotency_key: "idem-raw-value".to_string(),
    });

    assert!(result.is_err());
}

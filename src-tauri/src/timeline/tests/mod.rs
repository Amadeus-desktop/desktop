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
        .record_activity_observation(RecordActivityObservationInput {
            app_name: "Zed".to_string(),
            bundle_identifier: "dev.zed.Zed".to_string(),
            process_id: 123,
            app_category: "Work".to_string(),
            browser_url_host: None,
            browser_url_class: None,
            idle_seconds: 0.5,
            frontmost_duration_ms: 60_000,
            is_fullscreen: false,
            sensitive: false,
            capture_suppressed: false,
            trigger_action: "NoAction".to_string(),
            trigger_candidate_type: None,
            speakability_score: 0,
            source_kind: "Process".to_string(),
            metadata_json: "{}".to_string(),
        })
        .expect("activity observation is stored");
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
    let session = repository
        .get_or_create_conversation_session(GetOrCreateConversationSessionInput {
            persona_id: "makise-kurisu".to_string(),
        })
        .expect("conversation session is stored");
    repository
        .append_conversation_message(AppendConversationMessageInput {
            session_id: session.id,
            role: "user".to_string(),
            content: "오늘 유튜브로 샜어.".to_string(),
            provider: None,
            idempotency_key: "clear-message-1".to_string(),
        })
        .expect("conversation message is stored");

    let deleted = repository
        .clear_local_data()
        .expect("local data is cleared");

    assert!(deleted >= 8);
    assert!(repository
        .list_timeline_events(10)
        .expect("timeline rows are listed")
        .is_empty());
    assert!(repository
        .list_conversation_messages_for_persona(ListConversationMessagesInput {
            persona_id: "makise-kurisu".to_string(),
            limit: None,
        })
        .expect("conversation messages are listed")
        .is_empty());
}

#[test]
fn lists_activity_observations_newest_first() {
    let mut repository = TimelineRepository::open_in_memory().expect("in-memory db opens");
    repository.migrate().expect("migration succeeds");

    repository
        .record_activity_observation(RecordActivityObservationInput {
            app_name: "Zed".to_string(),
            bundle_identifier: "dev.zed.Zed".to_string(),
            process_id: 123,
            app_category: "Work".to_string(),
            browser_url_host: None,
            browser_url_class: None,
            idle_seconds: 0.5,
            frontmost_duration_ms: 60_000,
            is_fullscreen: false,
            sensitive: false,
            capture_suppressed: false,
            trigger_action: "NoAction".to_string(),
            trigger_candidate_type: None,
            speakability_score: 0,
            source_kind: "Process".to_string(),
            metadata_json: "{}".to_string(),
        })
        .expect("first activity observation is stored");
    repository
        .record_activity_observation(RecordActivityObservationInput {
            app_name: "Google Chrome".to_string(),
            bundle_identifier: "com.google.Chrome".to_string(),
            process_id: 456,
            app_category: "NonWork".to_string(),
            browser_url_host: Some("youtube.com".to_string()),
            browser_url_class: Some("Video".to_string()),
            idle_seconds: 1.0,
            frontmost_duration_ms: 120_000,
            is_fullscreen: true,
            sensitive: false,
            capture_suppressed: false,
            trigger_action: "Bubble".to_string(),
            trigger_candidate_type: Some("drift".to_string()),
            speakability_score: 74,
            source_kind: "TriggerPoll".to_string(),
            metadata_json: "{}".to_string(),
        })
        .expect("second activity observation is stored");

    let observations = repository
        .list_activity_observations(10)
        .expect("activity observations are listed");

    assert_eq!(observations.len(), 2);
    assert_eq!(observations[0].app_name, "Google Chrome");
    assert_eq!(
        observations[0].browser_url_host.as_deref(),
        Some("youtube.com")
    );
    assert_eq!(
        observations[0].trigger_candidate_type.as_deref(),
        Some("drift")
    );
    assert!(observations[0].is_fullscreen);
    assert_eq!(observations[1].app_name, "Zed");
}

#[test]
fn work_observations_update_redacted_work_session_cache() {
    let mut repository = TimelineRepository::open_in_memory().expect("in-memory db opens");
    repository.migrate().expect("migration succeeds");

    repository
        .record_activity_observation(RecordActivityObservationInput {
            app_name: "Zed".to_string(),
            bundle_identifier: "dev.zed.Zed".to_string(),
            process_id: 123,
            app_category: "Work".to_string(),
            browser_url_host: None,
            browser_url_class: None,
            idle_seconds: 0.5,
            frontmost_duration_ms: 20 * 60_000,
            is_fullscreen: false,
            sensitive: false,
            capture_suppressed: false,
            trigger_action: "NoAction".to_string(),
            trigger_candidate_type: None,
            speakability_score: 0,
            source_kind: "Process".to_string(),
            metadata_json: serde_json::json!({
                "ocrContextClass": "CodeError",
                "ocrSummaryRedacted": "redacted code error summary"
            })
            .to_string(),
        })
        .expect("work activity observation is stored");
    repository
        .record_activity_observation(RecordActivityObservationInput {
            app_name: "Google Chrome".to_string(),
            bundle_identifier: "com.google.Chrome".to_string(),
            process_id: 456,
            app_category: "Work".to_string(),
            browser_url_host: Some("github.com".to_string()),
            browser_url_class: Some("Work".to_string()),
            idle_seconds: 0.0,
            frontmost_duration_ms: 5 * 60_000,
            is_fullscreen: false,
            sensitive: false,
            capture_suppressed: false,
            trigger_action: "NoAction".to_string(),
            trigger_candidate_type: None,
            speakability_score: 0,
            source_kind: "Browser".to_string(),
            metadata_json: "{}".to_string(),
        })
        .expect("browser work activity observation is stored");
    repository
        .record_activity_observation(RecordActivityObservationInput {
            app_name: "Google Chrome".to_string(),
            bundle_identifier: "com.google.Chrome".to_string(),
            process_id: 789,
            app_category: "NonWork".to_string(),
            browser_url_host: Some("youtube.com".to_string()),
            browser_url_class: Some("Video".to_string()),
            idle_seconds: 0.0,
            frontmost_duration_ms: 10 * 60_000,
            is_fullscreen: false,
            sensitive: false,
            capture_suppressed: false,
            trigger_action: "NoAction".to_string(),
            trigger_candidate_type: None,
            speakability_score: 0,
            source_kind: "Browser".to_string(),
            metadata_json: "{}".to_string(),
        })
        .expect("non-work activity observation is stored");

    let sessions = repository
        .list_work_sessions(10)
        .expect("work sessions are listed");

    assert_eq!(sessions.len(), 1);
    assert_eq!(
        sessions[0].summary_redacted.as_deref(),
        Some("코드 작업, 프로젝트 코드 확인 중심으로 작업함")
    );
    assert_eq!(sessions[0].dominant_app_category.as_deref(), Some("Work"));
    assert_eq!(sessions[0].redaction_level, "SummaryRedacted");
    assert_eq!(sessions[0].retention_policy, "Timeline");
    assert_eq!(sessions[0].source_kind, "Process");
}

#[test]
fn migration_prepares_phase_6_local_tables() {
    let mut repository = TimelineRepository::open_in_memory().expect("in-memory db opens");
    repository.migrate().expect("migration succeeds");

    for table_name in [
        "local_personas",
        "local_memories",
        "work_sessions",
        "activity_observations",
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

    let activity_observation_columns = repository
        .table_columns("activity_observations")
        .expect("schema query works");
    for column_name in [
        "observed_at_ms",
        "app_name",
        "bundle_identifier",
        "process_id",
        "app_category",
        "browser_url_host",
        "browser_url_class",
        "idle_seconds",
        "frontmost_duration_ms",
        "sensitive",
        "capture_suppressed",
        "trigger_action",
        "trigger_candidate_type",
        "speakability_score",
        "source_kind",
        "metadata_json",
    ] {
        assert!(
            activity_observation_columns
                .iter()
                .any(|column| column == column_name),
            "activity_observations should include {column_name}"
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

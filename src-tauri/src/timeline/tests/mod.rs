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

#[test]
fn migration_prepares_phase_6_local_tables() {
    let mut repository = TimelineRepository::open_in_memory().expect("in-memory db opens");
    repository.migrate().expect("migration succeeds");

    for table_name in [
        "local_personas",
        "local_memories",
        "work_sessions",
        "sync_queue",
    ] {
        assert!(
            repository
                .table_exists(table_name)
                .expect("schema query works"),
            "{table_name} table should exist"
        );
    }
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

use super::{CreateLocalMemoryInput, EnqueueSyncPayloadInput, SyncPayloadEnvelope, TimelineError};

pub(super) fn validate_local_memory_input(
    input: &CreateLocalMemoryInput,
) -> Result<(), TimelineError> {
    if input.scope == "local_private" && input.syncable {
        return Err(TimelineError::Validation(
            "local_private memory cannot be marked syncable".to_string(),
        ));
    }
    if !matches!(input.scope.as_str(), "local_private" | "syncable_summary") {
        return Err(TimelineError::Validation(format!(
            "unsupported local memory scope '{}'",
            input.scope
        )));
    }
    if !(0..=100).contains(&input.confidence) {
        return Err(TimelineError::Validation(
            "memory confidence must be between 0 and 100".to_string(),
        ));
    }
    Ok(())
}

pub(super) fn validate_sync_payload_envelope(
    input: &EnqueueSyncPayloadInput,
) -> Result<SyncPayloadEnvelope, TimelineError> {
    let value: serde_json::Value = serde_json::from_str(&input.payload_json).map_err(|error| {
        TimelineError::Validation(format!("invalid sync payload json: {error}"))
    })?;
    reject_forbidden_sync_keys(&value)?;
    let envelope: SyncPayloadEnvelope = serde_json::from_value(value).map_err(|error| {
        TimelineError::Validation(format!(
            "sync payload must use SyncPayloadEnvelope: {error}"
        ))
    })?;

    if envelope.schema_version != 1 {
        return Err(TimelineError::Validation(
            "sync payload schema_version must be 1".to_string(),
        ));
    }
    if envelope.event_type != input.event_type {
        return Err(TimelineError::Validation(
            "sync payload event_type must match queue event_type".to_string(),
        ));
    }
    if !matches!(
        envelope.payload_class.as_str(),
        "SafeSummary" | "PersonaPull" | "PreferenceAllowlist" | "SyncAck"
    ) {
        return Err(TimelineError::Validation(format!(
            "unsupported sync payload class '{}'",
            envelope.payload_class
        )));
    }
    if !matches!(
        envelope.safety_grade.as_str(),
        "Public" | "Account" | "Persona" | "SharedMemory" | "SafeWorkSummary"
    ) {
        return Err(TimelineError::Validation(format!(
            "unsupported sync safety grade '{}'",
            envelope.safety_grade
        )));
    }
    if !matches!(
        envelope.redaction_level.as_str(),
        "None" | "TitleRedacted" | "SummaryRedacted" | "SensitiveSuppressed"
    ) {
        return Err(TimelineError::Validation(format!(
            "unsupported sync redaction level '{}'",
            envelope.redaction_level
        )));
    }
    if !matches!(
        envelope.retention_policy.as_str(),
        "Ephemeral" | "Session" | "Timeline"
    ) {
        return Err(TimelineError::Validation(format!(
            "unsupported sync retention policy '{}'",
            envelope.retention_policy
        )));
    }

    Ok(envelope)
}

fn reject_forbidden_sync_keys(value: &serde_json::Value) -> Result<(), TimelineError> {
    match value {
        serde_json::Value::Object(map) => {
            for (key, nested) in map {
                if is_forbidden_sync_key(key) {
                    return Err(TimelineError::Validation(format!(
                        "sync payload contains forbidden key '{key}'"
                    )));
                }
                reject_forbidden_sync_keys(nested)?;
            }
        }
        serde_json::Value::Array(values) => {
            for nested in values {
                reject_forbidden_sync_keys(nested)?;
            }
        }
        _ => {}
    }
    Ok(())
}

fn is_forbidden_sync_key(key: &str) -> bool {
    matches!(
        key,
        "raw_window_title"
            | "raw_ocr_text"
            | "screenshot_path"
            | "file_path"
            | "full_url"
            | "url_query"
            | "token"
            | "keystroke_text"
    )
}

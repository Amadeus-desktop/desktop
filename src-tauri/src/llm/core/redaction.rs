pub(crate) fn sanitize_prompt_field(value: &str) -> String {
    value
        .split_whitespace()
        .map(|part| {
            if should_redact_token(part) {
                "[redacted]"
            } else {
                part
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

pub(crate) fn sanitize_prompt_json(value: serde_json::Value) -> serde_json::Value {
    match value {
        serde_json::Value::Object(map) => serde_json::Value::Object(
            map.into_iter()
                .filter_map(|(key, value)| {
                    if is_forbidden_context_key(&key) {
                        None
                    } else {
                        Some((key, sanitize_prompt_json(value)))
                    }
                })
                .collect(),
        ),
        serde_json::Value::Array(values) => {
            serde_json::Value::Array(values.into_iter().map(sanitize_prompt_json).collect())
        }
        serde_json::Value::String(value) => {
            serde_json::Value::String(sanitize_prompt_field(&value))
        }
        value => value,
    }
}

fn should_redact_token(value: &str) -> bool {
    let normalized = value.to_ascii_lowercase();
    value.contains('/')
        || value.contains('\\')
        || value.contains("://")
        || normalized.contains("token=")
        || normalized.contains("password=")
        || normalized.contains("passwd=")
        || normalized.contains("api_key=")
        || normalized.contains("apikey=")
        || normalized.contains("secret=")
}

fn is_forbidden_context_key(key: &str) -> bool {
    let normalized = normalize_key(key);
    matches!(
        normalized.as_str(),
        "raw_ocr_text"
            | "screenshot"
            | "screenshot_path"
            | "raw_window_title"
            | "full_url"
            | "file_path"
            | "secret"
            | "token"
    )
}

fn normalize_key(key: &str) -> String {
    let mut normalized = String::with_capacity(key.len());
    for (index, character) in key.chars().enumerate() {
        if character.is_ascii_uppercase() {
            if index > 0 {
                normalized.push('_');
            }
            normalized.push(character.to_ascii_lowercase());
        } else {
            normalized.push(character);
        }
    }
    normalized.to_ascii_lowercase()
}

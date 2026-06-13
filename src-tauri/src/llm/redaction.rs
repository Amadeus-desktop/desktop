pub(super) fn sanitize_prompt_field(value: &str) -> String {
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

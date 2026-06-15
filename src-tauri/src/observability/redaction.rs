pub fn redact_log_value(value: &str) -> String {
    value
        .split_whitespace()
        .map(redact_log_token)
        .collect::<Vec<_>>()
        .join(" ")
}

fn redact_log_token(token: &str) -> String {
    let lower = token.to_ascii_lowercase();
    let contains_secret = lower.contains("token=")
        || lower.contains("api_key=")
        || lower.contains("apikey=")
        || lower.contains("password=")
        || lower.contains("secret=");
    let contains_path = token.starts_with('/')
        || token.starts_with("~/")
        || token.contains("://")
        || token.contains(".pdf")
        || token.contains(".docx")
        || token.contains(".xlsx")
        || token.contains(".hwp");

    match (contains_path, contains_secret) {
        (true, true) => "[redacted-path] [redacted-secret]".to_string(),
        (true, false) => "[redacted-path]".to_string(),
        (false, true) => "[redacted-secret]".to_string(),
        (false, false) => token.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redacts_token_like_values_and_paths() {
        let redacted = redact_log_value(
            "opened /Users/user/private/report.pdf?token=abc123 with api_key=secret",
        );

        assert!(!redacted.contains("/Users/user"));
        assert!(!redacted.contains("token=abc123"));
        assert!(!redacted.contains("api_key=secret"));
        assert!(redacted.contains("[redacted-path]"));
        assert!(redacted.contains("[redacted-secret]"));
    }
}

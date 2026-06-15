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

use super::OcrObservation;

#[derive(Debug, Clone)]
struct RawOcrText {
    value: String,
}

impl RawOcrText {
    fn new_for_adapter(value: impl Into<String>) -> Self {
        Self {
            value: value.into(),
        }
    }
}

pub fn redacted_observation_from_adapter_text(
    raw_text: impl Into<String>,
    confidence: f64,
) -> OcrObservation {
    build_ocr_observation(RawOcrText::new_for_adapter(raw_text), confidence)
}

fn build_ocr_observation(raw: RawOcrText, confidence: f64) -> OcrObservation {
    let sensitive_hits = sensitive_hit_count(&raw.value);
    let text_summary_redacted = if sensitive_hits > 0 {
        "[redacted-sensitive-ocr]".to_string()
    } else {
        summarize_ocr_text(&raw.value)
    };

    OcrObservation {
        text_summary_redacted,
        visible_text_classes: visible_text_classes(&raw.value),
        content_kind: content_kind(&raw.value).to_string(),
        confidence: confidence.clamp(0.0, 1.0),
        sensitive_hits,
        source_ttl_ms: 30_000,
    }
}

fn sensitive_hit_count(value: &str) -> usize {
    value
        .split_whitespace()
        .filter(|part| is_sensitive_ocr_token(part))
        .count()
}

fn is_sensitive_ocr_token(value: &str) -> bool {
    let lower = value.to_ascii_lowercase();
    value.contains('/')
        || value.contains('\\')
        || lower.contains("://")
        || lower.contains("token=")
        || lower.contains("password=")
        || lower.contains("api_key=")
        || lower.contains("secret=")
        || lower.contains(".xlsx")
        || lower.contains(".docx")
        || lower.contains(".pdf")
        || lower.contains(".hwp")
}

fn summarize_ocr_text(value: &str) -> String {
    value
        .split_whitespace()
        .take(12)
        .collect::<Vec<_>>()
        .join(" ")
}

fn visible_text_classes(value: &str) -> Vec<String> {
    let lower = value.to_ascii_lowercase();
    let mut classes = Vec::new();
    if lower.contains("http") {
        classes.push("url_like".to_string());
    }
    if lower.contains("todo") || lower.contains("planning") {
        classes.push("planning_text".to_string());
    }
    if classes.is_empty() {
        classes.push("plain_text".to_string());
    }
    classes
}

fn content_kind(value: &str) -> &'static str {
    let lower = value.to_ascii_lowercase();
    if lower.contains("planning") || lower.contains("document") {
        "document"
    } else if lower.contains("http") {
        "browser"
    } else {
        "unknown"
    }
}

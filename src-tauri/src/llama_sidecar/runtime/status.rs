#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LlamaSidecarStatus {
    pub configured: bool,
    pub running: bool,
    pub detail: String,
}

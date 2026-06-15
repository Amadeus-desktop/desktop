use tauri::State;

use serde::Serialize;

use super::{CaptureMetadata, OcrError, OcrObservation, OcrProviderStatus, OcrState};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    message: String,
}

impl From<OcrError> for CommandError {
    fn from(error: OcrError) -> Self {
        Self {
            message: error.to_string(),
        }
    }
}

#[tauri::command]
pub fn get_ocr_provider_status(state: State<'_, OcrState>) -> OcrProviderStatus {
    state.status()
}

#[tauri::command]
pub fn recognize_captured_image(
    state: State<'_, OcrState>,
    image_bytes: Vec<u8>,
    capture: CaptureMetadata,
    now_ms: u128,
) -> Result<OcrObservation, CommandError> {
    state
        .recognize_captured_image(image_bytes, capture, now_ms)
        .map_err(CommandError::from)
}

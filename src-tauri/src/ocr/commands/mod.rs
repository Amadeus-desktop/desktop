use tauri::State;

use super::{OcrProviderStatus, OcrState};

#[tauri::command]
pub fn get_ocr_provider_status(state: State<'_, OcrState>) -> OcrProviderStatus {
    state.status()
}

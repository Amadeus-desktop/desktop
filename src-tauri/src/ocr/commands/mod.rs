use tauri::State;

use serde::Serialize;

use crate::{
    macos_context::{read_current_snapshot, ContextBridgeState, MacosContextError},
    privacy::{assess_privacy, get_screen_capture_permission_status},
    settings::{privacy_keywords_for, SettingsState},
};

use super::{
    capture_gate_input_for_command, CaptureMetadata, OcrError, OcrObservation, OcrProviderStatus,
    OcrState, ScreenCaptureState,
};

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

impl From<String> for CommandError {
    fn from(message: String) -> Self {
        Self { message }
    }
}

impl From<MacosContextError> for CommandError {
    fn from(error: MacosContextError) -> Self {
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

#[tauri::command]
pub fn capture_primary_display_ocr(
    ocr_state: State<'_, OcrState>,
    capture_state: State<'_, ScreenCaptureState>,
    context_state: State<'_, ContextBridgeState>,
    settings_state: State<'_, SettingsState>,
    now_ms: u128,
) -> Result<OcrObservation, CommandError> {
    let settings = settings_state
        .current()
        .map_err(|error| CommandError::from(error.to_string()))?;
    let snapshot = read_current_snapshot(&context_state)?;
    let assessment = assess_privacy(&snapshot, &privacy_keywords_for(&settings));
    let permission = get_screen_capture_permission_status();
    let gate_input = capture_gate_input_for_command(
        if assessment.should_suppress_capture || assessment.is_sensitive {
            80
        } else {
            10
        },
        assessment.should_suppress_capture || assessment.is_sensitive,
        permission.granted,
        settings.analysis_enabled,
        &snapshot.app_name,
    );

    capture_state
        .capture_and_recognize(&ocr_state, gate_input, now_ms)
        .map_err(CommandError::from)
}

use tauri::State;

use super::{CommandError, LlamaSidecarState, LlamaSidecarStatus};

#[tauri::command]
pub fn get_llama_sidecar_status(
    state: State<'_, LlamaSidecarState>,
) -> Result<LlamaSidecarStatus, CommandError> {
    Ok(state.status())
}

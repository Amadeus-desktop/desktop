use crate::{
    llama_sidecar::LlamaSidecarState, llm::LlmState, shared::constants::MODEL_ROUTE_LOCAL_FIRST,
};
use tauri::State;

use super::{llama_endpoint, AppSettings, CommandError, SettingsState};

#[tauri::command]
pub fn get_app_settings(state: State<'_, SettingsState>) -> Result<AppSettings, CommandError> {
    state.current().map_err(CommandError::from)
}

#[tauri::command]
pub fn update_app_settings(
    state: State<'_, SettingsState>,
    llm_state: State<'_, LlmState>,
    sidecar_state: State<'_, LlamaSidecarState>,
    settings: AppSettings,
) -> Result<AppSettings, CommandError> {
    settings.validate().map_err(CommandError::from)?;
    if settings.model_route == MODEL_ROUTE_LOCAL_FIRST {
        sidecar_state
            .validate_settings(&settings)
            .map_err(|error| CommandError::from_message(error.to_string()))?;
    }
    let settings = state.update(settings).map_err(CommandError::from)?;
    let _ = sidecar_state.configure(&settings);
    if settings.model_route == MODEL_ROUTE_LOCAL_FIRST {
        if let Err(error) = sidecar_state.ensure_running() {
            let _ = sidecar_state.record_error(error);
        }
    } else {
        let _ = sidecar_state.stop();
    }
    llm_state
        .configure_local(
            llama_endpoint(&settings.llama_server_host, settings.llama_server_port),
            settings.local_model_path.clone(),
        )
        .map_err(|error| CommandError::from_message(error.to_string()))?;
    llm_state
        .set_route(&settings.model_route, settings.local_fallback_enabled)
        .map_err(|error| CommandError::from_message(error.to_string()))?;
    Ok(settings)
}

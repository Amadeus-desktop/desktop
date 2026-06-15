use tauri::State;

use super::{read_current_snapshot, CommandError, ContextBridgeState, MacosContextSnapshot};

#[tauri::command]
pub fn get_current_context_snapshot(
    state: State<'_, ContextBridgeState>,
) -> Result<MacosContextSnapshot, CommandError> {
    read_current_snapshot(&state).map_err(CommandError::from)
}

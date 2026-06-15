use std::sync::Mutex;
use tauri::State;

use super::{MacosContextError, MacosContextSnapshot};

pub trait ContextBridge: Send {
    fn current_snapshot(&mut self) -> Result<MacosContextSnapshot, MacosContextError>;
}

pub struct ContextBridgeState {
    bridge: Mutex<Box<dyn ContextBridge>>,
}

impl ContextBridgeState {
    pub fn native() -> Self {
        Self::new(native_bridge())
    }

    pub fn new(bridge: Box<dyn ContextBridge>) -> Self {
        Self {
            bridge: Mutex::new(bridge),
        }
    }
}

pub(crate) fn read_current_snapshot(
    state: &State<'_, ContextBridgeState>,
) -> Result<MacosContextSnapshot, MacosContextError> {
    with_bridge(state, |bridge| bridge.current_snapshot())
}

fn with_bridge<T>(
    state: &State<'_, ContextBridgeState>,
    operation: impl FnOnce(&mut dyn ContextBridge) -> Result<T, MacosContextError>,
) -> Result<T, MacosContextError> {
    let mut bridge = state
        .bridge
        .lock()
        .map_err(|_| MacosContextError::State("context bridge lock was poisoned".to_string()))?;

    operation(bridge.as_mut())
}

#[cfg(target_os = "macos")]
fn native_bridge() -> Box<dyn ContextBridge> {
    Box::new(super::native_macos::NativeMacosContextBridge::default())
}

#[cfg(not(target_os = "macos"))]
fn native_bridge() -> Box<dyn ContextBridge> {
    Box::new(UnsupportedContextBridge)
}

#[cfg(not(target_os = "macos"))]
struct UnsupportedContextBridge;

#[cfg(not(target_os = "macos"))]
impl ContextBridge for UnsupportedContextBridge {
    fn current_snapshot(&mut self) -> Result<MacosContextSnapshot, MacosContextError> {
        Err(MacosContextError::UnsupportedPlatform)
    }
}

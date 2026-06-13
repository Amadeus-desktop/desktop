use serde::{Deserialize, Serialize};
use std::{
    error::Error,
    fmt::{Display, Formatter},
    sync::Mutex,
    time::Instant,
};
use tauri::State;

use crate::timeline::{ContextEvent, CreateContextEventInput, TimelineState};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AppCategory {
    Work,
    NonWork,
    Unknown,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MacosContextSnapshot {
    pub app_name: String,
    pub bundle_identifier: String,
    pub process_id: i32,
    pub window_title: String,
    pub idle_seconds: f64,
    pub category: AppCategory,
    pub frontmost_duration_ms: u128,
}

#[derive(Debug)]
pub enum MacosContextError {
    #[cfg(not(target_os = "macos"))]
    UnsupportedPlatform,
    Native(String),
    Timeline(String),
    State(String),
}

impl Display for MacosContextError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            #[cfg(not(target_os = "macos"))]
            Self::UnsupportedPlatform => write!(formatter, "macOS context bridge is unsupported"),
            Self::Native(message) => write!(formatter, "native context error: {message}"),
            Self::Timeline(message) => write!(formatter, "timeline error: {message}"),
            Self::State(message) => write!(formatter, "state error: {message}"),
        }
    }
}

impl Error for MacosContextError {}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    message: String,
}

impl From<MacosContextError> for CommandError {
    fn from(error: MacosContextError) -> Self {
        Self {
            message: error.to_string(),
        }
    }
}

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

#[tauri::command]
pub fn get_current_context_snapshot(
    state: State<'_, ContextBridgeState>,
) -> Result<MacosContextSnapshot, CommandError> {
    read_current_snapshot(&state).map_err(CommandError::from)
}

#[tauri::command]
pub fn capture_current_context_event(
    context_state: State<'_, ContextBridgeState>,
    timeline_state: State<'_, TimelineState>,
) -> Result<ContextEvent, CommandError> {
    let snapshot = read_current_snapshot(&context_state)?;
    let metadata_json = serde_json::json!({
        "bundleIdentifier": snapshot.bundle_identifier,
        "processId": snapshot.process_id,
        "idleSeconds": snapshot.idle_seconds,
        "category": snapshot.category,
        "frontmostDurationMs": snapshot.frontmost_duration_ms,
    })
    .to_string();

    let mut repository = timeline_state.repository().lock().map_err(|_| {
        CommandError::from(MacosContextError::State(
            "timeline repository lock was poisoned".to_string(),
        ))
    })?;

    repository
        .create_context_event(CreateContextEventInput {
            app_name: snapshot.app_name,
            window_title: snapshot.window_title,
            event_type: "macos_context_snapshot".to_string(),
            metadata_json,
        })
        .map_err(|error| CommandError::from(MacosContextError::Timeline(error.to_string())))
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

pub fn classify_app(bundle_identifier: &str, display_name: &str) -> AppCategory {
    let bundle_identifier = bundle_identifier.to_ascii_lowercase();
    let display_name = display_name.to_ascii_lowercase();
    let haystack = format!("{bundle_identifier} {display_name}");

    if contains_any(
        &haystack,
        &[
            "visual studio code",
            "vscode",
            "xcode",
            "cursor",
            "intellij",
            "zed",
            "terminal",
            "iterm",
            "com.apple.dt.xcode",
            "com.microsoft.vscode",
            "com.todesktop.230313mzl4w4u92",
            "hwp",
            "한글",
            "pages",
            "notion",
        ],
    ) {
        return AppCategory::Work;
    }

    if contains_any(
        &haystack,
        &[
            "youtube",
            "netflix",
            "twitch",
            "disney",
            "spotify",
            "instagram",
            "x.com",
            "twitter",
            "com.google.chrome",
        ],
    ) {
        return AppCategory::NonWork;
    }

    AppCategory::Unknown
}

fn contains_any(haystack: &str, needles: &[&str]) -> bool {
    needles.iter().any(|needle| haystack.contains(needle))
}

#[cfg(target_os = "macos")]
fn native_bridge() -> Box<dyn ContextBridge> {
    Box::new(native_macos::NativeMacosContextBridge::default())
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

#[cfg(target_os = "macos")]
mod native_macos {
    use super::*;
    use core_foundation::{
        base::{CFType, TCFType},
        dictionary::{CFDictionary, CFDictionaryRef},
        number::CFNumber,
        string::CFString,
    };
    use core_graphics::window::{
        copy_window_info, kCGNullWindowID, kCGWindowLayer, kCGWindowListExcludeDesktopElements,
        kCGWindowListOptionOnScreenOnly, kCGWindowName, kCGWindowOwnerPID,
    };
    use objc2_app_kit::NSWorkspace;

    const K_CG_ANY_INPUT_EVENT_TYPE: u32 = u32::MAX;
    const K_CG_EVENT_SOURCE_COMBINED_SESSION_STATE: i32 = 0;

    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        fn CGEventSourceSecondsSinceLastEventType(state_id: i32, event_type: u32) -> f64;
    }

    pub struct NativeMacosContextBridge {
        last_frontmost_key: Option<String>,
        last_frontmost_since: Instant,
    }

    impl Default for NativeMacosContextBridge {
        fn default() -> Self {
            Self {
                last_frontmost_key: None,
                last_frontmost_since: Instant::now(),
            }
        }
    }

    impl ContextBridge for NativeMacosContextBridge {
        fn current_snapshot(&mut self) -> Result<MacosContextSnapshot, MacosContextError> {
            let app = read_frontmost_app()?;
            let frontmost_key = format!("{}:{}", app.bundle_identifier, app.process_id);
            if self.last_frontmost_key.as_ref() != Some(&frontmost_key) {
                self.last_frontmost_key = Some(frontmost_key);
                self.last_frontmost_since = Instant::now();
            }

            let window_title = read_window_title(app.process_id)
                .filter(|title| !title.trim().is_empty())
                .unwrap_or_else(|| "Unknown Window".to_string());
            let category = classify_app(
                &app.bundle_identifier,
                &format!("{} {window_title}", app.app_name),
            );

            Ok(MacosContextSnapshot {
                app_name: app.app_name,
                bundle_identifier: app.bundle_identifier,
                process_id: app.process_id,
                window_title,
                idle_seconds: read_idle_seconds(),
                category,
                frontmost_duration_ms: self.last_frontmost_since.elapsed().as_millis(),
            })
        }
    }

    struct FrontmostApp {
        app_name: String,
        bundle_identifier: String,
        process_id: i32,
    }

    fn read_frontmost_app() -> Result<FrontmostApp, MacosContextError> {
        let workspace = NSWorkspace::sharedWorkspace();
        let application = workspace.frontmostApplication().ok_or_else(|| {
            MacosContextError::Native("frontmost application unavailable".to_string())
        })?;

        let app_name = application
            .localizedName()
            .map(|name| name.to_string())
            .unwrap_or_else(|| "Unknown App".to_string());
        let bundle_identifier = application
            .bundleIdentifier()
            .map(|identifier| identifier.to_string())
            .unwrap_or_default();
        let process_id = application.processIdentifier();

        Ok(FrontmostApp {
            app_name,
            bundle_identifier,
            process_id,
        })
    }

    fn read_window_title(process_id: i32) -> Option<String> {
        let window_info = copy_window_info(
            kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements,
            kCGNullWindowID,
        )?;
        let owner_pid_key = unsafe { CFString::wrap_under_get_rule(kCGWindowOwnerPID) };
        let layer_key = unsafe { CFString::wrap_under_get_rule(kCGWindowLayer) };
        let name_key = unsafe { CFString::wrap_under_get_rule(kCGWindowName) };

        for value in window_info.get_all_values() {
            let dictionary: CFDictionary<CFString, CFType> =
                unsafe { TCFType::wrap_under_get_rule(value as CFDictionaryRef) };
            let owner_pid = read_i32(&dictionary, &owner_pid_key)?;
            let layer = read_i32(&dictionary, &layer_key).unwrap_or_default();
            if owner_pid != process_id || layer != 0 {
                continue;
            }

            if let Some(title) = read_string(&dictionary, &name_key) {
                return Some(title);
            }
        }

        None
    }

    fn read_idle_seconds() -> f64 {
        unsafe {
            CGEventSourceSecondsSinceLastEventType(
                K_CG_EVENT_SOURCE_COMBINED_SESSION_STATE,
                K_CG_ANY_INPUT_EVENT_TYPE,
            )
        }
    }

    fn read_i32(dictionary: &CFDictionary<CFString, CFType>, key: &CFString) -> Option<i32> {
        dictionary
            .find(key)
            .and_then(|value| value.downcast::<CFNumber>())
            .and_then(|number| number.to_i32())
    }

    fn read_string(dictionary: &CFDictionary<CFString, CFType>, key: &CFString) -> Option<String> {
        dictionary
            .find(key)
            .and_then(|value| value.downcast::<CFString>())
            .map(|value| value.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_known_work_apps() {
        assert_eq!(
            classify_app("com.microsoft.VSCode", "Visual Studio Code"),
            AppCategory::Work
        );
        assert_eq!(
            classify_app("com.apple.dt.Xcode", "Xcode"),
            AppCategory::Work
        );
        assert_eq!(classify_app("", "한글"), AppCategory::Work);
    }

    #[test]
    fn classifies_known_non_work_apps() {
        assert_eq!(
            classify_app("com.google.Chrome", "YouTube - Google Chrome"),
            AppCategory::NonWork
        );
        assert_eq!(classify_app("", "Netflix"), AppCategory::NonWork);
    }

    #[test]
    fn classifies_unknown_apps() {
        assert_eq!(
            classify_app("dev.unknown.App", "Unknown"),
            AppCategory::Unknown
        );
    }
}

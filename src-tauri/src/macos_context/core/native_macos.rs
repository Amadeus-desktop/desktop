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
use std::time::Instant;

use super::{classify_app, ContextBridge, MacosContextError, MacosContextSnapshot};

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

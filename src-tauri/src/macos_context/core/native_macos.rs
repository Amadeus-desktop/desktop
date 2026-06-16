use core_foundation::{
    base::{CFType, TCFType},
    dictionary::{CFDictionary, CFDictionaryRef},
    number::CFNumber,
    string::CFString,
};
use core_graphics::{
    display::CGDisplay,
    geometry::CGRect,
    window::{
        copy_window_info, kCGNullWindowID, kCGWindowBounds, kCGWindowLayer,
        kCGWindowListExcludeDesktopElements, kCGWindowListOptionOnScreenOnly, kCGWindowName,
        kCGWindowOwnerPID,
    },
};
use objc2_app_kit::NSWorkspace;
use std::time::Instant;

use super::{
    browser::read_browser_tab_context, classify_app, BrowserUrlClass, ContextBridge,
    MacosContextError, MacosContextSnapshot,
};

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

        let window = read_frontmost_window(app.process_id);
        let window_title = window
            .as_ref()
            .and_then(|window| window.title.clone())
            .filter(|title| !title.trim().is_empty())
            .unwrap_or_else(|| "Unknown Window".to_string());
        let is_fullscreen = window
            .and_then(|window| window.bounds)
            .is_some_and(is_fullscreen_window);
        let browser_context = read_browser_tab_context(&app.app_name, &app.bundle_identifier);
        let mut category = classify_app(
            &app.bundle_identifier,
            &format!("{} {window_title}", app.app_name),
        );
        if let Some(context) = browser_context.as_ref() {
            category = match context.url_class {
                BrowserUrlClass::Work => super::AppCategory::Work,
                BrowserUrlClass::Video => super::AppCategory::NonWork,
                BrowserUrlClass::Unknown => category,
            };
        }

        Ok(MacosContextSnapshot {
            browser_context,
            app_name: app.app_name,
            bundle_identifier: app.bundle_identifier,
            process_id: app.process_id,
            window_title,
            idle_seconds: read_idle_seconds(),
            category,
            frontmost_duration_ms: self.last_frontmost_since.elapsed().as_millis(),
            is_fullscreen,
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

struct FrontmostWindow {
    title: Option<String>,
    bounds: Option<CGRect>,
}

fn read_frontmost_window(process_id: i32) -> Option<FrontmostWindow> {
    let window_info = copy_window_info(
        kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements,
        kCGNullWindowID,
    )?;
    let owner_pid_key = unsafe { CFString::wrap_under_get_rule(kCGWindowOwnerPID) };
    let layer_key = unsafe { CFString::wrap_under_get_rule(kCGWindowLayer) };
    let name_key = unsafe { CFString::wrap_under_get_rule(kCGWindowName) };
    let bounds_key = unsafe { CFString::wrap_under_get_rule(kCGWindowBounds) };

    for value in window_info.get_all_values() {
        let dictionary: CFDictionary<CFString, CFType> =
            unsafe { TCFType::wrap_under_get_rule(value as CFDictionaryRef) };
        let owner_pid = read_i32(&dictionary, &owner_pid_key)?;
        let layer = read_i32(&dictionary, &layer_key).unwrap_or_default();
        if owner_pid != process_id || layer != 0 {
            continue;
        }

        return Some(FrontmostWindow {
            title: read_string(&dictionary, &name_key),
            bounds: read_window_bounds(&dictionary, &bounds_key),
        });
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

fn read_window_bounds(
    dictionary: &CFDictionary<CFString, CFType>,
    key: &CFString,
) -> Option<CGRect> {
    dictionary.find(key).and_then(|value| {
        let bounds: CFDictionary<CFString, CFType> =
            unsafe { TCFType::wrap_under_get_rule(value.as_CFTypeRef() as CFDictionaryRef) };
        let x_key = CFString::new("X");
        let y_key = CFString::new("Y");
        let width_key = CFString::new("Width");
        let height_key = CFString::new("Height");
        Some(CGRect::new(
            &core_graphics::geometry::CGPoint::new(
                read_f64(&bounds, &x_key)?,
                read_f64(&bounds, &y_key)?,
            ),
            &core_graphics::geometry::CGSize::new(
                read_f64(&bounds, &width_key)?,
                read_f64(&bounds, &height_key)?,
            ),
        ))
    })
}

fn read_f64(dictionary: &CFDictionary<CFString, CFType>, key: &CFString) -> Option<f64> {
    dictionary
        .find(key)
        .and_then(|value| value.downcast::<CFNumber>())
        .and_then(|number| number.to_f64())
}

fn is_fullscreen_window(window_bounds: CGRect) -> bool {
    let display_bounds = CGDisplay::main().bounds();
    fullscreen_coverage_ratio(window_bounds, display_bounds) >= 0.95
}

fn fullscreen_coverage_ratio(window_bounds: CGRect, display_bounds: CGRect) -> f64 {
    let overlap_width = overlap_length(
        window_bounds.origin.x,
        window_bounds.size.width,
        display_bounds.origin.x,
        display_bounds.size.width,
    );
    let overlap_height = overlap_length(
        window_bounds.origin.y,
        window_bounds.size.height,
        display_bounds.origin.y,
        display_bounds.size.height,
    );
    let display_area = display_bounds.size.width * display_bounds.size.height;
    if display_area <= 0.0 {
        return 0.0;
    }
    (overlap_width * overlap_height / display_area).clamp(0.0, 1.0)
}

fn overlap_length(first_start: f64, first_size: f64, second_start: f64, second_size: f64) -> f64 {
    let start = first_start.max(second_start);
    let end = (first_start + first_size).min(second_start + second_size);
    (end - start).max(0.0)
}

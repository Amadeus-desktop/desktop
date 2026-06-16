#[cfg(target_os = "macos")]
use std::sync::atomic::{AtomicBool, Ordering};

use crate::observability::{error as log_error, info as log_info, warn as log_warn, LogArea};
use tauri::{AppHandle, Emitter, LogicalSize, Manager, WebviewWindow};

pub const COMPANION_SPACE_CHANGED_EVENT: &str = "companion-space-changed";
pub const MAIN_WINDOW_ANIMATION_COMPLETE_EVENT: &str = "main-window-animation-complete";

#[cfg(target_os = "macos")]
#[derive(Default)]
pub struct CompanionWindowVisibility {
    user_hidden: AtomicBool,
}

#[cfg(target_os = "macos")]
impl CompanionWindowVisibility {
    pub fn set_user_hidden(&self, hidden: bool) {
        self.user_hidden.store(hidden, Ordering::SeqCst);
    }

    pub fn should_restore(&self) -> bool {
        !self.user_hidden.load(Ordering::SeqCst)
    }
}

#[cfg(not(target_os = "macos"))]
#[derive(Default)]
pub struct CompanionWindowVisibility;

#[cfg(not(target_os = "macos"))]
impl CompanionWindowVisibility {
    pub fn set_user_hidden(&self, _hidden: bool) {}
    pub fn should_restore(&self) -> bool {
        true
    }
}

pub fn position_companion_window(window: &WebviewWindow) {
    use tauri::PhysicalPosition;

    const MARGIN: i32 = 12;

    let Ok(Some(monitor)) = window.current_monitor() else {
        log_warn(
            LogArea::Window,
            "position_companion_window: current_monitor() unavailable",
        );
        return;
    };

    let work_area = monitor.work_area();
    let window_size = window.outer_size().unwrap_or(work_area.size);

    let x = work_area.position.x + work_area.size.width as i32 - window_size.width as i32 - MARGIN;
    let y =
        work_area.position.y + work_area.size.height as i32 - window_size.height as i32 - MARGIN;

    if let Err(error) = window.set_position(PhysicalPosition::new(x, y)) {
        log_error(
            LogArea::Window,
            format!("position_companion_window: set_position failed: {error}"),
        );
    }
}

#[cfg(target_os = "macos")]
fn configure_macos_window_transparency(ns_window: &objc2_app_kit::NSWindow) {
    use objc2_app_kit::NSColor;

    ns_window.setOpaque(false);
    ns_window.setBackgroundColor(Some(&NSColor::clearColor()));
}

/// WKWebView on transparent windows can keep stale GPU tiles until the view is invalidated.
/// DevTools toggle / a 1px resize fix the same compositor state — do that proactively.
#[cfg(target_os = "macos")]
pub fn refresh_macos_webview_layers(window: &WebviewWindow) {
    log_info(
        LogArea::Window,
        format!(
            "macos webview layer refresh started: label={}",
            window.label()
        ),
    );
    if let Ok(ptr) = window.ns_view() {
        unsafe {
            use objc2_app_kit::NSView;

            let view: &NSView = &*(ptr as *const NSView);
            view.setNeedsDisplay(true);
            view.displayIfNeeded();
        }
    }

    if let Ok(ptr) = window.ns_window() {
        unsafe {
            use objc2_app_kit::NSWindow;

            let ns_window: &NSWindow = &*(ptr as *const NSWindow);
            ns_window.displayIfNeeded();
        }
    }
    log_info(
        LogArea::Window,
        format!(
            "macos webview layer refresh completed: label={}",
            window.label()
        ),
    );
}

#[cfg(not(target_os = "macos"))]
pub fn refresh_macos_webview_layers(_window: &WebviewWindow) {}

#[cfg(target_os = "macos")]
pub fn schedule_macos_webview_layer_refresh(app: AppHandle, label: &'static str) {
    log_info(
        LogArea::Window,
        format!("macos webview layer refresh scheduled: label={label} delay_ms=500"),
    );
    let app_handle = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(500));
        let app_for_main = app_handle.clone();
        let _ = app_handle.run_on_main_thread(move || {
            if let Some(window) = app_for_main.get_webview_window(label) {
                refresh_macos_webview_layers(&window);
            }
        });
    });
}

#[cfg(not(target_os = "macos"))]
pub fn schedule_macos_webview_layer_refresh(_app: AppHandle, _label: &'static str) {}

#[cfg(target_os = "macos")]
pub fn configure_macos_main_window(window: &WebviewWindow) {
    let Ok(ptr) = window.ns_window() else {
        log_warn(
            LogArea::Window,
            "configure_macos_main_window: ns_window() unavailable",
        );
        return;
    };

    unsafe {
        use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior};

        let ns_window: &NSWindow = &*(ptr as *const NSWindow);
        ns_window.setCollectionBehavior(NSWindowCollectionBehavior::Managed);
        configure_macos_window_transparency(ns_window);
        refresh_macos_webview_layers(window);
    }
}

pub fn start_main_window_drag(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "start_main_window_drag: main window missing".to_string())?;
    window
        .start_dragging()
        .map_err(|error| format!("start_main_window_drag: {error}"))?;
    Ok(())
}

pub fn set_main_window_logical_size(
    app: &AppHandle,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "set_main_window_logical_size: main window missing".to_string())?;

    window
        .set_size(LogicalSize::new(width, height))
        .map_err(|error| format!("set_main_window_logical_size: set_size failed: {error}"))?;
    center_main_window_with_logical_size(&window, width, height)?;
    #[cfg(target_os = "macos")]
    refresh_macos_webview_layers(&window);
    Ok(())
}

/// Center the window using the *known* target logical size instead of querying
/// `outer_size()`. On macOS `set_size` is async, so reading `outer_size()`
/// immediately afterwards can return the previous size and center the window
/// against the wrong dimensions (window drifts off-center).
fn center_main_window_with_logical_size(
    window: &WebviewWindow,
    width: f64,
    height: f64,
) -> Result<(), String> {
    use tauri::PhysicalPosition;

    let monitor = window
        .current_monitor()
        .map_err(|error| format!("center_main_window: monitor lookup failed: {error}"))?
        .ok_or_else(|| "center_main_window: current_monitor() unavailable".to_string())?;

    let scale = window
        .scale_factor()
        .map_err(|error| format!("center_main_window: scale_factor failed: {error}"))?;

    let work_area = monitor.work_area();
    let phys_w = (width * scale).round() as i32;
    let phys_h = (height * scale).round() as i32;

    let x = work_area.position.x + (work_area.size.width as i32 - phys_w) / 2;
    let y = work_area.position.y + (work_area.size.height as i32 - phys_h) / 2;

    window
        .set_position(PhysicalPosition::new(x, y))
        .map_err(|error| format!("center_main_window: set_position failed: {error}"))
}

#[cfg(target_os = "macos")]
fn monitor_centered_main_window_frame(
    ns_window: &objc2_app_kit::NSWindow,
    width: f64,
    height: f64,
) -> Result<objc2_foundation::NSRect, String> {
    use objc2_app_kit::NSScreen;
    use objc2_foundation::{MainThreadMarker, NSPoint, NSRect, NSSize};

    let mtm = MainThreadMarker::new()
        .ok_or_else(|| "monitor_centered_main_window_frame: not on main thread".to_string())?;

    let visible = ns_window
        .screen()
        .or_else(|| NSScreen::mainScreen(mtm))
        .map(|screen| screen.visibleFrame())
        .ok_or_else(|| "monitor_centered_main_window_frame: screen unavailable".to_string())?;

    let content_rect = NSRect::new(NSPoint::new(0.0, 0.0), NSSize::new(width, height));
    let outer = ns_window.frameRectForContentRect(content_rect);
    let frame_x = visible.origin.x + (visible.size.width - outer.size.width) / 2.0;
    let frame_y = visible.origin.y + (visible.size.height - outer.size.height) / 2.0;

    Ok(NSRect::new(NSPoint::new(frame_x, frame_y), outer.size))
}

#[cfg(target_os = "macos")]
pub fn animate_main_window_logical_size(
    app: &AppHandle,
    width: f64,
    height: f64,
    duration_ms: u64,
) -> Result<(), String> {
    use block2::RcBlock;
    use core::ptr::NonNull;
    use objc2_app_kit::{NSAnimatablePropertyContainer, NSAnimationContext, NSWindow};

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "animate_main_window_logical_size: main window missing".to_string())?;

    let ptr = window
        .ns_window()
        .map_err(|error| format!("animate_main_window_logical_size: ns_window failed: {error}"))?;

    let duration_secs = (duration_ms as f64 / 1000.0).clamp(0.25, 2.0);
    let ns_window_ptr = ptr as *const NSWindow;
    let window_for_completion = window.clone();

    unsafe {
        let target_frame = monitor_centered_main_window_frame(&*ns_window_ptr, width, height)?;

        let changes = RcBlock::new(move |context: NonNull<NSAnimationContext>| {
            let context = context.as_ref();
            context.setDuration(duration_secs);
            let animated_window = (&*ns_window_ptr).animator();
            animated_window.setFrame_display(target_frame, true);
        });

        let completion = RcBlock::new(move || {
            // The native animation already left the window at the exact
            // monitor-centered target frame. We deliberately do NOT re-apply
            // size/position here: mixing AppKit (visibleFrame) and Tauri
            // (work_area) coordinate systems caused an end-of-animation jump.
            // tao observes the resize notification and syncs Tauri's size state.
            refresh_macos_webview_layers(&window_for_completion);
            if let Err(error) =
                window_for_completion.emit(MAIN_WINDOW_ANIMATION_COMPLETE_EVENT, ())
            {
                log_warn(
                    LogArea::Window,
                    format!(
                        "animate_main_window_logical_size: completion emit failed: {error}"
                    ),
                );
            }
            log_info(
                LogArea::Window,
                format!(
                    "main window native animation completed: width={width} height={height} duration_ms={duration_ms}"
                ),
            );
        });

        NSAnimationContext::runAnimationGroup_completionHandler(&changes, Some(&completion));
    }

    log_info(
        LogArea::Window,
        format!(
            "main window native animation started: width={width} height={height} duration_ms={duration_ms} policy=monitor-centered"
        ),
    );
    Ok(())
}

#[cfg(not(target_os = "macos"))]
pub fn animate_main_window_logical_size(
    app: &AppHandle,
    width: f64,
    height: f64,
    _duration_ms: u64,
) -> Result<(), String> {
    set_main_window_logical_size(app, width, height)?;
    // Keep the frontend contract identical across platforms: signal completion
    // so the coordinator's await resolves without relying on its timeout.
    let _ = app.emit(MAIN_WINDOW_ANIMATION_COMPLETE_EVENT, ());
    Ok(())
}

/// Configure the companion overlay as a floating HUD that follows the active Space.
///
/// - `MoveToActiveSpace` — moves with the user instead of cloning onto every desktop
/// - `Transient` — hides from Mission Control thumbnails
/// - `FullScreenAuxiliary` — stays usable over full-screen apps
/// - `IgnoresCycle` — keeps the overlay out of Cmd+` window cycling
///
/// We intentionally do NOT set `CanJoinAllSpaces` (Mission Control clutter) or
/// `Stationary` (broken Mission Control rendering).
#[cfg(target_os = "macos")]
pub fn configure_macos_companion_window(window: &WebviewWindow) {
    let Ok(ptr) = window.ns_window() else {
        log_warn(
            LogArea::Window,
            "configure_macos_companion_window: ns_window() unavailable",
        );
        return;
    };

    unsafe {
        use objc2_app_kit::{NSFloatingWindowLevel, NSWindow, NSWindowCollectionBehavior};

        let ns_window: &NSWindow = &*(ptr as *const NSWindow);
        let behavior = NSWindowCollectionBehavior::MoveToActiveSpace
            | NSWindowCollectionBehavior::Transient
            | NSWindowCollectionBehavior::FullScreenAuxiliary
            | NSWindowCollectionBehavior::IgnoresCycle;
        ns_window.setCollectionBehavior(behavior);
        ns_window.setLevel(NSFloatingWindowLevel);
        configure_macos_window_transparency(ns_window);
    }
}

#[cfg(target_os = "macos")]
fn order_companion_window_front(window: &WebviewWindow) {
    let Ok(ptr) = window.ns_window() else {
        return;
    };

    unsafe {
        use objc2_app_kit::NSWindow;

        let ns_window: &NSWindow = &*(ptr as *const NSWindow);
        ns_window.orderFrontRegardless();
    }
}

pub fn restore_companion_window_on_active_space(app: &AppHandle) {
    let visibility = app.state::<CompanionWindowVisibility>();
    if !visibility.should_restore() {
        return;
    }

    let Some(window) = app.get_webview_window("companion") else {
        return;
    };

    if let Err(error) = window.show() {
        log_error(
            LogArea::Window,
            format!("restore_companion_window_on_active_space: show failed: {error}"),
        );
    }

    #[cfg(target_os = "macos")]
    order_companion_window_front(&window);

    position_companion_window(&window);

    if let Err(error) = app.emit(COMPANION_SPACE_CHANGED_EVENT, ()) {
        log_warn(
            LogArea::Window,
            format!("restore_companion_window_on_active_space: emit failed: {error}"),
        );
    }
}

pub fn sync_companion_window_position_only(app: &AppHandle) {
    let Some(window) = app.get_webview_window("companion") else {
        return;
    };

    position_companion_window(&window);
}

#[cfg(target_os = "macos")]
pub fn watch_macos_companion_space_changes(app: &AppHandle) {
    use core::ptr::NonNull;
    use objc2::rc::Retained;
    use objc2::runtime::ProtocolObject;
    use objc2_app_kit::NSWorkspaceActiveSpaceDidChangeNotification;
    use objc2_foundation::{NSNotification, NSNotificationCenter, NSObjectProtocol};

    let app_handle = app.clone();
    let block = block2::RcBlock::new(move |_notification: NonNull<NSNotification>| {
        let restore_handle = app_handle.clone();
        let _ = app_handle.run_on_main_thread(move || {
            restore_companion_window_on_active_space(&restore_handle);
        });
    });

    unsafe {
        let center = NSNotificationCenter::defaultCenter();
        let observer: Retained<ProtocolObject<dyn NSObjectProtocol>> = center
            .addObserverForName_object_queue_usingBlock(
                Some(NSWorkspaceActiveSpaceDidChangeNotification),
                None,
                None,
                &block,
            );
        std::mem::forget(observer);
    }
}

#[cfg(not(target_os = "macos"))]
pub fn watch_macos_companion_space_changes(_app: &AppHandle) {}

#[cfg(test)]
mod tests {
    use super::CompanionWindowVisibility;

    #[test]
    fn companion_visibility_tracks_user_hide_preference() {
        let visibility = CompanionWindowVisibility::default();
        assert!(visibility.should_restore());

        visibility.set_user_hidden(true);
        assert!(!visibility.should_restore());

        visibility.set_user_hidden(false);
        assert!(visibility.should_restore());
    }
}

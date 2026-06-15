#[cfg(target_os = "macos")]
use std::sync::atomic::{AtomicBool, Ordering};

use crate::observability::{error as log_error, warn as log_warn, LogArea};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

pub const COMPANION_SPACE_CHANGED_EVENT: &str = "companion-space-changed";

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
    }
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

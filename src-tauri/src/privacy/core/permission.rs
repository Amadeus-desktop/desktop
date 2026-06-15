use super::ScreenCapturePermissionStatus;

#[tauri::command]
pub fn get_screen_capture_permission_status() -> ScreenCapturePermissionStatus {
    screen_capture_permission_status()
}

#[tauri::command]
pub fn request_screen_capture_permission() -> ScreenCapturePermissionStatus {
    #[cfg(target_os = "macos")]
    {
        #[link(name = "CoreGraphics", kind = "framework")]
        extern "C" {
            fn CGRequestScreenCaptureAccess() -> bool;
        }

        unsafe {
            CGRequestScreenCaptureAccess();
        }
    }

    screen_capture_permission_status()
}

#[cfg(target_os = "macos")]
fn screen_capture_permission_status() -> ScreenCapturePermissionStatus {
    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        fn CGPreflightScreenCaptureAccess() -> bool;
    }

    ScreenCapturePermissionStatus {
        platform: "macos".to_string(),
        granted: unsafe { CGPreflightScreenCaptureAccess() },
        can_request: true,
    }
}

#[cfg(not(target_os = "macos"))]
fn screen_capture_permission_status() -> ScreenCapturePermissionStatus {
    ScreenCapturePermissionStatus {
        platform: "unsupported".to_string(),
        granted: false,
        can_request: false,
    }
}

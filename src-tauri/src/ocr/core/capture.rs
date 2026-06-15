use super::{
    pre_capture_gate, CaptureGateInput, CaptureMetadata, OcrError, OcrObservation, OcrState,
};

pub const SCREEN_CAPTURE_TTL_MS: u128 = 5_000;

pub struct CapturedImage {
    pub image_bytes: Vec<u8>,
    pub metadata: CaptureMetadata,
}

pub trait ScreenCaptureAdapter: Send + Sync {
    fn capture_primary_display(&self, now_ms: u128) -> Result<CapturedImage, OcrError>;
}

pub fn capture_gate_input_for_command(
    privacy_risk_score: i64,
    sensitive_context: bool,
    screen_capture_permission_granted: bool,
    user_screen_context_enabled: bool,
    app_name: &str,
) -> CaptureGateInput {
    CaptureGateInput {
        privacy_risk_score,
        sensitive_context,
        screen_capture_permission_granted,
        user_screen_context_enabled,
        known_meeting_app_frontmost: is_known_meeting_app(app_name),
    }
}

pub struct ScreenCaptureState {
    adapter: Box<dyn ScreenCaptureAdapter>,
}

impl ScreenCaptureState {
    pub fn platform_default() -> Self {
        Self::new(platform_screen_capture_adapter())
    }

    pub fn new(adapter: Box<dyn ScreenCaptureAdapter>) -> Self {
        Self { adapter }
    }

    pub fn capture_and_recognize(
        &self,
        ocr: &OcrState,
        gate_input: CaptureGateInput,
        now_ms: u128,
    ) -> Result<OcrObservation, OcrError> {
        let gate = pre_capture_gate(gate_input);
        if !gate.allowed {
            return Err(OcrError::Denied(gate.reason.to_string()));
        }

        let capture = self.adapter.capture_primary_display(now_ms)?;
        ocr.recognize_captured_image(capture.image_bytes, capture.metadata, now_ms)
    }
}

fn is_known_meeting_app(app_name: &str) -> bool {
    let app_name = app_name.to_ascii_lowercase();
    ["zoom", "microsoft teams", "google meet", "webex"]
        .iter()
        .any(|meeting_app| app_name.contains(meeting_app))
}

#[cfg(target_os = "macos")]
fn platform_screen_capture_adapter() -> Box<dyn ScreenCaptureAdapter> {
    Box::new(MacosScreenCaptureAdapter)
}

#[cfg(not(target_os = "macos"))]
fn platform_screen_capture_adapter() -> Box<dyn ScreenCaptureAdapter> {
    Box::new(DisabledScreenCaptureAdapter)
}

#[cfg(not(target_os = "macos"))]
struct DisabledScreenCaptureAdapter;

#[cfg(not(target_os = "macos"))]
impl ScreenCaptureAdapter for DisabledScreenCaptureAdapter {
    fn capture_primary_display(&self, _now_ms: u128) -> Result<CapturedImage, OcrError> {
        Err(OcrError::Unsupported(
            "screen capture OCR is available only on macOS".to_string(),
        ))
    }
}

#[cfg(target_os = "macos")]
struct MacosScreenCaptureAdapter;

#[cfg(target_os = "macos")]
impl ScreenCaptureAdapter for MacosScreenCaptureAdapter {
    fn capture_primary_display(&self, now_ms: u128) -> Result<CapturedImage, OcrError> {
        let image = core_graphics::display::CGDisplay::main()
            .image()
            .ok_or_else(|| OcrError::Adapter("primary display capture unavailable".to_string()))?;
        let image_bytes = encode_cg_image_as_png(&image)?;

        Ok(CapturedImage {
            image_bytes,
            metadata: CaptureMetadata {
                approved: true,
                captured_at_ms: now_ms,
                ttl_ms: SCREEN_CAPTURE_TTL_MS,
                sensitive_marker: false,
            },
        })
    }
}

#[cfg(target_os = "macos")]
fn encode_cg_image_as_png(image: &core_graphics::image::CGImage) -> Result<Vec<u8>, OcrError> {
    use core_foundation::{
        base::{kCFAllocatorDefault, CFRelease, TCFType},
        string::CFString,
    };
    use foreign_types::ForeignType;
    use std::{ffi::c_void, ptr};

    type CFMutableDataRef = *mut c_void;
    type CFStringRef = *const c_void;
    type CGImageDestinationRef = *mut c_void;

    #[link(name = "CoreFoundation", kind = "framework")]
    extern "C" {
        fn CFDataCreateMutable(allocator: *const c_void, capacity: isize) -> CFMutableDataRef;
        fn CFDataGetLength(data: CFMutableDataRef) -> isize;
        fn CFDataGetBytePtr(data: CFMutableDataRef) -> *const u8;
    }

    #[link(name = "ImageIO", kind = "framework")]
    extern "C" {
        fn CGImageDestinationCreateWithData(
            data: CFMutableDataRef,
            image_type: CFStringRef,
            count: usize,
            options: *const c_void,
        ) -> CGImageDestinationRef;
        fn CGImageDestinationAddImage(
            destination: CGImageDestinationRef,
            image: core_graphics::sys::CGImageRef,
            properties: *const c_void,
        );
        fn CGImageDestinationFinalize(destination: CGImageDestinationRef) -> bool;
    }

    unsafe {
        let data = CFDataCreateMutable(kCFAllocatorDefault as *const c_void, 0);
        if data.is_null() {
            return Err(OcrError::Adapter(
                "screen capture buffer allocation failed".to_string(),
            ));
        }

        let png_type = CFString::new("public.png");
        let destination = CGImageDestinationCreateWithData(
            data,
            png_type.as_concrete_TypeRef() as CFStringRef,
            1,
            ptr::null(),
        );
        if destination.is_null() {
            CFRelease(data as *const c_void);
            return Err(OcrError::Adapter(
                "screen capture image destination unavailable".to_string(),
            ));
        }

        CGImageDestinationAddImage(destination, image.as_ptr(), ptr::null());
        if !CGImageDestinationFinalize(destination) {
            CFRelease(destination as *const c_void);
            CFRelease(data as *const c_void);
            return Err(OcrError::Adapter(
                "screen capture PNG encoding failed".to_string(),
            ));
        }

        let length = CFDataGetLength(data);
        let bytes = CFDataGetBytePtr(data);
        let encoded = if length > 0 && !bytes.is_null() {
            std::slice::from_raw_parts(bytes, length as usize).to_vec()
        } else {
            Vec::new()
        };

        CFRelease(destination as *const c_void);
        CFRelease(data as *const c_void);

        if encoded.is_empty() {
            Err(OcrError::Adapter(
                "screen capture PNG encoding returned empty data".to_string(),
            ))
        } else {
            Ok(encoded)
        }
    }
}

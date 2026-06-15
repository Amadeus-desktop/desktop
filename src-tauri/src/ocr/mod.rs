mod commands;
mod core;

pub use commands::{
    capture_primary_display_ocr, get_ocr_provider_status, recognize_captured_image,
};
pub use core::{
    capture_gate_input_for_command, platform_ocr_adapter, pre_capture_gate, pre_ocr_gate,
    redacted_observation_from_adapter_text, CaptureGateInput, CaptureMetadata, CapturedImage,
    GateDecision, OcrObservation, OcrProviderStatus, OcrState, ScreenCaptureState,
    SCREEN_CAPTURE_TTL_MS,
};

#[cfg(any(test, not(target_os = "macos")))]
pub(crate) use core::DisabledOcrAdapter;
#[cfg(test)]
pub(crate) use core::OcrAdapter;
pub(crate) use core::OcrError;
#[cfg(test)]
pub(crate) use core::ScreenCaptureAdapter;

#[cfg(test)]
mod tests;

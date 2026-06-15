mod commands;
mod core;

pub use commands::{get_ocr_provider_status, recognize_captured_image};
pub use core::{
    platform_ocr_adapter, pre_capture_gate, pre_ocr_gate, redacted_observation_from_adapter_text,
    CaptureGateInput, CaptureMetadata, GateDecision, OcrObservation, OcrProviderStatus, OcrState,
};

#[cfg(any(test, not(target_os = "macos")))]
pub(crate) use core::DisabledOcrAdapter;
#[cfg(test)]
pub(crate) use core::OcrAdapter;
pub(crate) use core::OcrError;

#[cfg(test)]
mod tests;

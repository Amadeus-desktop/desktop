mod adapter;
mod apple_vision;
mod capture;
mod error;
mod gates;
mod redaction;
mod state;
mod types;

pub use apple_vision::platform_ocr_adapter;
pub use capture::{
    capture_gate_input_for_command, CapturedImage, ScreenCaptureState, SCREEN_CAPTURE_TTL_MS,
};
pub use gates::{pre_capture_gate, pre_ocr_gate};
pub use redaction::redacted_observation_from_adapter_text;
pub use state::OcrState;
pub use types::{
    CaptureGateInput, CaptureMetadata, GateDecision, OcrObservation, OcrProviderStatus,
};

#[cfg(any(test, not(target_os = "macos")))]
pub(crate) use adapter::DisabledOcrAdapter;
pub(crate) use adapter::OcrAdapter;
pub(crate) use error::OcrError;

#[cfg(test)]
pub(crate) use capture::ScreenCaptureAdapter;

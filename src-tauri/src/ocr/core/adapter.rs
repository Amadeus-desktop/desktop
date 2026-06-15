use super::{OcrError, OcrObservation, OcrProviderStatus};

pub trait OcrAdapter: Send {
    fn id(&self) -> &'static str;
    fn status(&self) -> OcrProviderStatus;
    fn recognize_image_bytes(&self, image_bytes: Vec<u8>) -> Result<OcrObservation, OcrError>;
}

#[cfg_attr(target_os = "macos", allow(dead_code))]
pub struct DisabledOcrAdapter {
    detail: String,
}

#[cfg_attr(target_os = "macos", allow(dead_code))]
impl DisabledOcrAdapter {
    pub fn new(detail: impl Into<String>) -> Self {
        Self {
            detail: detail.into(),
        }
    }
}

impl OcrAdapter for DisabledOcrAdapter {
    fn id(&self) -> &'static str {
        "disabled"
    }

    fn status(&self) -> OcrProviderStatus {
        OcrProviderStatus {
            provider: self.id().to_string(),
            available: false,
            detail: self.detail.clone(),
        }
    }

    fn recognize_image_bytes(&self, _image_bytes: Vec<u8>) -> Result<OcrObservation, OcrError> {
        Err(OcrError::Unsupported(self.detail.clone()))
    }
}

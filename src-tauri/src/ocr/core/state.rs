use std::sync::Mutex;

use super::{platform_ocr_adapter, OcrAdapter, OcrError, OcrObservation, OcrProviderStatus};

pub struct OcrState {
    adapter: Mutex<Box<dyn OcrAdapter>>,
}

impl OcrState {
    pub fn platform_default() -> Self {
        Self::new(platform_ocr_adapter())
    }

    pub fn new(adapter: Box<dyn OcrAdapter>) -> Self {
        Self {
            adapter: Mutex::new(adapter),
        }
    }

    pub fn status(&self) -> OcrProviderStatus {
        self.adapter
            .lock()
            .map(|adapter| adapter.status())
            .unwrap_or_else(|_| OcrProviderStatus {
                provider: "unknown".to_string(),
                available: false,
                detail: "ocr adapter lock was poisoned".to_string(),
            })
    }

    pub fn recognize_image_bytes(&self, image_bytes: Vec<u8>) -> Result<OcrObservation, OcrError> {
        self.adapter
            .lock()
            .map_err(|_| OcrError::State("ocr adapter lock was poisoned".to_string()))?
            .recognize_image_bytes(image_bytes)
    }
}

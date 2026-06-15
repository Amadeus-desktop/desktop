use super::{
    redacted_observation_from_adapter_text, OcrAdapter, OcrError, OcrObservation, OcrProviderStatus,
};

#[cfg(not(target_os = "macos"))]
use super::DisabledOcrAdapter;

#[cfg(target_os = "macos")]
use objc2::{rc::Retained, runtime::AnyObject, AnyThread};
#[cfg(target_os = "macos")]
use objc2_foundation::{NSArray, NSData, NSDictionary, NSString};
#[cfg(target_os = "macos")]
use objc2_vision::{
    VNImageOption, VNImageRequestHandler, VNRecognizeTextRequest, VNRecognizedTextObservation,
    VNRequest, VNRequestTextRecognitionLevel,
};

#[cfg(target_os = "macos")]
pub fn platform_ocr_adapter() -> Box<dyn OcrAdapter> {
    Box::new(AppleVisionOcrAdapter)
}

#[cfg(not(target_os = "macos"))]
pub fn platform_ocr_adapter() -> Box<dyn OcrAdapter> {
    Box::new(DisabledOcrAdapter::new(
        "Apple Vision OCR is available only on macOS",
    ))
}

#[cfg(target_os = "macos")]
pub struct AppleVisionOcrAdapter;

#[cfg(target_os = "macos")]
impl OcrAdapter for AppleVisionOcrAdapter {
    fn id(&self) -> &'static str {
        "apple-vision"
    }

    fn status(&self) -> OcrProviderStatus {
        OcrProviderStatus {
            provider: self.id().to_string(),
            available: true,
            detail: "Apple Vision VNRecognizeTextRequest".to_string(),
        }
    }

    fn recognize_image_bytes(&self, image_bytes: Vec<u8>) -> Result<OcrObservation, OcrError> {
        recognize_with_vision(image_bytes)
    }
}

#[cfg(target_os = "macos")]
fn recognize_with_vision(image_bytes: Vec<u8>) -> Result<OcrObservation, OcrError> {
    if image_bytes.is_empty() {
        return Err(OcrError::Adapter("image bytes are empty".to_string()));
    }

    let image_data = NSData::with_bytes(&image_bytes);
    let options = NSDictionary::<VNImageOption, AnyObject>::new();
    let request = VNRecognizeTextRequest::new();
    request.setRecognitionLevel(VNRequestTextRecognitionLevel::Accurate);
    request.setUsesLanguageCorrection(true);
    request.setAutomaticallyDetectsLanguage(true);

    let handler = VNImageRequestHandler::initWithData_options(
        VNImageRequestHandler::alloc(),
        &image_data,
        &options,
    );
    let request_ref: &VNRequest = &request;
    let requests = NSArray::from_slice(&[request_ref]);

    handler
        .performRequests_error(&requests)
        .map_err(|error| OcrError::Adapter(error.to_string()))?;

    let recognized = request
        .results()
        .map(|observations| collect_recognized_text(&observations))
        .unwrap_or_default();

    Ok(redacted_observation_from_adapter_text(
        recognized.join(" "),
        average_confidence(&recognized),
    ))
}

#[cfg(target_os = "macos")]
fn collect_recognized_text(observations: &NSArray<VNRecognizedTextObservation>) -> Vec<String> {
    let mut lines = Vec::new();
    for observation in observations.iter() {
        let candidates = observation.topCandidates(1);
        if let Some(candidate) = candidates.firstObject() {
            let text: Retained<NSString> = candidate.string();
            let value = text.to_string();
            if !value.trim().is_empty() {
                lines.push(value);
            }
        }
    }
    lines
}

#[cfg(target_os = "macos")]
fn average_confidence(lines: &[String]) -> f64 {
    if lines.is_empty() {
        0.0
    } else {
        0.8
    }
}

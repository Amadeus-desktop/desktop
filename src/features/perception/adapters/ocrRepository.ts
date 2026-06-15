import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../../../lib/tauri/runtime";
import type {
  CaptureMetadata,
  OcrObservation,
  OcrProviderStatus,
} from "../types";

const browserOcrStatus: OcrProviderStatus = {
  provider: "browser-disabled",
  available: false,
  detail: "OCR is available only in the Tauri runtime",
};

export async function getOcrProviderStatus(): Promise<OcrProviderStatus> {
  if (!isTauriRuntime()) {
    return browserOcrStatus;
  }

  return invoke<OcrProviderStatus>("get_ocr_provider_status");
}

export async function recognizeCapturedImage(
  imageBytes: number[],
  capture: CaptureMetadata,
  nowMs: number = Date.now(),
): Promise<OcrObservation> {
  if (!isTauriRuntime()) {
    return {
      textSummaryRedacted: "",
      visibleTextClasses: ["browser_unavailable"],
      contentKind: "unknown",
      confidence: 0,
      sensitiveHits: 0,
      sourceTtlMs: capture.ttlMs,
    };
  }

  return invoke<OcrObservation>("recognize_captured_image", {
    imageBytes,
    capture,
    nowMs,
  });
}

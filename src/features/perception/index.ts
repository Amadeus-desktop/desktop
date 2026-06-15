export { LiveContextLog } from "./components/LiveContextLog";
export { PerceptionPanel } from "./components/PerceptionPanel";
export { PrivacyFilterCard } from "./components/PrivacyFilterCard";
export { getOcrProviderStatus, recognizeCapturedImage } from "./adapters/ocrRepository";
export { usePerceptionStatus } from "./hooks/usePerceptionStatus";
export type {
  CaptureMetadata,
  LiveContextStatus,
  OcrObservation,
  OcrProviderStatus,
} from "./types";

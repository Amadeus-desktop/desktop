export {
  assessCurrentPrivacyContext,
  captureCurrentContextEvent,
  capturePrivacyCheckedContextEvent,
  getCurrentContextSnapshot,
  getScreenCapturePermissionStatus,
  requestScreenCapturePermission,
} from "./adapters/contextRepository";
export { formatLiveContextStatus } from "./lib/formatLiveContext";
export { useContextSnapshot } from "./hooks/useContextSnapshot";
export type { ContextSnapshotState } from "./hooks/useContextSnapshot";
export type {
  MacosContextSnapshot,
  PrivacyAssessment,
  PrivacyCheckedContextEvent,
  PrivacyContext,
  ScreenCapturePermissionStatus,
} from "./types";

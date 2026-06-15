import type {
  MacosContextSnapshot,
  PrivacyAssessment,
  ScreenCapturePermissionStatus,
} from "../features/context/types";

export const mockContextSnapshot: MacosContextSnapshot = {
  appName: "HWP",
  bundleIdentifier: "com.hancom.hwp",
  processId: 1001,
  windowTitle: "2024_공무_보고서.hwp",
  idleSeconds: 183,
  category: "work",
  frontmostDurationMs: 1000 * 60 * 12,
};

export const mockPrivacyAssessment: PrivacyAssessment = {
  isSensitive: false,
  reason: null,
  matchedKeyword: null,
  shouldSuppressCapture: false,
  shouldSuppressUtterance: false,
  redactedWindowTitle: mockContextSnapshot.windowTitle,
};

export const mockPermissionStatus: ScreenCapturePermissionStatus = {
  platform: "browser",
  granted: false,
  canRequest: false,
};

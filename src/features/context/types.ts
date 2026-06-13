export type AppCategory = "work" | "non_work" | "unknown";

export type MacosContextSnapshot = {
  appName: string;
  bundleIdentifier: string;
  processId: number;
  windowTitle: string;
  idleSeconds: number;
  category: AppCategory;
  frontmostDurationMs: number;
};

export type SensitiveReason =
  | "password_manager"
  | "finance"
  | "messaging"
  | "email"
  | "government"
  | "authentication"
  | "custom_keyword";

export type PrivacyAssessment = {
  isSensitive: boolean;
  reason: SensitiveReason | null;
  matchedKeyword: string | null;
  shouldSuppressCapture: boolean;
  shouldSuppressUtterance: boolean;
  redactedWindowTitle: string;
};

export type ScreenCapturePermissionStatus = {
  platform: string;
  granted: boolean;
  canRequest: boolean;
};

export type PrivacyContext = {
  snapshot: MacosContextSnapshot;
  assessment: PrivacyAssessment;
  screenCapturePermission: ScreenCapturePermissionStatus;
};

export type PrivacyCheckedContextEvent = PrivacyContext & {
  contextEvent: import("../timeline/types").ContextEvent | null;
};

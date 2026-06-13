import { invoke } from "@tauri-apps/api/core";
import type { ContextEvent } from "../timeline/types";
import type {
  MacosContextSnapshot,
  PrivacyAssessment,
  PrivacyCheckedContextEvent,
  PrivacyContext,
  ScreenCapturePermissionStatus,
} from "./types";

const mockContextSnapshot: MacosContextSnapshot = {
  appName: "HWP",
  bundleIdentifier: "com.hancom.hwp",
  processId: 1001,
  windowTitle: "2024_공무_보고서.hwp",
  idleSeconds: 183,
  category: "work",
  frontmostDurationMs: 1000 * 60 * 12,
};

const mockPrivacyAssessment: PrivacyAssessment = {
  isSensitive: false,
  reason: null,
  matchedKeyword: null,
  shouldSuppressCapture: false,
  shouldSuppressUtterance: false,
  redactedWindowTitle: mockContextSnapshot.windowTitle,
};

const mockPermissionStatus: ScreenCapturePermissionStatus = {
  platform: "browser",
  granted: false,
  canRequest: false,
};

export async function getCurrentContextSnapshot(): Promise<MacosContextSnapshot> {
  if (isTauriRuntime()) {
    return invoke<MacosContextSnapshot>("get_current_context_snapshot");
  }

  return mockContextSnapshot;
}

export async function captureCurrentContextEvent(): Promise<ContextEvent | null> {
  if (isTauriRuntime()) {
    return invoke<ContextEvent>("capture_current_context_event");
  }

  return null;
}

export async function getScreenCapturePermissionStatus(): Promise<ScreenCapturePermissionStatus> {
  if (isTauriRuntime()) {
    return invoke<ScreenCapturePermissionStatus>(
      "get_screen_capture_permission_status",
    );
  }

  return mockPermissionStatus;
}

export async function assessCurrentPrivacyContext(
  keywords: string[] = [],
): Promise<PrivacyContext> {
  if (isTauriRuntime()) {
    return invoke<PrivacyContext>("assess_current_privacy_context", {
      keywords,
    });
  }

  return {
    snapshot: mockContextSnapshot,
    assessment: mockPrivacyAssessment,
    screenCapturePermission: mockPermissionStatus,
  };
}

export async function capturePrivacyCheckedContextEvent(
  keywords: string[] = [],
): Promise<PrivacyCheckedContextEvent> {
  if (isTauriRuntime()) {
    return invoke<PrivacyCheckedContextEvent>(
      "capture_privacy_checked_context_event",
      { keywords },
    );
  }

  return {
    snapshot: mockContextSnapshot,
    assessment: mockPrivacyAssessment,
    screenCapturePermission: mockPermissionStatus,
    contextEvent: null,
  };
}

function isTauriRuntime() {
  return (
    typeof window !== "undefined" &&
    "__TAURI_INTERNALS__" in
      (window as unknown as { __TAURI_INTERNALS__?: unknown })
  );
}

import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../../lib/tauriRuntime";
import type { ContextEvent } from "../timeline/types";
import type {
  MacosContextSnapshot,
  PrivacyCheckedContextEvent,
  PrivacyContext,
  ScreenCapturePermissionStatus,
} from "./types";

import {
  mockContextSnapshot,
  mockPermissionStatus,
  mockPrivacyAssessment,
} from "../../mocks/context";

export async function getCurrentContextSnapshot(): Promise<MacosContextSnapshot> {
  if (isTauriRuntime()) {
    return invoke<MacosContextSnapshot>("get_current_context_snapshot");
  }

  return mockContextSnapshot;
}

export async function captureCurrentContextEvent(): Promise<ContextEvent | null> {
  if (isTauriRuntime()) {
    const result = await capturePrivacyCheckedContextEvent();
    return result.contextEvent;
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

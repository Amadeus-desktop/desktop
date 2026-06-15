import type { LocalRedactedContext } from "../prompt/assembly";

export type ScreenCapturePermissionBucket = "granted" | "missing" | "denied";
export type OcrAttemptResult = "skipped" | "success" | "failure" | "timeout";

export type OcrHydrationAttemptInput = {
  screenContextEnabled: boolean;
  screenCapturePermission: ScreenCapturePermissionBucket;
  triggerCandidateExists: boolean;
  privacySuppressesCapture: boolean;
  meetingFrontmost: boolean;
  captureValueScore: number;
  ocrCooldownActive: boolean;
};

export type OcrHydrationAttemptDecision = {
  shouldAttempt: boolean;
  reason:
    | "allowed"
    | "screen_context_disabled"
    | "screen_permission_missing"
    | "screen_permission_denied"
    | "no_trigger_candidate"
    | "privacy_suppresses_capture"
    | "meeting_frontmost"
    | "capture_value_not_positive"
    | "ocr_cooldown_active";
};

export function processOnlyNudgeCanProceed(input: {
  triggerCandidateExists: boolean;
  screenCapturePermission: ScreenCapturePermissionBucket;
  ocrAttemptResult: OcrAttemptResult;
}): boolean {
  void input.screenCapturePermission;
  void input.ocrAttemptResult;
  return input.triggerCandidateExists;
}

export function decideOcrHydrationAttempt(
  input: OcrHydrationAttemptInput,
): OcrHydrationAttemptDecision {
  if (!input.triggerCandidateExists) {
    return { shouldAttempt: false, reason: "no_trigger_candidate" };
  }
  if (!input.screenContextEnabled) {
    return { shouldAttempt: false, reason: "screen_context_disabled" };
  }
  if (input.screenCapturePermission === "missing") {
    return { shouldAttempt: false, reason: "screen_permission_missing" };
  }
  if (input.screenCapturePermission === "denied") {
    return { shouldAttempt: false, reason: "screen_permission_denied" };
  }
  if (input.privacySuppressesCapture) {
    return { shouldAttempt: false, reason: "privacy_suppresses_capture" };
  }
  if (input.meetingFrontmost) {
    return { shouldAttempt: false, reason: "meeting_frontmost" };
  }
  if (input.ocrCooldownActive) {
    return { shouldAttempt: false, reason: "ocr_cooldown_active" };
  }
  if (input.captureValueScore <= 0) {
    return { shouldAttempt: false, reason: "capture_value_not_positive" };
  }
  return { shouldAttempt: true, reason: "allowed" };
}

export function buildLocalRedactedContext(input: {
  triggerType: string;
  coarseContextLabel: string;
  redactedWindowTitle?: string | null;
  redactedOcrSummary?: string | null;
  visibleTextClasses: string[];
  contentKind: string;
  confidenceBucket: string;
  captureAgeMs: number;
  redactionPolicyVersion: string;
  forbiddenKeysRemoved: string[];
}): LocalRedactedContext {
  return {
    source: "local_desktop",
    summary: input.redactedOcrSummary ?? input.coarseContextLabel,
    trigger_type: input.triggerType,
    coarse_context_label: input.coarseContextLabel,
    redacted_window_title: input.redactedWindowTitle ?? null,
    redacted_ocr_summary: input.redactedOcrSummary ?? null,
    visible_text_classes: input.visibleTextClasses,
    content_kind: input.contentKind,
    confidence_bucket: input.confidenceBucket,
    capture_age_ms: input.captureAgeMs,
    redaction_policy_version: input.redactionPolicyVersion,
    forbidden_keys_removed: input.forbiddenKeysRemoved,
  };
}

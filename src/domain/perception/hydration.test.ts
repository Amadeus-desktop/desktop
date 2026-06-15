import { describe, expect, it } from "vitest";
import {
  buildLocalRedactedContext,
  decideOcrHydrationAttempt,
  processOnlyNudgeCanProceed,
} from "./hydration";

describe("processOnlyNudgeCanProceed", () => {
  it("allows nudge from process-only trigger even when screen permission is missing", () => {
    expect(
      processOnlyNudgeCanProceed({
        triggerCandidateExists: true,
        screenCapturePermission: "missing",
        ocrAttemptResult: "skipped",
      }),
    ).toBe(true);
  });

  it("does not allow OCR to create a proactive moment without a trigger candidate", () => {
    expect(
      processOnlyNudgeCanProceed({
        triggerCandidateExists: false,
        screenCapturePermission: "granted",
        ocrAttemptResult: "success",
      }),
    ).toBe(false);
  });
});

describe("decideOcrHydrationAttempt", () => {
  it("attempts OCR only after trigger candidate and all capture gates pass", () => {
    expect(
      decideOcrHydrationAttempt({
        screenContextEnabled: true,
        screenCapturePermission: "granted",
        triggerCandidateExists: true,
        privacySuppressesCapture: false,
        meetingFrontmost: false,
        captureValueScore: 35,
        ocrCooldownActive: false,
      }),
    ).toEqual({ shouldAttempt: true, reason: "allowed" });
  });

  it("skips OCR when there is no trigger candidate", () => {
    expect(
      decideOcrHydrationAttempt({
        screenContextEnabled: true,
        screenCapturePermission: "granted",
        triggerCandidateExists: false,
        privacySuppressesCapture: false,
        meetingFrontmost: false,
        captureValueScore: 35,
        ocrCooldownActive: false,
      }),
    ).toEqual({ shouldAttempt: false, reason: "no_trigger_candidate" });
  });

  it("skips OCR when permission is denied without blocking process-only nudge", () => {
    expect(
      decideOcrHydrationAttempt({
        screenContextEnabled: true,
        screenCapturePermission: "denied",
        triggerCandidateExists: true,
        privacySuppressesCapture: false,
        meetingFrontmost: false,
        captureValueScore: 35,
        ocrCooldownActive: false,
      }),
    ).toEqual({ shouldAttempt: false, reason: "screen_permission_denied" });
  });
});

describe("buildLocalRedactedContext", () => {
  it("builds local desktop context without raw OCR, path, full URL or screenshot fields", () => {
    const context = buildLocalRedactedContext({
      triggerType: "deep_pause",
      coarseContextLabel: "work",
      redactedWindowTitle: "[redacted-title]",
      redactedOcrSummary: "[redacted-sensitive-ocr]",
      visibleTextClasses: ["code", "todo"],
      contentKind: "document",
      confidenceBucket: "medium",
      captureAgeMs: 500,
      forbiddenKeysRemoved: ["raw_ocr_text", "file_path"],
      redactionPolicyVersion: "phase08.v1",
    });

    expect(context).toMatchObject({
      source: "local_desktop",
      trigger_type: "deep_pause",
      coarse_context_label: "work",
      redacted_ocr_summary: "[redacted-sensitive-ocr]",
    });
    expect(context.forbidden_keys_removed).toContain("raw_ocr_text");
    expect(JSON.stringify(context)).not.toContain("/Users/");
    expect(JSON.stringify(context)).not.toContain("screenshot");
  });
});

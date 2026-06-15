import { describe, expect, it } from "vitest";
import { evaluateAiRegressionGates, REQUIRED_EVAL_FIXTURES } from "./gates";

describe("REQUIRED_EVAL_FIXTURES", () => {
  it("contains phase 07 regression fixtures for persona, sync, memory and perception", () => {
    expect(REQUIRED_EVAL_FIXTURES).toContain("persona_warm_friend");
    expect(REQUIRED_EVAL_FIXTURES).toContain("conversation_web_to_app");
    expect(REQUIRED_EVAL_FIXTURES).toContain("memory_cloud_safe_preference");
    expect(REQUIRED_EVAL_FIXTURES).toContain(
      "process_only_nudge_without_screen_permission",
    );
    expect(REQUIRED_EVAL_FIXTURES).toContain("web_prompt_strips_ocr_context");
  });
});

describe("evaluateAiRegressionGates", () => {
  it("passes when all blocking thresholds are met and fixtures are complete", () => {
    const result = evaluateAiRegressionGates({
      completedFixtures: REQUIRED_EVAL_FIXTURES,
      personaContinuityPassRate: 0.96,
      crossSurfaceSyncSuccessRate: 0.995,
      duplicateMessageRate: 0,
      rlsCrossUserAllowedCount: 0,
      privacyLeakAllowedCount: 0,
      promptTokenBudgetFailureRate: 0.005,
      localQwenTimeoutRate: 0.03,
      memoryRetrievalPrecision: 0.82,
      processOnlyNudgeSuccessRate: 0.995,
      webOcrContextLeakAllowedCount: 0,
    });

    expect(result.passed).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it("fails with specific reasons when thresholds or fixtures are missing", () => {
    const result = evaluateAiRegressionGates({
      completedFixtures: ["persona_warm_friend"],
      personaContinuityPassRate: 0.94,
      crossSurfaceSyncSuccessRate: 0.995,
      duplicateMessageRate: 0.01,
      rlsCrossUserAllowedCount: 0,
      privacyLeakAllowedCount: 1,
      promptTokenBudgetFailureRate: 0.005,
      localQwenTimeoutRate: 0.03,
      memoryRetrievalPrecision: 0.82,
      processOnlyNudgeSuccessRate: 0.995,
      webOcrContextLeakAllowedCount: 0,
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toContain("missing_required_fixtures");
    expect(result.failures).toContain("persona_continuity_below_95");
    expect(result.failures).toContain("duplicate_messages_detected");
    expect(result.failures).toContain("privacy_leak_fixture_failed");
  });
});

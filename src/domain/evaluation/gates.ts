export const REQUIRED_EVAL_FIXTURES = [
  "persona_seoyeon_modern_senior",
  "persona_eiren_fantasy_guardian",
  "conversation_web_to_app",
  "conversation_app_offline_to_web",
  "memory_cloud_safe_preference",
  "memory_local_private_work_context",
  "nudge_to_deep_transition",
  "first_message_sets_scene",
  "example_dialogue_style_transfer",
  "relationship_repair_after_conflict",
  "memory_update_overrides_old_fact",
  "poisoned_memory_rejected",
  "unknown_when_memory_absent",
  "offline_order_web_interleaving",
  "revoked_device_upload_rejected",
  "process_only_nudge_without_screen_permission",
  "ocr_attempt_after_trigger_candidate",
  "ocr_failure_does_not_block_nudge",
  "ocr_context_deep_only_after_user_input",
  "web_prompt_strips_ocr_context",
] as const;

export type RequiredEvalFixture = (typeof REQUIRED_EVAL_FIXTURES)[number];

export type AiRegressionGateInput = {
  completedFixtures: readonly string[];
  personaContinuityPassRate: number;
  crossSurfaceSyncSuccessRate: number;
  duplicateMessageRate: number;
  rlsCrossUserAllowedCount: number;
  privacyLeakAllowedCount: number;
  promptTokenBudgetFailureRate: number;
  localQwenTimeoutRate: number;
  memoryRetrievalPrecision: number;
  processOnlyNudgeSuccessRate: number;
  webOcrContextLeakAllowedCount: number;
};

export type AiRegressionGateResult = {
  passed: boolean;
  failures: string[];
};

export function evaluateAiRegressionGates(
  input: AiRegressionGateInput,
): AiRegressionGateResult {
  const failures: string[] = [];
  const completed = new Set(input.completedFixtures);

  if (!REQUIRED_EVAL_FIXTURES.every((fixture) => completed.has(fixture))) {
    failures.push("missing_required_fixtures");
  }
  if (input.personaContinuityPassRate < 0.95) {
    failures.push("persona_continuity_below_95");
  }
  if (input.crossSurfaceSyncSuccessRate < 0.99) {
    failures.push("cross_surface_sync_below_99");
  }
  if (input.duplicateMessageRate !== 0) {
    failures.push("duplicate_messages_detected");
  }
  if (input.rlsCrossUserAllowedCount !== 0) {
    failures.push("rls_cross_user_access_allowed");
  }
  if (input.privacyLeakAllowedCount !== 0) {
    failures.push("privacy_leak_fixture_failed");
  }
  if (input.promptTokenBudgetFailureRate > 0.01) {
    failures.push("prompt_budget_failure_rate_above_1_percent");
  }
  if (input.localQwenTimeoutRate > 0.05) {
    failures.push("local_qwen_timeout_rate_above_5_percent");
  }
  if (input.memoryRetrievalPrecision < 0.8) {
    failures.push("memory_retrieval_precision_below_80");
  }
  if (input.processOnlyNudgeSuccessRate < 0.99) {
    failures.push("process_only_nudge_success_below_99");
  }
  if (input.webOcrContextLeakAllowedCount !== 0) {
    failures.push("web_ocr_context_leak_detected");
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

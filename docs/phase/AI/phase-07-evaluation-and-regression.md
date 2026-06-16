# Phase 07. Evaluation And Regression

## Goal

Prove that persona continuity, memory retrieval, and cross-surface sessions work.

This phase prevents regressions as prompts, memory schemas, and providers evolve.

## Evaluation Areas

### Persona Continuity

- Same persona produces consistent tone on web and app.
- Persona static rules remain present in prompt.
- Persona state changes do not overwrite static identity.
- First message sets the opening scene only once.
- Example dialogues influence style without becoming false memory.
- Relationship repair state is reflected after a conflict.

### Cross-Surface Conversation

- Web conversation continues in app.
- App conversation continues in web.
- Offline app message syncs without duplication.
- Conversation order is stable after sync.
- Offline app messages keep stable order when web messages arrive in between.
- Revoked devices cannot upload messages.
- Idempotent retries return the original cloud message ack.

### Memory Use

- High-confidence semantic memory appears in deep prompt.
- Local private memory never appears in web/cloud prompt.
- Cloud-safe memory appears on both web and app.
- Stale or deleted memory is excluded.
- Updated memory beats older contradictory memory.
- Poisoned memory candidates cannot become persona or system rules.
- Missing memory causes the model to say it does not know instead of inventing continuity.

### Qwen Local Runtime

- Qwen prompt includes `/no_think` for user-facing modes.
- Nudge remains short.
- Deep reply stays in persona and asks at most one question.
- Repetition is detected and bounded.

### Local Perception Hydration

- Nudge can be generated in process-only mode without screen permission.
- OCR is attempted only after a trigger candidate exists and capture gates pass.
- OCR failure does not block a valid Nudge.
- LocalRedactedContext can enrich Pocket/Deep only after user opening or input.
- Web Cloud LLM never receives OCR-derived local context.

### Privacy/Security

- RLS blocks cross-user persona/conversation/memory reads.
- Sync validator rejects forbidden raw keys.
- Provider input tests reject raw OCR, screenshot, token, URL query, and file path.
- Service-role Edge Functions emit audit events.
- Device cursor RLS blocks cross-device cursor writes.
- OCR hydration tests reject raw screenshot, raw OCR, full window title, file path, and URL query.

### Observability

- Sync attempts include `sync_attempt_id`, `device_id`, `conversation_id`, and `idempotency_key`.
- Prompt assembly includes `prompt_trace_id`, selected memory ids, and redaction policy version.
- Edge Function logs include request id, user id, device id, function name, and audit event.
- Local Qwen logs include mode, latency bucket, timeout, repetition flag, and prompt trace id.
- Privacy rejection logs include rejection reason without storing rejected raw content.
- Perception logs include OCR attempt/result buckets without storing raw content.

## Test Fixtures

Create fixtures for:

```text
persona_seoyeon_modern_senior
persona_eiren_fantasy_guardian
conversation_web_to_app
conversation_app_offline_to_web
memory_cloud_safe_preference
memory_local_private_work_context
nudge_to_deep_transition
first_message_sets_scene
example_dialogue_style_transfer
relationship_repair_after_conflict
memory_update_overrides_old_fact
poisoned_memory_rejected
unknown_when_memory_absent
offline_order_web_interleaving
revoked_device_upload_rejected
process_only_nudge_without_screen_permission
ocr_attempt_after_trigger_candidate
ocr_failure_does_not_block_nudge
ocr_context_deep_only_after_user_input
web_prompt_strips_ocr_context
```

## Metrics

Primary:

- Nudge-to-DeepChat conversion rate
- Persona continuity pass rate
- Cross-surface conversation sync success rate

Secondary:

- memory retrieval precision
- duplicate message rate
- prompt token budget failures
- local Qwen timeout rate
- OCR hydration skip/block rate

Blocking thresholds:

```text
persona continuity pass rate >= 95%
cross-surface sync success rate >= 99% in integration fixtures
duplicate message rate = 0 in deterministic fixtures
RLS cross-user access failures = 0 allowed
privacy leak fixtures = 0 allowed
prompt token budget failures <= 1% after truncation
local Qwen timeout rate <= 5% on supported hardware profile
memory retrieval precision >= 80% on golden fixtures before RAG defaults on
process-only nudge success rate >= 99% in deterministic fixtures
web OCR context leak fixtures = 0 allowed
```

These thresholds are product gates for phase completion, not analytics targets.

## Scope

- Unit tests for prompt assembly.
- Integration tests for sync.
- SQL/RLS tests.
- Provider input regression tests.
- Golden prompt snapshots with redaction.
- Sync observability assertions.
- Memory poisoning and contradiction fixtures.
- Local perception hydration fixtures.

## Excluded

- Human eval platform.
- Automatic fine-tuning.
- Product analytics dashboards.

## Exit Criteria

- Prompt assembly has golden tests.
- Cross-surface session fixtures pass.
- RLS isolation tests pass.
- Qwen local prompt contract is regression-tested.
- Memory retrieval improves continuity without leaking local-private data.
- Evaluation thresholds are enforced as blocking gates.
- Sync and prompt traces are sufficient to diagnose which component failed.
- Perception traces prove whether OCR was used, skipped, or blocked.

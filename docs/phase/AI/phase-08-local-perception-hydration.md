# Phase 08. Local Perception Hydration

## Goal

Connect macOS process/window/idle signals and optional Apple Vision OCR into the Nudge, Pocket, and Deep prompt flow without making screen capture mandatory.

This phase closes the gap between PRD v3 Context Hydration Pipeline and the current local runtime.

## Core Rule

Proactive companion behavior must work in process-only mode.

OCR is optional context. It can raise context confidence or enrich local DeepChat, but it must never be required for NudgeNote.

```text
process/window/idle signals
  -> trigger candidate
  -> NudgeNote

optional screen capture/OCR
  -> pre-capture gate
  -> Apple Vision OCR
  -> redacted OcrObservation
  -> LocalRedactedContext
  -> prompt hydration by mode
```

## PRD v3 Mapping

| PRD v3 context | Runtime source | Phase 08 contract |
| --- | --- | --- |
| 현재 작업 상태 요약 | process/window/idle snapshot, optional OCR summary | always available as coarse label; OCR only if allowed |
| 민감 앱 여부 | privacy assessment and capture gate | hard suppression for OCR and utterance where required |
| 최근 발화 여부 | trigger runtime state | used before capture |
| 사용자의 방해 반응 이력 | trigger reaction scoring | lowers speakability before capture |
| 현재 PC 작업 요약 | LocalRedactedContext | only Pocket/Deep can use richer local context |

## Data Flow

```text
Trigger poll
  -> read_current_snapshot
  -> assess_privacy
  -> evaluate process-only trigger candidate
  -> if no candidate: stop
  -> if candidate and capture value is useful:
       run OCR hydration attempt
  -> build NudgeContext
  -> Prompt Builder
  -> Local Qwen or template fallback
  -> NudgeNote
```

The trigger candidate is selected before OCR. OCR must not create a proactive moment by itself.

## Hydration Levels

### Nudge

Allowed:

- `trigger_type`
- coarse app category
- redacted work-state label
- recent utterance bucket
- interruption reaction bucket
- OCR confidence bucket
- short redacted OCR summary only when explicitly allowed

Forbidden:

- raw OCR text
- screenshot
- full window title
- file path
- full URL
- detailed document text
- sensitive hit content

Nudge output still follows Phase 03: one short sentence, no work command, no forced question.

### Pocket

Allowed:

- active NudgeNote
- trigger reason
- persona tone
- recent reaction state
- LocalRedactedContext if OCR passed all gates

Pocket may mention the situation in vague terms. It must not quote OCR text.

### Deep

Allowed:

- user input
- current conversation messages
- persona and relationship state
- memory cards allowed by policy
- LocalRedactedContext
- SafeWorkSummary candidates

Deep can use local PC context more directly, but only after user input or explicit opening.

### Daily Care

Allowed:

- timeline event counts
- nudge/pocket/deep transitions
- return moments
- redacted work summary candidates

Daily Care must not expose OCR text, window titles, URLs, file paths, or sensitive app details.

## OCR Attempt Policy

OCR attempt is allowed only when all conditions are true:

- user enabled screen context analysis
- macOS screen capture permission is granted
- trigger candidate exists
- privacy assessment does not suppress capture
- meeting app is not frontmost
- capture value score is positive
- previous OCR attempt is outside cooldown

OCR attempt is skipped when any condition fails. Skipping OCR is not an error.

## Capture Value Score

`capture_value_score` decides whether OCR is worth attempting after a process-only trigger candidate.

Initial scoring:

```text
+30 unknown app category
+25 deep_pause candidate
+20 long work milestone
+15 user opened recent nudge
-40 privacy risk elevated
-30 recent OCR failure
-30 low battery or high CPU mode
-100 meeting frontmost
-100 screen context disabled
```

OCR runs only when `capture_value_score > 0`.

## LocalRedactedContext

```text
LocalRedactedContext
- source: local_desktop
- trigger_type
- coarse_context_label
- redacted_window_title: optional
- redacted_ocr_summary: optional
- visible_text_classes[]
- content_kind
- confidence_bucket
- capture_age_ms
- redaction_policy_version
- forbidden_keys_removed[]
```

Rules:

- `redacted_ocr_summary` is never sent to Web Cloud LLM.
- `redacted_ocr_summary` is not persisted by default.
- If persistence is needed, it must first become a `SafeWorkSummary` candidate and pass Phase 04 validator.
- Raw OCR text remains inside the OCR adapter boundary.

## Failure And Fallback

| Failure | Behavior |
| --- | --- |
| permission missing | process-only Nudge can still run |
| permission denied | process-only mode, show settings hint only in settings/onboarding |
| capture denied by gate | process-only Nudge can still run |
| OCR adapter unavailable | process-only Nudge can still run |
| OCR timeout | continue without OCR and record timeout bucket |
| sensitive OCR hit | discard OCR result and suppress local context hydration |
| Local Qwen unavailable | template fallback |

No OCR failure may block a valid process-only trigger.

## Prompt Integration

Phase 03 `current_context` receives:

```text
Nudge: SafeCurrentContext or minimal LocalRedactedContext
Pocket: LocalRedactedContext if user opened Nudge
Deep: LocalRedactedContext after user input
Web Cloud LLM: SafeCurrentContext only
```

Provider filter must remove OCR-derived fields for cloud providers.

## Observability

Log only buckets and ids:

- `perception_attempt_id`
- trigger id
- permission bucket
- capture gate result
- OCR provider id
- OCR success/failure bucket
- confidence bucket
- redaction policy version
- prompt trace id

Do not log raw OCR text, screenshot path, full window title, file path, URL query, or sensitive hit text.

## Scope

- OCR hydration policy.
- Capture value scoring.
- `LocalRedactedContext` contract.
- Trigger-to-OCR integration point.
- Prompt Builder integration by mode.
- Failure/fallback behavior.
- Observability buckets.

## Excluded

- OCR as a mandatory Nudge dependency.
- Cloud sync of OCR summaries.
- Raw screenshot persistence.
- Raw OCR persistence.
- Window/region capture implementation.
- Productivity scoring.

## Tests

- Process-only trigger can create Nudge without OCR permission.
- Trigger pipeline skips OCR when no trigger candidate exists.
- OCR is attempted only after candidate and capture gates pass.
- OCR failure does not block Nudge.
- `redacted_ocr_summary` can enter Local Qwen input only for allowed modes.
- Web Cloud LLM never receives OCR-derived fields.
- Sensitive OCR hit discards OCR context.
- Daily Care excludes raw OCR/window/path/URL details.

## Exit Criteria

- PRD v3 Context Hydration Pipeline is represented in runtime contracts.
- Nudge works without screen permission.
- Apple Vision OCR can enrich local context when permission and gates allow it.
- Prompt traces prove whether OCR was used, skipped, or blocked.
- No raw screen/OCR data crosses local safety boundaries.

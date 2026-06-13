# Phase 03. Trigger Exception Engine

## Goal

음악 감상, 회의, 앱 왕복, 레퍼런스 사용 같은 예외상황을 process-only 신호로 먼저 처리한다.

## Architecture Links

- [Local Perception Signal Architecture](../architecture/local-perception-spa.md)

## Scope

- `ProcessHistoryWindow` 추가
- app switch rolling window
- known music app short frontmost suppression
- known meeting app hard suppression
- multi-app workflow cluster
- Drift suppression for work clusters
- trigger tests for exception scenarios

## MVP Exception Rules

```text
known_music_app_seen == true
known_music_app_frontmost_ms < 60_000
  -> no drift candidate

known_meeting_app_frontmost == true
  -> no capture
  -> no utterance

work_cluster_duration_ms >= 10 minutes
app_switch_count >= 3
non_work_single_app_max_duration_ms < 10 minutes
  -> drift suppressed
```

## Excluded

- actual dual-monitor gaze detection
- background audio session API
- OCR-based YouTube classification
- ML personalization

## Tests

- Spotify/Apple Music short foreground does not trigger Drift.
- Zoom/Meet/Teams suppresses DeepPause.
- VS Code/Safari/Terminal app switching is workflow, not Drift.
- repeated ignored reactions still reduce score.

## Exit Criteria

- exception tests pass.
- no screen capture is required for MVP exception handling.

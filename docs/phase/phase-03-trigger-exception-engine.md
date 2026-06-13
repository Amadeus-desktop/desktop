# Phase 03. Trigger Exception Engine

Status: Completed

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

## Completion Evidence

- `ProcessHistoryWindow`와 `ForegroundSegment` 추가
- trigger runtime이 process-only snapshot으로 rolling history를 갱신
- known music app short foreground Drift suppression 추가
- known meeting app utterance suppression 추가
- work cluster app switching Drift suppression 추가
- 예외 처리에서 screen capture/OCR을 요구하지 않음
- repeated ignored reaction score 감소 테스트 유지

Verified:

```text
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
pnpm build
```

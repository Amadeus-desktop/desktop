# Phase 00. Current Baseline

## Goal

현재 MVP가 어디까지 왔는지 기준선을 고정한다. 이후 phase는 이 기준선 위에서만 진행한다.

## Current Facts

- Tauri 2 desktop app
- React + Vite + Tailwind UI
- Rust backend commands
- SQLite timeline core
- macOS context bridge
- privacy assessment
- trigger engine
- Speakability Score
- companion bubble/chat shell
- settings store
- llama.cpp sidecar manager
- local/template LLM provider boundary
- architecture docs under `docs/architecture/`

## Must Keep

- release build는 명시 요청 전 실행하지 않는다.
- user logo/icon은 유지한다.
- raw screenshot/OCR raw text sync 금지 원칙을 유지한다.
- final utterance decision은 Rust policy engine이 한다.

## Verification

Baseline check:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
pnpm build
```

## Exit Criteria

- 현재 상태가 문서화되어 있다.
- 이후 phase가 baseline을 암묵적으로 뒤집지 않는다.

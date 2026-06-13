# Phase 01. Domain Modularization

## Goal

Rust와 React 구조를 도메인 단위로 정리한다. root에는 composition entry만 두고, 실제 도메인 로직은 폴더 내부에 둔다.

## Architecture Links

- [State Management Architecture](../architecture/state-management.md)
- [Architecture Index](../architecture/README.md)

## Scope

Rust:

```text
src-tauri/src/
  lib.rs
  main.rs
  macos_context/
  privacy/
  trigger/
  timeline/
  settings/
  llm/
  llama_sidecar/
```

React:

```text
src/app/index.ts
src/ui/index.ts
src/features/*/index.ts
```

## Excluded

- behavior change
- DB schema change
- UI redesign
- provider policy change

## Tests

```bash
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
pnpm build
```

## Exit Criteria

- root Rust files are `lib.rs` and `main.rs` only.
- feature modules expose stable `index.ts` entries.
- build and tests pass.

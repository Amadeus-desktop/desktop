# Tauri Target And State Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce Tauri build target surface, move settings persistence to a Tauri-native store plugin, and remove small duplicated runtime helpers.

**Architecture:** Keep runtime-only state in Rust `tauri::State`, persist user preferences with `tauri-plugin-store`, and keep SQLite for timeline data. Optimize macOS MVP bundling by targeting only DMG/app outputs and by enabling Rust release size settings.

**Tech Stack:** Tauri 2, tauri-plugin-store, React, TypeScript, Rust, pnpm

---

### Task 1: Target And Release Optimization

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/Cargo.toml`

- [ ] Set bundle targets to macOS-focused outputs instead of `all`.
- [ ] Add Rust release profile for smaller binaries.
- [ ] Keep existing macOS window behavior changes.

### Task 2: Store Plugin And Settings State

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`
- Create: `src/features/settings/settingsStore.ts`
- Modify: `src/features/settings/useSettings.ts`

- [ ] Add `@tauri-apps/plugin-store` and `tauri-plugin-store`.
- [ ] Register the Rust store plugin.
- [ ] Persist settings through the JS store plugin.
- [ ] Keep browser fallback behavior.

### Task 3: Duplicate Runtime Helper Cleanup

**Files:**
- Create: `src/lib/tauriRuntime.ts`
- Modify repository wrappers that duplicate `isTauriRuntime`.

- [ ] Move `isTauriRuntime` into one shared helper.
- [ ] Update context, timeline, trigger, and llm repositories.

### Task 4: Verification

**Files:**
- Read changed files.

- [ ] Run `cargo test --manifest-path src-tauri/Cargo.toml`.
- [ ] Run `cargo check --manifest-path src-tauri/Cargo.toml`.
- [ ] Run `CI=true pnpm build`.

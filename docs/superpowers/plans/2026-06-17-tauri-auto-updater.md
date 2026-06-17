# Tauri Auto Updater Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add automatic update checking, download, install, and relaunch for the macOS Tauri app.

**Architecture:** Use the official Tauri updater plugin and GitHub Release `latest.json`. Keep runtime logic behind a small TypeScript adapter so it can be unit-tested without Tauri runtime.

**Tech Stack:** Tauri v2, `@tauri-apps/plugin-updater`, `@tauri-apps/plugin-process`, GitHub Releases, pnpm, Rust.

---

### Task 1: Add Updater Runtime Adapter

**Files:**

- Create: `src/features/updates/lib/autoUpdate.ts`
- Create: `src/features/updates/lib/autoUpdate.test.ts`
- Create: `src/features/updates/index.ts`

- [x] Write a failing test for skipping non-Tauri runtime.
- [x] Write a failing test for downloading, installing, and relaunching when an update exists.
- [x] Implement the minimal adapter.
- [x] Export the adapter from the feature index.

### Task 2: Wire Main App Startup

**Files:**

- Modify: `src/app/App.tsx`

- [x] Call `scheduleAutoUpdateCheck` after the main app mounts.
- [x] Keep failures non-blocking through the adapter logger path.

### Task 3: Configure Tauri Updater

**Files:**

- Modify: `package.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/capabilities/default.json`

- [x] Add JS updater and process plugin dependencies.
- [x] Add Rust updater and process plugin dependencies.
- [x] Initialize updater and process plugins.
- [x] Enable updater artifacts and configure GitHub Release endpoint.
- [x] Add updater and process permissions.

### Task 4: Update GitHub Actions

**Files:**

- Modify: `.github/workflows/macos-release.yml`

- [x] Pass `TAURI_SIGNING_PRIVATE_KEY`.
- [x] Pass `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
- [x] Ensure updater JSON and signatures are uploaded on tag releases.

### Task 5: Verify

- [x] Run focused updater tests.
- [x] Run TypeScript typecheck.
- [x] Parse workflow YAML.

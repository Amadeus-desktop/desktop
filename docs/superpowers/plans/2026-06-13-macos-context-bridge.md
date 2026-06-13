# macOS Context Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build the Phase 3 backend slice that captures the current macOS foreground app, window title, idle state, and stores snapshots as local context events.

**Architecture:** Native macOS collection lives in `src-tauri/src/macos_context.rs` behind a small `ContextBridge` trait so behavior can be tested without AppKit/CoreGraphics. Tauri commands expose snapshot capture to React and persist context snapshots through the existing timeline repository. Non-macOS targets compile with an explicit unsupported fallback.

**Tech Stack:** Tauri 2, Rust, AppKit via `objc2-app-kit`, CoreGraphics/CoreFoundation, SQLite timeline repository, React/TypeScript

---

### Task 1: Native Context Types And Classification

**Files:**
- Create: `src-tauri/src/macos_context.rs`
- Modify: `src-tauri/Cargo.toml`

- [x] **Step 1: Add native dependency declarations**

Use direct dependencies for `objc2-app-kit`, `core-graphics`, and `core-foundation`.

- [x] **Step 2: Write unit tests for classification**

Test that known work apps classify as `work`, known drift apps classify as `non_work`, and unknown apps classify as `unknown`.

- [x] **Step 3: Implement context snapshot model**

Define `MacosContextSnapshot`, `AppCategory`, and pure classification helpers.

### Task 2: macOS Snapshot Collector

**Files:**
- Modify: `src-tauri/src/macos_context.rs`

- [x] **Step 1: Implement `ContextBridge` trait**

Expose `current_snapshot() -> Result<MacosContextSnapshot, MacosContextError>`.

- [x] **Step 2: Implement macOS native collector**

Use `NSWorkspace.frontmostApplication` for app metadata, `CGWindowListCopyWindowInfo` for active window title, and `CGEventSourceSecondsSinceLastEventType` for idle seconds.

- [x] **Step 3: Implement non-macOS fallback**

Return a clear unsupported snapshot/error while keeping compilation portable.

### Task 3: Tauri Commands And Timeline Persistence

**Files:**
- Modify: `src-tauri/src/macos_context.rs`
- Modify: `src-tauri/src/timeline.rs`
- Modify: `src-tauri/src/lib.rs`

- [x] **Step 1: Add context bridge state**

Register a `ContextBridgeState` in Tauri setup.

- [x] **Step 2: Add commands**

Expose:

```text
get_current_context_snapshot
capture_current_context_event
```

- [x] **Step 3: Persist capture command**

`capture_current_context_event` writes a `context_events` row with app/window/category/idle metadata.

### Task 4: Frontend Context Repository And UI Wiring

**Files:**
- Create: `src/features/context/types.ts`
- Create: `src/features/context/contextRepository.ts`
- Modify: `src/features/perception/usePerceptionStatus.ts`
- Modify: `src/features/perception/types.ts`
- Modify: `src/features/perception/LiveContextLog.tsx`

- [x] **Step 1: Mirror command types**

Create TypeScript types matching `MacosContextSnapshot`.

- [x] **Step 2: Add repository wrapper**

Call Tauri commands when available and use browser mock fallback otherwise.

- [x] **Step 3: Show native context in perception panel**

Load a snapshot and show active app, window title, idle state, and app category.

### Task 5: Verification

**Files:**
- Read: `src-tauri/src/macos_context.rs`
- Read: `src-features/context/contextRepository.ts`

- [x] **Step 1: Run Rust tests**

Run `cargo test --manifest-path src-tauri/Cargo.toml`.

- [x] **Step 2: Run frontend build**

Run `pnpm build`.

- [x] **Step 3: Run Rust check**

Run `cargo check --manifest-path src-tauri/Cargo.toml`.

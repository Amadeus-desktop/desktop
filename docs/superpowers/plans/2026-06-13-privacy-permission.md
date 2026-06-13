# Privacy Permission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build the Phase 4 privacy gate that assesses native context before capture, masks sensitive window titles, records filter decisions, and exposes screen capture permission status.

**Architecture:** Privacy classification is pure Rust in `src-tauri/src/privacy.rs` and is tested independently from macOS APIs. Native context capture flows through privacy assessment before it writes to SQLite. The frontend shows permission/filter status and uses the privacy-checked capture command.

**Tech Stack:** Tauri 2, Rust, CoreGraphics permission preflight, React, TypeScript, SQLite timeline repository

---

### Task 1: Privacy Classifier

**Files:**
- Create: `src-tauri/src/privacy.rs`
- Modify: `src-tauri/src/lib.rs`

- [x] **Step 1: Write failing classifier tests**

Tests cover password managers, sensitive window titles, custom keywords, and normal work context.

- [x] **Step 2: Implement privacy assessment**

Define `PrivacyAssessment`, `SensitiveReason`, and `assess_privacy`.

### Task 2: Permission And Privacy Commands

**Files:**
- Modify: `src-tauri/src/privacy.rs`
- Modify: `src-tauri/src/macos_context.rs`
- Modify: `src-tauri/src/lib.rs`

- [x] **Step 1: Add screen capture permission preflight**

Expose a command that reports whether screen capture permission is granted without requesting it.

- [x] **Step 2: Add privacy-checked context commands**

Expose current privacy assessment and privacy-checked context capture.

- [x] **Step 3: Mask sensitive title before DB write**

Sensitive contexts store `[민감 창 숨김]` instead of the original window title.

### Task 3: Frontend Privacy UI Wiring

**Files:**
- Modify: `src/features/context/types.ts`
- Modify: `src/features/context/contextRepository.ts`
- Modify: `src/features/perception/usePerceptionStatus.ts`
- Modify: `src/features/perception/PrivacyFilterCard.tsx`
- Modify: `src/features/perception/PerceptionPanel.tsx`

- [x] **Step 1: Mirror privacy command types**

Add TypeScript types for permission and assessment payloads.

- [x] **Step 2: Use privacy-checked capture**

Perception hook calls the privacy command and uses a redacted title when needed.

- [x] **Step 3: Show permission/filter status**

Privacy card displays filter activity, permission status, and sensitive reason.

### Task 4: Verification

**Files:**
- Read: `src-tauri/src/privacy.rs`
- Read: `src/features/context/contextRepository.ts`

- [x] **Step 1: Run Rust tests**

Run `cargo test --manifest-path src-tauri/Cargo.toml`.

- [x] **Step 2: Run frontend build**

Run `pnpm build`.

- [x] **Step 3: Run Rust check**

Run `cargo check --manifest-path src-tauri/Cargo.toml`.

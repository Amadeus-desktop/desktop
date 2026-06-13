# Trigger Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 5 trigger engine that turns privacy-checked context into Deep Pause, Milestone, or Drift utterance decisions with a Speakability Score.

**Architecture:** Trigger logic is pure Rust in `src-tauri/src/trigger.rs`, tested without macOS APIs. The Tauri command reads the current context through the existing bridge, applies privacy assessment, evaluates trigger rules, and persists utterance events only when the score says a bubble/conversation is allowed. Frontend companion UI calls the trigger repository instead of creating a hardcoded mock utterance.

**Tech Stack:** Tauri 2, Rust, React, TypeScript, SQLite timeline repository

---

### Task 1: Pure Trigger Engine

**Files:**
- Create: `src-tauri/src/trigger.rs`
- Modify: `src-tauri/src/lib.rs`

- [x] **Step 1: Write failing trigger tests**

Tests cover Deep Pause, Milestone, Drift, privacy suppression, cooldown, and dismissed-reaction penalty.

- [x] **Step 2: Implement trigger types and score logic**

Define trigger candidates, action bands, score clamping, and template messages.

### Task 2: Tauri Trigger Commands

**Files:**
- Modify: `src-tauri/src/trigger.rs`
- Modify: `src-tauri/src/lib.rs`

- [x] **Step 1: Add trigger runtime state**

Track last utterance time, daily utterance count, and recent dismissed reactions in memory.

- [x] **Step 2: Add run command**

Expose `run_trigger_engine_once`, which captures privacy-checked context and persists an utterance when allowed.

- [x] **Step 3: Add reaction scoring command**

Expose `record_trigger_reaction_for_scoring` so dismissed/closed reactions can lower later scores.

### Task 3: Frontend Trigger Wiring

**Files:**
- Create: `src/features/trigger/types.ts`
- Create: `src/features/trigger/triggerRepository.ts`
- Modify: `src/features/companion/useCompanionBubble.ts`

- [x] **Step 1: Mirror trigger command types**

Add TypeScript types for trigger evaluation and run result.

- [x] **Step 2: Use trigger engine in companion shell**

Replace mock initial utterance creation with `runTriggerEngineOnce`.

- [x] **Step 3: Feed dismiss/reply reactions back into scoring**

Call `recordTriggerReactionForScoring` alongside existing reaction persistence.

### Task 4: Verification

**Files:**
- Read: `src-tauri/src/trigger.rs`
- Read: `src/features/trigger/triggerRepository.ts`

- [x] **Step 1: Run Rust tests**

Run `cargo test --manifest-path src-tauri/Cargo.toml`.

- [x] **Step 2: Run frontend build**

Run `pnpm build`.

- [x] **Step 3: Run Rust check**

Run `cargo check --manifest-path src-tauri/Cargo.toml`.

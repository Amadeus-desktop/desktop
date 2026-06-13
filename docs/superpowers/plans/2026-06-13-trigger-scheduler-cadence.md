# Trigger Scheduler Cadence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the active companion evaluate trigger opportunities automatically without stacking intrusive bubbles.

**Architecture:** Rust owns trigger runtime cadence metadata so polling cannot hammer context evaluation. React owns UI cadence, skipping scheduled checks while a bubble or chat is visible. The existing `run_trigger_engine_once` command remains the explicit evaluation path, while a new poll command adds a minimum backend evaluation interval for automatic scheduling.

**Tech Stack:** Tauri 2, Rust, React, TypeScript, Vite

---

### Task 1: Backend Poll Cadence

**Files:**
- Modify: `src-tauri/src/trigger.rs`
- Modify: `src-tauri/src/lib.rs`

- [x] **Step 1: Write failing cadence tests**

Tests cover first poll allowance, immediate repeated poll suppression, and poll allowance after the minimum interval.

- [x] **Step 2: Implement runtime cadence state**

Track the last automatic evaluation time in `TriggerRuntimeState` and expose a poll decision that returns `ready`, `wait_seconds`, and a suppression reason.

- [x] **Step 3: Add automatic poll command**

Expose `poll_trigger_engine`, which only calls the existing trigger evaluation when cadence permits it.

### Task 2: Frontend Scheduler

**Files:**
- Modify: `src/features/trigger/types.ts`
- Modify: `src/features/trigger/triggerRepository.ts`
- Modify: `src/features/companion/useCompanionBubble.ts`

- [x] **Step 1: Mirror poll result types**

Add TypeScript types for poll results and cadence metadata.

- [x] **Step 2: Add trigger polling repository method**

Add `pollTriggerEngine` with Tauri invoke and browser mock behavior.

- [x] **Step 3: Schedule quiet trigger checks**

Update the companion hook to run an immediate check, then scheduled checks. Skip scheduled checks while the bubble or chat is already visible.

### Task 3: Verification

**Files:**
- Read: `src-tauri/src/trigger.rs`
- Read: `src/features/companion/useCompanionBubble.ts`

- [x] **Step 1: Run Rust tests**

Run `cargo test --manifest-path src-tauri/Cargo.toml`.

- [x] **Step 2: Run frontend build**

Run `pnpm build`.

- [x] **Step 3: Run Rust check**

Run `cargo check --manifest-path src-tauri/Cargo.toml`.

- [x] **Step 4: Verify browser render**

Run the local Vite app and confirm the companion bubble can still appear without console errors.

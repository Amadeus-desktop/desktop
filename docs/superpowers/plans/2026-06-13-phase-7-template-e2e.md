# Phase 7 Template E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Phase 7 MVP integration using the existing template utterance provider.

**Architecture:** Rust remains responsible for context, privacy, trigger eligibility, persistence, and scoring feedback. React presents persisted trigger utterances and records explicit or implicit reactions back to SQLite and the trigger runtime. The LLM provider remains out of scope and `provider: "template"` is the MVP fallback source.

**Tech Stack:** Tauri 2, Rust, React, TypeScript, SQLite, Drizzle schema, pnpm

---

### Task 1: Ignored Reaction Scoring

**Files:**
- Modify: `src-tauri/src/trigger.rs`

- [ ] **Step 1: Write the failing Rust test**

Add this test inside `src-tauri/src/trigger.rs` in the existing `#[cfg(test)] mod tests` block:

```rust
#[test]
fn runtime_counts_ignored_as_negative_feedback() {
    let mut runtime = TriggerRuntimeState::default();

    runtime.record_reaction("ignored");

    assert_eq!(runtime.snapshot().dismissed_recent_count, 1);
}
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml runtime_counts_ignored_as_negative_feedback
```

Expected: the test fails because `ignored` is not counted as negative feedback.

- [ ] **Step 3: Implement minimal scoring change**

Change `TriggerRuntimeState::record_reaction` so the negative branch includes `ignored`:

```rust
match reaction_type {
    "dismissed" | "closed" | "ignored" => {
        self.dismissed_recent_count = (self.dismissed_recent_count + 1).min(5);
    }
    "opened" | "replied" => {
        self.dismissed_recent_count = 0;
    }
    _ => {}
}
```

- [ ] **Step 4: Run focused test and verify GREEN**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml runtime_counts_ignored_as_negative_feedback
```

Expected: the focused test passes.

### Task 2: Bubble Auto-Ignore Reaction

**Files:**
- Modify: `src/features/companion/useCompanionBubble.ts`

- [ ] **Step 1: Add auto-ignore reaction on timeout**

Update the bubble timeout effect so trigger-created bubbles record `ignored` when they auto-disappear:

```ts
useEffect(() => {
  if (!bubbleVisible) return;

  const timeoutId = window.setTimeout(() => {
    setBubbleVisible(false);
    if (activeUtteranceId) {
      void recordReaction(activeUtteranceId, "ignored");
    }
  }, 7000);

  return () => window.clearTimeout(timeoutId);
}, [activeUtteranceId, bubbleVisible]);
```

- [ ] **Step 2: Preserve explicit reactions**

Confirm `dismissBubble`, `openChat`, `sendMessage`, and `closeChat` still call `recordReaction` with `dismissed`, `opened`, `replied`, and `closed`.

### Task 3: Verification

**Files:**
- Read: `src-tauri/src/trigger.rs`
- Read: `src/features/companion/useCompanionBubble.ts`

- [ ] **Step 1: Run all Rust tests**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: all Rust tests pass.

- [ ] **Step 2: Run frontend build**

Run:

```bash
pnpm build
```

Expected: TypeScript and Vite build pass.

- [ ] **Step 3: Run Rust check**

Run:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

Expected: Rust check exits 0.

# Local Timeline Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 2 backend slice that persists context, utterance, and reaction events to local SQLite and exposes them to the React UI through Tauri commands.

**Architecture:** Drizzle owns the TypeScript schema and migration shape. Runtime SQLite access stays in Rust behind Tauri commands, so the React WebView never depends on a Node SQLite driver. The frontend calls a thin timeline repository and falls back to mock data only when running outside Tauri.

**Tech Stack:** Tauri 2, Rust, rusqlite, SQLite, Drizzle, React, TypeScript, pnpm

---

### Task 1: Drizzle Schema And Migration

**Files:**
- Modify: `package.json`
- Create: `drizzle.config.ts`
- Create: `src/db/schema.ts`
- Create: `drizzle/0000_local_timeline_core.sql`

- [x] **Step 1: Add Drizzle packages**

Run:

```bash
pnpm add drizzle-orm
pnpm add -D drizzle-kit
```

Expected: `package.json` and `pnpm-lock.yaml` include Drizzle packages.

- [x] **Step 2: Define schema**

Create `src/db/schema.ts` with `contextEvents`, `utteranceEvents`, and `userReactions`.

- [x] **Step 3: Add initial SQL migration**

Create `drizzle/0000_local_timeline_core.sql` with the same table names and columns as the schema.

### Task 2: Rust SQLite Repository

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/timeline.rs`
- Modify: `src-tauri/src/lib.rs`

- [x] **Step 1: Add SQLite dependency**

Add `rusqlite` with bundled SQLite support.

- [x] **Step 2: Write repository tests first**

Tests must prove that inserting context, utterance, and reaction rows can be read back as timeline rows.

- [x] **Step 3: Implement repository and migration runner**

The repository owns SQLite access and creates tables on startup.

### Task 3: Tauri Command Contract

**Files:**
- Modify: `src-tauri/src/timeline.rs`
- Modify: `src-tauri/src/lib.rs`

- [x] **Step 1: Expose commands**

Add:

```text
create_context_event
create_utterance_event
create_user_reaction
list_timeline_events
```

- [x] **Step 2: Register state and invoke handler**

Initialize SQLite under the app data directory and register the commands.

### Task 4: Frontend Timeline Repository

**Files:**
- Create: `src/features/timeline/types.ts`
- Create: `src/features/timeline/timelineRepository.ts`
- Modify: `src/features/report/useReport.ts`
- Modify: `src/features/report/ReportPanel.tsx`
- Modify: `src/features/report/WorkTimeline.tsx`
- Modify: `src/features/companion/useCompanionBubble.ts`

- [x] **Step 1: Add TypeScript command types**

Mirror the Tauri command payloads and timeline row shape.

- [x] **Step 2: Add repository wrapper**

Use `@tauri-apps/api/core` `invoke` when Tauri is available, and mock fallback in browser-only dev.

- [x] **Step 3: Connect report and companion flows**

Read recent timeline rows for the report panel and record click/close/send reactions from the companion shell.

### Task 5: Verification

**Files:**
- Read: `package.json`
- Read: `src-tauri/src/timeline.rs`
- Read: `src/features/timeline/timelineRepository.ts`

- [x] **Step 1: Run Rust tests**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: repository tests pass.

- [x] **Step 2: Run frontend build**

Run:

```bash
pnpm build
```

Expected: TypeScript and Vite build pass.

- [x] **Step 3: Run Rust check**

Run:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

Expected: check exits 0.

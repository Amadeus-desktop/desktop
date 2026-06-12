# Feature-first Control Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Amadeus UI as a React/Vite SPA using a feature-first structure, with `templete.html` as a mockup reference and `index.html` as the only HTML entrypoint.

**Architecture:** `app/` only composes the application. `features/*` owns feature UI, hooks, model data, and local state. `ui/` contains domain-agnostic macOS-style primitives without a `shared/` or `ui/macos/` layer.

**Tech Stack:** Tauri, React, Vite, Tailwind CSS v4, TypeScript, pnpm

---

### Task 1: Feature-first Source Layout

**Files:**
- Create: `src/app/App.tsx`
- Create: `src/app/App.css`
- Modify: `src/main.tsx`
- Delete: `src/App.tsx`
- Delete: `src/App.css`

- [x] **Step 1: Move app entry composition**

Create `src/app/App.tsx` with `ControlCenter` and `CompanionShell` composition.

- [x] **Step 2: Move global stylesheet**

Create `src/app/App.css` with Tailwind v4 import and macOS body defaults.

- [x] **Step 3: Update `src/main.tsx`**

Import `App` from `./app/App`.

### Task 2: UI Primitives

**Files:**
- Create: `src/ui/MacWindow.tsx`
- Create: `src/ui/WindowControls.tsx`
- Create: `src/ui/Sidebar.tsx`
- Create: `src/ui/SidebarItem.tsx`
- Create: `src/ui/SectionHeading.tsx`
- Create: `src/ui/SettingRow.tsx`
- Create: `src/ui/IosSwitch.tsx`
- Create: `src/ui/MacSelect.tsx`
- Create: `src/ui/MacInput.tsx`
- Create: `src/ui/ReportCard.tsx`
- Create: `src/ui/TimelineList.tsx`
- Create: `src/ui/StatusPill.tsx`

- [x] **Step 1: Build presentational primitives**

Implement each primitive with props only and no Amadeus domain state.

### Task 3: Feature Modules

**Files:**
- Create: `src/features/control-center/ControlCenter.tsx`
- Create: `src/features/control-center/hooks/useControlCenter.ts`
- Create: `src/features/control-center/model/tabs.ts`
- Create: `src/features/character/CharacterPanel.tsx`
- Create: `src/features/character/components/CharacterCard.tsx`
- Create: `src/features/character/hooks/useCharacterSelection.ts`
- Create: `src/features/character/model/characters.ts`
- Create: `src/features/character/model/types.ts`
- Create: `src/features/settings/SettingsPanel.tsx`
- Create: `src/features/settings/hooks/useSettings.ts`
- Create: `src/features/settings/model/settings.ts`
- Create: `src/features/settings/model/types.ts`
- Create: `src/features/perception/PerceptionPanel.tsx`
- Create: `src/features/perception/components/LiveContextLog.tsx`
- Create: `src/features/perception/components/PrivacyFilterCard.tsx`
- Create: `src/features/perception/hooks/usePerceptionStatus.ts`
- Create: `src/features/perception/model/perception.ts`
- Create: `src/features/perception/model/types.ts`
- Create: `src/features/report/ReportPanel.tsx`
- Create: `src/features/report/components/FocusSummaryGrid.tsx`
- Create: `src/features/report/components/WorkTimeline.tsx`
- Create: `src/features/report/hooks/useReport.ts`
- Create: `src/features/report/model/report.ts`
- Create: `src/features/report/model/types.ts`
- Create: `src/features/companion/CompanionShell.tsx`
- Create: `src/features/companion/components/CompanionBubble.tsx`
- Create: `src/features/companion/components/CompanionChatPanel.tsx`
- Create: `src/features/companion/hooks/useCompanionBubble.ts`
- Create: `src/features/companion/model/companion.ts`
- Create: `src/features/companion/model/types.ts`

- [x] **Step 1: Implement tabs and feature hooks**

Each hook owns local state for its feature.

- [x] **Step 2: Implement feature panels**

Recreate `templete.html` as React SPA panels using feature-owned model data.

### Task 4: Verification

**Files:**
- Read: `package.json`
- Read: `src/main.tsx`
- Read: `src/app/App.tsx`

- [x] **Step 1: Build frontend**

Run: `pnpm build`

Expected: build exits 0.

- [x] **Step 2: Check Rust side**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`

Expected: check exits 0.

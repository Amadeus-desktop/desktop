# Amadeus Paper Companion MVP v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the PRD v2 desktop companion interaction into a grug-informed Paper Companion UI using React state and mock data only.

**Architecture:** Keep all product interaction code inside `src/features/companion` for this pass. `CompanionShell` owns the mode state machine, selected persona, chat state, daily care preview state, and local timeline. Presentational components render a left-bottom floating paper-note companion and do not call native commands, Supabase, SQLite, or LLM providers.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS utilities, lucide-react icons. Consider adding `motion` only if layout transitions need more than CSS can provide.

---

## File Structure

- Modify `src/features/companion/types.ts`: update `CompanionMode` to `quiet | new_note | nudge | pocket | deep | daily_care | sleep`, and add persona, provider, message, and timeline event types.
- Create `src/features/companion/mockProvider.ts`: pure mock nudge, pocket intro, deep reply, persona, memory, and world data.
- Modify `src/features/companion/companionState.ts`: replace technical context labels with user-facing status copy.
- Replace `src/features/companion/CompanionShell.tsx`: own Paper Companion state machine.
- Modify `src/features/companion/FloatingMessageIcon.tsx`: left-bottom folded-note icon and subtle badge.
- Modify `src/features/companion/NudgeNote.tsx`: short paper memo with no input.
- Modify `src/features/companion/PocketChat.tsx`: small paper-room panel, not a black/glass chat app.
- Modify `src/features/companion/DeepChatView.tsx`: same paper panel, deeper listening state.
- Add `src/features/companion/PersonaSwitcher.tsx`: demo persona switcher.
- Replace `src/features/companion/ContextDepthIndicator.tsx` with `ContextStatus` or update it to show emotional status copy.
- Modify `src/features/companion/LocalTimeline.tsx`: make debug event list visually subordinate.
- Create `src/features/companion/DailyCareNotePreview.tsx`: Phase v3 preview card.
- Update `src/features/companion/index.ts`: export the new public components/types.

## Tasks

### Task 1: Domain Contract Update

- [ ] Rename `peek` mode to `nudge`.
- [ ] Add `daily_care` mode.
- [ ] Add `daily_care_opened` timeline event.
- [ ] Replace technical context labels with user-facing copy:
  - `조용히 곁에 있음`
  - `방금 남긴 메모에서 이어지는 중`
  - `조금 더 깊게 듣는 중`
  - `오늘을 같이 접는 중`
  - `쉬는 중`
- [ ] Verify with `pnpm build`.

### Task 2: Paper Visual System

- [ ] Move the floating anchor from right-bottom to left-bottom.
- [ ] Replace black/glass panel styling with paper/ink styling.
- [ ] Remove user-facing technical labels such as `Deep Context` and `local mock`.
- [ ] Replace prompt-like input language with companion copy.
- [ ] Keep NudgeNote 220-280px wide and input-free.
- [ ] Keep PocketChat 320-360px wide and visually like a small paper room.
- [ ] Keep DeepChat in the same panel, but change status to `조금 더 깊게 듣는 중`.
- [ ] Make `LocalTimeline` smaller and clearly debug-only.
- [ ] Verify with `pnpm build`.

### Task 3: Daily Care Preview

- [ ] Add `DailyCareNotePreview`.
- [ ] Add a low-priority preview entry that does not interrupt the main flow.
- [ ] Use copy:
  - `오늘 꽤 힘냈어.`
  - `네가 노력한 거 같이 확인해볼까?`
- [ ] Show mock review values:
  - 함께 있었던 시간 `2시간 40분`
  - 아마가 남긴 메모 `3개`
  - 오늘의 감정 키워드 `버팀 · 막힘 · 다시 시작`
- [ ] Log `daily_care_opened`.
- [ ] Verify with `pnpm build`.

### Task 4: State Machine Integration

- [ ] Ensure `new_note -> nudge -> pocket -> deep -> daily_care` works.
- [ ] Ensure `pocket` opens only after user click.
- [ ] Ensure `deep` opens only after user input.
- [ ] Ensure persona switch changes later deep replies.
- [ ] Ensure dismiss and ignore return to `quiet`.
- [ ] Verify with `pnpm build`.

### Task 5: Browser QA

- [ ] Start Vite dev server with `pnpm dev`.
- [ ] Open the local app in Browser.
- [ ] Check:
  - quiet/new note icon appears at the left-bottom.
  - clicking icon shows paper NudgeNote.
  - clicking NudgeNote opens PocketChat.
  - submitting `과제하고 있는데 힘들어` opens DeepChat.
  - switching persona changes generated reply tone.
  - user-facing UI does not show `Deep Context`, `local mock`, or assistant/prompt wording.
  - Daily Care preview opens without taking over the flow.
  - LocalTimeline records required event names.
- [ ] Stop any dev server started for QA.

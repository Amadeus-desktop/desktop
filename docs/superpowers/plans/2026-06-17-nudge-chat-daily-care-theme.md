# Nudge Chat Daily Care Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure Nudge chat opens with the persona's nudge message first, keep Daily Care messages out of persisted chat sessions, and make NudgeNote theme-aware for dark mode.

**Architecture:** Put Nudge opening message composition in a small tested helper, then call it from `useCompanionChatActions`. Remove Daily Care persistence calls from the Daily Care session hook. Adjust existing shell CSS variables rather than adding component-specific color branches.

**Tech Stack:** React, TypeScript, Vitest, Tailwind CSS variables.

---

### Task 1: Nudge Opening Message Helper

**Files:**
- Create: `src/features/companion/lib/openingMessages.test.ts`
- Create: `src/features/companion/lib/openingMessages.ts`
- Modify: `src/features/companion/hooks/useCompanionChatActions.ts`

- [x] Test that a visible nudge is prepended before restored messages.
- [x] Test that blank nudge falls back to the persona intro.
- [x] Use the helper when opening pocket chat and selecting a persona.

### Task 2: Daily Care Session Boundary

**Files:**
- Modify: `src/features/report/daily-care/hooks/useDailyCareMessageSession.ts`

- [x] Remove `persistCompanionMessage` calls from Daily Care.
- [x] Keep local Daily Care overlay history unchanged.

### Task 3: NudgeNote Theme Tokens

**Files:**
- Modify: `src/ui/theme/shellVariables.ts`

- [x] Change dark-mode `--companion-paper-*` tokens from light paper colors to shell/accent-aware dark colors.
- [x] Keep light-mode warm paper tokens intact.

### Task 4: Verify

- [x] Run `pnpm run typecheck`.
- [x] Attempt focused Vitest and report if runner still hangs.

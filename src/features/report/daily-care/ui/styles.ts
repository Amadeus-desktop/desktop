import { glassStyles, shellText } from "../../../../ui/theme/shellStyles";

export const dailyCareMotion = {
  enterMs: 780,
  exitMs: 640,
} as const;

export const dailyCareStyles = {
  overlay:
    "pointer-events-none absolute inset-0 overflow-hidden text-[color:var(--shell-ink)]",
  scrim: [
    "pointer-events-none absolute inset-0",
    "bg-[color:var(--daily-care-scrim)] backdrop-blur-sm",
  ].join(" "),
  scrimEnter: "animate-daily-care-scrim-in",
  scrimExit: "animate-daily-care-scrim-out",
  sheet: [
    "pointer-events-auto absolute inset-0 flex min-h-0 flex-col overflow-hidden",
    glassStyles.radiusWindow,
    "border border-[color:var(--shell-border-subtle)]",
    "bg-[color:var(--daily-care-sheet)] shadow-daily-care-sheet",
    "will-change-transform",
  ].join(" "),
  sheetEnter: "animate-daily-care-sheet-rise",
  sheetExit: "animate-daily-care-sheet-fall",
  titlebarDrag: [
    "shrink-0 border-b border-white/[0.06]",
    "bg-[#151214]",
  ].join(" "),
  messageShell: "relative flex min-h-0 flex-1 flex-col bg-[#181416]",
  messageHeader: [
    "flex shrink-0 items-center gap-2.5 border-b border-white/[0.06]",
    "bg-[#151214] px-4 py-3",
  ].join(" "),
  messageAvatar:
    "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.05]",
  messageTitle: "truncate text-[14px] font-semibold leading-tight text-[color:var(--shell-ink)]",
  messageStatus: "truncate text-[11px] leading-4 text-[color:var(--shell-ink-faint)]",
  messageBody: "scrollbar-hide min-h-0 flex-1 overflow-y-auto px-4 py-4",
  replyBar: [
    "shrink-0 border-t border-white/[0.06]",
    "bg-[linear-gradient(180deg,rgb(21_18_20/0.2),rgb(21_18_20/0.96))]",
    "px-4 py-3",
  ].join(" "),
  replyHint: "mb-2 text-[11px] font-medium text-[color:var(--shell-ink-faint)]",
  replyOptions: "flex flex-col gap-2",
  replyOption: [
    "tauri-interactive w-full rounded-[14px] border border-[color:rgb(var(--accent-rgb)/0.34)]",
    "bg-[color:rgb(var(--accent-rgb)/0.10)] px-4 py-3 text-left text-[13px] font-medium leading-snug",
    "text-[color:var(--shell-ink)] shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]",
    "transition hover:border-[color:rgb(var(--accent-rgb)/0.48)] hover:bg-[color:rgb(var(--accent-rgb)/0.16)]",
    "active:scale-[0.99]",
  ].join(" "),
  replyCustomForm: "mt-2",
  replyCustomWrap: [
    "flex items-center gap-2 rounded-[14px] border border-white/10",
    "bg-white/[0.05] px-3 py-1.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]",
  ].join(" "),
  replyCustomInput:
    "min-w-0 flex-1 bg-transparent px-1 py-1.5 text-[13px] text-[color:var(--shell-ink)] outline-none placeholder:text-[color:var(--shell-ink-faint)] disabled:opacity-45",
  replyCustomSend: "size-8 shrink-0 rounded-full p-0",
  activityCard: [
    "flex items-center gap-3 rounded-[14px] border border-white/[0.08]",
    "bg-black/15 px-3 py-2.5",
  ].join(" "),
  progressWrap:
    "shrink-0 border-t border-[color:var(--shell-border-subtle)] px-7 pb-5 pt-4",
  progressDotActive: "h-1.5 w-6 bg-[color:var(--shell-ink-muted)]",
  progressDotDone: "h-1.5 w-1.5 bg-[color:var(--shell-ink-muted)]",
  progressDotIdle: "h-1.5 w-1.5 bg-[color:var(--shell-border-subtle)]",
  progressLabel: `mt-2 text-center text-[10px] font-medium tracking-wide ${shellText.faint}`,
  stepEyebrow:
    "text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--shell-ink-faint)]",
  stepTitle: "font-semibold text-[color:var(--shell-ink)]",
  stepDescription: "mx-auto max-w-[28rem] leading-[1.55] text-[color:var(--shell-ink-muted)]",
  momentCard: [
    "mx-auto flex w-full max-w-[20rem] items-center gap-3",
    glassStyles.radiusBubble,
    "border border-[color:var(--shell-border-subtle)] bg-[color:var(--shell-row)] px-4 py-3",
  ].join(" "),
  momentTime: `text-[12px] ${shellText.muted}`,
  closeButton:
    "ml-auto h-8 w-8 shrink-0 px-0 text-[color:var(--shell-ink-muted)] hover:text-[color:var(--shell-ink)]",
  keywordChip:
    "rounded-full border border-[color:var(--shell-border-strong)] bg-[color:var(--shell-row-hover)] px-2.5 py-1 text-[12px] text-[color:var(--shell-ink-muted)]",
} as const;

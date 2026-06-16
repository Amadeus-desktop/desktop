/** Solid macOS-style surfaces — token-driven for dark/light appearance. */
export const glassStyles = {
  shell:
    "border border-[color:var(--shell-border)] bg-[color:var(--shell-bg)]",
  panel:
    "border border-[color:var(--shell-border)] bg-[color:var(--shell-panel)]",
  panelStrong:
    "border border-[color:var(--shell-border-strong)] bg-[color:var(--shell-panel-strong)]",
  row:
    "border border-[color:var(--shell-border-subtle)] bg-[color:var(--shell-row)] transition hover:border-[color:var(--shell-border-strong)] hover:bg-[color:var(--shell-row-hover)]",
  rowSelected:
    "border-[color:var(--shell-selection-border)] bg-[color:var(--shell-selection-bg)] shadow-[inset_0_0_0_1px_var(--shell-selection-border)]",
  chip:
    "border border-[color:var(--shell-border-strong)] bg-[color:var(--shell-panel-strong)]",
  bubble:
    "border border-[color:var(--shell-border)] bg-[color:var(--shell-row-hover)]",
  sidebar:
    "border-r border-[color:var(--shell-sidebar-border)] bg-[color:var(--shell-sidebar)]",
  radiusWindow: "rounded-[28px]",
  radiusPanel: "rounded-[22px]",
  radiusCard: "rounded-[18px]",
  radiusBubble: "rounded-[16px]",
  radiusChip: "rounded-full",
} as const;

export const shellText = {
  primary: "text-[color:var(--shell-ink)]",
  muted: "text-[color:var(--shell-ink-muted)]",
  faint: "text-[color:var(--shell-ink-faint)]",
} as const;

export const shellFieldClass =
  "w-full rounded-[14px] border border-[color:var(--shell-border-strong)] bg-[color:var(--shell-panel-strong)] px-3 py-2 text-left text-[12px] text-[color:var(--shell-ink)] outline-none transition focus:border-[color:rgb(var(--accent-rgb)/0.45)]";

export const shellBadgeClass =
  "rounded-full border border-[color:var(--shell-border-strong)] bg-[color:var(--shell-panel-strong)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--shell-ink-muted)]";

export const characterVoicePreviewClass = [
  "rounded-[14px] border border-[color:var(--character-voice-border)]",
  "bg-[linear-gradient(168deg,var(--character-voice-bg)_0%,var(--character-voice-bg-deep)_100%)]",
  "px-3 py-2.5",
].join(" ");

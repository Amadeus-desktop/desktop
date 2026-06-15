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
    "border-[color:rgb(var(--accent-rgb)/0.45)] bg-[color:rgb(var(--accent-rgb)/0.08)] shadow-[inset_0_0_0_1px_rgb(var(--accent-rgb)/0.22)]",
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

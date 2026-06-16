import { glassStyles, shellText } from "../../../ui/theme/shellStyles";
import type { ReportMetric } from "../types";

export const dailyCareMotion = {
  enterMs: 780,
  exitMs: 640,
} as const;

/** Matches onboarding drag handle / native traffic-light safe area (`h-11`). */
export const dailyCareTitlebarClass = "top-11 h-11";

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
  sheetGradient: "pointer-events-none absolute inset-0 bg-daily-care-sheet-gradient",
  sheetGlow: "pointer-events-none absolute inset-0 bg-daily-care-sheet-glow",
  header: "relative flex items-center justify-between gap-4 px-7 py-5",
  headerEyebrow:
    "text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--shell-ink-faint)]",
  headerTitle: "mt-1 text-[15px] font-semibold text-[color:var(--shell-ink-muted)]",
  body: "scrollbar-hide flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-7 py-4",
  footer: "relative border-t border-[color:var(--shell-border-subtle)] px-7 py-4",
  footerActions: "mx-auto flex w-full max-w-[34rem] flex-col gap-2",
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
  metricValue: "text-[42px] font-semibold tracking-tight text-[color:var(--shell-ink)]",
  keywordChip:
    "rounded-full border border-[color:var(--shell-border-strong)] bg-[color:var(--shell-row-hover)] px-3 py-1.5 text-[13px] text-[color:var(--shell-ink-muted)]",
  momentCard: [
    "mx-auto flex w-full max-w-[20rem] items-center gap-3",
    glassStyles.radiusBubble,
    "border border-[color:var(--shell-border-subtle)] bg-[color:var(--shell-row)] px-4 py-3",
  ].join(" "),
  momentTime: `text-[12px] ${shellText.muted}`,
  heroButton: [
    "tauri-interactive mb-4 w-full px-4 py-3.5 text-left transition",
    glassStyles.radiusPanel,
    "border border-[color:rgb(var(--accent-rgb)/0.22)]",
    "bg-gradient-to-br from-[color:rgb(var(--accent-rgb)/0.14)] via-[color:var(--shell-row-hover)] to-[color:var(--shell-row)]",
    "hover:border-[color:rgb(var(--accent-rgb)/0.36)] hover:brightness-105",
  ].join(" "),
  heroPrompt: "text-[13px] leading-6 text-[color:var(--accent-soft)]",
  closeButton:
    "h-8 w-8 px-0 text-[color:var(--shell-ink-muted)] hover:text-[color:var(--shell-ink)]",
} as const;

export const reportMetricToneStyles: Record<
  ReportMetric["tone"],
  { card: string; value: string }
> = {
  rose: {
    card: "from-[color:rgb(var(--accent-rgb)/0.18)] to-[color:var(--shell-row-hover)] border-[color:rgb(var(--accent-rgb)/0.22)]",
    value: "text-[color:var(--accent-soft)]",
  },
  lavender: {
    card: "from-[color:var(--report-tone-lavender)/0.16] to-[color:var(--report-tone-lavender-bg)] border-[color:var(--report-tone-lavender)/0.20]",
    value: "text-[color:var(--report-tone-lavender-soft)]",
  },
  peach: {
    card: "from-[color:var(--report-tone-peach)/0.14] to-[color:var(--report-tone-peach-bg)] border-[color:var(--report-tone-peach)/0.18]",
    value: "text-[color:var(--report-tone-peach-soft)]",
  },
  mint: {
    card: "from-[color:var(--report-tone-mint)/0.14] to-[color:var(--report-tone-mint-bg)] border-[color:var(--report-tone-mint)/0.18]",
    value: "text-[color:var(--report-tone-mint-soft)]",
  },
};

export const reportPanelStyles = {
  refreshButton:
    "h-7 gap-1.5 px-2.5 text-[color:var(--shell-ink-muted)] hover:text-[color:var(--shell-ink)]",
  card: `${glassStyles.radiusCard} border bg-gradient-to-br p-3.5`,
  cardLabel: `text-[10px] leading-4 ${shellText.faint}`,
  cardValue: "mt-1 text-lg font-semibold tracking-tight",
  timelinePanel: `${glassStyles.radiusCard} border ${glassStyles.panel} p-4 text-[13px]`,
  timelineExpandButton: [
    "w-full",
    glassStyles.radiusCard,
    "border border-[color:var(--shell-border-subtle)] bg-[color:var(--shell-row)]",
    "text-[color:var(--shell-ink-muted)] hover:text-[color:var(--shell-ink)]",
  ].join(" "),
  closingCard: `${glassStyles.radiusCard} border ${glassStyles.panel} p-3.5`,
  closingAccentCard: [
    glassStyles.radiusCard,
    "border border-[color:rgb(var(--accent-rgb)/0.20)] p-4",
    "bg-gradient-to-br from-[color:rgb(var(--accent-rgb)/0.10)] to-[color:var(--shell-row)]",
  ].join(" "),
  keywordChip:
    "rounded-full border border-[color:rgb(var(--accent-rgb)/0.25)] bg-[color:rgb(var(--accent-rgb)/0.10)] px-2.5 py-0.5 text-[11px] text-[color:var(--accent-soft)]",
} as const;

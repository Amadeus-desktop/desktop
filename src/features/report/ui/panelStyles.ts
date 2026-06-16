import { glassStyles, shellText } from "../../../ui/theme/shellStyles";
import type { ReportMetric } from "../types";

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
  heroButton: [
    "tauri-interactive mb-4 w-full px-4 py-3.5 text-left transition",
    glassStyles.radiusPanel,
    "border border-[color:rgb(var(--accent-rgb)/0.22)]",
    "bg-gradient-to-br from-[color:rgb(var(--accent-rgb)/0.14)] via-[color:var(--shell-row-hover)] to-[color:var(--shell-row)]",
    "hover:border-[color:rgb(var(--accent-rgb)/0.36)] hover:brightness-105",
  ].join(" "),
  heroPrompt: "text-[13px] leading-6 text-[color:var(--accent-soft)]",
} as const;

import type { AppLocale } from "../../i18n/types";

export function formatReportDuration(
  durationMs: number,
  labels: AppLocale["report"]["format"],
): string {
  if (durationMs <= 0) {
    return labels.zeroDuration;
  }

  const totalMinutes = Math.max(1, Math.round(durationMs / 1000 / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return labels.hoursMinutes
      .replace("{hours}", String(hours))
      .replace("{minutes}", String(minutes));
  }

  if (hours > 0) {
    return labels.hoursOnly.replace("{hours}", String(hours));
  }

  return labels.minutesOnly.replace("{minutes}", String(minutes));
}

export function formatUtteranceCount(
  count: number,
  labels: AppLocale["report"]["format"],
): string {
  if (count <= 0) {
    return labels.zeroUtterances;
  }

  return labels.utteranceCount.replace("{count}", String(count));
}

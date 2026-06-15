import type { AppLocale } from "../../i18n";
import type { ReportMetric } from "./types";

export function getReportMetrics(locale: AppLocale): ReportMetric[] {
  return [
    {
      id: "focus-time",
      label: locale.report.metrics.focusTime,
      value: locale.report.fallback.focusTimeValue,
      accent: "text-[#34c759]",
    },
    {
      id: "utterances",
      label: locale.report.metrics.utterances,
      value: locale.report.fallback.utterancesValue,
      accent: "text-[#bf5af2]",
    },
  ];
}

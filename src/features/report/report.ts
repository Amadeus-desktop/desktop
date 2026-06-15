import type { AppLocale } from "../../i18n";
import {
  aggregateFocusTimeMs,
  countUtterancesToday,
  filterEventsForToday,
  formatReportDuration,
  formatUtteranceCount,
} from "../../domain/report";
import type { TimelineEvent } from "../timeline/types";
import type { ReportMetric } from "./types";

export function buildReportMetrics(
  events: TimelineEvent[],
  locale: AppLocale,
): ReportMetric[] {
  const todayEvents = filterEventsForToday(events);

  return [
    {
      id: "focus-time",
      label: locale.report.metrics.focusTime,
      value: formatReportDuration(
        aggregateFocusTimeMs(todayEvents),
        locale.report.format,
      ),
      accent: "text-[#34c759]",
    },
    {
      id: "utterances",
      label: locale.report.metrics.utterances,
      value: formatUtteranceCount(
        countUtterancesToday(todayEvents),
        locale.report.format,
      ),
      accent: "text-[#bf5af2]",
    },
  ];
}

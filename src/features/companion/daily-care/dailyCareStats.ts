import {
  aggregateFocusTimeMs,
  countUtterancesToday,
  filterEventsForToday,
  formatReportCount,
  formatReportDuration,
} from "../../../domain/report";
import type { AppLocale } from "../../../i18n";
import type { TimelineEvent } from "../../timeline/types";

export type DailyCareStats = {
  togetherTimeValue: string;
  noteCountValue: string;
};

export function buildDailyCareStats(
  events: TimelineEvent[],
  locale: AppLocale,
): DailyCareStats {
  const todayEvents = filterEventsForToday(events);

  return {
    togetherTimeValue: formatReportDuration(
      aggregateFocusTimeMs(todayEvents),
      locale.report.format,
    ),
    noteCountValue: formatReportCount(
      countUtterancesToday(todayEvents),
      locale.report.format,
    ),
  };
}

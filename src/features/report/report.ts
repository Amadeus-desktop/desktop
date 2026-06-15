import type { AppLocale } from "../../i18n";
import {
  aggregateFocusTimeMs,
  countChatOpensToday,
  countReturnsToday,
  countUtterancesToday,
  filterEventsForToday,
  formatReportCount,
  formatReportDuration,
} from "../../domain/report";
import type { TimelineEvent } from "../timeline/types";
import type { DailyCareInsight, ReportMetric } from "./types";

export function buildReportMetrics(
  events: TimelineEvent[],
  locale: AppLocale,
): ReportMetric[] {
  const todayEvents = filterEventsForToday(events);
  const format = locale.report.format;

  return [
    {
      id: "together-time",
      label: locale.report.metrics.togetherTime,
      value: formatReportDuration(aggregateFocusTimeMs(todayEvents), format),
      tone: "rose",
    },
    {
      id: "nudges",
      label: locale.report.metrics.nudges,
      value: formatReportCount(countUtterancesToday(todayEvents), format),
      tone: "lavender",
    },
    {
      id: "chat-opens",
      label: locale.report.metrics.chatOpens,
      value: formatReportCount(countChatOpensToday(todayEvents), format),
      tone: "peach",
    },
    {
      id: "returns",
      label: locale.report.metrics.returns,
      value: formatReportCount(countReturnsToday(todayEvents), format),
      tone: "mint",
    },
  ];
}

export function buildDailyCareInsight(
  events: TimelineEvent[],
  locale: AppLocale,
): DailyCareInsight {
  const todayEvents = filterEventsForToday(events);
  const nudges = countUtterancesToday(todayEvents);
  const returns = countReturnsToday(todayEvents) + countChatOpensToday(todayEvents);
  const tags = locale.report.emotionalKeywords.tags;

  const keywords: string[] = [];
  if (nudges >= 2) keywords.push(tags.gentle);
  if (returns >= 1) keywords.push(tags.return);
  if (aggregateFocusTimeMs(todayEvents) >= 45 * 60 * 1000) keywords.push(tags.focused);
  if (nudges === 0 && returns === 0) keywords.push(tags.steady);
  if (nudges >= 4) keywords.push(tags.tired);

  const uniqueKeywords =
    keywords.length > 0
      ? [...new Set(keywords)].slice(0, 3)
      : [locale.report.emotionalKeywords.fallback];

  let closingNote = locale.report.closingNote.quiet;
  if (nudges >= 3) {
    closingNote = locale.report.closingNote.active;
  } else if (nudges >= 1 || returns >= 1) {
    closingNote = locale.report.closingNote.gentle;
  }

  return {
    keywords: uniqueKeywords,
    closingNote,
  };
}

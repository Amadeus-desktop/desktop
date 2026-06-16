import type { AppLocale } from "../../../i18n";
import {
  aggregateFocusTimeMs,
  countChatOpensToday,
  countReturnsToday,
  countUtterancesToday,
  filterEventsForToday,
  formatReportCount,
  formatReportDuration,
} from "../../../domain/report";
import type { TimelineEvent } from "../../timeline/types";
import type { DailyCareActivityDetail, DailyCareInsight, ReportMetric } from "../types";

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
  if (nudges >= 1) keywords.push(tags.gentle);
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
  const activityDetails = buildActivityDetails(todayEvents);

  return {
    heroPrompt: locale.report.intro.prompt,
    keywords: uniqueKeywords,
    closingNote,
    companionNarrative: buildCompanionNarrative(activityDetails, returns, locale),
    activityDetails,
  };
}

type ContextMetadata = {
  category?: string;
  frontmostDurationMs?: number;
  browserContext?: {
    urlHost?: string | null;
    urlClass?: string;
  } | null;
};

type ActivityBucket = {
  id: string;
  label: string;
  kind: DailyCareActivityDetail["kind"];
  totalDurationMs: number;
  eventCount: number;
};

function buildActivityDetails(events: TimelineEvent[]): DailyCareActivityDetail[] {
  const buckets = new Map<string, ActivityBucket>();

  for (const event of events) {
    if (event.kind !== "context") continue;
    const metadata = parseContextMetadata(event.metadataJson);
    const label = activityLabel(event, metadata);
    const kind = activityKind(metadata);
    const key = `${kind}:${label}`;
    const current =
      buckets.get(key) ??
      {
        id: key,
        label,
        kind,
        totalDurationMs: 0,
        eventCount: 0,
      };

    current.totalDurationMs += metadata.frontmostDurationMs ?? 0;
    current.eventCount += 1;
    buckets.set(key, current);
  }

  return [...buckets.values()]
    .sort(
      (left, right) =>
        right.totalDurationMs - left.totalDurationMs ||
        right.eventCount - left.eventCount,
    )
    .slice(0, 4)
    .map((bucket) => ({
      ...bucket,
      summary: activitySummary(bucket),
    }));
}

function parseContextMetadata(metadataJson?: string | null): ContextMetadata {
  if (!metadataJson) return {};
  try {
    const parsed = JSON.parse(metadataJson) as ContextMetadata;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function activityLabel(event: TimelineEvent, metadata: ContextMetadata): string {
  const host = metadata.browserContext?.urlHost?.trim();
  if (host) return host;
  return event.title.trim() || "작업";
}

function activityKind(metadata: ContextMetadata): DailyCareActivityDetail["kind"] {
  const urlClass = normalizeActivityClass(metadata.browserContext?.urlClass);
  const category = normalizeActivityClass(metadata.category);
  if (urlClass === "video" || category === "non_work") {
    return "break";
  }
  if (category === "work") {
    return "work";
  }
  return "unknown";
}

function normalizeActivityClass(value?: string | null): string {
  return value?.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase() ?? "";
}

function activitySummary(activity: ActivityBucket): string {
  const stayedLong = activity.totalDurationMs >= 45 * 60 * 1000;
  if (activity.kind === "work") {
    if (activity.label.includes("한글")) {
      return stayedLong
        ? "한글을 꽤 오래 붙잡고 있었어."
        : "한글 작업을 이어간 흔적이 남아 있어.";
    }
    return stayedLong
      ? `${activity.label}에서 작업 흐름이 오래 이어졌어.`
      : `${activity.label}에서 작업 흐름이 남아 있어.`;
  }

  if (activity.kind === "break") {
    return `${activity.label} 쪽으로 잠깐 흐름이 옮겨간 순간도 있었어.`;
  }

  return `${activity.label}을 조용히 붙잡고 있던 시간이 있었어.`;
}

function buildCompanionNarrative(
  activities: DailyCareActivityDetail[],
  returns: number,
  locale: AppLocale,
): string {
  const topWork = activities.find((activity) => activity.kind === "work");
  if (!topWork) {
    return locale.report.closingNote.quiet;
  }

  const returnClause =
    returns > 0
      ? " 중간에 흐름이 흔들려도 다시 돌아온 기록이 있어서 더 선명해."
      : "";
  if (topWork.label.includes("한글")) {
    return `오늘은 한글을 많이 붙잡고 있었구나.${returnClause} 같이 있었으니까 이런 흐름이 남았어.`;
  }

  return `오늘은 ${topWork.label} 쪽 작업을 오래 붙잡고 있었구나.${returnClause} 그냥 숫자보다, 그 흐름이 더 기억에 남아.`;
}

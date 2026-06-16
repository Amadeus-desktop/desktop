import { useCallback, useMemo, useState } from "react";
import { REPORT_TIMELINE_LIMIT } from "../../../domain/report";
import { getLocale, LOCALE_TAGS, useI18n } from "../../../i18n";
import { useLifecycleFetch } from "../../../lib/hooks/useLifecycleFetch";
import { listTimelineEvents, listWorkSessions } from "../../timeline";
import type { TimelineEvent, TimelineEventKind, WorkSession } from "../../timeline/types";
import { buildReportMetrics } from "../lib/insight";
import type { WorkTimelineItem } from "../types";

export function useReport() {
  const t = useI18n();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [timelineState, setTimelineState] = useState<"loading" | "ready">(
    "loading",
  );
  const [refreshRevision, setRefreshRevision] = useState(0);

  const refreshReport = useCallback(() => {
    setTimelineState("loading");
    setRefreshRevision((revision) => revision + 1);
  }, []);

  useLifecycleFetch({
    deps: [t, refreshRevision],
    fetch: async (isActive) => {
      try {
        const [nextEvents, nextWorkSessions] = await Promise.all([
          listTimelineEvents(REPORT_TIMELINE_LIMIT),
          listWorkSessions(30),
        ]);
        if (!isActive()) return;
        setEvents(nextEvents);
        setWorkSessions(nextWorkSessions);
        setTimelineState("ready");
      } catch {
        if (!isActive()) return;
        setEvents([]);
        setWorkSessions([]);
        setTimelineState("ready");
      }
    },
  });

  const reportMetrics = useMemo(
    () => buildReportMetrics(events, t),
    [events, t],
  );
  const workTimeline = useMemo(
    () => events.map((event) => toWorkTimelineItem(event)),
    [events],
  );

  return {
    events,
    workSessions,
    reportMetrics,
    workTimeline,
    timelineState,
    refreshReport,
  };
}

function toWorkTimelineItem(event: TimelineEvent): WorkTimelineItem {
  return {
    id: event.id,
    time: formatTimelineTime(event.occurredAt),
    title: formatTimelineTitle(event),
    color: timelineColorByKind[event.kind],
  };
}

function formatTimelineTime(occurredAt: number) {
  return new Intl.DateTimeFormat(LOCALE_TAGS[getLocale()], {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(occurredAt));
}

function formatTimelineTitle(event: TimelineEvent) {
  if (event.subtitle) {
    return `${event.title} · ${event.subtitle}`;
  }

  return event.title;
}

const timelineColorByKind: Record<TimelineEventKind, string> = {
  context: "bg-[#007aff]",
  utterance: "bg-[#ffbd2e]",
  reaction: "bg-[#34c759]",
};

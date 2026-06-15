import { useMemo, useState } from "react";
import { REPORT_TIMELINE_LIMIT } from "../../../domain/report";
import { getLocale, LOCALE_TAGS, useI18n } from "../../../i18n";
import { useLifecycleFetch } from "../../../lib/hooks/useLifecycleFetch";
import { listTimelineEvents } from "../../timeline";
import type { TimelineEvent, TimelineEventKind } from "../../timeline/types";
import { buildReportMetrics } from "../lib/report";
import type { WorkTimelineItem } from "../types";

export function useReport() {
  const t = useI18n();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [timelineState, setTimelineState] = useState<"loading" | "ready">(
    "loading",
  );

  useLifecycleFetch({
    deps: [t],
    fetch: async (isActive) => {
      try {
        const nextEvents = await listTimelineEvents(REPORT_TIMELINE_LIMIT);
        if (!isActive()) return;
        setEvents(nextEvents);
        setTimelineState("ready");
      } catch {
        if (!isActive()) return;
        setEvents([]);
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
    reportMetrics,
    workTimeline,
    timelineState,
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

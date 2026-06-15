import { useEffect, useMemo, useState } from "react";
import { getLocale, LOCALE_TAGS, useI18n } from "../../i18n";
import { getReportMetrics } from "./report";
import type { WorkTimelineItem } from "./types";
import { ensureTimelineSeed } from "../timeline/timelineRepository";
import type { TimelineEvent, TimelineEventKind } from "../timeline/types";

export function useReport() {
  const t = useI18n();
  const [timelineItems, setTimelineItems] = useState<WorkTimelineItem[]>([]);
  const [timelineState, setTimelineState] = useState<"loading" | "ready">(
    "loading",
  );
  const reportMetrics = useMemo(() => getReportMetrics(t), [t]);

  useEffect(() => {
    let cancelled = false;

    async function loadTimeline() {
      const events = await ensureTimelineSeed();

      if (!cancelled) {
        setTimelineItems(events.map((event) => toWorkTimelineItem(event)));
        setTimelineState("ready");
      }
    }

    void loadTimeline().catch(() => {
      if (!cancelled) {
        setTimelineItems([]);
        setTimelineState("ready");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [t]);

  return {
    reportMetrics,
    workTimeline: timelineItems,
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

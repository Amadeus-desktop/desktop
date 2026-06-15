import { useCallback, useState } from "react";
import { useLifecycleFetch } from "../../../lib/useLifecycleFetch";
import { listTimelineEvents } from "../../timeline/timelineRepository";
import type { TimelineEvent } from "../../timeline/types";

export function useCompanionTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [revision, setRevision] = useState(0);

  const refreshTimeline = useCallback(() => {
    setRevision((current) => current + 1);
  }, []);

  useLifecycleFetch({
    refreshOnVisible: false,
    deps: [revision],
    fetch: async (isActive) => {
      try {
        const nextEvents = await listTimelineEvents(30);
        if (!isActive()) return;
        setEvents(nextEvents);
      } catch {
        if (!isActive()) return;
        setEvents([]);
      }
    },
  });

  return { events, refreshTimeline };
}

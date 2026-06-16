import { useCallback, useState } from "react";
import { useLifecycleFetch } from "../../../lib/hooks/useLifecycleFetch";
import { listTimelineEvents, listWorkSessions } from "../../timeline";
import type { TimelineEvent, WorkSession } from "../../timeline/types";

export function useCompanionTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [revision, setRevision] = useState(0);

  const refreshTimeline = useCallback(() => {
    setRevision((current) => current + 1);
  }, []);

  useLifecycleFetch({
    refreshOnVisible: false,
    deps: [revision],
    fetch: async (isActive) => {
      try {
        const [nextEvents, nextWorkSessions] = await Promise.all([
          listTimelineEvents(30),
          listWorkSessions(12),
        ]);
        if (!isActive()) return;
        setEvents(nextEvents);
        setWorkSessions(nextWorkSessions);
      } catch {
        if (!isActive()) return;
        setEvents([]);
        setWorkSessions([]);
      }
    },
  });

  return { events, workSessions, refreshTimeline };
}

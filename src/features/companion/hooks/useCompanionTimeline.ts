import { useCallback, useEffect, useState } from "react";
import { listTimelineEvents } from "../../timeline/timelineRepository";
import type { TimelineEvent } from "../../timeline/types";

export function useCompanionTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [revision, setRevision] = useState(0);

  const refreshTimeline = useCallback(() => {
    setRevision((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void listTimelineEvents(30)
      .then((nextEvents) => {
        if (!cancelled) {
          setEvents(nextEvents);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEvents([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [revision]);

  return { events, refreshTimeline };
}

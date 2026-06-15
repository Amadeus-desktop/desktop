import type { TimelineEvent } from "../../features/timeline/types";
import {
  REPORT_CONTEXT_GAP_MS,
  REPORT_MIN_SESSION_MS,
} from "./constants";

export function startOfLocalDayMs(now = Date.now()): number {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function filterEventsForToday(
  events: TimelineEvent[],
  now = Date.now(),
): TimelineEvent[] {
  const dayStart = startOfLocalDayMs(now);
  return events.filter((event) => event.occurredAt >= dayStart);
}

export function aggregateFocusTimeMs(events: TimelineEvent[]): number {
  const contextEvents = events
    .filter((event) => event.kind === "context")
    .slice()
    .sort((left, right) => left.occurredAt - right.occurredAt);

  if (contextEvents.length === 0) {
    return 0;
  }

  if (contextEvents.length === 1) {
    return REPORT_MIN_SESSION_MS;
  }

  let total = 0;
  let sessionStart = contextEvents[0].occurredAt;
  let sessionEnd = contextEvents[0].occurredAt;

  for (let index = 1; index < contextEvents.length; index += 1) {
    const event = contextEvents[index];
    const gap = event.occurredAt - sessionEnd;

    if (gap <= REPORT_CONTEXT_GAP_MS) {
      sessionEnd = event.occurredAt;
      continue;
    }

    total += Math.max(sessionEnd - sessionStart, REPORT_MIN_SESSION_MS);
    sessionStart = event.occurredAt;
    sessionEnd = event.occurredAt;
  }

  total += Math.max(sessionEnd - sessionStart, REPORT_MIN_SESSION_MS);
  return total;
}

export function countUtterancesToday(events: TimelineEvent[]): number {
  return events.filter((event) => event.kind === "utterance").length;
}

export function countContextEventsToday(events: TimelineEvent[]): number {
  return events.filter((event) => event.kind === "context").length;
}

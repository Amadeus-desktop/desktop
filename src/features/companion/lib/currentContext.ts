import type { SafeCurrentContext } from "../../../domain/prompt/assembly";
import {
  aggregateFocusTimeMs,
  countChatOpensToday,
  countReturnsToday,
  countUtterancesToday,
  filterEventsForToday,
} from "../../../domain/report";
import { listActivityObservations, listTimelineEvents } from "../../timeline";
import type { ActivityObservation, TimelineEvent } from "../../timeline/types";

type BuildCompanionCurrentContextInput = {
  nudge?: string | null;
  nowMs?: number;
  limit?: number;
  activityObservations?: ActivityObservation[];
};

type ContextMetadata = {
  category?: string;
  frontmostDurationMs?: number;
  browserContext?: {
    urlHost?: string | null;
    urlClass?: string | null;
  } | null;
  trigger?: {
    candidate?: {
      triggerType?: string;
      reason?: string;
    } | null;
    speakabilityScore?: number;
    action?: string;
  } | null;
};

type ActivitySummary = {
  label: string;
  kind: "work" | "break" | "unknown";
  minutes: number;
  observations: number;
};

export async function buildCompanionCurrentContext(
  input: BuildCompanionCurrentContextInput = {},
): Promise<SafeCurrentContext | null> {
  const limit = input.limit ?? 80;
  const [events, activityObservations] = await Promise.all([
    listTimelineEvents(limit),
    listActivityObservations(limit),
  ]);
  return buildCompanionCurrentContextFromEvents(events, {
    ...input,
    activityObservations,
  });
}

export function buildCompanionCurrentContextFromEvents(
  events: TimelineEvent[],
  input: BuildCompanionCurrentContextInput = {},
): SafeCurrentContext | null {
  const todayEvents = filterEventsForToday(events, input.nowMs);
  const todayObservations = filterObservationsForToday(
    input.activityObservations ?? [],
    input.nowMs,
  );
  const nudge = input.nudge?.trim() ?? "";
  if (todayEvents.length === 0 && todayObservations.length === 0 && !nudge) {
    return null;
  }

  const latestTrigger =
    latestObservationTriggerContext(todayObservations) ??
    latestTriggerContext(todayEvents);
  const latestUtterance = [...todayEvents]
    .reverse()
    .find((event) => event.kind === "utterance");
  const summary = {
    surface: "companion_chat",
    privacy: {
      redaction: "app/category/host/activity summary only",
      forbidden: ["raw OCR text", "screenshots", "full URLs", "file paths"],
    },
    currentReason: {
      visibleNudge: nudge || null,
      triggerType: latestTrigger?.triggerType ?? triggerTypeFromUtterance(latestUtterance),
      triggerReason: latestTrigger?.reason ?? null,
      speakabilityScore: latestTrigger?.speakabilityScore ?? null,
    },
    today: {
      observedSinceLocalMidnight: true,
      focusMinutes: Math.round(
        (todayObservations.length > 0
          ? aggregateObservationFocusTimeMs(todayObservations)
          : aggregateFocusTimeMs(todayEvents)) / 60_000,
      ),
      proactiveMessages: countUtterancesToday(todayEvents),
      chatOpens: countChatOpensToday(todayEvents),
      returns: countReturnsToday(todayEvents),
      activities:
        todayObservations.length > 0
          ? summarizeActivityObservations(todayObservations)
          : summarizeActivities(todayEvents),
    },
  };

  return {
    source: "cloud_safe",
    allowed_surface: "both",
    summary: JSON.stringify(summary),
  };
}

function latestObservationTriggerContext(observations: ActivityObservation[]) {
  for (const observation of [...observations].sort(
    (left, right) => right.observedAtMs - left.observedAtMs,
  )) {
    if (
      observation.triggerAction === "NoAction" &&
      !observation.triggerCandidateType
    ) {
      continue;
    }
    return {
      triggerType: observation.triggerCandidateType ?? null,
      reason: observation.triggerAction,
      speakabilityScore: observation.speakabilityScore,
    };
  }
  return null;
}

function latestTriggerContext(events: TimelineEvent[]) {
  for (const event of [...events].reverse()) {
    if (event.kind !== "context") continue;
    const metadata = parseContextMetadata(event.metadataJson);
    const candidate = metadata.trigger?.candidate;
    if (!candidate) continue;
    return {
      triggerType: candidate.triggerType ?? null,
      reason: candidate.reason ?? null,
      speakabilityScore: metadata.trigger?.speakabilityScore ?? null,
    };
  }
  return null;
}

function summarizeActivities(events: TimelineEvent[]): ActivitySummary[] {
  const buckets = new Map<string, ActivitySummary>();

  for (const event of events) {
    if (event.kind !== "context") continue;
    const metadata = parseContextMetadata(event.metadataJson);
    const label = activityLabel(event, metadata);
    const kind = activityKind(metadata);
    const key = `${kind}:${label}`;
    const current =
      buckets.get(key) ??
      {
        label,
        kind,
        minutes: 0,
        observations: 0,
      };
    current.minutes += Math.round((metadata.frontmostDurationMs ?? 0) / 60_000);
    current.observations += 1;
    buckets.set(key, current);
  }

  return [...buckets.values()]
    .sort(
      (left, right) =>
        right.minutes - left.minutes || right.observations - left.observations,
    )
    .slice(0, 4);
}

function summarizeActivityObservations(
  observations: ActivityObservation[],
): ActivitySummary[] {
  const buckets = new Map<string, ActivitySummary>();

  for (const observation of observations) {
    const metadata = activityMetadataFromObservation(observation);
    const label = observation.browserUrlHost?.trim() || observation.appName || "unknown app";
    const kind = activityKind(metadata);
    const key = `${kind}:${label}`;
    const current =
      buckets.get(key) ??
      {
        label,
        kind,
        minutes: 0,
        observations: 0,
      };
    current.minutes += Math.round(observation.frontmostDurationMs / 60_000);
    current.observations += 1;
    buckets.set(key, current);
  }

  return [...buckets.values()]
    .sort(
      (left, right) =>
        right.minutes - left.minutes || right.observations - left.observations,
    )
    .slice(0, 4);
}

function aggregateObservationFocusTimeMs(
  observations: ActivityObservation[],
): number {
  return observations
    .filter(
      (observation) => normalizeActivityClass(observation.appCategory) === "work",
    )
    .reduce(
      (total, observation) => total + observation.frontmostDurationMs,
      0,
    );
}

function activityMetadataFromObservation(
  observation: ActivityObservation,
): ContextMetadata {
  return {
    category: observation.appCategory,
    frontmostDurationMs: observation.frontmostDurationMs,
    browserContext: {
      urlHost: observation.browserUrlHost ?? null,
      urlClass: observation.browserUrlClass ?? null,
    },
    trigger: {
      candidate: observation.triggerCandidateType
        ? {
            triggerType: observation.triggerCandidateType,
            reason: observation.triggerAction,
          }
        : null,
      speakabilityScore: observation.speakabilityScore,
      action: observation.triggerAction,
    },
  };
}

function activityLabel(event: TimelineEvent, metadata: ContextMetadata): string {
  const host = metadata.browserContext?.urlHost?.trim();
  if (host) return host;
  return event.title.trim() || "unknown app";
}

function activityKind(metadata: ContextMetadata): ActivitySummary["kind"] {
  const urlClass = normalizeActivityClass(metadata.browserContext?.urlClass);
  const category = normalizeActivityClass(metadata.category);
  if (urlClass === "video" || category === "non_work") {
    return "break";
  }
  if (category === "work") return "work";
  return "unknown";
}

function normalizeActivityClass(value?: string | null): string {
  return value?.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase() ?? "";
}

function triggerTypeFromUtterance(event: TimelineEvent | undefined): string | null {
  if (!event) return null;
  const [triggerType] = event.subtitle.split(" · ");
  return triggerType?.trim() || null;
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

function filterObservationsForToday(
  observations: ActivityObservation[],
  nowMs = Date.now(),
): ActivityObservation[] {
  const start = new Date(nowMs);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return observations.filter(
    (observation) =>
      observation.observedAtMs >= start.getTime() &&
      observation.observedAtMs < end.getTime(),
  );
}

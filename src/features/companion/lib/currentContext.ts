import type { SafeCurrentContext } from "../../../domain/prompt/assembly";
import {
  aggregateFocusTimeMs,
  countChatOpensToday,
  countReturnsToday,
  countUtterancesToday,
  filterEventsForToday,
} from "../../../domain/report";
import { listTimelineEvents } from "../../timeline";
import type { TimelineEvent } from "../../timeline/types";

type BuildCompanionCurrentContextInput = {
  nudge?: string | null;
  nowMs?: number;
  limit?: number;
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
  const events = await listTimelineEvents(input.limit ?? 80);
  return buildCompanionCurrentContextFromEvents(events, input);
}

export function buildCompanionCurrentContextFromEvents(
  events: TimelineEvent[],
  input: BuildCompanionCurrentContextInput = {},
): SafeCurrentContext | null {
  const todayEvents = filterEventsForToday(events, input.nowMs);
  const nudge = input.nudge?.trim() ?? "";
  if (todayEvents.length === 0 && !nudge) return null;

  const latestTrigger = latestTriggerContext(todayEvents);
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
      focusMinutes: Math.round(aggregateFocusTimeMs(todayEvents) / 60_000),
      proactiveMessages: countUtterancesToday(todayEvents),
      chatOpens: countChatOpensToday(todayEvents),
      returns: countReturnsToday(todayEvents),
      activities: summarizeActivities(todayEvents),
    },
  };

  return {
    source: "cloud_safe",
    allowed_surface: "app",
    summary: JSON.stringify(summary),
  };
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

function activityLabel(event: TimelineEvent, metadata: ContextMetadata): string {
  const host = metadata.browserContext?.urlHost?.trim();
  if (host) return host;
  return event.title.trim() || "unknown app";
}

function activityKind(metadata: ContextMetadata): ActivitySummary["kind"] {
  if (metadata.browserContext?.urlClass === "Video" || metadata.category === "NonWork") {
    return "break";
  }
  if (metadata.category === "Work") return "work";
  return "unknown";
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

import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../../lib/tauriRuntime";
import type {
  ContextEvent,
  CreateContextEventInput,
  CreateUserReactionInput,
  CreateUtteranceEventInput,
  TimelineEvent,
  UserReaction,
  UtteranceEvent,
} from "./types";

const mockTimelineEvents: TimelineEvent[] = [
  {
    id: "mock-utterance-1",
    occurredAt: Date.now() - 1000 * 60 * 2,
    kind: "utterance",
    title: "잠깐 멈춘 것 같아서. 말 안 해도 괜찮아.",
    subtitle: "deep_pause · mock",
  },
  {
    id: "mock-context-1",
    occurredAt: Date.now() - 1000 * 60 * 5,
    kind: "context",
    title: "HWP",
    subtitle: "2024_공무_보고서.hwp",
  },
];

let mockSequence = 0;

export async function createContextEvent(
  input: CreateContextEventInput,
): Promise<ContextEvent> {
  if (isTauriRuntime()) {
    return invoke<ContextEvent>("create_context_event", { input });
  }

  const event: ContextEvent = {
    ...input,
    id: nextMockId("ctx"),
    occurredAt: nextMockOccurredAt(),
  };

  mockTimelineEvents.unshift({
    id: event.id,
    occurredAt: event.occurredAt,
    kind: "context",
    title: event.appName,
    subtitle: event.windowTitle,
  });

  return event;
}

export async function createUtteranceEvent(
  input: CreateUtteranceEventInput,
): Promise<UtteranceEvent> {
  if (isTauriRuntime()) {
    return invoke<UtteranceEvent>("create_utterance_event", { input });
  }

  const event: UtteranceEvent = {
    ...input,
    contextEventId: input.contextEventId ?? null,
    id: nextMockId("utt"),
    occurredAt: nextMockOccurredAt(),
  };

  mockTimelineEvents.unshift({
    id: event.id,
    occurredAt: event.occurredAt,
    kind: "utterance",
    title: event.message,
    subtitle: `${event.triggerType} · ${event.provider}`,
  });

  return event;
}

export async function createUserReaction(
  input: CreateUserReactionInput,
): Promise<UserReaction> {
  if (isTauriRuntime()) {
    return invoke<UserReaction>("create_user_reaction", { input });
  }

  const reaction: UserReaction = {
    ...input,
    utteranceEventId: input.utteranceEventId ?? null,
    id: nextMockId("rxn"),
    occurredAt: nextMockOccurredAt(),
  };

  mockTimelineEvents.unshift({
    id: reaction.id,
    occurredAt: reaction.occurredAt,
    kind: "reaction",
    title: reaction.reactionType,
    subtitle: reaction.utteranceEventId ?? "",
  });

  return reaction;
}

export async function listTimelineEvents(limit = 20): Promise<TimelineEvent[]> {
  if (isTauriRuntime()) {
    return invoke<TimelineEvent[]>("list_timeline_events", { limit });
  }

  return [...mockTimelineEvents]
    .sort((left, right) => right.occurredAt - left.occurredAt)
    .slice(0, limit);
}

export async function ensureTimelineSeed(): Promise<TimelineEvent[]> {
  const currentEvents = await listTimelineEvents(20);
  if (currentEvents.length > 0) {
    return currentEvents;
  }

  const contextEvent = await createContextEvent({
    appName: "HWP",
    windowTitle: "2024_공무_보고서.hwp",
    eventType: "active_window_changed",
    metadataJson: "{}",
  });

  await createUtteranceEvent({
    triggerType: "deep_pause",
    speakabilityScore: 72,
    message: "잠깐 멈춘 것 같아서. 말 안 해도 괜찮아.",
    provider: "mock",
    contextEventId: contextEvent.id,
  });

  return listTimelineEvents(20);
}

function nextMockId(prefix: string) {
  mockSequence += 1;
  return `${prefix}-${Date.now()}-${mockSequence}`;
}

function nextMockOccurredAt() {
  mockSequence += 1;
  return Date.now() + mockSequence;
}

export type CreateContextEventInput = {
  appName: string;
  windowTitle: string;
  eventType: string;
  metadataJson: string;
};

export type CreateUtteranceEventInput = {
  triggerType: string;
  speakabilityScore: number;
  message: string;
  provider: string;
  contextEventId?: string | null;
};

export type CreateUserReactionInput = {
  utteranceEventId?: string | null;
  reactionType: string;
};

export type ContextEvent = CreateContextEventInput & {
  id: string;
  occurredAt: number;
};

export type UtteranceEvent = CreateUtteranceEventInput & {
  id: string;
  occurredAt: number;
};

export type UserReaction = CreateUserReactionInput & {
  id: string;
  occurredAt: number;
};

export type TimelineEventKind = "context" | "utterance" | "reaction";

export type TimelineEvent = {
  id: string;
  occurredAt: number;
  kind: TimelineEventKind;
  title: string;
  subtitle: string;
};

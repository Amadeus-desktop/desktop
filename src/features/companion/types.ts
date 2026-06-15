export type { Persona, PersonaId } from "../../domain/persona/types";
export type { TriggerType } from "../../domain/trigger/types";

export type CompanionMessage = {
  id: string;
  sender: "companion" | "user";
  text: string;
};

export type CompanionMode =
  | "quiet"
  | "new_note"
  | "nudge"
  | "pocket"
  | "deep"
  | "daily_care"
  | "sleep";

export type TimelineEventType =
  | "nudge_shown"
  | "note_clicked"
  | "pocket_opened"
  | "user_input"
  | "deep_reply"
  | "daily_care_opened"
  | "dismissed"
  | "ignored";

export type LocalTimelineEvent = {
  id: string;
  type: TimelineEventType;
  mode: CompanionMode;
  label: string;
  createdAt: string;
};

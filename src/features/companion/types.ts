export type { Persona, PersonaId } from "../../domain/persona/types";

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

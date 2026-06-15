export type PersonaId =
  | "warm_friend"
  | "loving_partner"
  | "fantasy_guardian"
  | "quiet_companion"
  | "minimal_user"
  | "cute_character"
  | "nature_healing";

export type PresenceIconKind =
  | "bubble"
  | "letter"
  | "star"
  | "orb"
  | "line"
  | "face"
  | "leaf";

export type Persona = {
  id: PersonaId;
  name: string;
  shortLabel: string;
  description: string;
  icon: PresenceIconKind;
};

export const PERSONA_IDS = [
  "warm_friend",
  "loving_partner",
  "fantasy_guardian",
  "quiet_companion",
  "minimal_user",
  "cute_character",
  "nature_healing",
] as const satisfies readonly PersonaId[];

export const PRESENCE_ICON_BY_PERSONA: Record<PersonaId, PresenceIconKind> = {
  warm_friend: "bubble",
  loving_partner: "letter",
  fantasy_guardian: "star",
  quiet_companion: "orb",
  minimal_user: "line",
  cute_character: "face",
  nature_healing: "leaf",
};

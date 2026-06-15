export type PersonaId =
  | "warm_friend"
  | "loving_partner"
  | "steady_ally"
  | "soft_care";

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
  "steady_ally",
  "soft_care",
] as const satisfies readonly PersonaId[];

export const PRESENCE_ICON_BY_PERSONA: Record<PersonaId, PresenceIconKind> = {
  warm_friend: "bubble",
  loving_partner: "letter",
  steady_ally: "star",
  soft_care: "orb",
};

const LEGACY_PERSONA_MAP: Record<string, PersonaId> = {
  fantasy_guardian: "steady_ally",
  quiet_companion: "soft_care",
  minimal_user: "warm_friend",
  cute_character: "soft_care",
  nature_healing: "soft_care",
};

export function normalizePersonaId(value: string): PersonaId {
  if ((PERSONA_IDS as readonly string[]).includes(value)) {
    return value as PersonaId;
  }
  return LEGACY_PERSONA_MAP[value] ?? "warm_friend";
}

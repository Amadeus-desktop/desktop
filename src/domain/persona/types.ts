export type PersonaId =
  | "seoyeon-modern-senior"
  | "eiren-fantasy-guardian"
  | "makise-kurisu";

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
  "seoyeon-modern-senior",
  "eiren-fantasy-guardian",
  "makise-kurisu",
] as const satisfies readonly PersonaId[];

export const PRESENCE_ICON_BY_PERSONA: Record<PersonaId, PresenceIconKind> = {
  "seoyeon-modern-senior": "letter",
  "eiren-fantasy-guardian": "star",
  "makise-kurisu": "line",
};

const LEGACY_PERSONA_MAP: Record<string, PersonaId> = {
  warm_friend: "seoyeon-modern-senior",
  loving_partner: "seoyeon-modern-senior",
  soft_care: "seoyeon-modern-senior",
  quiet_companion: "seoyeon-modern-senior",
  minimal_user: "seoyeon-modern-senior",
  cute_character: "seoyeon-modern-senior",
  nature_healing: "seoyeon-modern-senior",
  ruda: "seoyeon-modern-senior",
  daon: "seoyeon-modern-senior",
  emilia: "eiren-fantasy-guardian",
  steady_ally: "eiren-fantasy-guardian",
  fantasy_guardian: "eiren-fantasy-guardian",
  makise: "makise-kurisu",
};

export function normalizePersonaId(value: string): PersonaId {
  if ((PERSONA_IDS as readonly string[]).includes(value)) {
    return value as PersonaId;
  }
  return LEGACY_PERSONA_MAP[value] ?? "seoyeon-modern-senior";
}

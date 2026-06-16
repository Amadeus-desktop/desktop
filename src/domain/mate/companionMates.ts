import type { AppLocale } from "../../i18n/types";
import { getPersonas } from "../persona/registry";
import type { Persona, PersonaId } from "../persona/types";

/** Companion HUD mate picker — icon + short label only. Full persona lives in Character settings. */
export const COMPANION_MATE_IDS = [
  "seoyeon-modern-senior",
  "warm_friend",
  "makise-kurisu",
  "steady_ally",
] as const satisfies readonly PersonaId[];

export type CompanionMateId = (typeof COMPANION_MATE_IDS)[number];

export function isCompanionMateId(value: string): value is CompanionMateId {
  return (COMPANION_MATE_IDS as readonly string[]).includes(value);
}

export function normalizeCompanionMateId(value: string): CompanionMateId {
  if (isCompanionMateId(value)) {
    return value;
  }

  const legacyMap: Record<string, CompanionMateId> = {
    "eiren-fantasy-guardian": "steady_ally",
    loving_partner: "warm_friend",
    soft_care: "warm_friend",
    fantasy_guardian: "steady_ally",
    quiet_companion: "warm_friend",
    minimal_user: "warm_friend",
    cute_character: "warm_friend",
    nature_healing: "warm_friend",
  };

  return legacyMap[value] ?? "warm_friend";
}

export function getCompanionMates(locale: AppLocale): Record<CompanionMateId, Persona> {
  const personas = getPersonas(locale);
  return COMPANION_MATE_IDS.reduce(
    (mates, id) => {
      mates[id] = personas[id];
      return mates;
    },
    {} as Record<CompanionMateId, Persona>,
  );
}

export function getCompanionMateList(locale: AppLocale): Persona[] {
  return COMPANION_MATE_IDS.map((id) => getCompanionMates(locale)[id]);
}

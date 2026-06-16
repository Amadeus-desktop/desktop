import type { AppLocale } from "../../i18n/types";
import { getPersonaList, getPersonas } from "../persona/registry";
import type { Persona, PersonaId } from "../persona/types";
import { PERSONA_IDS, normalizePersonaId } from "../persona/types";

/** Companion HUD mate picker — icon + short label only. Full persona lives in Character settings. */
export const COMPANION_MATE_IDS = PERSONA_IDS;

export type CompanionMateId = PersonaId;

export function isCompanionMateId(value: string): value is CompanionMateId {
  return (COMPANION_MATE_IDS as readonly string[]).includes(value);
}

export function normalizeCompanionMateId(value: string): CompanionMateId {
  return normalizePersonaId(value);
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
  return getPersonaList(locale);
}

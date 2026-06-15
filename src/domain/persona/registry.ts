import type { AppLocale } from "../../i18n/types";
import type { Persona, PersonaId } from "./types";

export function getPersonas(locale: AppLocale): Record<PersonaId, Persona> {
  return {
    warm_friend: {
      id: "warm_friend",
      ...locale.persona.warm_friend,
    },
    fantasy_guardian: {
      id: "fantasy_guardian",
      ...locale.persona.fantasy_guardian,
    },
  };
}

export function getPersonaList(locale: AppLocale): Persona[] {
  return Object.values(getPersonas(locale));
}

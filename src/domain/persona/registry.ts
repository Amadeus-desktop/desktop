import type { AppLocale } from "../../i18n/types";
import {
  PERSONA_IDS,
  PRESENCE_ICON_BY_PERSONA,
  type Persona,
  type PersonaId,
} from "./types";

export function getPersonas(locale: AppLocale): Record<PersonaId, Persona> {
  return PERSONA_IDS.reduce(
    (personas, id) => {
      personas[id] = {
        id,
        icon: PRESENCE_ICON_BY_PERSONA[id],
        ...locale.persona[id],
      };
      return personas;
    },
    {} as Record<PersonaId, Persona>,
  );
}

export function getPersonaList(locale: AppLocale): Persona[] {
  return PERSONA_IDS.map((id) => getPersonas(locale)[id]);
}

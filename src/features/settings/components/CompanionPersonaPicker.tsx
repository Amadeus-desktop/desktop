import type { PersonaId } from "../../../domain/persona/types";
import { useI18n } from "../../../i18n";
import { useCachedPersonas } from "../../persona/hooks/useCachedPersonas";
import { PersonaOptionCard } from "./PersonaOptionCard";
import { SettingRow } from "../../../ui";
import { useSettings } from "../hooks/useSettings";

export function CompanionPersonaPicker() {
  const t = useI18n();
  const { companionPersonaId, setCompanionPersonaId } = useSettings();
  const { personas } = useCachedPersonas(t);

  return (
    <SettingRow
      variant="primary"
      layout="stack"
      title={t.settings.companionPersona.label}
      subtitle={t.settings.companionPersona.subtitle}
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {personas.map((persona) => (
          <PersonaOptionCard
            key={persona.id}
            persona={persona}
            selected={persona.id === companionPersonaId}
            onSelect={() => setCompanionPersonaId(persona.id as PersonaId)}
          />
        ))}
      </div>
    </SettingRow>
  );
}

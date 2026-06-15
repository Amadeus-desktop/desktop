import { getPersonaList } from "../../domain/persona/registry";
import type { PersonaId } from "../../domain/persona/types";
import { useI18n } from "../../i18n";
import { PersonaOptionCard } from "./PersonaOptionCard";
import { SettingRow } from "../../ui";
import { useSettings } from "./useSettings";

export function CompanionPersonaPicker() {
  const t = useI18n();
  const { companionPersonaId, setCompanionPersonaId } = useSettings();
  const personas = getPersonaList(t);

  return (
    <SettingRow
      variant="primary"
      layout="stack"
      title={t.settings.companionPersona.label}
      subtitle={t.settings.companionPersona.subtitle}
    >
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
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

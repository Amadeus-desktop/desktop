import { getPersonaList } from "../../domain/persona/registry";
import { getPersonaAccent } from "../../domain/persona/theme";
import type { PersonaId } from "../../domain/persona/types";
import { useI18n } from "../../i18n";
import { PersonaPresenceIcon } from "../companion/ui/PersonaPresenceIcon";
import { glassStyles } from "../../ui/glassStyles";
import { useSettings } from "./useSettings";

export function CompanionPersonaPicker() {
  const t = useI18n();
  const { companionPersonaId, setCompanionPersonaId } = useSettings();
  const personas = getPersonaList(t);

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-white">{t.settings.companionPersona.label}</p>
        <p className="mt-1 text-[12px] leading-5 text-white/45">
          {t.settings.companionPersona.subtitle}
        </p>
      </div>
      <div className="grid gap-2">
        {personas.map((persona) => {
          const selected = persona.id === companionPersonaId;
          const accent = getPersonaAccent(persona.id);

          return (
            <button
              key={persona.id}
              type="button"
              onClick={() => setCompanionPersonaId(persona.id as PersonaId)}
              className={`flex w-full items-start gap-3 px-3.5 py-3 text-left transition ${glassStyles.radiusCard} ${
                selected
                  ? `${glassStyles.rowSelected} ${glassStyles.panelStrong}`
                  : `${glassStyles.row} hover:bg-[#2a2a2e]`
              }`}
              style={
                selected
                  ? {
                      boxShadow: `0 10px 28px rgb(${accent.glow} / 0.16), inset 0 0 0 1px rgb(${accent.glow} / 0.18)`,
                    }
                  : undefined
              }
            >
              <PersonaPresenceIcon personaId={persona.id} size="md" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">
                    {persona.shortLabel}
                  </span>
                  {selected ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${accent.text} bg-white/8`}
                    >
                      ON
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block text-[12px] leading-5 text-white/55">
                  {persona.description}
                </span>
                <span className="mt-1.5 block text-[11px] text-white/35">
                  {t.settings.companionPersona.icons[persona.icon]}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

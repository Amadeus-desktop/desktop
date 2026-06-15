import { getPersonaList } from "../../domain/persona/registry";
import type { PersonaId } from "../../domain/persona/types";
import { useI18n } from "../../i18n";
import { PersonaPresenceIcon } from "../companion/ui/PersonaPresenceIcon";
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

          return (
            <button
              key={persona.id}
              type="button"
              onClick={() => setCompanionPersonaId(persona.id as PersonaId)}
              className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                selected
                  ? "border-[#64b5f6]/50 bg-[#64b5f6]/10 shadow-[inset_0_0_0_1px_rgba(100,181,246,0.15)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.05]"
              }`}
            >
              <PersonaPresenceIcon personaId={persona.id} size="md" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">
                    {persona.shortLabel}
                  </span>
                  {selected ? (
                    <span className="rounded-full bg-[#64b5f6]/15 px-2 py-0.5 text-[10px] font-medium text-[#90caf9]">
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

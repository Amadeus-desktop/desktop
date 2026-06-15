import { useState } from "react";
import { getPersonaList } from "../../../domain/persona/registry";
import { getPersonaAccent } from "../../../domain/persona/theme";
import type { PersonaId } from "../../../domain/persona/types";
import { useI18n } from "../../../i18n";
import { cn } from "../../../lib/utils/cn";
import { patchAppSettings, useSettings } from "../../settings";
import { PersonaPresenceIcon } from "../../companion/ui/PersonaPresenceIcon";
import { shellText } from "../../../ui";
import { OnboardingCtaButton } from "../shell/OnboardingButtons";
import { OnboardingStepFrame } from "../shell/OnboardingStepFrame";

type SetupStepProps = {
  onComplete: () => void;
  continuing?: boolean;
};

export function SetupStep({ onComplete, continuing = false }: SetupStepProps) {
  const t = useI18n();
  const s = t.onboarding.setup;
  const { companionPersonaId } = useSettings();
  const personas = getPersonaList(t);
  const [personaId, setPersonaId] = useState<PersonaId>(companionPersonaId);

  const selected = personas.find((persona) => persona.id === personaId) ?? personas[0];

  function handleComplete() {
    patchAppSettings({
      companionPersonaId: personaId,
    });
    onComplete();
  }

  return (
    <OnboardingStepFrame compact eyebrow={t.onboarding.steps.setup} title={s.headline} description={s.subheadline}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {personas.map((persona) => {
            const isSelected = persona.id === personaId;
            const accent = getPersonaAccent(persona.id);

            return (
              <button
                key={persona.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setPersonaId(persona.id as PersonaId)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-[16px] border px-2 py-2.5 transition active:scale-[0.98]",
                  isSelected
                    ? "border-[color:rgb(var(--accent-rgb)/0.45)] bg-[color:rgb(var(--accent-rgb)/0.1)]"
                    : "border-[color:var(--shell-border-subtle)] bg-[color:var(--shell-panel-strong)] hover:border-[color:rgb(var(--accent-rgb)/0.25)] hover:bg-[color:rgb(var(--accent-rgb)/0.05)]",
                )}
                style={
                  isSelected
                    ? { boxShadow: `0 8px 20px rgb(${accent.glow} / 0.14)` }
                    : undefined
                }
              >
                <PersonaPresenceIcon
                  personaId={persona.id}
                  size="sm"
                  shape="square"
                  variant={isSelected ? "filled" : "outline"}
                  className="rounded-[12px]"
                />
                <span
                  className={cn(
                    "truncate w-full text-center text-[11px] font-semibold leading-tight",
                    isSelected ? "text-[color:var(--accent-soft)]" : shellText.primary,
                  )}
                >
                  {persona.name}
                </span>
                <span className={cn("truncate w-full text-center text-[9px] leading-tight", shellText.faint)}>
                  {persona.shortLabel}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className="rounded-[14px] border border-[color:rgb(var(--accent-rgb)/0.16)] bg-[color:rgb(var(--accent-rgb)/0.05)] px-3 py-2.5 text-center"
        >
          <p className={cn("text-[11px] leading-relaxed", shellText.muted)}>{selected.description}</p>
        </div>

        <OnboardingCtaButton disabled={continuing} onClick={handleComplete}>
          {s.continue}
        </OnboardingCtaButton>
      </div>
    </OnboardingStepFrame>
  );
}

import { useState } from "react";
import {
  getCompanionMateList,
  normalizeCompanionMateId,
  type CompanionMateId,
} from "../../../domain/mate";
import { getPersonaAccent } from "../../../domain/persona/theme";
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
  const mates = getCompanionMateList(t);
  const [mateId, setMateId] = useState<CompanionMateId>(
    normalizeCompanionMateId(companionPersonaId),
  );

  function handleComplete() {
    patchAppSettings({
      companionPersonaId: mateId,
    });
    onComplete();
  }

  return (
    <OnboardingStepFrame compact eyebrow={t.onboarding.steps.setup} title={s.headline} description={s.subheadline}>
      <div className="space-y-3">
        <p className={cn("text-center text-[11px] font-medium", shellText.muted)}>
          {s.mateLabel}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {mates.map((mate) => {
            const isSelected = mate.id === mateId;
            const accent = getPersonaAccent(mate.id);

            return (
              <button
                key={mate.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setMateId(mate.id as CompanionMateId)}
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
                  personaId={mate.id}
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
                  {mate.shortLabel}
                </span>
              </button>
            );
          })}
        </div>

        <OnboardingCtaButton disabled={continuing} onClick={handleComplete}>
          {s.continue}
        </OnboardingCtaButton>
      </div>
    </OnboardingStepFrame>
  );
}

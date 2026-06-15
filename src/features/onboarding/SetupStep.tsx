import { useState } from "react";
import { getPersonaList } from "../../domain/persona/registry";
import type { PersonaId } from "../../domain/persona/types";
import { useI18n } from "../../i18n";
import { cn } from "../../lib/cn";
import { patchAppSettings } from "../settings/appSettingsStore";
import type { ModelRoute } from "../settings/types";
import { PersonaOptionCard } from "../settings/PersonaOptionCard";
import { useSettings } from "../settings/useSettings";
import { Button, SegmentedControl, shellText } from "../../ui";
import { OnboardingStepFrame } from "./OnboardingStepFrame";
import type { SetupModelChoice } from "./types";

type SetupStepProps = {
  onComplete: () => void;
  continuing?: boolean;
};

function toModelRoute(choice: SetupModelChoice): ModelRoute {
  return choice === "local" ? "local-first" : "api-first";
}

export function SetupStep({ onComplete, continuing = false }: SetupStepProps) {
  const t = useI18n();
  const s = t.onboarding.setup;
  const { modelRoute, companionPersonaId } = useSettings();
  const personas = getPersonaList(t);

  const initialModelChoice: SetupModelChoice =
    modelRoute === "local-first" ? "local" : "api";

  const [modelChoice, setModelChoice] = useState<SetupModelChoice>(initialModelChoice);
  const [personaId, setPersonaId] = useState<PersonaId>(companionPersonaId);

  function handleComplete() {
    patchAppSettings({
      modelRoute: toModelRoute(modelChoice),
      companionPersonaId: personaId,
    });
    onComplete();
  }

  return (
    <OnboardingStepFrame eyebrow={t.onboarding.steps.setup} title={s.headline} description={s.subheadline}>
      <div className="space-y-4 text-left">
        <div className="space-y-1.5">
          <p className={cn("text-[10px] font-medium uppercase tracking-wide", shellText.faint)}>
            {s.modelLabel}
          </p>
          <SegmentedControl
            value={modelChoice}
            options={[
              { value: "api", label: s.modelApi },
              { value: "local", label: s.modelLocal },
            ]}
            onChange={setModelChoice}
          />
          {modelChoice === "local" ? (
            <p className={cn("text-[10px] leading-4", shellText.faint)}>{s.modelLocalHint}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <p className={cn("text-[10px] font-medium uppercase tracking-wide", shellText.faint)}>
            {s.personaLabel}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {personas.map((persona) => (
              <PersonaOptionCard
                key={persona.id}
                persona={persona}
                compact
                selected={persona.id === personaId}
                onSelect={() => setPersonaId(persona.id as PersonaId)}
              />
            ))}
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          className="w-full rounded-[12px]"
          disabled={continuing}
          onClick={handleComplete}
        >
          {s.continue}
        </Button>
      </div>
    </OnboardingStepFrame>
  );
}

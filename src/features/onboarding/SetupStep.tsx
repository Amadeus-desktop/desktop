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
    <div className="relative flex w-full max-w-[17rem] flex-col items-center text-center">
      <p className="relative text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:rgb(var(--accent-rgb)/0.85)]">
        {t.onboarding.steps.setup}
      </p>
      <h1 className={cn("relative mt-1.5 text-[1.05rem] font-semibold leading-snug", shellText.primary)}>
        {s.headline}
      </h1>
      <p className={cn("relative mt-1.5 text-[10.5px] leading-5", shellText.muted)}>
        {s.subheadline}
      </p>

      <div className="relative mt-3.5 w-full space-y-3 text-left" data-no-drag>
        <div className="space-y-1.5">
          <p className={cn("text-[10px] font-medium", shellText.muted)}>{s.modelLabel}</p>
          <SegmentedControl
            value={modelChoice}
            options={[
              { value: "api", label: s.modelApi },
              { value: "local", label: s.modelLocal },
            ]}
            onChange={setModelChoice}
          />
          {modelChoice === "local" ? (
            <p className={cn("text-[9px] leading-4", shellText.faint)}>{s.modelLocalHint}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <p className={cn("text-[10px] font-medium", shellText.muted)}>{s.personaLabel}</p>
          <div className="grid grid-cols-2 gap-1.5">
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
    </div>
  );
}

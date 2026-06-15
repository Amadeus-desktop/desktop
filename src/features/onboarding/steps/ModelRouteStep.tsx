import { useState } from "react";
import { useI18n } from "../../../i18n";
import { cn } from "../../../lib/utils/cn";
import { patchAppSettings, useSettings, ModelRoutePicker, toPrimaryModelRoute } from "../../settings";
import type { PrimaryModelRoute } from "../../settings";
import { shellText } from "../../../ui";
import { OnboardingCtaButton } from "../shell/OnboardingButtons";
import { OnboardingStepFrame } from "../shell/OnboardingStepFrame";

type ModelRouteStepProps = {
  onContinue: () => void;
  continuing?: boolean;
};

export function ModelRouteStep({ onContinue, continuing = false }: ModelRouteStepProps) {
  const t = useI18n();
  const s = t.onboarding.modelRoute;
  const { modelRoute } = useSettings();
  const [route, setRoute] = useState<PrimaryModelRoute>(toPrimaryModelRoute(modelRoute));

  function handleContinue() {
    patchAppSettings({ modelRoute: route });
    onContinue();
  }

  return (
    <OnboardingStepFrame
      compact
      eyebrow={t.onboarding.steps.modelRoute}
      title={s.headline}
      description={s.subheadline}
    >
      <div className="space-y-3">
        <ModelRoutePicker value={route} onChange={setRoute} />

        <div
          className="rounded-[14px] border border-[color:rgb(var(--accent-rgb)/0.16)] bg-[color:rgb(var(--accent-rgb)/0.05)] px-3 py-2.5 text-center"
        >
          <p className={cn("text-[11px] leading-relaxed", shellText.muted)}>
            {route === "api-first" ? s.apiHint : s.localHint}
          </p>
        </div>

        <OnboardingCtaButton disabled={continuing} onClick={handleContinue}>
          {s.continue}
        </OnboardingCtaButton>
      </div>
    </OnboardingStepFrame>
  );
}

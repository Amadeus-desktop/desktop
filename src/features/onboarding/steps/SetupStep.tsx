import { useState } from "react";
import { normalizeMateIconKind, type MateIconKind } from "../../../domain/mate";
import { useI18n } from "../../../i18n";
import { cn } from "../../../lib/utils/cn";
import { patchAppSettings, useSettings } from "../../settings";
import { MateIconPickerGrid } from "../../settings/components/MateIconPicker";
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
  const { companionMateIcon } = useSettings();
  const [mateIcon, setMateIcon] = useState<MateIconKind>(
    normalizeMateIconKind(companionMateIcon),
  );

  function handleComplete() {
    patchAppSettings({
      companionMateIcon: mateIcon,
    });
    onComplete();
  }

  return (
    <OnboardingStepFrame compact eyebrow={t.onboarding.steps.setup} title={s.headline} description={s.subheadline}>
      <div className="space-y-3">
        <p className={cn("text-center text-[11px] font-medium", shellText.muted)}>
          {s.mateLabel}
        </p>
        <MateIconPickerGrid value={mateIcon} onChange={setMateIcon} />

        <OnboardingCtaButton disabled={continuing} onClick={handleComplete}>
          {s.continue}
        </OnboardingCtaButton>
      </div>
    </OnboardingStepFrame>
  );
}

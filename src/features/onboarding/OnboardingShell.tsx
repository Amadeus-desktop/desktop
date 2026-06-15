import type { ReactNode } from "react";
import { MacWindow } from "../../ui";
import type { OnboardingStep } from "./types";
import { OnboardingProgressDots } from "./OnboardingProgressDots";

type OnboardingShellProps = {
  step: OnboardingStep;
  stepLabels: string[];
  children: ReactNode;
};

export function OnboardingShell({
  step,
  stepLabels,
  children,
}: OnboardingShellProps) {
  return (
    <MacWindow variant="onboarding">
      <div className="onboarding-enter grid h-full min-h-0 w-full grid-rows-[minmax(0,1fr)_auto]">
        <div className="scrollbar-hide grid min-h-0 place-items-center overflow-y-auto px-5 py-3">
          {children}
        </div>
        <OnboardingProgressDots labels={stepLabels} currentStep={step} />
      </div>
    </MacWindow>
  );
}

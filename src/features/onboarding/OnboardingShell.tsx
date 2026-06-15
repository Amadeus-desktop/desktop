import type { ReactNode } from "react";
import { MacWindow } from "../../ui";
import { OnboardingDragHandle } from "./OnboardingDragHandle";
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
      <div className="onboarding-enter grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)_auto]">
        <OnboardingDragHandle />
        <div className="scrollbar-hide flex min-h-0 items-center justify-center overflow-y-auto px-5 py-2">
          {children}
        </div>
        <OnboardingProgressDots labels={stepLabels} currentStep={step} />
      </div>
    </MacWindow>
  );
}

import type { ReactNode } from "react";
import { MacWindow } from "../../../ui";
import { OnboardingDragHandle } from "./OnboardingDragHandle";
import type { OnboardingStep } from "../../../domain/onboarding";
import { OnboardingProgressDots } from "./OnboardingProgressDots";

type OnboardingShellProps = {
  step: OnboardingStep;
  stepLabels: string[];
  children: ReactNode;
  hideProgress?: boolean;
};

export function OnboardingShell({
  step,
  stepLabels,
  children,
  hideProgress = false,
}: OnboardingShellProps) {
  return (
    <MacWindow variant="onboarding">
      <div className="relative h-full min-h-0 w-full overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_95%_50%_at_50%_-10%,rgb(var(--accent-rgb)/0.14),transparent_62%)]"
        />
        <div className="onboarding-enter relative flex h-full min-h-0 flex-col">
          <OnboardingDragHandle />
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-5 py-1">
            {children}
          </div>
          {hideProgress ? null : (
            <OnboardingProgressDots labels={stepLabels} currentStep={step} />
          )}
        </div>
      </div>
    </MacWindow>
  );
}
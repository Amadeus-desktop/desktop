import { cn } from "../../lib/cn";
import type { OnboardingStep } from "./types";
import { ONBOARDING_STEP_ORDER } from "./types";

type OnboardingProgressDotsProps = {
  labels: string[];
  currentStep: OnboardingStep;
};

export function OnboardingProgressDots({
  labels,
  currentStep,
}: OnboardingProgressDotsProps) {
  const activeIndex = ONBOARDING_STEP_ORDER.indexOf(currentStep);

  return (
    <div className="flex flex-col items-center gap-2 pb-4 pt-2" data-no-drag>
      <div className="flex items-center gap-2">
        {labels.map((label, index) => {
          const active = index === activeIndex;
          const completed = index < activeIndex;

          return (
            <span
              key={label}
              aria-current={active ? "step" : undefined}
              aria-label={label}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                active ? "w-5 bg-[color:var(--accent-soft)]" : "w-1.5",
                completed || active
                  ? "bg-[color:rgb(var(--accent-rgb)/0.85)]"
                  : "bg-[color:var(--shell-border-strong)]",
              )}
            />
          );
        })}
      </div>
      <p className="text-[10px] text-[color:var(--shell-ink-faint)]">
        {labels[activeIndex] ?? labels[0]}
      </p>
    </div>
  );
}

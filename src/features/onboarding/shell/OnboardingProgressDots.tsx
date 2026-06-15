import { cn } from "../../../lib/utils/cn";
import { ONBOARDING_STEP_ORDER, type OnboardingStep } from "../../../domain/onboarding";

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
    <div className="shrink-0 border-t border-[color:var(--shell-border-subtle)] px-5 pb-3.5 pt-3">
      <div className="flex items-center justify-center gap-1.5">
        {labels.map((label, index) => {
          const active = index === activeIndex;
          const completed = index < activeIndex;

          return (
            <span
              key={label}
              aria-current={active ? "step" : undefined}
              aria-label={label}
              className={cn(
                "rounded-full transition-all duration-300 ease-out",
                active ? "h-1.5 w-6 bg-[color:var(--accent-soft)]" : "h-1.5 w-1.5",
                completed || active
                  ? "bg-[color:rgb(var(--accent-rgb)/0.8)]"
                  : "bg-[color:var(--shell-border-strong)]",
              )}
            />
          );
        })}
      </div>
      <p className="mt-2 text-center text-[10px] font-medium tracking-wide text-[color:var(--shell-ink-faint)]">
        {labels[activeIndex] ?? labels[0]}
      </p>
    </div>
  );
}

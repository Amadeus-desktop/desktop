import { Check } from "lucide-react";
import { useI18n } from "../../../i18n";
import { cn } from "../../../lib/utils/cn";
import { shellText } from "../../../ui";
import { OnboardingStepFrame } from "../shell/OnboardingStepFrame";

export type PreparingPhase = "preparing" | "complete";

type PreparingStepProps = {
  phase: PreparingPhase;
};

export function PreparingStep({ phase }: PreparingStepProps) {
  const t = useI18n();
  const p = t.onboarding.preparing;
  const isComplete = phase === "complete";

  return (
    <OnboardingStepFrame
      eyebrow={isComplete ? p.doneEyebrow : p.eyebrow}
      title={isComplete ? p.doneTitle : p.title}
      description={isComplete ? p.doneSubtitle : p.subtitle}
    >
      <div className="flex justify-center py-6">
        {isComplete ? (
          <span
            className="flex size-10 items-center justify-center rounded-full border border-[color:rgb(var(--accent-rgb)/0.35)] bg-[color:rgb(var(--accent-rgb)/0.12)] text-[color:var(--accent-soft)]"
            aria-hidden="true"
          >
            <Check className="size-5" strokeWidth={2.5} />
          </span>
        ) : (
          <span
            className="h-1.5 w-8 animate-pulse rounded-full bg-[color:var(--accent-soft)]"
            aria-hidden="true"
          />
        )}
      </div>
      {isComplete ? (
        <p className={cn("text-center text-[11px] leading-relaxed", shellText.muted)}>
          {p.doneHint}
        </p>
      ) : null}
    </OnboardingStepFrame>
  );
}

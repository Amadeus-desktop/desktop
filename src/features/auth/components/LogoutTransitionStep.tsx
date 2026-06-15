import { Check } from "lucide-react";
import { useI18n } from "../../../i18n";
import { cn } from "../../../lib/utils/cn";
import { shellText } from "../../../ui";
import { OnboardingStepFrame } from "../../onboarding/shell/OnboardingStepFrame";
import type { LogoutPhase } from "../types";

type LogoutTransitionStepProps = {
  phase: LogoutPhase;
};

export function LogoutTransitionStep({ phase }: LogoutTransitionStepProps) {
  const t = useI18n();
  const isComplete = phase === "complete";
  const preparing = t.auth.logout.preparing;
  const complete = t.auth.logout.complete;

  return (
    <OnboardingStepFrame
      eyebrow={isComplete ? complete.eyebrow : preparing.eyebrow}
      title={isComplete ? complete.title : preparing.title}
      description={isComplete ? complete.subtitle : preparing.subtitle}
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
          {complete.hint}
        </p>
      ) : null}
    </OnboardingStepFrame>
  );
}

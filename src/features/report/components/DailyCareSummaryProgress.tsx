import { cn } from "../../../lib/utils/cn";
import {
  DAILY_CARE_SUMMARY_PHASES,
  type DailyCareSummaryPhase,
} from "../lib/dailyCareSummarySteps";
import { dailyCareStyles } from "../ui/reportStyles";

type DailyCareSummaryProgressProps = {
  currentPhase: DailyCareSummaryPhase;
  phaseLabels: Record<DailyCareSummaryPhase, string>;
};

export function DailyCareSummaryProgress({
  currentPhase,
  phaseLabels,
}: DailyCareSummaryProgressProps) {
  const activeIndex = DAILY_CARE_SUMMARY_PHASES.indexOf(currentPhase);

  return (
    <div className={dailyCareStyles.progressWrap}>
      <div className="flex items-center justify-center gap-1.5">
        {DAILY_CARE_SUMMARY_PHASES.map((phase, index) => {
          const active = index === activeIndex;
          const completed = index < activeIndex;

          return (
            <span
              key={phase}
              aria-current={active ? "step" : undefined}
              aria-label={phaseLabels[phase]}
              className={cn(
                "rounded-full transition-all duration-300 ease-out",
                active
                  ? dailyCareStyles.progressDotActive
                  : completed
                    ? dailyCareStyles.progressDotDone
                    : dailyCareStyles.progressDotIdle,
              )}
            />
          );
        })}
      </div>
      <p className={dailyCareStyles.progressLabel}>{phaseLabels[currentPhase]}</p>
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "../../../../../lib/utils/cn";
import { dailyCareStyles } from "../../ui/styles";

type DailyCareSummaryStepFrameProps = {
  eyebrow: string;
  title: string;
  description?: string;
  compact?: boolean;
  children?: ReactNode;
};

export function DailyCareSummaryStepFrame({
  eyebrow,
  title,
  description,
  compact = false,
  children,
}: DailyCareSummaryStepFrameProps) {
  return (
    <div className="mx-auto flex w-full max-w-[34rem] flex-col items-center text-center">
      <header className={cn(compact ? "mb-4 space-y-1.5" : "mb-6 space-y-2.5")}>
        <p className={dailyCareStyles.stepEyebrow}>{eyebrow}</p>
        <h3
          className={cn(
            compact
              ? "text-[1.15rem] leading-[1.3] tracking-[-0.02em]"
              : "text-[1.45rem] leading-[1.25] tracking-[-0.02em]",
            dailyCareStyles.stepTitle,
          )}
        >
          {title.split("\n").map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h3>
        {description ? (
          <p
            className={cn(
              dailyCareStyles.stepDescription,
              compact ? "text-[11px]" : "text-[13px]",
            )}
          >
            {description}
          </p>
        ) : null}
      </header>
      {children ? <div className="w-full">{children}</div> : null}
    </div>
  );
}

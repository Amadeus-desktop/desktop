import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { glassStyles, shellText } from "../../ui";

type OnboardingStepFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function OnboardingStepFrame({
  eyebrow,
  title,
  description,
  children,
}: OnboardingStepFrameProps) {
  return (
    <div className="select-text flex w-full max-w-[19rem] flex-col" data-no-drag>
      <header
        className={cn(
          "mb-4 border border-[color:var(--shell-border-subtle)] px-4 py-3.5 text-center",
          glassStyles.panel,
          glassStyles.radiusCard,
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:rgb(var(--accent-rgb)/0.85)]">
          {eyebrow}
        </p>
        <h1 className={cn("mt-1.5 text-[1.05rem] font-semibold leading-snug", shellText.primary)}>
          {title}
        </h1>
        <p className={cn("mt-2 text-[11px] leading-5", shellText.muted)}>{description}</p>
      </header>
      {children}
    </div>
  );
}

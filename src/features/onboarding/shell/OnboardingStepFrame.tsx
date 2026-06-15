import type { ReactNode } from "react";
import { cn } from "../../../lib/utils/cn";
import { shellText } from "../../../ui";

type OnboardingStepFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  compact?: boolean;
  children?: ReactNode;
};

export function OnboardingStepFrame({
  eyebrow,
  title,
  description,
  compact = false,
  children,
}: OnboardingStepFrameProps) {
  return (
    <div
      className="select-text relative z-10 flex w-full max-w-[19.5rem] flex-col items-center text-center"
    >
      <header className={cn(compact ? "mb-4 space-y-1.5" : "mb-6 space-y-2.5")}>
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:rgb(var(--accent-rgb)/0.78)]"
        >
          {eyebrow}
        </p>
        <h1
          className={cn(
            compact
              ? "text-[1.15rem] leading-[1.3] tracking-[-0.02em]"
              : "text-[1.3rem] leading-[1.25] tracking-[-0.02em]",
            "font-semibold",
            shellText.primary,
          )}
        >
          {title}
        </h1>
        <p
          className={cn(
            "mx-auto max-w-[17.5rem] leading-[1.5]",
            compact ? "text-[11px]" : "text-[12px]",
            shellText.muted,
          )}
        >
          {description}
        </p>
      </header>
      {children ? <div className="w-full">{children}</div> : null}
    </div>
  );
}

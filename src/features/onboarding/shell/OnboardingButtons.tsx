import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../../lib/utils/cn";

type OnboardingCtaButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

export function OnboardingCtaButton({
  className,
  children,
  loading = false,
  disabled,
  ...props
}: OnboardingCtaButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        "inline-flex h-11 w-full items-center justify-center rounded-[14px] border border-[color:rgb(var(--accent-rgb)/0.4)] bg-gradient-to-b from-[color:var(--accent-gradient-from)] to-[color:var(--accent-gradient-to)] px-4 text-[13px] font-semibold text-[color:var(--accent-on)] shadow-[0_10px_28px_rgb(var(--accent-rgb)/0.32)] transition hover:brightness-[1.04] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none",
        className,
      )}
      {...props}
    >
      {loading ? "…" : children}
    </button>
  );
}

type OnboardingTextButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function OnboardingTextButton({
  className,
  children,
  ...props
}: OnboardingTextButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "text-[11px] font-medium text-[color:var(--shell-ink-faint)] transition hover:text-[color:var(--accent-soft)] disabled:opacity-45",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

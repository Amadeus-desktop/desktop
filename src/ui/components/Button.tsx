import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "soft" | "ghost";
type ButtonSize = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "border border-[color:rgb(var(--accent-rgb)/0.35)] bg-gradient-to-b from-[color:var(--accent-gradient-from)] to-[color:var(--accent-gradient-to)] text-[color:var(--accent-on)] shadow-[0_4px_14px_rgb(var(--accent-rgb)/0.28)] hover:brightness-105",
  secondary:
    "border border-[color:var(--shell-border-strong)] bg-[color:var(--shell-panel-strong)] text-[color:var(--shell-ink)] hover:bg-[color:var(--shell-row-hover)]",
  soft:
    "border border-[color:rgb(var(--accent-rgb)/0.25)] bg-[color:rgb(var(--accent-rgb)/0.12)] text-[color:var(--accent)] hover:bg-[color:rgb(var(--accent-rgb)/0.18)]",
  ghost:
    "border border-transparent bg-transparent text-[color:var(--shell-ink-muted)] hover:bg-[color:var(--shell-row-hover)] hover:text-[color:var(--shell-ink)]",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "rounded-full px-3 py-1 text-[11px] font-medium",
  md: "rounded-full px-4 py-1.5 text-xs font-semibold",
};

export function Button({
  variant = "secondary",
  size = "sm",
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center transition disabled:cursor-not-allowed disabled:opacity-45",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

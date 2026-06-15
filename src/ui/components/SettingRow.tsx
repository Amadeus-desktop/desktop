import type { ReactNode } from "react";
import { cn } from "../../lib/utils/cn";
import { glassStyles, shellText } from "../theme/shellStyles";
import { useSettingsGroup } from "./SettingsGroup";

export type SettingRowVariant = "primary" | "default" | "nested";
export type SettingRowLayout = "inline" | "stack";

type SettingRowProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  variant?: SettingRowVariant;
  layout?: SettingRowLayout;
};

const variantTitleClass: Record<SettingRowVariant, string> = {
  primary: cn("text-[13px] font-semibold", shellText.primary),
  default: cn("text-xs font-medium", shellText.primary),
  nested: cn("text-xs font-medium", shellText.primary, "opacity-90"),
};

export function SettingRow({
  title,
  subtitle,
  children,
  variant = "default",
  layout = "inline",
}: SettingRowProps) {
  const grouped = useSettingsGroup();
  const isStack = layout === "stack";

  return (
    <div
      className={cn(
        grouped
          ? "border-b border-[color:var(--shell-border-subtle)] px-3.5 py-3 last:border-b-0"
          : cn("mb-1.5 px-3 py-2.5", glassStyles.row, glassStyles.radiusCard),
        variant === "nested" && grouped && "border-l-2 border-l-[color:rgb(var(--accent-rgb)/0.28)] bg-[color:rgb(var(--accent-rgb)/0.03)] pl-4",
        variant === "primary" && grouped && "bg-[color:rgb(var(--accent-rgb)/0.04)]",
        isStack ? "flex flex-col gap-2.5" : "flex items-center justify-between gap-3",
      )}
    >
      <div className={cn("min-w-0", grouped ? "shrink" : undefined, isStack && "w-full")}>
        <div className={variantTitleClass[variant]}>{title}</div>
        <div className={cn("mt-0.5 text-[10px] leading-4", shellText.faint)}>{subtitle}</div>
      </div>
      <div
        className={cn(
          isStack ? "w-full" : "flex min-w-0 shrink-0 justify-end",
          !isStack && "max-w-[52%]",
        )}
      >
        {children}
      </div>
    </div>
  );
}

import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils/cn";
import { glassStyles, shellText } from "../theme/shellStyles";

type SidebarItemProps = {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
};

export function SidebarItem({
  label,
  icon: Icon,
  active,
  onClick,
}: SidebarItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-medium transition max-sm:shrink-0",
        active
          ? cn(
              glassStyles.rowSelected,
              shellText.primary,
              "font-semibold",
            )
          : cn(
              "border-transparent",
              shellText.muted,
              "hover:border-[color:var(--shell-border-subtle)] hover:bg-[color:var(--shell-row-hover)] hover:text-[color:var(--shell-ink)]",
            ),
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={2} />
      <span className="truncate">{label}</span>
    </button>
  );
}

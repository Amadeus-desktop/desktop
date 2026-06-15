import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";

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
        "flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium transition max-sm:shrink-0",
        active
          ? "border border-[#0a84ff] bg-[#1a3a5c] text-white"
          : "text-white/65 hover:border-[#48484f] hover:bg-[#2a2a2e] hover:text-white",
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={2} />
      <span className="truncate">{label}</span>
    </button>
  );
}

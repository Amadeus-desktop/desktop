import type { LucideIcon } from "lucide-react";

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
      className={`flex min-w-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition max-sm:shrink-0 ${
        active
          ? "bg-[#007aff] text-white"
          : "text-white/65 hover:bg-white/6 hover:text-white"
      }`}
    >
      <Icon className="size-4 shrink-0" strokeWidth={2} />
      <span className="truncate">{label}</span>
    </button>
  );
}

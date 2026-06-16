import { cn } from "../../lib/utils/cn";
import { createWindowDragHandler } from "../lib/windowDrag";
import { UserAvatar } from "./UserAvatar";

const handleWindowDragMouseDown = createWindowDragHandler();

type SidebarBrandProps = {
  name: string;
  subtitle: string;
  avatarUrl?: string;
  active?: boolean;
  onClick?: () => void;
};

export function SidebarBrand({
  name,
  subtitle,
  avatarUrl,
  active = false,
  onClick,
}: SidebarBrandProps) {
  const content = (
    <>
      <UserAvatar name={name} avatarUrl={avatarUrl} className="size-8 shrink-0" />
      <div className="min-w-0 text-left">
        <div className="truncate text-xs font-semibold text-[color:var(--shell-ink)]">{name}</div>
        <div className="mt-0.5 truncate text-[10px] leading-4 text-[color:var(--shell-ink-faint)]">
          {subtitle}
        </div>
      </div>
    </>
  );

  if (!onClick) {
    return (
      <div
        onMouseDown={handleWindowDragMouseDown}
        className="min-w-0 select-none px-2 pb-2 pt-0.5 max-sm:hidden"
      >
        <div className="flex items-center gap-2.5">{content}</div>
      </div>
    );
  }

  return (
    <div className="px-2 pb-2 pt-0.5 max-sm:hidden">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "tauri-no-drag flex w-full items-center gap-2.5 rounded-xl border px-2 py-2 text-left transition",
          active
            ? "border-[color:rgb(var(--accent-rgb)/0.42)] bg-[color:rgb(var(--accent-rgb)/0.1)]"
            : "border-transparent hover:border-[color:var(--shell-border-subtle)] hover:bg-[color:var(--shell-row-hover)]",
        )}
      >
        {content}
      </button>
    </div>
  );
}

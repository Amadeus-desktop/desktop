import { LogOut } from "lucide-react";
import { useState } from "react";
import { useI18n } from "../../i18n";
import { cn } from "../../lib/cn";
import { useAuth } from "../auth";

type SidebarLogoutButtonProps = {
  className?: string;
};

export function SidebarLogoutButton({ className }: SidebarLogoutButtonProps) {
  const t = useI18n();
  const { user, signOutWithTransition } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOutWithTransition();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loggingOut}
      onClick={() => void handleLogout()}
      className={cn(
        "app-no-drag flex w-full items-center gap-2 rounded-xl border border-transparent px-2.5 py-2 text-left text-xs font-medium text-[color:var(--shell-ink-muted)] transition hover:border-[color:var(--shell-border-subtle)] hover:bg-[color:var(--shell-row-hover)] hover:text-[color:var(--shell-ink)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <LogOut className="size-4 shrink-0" strokeWidth={2} />
      <span className="min-w-0 flex-1 truncate">
        {loggingOut ? t.auth.account.loggingOut : t.auth.account.logout}
      </span>
      {user ? (
        <span className="max-w-[5.5rem] truncate text-[10px] text-[color:var(--shell-ink-faint)]">
          {user.name}
        </span>
      ) : null}
    </button>
  );
}

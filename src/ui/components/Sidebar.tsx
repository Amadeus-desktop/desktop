import type { ReactNode } from "react";
import { glassStyles } from "../theme/shellStyles";
import { WindowDragStrip } from "./WindowDragStrip";

type SidebarProps = {
  brand?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function Sidebar({ brand, children, footer }: SidebarProps) {
  return (
    <aside
      className={`tauri-no-drag flex h-full w-full min-w-0 flex-col gap-0.5 px-2 py-3 max-sm:border-b max-sm:border-white/8 max-sm:py-2 ${glassStyles.sidebar}`}
    >
      {/* WindowControls live on MacWindow so Daily Care overlay cannot block them. */}
      <div className="h-7 shrink-0 pb-2" aria-hidden="true" />
      {brand}
      <nav className="flex flex-col gap-1 max-sm:flex-row max-sm:overflow-x-auto">
        {children}
      </nav>
      <WindowDragStrip className="mt-1 min-h-4 flex-1" />
      {footer ? (
        <div className="tauri-no-drag relative z-10 mt-auto shrink-0 pt-2">
          {footer}
        </div>
      ) : null}
    </aside>
  );
}

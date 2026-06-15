import type { ReactNode } from "react";
import { glassStyles } from "../lib/glassStyles";
import { WindowControls } from "./WindowControls";
import { WindowDragStrip } from "./WindowDragStrip";

type SidebarProps = {
  brand?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function Sidebar({ brand, children, footer }: SidebarProps) {
  return (
    <aside
      className={`app-no-drag flex h-full w-full min-w-0 flex-col gap-0.5 px-2 py-3 max-sm:border-b max-sm:border-white/8 max-sm:py-2 ${glassStyles.sidebar}`}
    >
      <div className="flex w-full items-center pb-2">
        <WindowControls />
      </div>
      {brand}
      <nav className="flex flex-col gap-1 max-sm:flex-row max-sm:overflow-x-auto">
        {children}
      </nav>
      <WindowDragStrip className="mt-1 min-h-4 flex-1" />
      {footer ? (
        <div className="app-no-drag relative z-10 mt-auto shrink-0 pt-2">
          {footer}
        </div>
      ) : null}
    </aside>
  );
}

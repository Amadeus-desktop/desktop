import type { ReactNode } from "react";
import { WindowControls } from "./WindowControls";

type SidebarProps = {
  children: ReactNode;
};

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="flex w-[210px] shrink-0 flex-col gap-1 border-r border-white/6 bg-[#161616]/40 px-2.5 py-5 max-sm:w-full max-sm:border-b max-sm:border-r-0 max-sm:py-3">
      <div data-tauri-drag-region className="flex w-full pb-4 items-center select-none">
        <WindowControls />
      </div>
      <nav className="flex flex-col gap-1 max-sm:flex-row max-sm:overflow-x-auto">
        {children}
      </nav>
    </aside>
  );
}

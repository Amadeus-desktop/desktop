import type { ReactNode } from "react";
import { WindowControls } from "./WindowControls";

type SidebarProps = {
  children: ReactNode;
};

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside
      data-tauri-drag-region
      className="flex h-full w-full min-w-0 flex-col gap-1 bg-[#161616]/40 px-2.5 py-5 max-sm:border-b max-sm:border-white/6 max-sm:py-3"
    >
      <div data-tauri-drag-region className="flex w-full pb-4 items-center select-none">
        <WindowControls />
      </div>
      <nav className="flex flex-col gap-1 max-sm:flex-row max-sm:overflow-x-auto">
        {children}
      </nav>
    </aside>
  );
}

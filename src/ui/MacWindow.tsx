import type { ReactNode } from "react";
import { controlCenterWindowPolicy } from "./layout/controlCenterPreferences";

type MacWindowProps = {
  children: ReactNode;
};

export function MacWindow({ children }: MacWindowProps) {
  return (
    <section
      className="app-shell animate-window-appear flex h-full w-full min-h-0 overflow-hidden rounded-xl border border-white/12 bg-[#1e1e1e] text-white"
      style={{
        minWidth: controlCenterWindowPolicy.minWidth,
        minHeight: controlCenterWindowPolicy.minHeight,
      }}
    >
      {children}
    </section>
  );
}

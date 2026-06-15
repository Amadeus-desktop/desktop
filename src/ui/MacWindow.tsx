import type { ReactNode } from "react";
import { glassStyles } from "./glassStyles";
import { controlCenterWindowPolicy } from "./layout/controlCenterPreferences";

type MacWindowProps = {
  children: ReactNode;
};

export function MacWindow({ children }: MacWindowProps) {
  return (
    <section
      className={`app-shell animate-window-appear flex h-full w-full min-h-0 overflow-hidden text-white ${glassStyles.shell} ${glassStyles.radiusWindow}`}
      style={{
        minWidth: controlCenterWindowPolicy.minWidth,
        minHeight: controlCenterWindowPolicy.minHeight,
      }}
    >
      {children}
    </section>
  );
}

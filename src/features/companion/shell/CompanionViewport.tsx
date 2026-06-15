import type { ReactNode } from "react";
import { useTauriCompanionWindow } from "../window/useTauriCompanionWindow";
import { companionStyles } from "../ui/styles";

type CompanionViewportProps = {
  children: ReactNode;
};

export function CompanionViewport({ children }: CompanionViewportProps) {
  const ref = useTauriCompanionWindow();

  return (
    <div ref={ref} className={companionStyles.stack}>
      {children}
    </div>
  );
}

import type { ReactNode } from "react";
import { companionStyles } from "../ui/styles";

type CompanionViewportProps = {
  children: ReactNode;
};

export function CompanionViewport({ children }: CompanionViewportProps) {
  return (
    <div className={companionStyles.root}>
      <div className={companionStyles.stack}>{children}</div>
    </div>
  );
}

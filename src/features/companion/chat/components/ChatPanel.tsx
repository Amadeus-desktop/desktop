import type { ReactNode } from "react";
import { cn } from "../../../../lib/cn";
import { companionStyles } from "../../ui/styles";

type ChatPanelProps = {
  children: ReactNode;
  className?: string;
};

export function ChatPanel({ children, className }: ChatPanelProps) {
  return (
    <div className={cn(companionStyles.panel, companionStyles.panelSize, className)}>
      {children}
    </div>
  );
}

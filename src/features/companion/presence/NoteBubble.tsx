import type { ReactNode } from "react";
import { cn } from "../../../lib/utils/cn";
import { companionStyles } from "../ui/styles";

type NoteBubbleProps = {
  children: ReactNode;
  className?: string;
  animate?: boolean;
};

/** Warm paper memo resting above the mate anchor — not a chat bubble. */
export function NoteBubble({ children, className, animate = true }: NoteBubbleProps) {
  return (
    <article
      className={cn(
        companionStyles.noteBubble,
        animate && companionStyles.noteBubbleEnter,
        className,
      )}
    >
      {children}
    </article>
  );
}

import type { ReactNode } from "react";
import { cn } from "../../../lib/utils/cn";
import { companionStyles } from "../ui/styles";

type NoteBubbleProps = {
  children: ReactNode;
  className?: string;
  animate?: boolean;
};

/** Speech bubble anchored visually to the mate icon below (tail at bottom-right). */
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

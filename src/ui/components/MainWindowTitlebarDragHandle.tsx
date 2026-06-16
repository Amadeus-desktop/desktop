import { cn } from "../../lib/utils/cn";
import { windowDragRegionProps } from "../lib/windowDrag";

type MainWindowTitlebarDragHandleProps = {
  className?: string;
  showGrip?: boolean;
};

/**
 * Top titlebar drag zone for frameless main windows. Uses the native drag command
 * instead of `-webkit-app-region: drag`, which jumps on the first drag over async IPC.
 */
export function MainWindowTitlebarDragHandle({
  className,
  showGrip = true,
}: MainWindowTitlebarDragHandleProps) {
  return (
    <div
      {...windowDragRegionProps}
      aria-hidden="true"
      className={cn(
        "flex h-11 w-full shrink-0 cursor-default select-none touch-none items-center justify-center [&_*]:select-none",
        className,
      )}
    >
      {showGrip ? (
        <div
          className="pointer-events-none h-1 w-11 rounded-full bg-[color:var(--shell-border-strong)]/90"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

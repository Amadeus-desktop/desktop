import { cn } from "../../lib/utils/cn";
import { windowDragRegionProps } from "../lib/windowDrag";

type WindowDragStripProps = {
  className?: string;
};

/**
 * Leaf-only drag handle. Routes through `start_main_window_drag_command` instead
 * of tao's `data-tauri-drag-region`, whose async drag path jumps the window on
 * the first drag (wrong, global-coordinate anchor).
 */
export function WindowDragStrip({ className }: WindowDragStripProps) {
  return (
    <div
      {...windowDragRegionProps}
      aria-hidden="true"
      className={cn(
        "min-h-0 shrink-0 cursor-default select-none touch-none [&_*]:select-none",
        className,
      )}
    />
  );
}

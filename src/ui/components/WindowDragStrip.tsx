import { cn } from "../../lib/utils/cn";
import { createWindowDragHandler } from "../lib/windowDrag";

type WindowDragStripProps = {
  className?: string;
};

const handleWindowDragMouseDown = createWindowDragHandler();

/**
 * Leaf-only drag handle. Routes through `start_main_window_drag_command` instead
 * of tao's `data-tauri-drag-region`, whose async drag path jumps the window on
 * the first drag (wrong, global-coordinate anchor).
 */
export function WindowDragStrip({ className }: WindowDragStripProps) {
  return (
    <div
      onMouseDown={handleWindowDragMouseDown}
      aria-hidden="true"
      className={cn("min-h-0 shrink-0 cursor-default select-none touch-none", className)}
    />
  );
}

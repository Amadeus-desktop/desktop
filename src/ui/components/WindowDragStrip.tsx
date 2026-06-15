import { cn } from "../../lib/utils/cn";

type WindowDragStripProps = {
  className?: string;
};

/** Leaf-only drag handle. Native `data-tauri-drag-region` — no JS startDragging (avoids jank). */
export function WindowDragStrip({ className }: WindowDragStripProps) {
  return (
    <div
      data-tauri-drag-region
      aria-hidden="true"
      className={cn("min-h-0 shrink-0 cursor-default select-none touch-none", className)}
    />
  );
}

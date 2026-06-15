import { cn } from "../../lib/utils/cn";
import { useWindowDragRegion } from "../hooks/useWindowDragRegion";

type WindowDragStripProps = {
  className?: string;
};

/** Leaf-only drag handle. Do not wrap interactive children. */
export function WindowDragStrip({ className }: WindowDragStripProps) {
  const dragRef = useWindowDragRegion<HTMLDivElement>();

  return (
    <div
      ref={dragRef}
      data-tauri-drag-region
      aria-hidden="true"
      className={cn("min-h-0 shrink-0 cursor-default select-none touch-none", className)}
    />
  );
}

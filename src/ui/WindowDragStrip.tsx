import { cn } from "../lib/cn";

type WindowDragStripProps = {
  className?: string;
};

/** Leaf-only drag handle. Do not wrap interactive children. */
export function WindowDragStrip({ className }: WindowDragStripProps) {
  return (
    <div
      data-tauri-drag-region
      aria-hidden="true"
      className={cn("min-h-0 shrink-0 select-none", className)}
    />
  );
}

import { createWindowDragHandler } from "../../../ui/lib/windowDrag";

const handleDragMouseDown = createWindowDragHandler();

export function OnboardingDragHandle() {
  return (
    <div
      onMouseDown={handleDragMouseDown}
      aria-hidden="true"
      className="tauri-titlebar flex h-11 w-full shrink-0 cursor-default select-none items-center justify-center"
    >
      <div
        className="pointer-events-none h-1 w-11 rounded-full bg-[color:var(--shell-border-strong)]/90"
        aria-hidden="true"
      />
    </div>
  );
}

import { createWindowDragHandler } from "../../../ui";

export function OnboardingDragHandle() {
  const handleDrag = createWindowDragHandler();

  return (
    <div
      onPointerDown={handleDrag}
      aria-hidden="true"
      className="flex h-9 w-full shrink-0 cursor-default select-none items-center justify-center"
    >
      <div className="h-1 w-11 rounded-full bg-[color:var(--shell-border-strong)]/90" />
    </div>
  );
}

export function OnboardingDragHandle() {
  return (
    <div
      data-tauri-drag-region
      aria-hidden="true"
      className="relative z-20 flex h-9 w-full shrink-0 cursor-default select-none items-center justify-center"
    >
      <div
        className="pointer-events-none h-1 w-11 rounded-full bg-[color:var(--shell-border-strong)]/90"
        aria-hidden="true"
      />
    </div>
  );
}

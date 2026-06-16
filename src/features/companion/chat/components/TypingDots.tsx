export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 px-0.5" aria-hidden="true">
      <span className="size-1.5 animate-[chat-typing_1.2s_ease-in-out_infinite] rounded-full bg-[color:var(--shell-ink-faint)] [animation-delay:0ms]" />
      <span className="size-1.5 animate-[chat-typing_1.2s_ease-in-out_infinite] rounded-full bg-[color:var(--shell-ink-faint)] [animation-delay:160ms]" />
      <span className="size-1.5 animate-[chat-typing_1.2s_ease-in-out_infinite] rounded-full bg-[color:var(--shell-ink-faint)] [animation-delay:320ms]" />
    </span>
  );
}

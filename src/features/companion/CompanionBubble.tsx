import { MessageCircle, X } from "lucide-react";

type CompanionBubbleProps = {
  message: string;
  onOpen: () => void;
  onDismiss: () => void;
};

export function CompanionBubble({
  message,
  onOpen,
  onDismiss,
}: CompanionBubbleProps) {
  return (
    <div className="animate-bubble-in fixed bottom-8 right-8 z-20 flex max-w-[320px] items-start gap-3 rounded-xl border border-white/12 bg-[#2c2c2e]/88 p-3 text-white shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl max-sm:bottom-4 max-sm:right-4 max-sm:max-w-[calc(100vw-32px)]">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-start gap-3 text-left"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#bf5af2]">
          <MessageCircle className="size-4" />
        </span>
        <span className="min-w-0 text-[13px] leading-5 text-white/90">
          {message}
        </span>
      </button>
      <button
        type="button"
        aria-label="말풍선 닫기"
        onClick={onDismiss}
        className="rounded-md p-1 text-white/45 transition hover:bg-white/8 hover:text-white"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

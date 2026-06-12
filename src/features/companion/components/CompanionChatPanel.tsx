import { Send, X } from "lucide-react";
import type { FormEvent } from "react";
import type { CompanionMessage } from "../model/types";

type CompanionChatPanelProps = {
  messages: CompanionMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onClose: () => void;
};

export function CompanionChatPanel({
  messages,
  draft,
  onDraftChange,
  onSend,
  onClose,
}: CompanionChatPanelProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSend();
  };

  return (
    <section className="animate-bubble-in fixed bottom-8 right-8 z-20 flex h-[420px] w-[340px] flex-col overflow-hidden rounded-xl border border-white/12 bg-[#1f1f22]/92 text-white shadow-[0_20px_54px_rgba(0,0,0,0.42)] backdrop-blur-2xl max-sm:bottom-4 max-sm:right-4 max-sm:h-[min(420px,calc(100vh-32px))] max-sm:w-[calc(100vw-32px)]">
      <header className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Amadeus</h2>
          <p className="mt-0.5 text-[11px] text-white/40">에밀리아 모드</p>
        </div>
        <button
          type="button"
          aria-label="채팅 닫기"
          onClick={onClose}
          className="rounded-md p-1.5 text-white/45 transition hover:bg-white/8 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[78%] rounded-lg px-3 py-2 text-[13px] leading-5 ${
                message.sender === "user"
                  ? "bg-[#007aff] text-white"
                  : "bg-white/8 text-white/86"
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-white/8 p-3"
      >
        <input
          value={draft}
          onChange={(event) => onDraftChange(event.currentTarget.value)}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/8 px-3 py-2 text-[13px] text-white outline-none transition placeholder:text-white/30 focus:border-[#007aff]"
          placeholder="메시지 입력"
        />
        <button
          type="submit"
          aria-label="메시지 보내기"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#007aff] text-white transition hover:bg-[#0a84ff]"
        >
          <Send className="size-4" />
        </button>
      </form>
    </section>
  );
}

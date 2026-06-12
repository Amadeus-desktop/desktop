import { MessageCircle } from "lucide-react";
import { CompanionBubble } from "./components/CompanionBubble";
import { CompanionChatPanel } from "./components/CompanionChatPanel";
import { useCompanionBubble } from "./hooks/useCompanionBubble";

export function CompanionShell() {
  const {
    bubbleVisible,
    chatOpen,
    message,
    messages,
    draft,
    setDraft,
    sendMessage,
    showBubble,
    dismissBubble,
    openChat,
    closeChat,
  } = useCompanionBubble();

  if (chatOpen) {
    return (
      <CompanionChatPanel
        messages={messages}
        draft={draft}
        onDraftChange={setDraft}
        onSend={sendMessage}
        onClose={closeChat}
      />
    );
  }

  if (bubbleVisible) {
    return (
      <CompanionBubble
        message={message}
        onOpen={openChat}
        onDismiss={dismissBubble}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label="Amadeus 열기"
      onClick={showBubble}
      className="fixed bottom-8 right-8 z-20 flex size-12 items-center justify-center rounded-full border border-white/12 bg-[#2c2c2e]/88 text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition hover:bg-[#3a3a3c]/90 max-sm:bottom-4 max-sm:right-4"
    >
      <MessageCircle className="size-5" />
    </button>
  );
}

import { ChatBubble } from "./components/ChatBubble";
import type { CompanionMessage } from "../types";
import type { PersonaId } from "../../../domain/persona/types";

type DeepChatViewProps = {
  messages: CompanionMessage[];
  personaName: string;
  personaId: PersonaId;
  isSending?: boolean;
};

export function DeepChatView({
  messages,
  personaName,
  personaId,
  isSending = false,
}: DeepChatViewProps) {
  return (
    <div className="space-y-3">
      {messages.map((message, index) => {
        const previous = messages[index - 1];
        const showAvatar =
          message.sender === "companion" &&
          (index === 0 || previous?.sender !== "companion");

        return (
          <ChatBubble
            key={message.id}
            sender={message.sender}
            senderName={showAvatar ? personaName : undefined}
            personaId={personaId}
            showAvatar={showAvatar}
          >
            {message.text}
          </ChatBubble>
        );
      })}
      {isSending ? (
        <p className="px-1 text-[11px] text-[color:var(--shell-ink-faint)]">…</p>
      ) : null}
    </div>
  );
}

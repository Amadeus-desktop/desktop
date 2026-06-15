import { ChatBubble } from "./components/ChatBubble";
import type { CompanionMessage } from "../types";

type DeepChatViewProps = {
  messages: CompanionMessage[];
  personaName: string;
};

export function DeepChatView({ messages, personaName }: DeepChatViewProps) {
  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
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
            showAvatar={showAvatar}
          >
            {message.text}
          </ChatBubble>
        );
      })}
    </div>
  );
}

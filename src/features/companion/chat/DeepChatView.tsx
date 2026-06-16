import { ChatBubble } from "./components/ChatBubble";
import { TypingDots } from "./components/TypingDots";
import type { MateIconKind } from "../../../domain/mate";
import type { CompanionLocale } from "../../../i18n";
import { PersonaPresenceIcon } from "../ui/PersonaPresenceIcon";
import { companionStyles } from "../ui/styles";
import type { CompanionMessage } from "../types";

type DeepChatViewProps = {
  messages: CompanionMessage[];
  personaName: string;
  mateIcon: MateIconKind;
  userName: string;
  isSending?: boolean;
  labels: CompanionLocale;
};

function shouldShowSenderName(
  messages: CompanionMessage[],
  index: number,
): boolean {
  const message = messages[index];
  const previous = messages[index - 1];
  return index === 0 || previous?.sender !== message.sender;
}

export function DeepChatView({
  messages,
  personaName,
  mateIcon,
  userName,
  isSending = false,
  labels,
}: DeepChatViewProps) {
  return (
    <div className={companionStyles.chatThread}>
      {messages.map((message, index) => (
        <ChatBubble
          key={message.id}
          sender={message.sender}
          senderName={message.sender === "user" ? userName : personaName}
          showSenderName={shouldShowSenderName(messages, index)}
          mateIcon={mateIcon}
        >
          {message.text}
        </ChatBubble>
      ))}

      {isSending ? (
        <div className={companionStyles.bubbleRow} aria-live="polite">
          <PersonaPresenceIcon
            kind={mateIcon}
            accentSource="settings"
            size="sm"
            variant="filled"
            className="shrink-0"
          />
          <div className="min-w-0">
            <p className={companionStyles.senderCompanion}>{personaName}</p>
            <div className={companionStyles.typingBubble}>
              <span className="sr-only">{labels.chat.typing}</span>
              <TypingDots />
            </div>
          </div>
        </div>
      ) : null}

      {messages.length === 0 ? (
        <p className={companionStyles.chatEmpty}>{labels.chat.waiting}</p>
      ) : null}
    </div>
  );
}

import type { ReactNode } from "react";
import type { PersonaId } from "../../../../domain/persona/types";
import { companionStyles } from "../../ui/styles";
import { ChatAvatar } from "./ChatAvatar";

type ChatBubbleProps = {
  sender: "companion" | "user";
  senderName?: string;
  personaId?: PersonaId;
  showAvatar?: boolean;
  children: ReactNode;
};

export function ChatBubble({
  sender,
  senderName,
  personaId,
  showAvatar = true,
  children,
}: ChatBubbleProps) {
  if (sender === "user") {
    return (
      <div className={companionStyles.bubbleRowUser}>
        <div className={companionStyles.bubbleUser}>{children}</div>
      </div>
    );
  }

  return (
    <div className={companionStyles.bubbleRow}>
      {showAvatar && personaId ? (
        <ChatAvatar personaId={personaId} />
      ) : (
        <div className="size-chat-avatar shrink-0" />
      )}
      <div className="min-w-0">
        {senderName && showAvatar ? (
          <p className={companionStyles.sender}>{senderName}</p>
        ) : null}
        <div className={companionStyles.bubbleCompanion}>{children}</div>
      </div>
    </div>
  );
}

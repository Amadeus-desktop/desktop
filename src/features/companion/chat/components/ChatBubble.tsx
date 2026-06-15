import type { ReactNode } from "react";
import { companionStyles } from "../../ui/styles";
import { ChatAvatar } from "./ChatAvatar";

type ChatBubbleProps = {
  sender: "companion" | "user";
  senderName?: string;
  showAvatar?: boolean;
  children: ReactNode;
};

export function ChatBubble({
  sender,
  senderName,
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
      {showAvatar ? <ChatAvatar /> : <div className="size-chat-avatar shrink-0" />}
      <div className="min-w-0">
        {senderName && showAvatar ? (
          <p className={companionStyles.sender}>{senderName}</p>
        ) : null}
        <div className={companionStyles.bubbleCompanion}>{children}</div>
      </div>
    </div>
  );
}

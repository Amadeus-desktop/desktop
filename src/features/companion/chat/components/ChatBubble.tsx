import type { ReactNode } from "react";
import type { MateIconKind } from "../../../../domain/mate";
import { PersonaPresenceIcon } from "../../ui/PersonaPresenceIcon";
import { companionStyles } from "../../ui/styles";

type ChatBubbleProps = {
  sender: "companion" | "user";
  senderName?: string;
  showSenderName?: boolean;
  mateIcon?: MateIconKind;
  children: ReactNode;
};

export function ChatBubble({
  sender,
  senderName,
  showSenderName = false,
  mateIcon,
  children,
}: ChatBubbleProps) {
  if (sender === "user") {
    return (
      <div className={companionStyles.bubbleRowUser}>
        <div className="flex max-w-[88%] flex-col items-end gap-1">
          {showSenderName && senderName ? (
            <p className={companionStyles.senderUser}>{senderName}</p>
          ) : null}
          <div className={companionStyles.bubbleUser}>{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={companionStyles.bubbleRow}>
      {mateIcon ? (
        <PersonaPresenceIcon
          kind={mateIcon}
          accentSource="settings"
          size="sm"
          variant="filled"
          className="shrink-0"
        />
      ) : (
        <div className="size-chat-avatar shrink-0" />
      )}
      <div className="min-w-0 max-w-[88%]">
        {showSenderName && senderName ? (
          <p className={companionStyles.senderCompanion}>{senderName}</p>
        ) : null}
        <div className={companionStyles.bubbleCompanion}>{children}</div>
      </div>
    </div>
  );
}

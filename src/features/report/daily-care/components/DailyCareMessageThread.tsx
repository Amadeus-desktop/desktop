import { useEffect, useRef } from "react";
import type { AppLocale } from "../../../../i18n";
import type { MateIconKind } from "../../../../domain/mate";
import { cn } from "../../../../lib/utils/cn";
import { ChatBubble } from "../../../companion/chat/components/ChatBubble";
import { TypingDots } from "../../../companion/chat/components/TypingDots";
import { PersonaPresenceIcon } from "../../../companion/ui/PersonaPresenceIcon";
import { companionStyles } from "../../../companion/ui/styles";
import type { DailyCareThreadMessage } from "../lib/messageScript";
import { dailyCareStyles } from "../ui/styles";

type DailyCareMessageThreadProps = {
  messages: DailyCareThreadMessage[];
  companionName: string;
  mateIcon: MateIconKind;
  userName: string;
  isTyping: boolean;
  labels: AppLocale["report"];
  scrollKey: number;
};

function shouldShowSenderName(
  messages: DailyCareThreadMessage[],
  index: number,
): boolean {
  const message = messages[index];
  const previous = messages[index - 1];
  return index === 0 || previous?.sender !== message.sender;
}

export function DailyCareMessageThread({
  messages,
  companionName,
  mateIcon,
  userName,
  isTyping,
  labels,
  scrollKey,
}: DailyCareMessageThreadProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = bodyRef.current;
    const thread = container?.firstElementChild;
    if (!container) return;

    const behavior: ScrollBehavior = scrollKey > 1 ? "smooth" : "auto";
    const scrollToBottom = () => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    };

    const frame = window.requestAnimationFrame(scrollToBottom);
    const observer =
      thread instanceof Element
        ? new ResizeObserver(() => {
            container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
          })
        : null;

    if (observer && thread instanceof Element) {
      observer.observe(thread);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [scrollKey]);

  return (
    <div ref={bodyRef} className={dailyCareStyles.messageBody}>
      <div className={companionStyles.chatThread}>
        {messages.map((message, index) => {
          if (message.sender === "user") {
            return (
              <ChatBubble
                key={message.id}
                sender="user"
                senderName={userName}
                showSenderName={shouldShowSenderName(messages, index)}
              >
                {message.text}
              </ChatBubble>
            );
          }

          if (message.kind === "keywords") {
            return (
              <ChatBubble
                key={message.id}
                sender="companion"
                senderName={companionName}
                showSenderName={shouldShowSenderName(messages, index)}
                mateIcon={mateIcon}
              >
                <div className="space-y-2.5">
                  <p>{message.lead}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {message.keywords.map((keyword) => (
                      <span key={keyword} className={dailyCareStyles.keywordChip}>
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </ChatBubble>
            );
          }

          if (message.kind === "activity") {
            return (
              <ChatBubble
                key={message.id}
                sender="companion"
                senderName={companionName}
                showSenderName={shouldShowSenderName(messages, index)}
                mateIcon={mateIcon}
              >
                <div className="space-y-2.5">
                  <p>{message.lead}</p>
                  <div className={dailyCareStyles.activityCard}>
                    <span
                      className={cn(
                        "h-2.5 w-2.5 shrink-0 rounded-full",
                        message.activity.kind === "work"
                          ? "bg-[color:var(--report-tone-mint-soft)]"
                          : message.activity.kind === "break"
                            ? "bg-[color:var(--report-tone-peach-soft)]"
                            : "bg-[color:var(--shell-ink-faint)]",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-[color:var(--shell-ink)]">
                        {message.activity.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[color:var(--shell-ink-muted)]">
                        {labels.summaryOverlay.steps.activity.kinds[message.activity.kind]}
                      </p>
                    </div>
                  </div>
                </div>
              </ChatBubble>
            );
          }

          return (
            <ChatBubble
              key={message.id}
              sender="companion"
              senderName={companionName}
              showSenderName={shouldShowSenderName(messages, index)}
              mateIcon={mateIcon}
            >
              {message.text}
            </ChatBubble>
          );
        })}

        {isTyping ? (
          <div className={companionStyles.bubbleRow} aria-live="polite">
            <PersonaPresenceIcon
              kind={mateIcon}
              accentSource="settings"
              size="sm"
              variant="filled"
              className="shrink-0"
            />
            <div className="min-w-0">
              <p className={companionStyles.senderCompanion}>{companionName}</p>
              <div className={companionStyles.typingBubble}>
                <span className="sr-only">{labels.summaryOverlay.typing}</span>
                <TypingDots />
              </div>
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} aria-hidden="true" className="h-px w-full shrink-0" />
      </div>
    </div>
  );
}

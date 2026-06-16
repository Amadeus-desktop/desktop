import { memo, useState, type FormEvent } from "react";
import { cn } from "../../../lib/utils/cn";
import type { CompanionLocale } from "../../../i18n";
import { Button } from "../../../ui";
import type { CompanionMateId } from "../../../domain/mate";
import { DeepChatView } from "./DeepChatView";
import { useChatAutoScroll } from "./hooks/useChatAutoScroll";
import { MateSwitcher } from "../dev/MateSwitcher";
import { LocalTimeline } from "../dev/LocalTimeline";
import { PersonaPresenceIcon } from "../ui/PersonaPresenceIcon";
import { CloseIcon, SendIcon } from "../ui/icons";
import { companionStyles } from "../ui/styles";
import type { MateIconKind } from "../../../domain/mate";
import type {
  CompanionMessage,
  CompanionMode,
  Persona,
} from "../types";
import type { TimelineEvent } from "../../timeline/types";

type ChatPanelProps = {
  mode: CompanionMode;
  mateIcon: MateIconKind;
  persona: Persona;
  messages: CompanionMessage[];
  mates: Persona[];
  selectedPersonaId: CompanionMateId;
  timelineEvents: TimelineEvent[];
  devToolsOpen: boolean;
  nightCareEnabled: boolean;
  isSending: boolean;
  userName: string;
  labels: CompanionLocale;
  onSend: (text: string) => void;
  onClose: () => void;
  onMateSelect: (personaId: CompanionMateId) => void;
  onOpenDailyCare: () => void;
};

export const ChatPanel = memo(function ChatPanel({
  mode,
  mateIcon,
  persona,
  messages,
  mates,
  selectedPersonaId,
  timelineEvents,
  devToolsOpen,
  nightCareEnabled,
  isSending,
  userName,
  labels,
  onSend,
  onClose,
  onMateSelect,
  onOpenDailyCare,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const deep = mode === "deep";
  const showThread = mode === "pocket" || mode === "deep";
  const bodyRef = useChatAutoScroll(messages.length + (isSending ? 1 : 0));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;
    setDraft("");
    onSend(text);
  }

  const statusLabel =
    mode === "deep"
      ? labels.status.deep
      : mode === "pocket"
        ? labels.status.pocket
        : labels.status.quiet;

  return (
    <section className={companionStyles.chatPanel}>
      <header className={companionStyles.chatHeader}>
        <button
          type="button"
          aria-label={labels.chat.close}
          onClick={onClose}
          className={companionStyles.iconButton}
        >
          <CloseIcon className="size-4" />
        </button>
        <div className={companionStyles.chatAvatar}>
          <PersonaPresenceIcon
            kind={mateIcon}
            accentSource="settings"
            size="sm"
            variant="filled"
            shape="circle"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className={companionStyles.chatTitle}>{persona.name}</p>
          <p className={companionStyles.chatStatus}>{statusLabel}</p>
        </div>
      </header>

      <div ref={bodyRef} className={companionStyles.chatBody}>
        {deep && nightCareEnabled ? (
          <div className="mb-3">
            <button type="button" onClick={onOpenDailyCare} className={companionStyles.textLink}>
              {labels.chat.dailyCareLink}
            </button>
          </div>
        ) : null}

        {showThread ? (
          <DeepChatView
            messages={messages}
            personaName={persona.name}
            mateIcon={mateIcon}
            userName={userName}
            isSending={isSending}
            labels={labels}
          />
        ) : null}
      </div>

      {devToolsOpen ? (
        <div className={cn(companionStyles.devPanel, "space-y-2")}>
          <MateSwitcher
            mates={mates}
            selectedPersonaId={selectedPersonaId}
            onSelect={onMateSelect}
            label={labels.dev.mate}
          />
          <LocalTimeline events={timelineEvents} labels={labels.dev} />
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className={companionStyles.chatInputBar}>
        <div className={companionStyles.chatInputWrap}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            className={companionStyles.chatInput}
            placeholder={
              deep ? labels.chat.placeholderDeep : labels.chat.placeholder
            }
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            aria-label={labels.chat.send}
            disabled={isSending}
            className="size-8 shrink-0 rounded-full p-0"
          >
            <SendIcon className="size-3.5" />
          </Button>
        </div>
      </form>
    </section>
  );
});

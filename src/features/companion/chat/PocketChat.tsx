import type { FormEvent } from "react";
import type { CompanionLocale } from "../../../i18n";
import { companionStyles } from "../ui/styles";
import { CloseIcon, SendIcon } from "../ui/icons";
import { DeepChatView } from "./DeepChatView";
import { ChatAvatar } from "./components/ChatAvatar";
import { ChatBubble } from "./components/ChatBubble";
import { CompanionPanelLayout } from "./components/CompanionPanelLayout";
import { ContextStatus } from "./components/ContextStatus";
import { MateSwitcher } from "../dev/MateSwitcher";
import { LocalTimeline } from "../dev/LocalTimeline";
import type { CompanionMateId } from "../../../domain/mate";
import type {
  CompanionMessage,
  CompanionMode,
  Persona,
} from "../types";
import type { TimelineEvent } from "../../timeline/types";

type PocketChatProps = {
  mode: CompanionMode;
  persona: Persona;
  mates: Persona[];
  selectedPersonaId: CompanionMateId;
  messages: CompanionMessage[];
  draft: string;
  timelineEvents: TimelineEvent[];
  devToolsOpen: boolean;
  nightCareEnabled: boolean;
  labels: CompanionLocale;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onMateSelect: (personaId: CompanionMateId) => void;
  onOpenDailyCare: () => void;
};

export function PocketChat({
  mode,
  persona,
  mates,
  selectedPersonaId,
  messages,
  draft,
  timelineEvents,
  devToolsOpen,
  nightCareEnabled,
  labels,
  onDraftChange,
  onSubmit,
  onClose,
  onMateSelect,
  onOpenDailyCare,
}: PocketChatProps) {
  const deep = mode === "deep";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <CompanionPanelLayout
      header={
        <header className={companionStyles.header}>
          <ChatAvatar personaId={persona.id} />
          <div className="min-w-0">
            <h2 className={companionStyles.headerTitle}>{persona.name}</h2>
            <ContextStatus mode={mode} labels={labels.status} />
          </div>
          <button
            type="button"
            aria-label={labels.chat.close}
            onClick={onClose}
            className={companionStyles.iconButton}
          >
            <CloseIcon />
          </button>
        </header>
      }
      accessory={
        deep && nightCareEnabled ? (
          <div className="px-3 pb-1">
            <button
              type="button"
              onClick={onOpenDailyCare}
              className={companionStyles.textLink}
            >
              {labels.chat.dailyCareLink}
            </button>
          </div>
        ) : undefined
      }
      footer={
        <form onSubmit={handleSubmit} className={companionStyles.inputBar}>
          <input
            value={draft}
            onChange={(event) => onDraftChange(event.currentTarget.value)}
            className={companionStyles.input}
            placeholder={
              deep ? labels.chat.placeholderDeep : labels.chat.placeholder
            }
          />
          <button
            type="submit"
            aria-label={labels.chat.send}
            className={companionStyles.sendButton}
          >
            <SendIcon />
          </button>
        </form>
      }
      dev={
        devToolsOpen ? (
          <div className="space-y-2">
            <MateSwitcher
              mates={mates}
              selectedPersonaId={selectedPersonaId}
              onSelect={onMateSelect}
              label={labels.dev.mate}
            />
            <LocalTimeline events={timelineEvents} labels={labels.dev} />
          </div>
        ) : undefined
      }
    >
      {deep ? (
        <DeepChatView
          messages={messages}
          personaName={persona.name}
          personaId={persona.id}
        />
      ) : (
        <div className="space-y-2.5 px-3 py-3">
          {messages[0] ? (
            <ChatBubble
              sender="companion"
              senderName={persona.name}
              personaId={persona.id}
            >
              {messages[0].text}
            </ChatBubble>
          ) : null}
          <p className="px-1 text-chat-xs text-chat-faint dark:text-chat-faint-dark">
            {labels.chat.waiting}
          </p>
        </div>
      )}
    </CompanionPanelLayout>
  );
}

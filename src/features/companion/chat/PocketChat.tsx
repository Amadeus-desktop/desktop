import type { FormEvent } from "react";
import type { CompanionLocale } from "../../../i18n";
import { companionStyles } from "../ui/styles";
import { CloseIcon, SendIcon } from "../ui/icons";
import { DeepChatView } from "./DeepChatView";
import { ChatAvatar } from "./components/ChatAvatar";
import { ChatBubble } from "./components/ChatBubble";
import { ChatPanel } from "./components/ChatPanel";
import { ContextStatus } from "./components/ContextStatus";
import { PersonaSwitcher } from "../dev/PersonaSwitcher";
import { LocalTimeline } from "../dev/LocalTimeline";
import type {
  CompanionMessage,
  CompanionMode,
  LocalTimelineEvent,
  Persona,
  PersonaId,
} from "../types";

type PocketChatProps = {
  mode: CompanionMode;
  persona: Persona;
  personas: Persona[];
  selectedPersonaId: PersonaId;
  messages: CompanionMessage[];
  draft: string;
  timelineEvents: LocalTimelineEvent[];
  devToolsOpen: boolean;
  labels: CompanionLocale;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onPersonaSelect: (personaId: PersonaId) => void;
  onOpenDailyCare: () => void;
};

export function PocketChat({
  mode,
  persona,
  personas,
  selectedPersonaId,
  messages,
  draft,
  timelineEvents,
  devToolsOpen,
  labels,
  onDraftChange,
  onSubmit,
  onClose,
  onPersonaSelect,
  onOpenDailyCare,
}: PocketChatProps) {
  const deep = mode === "deep";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <ChatPanel>
      <header className={companionStyles.header}>
        <ChatAvatar />
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

      <div className="min-h-0 flex-1 overflow-hidden">
        {deep ? (
          <DeepChatView messages={messages} personaName={persona.name} />
        ) : (
          <div className="space-y-2.5 px-3 py-3">
            {messages[0] ? (
              <ChatBubble sender="companion" senderName={persona.name}>
                {messages[0].text}
              </ChatBubble>
            ) : null}
            <p className="px-1 text-chat-xs text-chat-faint dark:text-chat-faint-dark">
              {labels.chat.waiting}
            </p>
          </div>
        )}
      </div>

      {deep ? (
        <div className="shrink-0 px-3 pb-1">
          <button type="button" onClick={onOpenDailyCare} className={companionStyles.textLink}>
            {labels.chat.dailyCareLink}
          </button>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className={companionStyles.inputBar}>
        <input
          value={draft}
          onChange={(event) => onDraftChange(event.currentTarget.value)}
          className={companionStyles.input}
          placeholder={deep ? labels.chat.placeholderDeep : labels.chat.placeholder}
        />
        <button type="submit" aria-label={labels.chat.send} className={companionStyles.sendButton}>
          <SendIcon />
        </button>
      </form>

      {devToolsOpen ? (
        <div className={`${companionStyles.devPanel} space-y-2`}>
          <PersonaSwitcher
            personas={personas}
            selectedPersonaId={selectedPersonaId}
            onSelect={onPersonaSelect}
            label={labels.dev.persona}
          />
          <LocalTimeline events={timelineEvents} labels={labels.dev} />
        </div>
      ) : null}
    </ChatPanel>
  );
}

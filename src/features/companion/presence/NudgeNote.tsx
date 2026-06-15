import type { CompanionLocale } from "../../../i18n";
import type { PersonaId } from "../../../domain/persona/types";
import { PersonaPresenceIcon } from "../ui/PersonaPresenceIcon";
import { CloseIcon } from "../ui/icons";
import { companionStyles } from "../ui/styles";

type NudgeNoteProps = {
  personaId: PersonaId;
  personaName: string;
  nudge: string;
  labels: CompanionLocale;
  onOpen: () => void;
  onDismiss: () => void;
  onIgnore: () => void;
};

export function NudgeNote({
  personaId,
  personaName,
  nudge,
  labels,
  onOpen,
  onDismiss,
  onIgnore,
}: NudgeNoteProps) {
  return (
    <div className="animate-chat-in w-chat-nudge max-w-[calc(100vw-1rem)]">
      <div className={companionStyles.bubbleRow}>
        <PersonaPresenceIcon personaId={personaId} size="sm" />
        <div className="min-w-0 flex-1">
          <p className={companionStyles.sender}>{personaName}</p>
          <div className="relative">
            <button
              type="button"
              onClick={onOpen}
              className={`${companionStyles.bubbleCompanion} block w-full text-left transition active:opacity-90`}
            >
              {nudge}
            </button>
            <button
              type="button"
              aria-label={labels.nudge.close}
              onClick={(event) => {
                event.stopPropagation();
                onDismiss();
              }}
              className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full border border-chat-border/70 bg-chat-surface/95 text-chat-faint shadow-sm backdrop-blur-sm transition hover:text-chat-ink dark:border-chat-border-dark dark:bg-chat-surface-dark/95 dark:hover:text-chat-ink-dark"
            >
              <CloseIcon className="size-3" />
            </button>
          </div>
          <div className="mt-1.5 flex justify-end pr-0.5">
            <button
              type="button"
              onClick={onIgnore}
              className={companionStyles.textLink}
            >
              {labels.nudge.ignore}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

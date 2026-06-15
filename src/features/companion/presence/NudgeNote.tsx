import type { CompanionLocale } from "../../../i18n";
import { companionStyles } from "../ui/styles";
import { CloseIcon } from "../ui/icons";

type NudgeNoteProps = {
  personaName: string;
  nudge: string;
  labels: CompanionLocale;
  onOpen: () => void;
  onDismiss: () => void;
  onIgnore: () => void;
};

export function NudgeNote({
  personaName,
  nudge,
  labels,
  onOpen,
  onDismiss,
  onIgnore,
}: NudgeNoteProps) {
  return (
    <div className={companionStyles.nudgeCard}>
      <div className="relative">
        <button
          type="button"
          aria-label={labels.nudge.close}
          onClick={onDismiss}
          className={`${companionStyles.iconButton} absolute -right-1 -top-1 !ml-0`}
        >
          <CloseIcon />
        </button>
        <button type="button" onClick={onOpen} className="block w-full pr-5 text-left">
          <p className={companionStyles.headerTitle}>{personaName}</p>
          <p className="mt-1.5 text-chat-sm leading-relaxed text-chat-ink dark:text-chat-ink-dark">
            {nudge}
          </p>
        </button>
      </div>
      <div className="mt-2.5 flex justify-end">
        <button type="button" onClick={onIgnore} className={companionStyles.textLink}>
          {labels.nudge.ignore}
        </button>
      </div>
    </div>
  );
}

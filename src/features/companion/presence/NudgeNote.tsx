import type { CompanionLocale } from "../../../i18n";
import type { PersonaId } from "../../../domain/persona/types";
import { getPersonaAccent } from "../../../domain/persona/theme";
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
  const accent = getPersonaAccent(personaId);

  return (
    <article
      className={companionStyles.nudgeCard}
      style={{ backgroundColor: "#28282d" }}
    >
      <div className={companionStyles.nudgeBody}>
        <PersonaPresenceIcon personaId={personaId} size="md" variant="filled" />

        <div className="min-w-0 flex-1">
          <div className={companionStyles.nudgeHeader}>
            <p className={`text-chat-xs font-semibold ${accent.text}`}>
              {personaName}
            </p>
            <button
              type="button"
              aria-label={labels.nudge.close}
              onClick={onDismiss}
              className={companionStyles.nudgeClose}
            >
              <CloseIcon className="size-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={onOpen}
            className={companionStyles.nudgeMessage}
            style={{ backgroundColor: "#323238" }}
          >
            {nudge}
          </button>

          <div className="mt-2 flex justify-end">
            <button type="button" onClick={onIgnore} className={companionStyles.textLink}>
              {labels.nudge.ignore}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

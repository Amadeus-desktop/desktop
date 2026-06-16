import type { MateIconKind } from "../../../domain/mate";
import type { CompanionLocale } from "../../../i18n";
import { formatNudgePreview } from "../lib/formatNudgePreview";
import { PersonaPresenceIcon } from "../ui/PersonaPresenceIcon";
import { companionStyles } from "../ui/styles";
import { NoteBubble } from "./NoteBubble";

type NudgeCardProps = {
  mateIcon: MateIconKind;
  personaName: string;
  nudge: string;
  labels: CompanionLocale;
  onOpen: () => void;
  onIgnore: () => void;
};

export function NudgeCard({
  mateIcon,
  personaName,
  nudge,
  labels,
  onOpen,
  onIgnore,
}: NudgeCardProps) {
  const preview = formatNudgePreview(nudge);

  return (
    <NoteBubble>
      <div className={companionStyles.noteHeader}>
        <PersonaPresenceIcon
          kind={mateIcon}
          accentSource="settings"
          size="sm"
          variant="filled"
          className={companionStyles.noteMark}
        />
        <p className={companionStyles.noteName}>{personaName}</p>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className={`tauri-interactive ${companionStyles.noteMessage}`}
        aria-label={labels.nudge.open}
      >
        {preview}
      </button>

      <button
        type="button"
        onClick={onIgnore}
        className={`tauri-interactive ${companionStyles.noteDismiss}`}
      >
        {labels.nudge.ignore}
      </button>
    </NoteBubble>
  );
}

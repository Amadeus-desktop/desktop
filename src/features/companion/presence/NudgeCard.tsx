import type { CompanionLocale } from "../../../i18n";
import { formatNudgePreview } from "../lib/formatNudgePreview";
import { companionStyles } from "../ui/styles";
import { NoteBubble } from "./NoteBubble";

type NudgeCardProps = {
  personaName: string;
  nudge: string;
  labels: CompanionLocale;
  onOpen: () => void;
  onIgnore: () => void;
};

export function NudgeCard({
  personaName,
  nudge,
  labels,
  onOpen,
  onIgnore,
}: NudgeCardProps) {
  const preview = formatNudgePreview(nudge);

  return (
    <NoteBubble>
      <p className={companionStyles.noteEyebrow}>{labels.presence.newMessage}</p>
      <p className={companionStyles.noteName}>{personaName}</p>
      <button
        type="button"
        onClick={onOpen}
        className={`tauri-interactive ${companionStyles.noteMessage}`}
      >
        {preview}
      </button>
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={onIgnore} className={companionStyles.textLink}>
          {labels.nudge.ignore}
        </button>
      </div>
    </NoteBubble>
  );
}

import type { CompanionLocale } from "../../../i18n";
import { companionStyles } from "../ui/styles";

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
  return (
    <article className={companionStyles.nudgeCard}>
      <p className={companionStyles.nudgeName}>{personaName}</p>
      <button
        type="button"
        onClick={onOpen}
        className={`tauri-interactive ${companionStyles.nudgeMessage}`}
      >
        {nudge}
      </button>
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={onIgnore} className={companionStyles.textLink}>
          {labels.nudge.ignore}
        </button>
      </div>
    </article>
  );
}

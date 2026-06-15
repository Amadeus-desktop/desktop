import { cn } from "../../../lib/cn";
import type { CompanionLocale } from "../../../i18n";
import { companionStyles } from "../ui/styles";
import type { CompanionMode } from "../types";

type FloatingMessageIconProps = {
  mode: CompanionMode;
  labels: CompanionLocale["presence"];
  onClick: () => void;
};

export function FloatingMessageIcon({
  mode,
  labels,
  onClick,
}: FloatingMessageIconProps) {
  const hasNewNote = mode === "new_note";
  const sleeping = mode === "sleep";

  return (
    <button
      type="button"
      aria-label={sleeping ? labels.wake : labels.open}
      onClick={onClick}
      className={cn(companionStyles.fab, sleeping && companionStyles.fabMuted)}
    >
      {!sleeping && !hasNewNote ? (
        <span className={companionStyles.fabPulse} aria-hidden="true" />
      ) : null}
      <span className={companionStyles.fabRing} aria-hidden="true" />
      {hasNewNote ? (
        <span className={companionStyles.badgeDot} aria-label={labels.newMessage} />
      ) : null}
    </button>
  );
}

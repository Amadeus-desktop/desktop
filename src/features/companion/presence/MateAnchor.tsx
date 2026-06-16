import { cn } from "../../../lib/utils/cn";
import type { MateIconKind } from "../../../domain/mate";
import type { PersonaId, PresenceIconKind } from "../../../domain/persona/types";
import type { CompanionLocale } from "../../../i18n";
import { PersonaPresenceIcon } from "../ui/PersonaPresenceIcon";
import type { CompanionMode } from "../types";

type MateAnchorProps = {
  personaId: PersonaId;
  personaIcon: PresenceIconKind;
  mateIcon: MateIconKind;
  mode: CompanionMode;
  expanded: boolean;
  labels: CompanionLocale["presence"];
  onClick: () => void;
};

export function MateAnchor({
  personaId,
  personaIcon,
  mateIcon,
  mode,
  expanded,
  labels,
  onClick,
}: MateAnchorProps) {
  const sleeping = mode === "sleep";
  const showPersonaMark = mode === "nudge" || expanded;

  return (
    <button
      type="button"
      aria-label={sleeping ? labels.wake : labels.open}
      aria-expanded={expanded}
      onClick={onClick}
      className={cn(
        "tauri-interactive shrink-0 rounded-full p-0 shadow-none transition-transform duration-300 ease-out",
        sleeping && "opacity-50",
        expanded && "scale-[0.96]",
      )}
    >
      <PersonaPresenceIcon
        personaId={personaId}
        kind={showPersonaMark ? personaIcon : mateIcon}
        accentSource={showPersonaMark ? "persona" : "settings"}
        size="lg"
        variant={expanded ? "filled" : "outline"}
      />
    </button>
  );
}

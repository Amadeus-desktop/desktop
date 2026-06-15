import { cn } from "../../../lib/cn";
import type { CompanionLocale } from "../../../i18n";
import type { PersonaId } from "../../../domain/persona/types";
import { PersonaPresenceIcon } from "../ui/PersonaPresenceIcon";
import type { CompanionMode } from "../types";

type FloatingMessageIconProps = {
  mode: CompanionMode;
  personaId: PersonaId;
  labels: CompanionLocale["presence"];
  onClick: () => void;
};

export function FloatingMessageIcon({
  mode,
  personaId,
  labels,
  onClick,
}: FloatingMessageIconProps) {
  const sleeping = mode === "sleep";

  return (
    <button
      type="button"
      aria-label={sleeping ? labels.wake : labels.open}
      onClick={onClick}
      className={cn(
        "rounded-full p-0 shadow-none transition",
        sleeping && "opacity-50",
      )}
    >
      <PersonaPresenceIcon personaId={personaId} size="lg" variant="outline" />
    </button>
  );
}

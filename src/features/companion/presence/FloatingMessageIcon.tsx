import { cn } from "../../../lib/utils/cn";
import type { MateIconKind } from "../../../domain/mate";
import type { CompanionLocale } from "../../../i18n";
import { PersonaPresenceIcon } from "../ui/PersonaPresenceIcon";
import type { CompanionMode } from "../types";

type FloatingMessageIconProps = {
  mode: CompanionMode;
  mateIcon: MateIconKind;
  labels: CompanionLocale["presence"];
  onClick: () => void;
};

export function FloatingMessageIcon({
  mode,
  mateIcon,
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
        "tauri-interactive rounded-full p-0 shadow-none transition",
        sleeping && "opacity-50",
      )}
    >
      <PersonaPresenceIcon
        kind={mateIcon}
        accentSource="settings"
        size="lg"
        variant="outline"
      />
    </button>
  );
}

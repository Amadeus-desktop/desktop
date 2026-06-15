import type { PersonaId } from "../../../../domain/persona/types";
import { cn } from "../../../../lib/cn";
import { PersonaPresenceIcon } from "../../ui/PersonaPresenceIcon";

type ChatAvatarProps = {
  personaId: PersonaId;
  className?: string;
};

export function ChatAvatar({ personaId, className }: ChatAvatarProps) {
  return (
    <PersonaPresenceIcon
      personaId={personaId}
      size="sm"
      className={cn(className)}
    />
  );
}

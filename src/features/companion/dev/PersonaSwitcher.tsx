import type { Persona, PersonaId } from "../types";
import { PersonaPresenceIcon } from "../ui/PersonaPresenceIcon";
import { companionStyles } from "../ui/styles";

type PersonaSwitcherProps = {
  personas: Persona[];
  selectedPersonaId: PersonaId;
  label: string;
  onSelect: (personaId: PersonaId) => void;
};

export function PersonaSwitcher({
  personas,
  selectedPersonaId,
  label,
  onSelect,
}: PersonaSwitcherProps) {
  return (
    <div className={companionStyles.devBox}>
      <p className={`mb-1.5 ${companionStyles.devLabel}`}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {personas.map((persona) => {
          const selected = persona.id === selectedPersonaId;

          return (
            <button
              key={persona.id}
              type="button"
              onClick={() => onSelect(persona.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-chat-xs transition ${
                selected
                  ? "bg-chat-accent/15 font-medium text-chat-accent dark:bg-chat-accent-dark/20 dark:text-chat-accent-dark"
                  : "text-chat-muted hover:bg-black/5 hover:text-chat-ink dark:text-chat-muted-dark dark:hover:bg-white/5 dark:hover:text-chat-ink-dark"
              }`}
            >
              <PersonaPresenceIcon personaId={persona.id} size="sm" />
              {persona.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

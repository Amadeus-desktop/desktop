import type { CompanionMateId } from "../../../domain/mate";
import type { Persona } from "../types";
import { PersonaPresenceIcon } from "../ui/PersonaPresenceIcon";
import { cn } from "../../../lib/utils/cn";
import { companionStyles } from "../ui/styles";

type MateSwitcherProps = {
  mates: Persona[];
  selectedPersonaId: CompanionMateId;
  label: string;
  onSelect: (personaId: CompanionMateId) => void;
};

export function MateSwitcher({
  mates,
  selectedPersonaId,
  label,
  onSelect,
}: MateSwitcherProps) {
  return (
    <div className={companionStyles.devPanel}>
      <p className={companionStyles.devLabel}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {mates.map((mate) => {
          const selected = mate.id === selectedPersonaId;

          return (
            <button
              key={mate.id}
              type="button"
              onClick={() => onSelect(mate.id as CompanionMateId)}
              aria-pressed={selected}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition",
                selected
                  ? "border-[#0a84ff]/50 bg-[#0a84ff]/15 text-[#f5f5f7]"
                  : "border-[#3a3a40] bg-[#222226] text-[#a1a1a6] hover:border-[#585860] hover:text-[#f5f5f7]",
              )}
            >
              <PersonaPresenceIcon personaId={mate.id} size="sm" />
              {mate.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { getPersonaList } from "../../domain/persona/registry";
import { getPersonaAccent } from "../../domain/persona/theme";
import { cn } from "../../lib/cn";
import { shellText } from "../../ui";
import { PersonaPresenceIcon } from "../companion/ui/PersonaPresenceIcon";

type PersonaOption = ReturnType<typeof getPersonaList>[number];

type PersonaOptionCardProps = {
  persona: PersonaOption;
  selected: boolean;
  compact?: boolean;
  onSelect: () => void;
};

export function PersonaOptionCard({
  persona,
  selected,
  compact = false,
  onSelect,
}: PersonaOptionCardProps) {
  const accent = getPersonaAccent(persona.id);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-[12px] border px-1.5 py-2 text-center transition",
        compact ? "min-h-[4.75rem]" : "min-h-[5.5rem] gap-2 rounded-[14px] px-2 py-2.5",
        selected
          ? "border-[color:rgb(var(--accent-rgb)/0.42)] bg-[color:rgb(var(--accent-rgb)/0.08)]"
          : "border-[color:var(--shell-border-subtle)] bg-[color:var(--shell-panel-strong)] hover:border-[color:var(--shell-border-strong)] hover:bg-[color:var(--shell-row-hover)]",
      )}
      style={
        selected
          ? { boxShadow: `inset 0 0 0 1px rgb(${accent.glow} / 0.12)` }
          : undefined
      }
    >
      <PersonaPresenceIcon
        personaId={persona.id}
        size="sm"
        shape="square"
        variant={selected ? "filled" : "outline"}
        className={cn(
          "rounded-[10px]",
          selected && "ring-2 ring-[color:rgb(var(--accent-rgb)/0.4)]",
        )}
        style={
          selected
            ? { boxShadow: `0 4px 14px rgb(${accent.glow} / 0.16)` }
            : undefined
        }
      />
      <span className="min-w-0 space-y-0.5">
        <span
          className={cn(
            "block truncate text-[10px] font-semibold leading-4",
            selected ? "text-[color:var(--accent-soft)]" : shellText.primary,
          )}
        >
          {persona.shortLabel}
        </span>
        {!compact ? (
          <span className={cn("block truncate text-[9px] leading-[14px]", shellText.faint)}>
            {persona.name}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export type { PersonaOption };

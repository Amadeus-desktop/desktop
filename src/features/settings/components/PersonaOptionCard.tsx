import { getPersonaPresentation } from "../../../domain/persona/cards";
import { getPersonaList } from "../../../domain/persona/registry";
import { getPersonaAccent } from "../../../domain/persona/theme";
import { cn } from "../../../lib/utils/cn";
import { shellText } from "../../../ui";
import { PersonaPresenceIcon } from "../../companion/ui/PersonaPresenceIcon";

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
  const presentation = getPersonaPresentation(persona);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex flex-col items-start justify-start gap-2 rounded-[12px] border px-2.5 py-2.5 text-left transition",
        compact ? "min-h-[5.5rem]" : "min-h-[8.5rem] rounded-[14px]",
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
      <span className="flex w-full items-center gap-2">
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
        <span className="min-w-0">
          <span
            className={cn(
              "block truncate text-[11px] font-semibold leading-4",
              selected ? "text-[color:var(--accent-soft)]" : shellText.primary,
            )}
          >
            {persona.name}
          </span>
          <span className={cn("block truncate text-[9px] leading-[13px]", shellText.faint)}>
            {persona.shortLabel}
          </span>
        </span>
      </span>

      <span className="min-w-0 space-y-1">
        <span className={cn("line-clamp-2 text-[10px] font-medium leading-[15px]", shellText.primary)}>
          {presentation.relationshipHook}
        </span>
        {!compact ? (
          <span className={cn("line-clamp-1 text-[9px] leading-[13px]", shellText.faint)}>
            {presentation.carePattern}
          </span>
        ) : null}
      </span>

      {!compact ? (
        <span
          className={cn(
            "mt-auto block w-full rounded-[8px] border px-2 py-1 text-[9px] leading-[13px]",
            selected
              ? "border-[color:rgb(var(--accent-rgb)/0.2)] bg-[color:rgb(var(--accent-rgb)/0.08)] text-[color:var(--accent-soft)]"
              : "border-[color:var(--shell-border-subtle)] bg-black/10 text-[color:var(--shell-ink-faint)]",
          )}
        >
          “{presentation.voiceSample}”
        </span>
      ) : null}
    </button>
  );
}

export type { PersonaOption };

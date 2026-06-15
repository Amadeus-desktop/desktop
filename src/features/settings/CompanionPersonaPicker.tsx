import { getPersonaList } from "../../domain/persona/registry";
import { getPersonaAccent } from "../../domain/persona/theme";
import type { PersonaId } from "../../domain/persona/types";
import { useI18n } from "../../i18n";
import { cn } from "../../lib/cn";
import { SettingRow, shellText } from "../../ui";
import { PersonaPresenceIcon } from "../companion/ui/PersonaPresenceIcon";
import { useSettings } from "./useSettings";

export function CompanionPersonaPicker() {
  const t = useI18n();
  const { companionPersonaId, setCompanionPersonaId } = useSettings();
  const personas = getPersonaList(t);

  return (
    <SettingRow
      variant="primary"
      layout="stack"
      title={t.settings.companionPersona.label}
      subtitle={t.settings.companionPersona.subtitle}
    >
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {personas.map((persona) => (
          <PersonaOptionCard
            key={persona.id}
            persona={persona}
            selected={persona.id === companionPersonaId}
            onSelect={() => setCompanionPersonaId(persona.id as PersonaId)}
          />
        ))}
      </div>
    </SettingRow>
  );
}

type PersonaOptionCardProps = {
  persona: ReturnType<typeof getPersonaList>[number];
  selected: boolean;
  onSelect: () => void;
};

function PersonaOptionCard({ persona, selected, onSelect }: PersonaOptionCardProps) {
  const accent = getPersonaAccent(persona.id);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-[14px] border px-2 py-2.5 text-center transition",
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
          "rounded-[11px]",
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
            "block truncate text-[11px] font-semibold leading-4",
            selected ? "text-[color:var(--accent-soft)]" : shellText.primary,
          )}
        >
          {persona.shortLabel}
        </span>
        <span className={cn("block truncate text-[9px] leading-[14px]", shellText.faint)}>
          {persona.name}
        </span>
      </span>
    </button>
  );
}

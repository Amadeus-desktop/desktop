import { MATE_ICON_KINDS, type MateIconKind } from "../../../domain/mate";
import { useI18n } from "../../../i18n";
import { cn } from "../../../lib/utils/cn";
import { shellText } from "../../../ui";
import { PersonaPresenceIcon } from "../../companion/ui/PersonaPresenceIcon";
import { SettingRow } from "../../../ui";
import { useSettings } from "../hooks/useSettings";

type MateIconOptionProps = {
  kind: MateIconKind;
  label: string;
  selected: boolean;
  onSelect: () => void;
};

export function MateIconOption({ kind, label, selected, onSelect }: MateIconOptionProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-[12px] border px-1.5 py-2.5 text-center transition",
        selected
          ? "border-[color:var(--shell-selection-border)] bg-[color:var(--shell-selection-bg)] shadow-[inset_0_0_0_1px_var(--shell-selection-border)]"
          : "border-[color:var(--shell-border-subtle)] bg-[color:var(--shell-panel-strong)] hover:border-[color:var(--shell-border-strong)] hover:bg-[color:var(--shell-row-hover)]",
      )}
    >
      <PersonaPresenceIcon
        kind={kind}
        accentSource="settings"
        size="sm"
        shape="square"
        variant={selected ? "filled" : "outline"}
        className="rounded-[10px]"
      />
      <span
        className={cn(
          "w-full truncate text-[10px] font-semibold leading-4",
          selected ? "text-[color:var(--shell-selection-text)]" : shellText.muted,
        )}
      >
        {label}
      </span>
    </button>
  );
}

type MateIconPickerProps = {
  value: MateIconKind;
  onChange: (value: MateIconKind) => void;
};

export function MateIconPickerGrid({ value, onChange }: MateIconPickerProps) {
  const t = useI18n();

  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {MATE_ICON_KINDS.map((kind) => (
        <MateIconOption
          key={kind}
          kind={kind}
          label={t.settings.mateIcon.icons[kind]}
          selected={value === kind}
          onSelect={() => onChange(kind)}
        />
      ))}
    </div>
  );
}

export function MateIconPicker() {
  const t = useI18n();
  const { companionMateIcon, setCompanionMateIcon } = useSettings();

  return (
    <SettingRow
      variant="primary"
      layout="stack"
      title={t.settings.mateIcon.label}
      subtitle={t.settings.mateIcon.subtitle}
    >
      <MateIconPickerGrid
        value={companionMateIcon}
        onChange={setCompanionMateIcon}
      />
    </SettingRow>
  );
}

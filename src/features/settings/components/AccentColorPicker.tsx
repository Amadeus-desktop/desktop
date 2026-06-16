import { useI18n } from "../../../i18n";
import { cn } from "../../../lib/utils/cn";
import { SettingRow } from "../../../ui";
import {
  ACCENT_COLOR_IDS,
  accentColors,
} from "../../../ui/tokens/appearance";
import { useSettings } from "../hooks/useSettings";

export function AccentColorPicker() {
  const t = useI18n();
  const { accentColor, setAccentColor } = useSettings();

  return (
    <SettingRow
      layout="stack"
      title={t.settings.accentColor.label}
      subtitle={t.settings.accentColor.subtitle}
    >
      <div className="grid grid-cols-5 gap-1.5">
        {ACCENT_COLOR_IDS.map((colorId) => {
          const selected = accentColor === colorId;
          const tokens = accentColors[colorId];
          const label = t.settings.accentColor.options[colorId];

          return (
            <button
              key={colorId}
              type="button"
              aria-pressed={selected}
              onClick={() => setAccentColor(colorId)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-[12px] border px-1.5 py-2 transition",
        selected
          ? "border-[color:var(--shell-selection-border)] bg-[color:var(--shell-selection-bg)] shadow-[inset_0_0_0_1px_var(--shell-selection-border)]"
          : "border-[color:var(--shell-border-subtle)] bg-[color:var(--shell-panel-strong)] hover:border-[color:var(--shell-border-strong)] hover:bg-[color:var(--shell-row-hover)]",
              )}
            >
              <span
                className={cn(
                  "size-6 rounded-[8px] border",
                  selected
                    ? "border-[color:var(--shell-border-strong)] shadow-[0_4px_12px_rgb(var(--accent-rgb)/0.25)]"
                    : "border-[color:var(--shell-border-strong)]",
                )}
                style={{
                  background: `linear-gradient(135deg, ${tokens.gradientFrom}, ${tokens.gradientTo})`,
                }}
                aria-hidden="true"
              />
              <span
                className={cn(
                  "w-full truncate text-center text-[10px] leading-4",
                  selected
                    ? "font-semibold text-[color:var(--shell-selection-text)]"
                    : cn("font-medium", "text-[color:var(--shell-ink-muted)]"),
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </SettingRow>
  );
}
